import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const questionId = '69ebe871-465e-4bb3-ae6d-f2394b1947bd'; // From user's console log

async function checkQuestion() {
  console.log('\n🔍 CHECKING QUESTION DATA\n');
  console.log(`Question ID: ${questionId}\n`);

  const { data: question, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (error) {
    console.log(`❌ Error: ${error.message}\n`);
    return;
  }

  if (!question) {
    console.log('❌ Question not found\n');
    return;
  }

  console.log('📊 QUESTION DATA:\n');
  console.log(`Text: ${question.text?.slice(0, 100)}...`);
  console.log(`Topic: ${question.topic}`);
  console.log(`Subject: ${question.subject}`);
  console.log(`Exam: ${question.exam_context}`);
  console.log(`Difficulty: ${question.difficulty}`);
  console.log('');

  console.log('📝 SOLUTION DATA:\n');
  console.log(`solution_steps (${Array.isArray(question.solution_steps) ? question.solution_steps.length : 'NULL'} items):`);
  if (question.solution_steps && question.solution_steps.length > 0) {
    question.solution_steps.forEach((step, idx) => {
      console.log(`  ${idx + 1}. ${step.slice(0, 100)}${step.length > 100 ? '...' : ''}`);
    });
  } else {
    console.log(`  ❌ EMPTY`);
  }
  console.log('');

  console.log(`key_formulas (${Array.isArray(question.key_formulas) ? question.key_formulas.length : 'NULL'} items):`);
  if (question.key_formulas && question.key_formulas.length > 0) {
    question.key_formulas.forEach((formula, idx) => {
      console.log(`  ${idx + 1}. ${formula}`);
    });
  } else {
    console.log(`  ❌ EMPTY`);
  }
  console.log('');

  console.log(`pitfalls (${Array.isArray(question.pitfalls) ? question.pitfalls.length : 'NULL'} items):`);
  if (question.pitfalls && question.pitfalls.length > 0) {
    question.pitfalls.forEach((pitfall, idx) => {
      console.log(`  ${idx + 1}. ${pitfall}`);
    });
  } else {
    console.log(`  ❌ EMPTY`);
  }
  console.log('');

  console.log(`exam_tip: ${question.exam_tip || '❌ EMPTY'}`);
  console.log(`visual_concept: ${question.visual_concept || '❌ EMPTY'}`);
  console.log('');

  console.log('🎯 MASTERY MATERIAL:\n');
  if (question.mastery_material) {
    console.log(JSON.stringify(question.mastery_material, null, 2));
  } else {
    console.log('  ❌ NULL');
  }
  console.log('');

  // Check how many questions for this topic have solutions
  console.log('📈 TOPIC STATISTICS:\n');
  const { data: topicQuestions } = await supabase
    .from('questions')
    .select('id, solution_steps, key_formulas, pitfalls, exam_tip')
    .eq('topic', question.topic)
    .eq('subject', question.subject)
    .eq('exam_context', question.exam_context);

  if (topicQuestions) {
    const total = topicQuestions.length;
    const withSolutions = topicQuestions.filter(q => q.solution_steps && q.solution_steps.length > 0).length;
    const withFormulas = topicQuestions.filter(q => q.key_formulas && q.key_formulas.length > 0).length;
    const withPitfalls = topicQuestions.filter(q => q.pitfalls && q.pitfalls.length > 0).length;
    const withTips = topicQuestions.filter(q => q.exam_tip).length;

    console.log(`Total Questions: ${total}`);
    console.log(`With Solution Steps: ${withSolutions} (${((withSolutions/total)*100).toFixed(1)}%)`);
    console.log(`With Key Formulas: ${withFormulas} (${((withFormulas/total)*100).toFixed(1)}%)`);
    console.log(`With Pitfalls: ${withPitfalls} (${((withPitfalls/total)*100).toFixed(1)}%)`);
    console.log(`With Exam Tips: ${withTips} (${((withTips/total)*100).toFixed(1)}%)`);
  }
  console.log('');
}

checkQuestion().catch(console.error);
