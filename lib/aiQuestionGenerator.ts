import { getGeminiClient, withGeminiRetry } from '../utils/geminiClient';
/**
 * GENERIC AI-Powered Question Generator
 *
 * World-class prediction engine that:
 * - Works for ANY exam (KCET, JEE, NEET, CBSE, future exams)
 * - Loads all patterns, topics, marks from DB/config
 * - Uses AI to analyze trends and predict
 * - NO hardcoded data - fully data-driven
 * - Adapts to student's learning profile
 */

import type { ExamContext, Subject, AnalyzedQuestion } from '../types';
import { AI_CONFIG } from '../config/aiConfigs';
import { cleanJsonResponse } from './aiParserUtils';

// ============================================
// INTERFACES - Generic and extensible
// ============================================

export interface ExamConfiguration {
  examContext: ExamContext;
  subject: Subject;
  totalQuestions: number;
  durationMinutes: number;
  marksPerQuestion: number | 'variable'; // Can be fixed or variable
  passingPercentage: number;
  negativeMarking?: {
    enabled: boolean;
    deduction: number; // -0.25, -1, etc.
  };
}

/**
 * Clean and fix common JSON errors from LLM responses
 * Especially handles unescaped backslashes in LaTeX and trailing commas
 */

// REI Shield is now imported from aiParserUtils

export interface TopicMetadata {
  topicId: string;
  topicName: string;
  syllabus: string; // Detailed syllabus content
  bloomsLevels: string[]; // Expected Bloom's taxonomy levels
  estimatedDifficulty: number; // 1-10 scale
  prerequisites: string[]; // Topic IDs that should be learned first
}

export interface HistoricalExamData {
  year: number;
  examContext: ExamContext;
  subject: Subject;
  topicDistribution: Array<{
    topicId: string;
    questionCount: number;
    averageMarks: number;
    difficultyBreakdown: { easy: number; moderate: number; hard: number };
  }>;
  overallDifficulty: { easy: number; moderate: number; hard: number };
  totalMarks: number;
  evolutionNote?: string;
}

export interface StudentProfile {
  userId: string;
  examContext: ExamContext;
  subject: Subject;
  topicMastery: Array<{
    topicId: string;
    accuracy: number; // 0-100
    attemptsCount: number;
    lastAttemptDate: string;
    averageTimeSpent: number; // seconds
  }>;
  overallAccuracy: number;
  studyStreak: number;
  targetExamDate?: string;
}

export interface GenerationContext {
  examConfig: ExamConfiguration;
  historicalData: HistoricalExamData[];
  studentProfile: StudentProfile;
  topics: TopicMetadata[];
  generationRules: GenerationRules;
}

export interface GenerationRules {
  // Weightage for different factors in question allocation
  weights: {
    predictedExamPattern: number; // 0-1 (e.g., 0.4 = 40%)
    studentWeakAreas: number;     // 0-1 (e.g., 0.3 = 30%)
    curriculumBalance: number;     // 0-1 (e.g., 0.2 = 20%)
    recentTrends: number;          // 0-1 (e.g., 0.1 = 10%)
  };

  // Difficulty adaptation rules
  adaptiveDifficulty: {
    enabled: boolean;
    baselineAccuracy: number; // If student accuracy > this, increase difficulty
    stepSize: number; // How much to adjust difficulty (0-1)
  };

  // Freshness rules
  freshness: {
    avoidRecentQuestions: boolean;
    daysSinceLastAttempt: number; // Avoid questions attempted in last N days
    maxRepetitionAllowed: number; // Max times same concept can appear
  };

  // Strategy Mode: Predictive (Exam-sim) vs Adaptive (Student-sim)
  strategyMode: 'predictive_mock' | 'adaptive_growth' | 'hybrid';

  // REI v3.0 "Machine Mode" (Oracle Prediction)
  oracleMode?: {
    enabled: boolean;
    idsTarget?: number; // Target Intelligence Discovery Score (e.g., 0.95)
    directives?: string[]; // Specific RWC corrections injected from the Auditor
    boardSignature?: 'SYNTHESIZER' | 'LOGICIAN' | 'INTIMIDATOR' | 'ANCHOR' | 'DEFAULT';
  };
}

// ============================================
// RIGOR PROTOCOLS - Exam-specific directives
// ============================================

const RIGOR_BASE_PROTOCOLS: Record<ExamContext, any> = {
  JEE: {
    title: 'REI v3.0 JEE PROTOCOL (SYNTHESIS-MAX)',
    signature: 'THE LOGICIAN',
    focus: 'Multi-concept fusion and analytical depth.',
    subjectLogic: {
      Math: 'MANDATORY: Integrate ≥2 distinct chapters (e.g., Vectors + Calculus). Solve requires nonlinear logical jumps.',
      Physics: 'MANDATORY: Fusion of Mechanics with Electromagnetism or Thermodynamics. Avoid direct formula application.',
      Chemistry: 'MANDATORY: Mechanistic depth in Organic and multi-step stoichiometry in Physical.',
      Biology: 'Focus on complex physiological systems and genetic cross-linkage.'
    }
  },
  NEET: {
    title: 'REI v3.0 NEET PROTOCOL (LETHAL-SPEED)',
    signature: 'THE INTIMIDATOR',
    focus: 'Linguistic noise, Statement-logic, and speed-accuracy balance.',
    subjectLogic: {
      Biology: 'MANDATORY: High frequency of A-R and Statement Pair questions. Hide false statements in technically complex Bio-clauses.',
      Physics: 'Focus on property traps and "Behavioral" physics. Use "Correct/Incorrect" pair identifications (at least 30%).',
      Chemistry: 'Focus on inorganic statement logic and NCERT-plus catalytic pathways.',
      Math: 'Not typical for NEET - use clear logical anchors.'
    }
  },
  KCET: {
    title: 'REI v3.0 CET PROTOCOL (HEURISTIC-FLUID)',
    signature: 'THE SYNTHESIZER',
    focus: 'Property-based speed-solving shortcuts and Heuristic Resonance.',
    subjectLogic: {
      Math: 'LOGICAL SEAMS: Matrix Inverse Shortcut Fusion, ITF-LPP Constraint Mapping, Integration-Area fusion (+12%).',
      Physics: 'LOGICAL SEAMS: Dimensional analysis shortcuts and limiting-case behavior. Avoid brute-force algebra.',
      Chemistry: 'LOGICAL SEAMS: Inorganic trend prediction and Physical chemistry "Zero-Step" numerical shortcuts.',
      Biology: 'LOGICAL SEAMS: Statement-level trickery and NCERT-Anchor evolution.'
    }
  },
  CBSE: {
    title: 'REI v3.0 BOARD PROTOCOL (STAGING-ANCHOR)',
    signature: 'THE ANCHOR',
    focus: 'Blueprint replication and step-wise credit stability.',
    subjectLogic: {
      Math: '85% locking to Textbook/PYQ blueprints. Focus on proper staging of steps.',
      Physics: 'Focus on derivation-centric anchors and standard numerical patterns.',
      Chemistry: 'Focus on direct valency, reaction mechanisms from NCERT, and standard physical formulas.',
      Biology: 'Direct diagram-based identifications and NCERT paragraph anchors.'
    }
  }
};

function getExamRigorDirective(context: ExamContext, subject: Subject): string {
  const protocol = RIGOR_BASE_PROTOCOLS[context] || RIGOR_BASE_PROTOCOLS['CBSE'];
  const subjectLogic = protocol.subjectLogic[subject] || 'Standard conceptual depth.';

  return `
${protocol.title}:
1. BOARD SIGNATURE: ${protocol.signature}. Focus on ${protocol.focus}
2. CORE LOGIC: ${subjectLogic}
3. TARGET: Deterministic 2026 performance calibration (IDS >0.85).
`;
}

export async function generateTestQuestions(
  context: GenerationContext,
  geminiApiKey: string,
  totalQuestionsOverride?: number,
  onBatchProgress?: (info: { batchIdx: number; totalBatches: number; batchQuestions: number; totalSoFar: number; topicNames: string[] }) => void,
  existingQuestions: AnalyzedQuestion[] = []
): Promise<AnalyzedQuestion[]> {

  // Apply override so user-selected count is respected
  if (totalQuestionsOverride && totalQuestionsOverride > 0) {
    context = {
      ...context,
      examConfig: { ...context.examConfig, totalQuestions: totalQuestionsOverride }
    };
  }

  console.log('🚀 Starting AI Question Generation...');
  console.log(`📋 Exam: ${context.examConfig.examContext} ${context.examConfig.subject}`);
  console.log(`👤 Student: ${context.studentProfile.userId} (${context.studentProfile.overallAccuracy}% accuracy)`);
  console.log(`📦 Question count: ${context.examConfig.totalQuestions}`);

  // Step 1: Analyze past patterns and predict next year
  const prediction = await predictNextYearPattern(context, geminiApiKey);
  console.log(`🔮 Predicted ${prediction.topics.length} topic distributions for next exam`);

  // Step 2: Calculate optimal topic allocation
  const allocation = calculateTopicAllocation(context, prediction);
  console.log(`📊 Allocated ${allocation.length} topics across ${context.examConfig.totalQuestions} questions`);

  // Step 3: Generate questions using Smart Batching (Reduces latency for multiple topics)
  const generationStartTime = Date.now();
  const activeAllocations = allocation.filter(topicAlloc => topicAlloc.questionCount > 0);

  // OPTIMIZATION: Combine multiple topics into fewer LLM calls.
  // Each LLM trip has ~15-20s overhead; batching topics cuts this by 80%+.
  // Each LLM trip has ~15-20s overhead; smaller batches are more robust for complex Math.
  const MAX_QUESTIONS_PER_BATCH = 5;
  const batches: (typeof activeAllocations)[] = [];
  let currentBatch: typeof activeAllocations = [];
  let questionsInBatch = 0;

  for (const alloc of activeAllocations) {
    let remaining = alloc.questionCount;

    // If a single topic or group of topics is too large, split it into sub-batches
    while (remaining > 0) {
      const availableInBatch = MAX_QUESTIONS_PER_BATCH - questionsInBatch;

      if (availableInBatch <= 0) {
        // Current batch is full, start a new one
        batches.push(currentBatch);
        currentBatch = [];
        questionsInBatch = 0;
        continue;
      }

      const countToTake = Math.min(remaining, availableInBatch);

      currentBatch.push({
        ...alloc,
        questionCount: countToTake
      });

      questionsInBatch += countToTake;
      remaining -= countToTake;

      if (questionsInBatch >= MAX_QUESTIONS_PER_BATCH) {
        batches.push(currentBatch);
        currentBatch = [];
        questionsInBatch = 0;
      }
    }
  }
  if (currentBatch.length > 0) batches.push(currentBatch);

  // Run batches in parallel groups of PARALLEL_BATCH_SIZE.
  // Each batch within a group fires concurrently; groups are separated by GROUP_DELAY_MS
  // to avoid bursting the API RPM limit (gemini-3-flash-preview: 20 RPM free tier).
  // 3 parallel × 4 groups × ~2s delay ≈ 25–30s vs 60–70s sequential.
  const PARALLEL_BATCH_SIZE = 3;
  const GROUP_DELAY_MS = 2000;

  console.log(`⚡ Optimized into ${batches.length} batches → ${Math.ceil(batches.length / PARALLEL_BATCH_SIZE)} parallel groups of ${PARALLEL_BATCH_SIZE} (Batch size limit: ${MAX_QUESTIONS_PER_BATCH})`);

  const allBatchResults: AnalyzedQuestion[][] = new Array(batches.length);

  // Pre-compute NEET section boundaries (based on cumulative question index)
  const neetSectionACutoff = (() => {
    if (context.examConfig.examContext !== 'NEET') return Infinity;
    const totalQ = context.examConfig.totalQuestions;
    return totalQ >= 50 ? 35 : Math.round(totalQ * 35 / 50);
  })();

  // Compute cumulative start index per batch (needed for NEET section assignment)
  const batchStartIndex: number[] = [];
  let cumulativeIndex = 0;
  for (const batch of batches) {
    batchStartIndex.push(cumulativeIndex);
    cumulativeIndex += batch.reduce((sum, b) => sum + b.questionCount, 0);
  }

  for (let groupStart = 0; groupStart < batches.length; groupStart += PARALLEL_BATCH_SIZE) {
    const groupEnd = Math.min(groupStart + PARALLEL_BATCH_SIZE, batches.length);
    const groupIndices = Array.from({ length: groupEnd - groupStart }, (_, i) => groupStart + i);

    console.log(`🚀 Group ${Math.floor(groupStart / PARALLEL_BATCH_SIZE) + 1}/${Math.ceil(batches.length / PARALLEL_BATCH_SIZE)}: firing batches [${groupIndices.map(i => i + 1).join(', ')}] in parallel...`);

    await Promise.all(groupIndices.map(async (idx) => {
      const batch = batches[idx];
      const totalInBatchCount = batch.reduce((sum, b) => sum + b.questionCount, 0);
      const batchSection = batchStartIndex[idx] >= neetSectionACutoff ? 'Section B' : 'Section A';

      console.log(`🎯 Batch ${idx + 1}/${batches.length}: ${totalInBatchCount}Q [${batchSection}] — ${batch.map(b => b.topicName).join(', ')}`);

      const result = await generateTopicQuestionsBatch({
        batchAllocations: batch.map(b => ({ ...b, section: batchSection })),
        examConfig: context.examConfig,
        generationRules: context.generationRules,
        section: batchSection
      }, geminiApiKey);

      allBatchResults[idx] = result;
    }));

    // Report progress after each group completes
    const completedSoFar = allBatchResults.slice(0, groupEnd).flat().length;
    if (onBatchProgress) {
      const lastBatch = batches[groupEnd - 1];
      onBatchProgress({
        batchIdx: groupEnd,
        totalBatches: batches.length,
        batchQuestions: allBatchResults[groupEnd - 1]?.length ?? 0,
        totalSoFar: completedSoFar,
        topicNames: lastBatch.map(b => b.topicName)
      });
    }

    // Delay between groups to stay within API RPM limits
    if (groupEnd < batches.length) {
      await new Promise(resolve => setTimeout(resolve, GROUP_DELAY_MS));
    }
  }

  const allQuestions = allBatchResults.flat();

  const totalGenTime = ((Date.now() - generationStartTime) / 1000).toFixed(1);
  console.log(`⚡ Smart Batching completed in ${totalGenTime}s (${batches.length} batches, ${allQuestions.length} questions)`);

  // Step 4: Final validation
  const validatedQuestions = validateQuestions(allQuestions, context, existingQuestions);
  const targetCount = context.examConfig.totalQuestions;

  // Step 5: Top-up — regenerate exactly the rejected count (max 1 retry)
  if (validatedQuestions.length < targetCount && activeAllocations.length > 0) {
    const deficit = targetCount - validatedQuestions.length;
    console.log(`🔄 Top-up needed: ${validatedQuestions.length}/${targetCount} passed validation. Regenerating ${deficit} missing question(s)...`);

    // Distribute deficit proportionally across allocations (capped at MAX_QUESTIONS_PER_BATCH per slot)
    let remaining = deficit;
    const topupBatch: typeof activeAllocations = [];
    for (const alloc of activeAllocations) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, MAX_QUESTIONS_PER_BATCH);
      topupBatch.push({ ...alloc, questionCount: take });
      remaining -= take;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const topupResult = await generateTopicQuestionsBatch({
        batchAllocations: topupBatch.map(b => ({ ...b, section: 'Section A' })),
        examConfig: context.examConfig,
        generationRules: context.generationRules,
        section: 'Section A'
      }, geminiApiKey);

      const topupValidated = validateQuestions(topupResult, context, validatedQuestions);
      console.log(`🔄 Top-up result: ${topupValidated.length}/${deficit} question(s) recovered`);
      validatedQuestions.push(...topupValidated);
    } catch (topupErr) {
      console.warn(`⚠️  Top-up batch failed: ${(topupErr as Error).message}`);
    }
  }

  const shuffled = shuffleArray(validatedQuestions);
  console.log(`✅ Final question count: ${shuffled.length}/${targetCount}`);

  return shuffled;
}

// ============================================
// PATTERN PREDICTION ENGINE
// ============================================

interface PredictedPattern {
  year: number;
  topics: Array<{
    topicId: string;
    topicName: string;
    probability: number; // 0-1
    expectedQuestionCount: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    confidence: number; // 0-1
    reasoning: string;
    evolutionNote?: string; // Captured from AI analysis
  }>;
  difficultyDistribution: { easy: number; moderate: number; hard: number };
  overallConfidence: number;
}

async function predictNextYearPattern(
  context: GenerationContext,
  geminiApiKey: string
): Promise<PredictedPattern> {

  const { examConfig, historicalData, topics } = context;

  // Prepare data summary for AI
  const historicalSummary = historicalData.map(year => ({
    year: year.year,
    topics: year.topicDistribution.map(t => {
      const topic = topics.find(tm => tm.topicId === t.topicId);
      return {
        topic: topic?.topicName || t.topicId,
        questions: t.questionCount,
        marks: t.averageMarks,
        difficulty: t.difficultyBreakdown
      };
    }),
    overallDifficulty: year.overallDifficulty
  }));

  const topicsSummary = topics.map(t => ({
    topicId: t.topicId,  // CRITICAL: Include topic ID so AI uses correct IDs
    name: t.topicName,
    syllabus: t.syllabus,
    difficulty: t.estimatedDifficulty
  }));

  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const prompt = `You are an expert exam pattern analyst for ${examConfig.examContext} ${examConfig.subject}.

HISTORICAL DATA (${historicalData.length} years):
${JSON.stringify(historicalSummary, null, 2)}

AVAILABLE TOPICS:
${JSON.stringify(topicsSummary, null, 2)}

TARGET: Predict the distribution for a ${examConfig.totalQuestions}-question ${examConfig.examContext} ${examConfig.subject} paper for ${nextYear}.
CRITICAL: The sum of ALL expectedQuestionCount values MUST equal exactly ${examConfig.totalQuestions}.

Analyze the historical pattern and perform a "Recursive Concept Evolution" analysis:
1. Identifying Concepts that are CORE (appear every year).
2. Identifying Concepts that are SHIFTING (e.g., were easy 3 years ago, now asked with 2-step complexity).
3. Predict the "Next Logical Twist": If last year asked for A, and the year before for B, what is the unseen 'C' for ${nextYear}?
4. Expected difficulty distribution and statistical probability for each topic.

CRITICAL: Use the EXACT topicId from the AVAILABLE TOPICS list above.

Return ONLY valid JSON:
{
  "topics": [
    {
      "topicId": "calculus",
      "topicName": "Calculus",
      "probability": 0.85,
      "expectedQuestionCount": 12,
      "trend": "increasing",
      "evolutionNote": "AI Insight: Expect integration with Thermodynamics this year, following the recent trend of multi-concept physics questions.",
      "confidence": 0.8,
      "reasoning": "..."
    }
  ],
  "difficultyDistribution": { "easy": 40, "moderate": 45, "hard": 15 },
  "overallConfidence": 0.75
}`;

  try {
    const ai = getGeminiClient(geminiApiKey);

    const result = await withGeminiRetry(() => ai.models.generateContent({
      model: AI_CONFIG.defaultModel,
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      config: {
        temperature: 0.2,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json'
      }
    }));
    
    const text = result.text || '{}';

    const jsonStr = cleanJsonResponse(text);
    const prediction = JSON.parse(jsonStr);

    if (!prediction || (!prediction.topics && !Array.isArray(prediction))) {
      throw new Error('AI response missing topics');
    }

    // Handle if AI returns array instead of object
    const rawTopics: any[] = Array.isArray(prediction) ? prediction : (prediction.topics || []);

    // Normalize expectedQuestionCount so they sum to examConfig.totalQuestions.
    // The AI predicts based on historical patterns (e.g. old KCET 60Q papers) and its
    // raw counts may sum to the wrong total (e.g. 27 instead of 50 for NEET).
    // Without normalization, the allocation engine scales up by 1.85× causing some topics
    // to jump to 7–8 questions instead of proportionally distributing the full 50.
    const rawTotal = rawTopics.reduce((sum, t) => sum + (t.expectedQuestionCount || 0), 0);
    const topicsArr = rawTotal > 0
      ? rawTopics.map(t => ({
          ...t,
          expectedQuestionCount: (t.expectedQuestionCount / rawTotal) * examConfig.totalQuestions
        }))
      : rawTopics;

    console.log(`📐 Prediction normalized: raw total=${rawTotal} → scaled to ${examConfig.totalQuestions} (factor ${rawTotal > 0 ? (examConfig.totalQuestions / rawTotal).toFixed(2) : 'N/A'})`);

    return {
      year: nextYear,
      topics: topicsArr,
      difficultyDistribution: prediction.difficultyDistribution || { easy: 30, moderate: 50, hard: 20 },
      overallConfidence: prediction.overallConfidence || 0.5
    };

  } catch (error) {
    console.warn('⚠️ AI prediction phase failed, using statistical fallback:', (error as any).message);
    return generateStatisticalPrediction(context, nextYear);
  }
}

// ============================================
// TOPIC ALLOCATION ENGINE
// ============================================

interface TopicAllocation {
  topicId: string;
  topicName: string;
  topicMetadata: TopicMetadata;
  questionCount: number;
  difficultyDistribution: { easy: number; moderate: number; hard: number };
  studentMastery: number;
  allocationReason: string;
  evolutionNote?: string; // Captured from AI pattern analysis
}

function calculateTopicAllocation(
  context: GenerationContext,
  prediction: PredictedPattern
): TopicAllocation[] {

  const { examConfig, studentProfile, topics, generationRules } = context;
  const weights = generationRules.weights;

  let allocations: TopicAllocation[] = [];

  console.log(`\n📊 Calculating allocation for ${prediction.topics.length} predicted topics...`);

  for (const predictedTopic of prediction.topics) {
    const topicMetadata = topics.find(t => t.topicId === predictedTopic.topicId);
    if (!topicMetadata) {
      console.log(`⚠️  Skipping ${predictedTopic.topicId} - no metadata found`);
      continue;
    }

    const studentMasteryData = studentProfile.topicMastery.find(m => m.topicId === predictedTopic.topicId);
    const studentMastery = studentMasteryData?.accuracy || 50;

    const isOracle = generationRules.oracleMode?.enabled || false;
    const mode = generationRules.strategyMode || 'hybrid';
    let allocationScore = 0;
    let reasons: string[] = [];

    if (isOracle || mode === 'predictive_mock') {
      // MODE 1: PREDICTIVE/ORACLE (Simulate the real exam 1:1)
      // Normalize expected count against THIS exam's total questions (not hardcoded 60).
      // KCET=60, NEET=50, JEE=30 — each gets the right proportional weight.
      allocationScore = predictedTopic.expectedQuestionCount / examConfig.totalQuestions;
      reasons.push(isOracle ? `🔮 Oracle Mode: IDS 1.0 Deterministic Calibration` : `🦅 Predictive Mode: Forced Exam Weightage`);
    } else if (mode === 'adaptive_growth') {
      // MODE 2: ADAPTIVE GROWTH (Surgical fix for student weaknesses)
      const inverseMastery = (100 - studentMastery) / 100;
      allocationScore = (inverseMastery * 0.7) + (predictedTopic.probability * 0.3);
      reasons.push(`🎯 Adaptive Mode: Vulnerability Focus (${studentMastery}% accuracy)`);
    } else {
      // MODE 3: HYBRID (Default balanced approach)
      allocationScore += (predictedTopic.probability * weights.predictedExamPattern);
      if (studentMastery < 60) {
        allocationScore += ((100 - studentMastery) / 100 * weights.studentWeakAreas);
        reasons.push(`⚖️ Hybrid: Weakness Balance`);
      } else {
        allocationScore += 0.3 * weights.studentWeakAreas;
      }
      allocationScore += (weights.curriculumBalance * 0.5);
    }

    // Calculate question count (initial estimate)
    const questionCount = Math.max(0, Math.round(allocationScore * examConfig.totalQuestions));

    console.log(`   ${predictedTopic.topicName}: score=${allocationScore.toFixed(2)} → ${questionCount} questions`);

    // Determine difficulty distribution 
    let difficultyDist: { easy: number; moderate: number; hard: number };

    // MACHINE MODE / PREDICTIVE CALIBRATION: Respect the Exam Blueprint 1:1
    if (isOracle || mode === 'predictive_mock') {
      const blueprint = (examConfig as any).difficultyProfile || { easy: 30, moderate: 50, hard: 20 };
      difficultyDist = { ...blueprint };
      console.log(`      Locked to Exam Blueprint: E:${difficultyDist.easy} M:${difficultyDist.moderate} H:${difficultyDist.hard}`);
    } else {
      // ADAPTIVE CALIBRATION: Adjust based on student mastery
      if (studentMastery < 40) {
        difficultyDist = { easy: 60, moderate: 30, hard: 10 };
      } else if (studentMastery < 70) {
        difficultyDist = { easy: 35, moderate: 45, hard: 20 };
      } else {
        difficultyDist = { easy: 20, moderate: 40, hard: 40 };
      }
    }

    allocations.push({
      topicId: predictedTopic.topicId,
      topicName: predictedTopic.topicName,
      topicMetadata,
      questionCount,
      difficultyDistribution: difficultyDist,
      studentMastery,
      allocationReason: reasons.join(', '),
      evolutionNote: predictedTopic.evolutionNote
    });
  }

  // Normalize to exactly match total questions
  const totalAllocated = allocations.reduce((sum, a) => sum + a.questionCount, 0);

  if (totalAllocated !== examConfig.totalQuestions) {
    // Scale proportionally
    // If totalAllocated is 0, we can't scale. Fallback to even distribution.
    if (totalAllocated === 0) {
      console.warn('⚠️  totalAllocated is 0. Falling back to even distribution.');
      if (allocations.length === 0) {
        console.error('❌ No topics available for allocation!');
        return [];
      }
      const evenCount = Math.floor(examConfig.totalQuestions / allocations.length);
      for (let a of allocations) {
        a.questionCount = evenCount;
      }
      // Fill remainder
      const remainder = examConfig.totalQuestions - (evenCount * allocations.length);
      for (let i = 0; i < remainder; i++) {
        allocations[i].questionCount++;
      }
      return allocations;
    }

    const scale = examConfig.totalQuestions / totalAllocated;
    const scaled = allocations.map(a => ({
      ...a,
      exactCount: a.questionCount * scale,
      questionCount: Math.floor(a.questionCount * scale)
    }));

    // Calculate remainder after flooring
    let assigned = scaled.reduce((sum, a) => sum + a.questionCount, 0);
    const remainder = examConfig.totalQuestions - assigned;

    // Distribute remainder using Largest Remainder Method:
    // give +1 to topics with the highest fractional parts until the gap is filled.
    const sortedByFraction = scaled
      .map((a, idx) => ({ ...a, originalIdx: idx, fractional: a.exactCount - a.questionCount }))
      .sort((a, b) => b.fractional - a.fractional);

    for (let i = 0; i < remainder; i++) {
      sortedByFraction[i].questionCount++;
    }

    // Rebuild allocations in original topic order (important for deterministic batching).
    // Use sortedByFraction (which has floor + remainder bumps) — NOT scaled (floor only).
    allocations = sortedByFraction
      .sort((a, b) => a.originalIdx - b.originalIdx)
      .map(s => ({
        topicId: s.topicId,
        topicName: s.topicName,
        topicMetadata: s.topicMetadata,
        questionCount: s.questionCount,
        difficultyDistribution: s.difficultyDistribution,
        studentMastery: s.studentMastery,
        allocationReason: s.allocationReason,
        evolutionNote: s.evolutionNote
      }));
  }

  // Final verification
  const finalTotal = allocations.reduce((sum, a) => sum + a.questionCount, 0);
  console.log(`✅ Final allocation: ${finalTotal}/${examConfig.totalQuestions} questions`);

  if (finalTotal !== examConfig.totalQuestions) {
    console.error(`❌ ALLOCATION ERROR: Generated ${finalTotal} but needed ${examConfig.totalQuestions}`);
    // Force correction: add remaining questions to first topic
    const diff = examConfig.totalQuestions - finalTotal;
    if (allocations.length > 0) {
      allocations[0].questionCount += diff;
      console.log(`🔧 Fixed: Added ${diff} questions to ${allocations[0].topicName}`);
    }
  }

  return allocations.filter(a => a.questionCount > 0);
}

// ============================================
// QUESTION GENERATION ENGINE
// ============================================

/**
 * GENERATE QUESTIONS IN BATCHES (Multiple topics in one prompt)
 * This is the high-performance replacement for per-topic generation.
 */
async function generateTopicQuestionsBatch(
  params: {
    batchAllocations: Array<{
      topicMetadata: TopicMetadata;
      questionCount: number;
      difficultyDistribution: { easy: number; moderate: number; hard: number };
      studentMastery: number;
      evolutionNote?: string;
      section?: string;
    }>;
    examConfig: ExamConfiguration;
    generationRules: GenerationRules;
    section?: string; // Global section for this batch
  },
  geminiApiKey: string
): Promise<AnalyzedQuestion[]> {

  const { batchAllocations, examConfig, params: fullParams } = params as any;
  const totalInBatch = batchAllocations.reduce((sum: number, a: any) => sum + a.questionCount, 0);
  const targetSection = params.section || batchAllocations[0]?.section || 'Section A';
  const topicsText = batchAllocations.map(a => `- ${a.topicMetadata.topicName} (${a.questionCount} questions)\n  Targets: ${a.difficultyDistribution.easy}% Easy, ${a.difficultyDistribution.moderate}% Mod, ${a.difficultyDistribution.hard}% Hard${a.evolutionNote ? `\n  Evolution Insight: ${a.evolutionNote}` : ''}`).join('\n');
  const syllabusText = batchAllocations.map(a => `[TOPIC: ${a.topicMetadata.topicName}] SYLLABUS: ${a.topicMetadata.syllabus}`).join('\n\n');

  const rigorDirective = getExamRigorDirective(examConfig.examContext as ExamContext, examConfig.subject as Subject);

  // REI v3.0 MACHINE MODE OVERRIDE
  const isOracle = params.generationRules.oracleMode?.enabled;
  const oracleDirectives = params.generationRules.oracleMode?.directives || [];
  const boardSignature = params.generationRules.oracleMode?.boardSignature || 'DEFAULT';

  const missionText = isOracle
    ? `MISSION: DETERMINISTIC EXAM ORACLE (IDS Target: ${params.generationRules.oracleMode?.idsTarget || 0.95})
Applying Board Signature: ${boardSignature}
Recursive Directives:
${oracleDirectives.map(d => `- ${d}`).join('\n')}`
    : `MISSION: PRE-EMPTIVE COMPETITIVE FORECAST`;

  const oracleMandate = isOracle ? `
ORACLE MANDATE (IDS 1.0 TARGET):
- BAN all "Standard Property" questions (e.g., direct Adjoint properties).
- MANDATORY: Every question must be a "Deterministic Forecast."
- Engineering: Create a "Logical Seam" where two distinct concepts must be merged to solve the trap.
- Distractors: One distractor MUST target a high-level cognitive bias found in the 2025 Audit.
- Logic: Explain in 'masteryMaterial.logic' why this is an Oracle-level prediction.` : '';

  const prompt = `You are a World-Class Entrance Exam Question Architect for ${examConfig.examContext} ${examConfig.subject}.

${rigorDirective}

${missionText}

${oracleMandate}

Generate a total of ${totalInBatch} ULTIMATE-RIGOR MCQ questions.

TOPICS & DISTRIBUTION:
${topicsText}

SECTION TARGET: ${targetSection} (MANDATORY: Assign this to every question)

CONTEXT:
${syllabusText}

QUALITY MANDATE:
1. ZERO "Definition" questions. Use Scenario-based applications.
2. Focus on "The Prediction Gap": Create questions that pre-empt trends for ${new Date().getFullYear() + 1}.
3. MANDATORY SOLUTIONS: Every question MUST have "solutionSteps" (min 2 steps), "studyTip", and "commonMistakes".
4. UNIQUENESS & VARIETY: Every question in this batch MUST be distinct. Do NOT repeat the same concept, scenario, or calculation pattern. Vary the numerical values and the cognitive angle (e.g., if one is about 'Maximum Height', the next should be about 'Range' or 'Time of Flight' instead of another 'Maximum Height' with different numbers).
5. LATEX: Use PROPER LaTeX ($...$ inline, $$...$$ display). IMPORTANT: You MUST use DOUBLE BACKSLASHES (e.g., \\\\sum, \\\\sqrt) for all LaTeX commands. THIS IS THE ONLY WAY TO ENSURE VALID JSON. WE WILL REJECT ANY SINGLE BACKSLASHES.
6. NO direct Theory questions. Focus on speed-tricks and analytical synthesis.

Return ONLY a valid JSON array:
[
  {
    "text": "Question text with $proper \\\\LaTeX$...",
    "options": ["...", "...", "...", "..."],
    "correctOptionIndex": 0,
    "marks": ${examConfig.marksPerQuestion === 'variable' ? '1' : examConfig.marksPerQuestion},
    "difficulty": "Easy|Moderate|Hard",
    "topic": "Must match one of the topic names above",
    "blooms": "Understand|Apply|Analyze|Evaluate",
    "solutionSteps": ["Title ::: Detailed reasoning with $math$"],
    "aiReasoning": "Technical mindset/trap explanation",
    "historicalPattern": "Exam frequency context (e.g. KCET 2021 style)",
    "predictiveInsight": "Variation likely to see in future",
    "whyItMatters": "Engineering/Medical application",
    "studyTip": "Mastery shortcut or visualization ritual",
    "commonMistakes": [{"mistake": "...", "why": "...", "howToAvoid": "..."}],
    "keyFormulas": ["$formula$"],
    "keyConcepts": [{"name": "...", "explanation": "..."}],
    "section": "${targetSection}"
  }
]`;

  try {
    const ai = getGeminiClient(geminiApiKey);

    const MAX_BATCH_RETRIES = 3;
    let attempt = 0;

    while (attempt <= MAX_BATCH_RETRIES) {
      let text = '';
      try {
        const result = await withGeminiRetry(() => ai.models.generateContent({
          model: AI_CONFIG.defaultModel,
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }],
          config: {
            temperature: isOracle ? 0.3 : 0.7,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 12000,
            responseMimeType: 'application/json'
          }
        }));
        text = result.text || '[]';

        // responseMimeType: 'application/json' guarantees valid JSON from Gemini.
        // cleanJsonResponse doubles backslashes on already-valid JSON, breaking LaTeX.
        const questions = JSON.parse(text);

        const { randomUUID } = await import('crypto');
        return questions.map((q: any) => ({
          id: randomUUID(),
          text: q.text,
          options: q.options || [],
          marks: q.marks || examConfig.marksPerQuestion,
          difficulty: q.difficulty,
          topic: q.topic,
          blooms: q.blooms || 'Apply',
          solutionSteps: q.solutionSteps || q.solution_steps || [],
          examTip: q.studyTip || q.examTip || q.exam_tip || '',
          studyTip: q.studyTip || q.study_tip || '',
          keyFormulas: q.keyFormulas || q.key_formulas || [],
          commonMistakes: q.commonMistakes || q.common_mistakes || [],
          pitfalls: (q.commonMistakes || q.pitfalls || []).map((m: any) => typeof m === 'object' ? m.mistake : m),
          aiReasoning: q.aiReasoning || q.ai_reasoning || '',
          historicalPattern: q.historicalPattern || q.historical_pattern || '',
          predictiveInsight: q.predictiveInsight || q.predictive_insight || '',
          whyItMatters: q.whyItMatters || q.why_it_matters || '',
          keyConcepts: q.keyConcepts || q.key_concepts || [],
          masteryMaterial: q.masteryMaterial || q.mastery_material || q,
          correctOptionIndex: q.correctOptionIndex ?? q.correct_option_index ?? 0,
          section: q.section || targetSection,
          source: `AI-Generated (Smart-Batch ${examConfig.examContext})`
        }));
      } catch (parseError) {
        attempt++;
        console.warn(`⚠️ Batch ${boardSignature} parse fail (attempt ${attempt}):`, (parseError as any).message);

        // Log failed JSON for debugging
        try {
          const fs = await import('fs');
          const logContent = `\n--- ATTEMPT ${attempt} ---\nERROR: ${parseError}\nRAW:\n${text}\nCLEANED:\n${cleanJsonResponse(text)}\n`;
          fs.appendFileSync('failed_json.txt', logContent);
        } catch (logErr) {
          console.error('Failed to log JSON:', logErr);
        }

        if (attempt > MAX_BATCH_RETRIES) throw parseError;
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    return [];
  } catch (error) {
    console.error('❌ Batch generation failed:', error);
    return [];
  }
}
// ============================================

const MAX_GENERATION_RETRIES = 3;

/**
 * Generate questions with automatic retry on validation failures
 * Implements robust validation and regeneration logic
 */
async function generateTopicQuestions(
  params: {
    topicMetadata: TopicMetadata;
    questionCount: number;
    difficultyDistribution: { easy: number; moderate: number; hard: number };
    examConfig: ExamConfiguration;
    studentMastery: number;
    generationRules: GenerationRules;
    section?: string;
  },
  geminiApiKey: string
): Promise<AnalyzedQuestion[]> {

  const { topicMetadata, questionCount } = params;

  for (let attempt = 1; attempt <= MAX_GENERATION_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`   🔄 Retry ${attempt}/${MAX_GENERATION_RETRIES} for ${topicMetadata.topicName}`);
      }

      const questions = await generateTopicQuestionsInternal(params, geminiApiKey);

      // Validate generated questions
      const validatedQuestions: AnalyzedQuestion[] = [];
      const invalidQuestions: Array<{ q: AnalyzedQuestion; errors: string[] }> = [];
      // ... (omitting validation logic for brevity in replace, but keeping it in actual file)

      questions.forEach(q => {
        const validation = validateQuestion(q);
        if (validation.isValid) {
          validatedQuestions.push(q);
        } else {
          invalidQuestions.push({ q, errors: validation.errors });
        }
      });

      // Log validation results
      if (invalidQuestions.length > 0) {
        console.warn(`   ⚠️  ${invalidQuestions.length}/${questions.length} questions failed validation`);
        invalidQuestions.forEach(({ q, errors }) => {
          console.warn(`      - ${q.text?.substring(0, 50)}... | Errors: ${errors.join(', ')}`);
        });
      }

      // If we got enough valid questions, return them
      const validRatio = validatedQuestions.length / questionCount;
      if (validRatio >= 0.8) { // Accept if we got at least 80% valid
        if (validatedQuestions.length < questionCount && attempt < MAX_GENERATION_RETRIES) {
          console.log(`   ✅ Got ${validatedQuestions.length}/${questionCount} valid questions (${Math.round(validRatio * 100)}%)`);
          // Try one more time to fill the gap
          continue;
        }
        return validatedQuestions;
      }

      // Too many failures, retry
      if (attempt < MAX_GENERATION_RETRIES) {
        console.warn(`   ❌ Only ${validatedQuestions.length}/${questionCount} valid (${Math.round(validRatio * 100)}%), retrying...`);
      }

    } catch (error) {
      console.error(`   ❌ Attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      if (attempt === MAX_GENERATION_RETRIES) {
        return []; // Give up after max retries
      }
    }
  }

  console.error(`   ❌ Failed to generate valid questions after ${MAX_GENERATION_RETRIES} attempts`);
  return [];
}

/**
 * Internal function that actually calls the AI
 * Separated so we can wrap it with retry logic
 */
async function generateTopicQuestionsInternal(
  params: {
    topicMetadata: TopicMetadata;
    questionCount: number;
    difficultyDistribution: { easy: number; moderate: number; hard: number };
    examConfig: ExamConfiguration;
    studentMastery: number;
    generationRules: GenerationRules;
    section?: string;
  },
  geminiApiKey: string
): Promise<AnalyzedQuestion[]> {

  const { topicMetadata, questionCount, difficultyDistribution, examConfig, section: targetSection = 'Section A' } = params;

  const rigorDirective = getExamRigorDirective(examConfig.examContext as ExamContext, examConfig.subject as Subject);

  const prompt = `You are a World-Class Entrance Exam Question Architect specializing in ${examConfig.examContext} ${examConfig.subject}.
Your mission is to generate questions that are indistinguishable from the Most Competitive National Level Exam papers.

${rigorDirective}

MISSION: PRE-EMPTIVE COMPETITIVE FORECAST
1. Your goal is to generate questions that pre-empt the expected "Recursive Evolution" of this topic for ${new Date().getFullYear() + 1}.
2. Focus on "The Prediction Gap": Create questions that are 'New Twists' never seen exactly in past papers but logical within current competitive trends.
3. TOPIC: ${topicMetadata.topicName}
4. CONTEXT: ${topicMetadata.syllabus}
5. REQUIRED BLOOM'S LEVELS: ${topicMetadata.bloomsLevels.join(', ')}
6. SECTION TARGET: ${targetSection} (Assign this to every question)

GENERATE: ${questionCount} ULTIMATE-RIGOR MCQ questions.

DIFFICULTY CALIBRATION:
- Foundation (Easy): ${Math.round(questionCount * difficultyDistribution.easy / 100)} - NOT trivial; must require concept recall.
- Target (Moderate): ${Math.round(questionCount * difficultyDistribution.moderate / 100)} - Requires 2-step reasoning.
- Elite (Hard): ${Math.round(questionCount * difficultyDistribution.hard / 100)} - Multi-concept; requires deep analytical synthesis.

QUALITY MANDATE:
1. ZERO "Definition" questions. If a question can be answered by simple rote memorization, REJECT IT.
2. Every question must be a "Scenario" or "Application".
3. Use the specific syntax and trickery found in 2024-2025 elite papers.
4. "THE PREDICTION GAP": Create 1 question in this set that is a 'New Twist' never seen exactly in past papers but logical within current trends.
5. UNIQUENESS: Ensure all questions are conceptually and numerically distinct. Do NOT repeat the same scenario or values.
6. Ensure solutions are Masterclass-level: explain the 'Why' and 'How to Solve in 30 seconds'.

TECHNICAL REQUIREMENTS:
1. Use PROPER LaTeX for ALL math expressions ($...$ inline, $$...$$ display).
2. CRITICAL: Balance ALL braces {} and dollar signs $ in LaTeX.
3. NO corrupted text, NO missing spaces, NO broken LaTeX.
4. Include complete solution steps with Pedagogical Insights.
5. Add "Pro-Exam Tips" and "Concept Traps" to avoid.
6. Each question must have EXACTLY 4 options.
7. Mark correct answer clearly with correctOptionIndex (0-3).

GENERATE EACH QUESTION WITH THE FOLLOWING SCHEMA:
{
  "text": "Clear question with $proper \\\\LaTeX$ formatting",
  "options": ["A", "B", "C", "D"],
  "correctOptionIndex": 0,
  "difficulty": "Easy|Moderate|Hard",
  "section": "${targetSection}",
  "solutionSteps": ["Title ::: Detailed reasoning with $math$"],
  "aiReasoning": "Technical mindset/trap explanation",
  "historicalPattern": "Exam frequency context (e.g. KCET 2021 style)",
  "predictiveInsight": "Variation likely to see in future",
  "whyItMatters": "Engineering/Medical application",
    "markingSteps": [{"step": "logic point", "mark": "1"}],
  "commonMistakes": [{"mistake": "...", "why": "...", "howToAvoid": "..."}],
  "keyFormulas": ["$formula$"],
  "keyConcepts": [{"name": "...", "explanation": "..."}]
}

CRITICAL RIGOR MANDATE:
- NO generic "Check work" filler.
- Be specific about syllabus patterns.
- Use DOUBLE-BACKSLASH for internal LaTeX commands in JSON.
- Never return empty arrays for solutionSteps or commonMistakes.
CRITICAL: Output MUST be valid JSON with NO markdown, NO extra text, JUST THE ARRAY.`;

  try {
    const ai = getGeminiClient(geminiApiKey);

    const result = await withGeminiRetry(() => ai.models.generateContent({
      model: AI_CONFIG.defaultModel,
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 12000,
        responseMimeType: 'application/json'
      }
    }));

    const text = result.text || '[]';

    // Gemini responseMimeType: 'application/json' is usually very clean.
    const questions = JSON.parse(text);

    // Transform to AnalyzedQuestion format
    const { randomUUID } = await import('crypto');
    return questions.map((q: any) => ({
      id: randomUUID(),
      text: q.text,
      options: q.options || [],
      marks: q.marks || examConfig.marksPerQuestion,
      difficulty: q.difficulty,
      section: q.section || targetSection,
      topic: topicMetadata.topicName,
      blooms: q.blooms || 'Apply',
      solutionSteps: q.solutionSteps || q.solution_steps || [],
      examTip: q.studyTip || q.examTip || q.exam_tip || '',
      studyTip: q.studyTip || q.study_tip || '',
      keyFormulas: q.keyFormulas || q.key_formulas || [],
      commonMistakes: q.commonMistakes || q.common_mistakes || [],
      pitfalls: (q.commonMistakes || q.pitfalls || []).map((m: any) => typeof m === 'object' ? m.mistake : m),
      aiReasoning: q.aiReasoning || q.ai_reasoning || '',
      historicalPattern: q.historicalPattern || q.historical_pattern || '',
      predictiveInsight: q.predictiveInsight || q.predictive_insight || '',
      whyItMatters: q.whyItMatters || q.why_it_matters || '',
      keyConcepts: q.keyConcepts || q.key_concepts || [],
      markingSteps: q.markingSteps || q.marking_steps || [],
      masteryMaterial: q.masteryMaterial || q.mastery_material || q,
      correctOptionIndex: q.correctOptionIndex ?? q.correct_option_index ?? 0,
      source: `AI-Generated (${examConfig.examContext})`
    }));

  } catch (error) {
    console.error(`❌ Failed to generate questions for ${topicMetadata.topicName}:`, error);
    return [];
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Comprehensive validation for AI-generated questions
 * Checks: LaTeX syntax, text corruption, structure, formatting
 */
function validateQuestion(q: AnalyzedQuestion): ValidationResult {
  const errors: string[] = [];

  // 1. Basic structure validation
  if (!q.text || q.text.trim().length === 0) {
    errors.push('Missing question text');
  }
  if (!q.options || q.options.length !== 4) {
    errors.push(`Invalid options count: ${q.options?.length || 0} (expected 4)`);
  }
  if (q.correctOptionIndex === undefined || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
    errors.push(`Invalid correct option index: ${q.correctOptionIndex}`);
  }
  if (!q.difficulty || !['Easy', 'Moderate', 'Hard'].includes(q.difficulty)) {
    errors.push(`Invalid difficulty: ${q.difficulty}`);
  }

  // 2. LaTeX validation
  if (q.text) {
    // Check for unbalanced dollar signs
    const dollarCount = (q.text.match(/\$/g) || []).length;
    if (dollarCount % 2 !== 0) {
      errors.push('Unbalanced LaTeX delimiters ($)');
    }

    // Check for unbalanced braces in LaTeX
    const latexSegments = (q.text.match(/\$[^$]+\$/g) || []) as string[];
    latexSegments.forEach((segment: string) => {
      const openBraces = (segment.match(/\{/g) || []).length;
      const closeBraces = (segment.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push(`Unbalanced braces in LaTeX: ${segment.substring(0, 50)}...`);
      }
    });

    // Check for common LaTeX syntax errors
    const badPatterns = [
      /\$\s*\$/,           // Empty LaTeX
      /\$[^$]*\\\s*$/,    // Incomplete command
      /\\[a-zA-Z]+\s*\{(?!\s*[^}])/,  // Command with empty braces
    ];
    badPatterns.forEach((pattern, idx) => {
      if (pattern.test(q.text)) {
        errors.push(`LaTeX syntax error pattern ${idx + 1}`);
      }
    });
  }

  // 3. Text corruption detection
  if (q.text) {
    // Check for missing spaces (20+ consecutive lowercase letters without spaces)
    const corruptionPattern = /[a-z]{20,}/;
    if (corruptionPattern.test(q.text)) {
      errors.push('Text corruption detected (missing spaces)');
    }

    // Check for excessive special characters (might indicate encoding issues)
    const specialChars = (q.text.match(/[^\w\s${}()\[\].,;:?!\-+=*\/\\]/g) || []).length;
    if (specialChars > q.text.length * 0.1) {
      errors.push('Excessive special characters (encoding issue)');
    }
  }

  // 4. Options validation
  if (q.options) {
    q.options.forEach((opt, idx) => {
      if (!opt || opt.trim().length === 0) {
        errors.push(`Option ${String.fromCharCode(65 + idx)} is empty`);
      }

      // Check LaTeX in options
      const optDollarCount = (opt.match(/\$/g) || []).length;
      if (optDollarCount % 2 !== 0) {
        errors.push(`Unbalanced LaTeX in option ${String.fromCharCode(65 + idx)}`);
      }
    });

    // Check for duplicate options
    const uniqueOptions = new Set(q.options.map(o => o?.trim().toLowerCase()));
    if (uniqueOptions.size < q.options.length) {
      errors.push('Duplicate options detected');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate array of questions and filter out invalid ones
 */
export function validateQuestions(
  questions: AnalyzedQuestion[],
  context: GenerationContext,
  existingQuestions: AnalyzedQuestion[] = []
): AnalyzedQuestion[] {
  const validated: AnalyzedQuestion[] = [];
  const rejected: Array<{ question: AnalyzedQuestion; errors: string[] }> = [];

  // Track normalized texts to ensure uniqueness
  const seenTexts = new Set<string>();
  
  // Add already existing questions to the seen set
  existingQuestions.forEach(q => {
    const normalizedText = q.text?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    if (normalizedText) seenTexts.add(normalizedText);
  });

  questions.forEach(q => {
    const validation = validateQuestion(q);
    
    // Similarity check (Normalize: lowercase, remove non-alphanumeric)
    const normalizedText = q.text?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const isTooSimilar = seenTexts.has(normalizedText);

    if (validation.isValid && !isTooSimilar) {
      validated.push(q);
      seenTexts.add(normalizedText);
    } else {
      const errors = [...validation.errors];
      if (isTooSimilar) errors.push('Question is identical/too similar to another in the set');
      
      rejected.push({ question: q, errors });
      console.warn(`❌ Rejected question: ${q.text?.substring(0, 60)}...`);
      console.warn(`   Errors: ${errors.join(', ')}`);
    }
  });

  if (rejected.length > 0) {
    console.warn(`⚠️  ${rejected.length}/${questions.length} questions failed validation or were duplicates`);
  }

  return validated;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateStatisticalPrediction(
  context: GenerationContext,
  year: number
): PredictedPattern {
  // Statistical fallback when AI fails
  const { historicalData, topics, examConfig } = context;

  // Calculate average distribution across all years
  const topicAverages = new Map<string, { count: number; total: number }>();

  historicalData.forEach(yearData => {
    yearData.topicDistribution.forEach(td => {
      const current = topicAverages.get(td.topicId) || { count: 0, total: 0 };
      current.count++;
      current.total += td.questionCount;
      topicAverages.set(td.topicId, current);
    });
  });

  // Default per-topic count when no historical data: distribute total evenly across topics.
  // This respects the actual exam total (KCET=60, NEET=50, JEE=30) instead of hardcoding 5.
  const defaultAvg = topics.length > 0
    ? examConfig.totalQuestions / topics.length
    : 5;

  const predictedTopics = topics.map(topic => {
    const avg = topicAverages.get(topic.topicId);
    const avgQuestions = avg ? avg.total / avg.count : defaultAvg;

    return {
      topicId: topic.topicId,
      topicName: topic.topicName,
      probability: 0.5,
      expectedQuestionCount: Math.round(avgQuestions),
      trend: 'stable' as const,
      confidence: 0.5,
      reasoning: 'Statistical average from historical data'
    };
  });

  return {
    year,
    topics: predictedTopics,
    difficultyDistribution: { easy: 35, moderate: 45, hard: 20 },
    overallConfidence: 0.5
  };
}
