import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const scanId = 'bd210344-5d6b-4229-93b9-e49d7b5095ea';

console.log('\n🔍 CHECKING NEW SCAN MAPPING\n');
console.log('='.repeat(70));

// Get scan details
const { data: scan } = await supabase
  .from('scans')
  .select('id, name, created_at')
  .eq('id', scanId)
  .single();

console.log(`\n📋 Scan: ${scan.name}`);

// Get questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, topic')
  .eq('scan_id', scanId);

console.log(`📊 Questions: ${questions.length}\n`);

// Get mappings
const { data: mappings } = await supabase
  .from('topic_question_mapping')
  .select(`
    question_id,
    topics:topic_id (
      name
    )
  `)
  .in('question_id', questions.map(q => q.id));

console.log(`🔗 Mappings: ${mappings.length}\n`);

// Group by topic
const byTopic = {};
mappings.forEach(m => {
  const topicName = m.topics.name;
  byTopic[topicName] = (byTopic[topicName] || 0) + 1;
});

console.log('📈 QUESTIONS PER TOPIC:\n');
Object.entries(byTopic)
  .sort((a, b) => b[1] - a[1])
  .forEach(([topic, count]) => {
    console.log(`   ${topic.padEnd(40)} ${count} questions`);
  });

console.log('\n' + '='.repeat(70));
console.log(`\n✅ SUCCESS RATE: ${mappings.length}/${questions.length}\n`);
