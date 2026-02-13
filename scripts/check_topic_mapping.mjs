import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTopicMapping() {
  console.log('\n🔍 CHECKING TOPIC QUESTION MAPPING\n');
  console.log('='.repeat(70));

  // Get system scan
  const { data: systemScans } = await supabase
    .from('scans')
    .select('id, name')
    .eq('is_system_scan', true)
    .eq('subject', 'Math');

  if (!systemScans || systemScans.length === 0) {
    console.log('❌ No system scans found\n');
    return;
  }

  const scanId = systemScans[0].id;
  console.log(`\n📋 System Scan: ${systemScans[0].name}`);
  console.log(`   ID: ${scanId}\n`);

  // Get questions from this scan
  const { data: questions, count: qCount } = await supabase
    .from('questions')
    .select('id, topic', { count: 'exact' })
    .eq('scan_id', scanId);

  console.log(`📊 Questions in questions table: ${qCount}\n`);

  if (!questions || questions.length === 0) {
    console.log('❌ No questions found\n');
    return;
  }

  // Check how many are mapped to topics
  const questionIds = questions.map(q => q.id);

  const { data: mappings, count: mappedCount } = await supabase
    .from('topic_question_mapping')
    .select('*', { count: 'exact' })
    .in('question_id', questionIds);

  console.log(`📍 Questions mapped to topics: ${mappedCount} / ${qCount}\n`);

  if (mappedCount === 0) {
    console.log('❌ NO QUESTIONS ARE MAPPED TO TOPICS!');
    console.log('\n⚠️  The topic_question_mapping table is empty for this scan.');
    console.log('   The aggregator needs this mapping to show questions by topic.\n');
    console.log('🔧 SOLUTION: Need to populate topic_question_mapping table\n');

    // Show sample question topics
    console.log('Sample question topics from questions table:\n');
    questions.slice(0, 5).forEach((q, i) => {
      console.log(`   ${i + 1}. ${q.topic || 'NO TOPIC'}`);
    });
    console.log('');
  } else {
    console.log(`✅ ${mappedCount} questions are mapped\n`);

    // Check which topics they're mapped to
    const { data: mappedTopics } = await supabase
      .from('topic_question_mapping')
      .select('topic_id')
      .in('question_id', questionIds);

    const uniqueTopicIds = [...new Set(mappedTopics?.map(m => m.topic_id))];

    console.log(`📚 Mapped to ${uniqueTopicIds.length} unique topics\n`);
  }

  console.log('='.repeat(70) + '\n');
}

checkTopicMapping().catch(console.error);
