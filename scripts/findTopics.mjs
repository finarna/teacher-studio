import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findTopics() {
  console.log('=== SEARCHING FOR MATH TOPICS ===\n');

  // Search for topics with "relation" or "function" in the name
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name, subject, exam_weightage')
    .eq('subject', 'MATHS')
    .ilike('name', '%relation%');

  console.log(`Topics with "relation" in name: ${topics?.length || 0}`);
  topics?.forEach(t => {
    console.log(`  - ${t.name} (ID: ${t.id})`);
  });

  const { data: topics2 } = await supabase
    .from('topics')
    .select('id, name, subject, exam_weightage')
    .eq('subject', 'MATHS')
    .ilike('name', '%function%');

  console.log(`\nTopics with "function" in name: ${topics2?.length || 0}`);
  topics2?.forEach(t => {
    console.log(`  - ${t.name} (ID: ${t.id})`);
  });

  // Get all KCET MATHS topics
  const { data: allTopics } = await supabase
    .from('topics')
    .select('id, name, exam_weightage')
    .eq('subject', 'MATHS')
    .limit(50);

  console.log(`\n=== ALL KCET MATHS TOPICS (first 50) ===`);
  const kcetTopics = allTopics?.filter(t => t.exam_weightage?.KCET > 0) || [];
  console.log(`Found ${kcetTopics.length} topics with KCET weightage\n`);

  kcetTopics.forEach(t => {
    console.log(`  - ${t.name} (weightage: ${t.exam_weightage.KCET})`);
  });
}

findTopics().catch(console.error);
