/**
 * Check what's in the topics table vs topic_resources
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTopicsTables() {
  console.log('🔍 Checking topics vs topic_resources tables...\n');

  // Check topics table
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('id, name, subject')
    .eq('subject', 'Math');

  console.log('📋 topics table (official syllabus):');
  if (topicsError) {
    console.log(`   ❌ Error: ${topicsError.message}`);
  } else {
    console.log(`   Found ${topics?.length || 0} Math topics`);
    if (topics && topics.length > 0) {
      topics.slice(0, 10).forEach(t => {
        console.log(`   - ${t.name}`);
      });
      if (topics.length > 10) {
        console.log(`   ... and ${topics.length - 10} more`);
      }
    }
  }

  // Check topic_resources table
  const { data: topicResources, error: trError } = await supabase
    .from('topic_resources')
    .select('id, name, subject, exam_context')
    .eq('subject', 'Math')
    .eq('exam_context', 'KCET');

  console.log('\n📚 topic_resources table (user-specific):');
  if (trError) {
    console.log(`   ❌ Error: ${trError.message}`);
  } else {
    console.log(`   Found ${topicResources?.length || 0} Math KCET topic_resources`);
    if (topicResources && topicResources.length > 0) {
      topicResources.slice(0, 10).forEach(t => {
        console.log(`   - ${t.name}`);
      });
      if (topicResources.length > 10) {
        console.log(`   ... and ${topicResources.length - 10} more`);
      }
    }
  }

  // Check topic_question_mapping for the new scan
  const scanId = '988c86f0-75a3-4e53-8308-2347a41df26b';
  const { data: mappings, error: mapError } = await supabase
    .from('topic_question_mapping')
    .select('topic_id')
    .in('question_id', (await supabase.from('questions').select('id').eq('scan_id', scanId)).data.map(q => q.id));

  console.log(`\n🔗 topic_question_mapping for new scan:`);
  console.log(`   Mapped: ${mappings?.length || 0}/60 questions`);

  if (topics && topics.length > 0) {
    console.log('\n✅ The "topics" table exists and has Math topics');
    console.log('   autoMapScanQuestions should work if called correctly');
  } else {
    console.log('\n❌ No Math topics in "topics" table');
    console.log('   This is why auto-mapping failed!');
  }
}

checkTopicsTables();
