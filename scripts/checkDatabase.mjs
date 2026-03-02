import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379'; // prabhubp

async function checkDatabase() {
  console.log('=== DATABASE CHECK ===\n');

  // 1. Check topics table
  const { data: allTopics, error: topicsError } = await supabase
    .from('topics')
    .select('id, name, subject')
    .limit(20);

  if (topicsError) {
    console.log(`❌ Error fetching topics: ${topicsError.message}`);
  } else {
    console.log(`📚 Topics in database: ${allTopics?.length || 0}`);
    if (allTopics && allTopics.length > 0) {
      const subjects = [...new Set(allTopics.map(t => t.subject))];
      console.log(`   Subjects: ${subjects.join(', ')}`);
      console.log('\n   Sample topics:');
      allTopics.slice(0, 10).forEach(t => {
        console.log(`   - ${t.name} (${t.subject})`);
      });
    }
  }

  // 2. Check topic_resources for this user
  const { data: resources, error: resError } = await supabase
    .from('topic_resources')
    .select('id, topic_id, subject, exam_context, mastery_level, questions_attempted')
    .eq('user_id', userId)
    .limit(10);

  console.log(`\n📊 Topic Resources for user: ${resources?.length || 0}`);
  if (resources && resources.length > 0) {
    console.log('\n   User has topic resources:');
    resources.forEach(r => {
      console.log(`   - Topic: ${r.topic_id.substring(0, 8)}... | ${r.subject} ${r.exam_context} | Mastery: ${r.mastery_level}% | Attempted: ${r.questions_attempted}`);
    });
  }

  // 3. Check scans for this user
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context')
    .eq('user_id', userId)
    .limit(10);

  console.log(`\n📄 Scans for user: ${scans?.length || 0}`);
  if (scans && scans.length > 0) {
    const bySubject = {};
    scans.forEach(s => {
      const key = `${s.subject} (${s.exam_context})`;
      bySubject[key] = (bySubject[key] || 0) + 1;
    });
    Object.entries(bySubject).forEach(([key, count]) => {
      console.log(`   - ${key}: ${count} scans`);
    });
  }

  // 4. Check questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, topic, subject, exam_context')
    .eq('user_id', userId)
    .eq('subject', 'MATHS')
    .eq('exam_context', 'KCET')
    .limit(10);

  console.log(`\n❓ Questions for user (MATHS KCET): ${questions?.length || 0}`);
  if (questions && questions.length > 0) {
    const topics = [...new Set(questions.map(q => q.topic))];
    console.log(`   Topics in questions: ${topics.slice(0, 5).join(', ')}`);
  }

  // 5. Check chapter_insights
  if (scans && scans.length > 0) {
    const scanIds = scans.map(s => s.id);
    const { data: insights } = await supabase
      .from('chapter_insights')
      .select('topic, scan_id')
      .in('scan_id', scanIds)
      .limit(10);

    console.log(`\n💡 Chapter Insights: ${insights?.length || 0}`);
    if (insights && insights.length > 0) {
      const topics = [...new Set(insights.map(i => i.topic))];
      console.log(`   Topics: ${topics.slice(0, 5).join(', ')}`);
    }
  }
}

checkDatabase().catch(console.error);
