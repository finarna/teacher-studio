import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Import the smart matching function
import { matchToOfficialTopic } from '../utils/officialTopics.ts';

async function smartTopicMapping() {
  console.log('\n🤖 SMART TOPIC MAPPING (AI-powered)\n');
  console.log('='.repeat(70));

  // Get all official topics
  const { data: officialTopics } = await supabase
    .from('topics')
    .select('id, name, subject, domain');

  if (!officialTopics || officialTopics.length === 0) {
    console.log('❌ No official topics found\n');
    return;
  }

  // Create lookup: subject:name -> topic
  const topicLookup = new Map();
  officialTopics.forEach(t => {
    topicLookup.set(`${t.subject}:${t.name}`, t);
  });

  console.log(`\n📚 Loaded ${officialTopics.length} official topics\n`);

  // Get all questions
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, topic, scan_id');

  if (!allQuestions || allQuestions.length === 0) {
    console.log('❌ No questions found\n');
    return;
  }

  console.log(`📊 Total questions: ${allQuestions.length}\n`);

  // Get scans to know subject
  const { data: scans } = await supabase
    .from('scans')
    .select('id, subject, name');

  const scanInfo = new Map();
  scans?.forEach(s => scanInfo.set(s.id, { subject: s.subject, name: s.name }));

  // Get existing mappings
  const { data: existingMappings } = await supabase
    .from('topic_question_mapping')
    .select('question_id');

  const alreadyMapped = new Set(existingMappings?.map(m => m.question_id) || []);

  console.log(`✅ Already mapped: ${alreadyMapped.size}`);
  console.log(`🔗 Need to map: ${allQuestions.length - alreadyMapped.size}\n`);

  // Map questions
  let mapped = 0;
  let skipped = 0;
  let failed = 0;
  const failedTopics = new Map();

  console.log('🔄 Mapping questions to official topics...\n');

  for (const question of allQuestions) {
    // Skip if already mapped
    if (alreadyMapped.has(question.id)) {
      skipped++;
      continue;
    }

    const scan = scanInfo.get(question.scan_id);
    if (!scan) {
      failed++;
      continue;
    }

    // Use smart matching
    const officialTopicName = matchToOfficialTopic(question.topic, scan.subject);

    if (!officialTopicName) {
      failed++;
      failedTopics.set(question.topic, (failedTopics.get(question.topic) || 0) + 1);
      continue;
    }

    // Get official topic ID
    const lookupKey = `${scan.subject}:${officialTopicName}`;
    const officialTopic = topicLookup.get(lookupKey);

    if (!officialTopic) {
      failed++;
      failedTopics.set(question.topic, (failedTopics.get(question.topic) || 0) + 1);
      continue;
    }

    // Create mapping
    const { error } = await supabase
      .from('topic_question_mapping')
      .insert({
        topic_id: officialTopic.id,
        question_id: question.id,
        confidence: 1.0,
        created_at: new Date().toISOString()
      });

    if (error) {
      if (error.code === '23505') {
        // Duplicate, skip
        continue;
      }
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    } else {
      mapped++;
      if (mapped % 50 === 0) {
        console.log(`   ✅ Mapped ${mapped} questions...`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 MAPPING COMPLETE!\n');
  console.log(`   Total questions: ${allQuestions.length}`);
  console.log(`   Already mapped: ${skipped}`);
  console.log(`   Newly mapped: ${mapped}`);
  console.log(`   Failed to map: ${failed}\n`);

  if (failedTopics.size > 0) {
    console.log('⚠️  Topics that could not be mapped:\n');
    const sorted = Array.from(failedTopics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    sorted.forEach(([topic, count]) => {
      console.log(`   ❌ "${topic}" (${count} questions)`);
    });

    if (failedTopics.size > 15) {
      console.log(`   ... and ${failedTopics.size - 15} more`);
    }
  }

  console.log('\n✅ DONE! Questions are now mapped to Learning Journey topics\n');
}

smartTopicMapping().catch(console.error);
