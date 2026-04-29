import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
const NEET_QUESTIONS_PER_SET = 45;
const EXPECTED_TOTAL_QUESTIONS = 90;

interface CalibrationData {
  idsTarget: number;
  rigorVelocity: number;
  boardSignature: string;
  difficultyEasy: number;
  difficultyModerate: number;
  difficultyHard: number;
}

async function phase7QualityVerification(subject: string, scanId: string) {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log(`║        PHASE 7: QUALITY VERIFICATION - NEET ${subject.padEnd(9)}        ║`);
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  // ========================================================================
  // STEP 7.1 & 7.2: COMPREHENSIVE VERIFICATION
  // ========================================================================
  console.log('📊 STEP 7.1 & 7.2: Comprehensive Quality Verification\n');

  // Load calibration
  const { data: calibration, error: calError } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', 'NEET')
    .eq('subject', subject)
    .eq('target_year', 2026)
    .single();

  if (calError || !calibration) {
    console.error('❌ Error loading calibration:', calError);
    return;
  }

  const expectedCalibration: CalibrationData = {
    idsTarget: calibration.intent_signature?.idsTarget || 0,
    rigorVelocity: calibration.rigor_velocity || 0,
    boardSignature: calibration.board_signature || 'UNKNOWN',
    difficultyEasy: calibration.intent_signature?.difficultyProfile?.easy || 30,
    difficultyModerate: calibration.intent_signature?.difficultyProfile?.moderate || 50,
    difficultyHard: calibration.intent_signature?.difficultyProfile?.hard || 20,
  };

  console.log('   ✅ Calibration Parameters:');
  console.log(`      IDS Target: ${expectedCalibration.idsTarget.toFixed(3)}`);
  console.log(`      Rigor Velocity: ${expectedCalibration.rigorVelocity.toFixed(2)}`);
  console.log(`      Board Signature: ${expectedCalibration.boardSignature}`);
  console.log(`      Difficulty: ${expectedCalibration.difficultyEasy}/${expectedCalibration.difficultyModerate}/${expectedCalibration.difficultyHard} (E/M/H)\n`);

  // Query all questions
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .eq('scan_id', scanId);

  if (qError || !questions) {
    console.error('❌ Error querying questions:', qError);
    return;
  }

  const totalQuestions = questions.length;
  console.log(`   ✅ Total Questions: ${totalQuestions}/${EXPECTED_TOTAL_QUESTIONS}\n`);

  // ========================================================================
  // STEP 7.3: DATABASE QUALITY CHECKS
  // ========================================================================
  console.log('🔍 STEP 7.3: Database Quality Checks\n');

  // Check 1: Null Metadata
  const nullMetadata = questions.filter(q => !q.metadata || Object.keys(q.metadata).length === 0);
  console.log(`   ✅ CHECK 1: Null/Empty Metadata`);
  console.log(`      Count: ${nullMetadata.length}/${totalQuestions}`);
  if (nullMetadata.length === 0) {
    console.log('      Status: ✅ PASS - All questions have metadata\n');
  } else {
    console.log(`      Status: ⚠️  WARNING - ${nullMetadata.length} questions missing metadata\n`);
  }

  // Check 2: Content Completeness
  const withText = questions.filter(q => q.text && q.text.length > 10).length;
  const withOptions = questions.filter(q => q.options && (q.options as any).length === 4).length;
  const withAnswer = questions.filter(q => q.correct_option_index !== null && q.correct_option_index !== undefined).length;
  const withSolution = questions.filter(q => q.solution_steps && (q.solution_steps as any).length > 0).length;
  const withTip = questions.filter(q => q.exam_tip).length;
  const withDifficulty = questions.filter(q => q.difficulty).length;
  const withTopic = questions.filter(q => q.topic).length;

  console.log('   ✅ CHECK 2: Content Completeness');
  console.log(`      Question Text:      ${withText}/${totalQuestions} (${Math.round(withText/totalQuestions*100)}%)`);
  console.log(`      4 MCQ Options:      ${withOptions}/${totalQuestions} (${Math.round(withOptions/totalQuestions*100)}%)`);
  console.log(`      Correct Answer:     ${withAnswer}/${totalQuestions} (${Math.round(withAnswer/totalQuestions*100)}%)`);
  console.log(`      Solution Steps:     ${withSolution}/${totalQuestions} (${Math.round(withSolution/totalQuestions*100)}%)`);
  console.log(`      Exam Tips:          ${withTip}/${totalQuestions} (${Math.round(withTip/totalQuestions*100)}%)`);
  console.log(`      Difficulty Tagged:  ${withDifficulty}/${totalQuestions} (${Math.round(withDifficulty/totalQuestions*100)}%)`);
  console.log(`      Topic Tagged:       ${withTopic}/${totalQuestions} (${Math.round(withTopic/totalQuestions*100)}%)`);

  const completeness = ((withText + withOptions + withAnswer + withSolution + withTip + withDifficulty + withTopic) / (totalQuestions * 7)) * 100;
  console.log(`\n      Overall Completeness: ${completeness.toFixed(1)}%`);

  if (completeness >= 95) {
    console.log('      Status: ✅ EXCELLENT\n');
  } else if (completeness >= 85) {
    console.log('      Status: ✅ GOOD\n');
  } else {
    console.log('      Status: ⚠️  NEEDS IMPROVEMENT\n');
  }

  // Check 3: Difficulty Distribution
  const diffCounts: Record<string, number> = {};
  questions.forEach(q => {
    const diff = q.difficulty || 'unknown';
    diffCounts[diff] = (diffCounts[diff] || 0) + 1;
  });

  const actualEasy = diffCounts['Easy'] || 0;
  const actualModerate = diffCounts['Moderate'] || 0;
  const actualHard = diffCounts['Hard'] || 0;

  const actualEasyPct = Math.round((actualEasy / totalQuestions) * 100);
  const actualModeratePct = Math.round((actualModerate / totalQuestions) * 100);
  const actualHardPct = Math.round((actualHard / totalQuestions) * 100);

  console.log('   ✅ CHECK 3: Difficulty Distribution');
  console.log(`      Expected: ${expectedCalibration.difficultyEasy}/${expectedCalibration.difficultyModerate}/${expectedCalibration.difficultyHard} (E/M/H)`);
  console.log(`      Actual:   ${actualEasyPct}/${actualModeratePct}/${actualHardPct} (E/M/H)`);

  const maxVariance = Math.max(
    Math.abs(actualEasyPct - expectedCalibration.difficultyEasy),
    Math.abs(actualModeratePct - expectedCalibration.difficultyModerate),
    Math.abs(actualHardPct - expectedCalibration.difficultyHard)
  );

  console.log(`      Max Variance: ${maxVariance}%`);

  if (maxVariance <= 10) {
    console.log('      Status: ✅ PASS - Within acceptable variance (±10%)\n');
  } else {
    console.log(`      Status: ⚠️  WARNING - Exceeds threshold (${maxVariance}%)\n`);
  }

  // Check 4: SET A/B Distribution
  const half = Math.floor(totalQuestions / 2);
  const setA = questions.slice(0, half);
  const setB = questions.slice(half);

  console.log('   ✅ CHECK 4: SET A/B Distribution');
  console.log(`      SET A: ${setA.length} questions`);
  console.log(`      SET B: ${setB.length} questions`);

  if (setA.length === NEET_QUESTIONS_PER_SET && setB.length === NEET_QUESTIONS_PER_SET) {
    console.log('      Status: ✅ PASS - Perfect 45+45 split\n');
  } else {
    console.log('      Status: ⚠️  WARNING - Uneven distribution\n');
  }

  // ========================================================================
  // STEP 7.4: QUESTION TYPE DISTRIBUTION (CRITICAL for NEET)
  // ========================================================================
  console.log('📋 STEP 7.4: Question Type Distribution Verification (CRITICAL)\n');

  // Load question type analysis
  const subjectUpper = subject.toUpperCase();
  const analysisPath = path.join(
    process.cwd(),
    `docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_${subjectUpper}.json`
  );

  if (!fs.existsSync(analysisPath)) {
    console.log(`   ⚠️  Question type analysis not found: ${analysisPath}`);
    console.log('      Skipping question type verification\n');
  } else {
    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
    const questionTypeDistribution = analysis.question_type_distribution;

    // Calculate expected counts for total questions
    const expectedCounts: Record<string, number> = {};
    Object.entries(questionTypeDistribution).forEach(([type, percentage]) => {
      const pct = percentage as number;
      if (pct > 0) {
        expectedCounts[type] = Math.round(totalQuestions * pct / 100);
      }
    });

    // Count actual question types
    const actualCounts: Record<string, number> = {};
    Object.keys(expectedCounts).forEach(type => {
      actualCounts[type] = 0;
    });

    let unclassified = 0;
    questions.forEach(q => {
      const metadata = q.metadata as any;
      const qType = metadata?.questionType;

      if (qType && actualCounts[qType] !== undefined) {
        actualCounts[qType]++;
      } else if (qType) {
        actualCounts[qType] = (actualCounts[qType] || 0) + 1;
      } else {
        unclassified++;
      }
    });

    console.log('   Question Type Distribution:');
    console.log(`   Board Signature: ${expectedCalibration.boardSignature}\n`);

    let totalDiff = 0;
    let perfectMatches = 0;

    Object.entries(actualCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        const expected = expectedCounts[type] || 0;
        const diff = count - expected;
        const absDiff = Math.abs(diff);

        totalDiff += absDiff;
        if (diff === 0) perfectMatches++;

        const status = absDiff <= 1 ? '✅' : (absDiff <= 3 ? '⚠️' : '❌');
        const pct = Math.round((count / totalQuestions) * 100);

        console.log(`      ${type.padEnd(30)}: ${count.toString().padStart(2)}/${expected.toString().padStart(2)} (${pct}%) ${diff >= 0 ? '+' : ''}${diff} ${status}`);
      });

    if (unclassified > 0) {
      console.log(`      unclassified: ${unclassified}`);
    }

    const totalExpected = Object.values(expectedCounts).reduce((sum, count) => sum + count, 0);
    const accuracy = totalExpected > 0 ? ((1 - (totalDiff / totalExpected)) * 100).toFixed(1) : '0.0';

    console.log(`\n      Overall Type Accuracy: ${accuracy}%`);
    console.log(`      Perfect Matches: ${perfectMatches}/${Object.keys(expectedCounts).length} types`);

    if (parseFloat(accuracy) >= 70 && perfectMatches >= 1) {
      console.log('      Status: ✅ GOOD - Acceptable distribution\n');
    } else if (parseFloat(accuracy) >= 50) {
      console.log('      Status: ⚠️  ACCEPTABLE - Some deviation from targets\n');
    } else {
      console.log('      Status: ⚠️  NEEDS REVIEW - Significant deviation\n');
    }
  }

  // ========================================================================
  // STRATEGIC DIFFERENTIATION ANALYSIS (SET A vs SET B)
  // ========================================================================
  console.log('🎯 STRATEGIC DIFFERENTIATION: SET A vs SET B Analysis\n');

  // Analyze formula emphasis
  const analyzeFormulaEmphasis = (q: any) => {
    const text = (q.text || '').toLowerCase();
    const solution = (q.solution_steps || []).join(' ').toLowerCase();
    const combined = text + ' ' + solution;

    const indicators = {
      hasLatexFormula: /\$[^$]+\$/.test(q.text || ''),
      hasNumericalValues: /\d+\.?\d*\s*(m|kg|s|n|j|w|v|a|°|cm|mm|km|g|l|mol|pa|hz|ω|μ)/.test(combined),
      hasCalculation: /(calculate|compute|find|determine)\s+(the\s+)?(value|magnitude|amount|number)/.test(combined),
      hasEquation: /(equation|formula|relation|expression)/.test(combined),
      hasMultiStep: /(first|then|next|finally|substitut|deriv|apply|use\s+formula)/.test(solution),
      hasMathSymbols: /[=+\-×÷∫∑∆√π]/.test(combined) || combined.includes('frac') || combined.includes('cdot'),
      requiresPrecision: /(exact|precise|accurate|significant\s+figures|decimal)/.test(combined)
    };

    const score = Object.values(indicators).filter(Boolean).length;
    return { score, indicators };
  };

  const analyzeConceptualEmphasis = (q: any) => {
    const text = (q.text || '').toLowerCase();
    const solution = (q.solution_steps || []).join(' ').toLowerCase();
    const combined = text + ' ' + solution;

    const indicators = {
      hasQualitativeLanguage: /(why|explain|reason|because|due to|caused by|results in)/.test(combined),
      hasRealWorldContext: /(everyday|practical|real.world|application|daily life|commonly|observed|experiment)/.test(combined),
      hasCauseEffect: /(if.+then|when.+will|as.+increases|proportional|inversely|directly)/.test(combined),
      hasConceptualKeywords: /(principle|concept|law|theory|phenomenon|property|characteristic|nature)/.test(combined),
      hasComparison: /(compare|contrast|difference|similar|unlike|whereas|however)/.test(combined),
      hasQualitativeReasoning: /(greater|smaller|faster|slower|stronger|weaker|increases|decreases)/.test(combined),
      hasUnderstandingFocus: /(understand|interpret|analyze|conclude|infer|deduce)/.test(combined)
    };

    const score = Object.values(indicators).filter(Boolean).length;
    return { score, indicators };
  };

  // Analyze SET A
  const setAFormulaScores = setA.map(q => analyzeFormulaEmphasis(q).score);
  const setAConceptualScores = setA.map(q => analyzeConceptualEmphasis(q).score);
  const setAAvgFormula = setAFormulaScores.reduce((sum, s) => sum + s, 0) / setA.length;
  const setAAvgConceptual = setAConceptualScores.reduce((sum, s) => sum + s, 0) / setA.length;

  // Analyze SET B
  const setBFormulaScores = setB.map(q => analyzeFormulaEmphasis(q).score);
  const setBConceptualScores = setB.map(q => analyzeConceptualEmphasis(q).score);
  const setBAvgFormula = setBFormulaScores.reduce((sum, s) => sum + s, 0) / setB.length;
  const setBAvgConceptual = setBConceptualScores.reduce((sum, s) => sum + s, 0) / setB.length;

  console.log('   SET A (Formula for CALCULATION):');
  console.log(`      Formula Score:    ${setAAvgFormula.toFixed(2)}/7`);
  console.log(`      Conceptual Score: ${setAAvgConceptual.toFixed(2)}/7`);
  console.log(`      Bias: ${(setAAvgFormula - setAAvgConceptual) > 0 ? '+' : ''}${(setAAvgFormula - setAAvgConceptual).toFixed(2)} (${setAAvgFormula > setAAvgConceptual ? 'formula-heavy ✅' : 'concept-heavy ⚠️'})`);

  console.log('\n   SET B (Formula for UNDERSTANDING):');
  console.log(`      Formula Score:    ${setBAvgFormula.toFixed(2)}/7`);
  console.log(`      Conceptual Score: ${setBAvgConceptual.toFixed(2)}/7`);
  console.log(`      Bias: ${(setBAvgConceptual - setBAvgFormula) > 0 ? '+' : ''}${(setBAvgConceptual - setBAvgFormula).toFixed(2)} (${setBAvgConceptual > setBAvgFormula ? 'concept-heavy ✅' : 'formula-heavy ⚠️'})`);

  const setAFormulaBias = setAAvgFormula - setAAvgConceptual;
  const setBConceptualBias = setBAvgConceptual - setBAvgFormula;

  console.log('\n   Strategic Differentiation Status:');
  if (setAFormulaBias > 0.5 && setBConceptualBias > 0) {
    console.log('      ✅ GOOD - Clear strategic differentiation detected\n');
  } else if (setAFormulaBias > 0 && setBConceptualBias >= 0) {
    console.log('      ✅ ACCEPTABLE - Moderate strategic differentiation\n');
  } else {
    console.log('      ⚠️  WEAK - Limited strategic differentiation\n');
  }

  // ========================================================================
  // FINAL SUMMARY
  // ========================================================================
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                  PHASE 7 VERIFICATION SUMMARY                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log(`   Subject: NEET ${subject}`);
  console.log(`   Scan ID: ${scanId.substring(0, 13)}...`);
  console.log(`   Total Questions: ${totalQuestions}/${EXPECTED_TOTAL_QUESTIONS}`);
  console.log(`   Content Completeness: ${completeness.toFixed(1)}%`);
  console.log(`   Difficulty Variance: ${maxVariance}%`);
  console.log(`   SET A Formula Bias: ${setAFormulaBias > 0 ? '+' : ''}${setAFormulaBias.toFixed(2)}`);
  console.log(`   SET B Conceptual Bias: ${setBConceptualBias > 0 ? '+' : ''}${setBConceptualBias.toFixed(2)}`);

  let finalStatus = '✅ PASS';
  if (totalQuestions < EXPECTED_TOTAL_QUESTIONS || completeness < 90 || maxVariance > 15) {
    finalStatus = '⚠️  PARTIAL';
  }
  if (completeness < 70 || maxVariance > 25) {
    finalStatus = '❌ FAIL';
  }

  console.log(`\n   Overall Status: ${finalStatus}`);
  console.log('\n   Phase 7 Quality Verification COMPLETE\n');

  // Save results
  const reportPath = `docs/oracle/verification/NEET_${subjectUpper}_PHASE7_VERIFICATION.txt`;
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = `
NEET ${subject} - Phase 7 Quality Verification Report
Date: ${new Date().toISOString()}
Scan ID: ${scanId}

Total Questions: ${totalQuestions}/${EXPECTED_TOTAL_QUESTIONS}
Content Completeness: ${completeness.toFixed(1)}%
Difficulty Variance: ${maxVariance}%
SET A Formula Bias: ${setAFormulaBias.toFixed(2)}
SET B Conceptual Bias: ${setBConceptualBias.toFixed(2)}

Status: ${finalStatus}
`;

  fs.writeFileSync(reportPath, report);
  console.log(`   📄 Report saved: ${reportPath}\n`);
}

// ========================================================================
// MAIN EXECUTION
// ========================================================================
const subject = process.argv[2];
const scanId = process.argv[3];

if (!subject || !VALID_SUBJECTS.includes(subject)) {
  console.error('❌ Invalid subject. Usage:');
  console.error('   npx tsx scripts/oracle/phase7_quality_verification_neet.ts <Subject> <ScanID>');
  console.error('');
  console.error('Valid subjects: Physics, Chemistry, Botany, Zoology');
  console.error('');
  console.error('Examples:');
  console.error('   npx tsx scripts/oracle/phase7_quality_verification_neet.ts Physics 2adcb415-9410-4468-b8f3-32206e5ae7cb');
  console.error('   npx tsx scripts/oracle/phase7_quality_verification_neet.ts Chemistry <scan-id>');
  process.exit(1);
}

if (!scanId) {
  console.error('❌ Scan ID required. Check docs/oracle/calibration/NEET_<SUBJECT>_SCAN_ID_REGISTRY.md');
  process.exit(1);
}

phase7QualityVerification(subject, scanId).catch(console.error);
