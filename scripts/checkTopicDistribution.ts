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

async function checkTopics() {
  const { data: questions } = await supabase
    .from('questions')
    .select('topic');

  const topicCounts = new Map<string, number>();
  questions?.forEach(q => {
    const topic = q.topic || 'NULL';
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  });

  console.log('\n📊 TOP 30 TOPICS IN DATABASE:\n');
  Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([topic, count]) => {
      console.log(`${count.toString().padStart(4)} questions: ${topic}`);
    });
}

checkTopics();
