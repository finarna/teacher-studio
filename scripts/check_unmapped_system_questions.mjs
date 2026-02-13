import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUnmappedQuestions() {
  console.log('\n🔍 CHECKING UNMAPPED SYSTEM QUESTIONS\n');
  console.log('='.repeat(70));

  // Get system scan
  const { data: systemScans } = await supabase
    .from('scans')
    .select('id, name')
    .eq('is_system_scan', true)
    .eq('subject', 'Math');

  if (!systemScans || systemScans.length === 0) {
    console.log('❌ No system scans\n');
    return;
  }

  const scanId = systemScans[0].id;
  console.log(`\n📋 System Scan: ${systemScans[0].name}\n`);

  // Get all questions from this scan
  const { data: questions } = await supabase
    .from('questions')
    .select('id, topic')
    .eq('scan_id', scanId);

  if (!questions || questions.length === 0) {
    console.log('❌ No questions\n');
    return;
  }

  // Get mapped question IDs
  const questionIds = questions.map(q => q.id);
  const { data: mappings } = await supabase
    .from('topic_question_mapping')
    .select('question_id')
    .in('question_id', questionIds);

  const mappedIds = new Set(mappings?.map(m => m.question_id) || []);

  // Filter unmapped
  const unmapped = questions.filter(q => !mappedIds.has(q.id));

  console.log(`Total questions: ${questions.length}`);
  console.log(`Mapped: ${mappedIds.size}`);
  console.log(`Unmapped: ${unmapped.length}\n`);

  // Group unmapped by topic
  const topicCount = new Map();
  unmapped.forEach(q => {
    const topic = q.topic || 'NO_TOPIC';
    topicCount.set(topic, (topicCount.get(topic) || 0) + 1);
  });

  console.log('📊 UNMAPPED QUESTIONS BY TOPIC:\n');
  Array.from(topicCount.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([topic, count]) => {
      console.log(`   ${count}Q - "${topic}"`);
    });

  console.log('\n' + '='.repeat(70) + '\n');
}

checkUnmappedQuestions().catch(console.error);
