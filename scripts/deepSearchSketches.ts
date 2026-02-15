import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const scan1 = 'bd210344-5d6b-4229-93b9-e49d7b5095ea';
const scan2 = 'fa03f216-e79d-4b0a-9082-c143647466f3';

async function deepSearch() {
  console.log('\n🔍 SEARCHING FOR "THREE DIMENSIONAL GEOMETRY" VISUAL DATA\n');
  console.log('='.repeat(70));

  // First, find ALL topics named "Three Dimensional Geometry"
  const { data: threeDTopics } = await supabase
    .from('topics')
    .select('*')
    .ilike('name', '%Three Dimensional%');

  console.log(`\n📚 FOUND ${threeDTopics?.length || 0} TOPICS MATCHING "Three Dimensional":\n`);
  if (threeDTopics && threeDTopics.length > 0) {
    threeDTopics.forEach((t, i) => {
      console.log(`\n  ${i + 1}. ${t.name}`);
      console.log(`     ID: ${t.id}`);
      console.log(`     Scan ID: ${t.scan_id}`);
      console.log(`     All fields:`, Object.keys(t));

      // Check for any visual/sketch/page fields
      const visualFields = Object.keys(t).filter(k =>
        k.includes('visual') || k.includes('sketch') || k.includes('page') || k.includes('symbol') || k.includes('image')
      );
      if (visualFields.length > 0) {
        console.log(`     📸 Visual fields:`, visualFields);
        visualFields.forEach(f => {
          console.log(`        ${f}:`, t[f]);
        });
      }
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('\nNow checking each scan:\n');

  for (const scanId of [scan1, scan2]) {
    console.log(`\n\nScan ID: ${scanId.substring(0, 8)}...`);
    console.log('='.repeat(70));

    // 1. sketch_progress
    const { data: sp } = await supabase
      .from('sketch_progress')
      .select('*')
      .eq('scan_id', scanId);
    console.log(`\n1. sketch_progress: ${sp?.length || 0} rows`);
    if (sp && sp.length > 0) console.log(JSON.stringify(sp, null, 2));

    // 2. topic_sketches
    const { data: ts } = await supabase
      .from('topic_sketches')
      .select('*')
      .eq('scan_id', scanId);
    console.log(`\n2. topic_sketches: ${ts?.length || 0} rows`);
    if (ts && ts.length > 0) console.log(JSON.stringify(ts, null, 2));

    // 3. Check scan metadata itself
    const { data: scanData } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single();

    console.log(`\n3. Scan metadata fields:`);
    if (scanData) {
      console.log(`   - Has analysis_data: ${!!scanData.analysis_data}`);
      console.log(`   - Has metadata: ${!!scanData.metadata}`);

      // Check if metadata contains sketches
      if (scanData.metadata) {
        console.log(`   - Metadata keys:`, Object.keys(scanData.metadata));
        if (scanData.metadata.sketches) {
          console.log(`   - metadata.sketches:`, scanData.metadata.sketches);
        }
      }
    }

    // 4. Check questions for any sketch-related fields
    const { data: questions } = await supabase
      .from('questions')
      .select('id, visual_concept, diagram_url, visual_element_type, visual_element_description')
      .eq('scan_id', scanId)
      .limit(5);

    console.log(`\n4. Sample questions (first 5):`);
    if (questions) {
      for (const q of questions) {
        const hasVisual = q.visual_concept || q.diagram_url || q.visual_element_type;
        if (hasVisual) {
          console.log(`   - Question ${q.id.substring(0, 8)}: has visual data`);
        }
      }
    }

    // 5. Check for user-specific sketch data
    const { data: userSketches } = await supabase
      .from('sketch_progress')
      .select('*')
      .not('scan_id', 'is', null);

    console.log(`\n5. Total sketch_progress rows in system: ${userSketches?.length || 0}`);

    // Check if any reference this scan
    const matchingSketches = userSketches?.filter(s =>
      s.scan_id === scanId ||
      (s.metadata && JSON.stringify(s.metadata).includes(scanId))
    );

    if (matchingSketches && matchingSketches.length > 0) {
      console.log(`   Found ${matchingSketches.length} sketches referencing this scan!`);
      console.log(JSON.stringify(matchingSketches, null, 2));
    }
  }
}

deepSearch();
