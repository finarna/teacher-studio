/**
 * Verify topic mapping for the new Math scan
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTopicMapping() {
  const scanId = '988c86f0-75a3-4e53-8308-2347a41df26b';

  const { data: questions } = await supabase
    .from('questions')
    .select('id, topic, domain, year')
    .eq('scan_id', scanId);

  console.log('📊 Topic Mapping Analysis\n');
  console.log(`Total questions: ${questions.length}`);

  // Count by topic
  const topicCounts = {};
  const noTopic = [];
  const noDomain = [];
  const noYear = [];

  questions.forEach(q => {
    if (!q.topic || q.topic === '') {
      noTopic.push(q.id);
    } else {
      topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
    }

    if (!q.domain || q.domain === '') {
      noDomain.push(q.id);
    }

    if (!q.year) {
      noYear.push(q.id);
    }
  });

  console.log(`\n✅ Questions with topic: ${questions.length - noTopic.length}/${questions.length}`);
  console.log(`✅ Questions with domain: ${questions.length - noDomain.length}/${questions.length}`);
  console.log(`✅ Questions with year: ${questions.length - noYear.length}/${questions.length}`);

  if (noTopic.length > 0) {
    console.log(`\n❌ ${noTopic.length} questions WITHOUT topic:`);
    console.log(`   IDs: ${noTopic.slice(0, 5).join(', ')}${noTopic.length > 5 ? '...' : ''}`);
  }

  if (noDomain.length > 0) {
    console.log(`\n❌ ${noDomain.length} questions WITHOUT domain:`);
    console.log(`   IDs: ${noDomain.slice(0, 5).join(', ')}${noDomain.length > 5 ? '...' : ''}`);
  }

  if (noYear.length > 0) {
    console.log(`\n❌ ${noYear.length} questions WITHOUT year:`);
    console.log(`   IDs: ${noYear.slice(0, 5).join(', ')}${noYear.length > 5 ? '...' : ''}`);
  }

  console.log('\n📊 Topic Distribution:');
  Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([topic, count]) => {
      console.log(`   ${topic}: ${count} questions`);
    });

  // Check topic_question_mapping table
  const { data: mappings, error: mapError } = await supabase
    .from('topic_question_mapping')
    .select('question_id')
    .in('question_id', questions.map(q => q.id));

  if (mapError) {
    console.error('\n❌ Error checking topic_question_mapping:', mapError);
  } else {
    console.log(`\n📋 topic_question_mapping table: ${mappings?.length || 0}/${questions.length} questions mapped`);

    if (!mappings || mappings.length === 0) {
      console.log('   ⚠️  THIS is why admin panel shows 0% - topic_question_mapping table is empty!');
      console.log('   ⚠️  Questions have topic field but are not linked to topic_resources.');
    }
  }
}

verifyTopicMapping();
