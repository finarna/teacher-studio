/**
 * Re-run auto-mapping for Math scan (simple version)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Topic mappings (from officialTopics.ts)
const TOPIC_MAPPINGS = {
  'Definite Integration': 'Integrals',
  'Indefinite Integration': 'Integrals',
  'Definite Integrals': 'Integrals',
  'Indefinite Integrals': 'Integrals',
  'Integration': 'Integrals',
  'Integral': 'Integrals',
};

async function remapScan() {
  const scanId = '988c86f0-75a3-4e53-8308-2347a41df26b';

  console.log('🔄 Re-mapping Integration questions to Integrals...\n');

  // Get all topics from database
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name')
    .eq('subject', 'Math');

  const topicLookup = new Map();
  topics.forEach(t => topicLookup.set(t.name, t.id));

  console.log('📚 Official topics in database:', topics.length);

  // Get unmapped questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, topic')
    .eq('scan_id', scanId);

  const { data: existingMappings } = await supabase
    .from('topic_question_mapping')
    .select('question_id')
    .in('question_id', questions.map(q => q.id));

  const mappedIds = new Set(existingMappings.map(m => m.question_id));
  const unmapped = questions.filter(q => !mappedIds.has(q.id));

  console.log(`📊 Unmapped questions: ${unmapped.length}/60\n`);

  let newlyMapped = 0;

  for (const q of unmapped) {
    const officialTopic = TOPIC_MAPPINGS[q.topic];
    if (!officialTopic) continue;

    const topicId = topicLookup.get(officialTopic);
    if (!topicId) {
      console.log(`   ⚠️  Topic "${officialTopic}" not found in database`);
      continue;
    }

    // Create mapping
    const { error } = await supabase
      .from('topic_question_mapping')
      .insert({
        topic_id: topicId,
        question_id: q.id,
        confidence: 1.0
      });

    if (error && error.code !== '23505') {
      console.error(`   ❌ Error mapping ${q.topic}:`, error.message);
    } else if (!error) {
      newlyMapped++;
      console.log(`   ✅ Mapped "${q.topic}" → "${officialTopic}"`);
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Newly mapped: ${newlyMapped} questions`);

  // Final count
  const { data: allMappings } = await supabase
    .from('topic_question_mapping')
    .select('question_id')
    .in('question_id', questions.map(q => q.id));

  console.log(`   Total mapped: ${allMappings.length}/60`);

  if (allMappings.length >= 53) {
    console.log('\n🎉 Success! Scan should now appear in Past Year Exams');
  } else {
    console.log(`\n⚠️  Still ${60 - allMappings.length} unmapped (Class 11 topics)`);
  }
}

remapScan();
