/**
 * Diagnostic: Check where solution data is stored for Biology questions
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSolutionData() {
  console.log('🔍 Checking solution data storage...\n');

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, solution_steps, exam_tip, metadata')
    .eq('scan_id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Checking ${questions.length} sample questions:\n`);

  questions.forEach((q, idx) => {
    console.log(`\n🔹 Question ${idx + 1}: ${q.text?.substring(0, 50)}...`);
    console.log('   solution_steps:', q.solution_steps ? `${q.solution_steps.length} steps` : 'NULL');
    console.log('   exam_tip:', q.exam_tip ? 'EXISTS' : 'NULL');
    console.log('   metadata.solutionData:', q.metadata?.solutionData ? 'EXISTS' : 'NULL');

    if (q.metadata?.solutionData) {
      console.log('   → solutionData.steps:', q.metadata.solutionData.steps?.length || 0, 'steps');
      console.log('   → solutionData.finalTip:', q.metadata.solutionData.finalTip ? 'EXISTS' : 'NULL');

      // Show first step sample
      if (q.metadata.solutionData.steps?.[0]) {
        const firstStep = q.metadata.solutionData.steps[0];
        const stepText = firstStep.text || firstStep;
        console.log('   → First step sample:', stepText.substring(0, 80) + '...');
      }
    }

  });

  // Count totals
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('solution_steps, exam_tip, metadata')
    .eq('scan_id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c');

  const hasSolutionSteps = allQuestions.filter(q => q.solution_steps && q.solution_steps.length > 0).length;
  const hasExamTip = allQuestions.filter(q => q.exam_tip).length;
  const hasSolutionInMetadata = allQuestions.filter(q => q.metadata?.solutionData?.steps?.length > 0).length;

  console.log('\n\n📊 Summary of all 56 questions:');
  console.log(`   solution_steps populated: ${hasSolutionSteps}/56`);
  console.log(`   exam_tip populated: ${hasExamTip}/56`);
  console.log(`   metadata.solutionData.steps populated: ${hasSolutionInMetadata}/56`);
}

checkSolutionData();
