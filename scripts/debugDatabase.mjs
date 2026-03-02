import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

console.log('Environment check:');
console.log(`VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? 'Set' : 'NOT SET'}`);
console.log(`VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'NOT SET'}\n`);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379'; // prabhubp

async function debug() {
  console.log('=== DEBUGGING DATABASE CONNECTION ===\n');

  // 1. Check if we can access topic_resources at all
  console.log('1️⃣  Testing topic_resources table access...');
  const { data: anyResources, error: anyError, count } = await supabase
    .from('topic_resources')
    .select('id, user_id, subject, exam_context', { count: 'exact' })
    .limit(5);

  if (anyError) {
    console.log(`   ❌ Error: ${anyError.message}`);
    console.log(`   Code: ${anyError.code}`);
    console.log(`   Details: ${anyError.details}\n`);
  } else {
    console.log(`   ✅ Successfully accessed topic_resources table`);
    console.log(`   Total records in table: ${count}`);
    console.log(`   Sample records: ${anyResources?.length || 0}\n`);
    if (anyResources && anyResources.length > 0) {
      anyResources.forEach((r, idx) => {
        console.log(`   ${idx + 1}. User: ${r.user_id.substring(0, 8)}... | ${r.subject} ${r.exam_context}`);
      });
    }
  }

  // 2. Check for this specific user
  console.log('\n2️⃣  Checking for user prabhubp specifically...');
  const { data: userResources, error: userError } = await supabase
    .from('topic_resources')
    .select('id, subject, exam_context, mastery_level')
    .eq('user_id', userId)
    .limit(10);

  if (userError) {
    console.log(`   ❌ Error: ${userError.message}\n`);
  } else {
    console.log(`   ✅ Found ${userResources?.length || 0} topic_resources for this user`);
    if (userResources && userResources.length > 0) {
      const subjects = {};
      userResources.forEach(r => {
        const key = `${r.subject}-${r.exam_context}`;
        subjects[key] = (subjects[key] || 0) + 1;
      });
      console.log('\n   Breakdown by subject:');
      Object.entries(subjects).forEach(([key, count]) => {
        console.log(`   - ${key}: ${count} topics`);
      });
    } else {
      console.log('   No records found for this user');
    }
  }

  // 3. Check scans
  console.log('\n3️⃣  Checking scans for this user...');
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, user_id')
    .eq('user_id', userId)
    .limit(5);

  console.log(`   Found ${scans?.length || 0} scans`);
  if (scans && scans.length > 0) {
    scans.forEach((s, idx) => {
      console.log(`   ${idx + 1}. ${s.name} | ${s.subject} ${s.exam_context}`);
    });
  }

  // 4. Check questions
  console.log('\n4️⃣  Checking questions for this user...');
  const { data: questions } = await supabase
    .from('questions')
    .select('id, topic, subject, exam_context')
    .eq('user_id', userId)
    .limit(10);

  console.log(`   Found ${questions?.length || 0} questions`);
  if (questions && questions.length > 0) {
    const topics = [...new Set(questions.map(q => q.topic))];
    const subjects = [...new Set(questions.map(q => `${q.subject}-${q.exam_context}`))];
    console.log(`   Subjects: ${subjects.join(', ')}`);
    console.log(`   Sample topics: ${topics.slice(0, 5).join(', ')}`);
  }

  // 5. Check practice_answers
  console.log('\n5️⃣  Checking practice_answers for this user...');
  const { data: answers } = await supabase
    .from('practice_answers')
    .select('id, user_id, topic_resource_id, is_correct')
    .eq('user_id', userId)
    .limit(10);

  console.log(`   Found ${answers?.length || 0} practice answers`);
  if (answers && answers.length > 0) {
    const resourceIds = [...new Set(answers.map(a => a.topic_resource_id))];
    console.log(`   Linked to ${resourceIds.length} different topic_resource(s)`);

    // Try to get those topic resources
    if (resourceIds.length > 0) {
      const { data: linkedResources } = await supabase
        .from('topic_resources')
        .select('id, subject, exam_context, topic_id, mastery_level, questions_attempted')
        .in('id', resourceIds);

      console.log(`\n   📊 Topic resources with practice answers:`);
      linkedResources?.forEach((r, idx) => {
        console.log(`   ${idx + 1}. ${r.subject} ${r.exam_context} | Mastery: ${r.mastery_level}% | Attempted: ${r.questions_attempted}`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
}

debug().catch(console.error);
