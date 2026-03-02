import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const email = 'prabhubp@gmail.com';

async function findUser() {
  console.log('\n🔍 FINDING USER DATA\n');

  // 1. Find user in auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log(`❌ Auth error: ${authError.message}\n`);
  } else {
    const user = authUsers.users.find(u => u.email === email);
    if (user) {
      console.log(`✅ Found user in auth:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log('');

      // Now search for their data
      const userId = user.id;

      // Check scans
      const { data: scans } = await supabase
        .from('scans')
        .select('id, name, subject, exam_context')
        .eq('user_id', userId)
        .limit(5);

      console.log(`📄 Scans: ${scans?.length || 0}`);
      if (scans && scans.length > 0) {
        scans.forEach(s => console.log(`   - ${s.name} (${s.subject} ${s.exam_context})`));
      }
      console.log('');

      // Check questions
      const { data: questions } = await supabase
        .from('questions')
        .select('id, topic, subject')
        .eq('user_id', userId)
        .limit(5);

      console.log(`❓ Questions: ${questions?.length || 0}`);
      if (questions && questions.length > 0) {
        const topics = [...new Set(questions.map(q => q.topic))];
        console.log(`   Topics: ${topics.slice(0, 3).join(', ')}`);
      }
      console.log('');

      // Check topic_resources
      const { data: resources } = await supabase
        .from('topic_resources')
        .select('id, subject, exam_context, mastery_level, questions_attempted, total_questions')
        .eq('user_id', userId);

      console.log(`📊 Topic Resources: ${resources?.length || 0}`);
      if (resources && resources.length > 0) {
        resources.forEach(r => {
          console.log(`   - ${r.subject} ${r.exam_context}: ${r.mastery_level}% mastery, ${r.questions_attempted}/${r.total_questions} attempted`);
        });
      }
      console.log('');

      // Check practice_answers
      const { data: answers } = await supabase
        .from('practice_answers')
        .select('id')
        .eq('user_id', userId);

      console.log(`✅ Practice Answers: ${answers?.length || 0}\n`);

      // If no topic_resources but has questions, check what happened
      if ((!resources || resources.length === 0) && questions && questions.length > 0) {
        console.log('⚠️  User has questions but NO topic_resources!');
        console.log('   This means the aggregation hasn\'t run yet.\n');
      }

    } else {
      console.log(`❌ User ${email} not found in auth.users\n`);
    }
  }
}

findUser().catch(console.error);
