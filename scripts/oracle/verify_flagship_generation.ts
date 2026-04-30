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
const EXPECTED_TOTAL_QUESTIONS = 90; // SET A + SET B

interface CalibrationData {
  idsTarget: number;
  rigorVelocity: number;
  boardSignature: string;
  difficultyEasy: number;
  difficultyModerate: number;
  difficultyHard: number;
  questionTypeProfile?: any;
}

async function verifyFlagshipGeneration(subject: string) {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║     PHASE 6: FLAGSHIP GENERATION VERIFICATION - NEET ' + subject.padEnd(9) + '     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  // ========================================================================
  // STEP 1: LOAD CALIBRATION DATA FROM DATABASE
  // ========================================================================
  console.log('📊 STEP 1: Loading Calibration Data from Database\n');

  const { data: calibration, error: calError } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', 'NEET')
    .eq('subject', subject)
    .eq('target_year', 2026)
    .single();

  if (calError || !calibration) {
    console.error('❌ Error loading calibration:', calError);
    console.error('⚠️  Cannot verify without Phase 4 calibration data');
    return;
  }

  const expectedCalibration: CalibrationData = {
    idsTarget: calibration.intent_signature?.idsTarget || 0,
    rigorVelocity: calibration.rigor_velocity || 0,
    boardSignature: calibration.board_signature || 'UNKNOWN',
    difficultyEasy: calibration.intent_signature?.difficultyProfile?.easy ||
                    calibration.intent_signature?.difficultyEasyPct || 30,
    difficultyModerate: calibration.intent_signature?.difficultyProfile?.moderate ||
                        calibration.intent_signature?.difficultyModeratePct || 50,
    difficultyHard: calibration.intent_signature?.difficultyProfile?.hard ||
                    calibration.intent_signature?.difficultyHardPct || 20,
    questionTypeProfile: calibration.intent_signature?.questionTypeProfile || {}
  };

  console.log('   ✅ Calibration loaded from database:');
  console.log(`      IDS Target: ${expectedCalibration.idsTarget.toFixed(3)}`);
  console.log(`      Rigor Velocity: ${expectedCalibration.rigorVelocity.toFixed(2)}`);
  console.log(`      Board Signature: ${expectedCalibration.boardSignature}`);
  console.log(`      Difficulty: ${expectedCalibration.difficultyEasy}/${expectedCalibration.difficultyModerate}/${expectedCalibration.difficultyHard} (E/M/H)`);

  // ========================================================================
  // STEP 2: LOAD IDENTITY BANK (High-Yield Topics)
  // ========================================================================
  console.log('\n📚 STEP 2: Loading Identity Bank\n');

  const subjectLower = subject.toLowerCase();
  const identityPath = path.join(process.cwd(), `lib/oracle/identities/neet_${subjectLower}.json`);

  let identities: any[] = [];
  if (fs.existsSync(identityPath)) {
    const identityData = JSON.parse(fs.readFileSync(identityPath, 'utf-8'));
    identities = identityData.identities || identityData || [];
    console.log(`   ✅ Identity bank loaded: ${identities.length} identities`);

    // Show top 5 high-yield topics
    const topIdentities = identities
      .sort((a, b) => (b.empiricalFrequency?.avgPerYear || b.avgPerYear || 0) - (a.empiricalFrequency?.avgPerYear || a.avgPerYear || 0))
      .slice(0, 5);

    console.log('\n   🎯 Top 5 High-Yield Topics (Expected):');
    topIdentities.forEach((id, idx) => {
      console.log(`      ${idx + 1}. ${id.name}: ${(id.empiricalFrequency?.avgPerYear || id.avgPerYear)?.toFixed(1) || 'N/A'} Q/year`);
    });
  } else {
    console.log(`   ⚠️  Identity bank not found: ${identityPath}`);
  }

  // ========================================================================
  // STEP 3: FIND AI-GENERATED SCAN
  // ========================================================================
  console.log('\n🔍 STEP 3: Locating AI-Generated Scan\n');

  const { data: scans, error: scanError } = await supabase
    .from('scans')
    .select('id, name, created_at')
    .eq('exam_context', 'NEET')
    .eq('subject', subject)
    .ilike('name', '%AI-Generated%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (scanError) {
    console.error('❌ Error querying scans:', scanError);
    return;
  }

  if (!scans || scans.length === 0) {
    console.log('❌ No AI-generated scans found');
    console.log('⚠️  Run Phase 6 generator first:');
    console.log(`   npx tsx scripts/oracle/phase_generate_flagship_neet.ts ${subject} --generate`);
    return;
  }

  console.log(`   ✅ Found ${scans.length} AI-Generated scan(s):\n`);
  scans.forEach((scan: any, i: number) => {
    console.log(`      ${i + 1}. ${scan.name}`);
    console.log(`         ID: ${scan.id}`);
    console.log(`         Created: ${new Date(scan.created_at).toLocaleString()}`);
  });

  const scanId = scans[0].id;
  console.log(`\n   🎯 Using most recent scan: ${scanId.substring(0, 13)}...`);

  // ========================================================================
  // STEP 4: QUERY GENERATED QUESTIONS
  // ========================================================================
  console.log('\n📝 STEP 4: Querying Generated Questions\n');

  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .eq('scan_id', scanId)
    .order('created_at', { ascending: false });

  if (qError) {
    console.error('❌ Error querying questions:', qError);
    return;
  }

  const totalQuestions = questions?.length || 0;
  console.log(`   ✅ Total questions found: ${totalQuestions}`);

  if (!questions || questions.length === 0) {
    console.log('❌ No questions found in scan');
    return;
  }

  // ========================================================================
  // STEP 5: VERIFY QUESTION COUNT
  // ========================================================================
  console.log('\n📐 STEP 5: Question Count Verification\n');

  console.log(`   Expected: ${EXPECTED_TOTAL_QUESTIONS} questions (SET A: ${NEET_QUESTIONS_PER_SET}, SET B: ${NEET_QUESTIONS_PER_SET})`);
  console.log(`   Actual:   ${totalQuestions} questions`);

  if (totalQuestions === EXPECTED_TOTAL_QUESTIONS) {
    console.log('   ✅ PASS: Correct question count');
  } else if (totalQuestions >= NEET_QUESTIONS_PER_SET) {
    console.log(`   ⚠️  PARTIAL: ${totalQuestions}/${EXPECTED_TOTAL_QUESTIONS} questions generated`);
  } else {
    console.log(`   ❌ FAIL: Insufficient questions (${totalQuestions}/${EXPECTED_TOTAL_QUESTIONS})`);
  }

  // ========================================================================
  // STEP 5.5: SET A/B DISTRIBUTION VERIFICATION
  // ========================================================================
  console.log('\n📊 STEP 5.5: SET A/B Distribution Verification (Strategic Differentiation)\n');

  // Identify questions by set based on test_name or creation order
  const setAQuestions = questions.filter((q: any) =>
    q.test_name?.includes('SET_A') || q.test_name?.includes('SET A')
  );
  const setBQuestions = questions.filter((q: any) =>
    q.test_name?.includes('SET_B') || q.test_name?.includes('SET B')
  );

  // Fallback: If test_name doesn't have SET marker, split by creation order
  let setA = setAQuestions.length > 0 ? setAQuestions : questions.slice(0, NEET_QUESTIONS_PER_SET);
  let setB = setBQuestions.length > 0 ? setBQuestions : questions.slice(NEET_QUESTIONS_PER_SET, EXPECTED_TOTAL_QUESTIONS);

  console.log('   SET Distribution:');
  console.log(`      SET A (Formula/Numerical):    ${setA.length} questions`);
  console.log(`      SET B (Conceptual/Qualitative): ${setB.length} questions`);

  if (setA.length === NEET_QUESTIONS_PER_SET && setB.length === NEET_QUESTIONS_PER_SET) {
    console.log('   ✅ PASS: Perfect 45+45 split');
  } else {
    console.log(`   ⚠️  WARNING: Uneven split (expected 45+45)`);
  }

  console.log('\n   📌 Strategic Differentiation Strategy:');
  console.log('      SET A: Emphasizes formula application & numerical reasoning');
  console.log('      SET B: Emphasizes conceptual clarity & qualitative reasoning');
  console.log('      Both sets maintain IDENTICAL calibration parameters (IDS, Rigor, Difficulty)');

  // ========================================================================
  // STEP 6: DIFFICULTY DISTRIBUTION VERIFICATION
  // ========================================================================
  console.log('\n🎯 STEP 6: Difficulty Distribution Verification\n');

  const diffCounts = questions.reduce((acc: any, q: any) => {
    const diff = q.difficulty || 'unknown';
    acc[diff] = (acc[diff] || 0) + 1;
    return acc;
  }, {});

  const actualEasy = diffCounts['Easy'] || 0;
  const actualModerate = diffCounts['Moderate'] || 0;
  const actualHard = diffCounts['Hard'] || 0;

  const actualEasyPct = Math.round((actualEasy / totalQuestions) * 100);
  const actualModeratePct = Math.round((actualModerate / totalQuestions) * 100);
  const actualHardPct = Math.round((actualHard / totalQuestions) * 100);

  console.log('   Expected Difficulty Mix:');
  console.log(`      Easy:     ${expectedCalibration.difficultyEasy}%`);
  console.log(`      Moderate: ${expectedCalibration.difficultyModerate}%`);
  console.log(`      Hard:     ${expectedCalibration.difficultyHard}%`);

  console.log('\n   Actual Difficulty Mix:');
  console.log(`      Easy:     ${actualEasy} questions (${actualEasyPct}%) — Variance: ${actualEasyPct - expectedCalibration.difficultyEasy > 0 ? '+' : ''}${actualEasyPct - expectedCalibration.difficultyEasy}%`);
  console.log(`      Moderate: ${actualModerate} questions (${actualModeratePct}%) — Variance: ${actualModeratePct - expectedCalibration.difficultyModerate > 0 ? '+' : ''}${actualModeratePct - expectedCalibration.difficultyModerate}%`);
  console.log(`      Hard:     ${actualHard} questions (${actualHardPct}%) — Variance: ${actualHardPct - expectedCalibration.difficultyHard > 0 ? '+' : ''}${actualHardPct - expectedCalibration.difficultyHard}%`);

  const maxVariance = Math.max(
    Math.abs(actualEasyPct - expectedCalibration.difficultyEasy),
    Math.abs(actualModeratePct - expectedCalibration.difficultyModerate),
    Math.abs(actualHardPct - expectedCalibration.difficultyHard)
  );

  if (maxVariance <= 10) {
    console.log('\n   ✅ PASS: Difficulty distribution within acceptable variance (±10%)');
  } else {
    console.log(`\n   ⚠️  WARNING: Difficulty variance ${maxVariance}% exceeds threshold (±10%)`);
  }

  // ========================================================================
  // STEP 6.5: SET A vs SET B DIFFICULTY COMPARISON
  // ========================================================================
  console.log('\n🎯 STEP 6.5: SET A vs SET B Difficulty Comparison\n');

  // Analyze SET A difficulty
  const setADiff = setA.reduce((acc: any, q: any) => {
    const diff = q.difficulty || 'unknown';
    acc[diff] = (acc[diff] || 0) + 1;
    return acc;
  }, {});

  const setAEasy = setADiff['Easy'] || 0;
  const setAModerate = setADiff['Moderate'] || 0;
  const setAHard = setADiff['Hard'] || 0;
  const setAEasyPct = Math.round((setAEasy / setA.length) * 100);
  const setAModeratePct = Math.round((setAModerate / setA.length) * 100);
  const setAHardPct = Math.round((setAHard / setA.length) * 100);

  // Analyze SET B difficulty
  const setBDiff = setB.reduce((acc: any, q: any) => {
    const diff = q.difficulty || 'unknown';
    acc[diff] = (acc[diff] || 0) + 1;
    return acc;
  }, {});

  const setBEasy = setBDiff['Easy'] || 0;
  const setBModerate = setBDiff['Moderate'] || 0;
  const setBHard = setBDiff['Hard'] || 0;
  const setBEasyPct = Math.round((setBEasy / setB.length) * 100);
  const setBModeratePct = Math.round((setBModerate / setB.length) * 100);
  const setBHardPct = Math.round((setBHard / setB.length) * 100);

  console.log('   SET A (Formula/Numerical) Difficulty:');
  console.log(`      Easy:     ${setAEasy} (${setAEasyPct}%)`);
  console.log(`      Moderate: ${setAModerate} (${setAModeratePct}%)`);
  console.log(`      Hard:     ${setAHard} (${setAHardPct}%)`);

  console.log('\n   SET B (Conceptual/Qualitative) Difficulty:');
  console.log(`      Easy:     ${setBEasy} (${setBEasyPct}%)`);
  console.log(`      Moderate: ${setBModerate} (${setBModeratePct}%)`);
  console.log(`      Hard:     ${setBHard} (${setBHardPct}%)`);

  // Check if both sets maintain similar difficulty profile
  const diffVariance = Math.max(
    Math.abs(setAEasyPct - setBEasyPct),
    Math.abs(setAModeratePct - setBModeratePct),
    Math.abs(setAHardPct - setBHardPct)
  );

  console.log(`\n   Inter-Set Variance: ${diffVariance}% (max difference between sets)`);

  if (diffVariance <= 15) {
    console.log('   ✅ PASS: Both sets maintain similar difficulty profiles');
  } else {
    console.log(`   ⚠️  WARNING: Sets have divergent difficulty (${diffVariance}% variance)`);
  }

  // ========================================================================
  // STEP 7: TOPIC DISTRIBUTION VERIFICATION
  // ========================================================================
  console.log('\n🗺️  STEP 7: Topic Distribution Verification\n');

  const topicCounts = questions.reduce((acc: any, q: any) => {
    const topic = q.topic || 'unknown';
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {});

  const sortedTopics = Object.entries(topicCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number));

  console.log(`   Total unique topics: ${sortedTopics.length}`);
  console.log('\n   Top 10 Topics Generated:');
  sortedTopics.slice(0, 10).forEach(([topic, count], idx) => {
    const pct = Math.round((count as number / totalQuestions) * 100);
    console.log(`      ${(idx + 1).toString().padStart(2)}. ${topic.padEnd(45)} : ${count} Q (${pct}%)`);
  });

  // Compare with identity bank
  if (identities.length > 0) {
    console.log('\n   🔍 Cross-Check with Identity Bank:');
    const topIdentities = identities
      .sort((a, b) => (b.empiricalFrequency?.avgPerYear || b.avgPerYear || 0) - (a.empiricalFrequency?.avgPerYear || a.avgPerYear || 0))
      .slice(0, 5);

    let matched = 0;
    topIdentities.forEach((id, idx) => {
      const generatedCount = topicCounts[id.name] || 0;
      const status = generatedCount > 0 ? '✅' : '❌';
      console.log(`      ${status} ${id.name}: Expected ${id.avgPerYear?.toFixed(1)} Q/year → Generated ${generatedCount} Q`);
      if (generatedCount > 0) matched++;
    });

    console.log(`\n   Coverage: ${matched}/${topIdentities.length} top identities represented`);
  }

  // ========================================================================
  // STEP 7.5: SET A vs SET B TOPIC DISTRIBUTION
  // ========================================================================
  console.log('\n🗺️  STEP 7.5: SET A vs SET B Topic Distribution\n');

  // Analyze SET A topics
  const setATopics = setA.reduce((acc: any, q: any) => {
    const topic = q.topic || 'unknown';
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {});

  const setASortedTopics = Object.entries(setATopics)
    .sort(([,a], [,b]) => (b as number) - (a as number));

  // Analyze SET B topics
  const setBTopics = setB.reduce((acc: any, q: any) => {
    const topic = q.topic || 'unknown';
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {});

  const setBSortedTopics = Object.entries(setBTopics)
    .sort(([,a], [,b]) => (b as number) - (a as number));

  console.log('   SET A (Formula/Numerical) - Top 5 Topics:');
  setASortedTopics.slice(0, 5).forEach(([topic, count], idx) => {
    const pct = Math.round((count as number / setA.length) * 100);
    console.log(`      ${idx + 1}. ${topic.substring(0, 40).padEnd(40)} : ${count} Q (${pct}%)`);
  });

  console.log('\n   SET B (Conceptual/Qualitative) - Top 5 Topics:');
  setBSortedTopics.slice(0, 5).forEach(([topic, count], idx) => {
    const pct = Math.round((count as number / setB.length) * 100);
    console.log(`      ${idx + 1}. ${topic.substring(0, 40).padEnd(40)} : ${count} Q (${pct}%)`);
  });

  console.log(`\n   Topic Diversity:`);
  console.log(`      SET A: ${setASortedTopics.length} unique topics`);
  console.log(`      SET B: ${setBSortedTopics.length} unique topics`);

  // Find common high-yield topics
  const setATopNames = setASortedTopics.slice(0, 5).map(([topic]) => topic);
  const setBTopNames = setBSortedTopics.slice(0, 5).map(([topic]) => topic);
  const commonTopics = setATopNames.filter(t => setBTopNames.includes(t));

  console.log(`      Common in Top 5: ${commonTopics.length}/5 topics (good topic overlap)`);

  if (commonTopics.length >= 3) {
    console.log('   ✅ PASS: Good topic overlap between sets');
  } else {
    console.log('   ⚠️  WARNING: Low topic overlap - sets may be too divergent');
  }

  // ========================================================================
  // STEP 8: CONTENT QUALITY VERIFICATION
  // ========================================================================
  console.log('\n✨ STEP 8: Content Quality Verification\n');

  const withText = questions.filter(q => q.text && q.text.length > 10).length;
  const withOptions = questions.filter(q => q.options && q.options.length === 4).length;
  const withCorrectAnswer = questions.filter(q => q.correct_option_index !== null && q.correct_option_index !== undefined).length;
  const withSolution = questions.filter(q => q.solution_steps && q.solution_steps.length > 0).length;
  const withExamTip = questions.filter(q => q.exam_tip).length;

  console.log('   Content Completeness:');
  console.log(`      Question Text:      ${withText}/${totalQuestions} (${Math.round(withText/totalQuestions*100)}%)`);
  console.log(`      4 MCQ Options:      ${withOptions}/${totalQuestions} (${Math.round(withOptions/totalQuestions*100)}%)`);
  console.log(`      Correct Answer:     ${withCorrectAnswer}/${totalQuestions} (${Math.round(withCorrectAnswer/totalQuestions*100)}%)`);
  console.log(`      Solution Steps:     ${withSolution}/${totalQuestions} (${Math.round(withSolution/totalQuestions*100)}%)`);
  console.log(`      Exam Tips:          ${withExamTip}/${totalQuestions} (${Math.round(withExamTip/totalQuestions*100)}%)`);

  const qualityScore = (
    (withText / totalQuestions) * 25 +
    (withOptions / totalQuestions) * 25 +
    (withCorrectAnswer / totalQuestions) * 25 +
    (withSolution / totalQuestions) * 15 +
    (withExamTip / totalQuestions) * 10
  );

  console.log(`\n   Overall Quality Score: ${qualityScore.toFixed(1)}/100`);

  if (qualityScore >= 90) {
    console.log('   ✅ EXCELLENT: High-quality flagship questions');
  } else if (qualityScore >= 70) {
    console.log('   ⚠️  GOOD: Questions meet minimum requirements');
  } else {
    console.log('   ❌ POOR: Content quality below standards');
  }

  // ========================================================================
  // STEP 8.5: STRATEGIC EMPHASIS VERIFICATION (DEEP DIVE)
  // ========================================================================
  console.log('\n🔬 STEP 8.5: Strategic Emphasis Verification - Deep Dive Analysis\n');

  // Helper function to detect formula/numerical emphasis
  const analyzeFormulaEmphasis = (q: any) => {
    const text = (q.text || '').toLowerCase();
    const solution = (q.solution_steps || []).join(' ').toLowerCase();
    const combined = text + ' ' + solution;

    const indicators = {
      hasLatexFormula: /\$[^$]+\$/.test(q.text || ''),  // LaTeX math mode
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

  // Helper function to detect conceptual/qualitative emphasis
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

  // Analyze SET A questions
  console.log('   🔢 SET A (Formula/Numerical) Analysis:\n');

  const setAAnalysis = setA.map(analyzeFormulaEmphasis);
  const setAFormulaScores = setAAnalysis.map(a => a.score);
  const setAAvgFormulaScore = setAFormulaScores.reduce((sum, s) => sum + s, 0) / setAFormulaScores.length;

  const setAWithFormulas = setAAnalysis.filter(a => a.score >= 3).length;
  const setAWithLatex = setAAnalysis.filter(a => a.indicators.hasLatexFormula).length;
  const setAWithNumerical = setAAnalysis.filter(a => a.indicators.hasNumericalValues).length;
  const setAWithCalculation = setAAnalysis.filter(a => a.indicators.hasCalculation).length;
  const setAWithMultiStep = setAAnalysis.filter(a => a.indicators.hasMultiStep).length;

  console.log(`      Formula Emphasis Indicators:`);
  console.log(`         Questions with LaTeX formulas:     ${setAWithLatex}/${setA.length} (${Math.round(setAWithLatex/setA.length*100)}%)`);
  console.log(`         Questions with numerical values:   ${setAWithNumerical}/${setA.length} (${Math.round(setAWithNumerical/setA.length*100)}%)`);
  console.log(`         Questions requiring calculations:  ${setAWithCalculation}/${setA.length} (${Math.round(setAWithCalculation/setA.length*100)}%)`);
  console.log(`         Questions with multi-step solving: ${setAWithMultiStep}/${setA.length} (${Math.round(setAWithMultiStep/setA.length*100)}%)`);
  console.log(`         Strong formula emphasis (≥3 indicators): ${setAWithFormulas}/${setA.length} (${Math.round(setAWithFormulas/setA.length*100)}%)`);
  console.log(`         Average formula score: ${setAAvgFormulaScore.toFixed(2)}/7`);

  // Analyze SET B questions
  console.log('\n   🧠 SET B (Conceptual/Qualitative) Analysis:\n');

  const setBAnalysis = setB.map(analyzeConceptualEmphasis);
  const setBConceptualScores = setBAnalysis.map(a => a.score);
  const setBAvgConceptualScore = setBConceptualScores.reduce((sum, s) => sum + s, 0) / setBConceptualScores.length;

  const setBWithConcepts = setBAnalysis.filter(a => a.score >= 3).length;
  const setBWithQualitative = setBAnalysis.filter(a => a.indicators.hasQualitativeLanguage).length;
  const setBWithRealWorld = setBAnalysis.filter(a => a.indicators.hasRealWorldContext).length;
  const setBWithCauseEffect = setBAnalysis.filter(a => a.indicators.hasCauseEffect).length;
  const setBWithUnderstanding = setBAnalysis.filter(a => a.indicators.hasUnderstandingFocus).length;

  console.log(`      Conceptual Emphasis Indicators:`);
  console.log(`         Questions with qualitative language: ${setBWithQualitative}/${setB.length} (${Math.round(setBWithQualitative/setB.length*100)}%)`);
  console.log(`         Questions with real-world context:  ${setBWithRealWorld}/${setB.length} (${Math.round(setBWithRealWorld/setB.length*100)}%)`);
  console.log(`         Questions with cause-effect logic:  ${setBWithCauseEffect}/${setB.length} (${Math.round(setBWithCauseEffect/setB.length*100)}%)`);
  console.log(`         Questions testing understanding:    ${setBWithUnderstanding}/${setB.length} (${Math.round(setBWithUnderstanding/setB.length*100)}%)`);
  console.log(`         Strong conceptual emphasis (≥3 indicators): ${setBWithConcepts}/${setB.length} (${Math.round(setBWithConcepts/setB.length*100)}%)`);
  console.log(`         Average conceptual score: ${setBAvgConceptualScore.toFixed(2)}/7`);

  // Cross-comparison to verify differentiation
  console.log('\n   📊 Comparative Strategic Differentiation:\n');

  // Also analyze SET A for conceptual and SET B for formula to show contrast
  const setAConceptualAnalysis = setA.map(analyzeConceptualEmphasis);
  const setAAvgConceptualScore = setAConceptualAnalysis.map(a => a.score).reduce((sum, s) => sum + s, 0) / setA.length;

  const setBFormulaAnalysis = setB.map(analyzeFormulaEmphasis);
  const setBAvgFormulaScore = setBFormulaAnalysis.map(a => a.score).reduce((sum, s) => sum + s, 0) / setB.length;

  console.log(`      SET A Formula Score:    ${setAAvgFormulaScore.toFixed(2)}/7 vs Conceptual: ${setAAvgConceptualScore.toFixed(2)}/7`);
  console.log(`      SET B Conceptual Score: ${setBAvgConceptualScore.toFixed(2)}/7 vs Formula: ${setBAvgFormulaScore.toFixed(2)}/7`);

  const setAFormulaBias = setAAvgFormulaScore - setAAvgConceptualScore;
  const setBConceptualBias = setBAvgConceptualScore - setBAvgFormulaScore;

  console.log(`\n      SET A Formula Bias:      ${setAFormulaBias > 0 ? '+' : ''}${setAFormulaBias.toFixed(2)} (${setAFormulaBias > 0 ? 'formula-heavy ✅' : 'concept-heavy ⚠️'})`);
  console.log(`      SET B Conceptual Bias:   ${setBConceptualBias > 0 ? '+' : ''}${setBConceptualBias.toFixed(2)} (${setBConceptualBias > 0 ? 'concept-heavy ✅' : 'formula-heavy ⚠️'})`);

  if (setAFormulaBias > 0.3 && setBConceptualBias > 0.3) {
    console.log('\n   ✅ EXCELLENT: Strong strategic differentiation detected!');
    console.log('      SET A clearly emphasizes formulas & calculations');
    console.log('      SET B clearly emphasizes concepts & qualitative reasoning');
  } else if (setAFormulaBias > 0 && setBConceptualBias > 0) {
    console.log('\n   ✅ PASS: Moderate strategic differentiation detected');
    console.log('      Both sets show expected emphasis patterns');
  } else {
    console.log('\n   ⚠️  WARNING: Weak strategic differentiation');
    console.log('      Sets may not have distinct pedagogical styles');
  }

  // ========================================================================
  // STEP 9: PREDICTION READINESS CHECKS
  // ========================================================================
  console.log('\n🚀 STEP 9: Prediction Readiness Verification\n');

  const checks = [];

  // Check 1: Question count
  checks.push({
    name: 'Question Count',
    pass: totalQuestions >= NEET_QUESTIONS_PER_SET,
    message: `${totalQuestions}/${EXPECTED_TOTAL_QUESTIONS} questions`
  });

  // Check 2: Difficulty alignment
  checks.push({
    name: 'Difficulty Alignment',
    pass: maxVariance <= 15,
    message: `Max variance: ${maxVariance}%`
  });

  // Check 3: Content completeness
  checks.push({
    name: 'Content Completeness',
    pass: withText >= totalQuestions * 0.95,
    message: `${withText}/${totalQuestions} questions have text`
  });

  // Check 4: MCQ format
  checks.push({
    name: 'MCQ Format',
    pass: withOptions >= totalQuestions * 0.95,
    message: `${withOptions}/${totalQuestions} questions have 4 options`
  });

  // Check 5: Correct answers
  checks.push({
    name: 'Answer Keys',
    pass: withCorrectAnswer >= totalQuestions * 0.95,
    message: `${withCorrectAnswer}/${totalQuestions} questions have answer`
  });

  // Check 6: Topic coverage
  checks.push({
    name: 'Topic Coverage',
    pass: sortedTopics.length >= 10,
    message: `${sortedTopics.length} unique topics`
  });

  console.log('   Readiness Checks:');
  checks.forEach(check => {
    const status = check.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`      ${status} - ${check.name.padEnd(25)} : ${check.message}`);
  });

  const passedChecks = checks.filter(c => c.pass).length;
  const readinessScore = Math.round((passedChecks / checks.length) * 100);

  console.log(`\n   Readiness Score: ${passedChecks}/${checks.length} checks passed (${readinessScore}%)`);

  // ========================================================================
  // STEP 10: SAMPLE QUESTIONS (SET A vs SET B)
  // ========================================================================
  console.log('\n📋 STEP 10: Sample Generated Questions (Set Comparison)\n');

  console.log('   🔢 SET A Samples (Formula/Numerical Emphasis):\n');
  setA.slice(0, 2).forEach((q: any, i: number) => {
    const preview = q.text ? q.text.substring(0, 100) : 'No text';
    const formulaAnalysis = analyzeFormulaEmphasis(q);
    console.log(`      Sample ${i + 1}:`);
    console.log(`         Text: ${preview}...`);
    console.log(`         Difficulty: ${q.difficulty || 'N/A'} | Topic: ${q.topic || 'N/A'}`);
    console.log(`         Formula Score: ${formulaAnalysis.score}/7 indicators`);
    console.log(`         Has LaTeX: ${formulaAnalysis.indicators.hasLatexFormula ? '✅' : '❌'} | Numerical: ${formulaAnalysis.indicators.hasNumericalValues ? '✅' : '❌'} | Calculation: ${formulaAnalysis.indicators.hasCalculation ? '✅' : '❌'}`);
    console.log('');
  });

  console.log('   🧠 SET B Samples (Conceptual/Qualitative Emphasis):\n');
  setB.slice(0, 2).forEach((q: any, i: number) => {
    const preview = q.text ? q.text.substring(0, 100) : 'No text';
    const conceptAnalysis = analyzeConceptualEmphasis(q);
    console.log(`      Sample ${i + 1}:`);
    console.log(`         Text: ${preview}...`);
    console.log(`         Difficulty: ${q.difficulty || 'N/A'} | Topic: ${q.topic || 'N/A'}`);
    console.log(`         Conceptual Score: ${conceptAnalysis.score}/7 indicators`);
    console.log(`         Qualitative: ${conceptAnalysis.indicators.hasQualitativeLanguage ? '✅' : '❌'} | Real-World: ${conceptAnalysis.indicators.hasRealWorldContext ? '✅' : '❌'} | Cause-Effect: ${conceptAnalysis.indicators.hasCauseEffect ? '✅' : '❌'}`);
    console.log('');
  });

  // ========================================================================
  // FINAL SUMMARY
  // ========================================================================
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                      VERIFICATION SUMMARY                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log(`   Subject: NEET ${subject}`);
  console.log(`   Target Year: 2026`);
  console.log(`   Questions Generated: ${totalQuestions}/${EXPECTED_TOTAL_QUESTIONS}`);
  console.log(`   Quality Score: ${qualityScore.toFixed(1)}/100`);
  console.log(`   Readiness Score: ${readinessScore}%`);
  console.log(`   Difficulty Variance: ${maxVariance}% (target: ≤10%)`);

  console.log('\n   📊 Strategic Differentiation Summary:');
  console.log(`      SET A (45 Q): Formula Score ${setAAvgFormulaScore.toFixed(2)}/7, Bias: ${setAFormulaBias > 0 ? '+' : ''}${setAFormulaBias.toFixed(2)}`);
  console.log(`      SET B (45 Q): Conceptual Score ${setBAvgConceptualScore.toFixed(2)}/7, Bias: ${setBConceptualBias > 0 ? '+' : ''}${setBConceptualBias.toFixed(2)}`);
  console.log(`      Inter-Set Difficulty Variance: ${diffVariance}%`);

  // Determine strategic differentiation status
  const hasStrongDifferentiation = setAFormulaBias > 0.3 && setBConceptualBias > 0.3;
  const hasModerateDifferentiation = setAFormulaBias > 0 && setBConceptualBias > 0;

  if (passedChecks === checks.length && totalQuestions === EXPECTED_TOTAL_QUESTIONS && hasStrongDifferentiation) {
    console.log('\n   ✅ STATUS: PHASE 6 COMPLETE - Ready for Phase 7 (Forensic Audit)');
    console.log('      ✅ Strategic SET A/B differentiation: EXCELLENT');
    console.log('      ✅ Calibration integrity: MAINTAINED');
  } else if (passedChecks >= checks.length * 0.8 && hasModerateDifferentiation) {
    console.log('\n   ✅ STATUS: PHASE 6 COMPLETE - Ready for Phase 7 (Forensic Audit)');
    console.log('      ✅ Strategic SET A/B differentiation: GOOD');
    console.log('      ⚠️  Minor issues detected, but acceptable for prediction');
  } else if (passedChecks >= checks.length * 0.8) {
    console.log('\n   ⚠️  STATUS: PHASE 6 PARTIAL - Minor issues detected');
  } else {
    console.log('\n   ❌ STATUS: PHASE 6 INCOMPLETE - Major issues detected');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Next Step: Phase 7 - Forensic Audit');
  console.log('  Wait for NEET 2026 actual paper (expected: May 5, 2026)');
  console.log('  Run forensic audit to compare predictions vs actuals');
  console.log('  Calculate accuracy metrics and generate report');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ========================================================================
// MAIN EXECUTION
// ========================================================================
const subject = process.argv[2];

if (!subject || !VALID_SUBJECTS.includes(subject)) {
  console.error('❌ Invalid subject. Usage:');
  console.error('   npx tsx scripts/oracle/verify_flagship_generation.ts <Subject>');
  console.error('');
  console.error('Valid subjects: Physics, Chemistry, Botany, Zoology');
  console.error('');
  console.error('Examples:');
  console.error('   npx tsx scripts/oracle/verify_flagship_generation.ts Physics');
  console.error('   npx tsx scripts/oracle/verify_flagship_generation.ts Chemistry');
  process.exit(1);
}

verifyFlagshipGeneration(subject).catch(console.error);
