/**
 * Find which topics are unmapped and need to be added to topics table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findUnmappedTopics() {
  const scanId = '988c86f0-75a3-4e53-8308-2347a41df26b';

  // Get all questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, topic')
    .eq('scan_id', scanId);

  // Get mapped question IDs
  const { data: mappings } = await supabase
    .from('topic_question_mapping')
    .select('question_id')
    .in('question_id', questions.map(q => q.id));

  const mappedIds = new Set(mappings.map(m => m.question_id));

  // Find unmapped questions
  const unmapped = questions.filter(q => !mappedIds.has(q.id));

  console.log(`📊 Unmapped Questions: ${unmapped.length}/60\n`);

  // Count by topic
  const topicCounts = {};
  unmapped.forEach(q => {
    topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
  });

  console.log('📋 Topics that need to be added to "topics" table:\n');
  Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([topic, count]) => {
      console.log(`   - ${topic} (${count} questions)`);
    });

  // Get existing topics
  const { data: existingTopics } = await supabase
    .from('topics')
    .select('name')
    .eq('subject', 'Math');

  const existingNames = new Set(existingTopics.map(t => t.name));

  console.log('\n💡 Action needed:');
  console.log('   Add these topics to the "topics" table, or');
  console.log('   Update officialTopics.ts to map them to existing topics');

  console.log('\n📚 Existing topics in database:');
  existingTopics.forEach(t => console.log(`   - ${t.name}`));
}

findUnmappedTopics();
