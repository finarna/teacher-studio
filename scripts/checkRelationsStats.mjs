import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load from .env.local instead of .env
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379'; // prabhubp

async function checkStats() {
  console.log('\n' + '='.repeat(80));
  console.log('  RELATIONS AND FUNCTIONS STATS CHECK');
  console.log('  User: prabhubp | KCET MATHS');
  console.log('='.repeat(80) + '\n');

  // Step 1: Find all topic_resources for this user in KCET MATHS
  console.log('📊 Step 1: Finding topic_resources...\n');

  const { data: resources, error: resError } = await supabase
    .from('topic_resources')
    .select('id, topic_id, mastery_level, average_accuracy, questions_attempted, questions_correct, quizzes_taken, notes_completed, total_questions, study_stage, last_practiced')
    .eq('user_id', userId)
    .eq('subject', 'MATHS')
    .eq('exam_context', 'KCET');

  if (resError) {
    console.log(`❌ Error: ${resError.message}\n`);
    return;
  }

  if (!resources || resources.length === 0) {
    console.log('❌ No topic_resources found\n');
    return;
  }

  console.log(`✅ Found ${resources.length} KCET MATHS topic(s)\n`);

  // Step 2: For each resource, get questions to find "Relations and Functions"
  let targetResource = null;

  for (const resource of resources) {
    const { data: questions } = await supabase
      .from('questions')
      .select('topic')
      .eq('topic_id', resource.topic_id)
      .limit(1);

    const topicName = questions?.[0]?.topic || '';

    if (topicName.toLowerCase().includes('relation') || topicName.toLowerCase().includes('function')) {
      targetResource = resource;
      console.log(`✅ Found "Relations and Functions" topic!`);
      console.log(`   Topic Name: ${topicName}`);
      console.log(`   Resource ID: ${resource.id}`);
      console.log(`   Topic ID: ${resource.topic_id}\n`);
      break;
    }
  }

  if (!targetResource) {
    console.log('⚠️  Could not find Relations and Functions. Showing all resources:\n');
    for (let i = 0; i < Math.min(3, resources.length); i++) {
      const r = resources[i];
      console.log(`${i + 1}. Mastery: ${r.mastery_level}% | Attempted: ${r.questions_attempted}`);
    }
    console.log('\nUsing first resource as fallback...\n');
    targetResource = resources[0];
  }

  const resource = targetResource;

  // Step 3: Display STORED stats
  console.log('=' .repeat(80));
  console.log('  📊 STORED STATS (from topic_resources table)');
  console.log('=' .repeat(80));
  console.log(`   Mastery Level:        ${resource.mastery_level}%`);
  console.log(`   Average Accuracy:     ${resource.average_accuracy}%`);
  console.log(`   Questions Attempted:  ${resource.questions_attempted}`);
  console.log(`   Questions Correct:    ${resource.questions_correct}`);
  console.log(`   Questions Wrong:      ${resource.questions_attempted - resource.questions_correct}`);
  console.log(`   Pending:              ${resource.total_questions - resource.questions_attempted}`);
  console.log(`   Total Questions:      ${resource.total_questions}`);
  console.log(`   Quizzes Taken:        ${resource.quizzes_taken}`);
  console.log(`   Notes Completed:      ${resource.notes_completed ? 'YES' : 'NO'}`);
  console.log(`   Study Stage:          ${resource.study_stage}`);
  console.log(`   Last Practiced:       ${resource.last_practiced || 'Never'}`);
  console.log('=' .repeat(80) + '\n');

  // Step 4: Get ACTUAL data from practice_answers
  console.log('🔍 Step 2: Checking practice_answers table...\n');

  const { data: practiceAnswers, error: paError } = await supabase
    .from('practice_answers')
    .select('id, question_id, is_correct, created_at')
    .eq('topic_resource_id', resource.id)
    .order('created_at', { ascending: false });

  if (paError) {
    console.log(`❌ Error: ${paError.message}\n`);
  }

  const actualAttempted = practiceAnswers?.length || 0;
  const actualCorrect = practiceAnswers?.filter(a => a.is_correct).length || 0;
  const actualWrong = actualAttempted - actualCorrect;
  const actualAccuracy = actualAttempted > 0 ? ((actualCorrect / actualAttempted) * 100) : 0;

  console.log('=' .repeat(80));
  console.log('  ✅ ACTUAL STATS (from practice_answers table)');
  console.log('=' .repeat(80));
  console.log(`   Total Attempted:      ${actualAttempted}`);
  console.log(`   Total Correct:        ${actualCorrect}`);
  console.log(`   Total Wrong:          ${actualWrong}`);
  console.log(`   Pending:              ${resource.total_questions - actualAttempted}`);
  console.log(`   Calculated Accuracy:  ${actualAccuracy.toFixed(2)}%`);
  console.log('=' .repeat(80) + '\n');

  // Step 5: Calculate EXPECTED mastery using the formula
  console.log('🧮 Step 3: Calculating EXPECTED mastery...\n');

  const totalQuestions = resource.total_questions || 10;
  const saturationTarget = Math.min(totalQuestions, Math.max(15, Math.floor(totalQuestions * 0.5)));
  const coverageWeight = Math.min(1, actualAttempted / Math.max(1, saturationTarget));

  const baseAccuracyPoints = actualAccuracy * 0.60 * coverageWeight;
  const quizBonus = Math.min(20, resource.quizzes_taken * 10);
  const volumeBonus = Math.min(10, Math.floor(actualAttempted / 10) * 5);
  const notesBonus = resource.notes_completed ? 10 : 0;

  const expectedMastery = Math.min(100, Math.round(
    baseAccuracyPoints + quizBonus + volumeBonus + notesBonus
  ));

  console.log('=' .repeat(80));
  console.log('  📐 MASTERY CALCULATION');
  console.log('=' .repeat(80));
  console.log(`   Formula: (Accuracy × 0.6 × Coverage) + Quiz + Volume + Notes`);
  console.log('');
  console.log(`   Inputs:`);
  console.log(`   - Accuracy:           ${actualAccuracy.toFixed(2)}%`);
  console.log(`   - Attempted:          ${actualAttempted} questions`);
  console.log(`   - Total Questions:    ${totalQuestions}`);
  console.log(`   - Saturation Target:  ${saturationTarget} (50% of pool, min 15)`);
  console.log(`   - Coverage Weight:    ${(coverageWeight * 100).toFixed(1)}%`);
  console.log('');
  console.log(`   Calculation:`);
  console.log(`   1. Weighted Accuracy  = ${actualAccuracy.toFixed(2)} × 0.6 × ${coverageWeight.toFixed(3)}`);
  console.log(`                         = ${baseAccuracyPoints.toFixed(2)} points`);
  console.log(`   2. Quiz Bonus         = MIN(20, ${resource.quizzes_taken} × 10)`);
  console.log(`                         = ${quizBonus} points`);
  console.log(`   3. Volume Bonus       = MIN(10, ${Math.floor(actualAttempted / 10)} × 5)`);
  console.log(`                         = ${volumeBonus} points`);
  console.log(`   4. Notes Bonus        = ${resource.notes_completed ? '10' : '0'} points`);
  console.log(`                         = ${notesBonus} points`);
  console.log(`   ─────────────────────────────────────────────────`);
  console.log(`   🎯 EXPECTED MASTERY   = ${expectedMastery}%`);
  console.log('=' .repeat(80) + '\n');

  // Step 6: VERIFICATION
  console.log('=' .repeat(80));
  console.log('  ✅ VERIFICATION RESULTS');
  console.log('=' .repeat(80) + '\n');

  let hasErrors = false;

  // Check each stat
  const checks = [
    { name: 'Questions Attempted', stored: resource.questions_attempted, actual: actualAttempted },
    { name: 'Questions Correct', stored: resource.questions_correct, actual: actualCorrect },
    { name: 'Average Accuracy', stored: resource.average_accuracy, actual: Math.round(actualAccuracy) },
    { name: 'Mastery Level', stored: resource.mastery_level, actual: expectedMastery }
  ];

  checks.forEach(check => {
    const match = check.stored === check.actual;
    const diff = Math.abs(check.stored - check.actual);

    if (match) {
      console.log(`✅ ${check.name.padEnd(25)} ${check.stored} (CORRECT)`);
    } else {
      console.log(`❌ ${check.name.padEnd(25)} Stored: ${check.stored} | Expected: ${check.actual} | Diff: ${diff}`);
      hasErrors = true;
    }
  });

  console.log('\n' + '=' .repeat(80));

  if (hasErrors) {
    console.log('⚠️  STATS ARE OUT OF SYNC - Need to recalculate!\n');
  } else {
    console.log('✅ ALL STATS ARE CORRECT!\n');
  }

  // Step 7: Show recent practice history
  if (practiceAnswers && practiceAnswers.length > 0) {
    console.log('📝 RECENT PRACTICE HISTORY (last 15):\n');
    const recent = practiceAnswers.slice(0, 15);
    recent.forEach((answer, idx) => {
      const date = new Date(answer.created_at).toLocaleString();
      const status = answer.is_correct ? '✅' : '❌';
      console.log(`   ${String(idx + 1).padStart(2)}. ${status} ${date}`);
    });
    console.log('');
  }

  // Summary
  console.log('=' .repeat(80));
  console.log('  📋 SUMMARY');
  console.log('=' .repeat(80));
  console.log(`   Screenshot shows:     23% mastery, 30% accuracy, 10/79 solved`);
  console.log(`   Database shows:       ${resource.mastery_level}% mastery, ${resource.average_accuracy}% accuracy, ${resource.questions_attempted}/${resource.total_questions} solved`);
  console.log(`   Calculated expected:  ${expectedMastery}% mastery, ${Math.round(actualAccuracy)}% accuracy`);
  console.log('=' .repeat(80) + '\n');
}

checkStats().catch(console.error);
