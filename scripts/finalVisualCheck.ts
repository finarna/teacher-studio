import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const testScanId = 'bd210344-5d6b-4229-93b9-e49d7b5095ea';

async function check() {
  console.log('\n🔍 VISUAL NOTES VERIFICATION\n');
  console.log('='.repeat(70));

  // Publish test scan
  await supabase
    .from('scans')
    .update({ is_system_scan: true })
    .eq('id', testScanId);

  // Get published scans
  const { data: published } = await supabase
    .from('scans')
    .select('id, name, subject')
    .eq('is_system_scan', true);

  console.log(`\nPublished scans: ${published?.length || 0}\n`);

  if (!published || published.length === 0) {
    console.log('❌ No published scans found');
    return;
  }

  for (const scan of published) {
    console.log(`Scan: ${scan.name || 'Untitled'} (${scan.subject})`);
    console.log(`ID: ${scan.id.substring(0, 8)}...`);

    const { count: visualCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('scan_id', scan.id)
      .not('visual_concept', 'is', null);

    const { count: totalCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('scan_id', scan.id);

    console.log(`  Total questions: ${totalCount}`);
    console.log(`  With visual_concept: ${visualCount}`);
    console.log('');
  }

  console.log('='.repeat(70));
  console.log('\nConclusion:');
  console.log('  If "With visual_concept" is 0, then this scan has no visual notes.');
  console.log('  The Admin UI is showing correct data.');
}

check();
