/**
 * KCET Physics Iterative Calibration (2021-2025)
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
import { auditPaperHistoricalContext } from '../../../../lib/aiPaperAuditor';
import { generateTestQuestions, type AnalyzedQuestion } from '../../../../lib/aiQuestionGenerator';
import {
  compareQuestionsByPosition,
  comparePapersUsingIdentityVectors,
  computeComparisonSummary,
  type QuestionComparisonResult
} from '../../../../lib/oracle/questionComparator';
import {
  adjustParameters,
  createInitialCalibrationState,
  shouldStopCalibration,
  type CalibrationState
} from '../../../../lib/oracle/parameterAdjuster';
import {
  generateCalibrationReport,
  generateYearIterationLog,
  type YearCalibrationResult,
  type MultiYearCalibrationReport
} from '../../../../lib/oracle/calibrationReporter';

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
const SUBJECT = 'Physics';
const TOTAL_QUESTIONS = 60;

const OFFICIAL_SCANS: Record<number, string> = {
  2021: '6f0d3189-8b85-45bc-b66b-d7f51f886959',
  2022: '7110bd64-a715-4146-a1ba-c282d6b47420',
  2023: '9ca566d7-20d0-4ea2-abcd-a9b050ddb8bb',
  2024: 'a9447e71-2072-4ea7-af79-1bf4ec557825',
  2025: '15d3394d-798e-41d3-9f96-b3ad6e7d1444'
};

const MAX_ITERATIONS_PER_YEAR = 10;
const TARGET_MATCH_RATE = 0.80;

/**
 * Main orchestrator function
 */
async function runIterativeCalibration() {
  console.log('\n🔄 KCET PHYSICS ITERATIVE CALIBRATION (2021-2025) - REI v17');
  console.log('═══════════════════════════════════════════════════════════\n');

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

  // Phase 1.5: Analyze Question Types from Actual Papers (2021-2025)
  console.log('📊 Phase 1.5: Analyzing Question Type Patterns (2021-2025)\n');
  const questionTypeAnalysis = await analyzeQuestionTypesFromActualPapers();

  console.log(`   ✓ Analyzed ${questionTypeAnalysis.totalQuestions} questions`);
  console.log(`   ✓ Average Distribution:`);
  console.log(`     - Numerical Problems:   ${questionTypeAnalysis.averageDistribution.numerical_problem}%`);
  console.log(`     - Conceptual:           ${questionTypeAnalysis.averageDistribution.conceptual}%`);
  console.log(`     - Graph Analysis:       ${questionTypeAnalysis.averageDistribution.graph_analysis}%`);
  console.log(`     - Formula Application:  ${questionTypeAnalysis.averageDistribution.formula_application}%`);
  console.log(`     - Experimental:         ${questionTypeAnalysis.averageDistribution.experimental}%`);
  console.log(`     - Diagram-Based:        ${questionTypeAnalysis.averageDistribution.diagram_based}%\n`);

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
  const reportPath = path.join(outputDir, 'KCET_MATH_CALIBRATION_REPORT_2021_2025.md');
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

  // Phase 7: Update Database Tables for Flagship Generation
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Phase 7: Updating Database for Flagship Generation');
  console.log(`${'='.repeat(60)}\n`);

  await updateDatabaseTablesForFlagship(
    yearResults,
    currentState,
    baseline2021,
    identityBank.identities,
    questionTypeAnalysis
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
  console.log(`   - Iteration Logs: ${outputDir}/KCET_MATH_*_ITERATION_LOG.md`);
  console.log(`\n📊 Database Tables Updated:`);
  console.log(`   ✅ rei_evolution_configs (engine parameters)`);
  console.log(`   ✅ exam_historical_patterns (2021-2025 identity vectors)`);
  console.log(`\n🚀 System Ready for Flagship Generation!`);
  console.log(`   Run: npx tsx scripts/oracle/generate_flagship_oracle.ts Math\n`);
}

/**
 * Calculate difficulty distribution from actual questions
 */
function calculateDifficultyDistribution(questions: any[]): {
  easy: number;
  moderate: number;
  hard: number;
} {
  const easyCount = questions.filter(q => q.difficulty === 'Easy').length;
  const moderateCount = questions.filter(q => q.difficulty === 'Moderate').length;
  const hardCount = questions.filter(q => q.difficulty === 'Hard').length;
  const total = questions.length;

  return {
    easy: total > 0 ? Math.round((easyCount / total) * 100) : 33,
    moderate: total > 0 ? Math.round((moderateCount / total) * 100) : 42,
    hard: total > 0 ? Math.round((hardCount / total) * 100) : 25
  };
}

/**
 * Update Database Tables for Flagship Generation
 *
 * This function updates:
 * 1. rei_evolution_configs - with calibrated engine parameters
 * 2. exam_historical_patterns - with identity vectors for 2021-2025
 * 3. ai_universal_calibration - with question type distribution (REI v17)
 */
async function updateDatabaseTablesForFlagship(
  yearResults: YearCalibrationResult[],
  finalState: CalibrationState,
  baseline2021: any,
  identities: any[],
  questionTypeAnalysis?: {
    totalQuestions: number;
    averageDistribution: Record<string, number>;
    yearByYear: Array<{ year: number; distribution: Record<string, number> }>;
  }
) {
  console.log('📊 Updating rei_evolution_configs table...\n');

  // Update rei_evolution_configs with calibrated parameters
  const { error: configError } = await supabase
    .from('rei_evolution_configs')
    .upsert({
      exam_context: EXAM_CONTEXT,
      subject: SUBJECT,
      rigor_drift_multiplier: finalState.parameters.rigorDriftMultiplier,
      ids_baseline: finalState.parameters.idsBaseline,
      synthesis_weight: finalState.parameters.synthesisWeight,
      trap_density_weight: finalState.parameters.trapWeight,
      linguistic_load_weight: finalState.parameters.intentLearningRate,
      speed_requirement_weight: finalState.parameters.solveTensionMultiplier
    }, {
      onConflict: 'exam_context,subject'
    });

  if (configError) {
    console.error(`   ❌ Error updating rei_evolution_configs: ${configError.message}`);
  } else {
    console.log('   ✅ rei_evolution_configs updated successfully');
    console.log(`      - rigor_drift_multiplier: ${finalState.parameters.rigorDriftMultiplier.toFixed(4)}`);
    console.log(`      - ids_baseline: ${finalState.parameters.idsBaseline.toFixed(4)}`);
    console.log(`      - synthesis_weight: ${finalState.parameters.synthesisWeight.toFixed(4)}\n`);
  }

  console.log('📊 Updating exam_historical_patterns table...\n');

  // Calculate difficulty distribution for 2021 baseline
  console.log('   📊 Calculating difficulty distributions from actual papers...\n');

  const { data: baseline2021Questions } = await supabase
    .from('questions')
    .select('difficulty')
    .eq('scan_id', OFFICIAL_SCANS[2021]);

  const baseline2021Difficulty = calculateDifficultyDistribution(baseline2021Questions || []);
  console.log(`   2021 Difficulty: E=${baseline2021Difficulty.easy}%, M=${baseline2021Difficulty.moderate}%, H=${baseline2021Difficulty.hard}%`);

  // Prepare calibration data for all years
  const calibrationData = [
    {
      year: 2021,
      scanId: OFFICIAL_SCANS[2021],
      idsActual: baseline2021.idsActual,
      boardSignature: baseline2021.boardSignature || 'ANCHOR',
      evolutionNote: 'Baseline year - Standard syllabus-aligned blueprint with balanced difficulty distribution.',
      identityVector: baseline2021.identityVector,
      synthesis: 0.5,
      trapDensity: 0.5,
      speedRequirement: 0.7,
      difficultyEasy: baseline2021Difficulty.easy,
      difficultyModerate: baseline2021Difficulty.moderate,
      difficultyHard: baseline2021Difficulty.hard
    },
    ...yearResults.map((yr, idx) => {
      // Calculate difficulty from actual questions in comparison summary
      const actualQuestions = yr.comparisonSummary.details.map(d => d.actual);
      const difficulty = calculateDifficultyDistribution(actualQuestions);

      console.log(`   ${yr.year} Difficulty: E=${difficulty.easy}%, M=${difficulty.moderate}%, H=${difficulty.hard}%`);

      return {
        year: yr.year,
        scanId: OFFICIAL_SCANS[yr.year],
        idsActual: yr.idsActual || 0.75,
        boardSignature: yr.boardSignature || (yr.year === 2024 ? 'LOGICIAN' : 'SYNTHESIZER'),
        evolutionNote: yr.year === 2022
          ? 'Introduction of property-based shortcuts. Increased focus on Matrices and synthesis questions.'
          : yr.year === 2023
          ? 'Continued synthesis emphasis. Shift toward statement-based verification questions.'
          : yr.year === 2024
          ? 'Cross-chapter conceptual fusion. Increased logical reasoning and multi-step derivation.'
          : 'Peak synthesis complexity. Emphasis on Matrix properties and Probability logic with property-level fusion.',
        identityVector: yr.identityVector || {},
        synthesis: yr.year === 2021 ? 0.5 : (yr.year === 2024 ? 0.6 : 0.8),
        trapDensity: yr.year === 2021 ? 0.5 : 0.7,
        speedRequirement: yr.year === 2021 ? 0.7 : 0.9,
        difficultyEasy: difficulty.easy,
        difficultyModerate: difficulty.moderate,
        difficultyHard: difficulty.hard
      };
    })
  ];

  console.log('');

  // Update each year's record
  for (const data of calibrationData) {
    const { error } = await supabase
      .from('exam_historical_patterns')
      .upsert({
        exam_context: EXAM_CONTEXT,
        subject: SUBJECT,
        year: data.year,
        ids_actual: data.idsActual,
        board_signature: data.boardSignature,
        evolution_note: data.evolutionNote,
        difficulty_easy_pct: data.difficultyEasy,
        difficulty_moderate_pct: data.difficultyModerate,
        difficulty_hard_pct: data.difficultyHard,
        intent_signature: {
          synthesis: data.synthesis,
          trapDensity: data.trapDensity,
          linguisticLoad: 0.5,
          speedRequirement: data.speedRequirement,
          identityVector: data.identityVector
        },
        total_marks: 60
      }, {
        onConflict: 'exam_context,subject,year'
      });

    if (error) {
      console.log(`   ❌ Year ${data.year}: ${error.message}`);
    } else {
      console.log(`   ✅ Year ${data.year}: Updated (${Object.keys(data.identityVector).length} identities, IDS ${data.idsActual.toFixed(3)}, Diff: ${data.difficultyEasy}/${data.difficultyModerate}/${data.difficultyHard})`);
    }
  }

  // Update ai_universal_calibration with question type distribution (REI v17)
  if (questionTypeAnalysis) {
    console.log('\n📊 Updating ai_universal_calibration with question type distribution...\n');

    const lastYear = yearResults[yearResults.length - 1];
    const difficulty = calculateDifficultyDistribution(
      lastYear.comparisonSummary.details.map(d => d.actual)
    );

    const { error: calibError } = await supabase
      .from('ai_universal_calibration')
      .update({
        rigor_velocity: finalState.parameters.rigorDriftMultiplier,
        intent_signature: {
          synthesis: finalState.parameters.synthesisWeight,
          trapDensity: finalState.parameters.trapWeight,
          linguisticLoad: 0.25,
          speedRequirement: 1.12,
          idsTarget: finalState.parameters.idsBaseline,
          difficultyProfile: {
            easy: difficulty.easy,
            moderate: difficulty.moderate,
            hard: difficulty.hard
          },
          questionTypeProfile: {
            word_problem: questionTypeAnalysis.averageDistribution.word_problem,
            pattern_recognition: questionTypeAnalysis.averageDistribution.pattern_recognition,
            computational: questionTypeAnalysis.averageDistribution.computational,
            property_based: questionTypeAnalysis.averageDistribution.property_based,
            abstract: questionTypeAnalysis.averageDistribution.abstract
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('exam_type', EXAM_CONTEXT)
      .eq('subject', SUBJECT)
      .eq('target_year', 2026);

    if (calibError) {
      console.error(`   ❌ Error updating ai_universal_calibration: ${calibError.message}`);
    } else {
      console.log('   ✅ ai_universal_calibration updated with question type profile');
      console.log(`      - Word Problems:        ${questionTypeAnalysis.averageDistribution.word_problem}%`);
      console.log(`      - Pattern Recognition:  ${questionTypeAnalysis.averageDistribution.pattern_recognition}%`);
      console.log(`      - Computational:        ${questionTypeAnalysis.averageDistribution.computational}%`);
      console.log(`      - Property-Based:       ${questionTypeAnalysis.averageDistribution.property_based}%`);
      console.log(`      - Abstract:             ${questionTypeAnalysis.averageDistribution.abstract}%`);
    }
  }

  console.log('\n✅ Database tables updated successfully!');
  console.log('   Flagship generation will now use calibrated parameters.\n');
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
    comparisonSummary: finalSummary,
    identityVector: actualAudit.identityVector || {},
    boardSignature: actualAudit.boardSignature || 'SYNTHESIZER'
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

/**
 * Analyze question types from actual KCET papers (2021-2025)
 * REI v17: Integrated question type pattern analysis
 */
async function analyzeQuestionTypesFromActualPapers(): Promise<{
  totalQuestions: number;
  averageDistribution: Record<string, number>;
  yearByYear: Array<{ year: number; distribution: Record<string, number> }>;
}> {
  type QuestionType = 'numerical_problem' | 'conceptual' | 'graph_analysis' | 'formula_application' | 'experimental' | 'diagram_based';

  const categorizeQuestion = (text: string, topic: string): QuestionType => {
    if (!text) return 'conceptual';
    const t = text.toLowerCase();

    // Graph analysis indicators (highest priority - very characteristic)
    const graphKeywords = [
      'graph', 'plot', 'variation', 'curve', 'i-v', 'v-t', 'a-t', 'r-f',
      'versus', 'plotted', 'shown in figure', 'as shown', 'diagram shows'
    ];
    if (graphKeywords.some(kw => t.includes(kw))) {
      if (t.includes('calculate') || t.includes('find the value')) {
        return 'numerical_problem';
      }
      return 'graph_analysis';
    }

    // Experimental physics indicators
    const experimentKeywords = [
      'experiment', 'apparatus', 'galvanometer', 'metre bridge', 'potentiometer',
      'vernier', 'screw gauge', 'travelling microscope', 'determination of',
      'laboratory', 'observed', 'measured', 'reading'
    ];
    if (experimentKeywords.some(kw => t.includes(kw))) return 'experimental';

    // Numerical problem indicators (clear calculation)
    const numericalKeywords = [
      'calculate', 'find the value', 'what is the', 'determine the',
      'compute', 'if the value', 'ratio of', 'percentage'
    ];
    const hasNumbers = /\d+\s*(w|v|a|ohm|kg|m\/s|cm|mm|°c|k)/i.test(text);
    if (numericalKeywords.some(kw => t.includes(kw)) && hasNumbers) return 'numerical_problem';

    // Diagram-based (ray diagrams, circuit diagrams)
    const diagramKeywords = [
      'ray diagram', 'circuit diagram', 'in the figure', 'shown in diagram',
      'lens arrangement', 'mirror setup', 'figure shows'
    ];
    if (diagramKeywords.some(kw => t.includes(kw))) return 'diagram_based';

    // Formula application (direct plugging)
    const formulaKeywords = [
      'using the formula', 'apply', 'substituting', 'given by',
      'expression for', 'relation between'
    ];
    if (formulaKeywords.some(kw => t.includes(kw)) && hasNumbers) return 'formula_application';

    // Conceptual (laws, principles, directions)
    const conceptualKeywords = [
      'which of the following', 'statement', 'true', 'false', 'correct',
      'principle', 'law of', 'according to', 'direction of', 'property',
      'characteristic', 'reason', 'because', 'due to', 'produces'
    ];
    if (conceptualKeywords.some(kw => t.includes(kw))) return 'conceptual';

    return hasNumbers ? 'numerical_problem' : 'conceptual';
  };

  const allYearData: Array<{ year: number; distribution: Record<string, number> }> = [];
  let totalQuestions = 0;

  for (const [year, scanId] of Object.entries(OFFICIAL_SCANS)) {
    const { data: questions } = await supabase
      .from('questions')
      .select('text, topic')
      .eq('scan_id', scanId);

    if (!questions) continue;

    const dist: Record<QuestionType, number> = {
      numerical_problem: 0,
      conceptual: 0,
      graph_analysis: 0,
      formula_application: 0,
      experimental: 0,
      diagram_based: 0
    };

    questions.forEach(q => {
      if (q.text) {
        const type = categorizeQuestion(q.text, q.topic || '');
        dist[type]++;
      }
    });

    const total = questions.length;
    totalQuestions += total;

    const distPct: Record<string, number> = {
      numerical_problem: Math.round((dist.numerical_problem / total) * 100),
      conceptual: Math.round((dist.conceptual / total) * 100),
      graph_analysis: Math.round((dist.graph_analysis / total) * 100),
      formula_application: Math.round((dist.formula_application / total) * 100),
      experimental: Math.round((dist.experimental / total) * 100),
      diagram_based: Math.round((dist.diagram_based / total) * 100)
    };

    allYearData.push({ year: parseInt(year), distribution: distPct });
  }

  // Calculate average
  const avgDist: Record<string, number> = {
    numerical_problem: 0,
    conceptual: 0,
    graph_analysis: 0,
    formula_application: 0,
    experimental: 0,
    diagram_based: 0
  };

  allYearData.forEach(yr => {
    Object.keys(avgDist).forEach(key => {
      avgDist[key] += yr.distribution[key] || 0;
    });
  });

  Object.keys(avgDist).forEach(key => {
    avgDist[key] = Math.round(avgDist[key] / allYearData.length);
  });

  // Save to JSON for reference
  const analysisReport = {
    analysis_date: new Date().toISOString(),
    total_questions_analyzed: totalQuestions,
    average_distribution: avgDist,
    year_by_year: allYearData,
    recommendation_2026: {
      ...avgDist,
      notes: 'Use these percentages for 2026 flagship generation to match KCET patterns'
    }
  };

  const reportPath = path.join(process.cwd(), 'docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025.json');
  fs.writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));

  return {
    totalQuestions,
    averageDistribution: avgDist,
    yearByYear: allYearData
  };
}

// Run calibration
runIterativeCalibration().catch((error) => {
  console.error('\n❌ Calibration failed:', error);
  process.exit(1);
});
