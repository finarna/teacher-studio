import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379'; // prabhubp

async function verifyStats() {
  console.log('\n' + '='.repeat(70));
  console.log('  STATS VERIFICATION FOR RELATIONS AND FUNCTIONS');
  console.log('  User: prabhubp | Subject: MATHS | Exam: KCET');
  console.log('='.repeat(70) + '\n');

  // Step 1: Find topic_resources by searching for topic name pattern
  console.log('🔍 Step 1: Finding topic_resources record...\n');

  const { data: allResources } = await supabase
    .from('topic_resources')
    .select('id, topic_id, subject, exam_context, mastery_level, average_accuracy, questions_attempted, questions_correct, quizzes_taken, notes_completed, total_questions, study_stage, last_practiced')
    .eq('user_id', userId)
    .eq('subject', 'MATHS')
    .eq('exam_context', 'KCET');

  if (!allResources || allResources.length === 0) {
    console.log('❌ No topic_resources found for MATHS KCET\n');
    return;
  }

  console.log(`Found ${allResources.length} MATHS KCET topic resource(s)\n`);

  // Try to find the one that matches "Relations and Functions"
  // We'll check by looking at questions topic field
  let targetResource = null;

  for (const resource of allResources) {
    // Check questions for this resource
    const { data: questions } = await supabase
      .from('questions')
      .select('topic')
      .eq('user_id', userId)
      .eq('topic_id', resource.topic_id)
      .limit(1);

    if (questions && questions.length > 0) {
      const topicName = questions[0].topic?.toLowerCase() || '';
      if (topicName.includes('relation') || topicName.includes('function')) {
        targetResource = resource;
        console.log(`✅ Found matching topic_resource!`);
        console.log(`   Resource ID: ${resource.id}`);
        console.log(`   Topic ID: ${resource.topic_id}`);
        break;
      }
    }
  }

  if (!targetResource) {
    // Fallback: just use the first one and show all
    console.log('⚠️  Could not find exact match, showing all MATHS KCET resources:\n');
    allResources.forEach((r, idx) => {
      console.log(`${idx + 1}. Resource ID: ${r.id.substring(0, 8)}...`);
      console.log(`   Mastery: ${r.mastery_level}% | Accuracy: ${r.average_accuracy}% | Attempted: ${r.questions_attempted}\n`);
    });

    // Use the one with most questions as likely candidate
    targetResource = allResources.sort((a, b) => b.questions_attempted - a.questions_attempted)[0];
    console.log(`📌 Using resource with most activity: ${targetResource.id.substring(0, 8)}...\n`);
  }

  const resource = targetResource;

  // Step 2: Display stored stats
  console.log('📊 STORED STATS (from topic_resources table):');
  console.log('─'.repeat(70));
  console.log(`   Mastery Level:        ${resource.mastery_level}%`);
  console.log(`   Average Accuracy:     ${resource.average_accuracy}%`);
  console.log(`   Questions Attempted:  ${resource.questions_attempted}`);
  console.log(`   Questions Correct:    ${resource.questions_correct}`);
  console.log(`   Questions Wrong:      ${resource.questions_attempted - resource.questions_correct}`);
  console.log(`   Total Questions:      ${resource.total_questions}`);
  console.log(`   Quizzes Taken:        ${resource.quizzes_taken}`);
  console.log(`   Notes Completed:      ${resource.notes_completed ? 'Yes' : 'No'}`);
  console.log(`   Study Stage:          ${resource.study_stage}`);
  console.log(`   Last Practiced:       ${resource.last_practiced || 'Never'}`);
  console.log('─'.repeat(70) + '\n');

  // Step 3: Verify against practice_answers table
  console.log('🔍 Step 2: Fetching practice_answers data...\n');

  const { data: practiceAnswers } = await supabase
    .from('practice_answers')
    .select('id, question_id, is_correct, created_at')
    .eq('topic_resource_id', resource.id)
    .order('created_at', { ascending: false });

  const actualAttempted = practiceAnswers?.length || 0;
  const actualCorrect = practiceAnswers?.filter(a => a.is_correct).length || 0;
  const actualWrong = actualAttempted - actualCorrect;
  const actualAccuracy = actualAttempted > 0 ? ((actualCorrect / actualAttempted) * 100) : 0;

  console.log('✅ ACTUAL STATS (from practice_answers table):');
  console.log('─'.repeat(70));
  console.log(`   Total Attempted:      ${actualAttempted}`);
  console.log(`   Total Correct:        ${actualCorrect}`);
  console.log(`   Total Wrong:          ${actualWrong}`);
  console.log(`   Calculated Accuracy:  ${actualAccuracy.toFixed(2)}%`);
  console.log('─'.repeat(70) + '\n');

  // Step 4: Calculate expected mastery
  console.log('🧮 Step 3: Calculating expected mastery...\n');

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

  console.log('📐 MASTERY CALCULATION BREAKDOWN:');
  console.log('─'.repeat(70));
  console.log(`   Formula: (Accuracy × 0.6 × Coverage) + QuizBonus + VolumeBonus + NotesBonus`);
  console.log('');
  console.log(`   1️⃣  Base Accuracy:        ${actualAccuracy.toFixed(2)}%`);
  console.log(`   2️⃣  Coverage Weight:       ${(coverageWeight * 100).toFixed(1)}% (${actualAttempted}/${saturationTarget} questions)`);
  console.log(`   3️⃣  Weighted Accuracy:     ${baseAccuracyPoints.toFixed(2)} points`);
  console.log(`   4️⃣  Quiz Bonus:            ${quizBonus} points (${resource.quizzes_taken} quizzes × 10)`);
  console.log(`   5️⃣  Volume Bonus:          ${volumeBonus} points (${Math.floor(actualAttempted / 10)} sets of 10)`);
  console.log(`   6️⃣  Notes Bonus:           ${notesBonus} points`);
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   🎯 EXPECTED MASTERY:      ${expectedMastery}%`);
  console.log('─'.repeat(70) + '\n');

  // Step 5: Comparison & Verification
  console.log('=' .repeat(70));
  console.log('  ✅ VERIFICATION RESULTS');
  console.log('=' .repeat(70) + '\n');

  let hasErrors = false;

  // Check 1: Questions Attempted
  if (resource.questions_attempted !== actualAttempted) {
    console.log(`❌ MISMATCH: Questions Attempted`);
    console.log(`   Stored:  ${resource.questions_attempted}`);
    console.log(`   Actual:  ${actualAttempted}`);
    console.log(`   Fix:     Update topic_resources.questions_attempted = ${actualAttempted}\n`);
    hasErrors = true;
  } else {
    console.log(`✅ Questions Attempted:   ${actualAttempted} (CORRECT)\n`);
  }

  // Check 2: Questions Correct
  if (resource.questions_correct !== actualCorrect) {
    console.log(`❌ MISMATCH: Questions Correct`);
    console.log(`   Stored:  ${resource.questions_correct}`);
    console.log(`   Actual:  ${actualCorrect}`);
    console.log(`   Fix:     Update topic_resources.questions_correct = ${actualCorrect}\n`);
    hasErrors = true;
  } else {
    console.log(`✅ Questions Correct:     ${actualCorrect} (CORRECT)\n`);
  }

  // Check 3: Average Accuracy
  const roundedActualAccuracy = Math.round(actualAccuracy);
  if (resource.average_accuracy !== roundedActualAccuracy) {
    console.log(`❌ MISMATCH: Average Accuracy`);
    console.log(`   Stored:  ${resource.average_accuracy}%`);
    console.log(`   Actual:  ${roundedActualAccuracy}%`);
    console.log(`   Fix:     Update topic_resources.average_accuracy = ${roundedActualAccuracy}\n`);
    hasErrors = true;
  } else {
    console.log(`✅ Average Accuracy:      ${resource.average_accuracy}% (CORRECT)\n`);
  }

  // Check 4: Mastery Level
  if (resource.mastery_level !== expectedMastery) {
    console.log(`❌ MISMATCH: Mastery Level`);
    console.log(`   Stored:   ${resource.mastery_level}%`);
    console.log(`   Expected: ${expectedMastery}%`);
    console.log(`   Diff:     ${Math.abs(resource.mastery_level - expectedMastery)}% off`);
    console.log(`   Fix:      Update topic_resources.mastery_level = ${expectedMastery}\n`);
    hasErrors = true;
  } else {
    console.log(`✅ Mastery Level:         ${resource.mastery_level}% (CORRECT)\n`);
  }

  // Check 5: Study Stage
  console.log(`📚 Study Stage:           ${resource.study_stage}`);
  let expectedStage = resource.study_stage;

  if (resource.mastery_level >= 90 && resource.quizzes_taken >= 2) {
    expectedStage = 'mastered';
  } else if (actualAttempted > 0) {
    expectedStage = 'practicing';
  } else if (resource.notes_completed) {
    expectedStage = 'studying_notes';
  } else {
    expectedStage = 'not_started';
  }

  if (resource.study_stage !== expectedStage) {
    console.log(`   ⚠️  Should be: '${expectedStage}'\n`);
  } else {
    console.log(`   ✅ Correct for current progress\n`);
  }

  console.log('=' .repeat(70) + '\n');

  // Step 6: Show recent practice history
  if (practiceAnswers && practiceAnswers.length > 0) {
    console.log('📝 RECENT PRACTICE HISTORY (last 15):');
    console.log('─'.repeat(70));
    const recent = practiceAnswers.slice(0, 15);

    recent.forEach((answer, idx) => {
      const date = new Date(answer.created_at).toLocaleString();
      const status = answer.is_correct ? '✅' : '❌';
      console.log(`   ${String(idx + 1).padStart(2)}. ${status} Q${answer.question_id.substring(0, 8)}... - ${date}`);
    });
    console.log('─'.repeat(70) + '\n');
  }

  // Summary
  if (hasErrors) {
    console.log('⚠️  STATS ARE OUT OF SYNC - Database update needed\n');
  } else {
    console.log('✅ ALL STATS ARE CORRECT - No issues found!\n');
  }
}

verifyStats().catch(console.error);
