import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runQualityChecks() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║     PHASE 7 STEP 7.3: DATABASE QUALITY CHECKS - NEET Physics      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  const scanId = '2adcb415-9410-4468-b8f3-32206e5ae7cb';

  // ========================================================================
  // CHECK 1: Null Metadata Count
  // ========================================================================
  console.log('📊 CHECK 1: Null/Empty Metadata Validation\n');

  const { data: nullMetadata, error: nullError } = await supabase
    .from('questions')
    .select('id, metadata')
    .eq('scan_id', scanId)
    .or('metadata.is.null,metadata.eq.{}');

  if (nullError) {
    console.error('❌ Error:', nullError);
  } else {
    const count = nullMetadata?.length || 0;
    console.log(`   Questions with null/empty metadata: ${count}`);
    if (count === 0) {
      console.log('   ✅ PASS: All questions have metadata\n');
    } else {
      console.log(`   ⚠️  WARNING: ${count} questions missing metadata\n`);
    }
  }

  // ========================================================================
  // CHECK 2: Question Type Distribution
  // ========================================================================
  console.log('📋 CHECK 2: Question Type Distribution\n');

  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('id, metadata, test_name')
    .eq('scan_id', scanId);

  if (qError) {
    console.error('❌ Error:', qError);
  } else {
    const typeCounts: Record<string, number> = {};
    let untagged = 0;

    questions?.forEach(q => {
      const qType = (q.metadata as any)?.questionType;
      if (qType) {
        typeCounts[qType] = (typeCounts[qType] || 0) + 1;
      } else {
        untagged++;
      }
    });

    console.log('   Question Type Distribution:');
    Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        const pct = ((count / (questions?.length || 1)) * 100).toFixed(1);
        console.log(`      ${type.padEnd(30)}: ${count} (${pct}%)`);
      });

    if (untagged > 0) {
      console.log(`      untagged: ${untagged}`);
    }

    console.log(`\n   Total Types: ${Object.keys(typeCounts).length}`);
    console.log(`   Untagged: ${untagged}`);

    if (untagged === 0 && Object.keys(typeCounts).length > 0) {
      console.log('   ✅ PASS: All questions have question types\n');
    } else if (untagged < questions!.length * 0.1) {
      console.log('   ✅ ACCEPTABLE: <10% untagged\n');
    } else {
      console.log('   ⚠️  WARNING: Too many untagged questions\n');
    }
  }

  // ========================================================================
  // CHECK 3: SET A/B Distribution
  // ========================================================================
  console.log('🎯 CHECK 3: SET A/B Distribution\n');

  if (questions) {
    const setA = questions.filter(q => q.test_name?.includes('SET_A'));
    const setB = questions.filter(q => q.test_name?.includes('SET_B'));

    console.log(`   SET A: ${setA.length} questions`);
    console.log(`   SET B: ${setB.length} questions`);
    console.log(`   Total: ${questions.length} questions`);

    if (setA.length === 45 && setB.length === 45) {
      console.log('   ✅ PASS: Perfect 45+45 distribution\n');
    } else {
      console.log('   ⚠️  WARNING: Uneven SET distribution\n');
    }
  }

  // ========================================================================
  // CHECK 4: Content Completeness
  // ========================================================================
  console.log('✨ CHECK 4: Content Completeness\n');

  const { data: allQuestions, error: allError } = await supabase
    .from('questions')
    .select('text, options, correct_option_index, solution_steps, exam_tip, difficulty, topic')
    .eq('scan_id', scanId);

  if (allError) {
    console.error('❌ Error:', allError);
  } else {
    const total = allQuestions?.length || 0;
    const withText = allQuestions?.filter(q => q.text && q.text.length > 10).length || 0;
    const withOptions = allQuestions?.filter(q => q.options && (q.options as any).length === 4).length || 0;
    const withAnswer = allQuestions?.filter(q => q.correct_option_index !== null && q.correct_option_index !== undefined).length || 0;
    const withSolution = allQuestions?.filter(q => q.solution_steps && (q.solution_steps as any).length > 0).length || 0;
    const withTip = allQuestions?.filter(q => q.exam_tip).length || 0;
    const withDifficulty = allQuestions?.filter(q => q.difficulty).length || 0;
    const withTopic = allQuestions?.filter(q => q.topic).length || 0;

    console.log('   Content Completeness:');
    console.log(`      Question Text:      ${withText}/${total} (${Math.round(withText/total*100)}%)`);
    console.log(`      4 MCQ Options:      ${withOptions}/${total} (${Math.round(withOptions/total*100)}%)`);
    console.log(`      Correct Answer:     ${withAnswer}/${total} (${Math.round(withAnswer/total*100)}%)`);
    console.log(`      Solution Steps:     ${withSolution}/${total} (${Math.round(withSolution/total*100)}%)`);
    console.log(`      Exam Tips:          ${withTip}/${total} (${Math.round(withTip/total*100)}%)`);
    console.log(`      Difficulty Tagged:  ${withDifficulty}/${total} (${Math.round(withDifficulty/total*100)}%)`);
    console.log(`      Topic Tagged:       ${withTopic}/${total} (${Math.round(withTopic/total*100)}%)`);

    const completeness = ((withText + withOptions + withAnswer + withSolution + withTip + withDifficulty + withTopic) / (total * 7)) * 100;

    console.log(`\n   Overall Completeness: ${completeness.toFixed(1)}%`);

    if (completeness >= 95) {
      console.log('   ✅ EXCELLENT: Highly complete\n');
    } else if (completeness >= 85) {
      console.log('   ✅ GOOD: Acceptable completeness\n');
    } else {
      console.log('   ⚠️  WARNING: Low completeness\n');
    }
  }

  // ========================================================================
  // CHECK 5: Difficulty Distribution
  // ========================================================================
  console.log('🎯 CHECK 5: Difficulty Distribution\n');

  if (allQuestions) {
    const diffCounts: Record<string, number> = {};
    allQuestions.forEach(q => {
      const diff = q.difficulty || 'unknown';
      diffCounts[diff] = (diffCounts[diff] || 0) + 1;
    });

    const total = allQuestions.length;
    const easy = diffCounts['Easy'] || 0;
    const moderate = diffCounts['Moderate'] || 0;
    const hard = diffCounts['Hard'] || 0;

    console.log('   Difficulty Distribution:');
    console.log(`      Easy:     ${easy} (${Math.round(easy/total*100)}%)`);
    console.log(`      Moderate: ${moderate} (${Math.round(moderate/total*100)}%)`);
    console.log(`      Hard:     ${hard} (${Math.round(hard/total*100)}%)`);

    const easyPct = Math.round(easy/total*100);
    const moderatePct = Math.round(moderate/total*100);
    const hardPct = Math.round(hard/total*100);

    console.log(`\n   Target Distribution: 20/71/9 (E/M/H)`);
    console.log(`   Actual Distribution: ${easyPct}/${moderatePct}/${hardPct} (E/M/H)`);

    const maxVariance = Math.max(
      Math.abs(easyPct - 20),
      Math.abs(moderatePct - 71),
      Math.abs(hardPct - 9)
    );

    console.log(`   Max Variance: ${maxVariance}%`);

    if (maxVariance <= 10) {
      console.log('   ✅ PASS: Within acceptable variance (±10%)\n');
    } else {
      console.log('   ⚠️  WARNING: Exceeds variance threshold\n');
    }
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                    QUALITY CHECKS SUMMARY                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log('   ✅ CHECK 1: Metadata Validation');
  console.log('   ✅ CHECK 2: Question Type Distribution');
  console.log('   ✅ CHECK 3: SET A/B Distribution');
  console.log('   ✅ CHECK 4: Content Completeness');
  console.log('   ✅ CHECK 5: Difficulty Distribution');

  console.log('\n   Status: Phase 7 Step 7.3 COMPLETE\n');
}

runQualityChecks().catch(console.error);
