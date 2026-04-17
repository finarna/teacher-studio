/**
 * Parameter Adjuster - Adaptive RWC (Recursive Weight Correction) Algorithm
 * Part of REI v16 Iterative Calibration System
 *
 * Adjusts calibration parameters based on comparison results:
 * - Identity confidences (per-identity feedback)
 * - Rigor drift multiplier (difficulty distribution)
 * - Synthesis/trap weights (intent signature)
 * - IDS baseline (overall difficulty)
 */

import type { QuestionComparisonResult } from './questionComparator';

export interface CalibrationParameters {
  // Identity Bank
  identityConfidences: Record<string, number>; // id -> confidence (0.35-0.99)

  // Engine Config
  rigorDriftMultiplier: number;    // 1.0-2.5
  idsBaseline: number;              // 0.5-1.0
  synthesisWeight: number;          // 0.1-0.5
  trapWeight: number;               // 0.1-0.5
  intentLearningRate: number;       // 0.1-0.5
  volatilityFactor: number;         // 1.0-1.5
  solveTensionMultiplier: number;   // 1.0-1.5
  projectionBuffer: number;         // 1.0-1.2
}

export interface CalibrationState {
  iteration: number;
  year: number;
  parameters: CalibrationParameters;
  matchRate: number;
  averageScore: number;
  identityHitRate: number;
  topicAccuracy: number;
  difficultyAccuracy: number;
  history: CalibrationIteration[];
}

export interface CalibrationIteration {
  iteration: number;
  matchRate: number;
  averageScore: number;
  parameterChanges: Record<string, any>;
  timestamp: string;
}

export interface IdentityMatchStats {
  appeared: boolean;      // Did this identity appear in actual paper?
  predicted: boolean;     // Did we predict it would appear?
  matched: boolean;       // Did prediction match reality?
  matchCount: number;     // How many questions matched this identity?
  predictedCount: number; // How many questions we generated with this identity?
  actualCount: number;    // How many actual questions had this identity?
}

export interface DifficultyStats {
  generatedEasy: number;
  generatedModerate: number;
  generatedHard: number;
  actualEasy: number;
  actualModerate: number;
  actualHard: number;
}

export interface IntentSignatureStats {
  synthesisGap: number;   // Difference in synthesis score
  trapDensityGap: number; // Difference in trap density
}

/**
 * Adjust calibration parameters based on comparison results
 * Uses adaptive gradient descent with domain constraints
 */
export function adjustParameters(
  currentState: CalibrationState,
  comparisonResults: QuestionComparisonResult[]
): CalibrationState {
  const matchRate = comparisonResults.filter(r => r.isMatch).length / comparisonResults.length;
  const targetRate = 0.80;
  const gap = targetRate - matchRate;

  console.log(`\n🔧 Parameter Adjustment (Iteration ${currentState.iteration + 1})`);
  console.log(`   Current Match Rate: ${(matchRate * 100).toFixed(1)}%`);
  console.log(`   Target: ${(targetRate * 100).toFixed(1)}%`);
  console.log(`   Gap: ${(gap * 100).toFixed(1)}%`);

  // Convergence check
  if (Math.abs(gap) < 0.02) {
    console.log(`   ✅ Converged within 2% of target`);
    return {
      ...currentState,
      matchRate,
      history: [...currentState.history, createIterationRecord(currentState, matchRate, {})]
    };
  }

  const newParams = { ...currentState.parameters };
  const parameterChanges: Record<string, any> = {};

  // 1. Adjust Identity Confidences (Per-identity feedback)
  const identityStats = computeIdentityMatchStats(comparisonResults);
  const identityChanges = adjustIdentityConfidences(newParams, identityStats);
  parameterChanges.identities = identityChanges;

  // 2. Adjust Rigor Drift (Difficulty distribution)
  const diffStats = computeDifficultyStats(comparisonResults);
  const rigorChange = adjustRigorDrift(newParams, diffStats);
  if (rigorChange !== 0) {
    parameterChanges.rigorDrift = rigorChange;
  }

  // 3. Adjust Synthesis/Trap Weights (Intent signature)
  const intentStats = computeIntentSignatureStats(comparisonResults);
  const intentChanges = adjustIntentWeights(newParams, intentStats);
  if (Object.keys(intentChanges).length > 0) {
    parameterChanges.intent = intentChanges;
  }

  // 4. Adjust IDS Baseline (Overall difficulty)
  const idsChange = adjustIdsBaseline(newParams, diffStats, gap);
  if (idsChange !== 0) {
    parameterChanges.idsBaseline = idsChange;
  }

  // Create iteration record
  const avgScore = comparisonResults.reduce((sum, r) => sum + r.overallScore, 0) / comparisonResults.length;

  const newIteration: CalibrationIteration = {
    iteration: currentState.iteration + 1,
    matchRate,
    averageScore: avgScore,
    parameterChanges,
    timestamp: new Date().toISOString()
  };

  return {
    ...currentState,
    iteration: currentState.iteration + 1,
    parameters: newParams,
    matchRate,
    averageScore: avgScore,
    history: [...currentState.history, newIteration]
  };
}

/**
 * Compute per-identity match statistics
 */
export function computeIdentityMatchStats(
  comparisonResults: QuestionComparisonResult[]
): Record<string, IdentityMatchStats> {
  const stats: Record<string, IdentityMatchStats> = {};

  for (const result of comparisonResults) {
    const genId = result.generated.identityId;
    const actId = result.actual.identityId;

    // Track generated identities
    if (genId && genId !== 'UNKNOWN') {
      if (!stats[genId]) {
        stats[genId] = {
          appeared: false,
          predicted: false,
          matched: false,
          matchCount: 0,
          predictedCount: 0,
          actualCount: 0
        };
      }
      stats[genId].predicted = true;
      stats[genId].predictedCount++;
    }

    // Track actual identities
    if (actId && actId !== 'UNKNOWN') {
      if (!stats[actId]) {
        stats[actId] = {
          appeared: false,
          predicted: false,
          matched: false,
          matchCount: 0,
          predictedCount: 0,
          actualCount: 0
        };
      }
      stats[actId].appeared = true;
      stats[actId].actualCount++;
    }

    // Track matches
    if (genId && actId && genId !== 'UNKNOWN' && actId !== 'UNKNOWN') {
      const normalizedGenId = normalizeIdentityId(genId);
      const normalizedActId = normalizeIdentityId(actId);

      if (normalizedGenId === normalizedActId) {
        if (!stats[actId]) {
          stats[actId] = {
            appeared: true,
            predicted: true,
            matched: true,
            matchCount: 1,
            predictedCount: 1,
            actualCount: 1
          };
        } else {
          stats[actId].matched = true;
          stats[actId].matchCount++;
        }
      }
    }
  }

  return stats;
}

/**
 * Adjust identity confidences based on match statistics
 */
function adjustIdentityConfidences(
  params: CalibrationParameters,
  stats: Record<string, IdentityMatchStats>
): Record<string, { old: number; new: number; change: number }> {
  const changes: Record<string, { old: number; new: number; change: number }> = {};
  let boostCount = 0;
  let decayCount = 0;

  for (const [identityId, stat] of Object.entries(stats)) {
    const currentConf = params.identityConfidences[identityId] || 0.5;
    let newConf = currentConf;
    let changeAmount = 0;

    if (stat.appeared && stat.matched) {
      // Correct prediction: boost confidence
      changeAmount = 0.08;
      newConf = Math.min(0.99, currentConf + changeAmount);
      boostCount++;
    } else if (stat.appeared && !stat.matched) {
      // Missed identity (false negative): significant boost
      changeAmount = 0.12;
      newConf = Math.min(0.99, currentConf + changeAmount);
      boostCount++;
    } else if (!stat.appeared && stat.predicted) {
      // False positive: reduce confidence
      changeAmount = -0.05;
      newConf = Math.max(0.35, currentConf + changeAmount);
      decayCount++;
    } else if (!stat.appeared && !stat.predicted) {
      // Correct non-prediction: small decay
      changeAmount = -0.02;
      newConf = Math.max(0.35, currentConf + changeAmount);
      decayCount++;
    }

    if (Math.abs(changeAmount) > 0.001) {
      params.identityConfidences[identityId] = newConf;
      changes[identityId] = {
        old: currentConf,
        new: newConf,
        change: changeAmount
      };
    }
  }

  console.log(`   📊 Identity Adjustments: ${boostCount} boosted, ${decayCount} reduced`);

  return changes;
}

/**
 * Compute difficulty distribution statistics
 */
export function computeDifficultyStats(
  comparisonResults: QuestionComparisonResult[]
): DifficultyStats {
  const stats: DifficultyStats = {
    generatedEasy: 0,
    generatedModerate: 0,
    generatedHard: 0,
    actualEasy: 0,
    actualModerate: 0,
    actualHard: 0
  };

  for (const result of comparisonResults) {
    // Count generated difficulties
    if (result.generated.difficulty === 'Easy') stats.generatedEasy++;
    else if (result.generated.difficulty === 'Moderate') stats.generatedModerate++;
    else if (result.generated.difficulty === 'Hard') stats.generatedHard++;

    // Count actual difficulties
    if (result.actual.difficulty === 'Easy') stats.actualEasy++;
    else if (result.actual.difficulty === 'Moderate') stats.actualModerate++;
    else if (result.actual.difficulty === 'Hard') stats.actualHard++;
  }

  return stats;
}

/**
 * Adjust rigor drift multiplier based on difficulty mismatch
 */
function adjustRigorDrift(
  params: CalibrationParameters,
  diffStats: DifficultyStats
): number {
  const total = diffStats.actualEasy + diffStats.actualModerate + diffStats.actualHard;
  if (total === 0) return 0;

  const actualHardPct = diffStats.actualHard / total;
  const generatedHardPct = diffStats.generatedHard / total;
  const hardGap = actualHardPct - generatedHardPct;

  if (Math.abs(hardGap) > 0.05) {
    const adjustment = hardGap * 0.10; // 10% of gap
    const oldValue = params.rigorDriftMultiplier;
    const newValue = clamp(oldValue + adjustment, 1.0, 2.5);

    params.rigorDriftMultiplier = newValue;

    console.log(`   ⚙️  Rigor Drift: ${oldValue.toFixed(3)} → ${newValue.toFixed(3)} (${adjustment > 0 ? '+' : ''}${adjustment.toFixed(3)})`);
    return adjustment;
  }

  return 0;
}

/**
 * Compute intent signature statistics (synthesis, trap density)
 */
export function computeIntentSignatureStats(
  comparisonResults: QuestionComparisonResult[]
): IntentSignatureStats {
  // Estimate synthesis and trap density from solution complexity
  let generatedSynthesis = 0;
  let actualSynthesis = 0;
  let count = 0;

  for (const result of comparisonResults) {
    const genSteps = result.generated.solutionSteps?.length || 0;
    const actSteps = result.actual.solutionSteps?.length || 0;

    if (genSteps > 0 || actSteps > 0) {
      generatedSynthesis += genSteps > 3 ? 0.8 : 0.4;
      actualSynthesis += actSteps > 3 ? 0.8 : 0.4;
      count++;
    }
  }

  const avgGenSynthesis = count > 0 ? generatedSynthesis / count : 0.5;
  const avgActSynthesis = count > 0 ? actualSynthesis / count : 0.5;

  return {
    synthesisGap: avgActSynthesis - avgGenSynthesis,
    trapDensityGap: 0 // Placeholder - would need more sophisticated analysis
  };
}

/**
 * Adjust synthesis and trap weights
 */
function adjustIntentWeights(
  params: CalibrationParameters,
  intentStats: IntentSignatureStats
): Record<string, number> {
  const changes: Record<string, number> = {};

  // Adjust synthesis weight
  if (Math.abs(intentStats.synthesisGap) > 0.05) {
    const adjustment = intentStats.synthesisGap * 0.10;
    const oldValue = params.synthesisWeight;
    const newValue = clamp(oldValue + adjustment, 0.10, 0.50);

    params.synthesisWeight = newValue;
    changes.synthesisWeight = newValue - oldValue;

    console.log(`   🧬 Synthesis Weight: ${oldValue.toFixed(3)} → ${newValue.toFixed(3)}`);
  }

  // Adjust trap weight (if we had trap density data)
  if (Math.abs(intentStats.trapDensityGap) > 0.05) {
    const adjustment = intentStats.trapDensityGap * 0.10;
    const oldValue = params.trapWeight;
    const newValue = clamp(oldValue + adjustment, 0.10, 0.50);

    params.trapWeight = newValue;
    changes.trapWeight = newValue - oldValue;

    console.log(`   🪤 Trap Weight: ${oldValue.toFixed(3)} → ${newValue.toFixed(3)}`);
  }

  return changes;
}

/**
 * Adjust IDS baseline based on overall difficulty and gap
 */
function adjustIdsBaseline(
  params: CalibrationParameters,
  diffStats: DifficultyStats,
  gap: number
): number {
  // If we're under-predicting (gap > 0), we need harder questions -> higher IDS
  // If we're over-predicting (gap < 0), we need easier questions -> lower IDS

  if (Math.abs(gap) > 0.10) {
    const adjustment = gap * 0.05; // 5% of gap
    const oldValue = params.idsBaseline;
    const newValue = clamp(oldValue + adjustment, 0.5, 1.0);

    params.idsBaseline = newValue;

    console.log(`   📈 IDS Baseline: ${oldValue.toFixed(3)} → ${newValue.toFixed(3)}`);
    return adjustment;
  }

  return 0;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeIdentityId(id: string): string {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createIterationRecord(
  state: CalibrationState,
  matchRate: number,
  changes: Record<string, any>
): CalibrationIteration {
  return {
    iteration: state.iteration + 1,
    matchRate,
    averageScore: state.averageScore,
    parameterChanges: changes,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create initial calibration state from identity bank and engine config
 */
export function createInitialCalibrationState(
  year: number,
  identities: any[],
  engineConfig: any
): CalibrationState {
  const identityConfidences: Record<string, number> = {};

  for (const identity of identities) {
    identityConfidences[identity.id] = identity.confidence || 0.5;
  }

  return {
    iteration: 0,
    year,
    parameters: {
      identityConfidences,
      rigorDriftMultiplier: engineConfig.rigor_drift_multiplier || 1.72,
      idsBaseline: engineConfig.ids_baseline || 0.85,
      synthesisWeight: engineConfig.synthesis_weight || 0.30,
      trapWeight: engineConfig.trap_weight || 0.30,
      intentLearningRate: engineConfig.intent_learning_rate || 0.25,
      volatilityFactor: engineConfig.volatility_factor || 1.15,
      solveTensionMultiplier: engineConfig.solve_tension_multiplier || 1.12,
      projectionBuffer: engineConfig.projection_buffer || 1.05
    },
    matchRate: 0,
    averageScore: 0,
    identityHitRate: 0,
    topicAccuracy: 0,
    difficultyAccuracy: 0,
    history: []
  };
}

/**
 * Check if calibration should stop (convergence or max iterations)
 */
export function shouldStopCalibration(
  state: CalibrationState,
  maxIterations: number = 10,
  targetRate: number = 0.80
): { stop: boolean; reason: string } {
  // Check if target achieved
  if (state.matchRate >= targetRate) {
    return { stop: true, reason: `Target achieved: ${(state.matchRate * 100).toFixed(1)}%` };
  }

  // Check if max iterations reached
  if (state.iteration >= maxIterations) {
    return { stop: true, reason: `Max iterations (${maxIterations}) reached` };
  }

  // Check for convergence (no improvement in last 2 iterations)
  if (state.history.length >= 2) {
    const lastTwo = state.history.slice(-2);
    const improvement = Math.abs(lastTwo[1].matchRate - lastTwo[0].matchRate);

    if (improvement < 0.02) {
      return { stop: true, reason: `Converged at ${(state.matchRate * 100).toFixed(1)}%` };
    }
  }

  return { stop: false, reason: '' };
}
