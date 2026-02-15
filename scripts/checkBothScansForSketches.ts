import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBothScans() {
  console.log('\n🔍 CHECKING BOTH LATEST MATH SCANS FOR SKETCH NOTES\n');
  console.log('='.repeat(70));

  // Get the 2 latest Math scans
  const { data: mathScans } = await supabase
    .from('scans')
    .select('id, name, created_at')
    .eq('subject', 'Math')
    .order('created_at', { ascending: false })
    .limit(2);

  if (!mathScans || mathScans.length === 0) {
    console.log('No Math scans found');
    return;
  }

  console.log(`Found ${mathScans.length} latest Math scans:\n`);

  let grandTotal = 0;

  for (const scan of mathScans) {
    console.log(`\n📄 ${scan.name || 'Untitled'}`);
    console.log(`   ID: ${scan.id}`);
    console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}`);

    // Check sketch_progress
    const { data: sketchProgress, count: spCount } = await supabase
      .from('sketch_progress')
      .select('*', { count: 'exact' })
      .eq('scan_id', scan.id);

    console.log(`\n   sketch_progress table: ${spCount || 0}`);
    if (sketchProgress && sketchProgress.length > 0) {
      for (const sp of sketchProgress) {
        console.log(`     - Topic: ${sp.topic || 'Unknown'}, Status: ${sp.status}`);
      }
    }

    // Check topic_sketches
    const { data: topicSketches, count: tsCount } = await supabase
      .from('topic_sketches')
      .select('*', { count: 'exact' })
      .eq('scan_id', scan.id);

    console.log(`   topic_sketches table: ${tsCount || 0}`);
    if (topicSketches && topicSketches.length > 0) {
      console.log(`     Topics:`, topicSketches.map(t => t.topic).join(', '));
    }

    // Check questions with visual_concept
    const { count: vcCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('scan_id', scan.id)
      .not('visual_concept', 'is', null);

    console.log(`   questions.visual_concept: ${vcCount || 0}`);

    const scanTotal = (spCount || 0) + (tsCount || 0) + (vcCount || 0);
    grandTotal += scanTotal;

    console.log(`\n   ✅ This Scan Total: ${scanTotal} visual notes`);
    console.log('-'.repeat(70));
  }

  console.log(`\n📊 GRAND TOTAL ACROSS BOTH SCANS: ${grandTotal} visual notes\n`);
}

checkBothScans();
