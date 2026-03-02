import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

// Use SERVICE ROLE key to bypass RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379'; // prabhubp

async function check() {
  console.log('\n🔍 DIRECT DATABASE CHECK (Service Role)\n');

  // Test connection
  const { data: testData, error: testError } = await supabase
    .from('topic_resources')
    .select('count', { count: 'exact', head: true });

  if (testError) {
    console.log(`❌ Connection error: ${testError.message}\n`);
    return;
  }

  console.log(`✅ Connected to database\n`);

  // Check topic_resources for this user
  const { data: resources, error } = await supabase
    .from('topic_resources')
    .select('*')
    .eq('user_id', userId);

  console.log(`📊 Topic Resources for user ${userId.substring(0, 8)}...:`);
  console.log(`   Found: ${resources?.length || 0} records\n`);

  if (resources && resources.length > 0) {
    resources.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.subject} ${r.exam_context}`);
      console.log(`   Topic ID: ${r.topic_id}`);
      console.log(`   Mastery: ${r.mastery_level}% | Accuracy: ${r.average_accuracy}%`);
      console.log(`   Attempted: ${r.questions_attempted}/${r.total_questions}`);
      console.log('');
    });

    // Find Relations and Functions by checking questions
    for (const resource of resources) {
      const { data: questions } = await supabase
        .from('questions')
        .select('topic, subject, exam_context')
        .eq('topic_id', resource.topic_id)
        .limit(3);

      const topics = questions?.map(q => q.topic).join(', ') || 'No questions';
      console.log(`Topics for ${resource.subject} ${resource.exam_context}: ${topics}`);

      if (topics.toLowerCase().includes('relation') || topics.toLowerCase().includes('function')) {
        console.log(`\n✅ FOUND RELATIONS AND FUNCTIONS!\n`);

        // Get practice answers
        const { data: answers } = await supabase
          .from('practice_answers')
          .select('is_correct')
          .eq('topic_resource_id', resource.id);

        const attempted = answers?.length || 0;
        const correct = answers?.filter(a => a.is_correct).length || 0;
        const accuracy = attempted > 0 ? (correct / attempted * 100).toFixed(2) : 0;

        console.log('STORED VALUES:');
        console.log(`  Mastery: ${resource.mastery_level}%`);
        console.log(`  Accuracy: ${resource.average_accuracy}%`);
        console.log(`  Attempted: ${resource.questions_attempted}`);
        console.log(`  Correct: ${resource.questions_correct}`);

        console.log('\nACTUAL VALUES (from practice_answers):');
        console.log(`  Attempted: ${attempted}`);
        console.log(`  Correct: ${correct}`);
        console.log(`  Accuracy: ${accuracy}%`);

        console.log('\nMATCH:');
        console.log(`  Attempted: ${resource.questions_attempted === attempted ? '✅' : '❌'}`);
        console.log(`  Correct: ${resource.questions_correct === correct ? '✅' : '❌'}`);
        console.log(`  Accuracy: ${Math.abs(resource.average_accuracy - accuracy) < 1 ? '✅' : '❌'}`);
      }
    }
  } else {
    console.log('❌ No topic_resources found for this user\n');
  }
}

check().catch(console.error);
