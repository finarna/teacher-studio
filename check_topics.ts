import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function checkTopics() {
  const { data: topics, error } = await supabase.from('topics').select('id, name, subject, exam_context').limit(10);
  if (error) console.error(error.message);
  else {
    console.log('Real Topics in DB (First 10):');
    topics.forEach(t => console.log(`  - [${t.exam_context}] ${t.name} (${t.id})`));
  }
  const { data: metadata } = await supabase.from('topic_metadata').select('topic_id, topic_name');
  console.log('
Topic Metadata in DB:');
  metadata?.forEach(m => console.log(`  - ${m.topic_name} (${m.topic_id})`));
}
checkTopics();
