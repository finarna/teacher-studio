import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379'; // prabhubp

async function verifyStats() {
  console.log('=== VERIFYING STATS FOR RELATIONS AND FUNCTIONS ===\n');

  // 1. Get topic ID
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name')
    .eq('name', 'Relations and Functions')
    .eq('subject', 'MATHS');

  if (!topics || topics.length === 0) {
    console.log('❌ Topic not found\n');
    return;
  }

  const topicId = topics[0].id;
  console.log(`✅ Topic: ${topics[0].name}`);
  console.log(`   ID: ${topicId}\n`);

  // 2. Get topic_resources record
  const { data: resource, error: resError } = await supabase
    .from('topic_resources')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .eq('exam_context', 'KCET')
    .maybeSingle();

  if (resError) {
    console.log(`❌ Error fetching topic_resources: ${resError.message}\n`);
    return;
  }

  if (!resource) {
    console.log('❌ No topic_resources record found for this user/topic\n');
    return;
  }

  console.log('📊 STORED STATS (from topic_resources table):');
  console.log(`   Mastery Level: ${resource.mastery_level}%`);
  console.log(`   Average Accuracy: ${resource.average_accuracy}%`);
  console.log(`   Questions Attempted: ${resource.questions_attempted}`);
  console.log(`   Questions Correct: ${resource.questions_correct}`);
  console.log(`   Questions Wrong: ${resource.questions_attempted - resource.questions_correct}`);
  console.log(`   Quizzes Taken: ${resource.quizzes_taken}`);
  console.log(`   Notes Completed: ${resource.notes_completed ? 'Yes' : 'No'}`);
  console.log(`   Study Stage: ${resource.study_stage}`);
  console.log(`   Total Questions Available: ${resource.total_questions}`);
  console.log(`   Last Practiced: ${resource.last_practiced || 'Never'}\n`);

  // 3. Get actual practice_answers data
  const { data: practiceAnswers } = await supabase
    .from('practice_answers')
    .select('id, is_correct, created_at')
    .eq('topic_resource_id', resource.id);

  const actualAttempted = practiceAnswers?.length || 0;
  const actualCorrect = practiceAnswers?.filter(a => a.is_correct).length || 0;
  const actualWrong = actualAttempted - actualCorrect;
  const actualAccuracy = actualAttempted > 0 ? ((actualCorrect / actualAttempted) * 100) : 0;

  console.log('🔍 CALCULATED STATS (from practice_answers table):');
  console.log(`   Total Attempted: ${actualAttempted}`);
  console.log(`   Total Correct: ${actualCorrect}`);
  console.log(`   Total Wrong: ${actualWrong}`);
  console.log(`   Calculated Accuracy: ${actualAccuracy.toFixed(2)}%\n`);

  // 4. Calculate expected mastery using the formula
  const totalQuestions = resource.total_questions || 10;
  const saturationTarget = Math.min(totalQuestions, Math.max(15, Math.floor(totalQuestions * 0.5)));
  const coverageWeight = Math.min(1, actualAttempted / Math.max(1, saturationTarget));

  const expectedMastery = Math.min(100, Math.round(
    (actualAccuracy * 0.60 * coverageWeight) +
    Math.min(20, (resource.quizzes_taken || 0) * 10) +
    Math.min(10, Math.floor(actualAttempted / 10) * 5) +
    (resource.notes_completed ? 10 : 0)
  ));

  console.log('🧮 EXPECTED MASTERY CALCULATION:');
  console.log(`   Formula Components:`);
  console.log(`   - Base Accuracy: ${actualAccuracy.toFixed(2)}%`);
  console.log(`   - Coverage Weight: ${(coverageWeight * 100).toFixed(2)}% (need ${saturationTarget} questions for 100%)`);
  console.log(`   - Weighted Accuracy: ${(actualAccuracy * 0.60 * coverageWeight).toFixed(2)} points`);
  console.log(`   - Quiz Bonus: ${Math.min(20, (resource.quizzes_taken || 0) * 10)} points (${resource.quizzes_taken} quizzes)`);
  console.log(`   - Volume Bonus: ${Math.min(10, Math.floor(actualAttempted / 10) * 5)} points (${actualAttempted} attempted)`);
  console.log(`   - Notes Bonus: ${resource.notes_completed ? 10 : 0} points`);
  console.log(`   = Expected Mastery: ${expectedMastery}%\n`);

  // 5. Comparison
  console.log('=' .repeat(60));
  console.log('✅ VERIFICATION RESULTS:');
  console.log('=' .repeat(60));

  // Check attempted count
  if (resource.questions_attempted !== actualAttempted) {
    console.log(`⚠️  MISMATCH: Questions Attempted`);
    console.log(`   Stored: ${resource.questions_attempted}`);
    console.log(`   Actual: ${actualAttempted}`);
  } else {
    console.log(`✅ Questions Attempted: ${actualAttempted} (correct)`);
  }

  // Check correct count
  if (resource.questions_correct !== actualCorrect) {
    console.log(`⚠️  MISMATCH: Questions Correct`);
    console.log(`   Stored: ${resource.questions_correct}`);
    console.log(`   Actual: ${actualCorrect}`);
  } else {
    console.log(`✅ Questions Correct: ${actualCorrect} (correct)`);
  }

  // Check accuracy
  const storedAccuracy = resource.average_accuracy;
  if (Math.abs(storedAccuracy - actualAccuracy) > 1) {
    console.log(`⚠️  MISMATCH: Average Accuracy`);
    console.log(`   Stored: ${storedAccuracy}%`);
    console.log(`   Actual: ${actualAccuracy.toFixed(2)}%`);
  } else {
    console.log(`✅ Average Accuracy: ${storedAccuracy}% (correct)`);
  }

  // Check mastery
  if (resource.mastery_level !== expectedMastery) {
    console.log(`⚠️  MISMATCH: Mastery Level`);
    console.log(`   Stored: ${resource.mastery_level}%`);
    console.log(`   Expected: ${expectedMastery}%`);
    console.log(`   Difference: ${Math.abs(resource.mastery_level - expectedMastery)}%`);
  } else {
    console.log(`✅ Mastery Level: ${resource.mastery_level}% (correct)`);
  }

  // Check study stage logic
  console.log(`\n📚 Study Stage: ${resource.study_stage}`);
  if (resource.mastery_level >= 90 && resource.quizzes_taken >= 2) {
    if (resource.study_stage !== 'mastered') {
      console.log(`⚠️  Should be 'mastered' (mastery >= 90% and quizzes >= 2)`);
    } else {
      console.log(`✅ Correctly marked as 'mastered'`);
    }
  } else if (actualAttempted > 0) {
    if (resource.study_stage === 'not_started') {
      console.log(`⚠️  Should be at least 'practicing' (has attempted ${actualAttempted} questions)`);
    } else {
      console.log(`✅ Stage is appropriate for current progress`);
    }
  }

  console.log('\n' + '='.repeat(60));

  // 6. Show recent practice history
  if (practiceAnswers && practiceAnswers.length > 0) {
    console.log('\n📝 RECENT PRACTICE HISTORY (last 10):');
    const recent = practiceAnswers
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    recent.forEach((answer, idx) => {
      const date = new Date(answer.created_at).toLocaleString();
      const status = answer.is_correct ? '✅ Correct' : '❌ Wrong';
      console.log(`   ${idx + 1}. ${status} - ${date}`);
    });
  }
}

verifyStats().catch(console.error);
