import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function explainSources() {
  console.log('\n📊 WHAT IS STORED IN EACH SKETCH SOURCE\n');
  console.log('='.repeat(70));

  // SOURCE 1: sketch_progress table
  console.log('\n1️⃣  SKETCH_PROGRESS TABLE');
  console.log('   Purpose: User progress tracking for sketch notes');
  console.log('-'.repeat(70));
  
  const { data: sp } = await supabase
    .from('sketch_progress')
    .select('*')
    .limit(1);

  if (!sp || sp.length === 0) {
    console.log('   📋 Table exists but empty (0 rows)');
    console.log('   Expected fields: user_id, topic_id, scan_id, sketch_id, completed, notes');
    console.log('   Use case: Track which users have viewed/completed which sketch notes');
  } else {
    console.log('   Sample row:', JSON.stringify(sp[0], null, 2));
  }

  // SOURCE 2: topic_sketches table
  console.log('\n2️⃣  TOPIC_SKETCHES TABLE');
  console.log('   Purpose: Dedicated sketch notes for topics');
  console.log('-'.repeat(70));
  
  const { data: ts } = await supabase
    .from('topic_sketches')
    .select('*')
    .limit(1);

  if (!ts || ts.length === 0) {
    console.log('   📋 Table exists but empty (0 rows)');
    console.log('   Expected fields: topic_id, scan_id, sketch_url, title, description');
    console.log('   Use case: Store dedicated visual study guides for each topic');
  } else {
    console.log('   Sample row:', JSON.stringify(ts[0], null, 2));
  }

  // SOURCE 3: questions.visual_concept
  console.log('\n3️⃣  QUESTIONS.VISUAL_CONCEPT FIELD');
  console.log('   Purpose: Visual diagrams/concepts for individual questions');
  console.log('-'.repeat(70));
  
  const { data: vc } = await supabase
    .from('questions')
    .select('id, question_text, visual_concept')
    .not('visual_concept', 'is', null)
    .limit(1);

  if (!vc || vc.length === 0) {
    console.log('   📋 No questions with visual_concept found');
    console.log('   Expected: JSON with diagram data, SVG, or image URLs');
    console.log('   Use case: Attach diagrams/visuals to specific questions (e.g., geometry diagrams)');
  } else {
    console.log('   Question ID:', vc[0].id.substring(0, 20) + '...');
    console.log('   Question:', vc[0].question_text?.substring(0, 80) + '...');
    console.log('   Visual concept type:', typeof vc[0].visual_concept);
    console.log('   Visual concept preview:', JSON.stringify(vc[0].visual_concept, null, 2).substring(0, 200) + '...');
  }

  // SOURCE 4: scans.analysis_data.topicBasedSketches
  console.log('\n4️⃣  SCANS.ANALYSIS_DATA.TOPICBASEDSKETCHES');
  console.log('   Purpose: AI-generated multi-page topic study guides');
  console.log('-'.repeat(70));
  
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, analysis_data')
    .eq('id', 'bd210344-5d6b-4229-93b9-e49d7b5095ea')
    .single();

  if (scans?.analysis_data?.topicBasedSketches) {
    const sketches = scans.analysis_data.topicBasedSketches;
    const topics = Object.keys(sketches);
    
    console.log('   ✅ Found in scan:', scans.name);
    console.log('   Topics with sketches:', topics.length);
    
    topics.forEach(topic => {
      const sketch = sketches[topic];
      console.log('\n   📚 Topic:', topic);
      console.log('      Pages:', sketch.pages?.length || 0);
      if (sketch.pages && sketch.pages[0]) {
        console.log('      Sample page structure:');
        const page = sketch.pages[0];
        console.log('        - title:', page.title);
        console.log('        - subtitle:', page.subtitle);
        console.log('        - imageData: (base64 PNG data - truncated)', page.imageData?.substring(0, 50) + '...');
        console.log('        - content sections:', page.content?.length || 0);
      }
    });
    
    console.log('\n   Use case: Multi-page visual study guides with formulas, diagrams, examples');
    console.log('   Generation: AI-generated using Gemini, rendered as base64 PNG images');
    console.log('   Storage: Cached in browser + stored in scan.analysis_data JSON');
  } else {
    console.log('   📋 No topicBasedSketches in this scan');
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📝 SUMMARY OF ALL 4 SOURCES:');
  console.log('   1. sketch_progress: User tracking - who viewed/completed what');
  console.log('   2. topic_sketches: Dedicated topic sketches - uploaded files/URLs');
  console.log('   3. visual_concept: Question-specific diagrams (geometry, charts, etc)');
  console.log('   4. topicBasedSketches: AI-generated multi-page study guides (MOST COMMON)');
  console.log('\n💡 Note: Source #4 is where your "Three Dimensional Geometry" 4-page guide is stored!');
}

explainSources().catch(console.error);
