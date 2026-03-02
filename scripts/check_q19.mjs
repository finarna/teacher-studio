import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

async function checkQ19() {
  console.log('\n🔍 CHECKING Q19 - Domain of f(x) = x/(1-|x|)\n');

  // Search for this specific question by text
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .ilike('text', '%1 - |x|%')
    .limit(5);

  if (error) {
    console.log(`❌ Error: ${error.message}\n`);
    return;
  }

  if (!questions || questions.length === 0) {
    console.log('❌ Question not found\n');

    // Try broader search
    console.log('Trying broader search for "Domain of f(x)"...\n');
    const { data: broader } = await supabase
      .from('questions')
      .select('id, text, topic, subject, exam_context')
      .ilike('text', '%Domain of%f(x)%')
      .limit(10);

    if (broader && broader.length > 0) {
      console.log(`Found ${broader.length} questions with "Domain of f(x)":\n`);
      broader.forEach((q, idx) => {
        console.log(`${idx + 1}. ${q.text?.slice(0, 100)}...`);
        console.log(`   ID: ${q.id}`);
        console.log(`   Topic: ${q.topic || 'NULL'}`);
        console.log(`   Subject: ${q.subject || 'NULL'}`);
        console.log('');
      });
    }
    return;
  }

  console.log(`✅ Found ${questions.length} matching question(s)\n`);

  questions.forEach((q, idx) => {
    console.log('='.repeat(80));
    console.log(`  QUESTION ${idx + 1}`);
    console.log('='.repeat(80));
    console.log(`ID: ${q.id}`);
    console.log(`Text: ${q.text}`);
    console.log(`Topic: ${q.topic || '❌ NULL'}`);
    console.log(`Subject: ${q.subject || '❌ NULL'}`);
    console.log(`Exam: ${q.exam_context || '❌ NULL'}`);
    console.log(`Difficulty: ${q.difficulty || '❌ NULL'}`);
    console.log('');

    console.log('📝 OPTIONS:');
    if (q.options && Array.isArray(q.options)) {
      q.options.forEach((opt, i) => {
        const marker = i === q.correct_option_index ? '✅' : '  ';
        console.log(`${marker} ${String.fromCharCode(65 + i)}. ${opt}`);
      });
    } else {
      console.log('  ❌ NO OPTIONS');
    }
    console.log('');

    console.log('💡 SOLUTION DATA:');
    console.log(`solution_steps: ${q.solution_steps ? `${q.solution_steps.length} steps` : '❌ EMPTY'}`);
    if (q.solution_steps && q.solution_steps.length > 0) {
      q.solution_steps.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step.slice(0, 150)}${step.length > 150 ? '...' : ''}`);
      });
    }
    console.log('');

    console.log(`key_formulas: ${q.key_formulas ? `${q.key_formulas.length} formulas` : '❌ EMPTY'}`);
    if (q.key_formulas && q.key_formulas.length > 0) {
      q.key_formulas.forEach((formula, i) => {
        console.log(`  ${i + 1}. ${formula}`);
      });
    }
    console.log('');

    console.log(`exam_tip: ${q.exam_tip || '❌ EMPTY'}`);
    console.log(`visual_concept: ${q.visual_concept || '❌ EMPTY'}`);
    console.log('');

    console.log(`pitfalls (common mistakes): ${q.pitfalls ? `${q.pitfalls.length} items` : '❌ EMPTY'}`);
    if (q.pitfalls && q.pitfalls.length > 0) {
      q.pitfalls.forEach((pitfall, i) => {
        console.log(`  ${i + 1}. ${pitfall}`);
      });
    }
    console.log('');

    console.log('🎯 MASTERY MATERIAL:');
    if (q.mastery_material && typeof q.mastery_material === 'object') {
      console.log(JSON.stringify(q.mastery_material, null, 2));
    } else {
      console.log('  ❌ NULL or EMPTY');
    }
    console.log('');

    console.log('📊 METADATA:');
    console.log(`Pedagogy: ${q.pedagogy || 'NULL'}`);
    console.log(`Blooms: ${q.blooms || 'NULL'}`);
    console.log(`Created: ${q.created_at}`);
    console.log('');
  });

  // Check if user has answered this question
  const questionId = questions[0].id;
  const { data: answer } = await supabase
    .from('practice_answers')
    .select('*')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (answer && answer.length > 0) {
    console.log('✅ USER HAS ANSWERED THIS QUESTION:');
    console.log(`   Correct: ${answer[0].is_correct ? 'YES' : 'NO'}`);
    console.log(`   Answered: ${new Date(answer[0].created_at).toLocaleString()}`);
  } else {
    console.log('⚠️  User has not answered this question yet (or answer not saved)');
  }
  console.log('');
}

checkQ19().catch(console.error);
