import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkBiologyTopics() {
  console.log('🔍 Auditing Biology Topics in Registry...');
  
  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .or('subject.ilike.%Bio%,subject.ilike.%Biology%');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Found ${topics?.length || 0} Biology-related topics.`);
  
  topics?.forEach(t => {
    console.log(`- [${t.subject}] ${t.name} (KCET weightage: ${t.exam_weightage?.KCET || 0})`);
  });

  const kcetTopics = topics?.filter(t => (t.exam_weightage?.KCET || 0) > 0);
  console.log(`\n✅ Topics with KCET weightage > 0: ${kcetTopics?.length || 0}`);
}

checkBiologyTopics();
