import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OFFICIAL_SCANS = {
  2021: 'eba5ed94-dde7-4171-80ff-aecbf0c969f7',
  2022: '0899f3e1-9980-48f4-9caa-91c65de53830',
  2023: 'eeed39eb-6ffe-4aaa-b752-b3139b311e6d',
  2024: '7019df69-f2e2-4464-afbb-cc56698cb8e9',
  2025: 'c202f81d-cc53-40b1-a473-8f621faac5ba'
};

async function checkScans() {
  console.log('Checking KCET Math scan data availability:\n');

  for (const [year, scanId] of Object.entries(OFFICIAL_SCANS)) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, text, topic, difficulty')
      .eq('scan_id', scanId)
      .limit(5);

    console.log(`Year ${year} (${scanId}):`);
    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.log(`  ⚠️  No questions found`);
    } else {
      console.log(`  ✅ Found ${data.length}+ questions`);
      console.log(`     Sample: "${data[0].text.substring(0, 60)}..."`);
    }
    console.log();
  }

  // Also check what scans ARE available for KCET Math
  console.log('\nChecking all available KCET Math scans:');
  const { data: scans } = await supabase
    .from('scans')
    .select('id, year, subject, exam_context')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .order('year');

  if (scans && scans.length > 0) {
    console.log('\nAvailable scans:');
    for (const scan of scans) {
      const { data: qCount } = await supabase
        .from('questions')
        .select('id')
        .eq('scan_id', scan.id);

      console.log(`  - ${scan.year}: ${scan.id} (${qCount?.length || 0} questions)`);
    }
  } else {
    console.log('  ⚠️  No KCET Math scans found in database');
  }
}

checkScans().catch(console.error);
