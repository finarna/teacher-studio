import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379'; // prabhubp

async function check() {
  console.log('=== CHECKING RELATIONS AND FUNCTIONS ===\n');

  // Get topic ID
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name')
    .eq('name', 'Relations and Functions')
    .eq('subject', 'MATHS');

  const topicId = topics?.[0]?.id;
  console.log(`Topic ID: ${topicId}\n`);

  // Get scans
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name')
    .eq('user_id', userId)
    .eq('subject', 'MATHS')
    .eq('exam_context', 'KCET');

  console.log(`User Scans: ${scans?.length || 0}`);
  const scanIds = scans?.map(s => s.id) || [];

  // Check insights
  if (scanIds.length > 0) {
    const { data: insights } = await supabase
      .from('chapter_insights')
      .select('*')
      .in('scan_id', scanIds);

    console.log(`\nAll Chapter Insights: ${insights?.length || 0}`);

    const relationsInsights = insights?.filter(i =>
      i.topic?.toLowerCase().includes('relation') ||
      i.topic?.toLowerCase().includes('function')
    );

    console.log(`Relations/Functions Insights: ${relationsInsights?.length || 0}`);

    if (relationsInsights && relationsInsights.length > 0) {
      relationsInsights.forEach(ins => {
        console.log(`\n  Topic: "${ins.topic}"`);
        console.log(`  Description: ${ins.description?.substring(0, 100)}...`);
        console.log(`  Key Concepts: ${ins.key_concepts?.length || 0}`);
        console.log(`  Formulas: ${ins.important_formulas?.length || 0}`);
      });
    }
  }

  // Check stats
  const { data: resource, error: resourceError } = await supabase
    .from('topic_resources')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .eq('exam_context', 'KCET')
    .maybeSingle();

  console.log(`\n=== STATS ===`);
  if (resourceError) {
    console.log(`Error fetching resource: ${resourceError.message}`);
  } else if (!resource) {
    console.log(`No topic_resources record found for this topic`);
  } else {
    console.log(`Mastery: ${resource.mastery_level || 0}%`);
    console.log(`Accuracy: ${resource.average_accuracy || 0}%`);
    console.log(`Questions Attempted: ${resource.questions_attempted || 0}`);
    console.log(`Questions Correct: ${resource.questions_correct || 0}`);
    console.log(`Quizzes: ${resource.quizzes_taken || 0}`);

    // Calculate expected accuracy
    if (resource.questions_attempted > 0) {
      const calcAccuracy = (resource.questions_correct / resource.questions_attempted * 100).toFixed(2);
      console.log(`Calculated Accuracy: ${calcAccuracy}%`);
      if (Math.abs(calcAccuracy - resource.average_accuracy) > 1) {
        console.log(`⚠️  MISMATCH! Stored: ${resource.average_accuracy}%, Calculated: ${calcAccuracy}%`);
      } else {
        console.log(`✅ Accuracy is correct`);
      }
    }
  }
}

check().catch(console.error);
