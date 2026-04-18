/**
 * KCET Chemistry Iterative Calibration (2021-2025)
 * REI v17 - Full 60-Question Paper Generation & Calibration
 *
 * This script:
 * 1. Uses 2021 as baseline
 * 2. For each year (2022-2025):
 *    - Generates predicted 60-question paper
 *    - Compares with actual paper question-by-question
 *    - Adjusts REI parameters iteratively to achieve 80%+ match
 * 3. Outputs final calibrated parameters and comprehensive reports
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { auditPaperHistoricalContext } from '../../lib/aiPaperAuditor';
import { generateTestQuestions, type AnalyzedQuestion } from '../../lib/aiQuestionGenerator';
import {
  compareQuestionsByPosition,
  comparePapersUsingIdentityVectors,
  computeComparisonSummary,
  type QuestionComparisonResult
} from '../../lib/oracle/questionComparator';
import {
  adjustParameters,
  createInitialCalibrationState,
  shouldStopCalibration,
  type CalibrationState
} from '../../lib/oracle/parameterAdjuster';
import {
  generateCalibrationReport,
  generateYearIterationLog,
  type YearCalibrationResult,
  type MultiYearCalibrationReport
} from '../../lib/oracle/calibrationReporter';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY not found in environment');
}

const EXAM_CONTEXT = 'KCET';
const SUBJECT = 'Chemistry';
const TOTAL_QUESTIONS = 60;

const OFFICIAL_SCANS: Record<number, string> = {
  2021: '5bfcb13b-9ed6-48c9-ad2f-ee995d9d9a72',
  2022: '6c77a7a3-fd6b-40ef-9f42-f092905bcd5d',
  2023: '709486c9-317a-4fd0-8921-e8f123595648',
  2024: 'ed2ba125-4215-4a12-a148-97bc52a1cee3',
  2025: '61b7d6a9-d68d-4bb3-9f75-a481d59226d0'
};

const MAX_ITERATIONS_PER_YEAR = 10;
const TARGET_MATCH_RATE = 0.80;

/**
 * Main orchestrator function
 */
async function runIterativeCalibration() {
  console.log('\n🔄 KCET CHEMISTRY ITERATIVE CALIBRATION (2021-2025)');
  console.log('═══════════════════════════════════════════════\n');

  // Load identity bank and engine config
  const identityBankPath = path.join(
    process.cwd(),
    `lib/oracle/identities/kcet_${SUBJECT.toLowerCase()}.json`
  );
  const engineConfigPath = path.join(process.cwd(), 'lib/oracle/engine_config.json');

  const identityBank = JSON.parse(fs.readFileSync(identityBankPath, 'utf8'));
  const engineConfig = JSON.parse(fs.readFileSync(engineConfigPath, 'utf8'));

  console.log(`✅ Loaded ${identityBank.identities.length} identities from bank`);
  console.log(`✅ Loaded engine config v${engineConfig.engine_version}\n`);

  // Store initial identities for evolution tracking
  const initialIdentities = identityBank.identities.map((id: any) => ({
    id: id.id,
    topic: id.topic,
    initialConfidence: id.confidence,
    finalConfidence: id.confidence
  }));

  // Phase 1: Extract 2021 baseline
  console.log('📊 Phase 1: Extracting 2021 Baseline\n');
  const baseline2021 = await extract2021Baseline(identityBank.identities);

  console.log(`   ✓ 2021 IDS Actual: ${baseline2021.idsActual.toFixed(3)}`);
  console.log(`   ✓ Identity Vector: ${Object.keys(baseline2021.identityVector).length} unique identities`);
  console.log(`   ✓ Total Questions: ${baseline2021.totalQuestions}\n`);

  // Initialize calibration state
  let currentState = createInitialCalibrationState(
    2021,
    identityBank.identities,
    engineConfig
  );

  const yearResults: YearCalibrationResult[] = [];

  // Phase 2-5: Calibrate years 2022-2025
  const years = [2022, 2023, 2024, 2025];

  for (const year of years) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Phase ${year - 2020}: Calibrating Year ${year}`);
    console.log(`${'='.repeat(60)}\n`);

    const yearResult = await calibrateYear(
      year,
      currentState,
      identityBank.identities
    );

    yearResults.push(yearResult);

    // Update state for next year (carry forward calibrated parameters)
    currentState = yearResult.calibrationState;

    // Update identity confidences in the bank
    for (const identity of identityBank.identities) {
      if (currentState.parameters.identityConfidences[identity.id]) {
        identity.confidence = currentState.parameters.identityConfidences[identity.id];
      }
    }

    // Save intermediate identity bank
    fs.writeFileSync(
      identityBankPath,
      JSON.stringify(identityBank, null, 2),
      'utf8'
    );

    console.log(`\n✅ Year ${year} calibration complete!`);
    console.log(`   Final Match Rate: ${(yearResult.finalMatchRate * 100).toFixed(1)}%`);
    console.log(`   Iterations: ${yearResult.iterations}\n`);
  }

  // Phase 6: Generate comprehensive reports
  console.log(`\n${'='.repeat(60)}`);
  console.log('📝 Phase 6: Generating Comprehensive Reports');
  console.log(`${'='.repeat(60)}\n`);

  // Update final confidences for evolution tracking
  for (const identity of initialIdentities) {
    const finalConf = currentState.parameters.identityConfidences[identity.id];
    if (finalConf !== undefined) {
      identity.finalConfidence = finalConf;
    }
  }

  // Build topic distribution from last year
  const topicDistribution = buildTopicDistribution(
    yearResults[yearResults.length - 1].comparisonSummary.details
  );

  const multiYearReport: MultiYearCalibrationReport = {
    examContext: EXAM_CONTEXT,
    subject: SUBJECT,
    years: yearResults,
    finalParameters: currentState.parameters,
    identityEvolution: initialIdentities,
    topicDistribution,
    validationMetrics: {
      systemConfidence: calculateSystemConfidence(yearResults),
      stability: calculateStability(yearResults)
    }
  };

  // Create output directory
  const outputDir = path.join(process.cwd(), 'docs/oracle/calibration');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate main calibration report
  const reportPath = path.join(outputDir, 'KCET_CHEMISTRY_CALIBRATION_REPORT_2021_2025.md');
  generateCalibrationReport(multiYearReport, reportPath);

  // Generate per-year iteration logs
  for (const yearResult of yearResults) {
    generateYearIterationLog(yearResult.year, yearResult, outputDir);
  }

  // Update identity bank with final calibration metadata
  identityBank.calibration = {
    ...identityBank.calibration,
    status: 'CALIBRATED_2021_2025',
    updated_at: new Date().toISOString(),
    final_match_rate: yearResults[yearResults.length - 1].finalMatchRate,
    total_iterations: yearResults.reduce((sum, y) => sum + y.iterations, 0)
  };

  fs.writeFileSync(identityBankPath, JSON.stringify(identityBank, null, 2), 'utf8');

  // Update engine config (optional - user can decide whether to apply)
  const updatedEngineConfig = {
    ...engineConfig,
    rigor_drift_multiplier: currentState.parameters.rigorDriftMultiplier,
    ids_baseline: currentState.parameters.idsBaseline,
    synthesis_weight: currentState.parameters.synthesisWeight,
    trap_weight: currentState.parameters.trapWeight,
    intent_learning_rate: currentState.parameters.intentLearningRate,
    volatility_factor: currentState.parameters.volatilityFactor,
    solve_tension_multiplier: currentState.parameters.solveTensionMultiplier,
    projection_buffer: currentState.parameters.projectionBuffer,
    last_updated: new Date().toISOString(),
    calibration_note: 'Calibrated using iterative RWC (2021-2025)'
  };

  const updatedEngineConfigPath = path.join(
    outputDir,
    'engine_config_calibrated.json'
  );
  fs.writeFileSync(
    updatedEngineConfigPath,
    JSON.stringify(updatedEngineConfig, null, 2),
    'utf8'
  );

  console.log('\n✅ CALIBRATION COMPLETE');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`📊 Final Metrics:`);
  console.log(`   - Average Match Rate: ${(yearResults.reduce((sum, y) => sum + y.finalMatchRate, 0) / yearResults.length * 100).toFixed(1)}%`);
  console.log(`   - Total Iterations: ${yearResults.reduce((sum, y) => sum + y.iterations, 0)}`);
  console.log(`   - System Confidence: ${(calculateSystemConfidence(yearResults) * 100).toFixed(1)}%`);
  console.log(`\n📁 Output Files:`);
  console.log(`   - Main Report: ${reportPath}`);
  console.log(`   - Identity Bank: ${identityBankPath}`);
  console.log(`   - Engine Config: ${updatedEngineConfigPath}`);
  console.log(`   - Iteration Logs: ${outputDir}/KCET_CHEMISTRY_*_ITERATION_LOG.md\n`);
}

/**
 * Extract 2021 baseline data
 */
async function extract2021Baseline(identities: any[]) {
  console.log('   Fetching 2021 paper from database...');

  const { data: questions } = await supabase
    .from('questions')
    .select('text, topic, difficulty, options, correct_option_index, solution_steps')
    .eq('scan_id', OFFICIAL_SCANS[2021])
    .order('question_order');

  if (!questions || questions.length === 0) {
    throw new Error('Failed to fetch 2021 paper from database');
  }

  console.log(`   ✓ Fetched ${questions.length} questions from 2021 paper`);
  console.log('   Running AI audit on 2021 paper...');

  const paperText = questions.map((q) => q.text).join('\n\n');
  const audit = await auditPaperHistoricalContext(
    paperText,
    EXAM_CONTEXT,
    SUBJECT,
    2021,
    GEMINI_API_KEY!,
    identities
  );

  if (!audit) {
    throw new Error('Failed to audit 2021 paper');
  }

  console.log(`   ✓ Audit complete`);

  return {
    totalQuestions: questions.length,
    idsActual: audit.idsActual,
    identityVector: audit.identityVector || {},
    intentSignature: audit.intentSignature,
    boardSignature: audit.boardSignature
  };
}

/**
 * Calibrate a single year
 */
async function calibrateYear(
  year: number,
  initialState: CalibrationState,
  identities: any[]
): Promise<YearCalibrationResult> {
  // Fetch actual paper
  console.log(`   📥 Fetching actual ${year} paper from database...`);

  const { data: actualQuestions } = await supabase
    .from('questions')
    .select('text, topic, difficulty, options, correct_option_index, solution_steps')
    .eq('scan_id', OFFICIAL_SCANS[year])
    .order('question_order');

  if (!actualQuestions || actualQuestions.length === 0) {
    throw new Error(`Failed to fetch ${year} paper from database`);
  }

  console.log(`   ✓ Fetched ${actualQuestions.length} actual questions`);

  // Run audit on actual paper to extract identities
  console.log(`   🔍 Auditing actual ${year} paper...`);

  const actualPaperText = actualQuestions.map((q) => q.text).join('\n\n');
  const actualAudit = await auditPaperHistoricalContext(
    actualPaperText,
    EXAM_CONTEXT,
    SUBJECT,
    year,
    GEMINI_API_KEY!,
    identities
  );

  if (!actualAudit) {
    throw new Error(`Failed to audit ${year} paper`);
  }

  console.log(`   ✓ Audit complete - IDS Actual: ${actualAudit.idsActual.toFixed(3)}`);

  // Convert actual questions to AnalyzedQuestion format with identity mapping
  const actualPaper: AnalyzedQuestion[] = actualQuestions.map((q, idx) => ({
    text: q.text,
    options: q.options || [],
    correctAnswer: q.options && q.correct_option_index !== null ? q.options[q.correct_option_index] : undefined,
    topic: q.topic,
    difficulty: q.difficulty as 'Easy' | 'Moderate' | 'Hard',
    identityId: mapQuestionToIdentity(q.text, q.topic, actualAudit.identityVector, idx, identities),
    solution: Array.isArray(q.solution_steps) ? q.solution_steps.join('\n') : '',
    solutionSteps: Array.isArray(q.solution_steps) ? q.solution_steps : [],
    conceptTags: [q.topic].filter(Boolean)
  }));

  // Iterative calibration loop
  let state = { ...initialState, year };
  let iteration = 0;
  let bestState = state;
  let bestMatchRate = 0;

  while (iteration < MAX_ITERATIONS_PER_YEAR) {
    iteration++;

    console.log(`\n   🔄 Iteration ${iteration}/${MAX_ITERATIONS_PER_YEAR}`);
    console.log(`   ────────────────────────────────────────────────`);

    // Generate predicted paper
    console.log(`   🎯 Generating predicted ${year} paper...`);
    const generatedPaper = await generatePredictedPaper(
      state,
      identities,
      year
    );

    console.log(`   ✓ Generated ${generatedPaper.length} questions`);

    // Compare papers using identity vector approach (handles shuffled questions)
    console.log(`   📊 Comparing generated vs actual (whole-paper analysis)...`);
    const summary = comparePapersUsingIdentityVectors(generatedPaper, actualPaper);

    console.log(`   ✓ Match Rate: ${(summary.matchRate * 100).toFixed(1)}%`);
    console.log(`   ✓ Average Score: ${(summary.averageScore * 100).toFixed(1)}%`);
    console.log(`   ✓ Identity Hit Rate: ${(summary.identityHitRate * 100).toFixed(1)}%`);
    console.log(`   ✓ Topic Accuracy: ${(summary.topicAccuracy * 100).toFixed(1)}%`);

    // Update state with current metrics
    state.matchRate = summary.matchRate;
    state.averageScore = summary.averageScore;
    state.identityHitRate = summary.identityHitRate;
    state.topicAccuracy = summary.topicAccuracy;
    state.difficultyAccuracy = summary.difficultyAccuracy;

    // Track best state
    if (summary.matchRate > bestMatchRate) {
      bestMatchRate = summary.matchRate;
      bestState = { ...state };
    }

    // Check stopping criteria
    const { stop, reason } = shouldStopCalibration(state, MAX_ITERATIONS_PER_YEAR, TARGET_MATCH_RATE);

    if (stop) {
      console.log(`\n   ✅ ${reason}`);
      break;
    }

    // Adjust parameters for next iteration
    console.log(`   🔧 Adjusting parameters...`);
    state = adjustParameters(state, summary.details);

    // Small delay to avoid API throttling
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Use best state achieved
  if (bestMatchRate > state.matchRate) {
    console.log(`\n   📊 Using best state from iteration (Match Rate: ${(bestMatchRate * 100).toFixed(1)}%)`);
    state = bestState;
  }

  // Final comparison for reporting (using best-achieved state)
  const finalGeneratedPaper = await generatePredictedPaper(state, identities, year);
  const finalSummary = comparePapersUsingIdentityVectors(finalGeneratedPaper, actualPaper);

  return {
    year,
    iterations: iteration,
    finalMatchRate: finalSummary.matchRate,
    finalAverageScore: finalSummary.averageScore,
    identityHitRate: finalSummary.identityHitRate,
    topicAccuracy: finalSummary.topicAccuracy,
    difficultyAccuracy: finalSummary.difficultyAccuracy,
    idsActual: actualAudit.idsActual,
    idsPredicted: state.parameters.idsBaseline,
    calibrationState: state,
    comparisonSummary: finalSummary
  };
}

/**
 * Generate predicted paper using current calibration parameters
 */
async function generatePredictedPaper(
  state: CalibrationState,
  identities: any[],
  year: number
): Promise<AnalyzedQuestion[]> {
  // Build generation context using calibrated parameters
  const context = buildGenerationContext(state, identities, year);

  // Generate questions
  const questions = await generateTestQuestions(
    context,
    GEMINI_API_KEY!,
    TOTAL_QUESTIONS
  );

  // CRITICAL FIX: Assign identity IDs to generated questions based on topic
  questions.forEach((q) => {
    if (!q.identityId || q.identityId === 'UNKNOWN') {
      // Find matching identity by topic
      const matchingIdentities = identities.filter(
        (id) => id.topic.toLowerCase() === (q.topic || '').toLowerCase()
      );

      if (matchingIdentities.length > 0) {
        // Prefer identities with higher confidence
        const sortedIdentities = matchingIdentities.sort(
          (a, b) => (state.parameters.identityConfidences[b.id] || 0.5) -
                    (state.parameters.identityConfidences[a.id] || 0.5)
        );
        q.identityId = sortedIdentities[0].id;
      } else {
        // Fuzzy match
        const fuzzyMatch = identities.find(id =>
          id.topic.toLowerCase().includes((q.topic || '').toLowerCase()) ||
          (q.topic || '').toLowerCase().includes(id.topic.toLowerCase())
        );
        if (fuzzyMatch) {
          q.identityId = fuzzyMatch.id;
        } else {
          q.identityId = 'UNKNOWN';
        }
      }
    }
  });

  console.log(`   ✓ Assigned identity IDs: ${questions.filter(q => q.identityId !== 'UNKNOWN').length}/${questions.length} questions`);

  return questions;
}

/**
 * Build generation context from calibration state
 */
function buildGenerationContext(
  state: CalibrationState,
  identities: any[],
  year: number
): any {
  // Build topic metadata from identities
  const topics = identities.map((id, idx) => ({
    topicId: id.id,
    topicName: id.topic,
    syllabus: id.logic || id.name,
    bloomsLevels: ['Apply', 'Analyze'],
    estimatedDifficulty: 5,
    prerequisites: []
  }));

  // Mock historical data (simplified for calibration)
  const historicalData = [
    {
      year: year - 1,
      examContext: EXAM_CONTEXT,
      subject: SUBJECT,
      topicDistribution: identities.slice(0, 15).map(id => ({
        topicId: id.id,
        questionCount: 2,
        averageMarks: 1,
        difficultyBreakdown: { easy: 0.3, moderate: 0.5, hard: 0.2 }
      })),
      overallDifficulty: { easy: 0.3, moderate: 0.5, hard: 0.2 },
      totalMarks: 60
    }
  ];

  // Mock student profile
  const studentProfile = {
    userId: 'calibration_system',
    examContext: EXAM_CONTEXT,
    subject: SUBJECT,
    topicMastery: [],
    overallAccuracy: 75,
    studyStreak: 0
  };

  return {
    examConfig: {
      examContext: EXAM_CONTEXT,
      subject: SUBJECT,
      totalQuestions: TOTAL_QUESTIONS,
      durationMinutes: 80,
      marksPerQuestion: 1,
      passingPercentage: 50,
      difficultyProfile: {
        easy: 30,
        moderate: 50,
        hard: 20
      }
    },
    historicalData,
    studentProfile,
    topics,
    generationRules: {
      weights: {
        predictedExamPattern: 1.0,
        studentWeakAreas: 0.0,
        curriculumBalance: 0.0,
        recentTrends: 0.0
      },
      adaptiveDifficulty: {
        enabled: false,
        baselineAccuracy: 75,
        stepSize: 0.1
      },
      freshness: {
        avoidRecentQuestions: false,
        daysSinceLastAttempt: 0,
        maxRepetitionAllowed: 10
      },
      strategyMode: 'predictive_mock' as const,
      oracleMode: {
        enabled: true,
        idsTarget: state.parameters.idsBaseline,
        rigorVelocity: state.parameters.rigorDriftMultiplier,
        intentSignature: {
          synthesis: state.parameters.synthesisWeight,
          trapDensity: state.parameters.trapWeight,
          linguisticLoad: 0.5,
          speedRequirement: 0.7
        },
        directives: [
          'Focus on high-confidence identities',
          'Maintain calibrated difficulty distribution',
          'Apply forensic pattern matching'
        ],
        boardSignature: 'SYNTHESIZER' as const
      },
      difficultyMix: {
        easy: 30,
        moderate: 50,
        hard: 20
      }
    }
  };
}

/**
 * Map actual question to identity based on topic and audit results
 */
function mapQuestionToIdentity(
  questionText: string,
  topic: string,
  identityVector: Record<string, number>,
  questionIndex: number,
  identities: any[]
): string {
  // First: Try to find identity by exact topic match from the bank
  const matchingIdentities = identities.filter(
    (id) => id.topic.toLowerCase() === topic.toLowerCase()
  );

  if (matchingIdentities.length > 0) {
    // If multiple identities match the topic, prefer one that appeared in audit
    const auditedIdentity = matchingIdentities.find(id => identityVector[id.id] > 0);
    if (auditedIdentity) {
      return auditedIdentity.id;
    }

    // Otherwise return the first matching identity
    return matchingIdentities[0].id;
  }

  // Second: Try fuzzy topic matching
  const fuzzyMatch = identities.find(id =>
    id.topic.toLowerCase().includes(topic.toLowerCase()) ||
    topic.toLowerCase().includes(id.topic.toLowerCase())
  );

  if (fuzzyMatch) {
    return fuzzyMatch.id;
  }

  // Last resort: If identityVector has entries, pick one (weighted by count)
  const identityIds = Object.keys(identityVector);
  if (identityIds.length > 0) {
    // Pick based on question index for consistency
    return identityIds[questionIndex % identityIds.length];
  }

  return 'UNKNOWN';
}

/**
 * Build topic distribution from comparison results
 */
function buildTopicDistribution(details: QuestionComparisonResult[]): any {
  const topicCounts: Record<string, { count: number; trending: string }> = {};

  for (const detail of details) {
    const topic = detail.actual.topic || 'Unknown';

    if (!topicCounts[topic]) {
      topicCounts[topic] = { count: 0, trending: 'stable' };
    }

    topicCounts[topic].count++;
  }

  return topicCounts;
}

/**
 * Calculate overall system confidence
 */
function calculateSystemConfidence(yearResults: YearCalibrationResult[]): number {
  if (yearResults.length === 0) return 0;

  const lastYear = yearResults[yearResults.length - 1];

  return (
    lastYear.finalMatchRate * 0.4 +
    lastYear.identityHitRate * 0.3 +
    lastYear.topicAccuracy * 0.2 +
    lastYear.difficultyAccuracy * 0.1
  );
}

/**
 * Calculate prediction stability (variance across years)
 */
function calculateStability(yearResults: YearCalibrationResult[]): number {
  if (yearResults.length < 2) return 1.0;

  const matchRates = yearResults.map((y) => y.finalMatchRate);
  const mean = matchRates.reduce((sum, rate) => sum + rate, 0) / matchRates.length;
  const variance =
    matchRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) /
    matchRates.length;

  return 1.0 - Math.min(variance * 10, 1.0); // Scale to 0-1
}

// Run calibration
runIterativeCalibration().catch((error) => {
  console.error('\n❌ Calibration failed:', error);
  process.exit(1);
});
