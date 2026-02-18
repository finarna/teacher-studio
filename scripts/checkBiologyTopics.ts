import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBiologyTopics() {
  console.log('📚 Fetching Biology topics from database...\n');

  const { data: topics, error } = await supabase
    .from('topics')
    .select('name, subject, domain, exam_weightage')
    .eq('subject', 'Biology')
    .order('name');

  if (error) {
    console.error('❌ Error fetching topics:', error);
    return;
  }

  if (!topics || topics.length === 0) {
    console.log('⚠️ No Biology topics found in database!');
    return;
  }

  console.log(`✅ Found ${topics.length} Biology topics:\n`);

  // Group by domain
  const byDomain: Record<string, any[]> = {};
  topics.forEach(t => {
    if (!byDomain[t.domain]) byDomain[t.domain] = [];
    byDomain[t.domain].push(t);
  });

  for (const [domain, topicList] of Object.entries(byDomain)) {
    console.log(`\n📖 ${domain} (${topicList.length} topics):`);
    topicList.forEach((t, i) => {
      const weightage = t.exam_weightage;
      const weightStr = weightage ? ` [NEET: ${weightage.NEET || 0}, KCET: ${weightage.KCET || 0}]` : '';
      console.log(`  ${i + 1}. ${t.name}${weightStr}`);
    });
  }
}

checkBiologyTopics();
