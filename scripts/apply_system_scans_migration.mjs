import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('\n📦 APPLYING SYSTEM SCANS MIGRATION\n');
  console.log('='.repeat(70));

  // Step 1: Check if column exists
  const { data: testScan } = await supabase
    .from('scans')
    .select('*')
    .limit(1);

  if (testScan && testScan.length > 0) {
    const hasColumn = 'is_system_scan' in testScan[0];
    if (hasColumn) {
      console.log('\n✅ Column is_system_scan already exists\n');
    } else {
      console.log('\n⚠️  Column is_system_scan does NOT exist');
      console.log('   You need to run this SQL in Supabase dashboard:\n');
      console.log('   ALTER TABLE scans ADD COLUMN is_system_scan BOOLEAN DEFAULT FALSE;');
      console.log('   CREATE INDEX idx_scans_system ON scans(is_system_scan, subject, exam_context) WHERE is_system_scan = TRUE;\n');
      console.log('   Then run this script again.\n');
      return;
    }
  }

  // Step 2: Mark ONLY the latest scan per (subject, exam_context) as system scan
  console.log('🔄 Finding latest scan for each subject/exam combination...\n');

  const { data: allScans, error: selectError } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, status, created_at, is_system_scan')
    .eq('status', 'Complete')
    .in('exam_context', ['KCET', 'JEE', 'NEET', 'CBSE'])
    .in('subject', ['Math', 'Physics', 'Chemistry', 'Biology'])
    .order('created_at', { ascending: false });

  if (selectError) {
    console.error('❌ Error fetching scans:', selectError.message);
    return;
  }

  // Group by (subject, exam_context) and get latest
  const latestScans = new Map();
  allScans.forEach(scan => {
    const key = `${scan.subject}-${scan.exam_context}`;
    if (!latestScans.has(key)) {
      latestScans.set(key, scan);
    }
  });

  console.log(`Found ${allScans.length} total completed scans`);
  console.log(`Latest scan per combination: ${latestScans.size}\n`);

  Array.from(latestScans.values()).forEach(scan => {
    console.log(`   ✅ ${scan.subject} (${scan.exam_context}): ${scan.name}`);
  });

  // Step 3: Clear all system flags first (DISABLED TO PREVENT MASS UNPUBLISHING)
  /*
  console.log('\n🔄 Clearing existing system scan flags...\n');
  await supabase
    .from('scans')
    .update({ is_system_scan: false })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
  */

  // Step 4: Mark only latest scans as system
  console.log('🔄 Marking latest scans as system scans...\n');

  for (const scan of latestScans.values()) {
    const { error: updateError } = await supabase
      .from('scans')
      .update({ is_system_scan: true })
      .eq('id', scan.id);

    if (updateError) {
      console.log(`❌ Error updating ${scan.name}: ${updateError.message}`);
    } else {
      console.log(`✅ ${scan.subject} (${scan.exam_context}): ${scan.name}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ MIGRATION COMPLETE\n');
  console.log(`📊 Summary:`);
  console.log(`   Total completed scans: ${allScans.length}`);
  console.log(`   Marked as system: ${latestScans.size}`);
  console.log('\n🎉 Latest scans are now accessible to all users!\n');
}

applyMigration().catch(console.error);
