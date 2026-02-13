import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populateTopicMapping() {
  console.log('\n🔗 POPULATING TOPIC QUESTION MAPPING\n');
  console.log('='.repeat(70));

  // Get all official topics
  const { data: officialTopics } = await supabase
    .from('topics')
    .select('id, name, subject');

  if (!officialTopics || officialTopics.length === 0) {
    console.log('❌ No official topics found\n');
    return;
  }

  // Create lookup map: topic name -> topic ID
  const topicNameToId = new Map();
  officialTopics.forEach(t => {
    topicNameToId.set(`${t.subject}:${t.name}`, t.id);
  });

  console.log(`\n📚 Loaded ${officialTopics.length} official topics\n`);

  // Get all questions WITHOUT mappings
  const { data: unmappedQuestions } = await supabase
    .from('questions')
    .select('id, topic, scan_id')
    .is('topic', null)
    .not('topic', 'is', null);

  // Actually, let's get ALL questions and check which ones aren't mapped
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, topic, scan_id');

  if (!allQuestions || allQuestions.length === 0) {
    console.log('❌ No questions found\n');
    return;
  }

  console.log(`📊 Total questions: ${allQuestions.length}\n`);

  // Get existing mappings
  const { data: existingMappings } = await supabase
    .from('topic_question_mapping')
    .select('question_id');

  const mappedQuestionIds = new Set(existingMappings?.map(m => m.question_id) || []);

  // Get scans to know which subject each question belongs to
  const { data: scans } = await supabase
    .from('scans')
    .select('id, subject');

  const scanIdToSubject = new Map();
  scans?.forEach(s => scanIdToSubject.set(s.id, s.subject));

  // Filter to unmapped questions only
  const questionsToMap = allQuestions.filter(q => !mappedQuestionIds.has(q.id));

  console.log(`🔗 Questions needing mapping: ${questionsToMap.length}\n`);

  if (questionsToMap.length === 0) {
    console.log('✅ All questions are already mapped\n');
    return;
  }

  let mapped = 0;
  let failed = 0;
  const failures = [];

  console.log('🔄 Creating mappings...\n');

  for (const question of questionsToMap) {
    const subject = scanIdToSubject.get(question.scan_id);
    if (!subject) {
      failed++;
      continue;
    }

    // Find topic ID
    const lookupKey = `${subject}:${question.topic}`;
    const topicId = topicNameToId.get(lookupKey);

    if (!topicId) {
      failed++;
      failures.push(`${question.topic} (${subject})`);
      continue;
    }

    // Create mapping
    const { error } = await supabase
      .from('topic_question_mapping')
      .insert({
        topic_id: topicId,
        question_id: question.id,
        confidence: 1.0
      });

    if (error) {
      // Check if it's a duplicate
      if (error.code === '23505') {
        // Already exists, skip
        continue;
      }
      console.log(`   ❌ Error mapping ${question.topic}: ${error.message}`);
      failed++;
    } else {
      mapped++;
      if (mapped % 10 === 0) {
        console.log(`   ✅ Mapped ${mapped} questions...`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY:\n');
  console.log(`   Total questions: ${allQuestions.length}`);
  console.log(`   Already mapped: ${mappedQuestionIds.size}`);
  console.log(`   Newly mapped: ${mapped}`);
  console.log(`   Failed: ${failed}`);

  if (failures.length > 0) {
    console.log(`\n⚠️  Failed topics (not in official syllabus):\n`);
    const uniqueFailures = [...new Set(failures)];
    uniqueFailures.slice(0, 10).forEach(f => {
      console.log(`   ❌ ${f}`);
    });
    if (uniqueFailures.length > 10) {
      console.log(`   ... and ${uniqueFailures.length - 10} more`);
    }
  }

  console.log('\n✅ DONE!\n');
}

populateTopicMapping().catch(console.error);
