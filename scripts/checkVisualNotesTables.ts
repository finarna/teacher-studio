import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTables() {
  console.log('\n🔍 Checking Visual Notes Storage\n');
  console.log('='.repeat(70));

  const testScanId = 'bd210344-5d6b-4229-93b9-e49d7b5095ea';

  // Check sketch_progress
  const { data: sketchProgress, count: sp } = await supabase
    .from('sketch_progress')
    .select('*', { count: 'exact' })
    .eq('scan_id', testScanId);

  console.log(`\nsketch_progress table:`);
  console.log(`  Count: ${sp || 0}`);
  if (sketchProgress && sketchProgress.length > 0) {
    console.log(`  Sample:`, sketchProgress[0]);
  }

  // Check topic_sketches
  const { data: topicSketches, count: ts } = await supabase
    .from('topic_sketches')
    .select('*', { count: 'exact' })
    .eq('scan_id', testScanId);

  console.log(`\ntopic_sketches table:`);
  console.log(`  Count: ${ts || 0}`);
  if (topicSketches && topicSketches.length > 0) {
    console.log(`  Sample:`, topicSketches[0]);
  }

  // Check for any other sketch-related tables
  const { data: allScans } = await supabase
    .from('scans')
    .select('*')
    .eq('id', testScanId)
    .single();

  console.log(`\nScan metadata:`);
  console.log(`  Has analysisData:`, !!allScans?.analysisData);
  console.log(`  Keys in scan:`, Object.keys(allScans || {}));

  // Check all scans for sketch data
  console.log(`\n📊 Checking ALL scans for visual notes:`);
  const { data: allScansData } = await supabase
    .from('scans')
    .select('id, paper_name, subject')
    .limit(10);

  for (const scan of allScansData || []) {
    const { count: spCount } = await supabase
      .from('sketch_progress')
      .select('*', { count: 'exact', head: true })
      .eq('scan_id', scan.id);

    const { count: tsCount } = await supabase
      .from('topic_sketches')
      .select('*', { count: 'exact', head: true })
      .eq('scan_id', scan.id);

    if ((spCount || 0) > 0 || (tsCount || 0) > 0) {
      console.log(`\n  ${scan.paper_name || 'Untitled'} (${scan.subject}):`);
      console.log(`    sketch_progress: ${spCount || 0}`);
      console.log(`    topic_sketches: ${tsCount || 0}`);
    }
  }
}

checkTables();
