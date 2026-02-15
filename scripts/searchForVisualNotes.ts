import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function searchAllTables() {
  console.log('\n🔍 SEARCHING FOR VISUAL NOTES IN ALL POSSIBLE LOCATIONS\n');
  console.log('='.repeat(70));

  // 1. Check questions table for visual_concept field
  const { data: questionsWithVisuals, count: qCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact' })
    .not('visual_concept', 'is', null)
    .limit(5);

  console.log(`\n1. Questions with visual_concept field:`);
  console.log(`   Count: ${qCount || 0}`);
  if (questionsWithVisuals && questionsWithVisuals.length > 0) {
    console.log(`   Sample:`, {
      id: questionsWithVisuals[0].id,
      topic: questionsWithVisuals[0].topic,
      has_visual: !!questionsWithVisuals[0].visual_concept
    });
  }

  // 2. Check questions with diagram_url
  const { count: diagramCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .not('diagram_url', 'is', null);

  console.log(`\n2. Questions with diagram_url:`);
  console.log(`   Count: ${diagramCount || 0}`);

  // 3. Check chapter_insights (might have visual summaries)
  const { count: insightsCount } = await supabase
    .from('chapter_insights')
    .select('*', { count: 'exact', head: true })
    .not('visual_summary', 'is', null);

  console.log(`\n3. Chapter insights with visual_summary:`);
  console.log(`   Count: ${insightsCount || 0}`);

  // 4. Total counts across all potential sources
  const { count: totalSketchProgress } = await supabase
    .from('sketch_progress')
    .select('*', { count: 'exact', head: true });

  const { count: totalTopicSketches } = await supabase
    .from('topic_sketches')
    .select('*', { count: 'exact', head: true });

  console.log(`\n4. Total visual notes in system:`);
  console.log(`   sketch_progress: ${totalSketchProgress || 0}`);
  console.log(`   topic_sketches: ${totalTopicSketches || 0}`);

  console.log(`\n📊 SUMMARY:`);
  console.log(`=`.repeat(70));
  console.log(`Dedicated visual notes (sketch_progress + topic_sketches): ${(totalSketchProgress || 0) + (totalTopicSketches || 0)}`);
  console.log(`Questions with visual elements: ${(qCount || 0) + (diagramCount || 0)}`);
  console.log(`Chapter insights with visuals: ${insightsCount || 0}`);
}

searchAllTables();
