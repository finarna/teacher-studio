/**
 * DEBUG: Test topic aggregator with mappings
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAggregator() {
  console.log('\n🔍 DEBUGGING TOPIC AGGREGATOR\n');

  // Get user ID from a scan
  const { data: scan } = await supabase
    .from('scans')
    .select('user_id, id')
    .eq('subject', 'Physics')
    .limit(1)
    .single();

  if (!scan) {
    console.log('❌ No scans found');
    return;
  }

  const userId = scan.user_id;
  console.log(`User ID: ${userId}`);
  console.log(`Scan ID: ${scan.id}\n`);

  // Get questions from this scan
  const { data: questions } = await supabase
    .from('questions')
    .select('id, topic')
    .eq('scan_id', scan.id)
    .limit(10);

  console.log(`Questions from scan (first 10):`);
  questions?.forEach(q => {
    console.log(`  - ${q.id}: "${q.topic}"`);
  });

  // Get mappings for these questions
  const questionIds = questions?.map(q => q.id) || [];
  const { data: mappings } = await supabase
    .from('topic_question_mapping')
    .select('question_id, topic_id, topics(name)')
    .in('question_id', questionIds);

  console.log(`\nMappings found: ${mappings?.length || 0}`);
  mappings?.forEach(m => {
    const topicName = (m as any).topics?.name;
    console.log(`  - Question ${m.question_id} → Topic ${m.topic_id} (${topicName})`);
  });

  // Get official topics
  const { data: officialTopics } = await supabase
    .from('topics')
    .select('id, name, subject')
    .eq('subject', 'Physics');

  console.log(`\nOfficial Physics topics: ${officialTopics?.length || 0}`);
  officialTopics?.slice(0, 5).forEach(t => {
    console.log(`  - ${t.id}: "${t.name}"`);
  });

  // Test aggregation logic manually
  console.log('\n--- TESTING AGGREGATION LOGIC ---\n');

  const questionTopicMap = new Map<string, string>();
  (mappings || []).forEach(m => {
    questionTopicMap.set(m.question_id, m.topic_id);
  });

  console.log(`questionTopicMap size: ${questionTopicMap.size}`);

  const questionsByTopicId = new Map<string, any[]>();
  questions?.forEach(q => {
    const topicId = questionTopicMap.get(q.id);
    console.log(`  Question ${q.id} ("${q.topic}") → topicId: ${topicId || 'NOT MAPPED'}`);
    if (topicId) {
      if (!questionsByTopicId.has(topicId)) {
        questionsByTopicId.set(topicId, []);
      }
      questionsByTopicId.get(topicId)!.push(q);
    }
  });

  console.log(`\nQuestions grouped by topic ID:`);
  for (const [topicId, qs] of questionsByTopicId) {
    const topic = officialTopics?.find(t => t.id === topicId);
    console.log(`  - ${topic?.name || topicId}: ${qs.length} questions`);
  }

  // Now test the actual aggregator function
  console.log('\n--- TESTING ACTUAL AGGREGATOR ---\n');
  const { aggregateTopicsForUser } = await import('../lib/topicAggregator.ts');

  const topics = await aggregateTopicsForUser(userId, 'Physics', 'KCET');
  console.log(`Aggregator returned ${topics.length} topics`);

  const topicsWithQuestions = topics.filter(t => t.totalQuestions > 0);
  console.log(`Topics with questions: ${topicsWithQuestions.length}\n`);

  if (topicsWithQuestions.length > 0) {
    console.log('✅ SUCCESS! Topics with questions:');
    topicsWithQuestions.forEach(t => {
      console.log(`  ✅ ${t.topicName}: ${t.totalQuestions} questions`);
    });
  } else {
    console.log('❌ FAIL: No topics have questions');
    console.log('\nAll topics returned:');
    topics.slice(0, 5).forEach(t => {
      console.log(`  - ${t.topicName}: ${t.totalQuestions} questions`);
    });
  }
}

debugAggregator().catch(console.error);
