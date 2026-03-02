import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

async function checkMetadata() {
  console.log('\n🔍 CHECKING QUESTION METADATA INTEGRITY\n');

  // Get all questions for this user
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context')
    .eq('user_id', userId);

  console.log(`📄 User has ${scans?.length || 0} scans\n`);

  const scanIds = scans?.map(s => s.id) || [];

  if (scanIds.length === 0) {
    console.log('❌ No scans found for user\n');
    return;
  }

  // Get all questions from these scans
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, text, topic, subject, exam_context, solution_steps, key_formulas, exam_tip')
    .in('scan_id', scanIds);

  console.log(`📝 Total Questions: ${allQuestions?.length || 0}\n`);

  if (!allQuestions || allQuestions.length === 0) {
    console.log('❌ No questions found\n');
    return;
  }

  // Analyze metadata
  const stats = {
    total: allQuestions.length,
    nullSubject: allQuestions.filter(q => !q.subject).length,
    nullExam: allQuestions.filter(q => !q.exam_context).length,
    nullTopic: allQuestions.filter(q => !q.topic).length,
    emptySolutions: allQuestions.filter(q => !q.solution_steps || q.solution_steps.length === 0).length,
    emptyFormulas: allQuestions.filter(q => !q.key_formulas || q.key_formulas.length === 0).length,
    emptyTips: allQuestions.filter(q => !q.exam_tip).length
  };

  console.log('=' .repeat(60));
  console.log('  METADATA INTEGRITY REPORT');
  console.log('=' .repeat(60));
  console.log(`Total Questions:           ${stats.total}`);
  console.log(`Missing Subject:           ${stats.nullSubject} (${((stats.nullSubject/stats.total)*100).toFixed(1)}%)`);
  console.log(`Missing Exam Context:      ${stats.nullExam} (${((stats.nullExam/stats.total)*100).toFixed(1)}%)`);
  console.log(`Missing Topic:             ${stats.nullTopic} (${((stats.nullTopic/stats.total)*100).toFixed(1)}%)`);
  console.log('=' .repeat(60));
  console.log(`Empty Solution Steps:      ${stats.emptySolutions} (${((stats.emptySolutions/stats.total)*100).toFixed(1)}%)`);
  console.log(`Empty Key Formulas:        ${stats.emptyFormulas} (${((stats.emptyFormulas/stats.total)*100).toFixed(1)}%)`);
  console.log(`Empty Exam Tips:           ${stats.emptyTips} (${((stats.emptyTips/stats.total)*100).toFixed(1)}%)`);
  console.log('=' .repeat(60) + '\n');

  // Show sample of questions by topic
  const topicCounts = {};
  allQuestions.forEach(q => {
    const topic = q.topic || 'NO_TOPIC';
    if (!topicCounts[topic]) {
      topicCounts[topic] = {
        total: 0,
        withSolutions: 0,
        withMetadata: 0
      };
    }
    topicCounts[topic].total++;
    if (q.solution_steps && q.solution_steps.length > 0) topicCounts[topic].withSolutions++;
    if (q.subject && q.exam_context) topicCounts[topic].withMetadata++;
  });

  console.log('📊 BREAKDOWN BY TOPIC:\n');
  Object.entries(topicCounts)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .forEach(([topic, counts]) => {
      console.log(`${topic}:`);
      console.log(`  Total: ${counts.total}`);
      console.log(`  With Metadata: ${counts.withMetadata} (${((counts.withMetadata/counts.total)*100).toFixed(0)}%)`);
      console.log(`  With Solutions: ${counts.withSolutions} (${((counts.withSolutions/counts.total)*100).toFixed(0)}%)`);
      console.log('');
    });

  // Check Relations and Functions specifically
  const relationsQuestions = allQuestions.filter(q =>
    q.topic && (q.topic.toLowerCase().includes('relation') || q.topic.toLowerCase().includes('function'))
  );

  console.log('🎯 RELATIONS AND FUNCTIONS SPECIFIC:\n');
  console.log(`Found ${relationsQuestions.length} questions\n`);

  if (relationsQuestions.length > 0) {
    const sample = relationsQuestions[0];
    console.log(`Sample Question:`);
    console.log(`  ID: ${sample.id}`);
    console.log(`  Text: ${sample.text?.slice(0, 80)}...`);
    console.log(`  Topic: ${sample.topic}`);
    console.log(`  Subject: ${sample.subject || '❌ NULL'}`);
    console.log(`  Exam: ${sample.exam_context || '❌ NULL'}`);
    console.log(`  Solutions: ${sample.solution_steps?.length || 0} steps`);
    console.log('');
  }
}

checkMetadata().catch(console.error);
