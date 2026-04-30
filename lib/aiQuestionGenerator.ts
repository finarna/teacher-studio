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
export type { AnalyzedQuestion };
import { AI_CONFIG } from '../config/aiConfigs';
import { cleanJsonResponse } from './aiParserUtils';
import fs from 'fs';
import path from 'path';

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
  difficultyProfile?: {
    easy: number;
    moderate: number;
    hard: number;
  };
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
    idsTarget?: number;
    rigorVelocity?: number;
    intentSignature?: {
        synthesis: number;
        trapDensity: number;
        linguisticLoad: number;
        speedRequirement: number;
    };
    directives?: string[];
    boardSignature?: 'SYNTHESIZER' | 'LOGICIAN' | 'INTIMIDATOR' | 'ANCHOR' | 'DEFAULT';
  };

  // Target difficulty mix (%)
  difficultyMix: {
    easy: number;
    moderate: number;
    hard: number;
  };
}

// ============================================
// IDENTITY BANK LOADER - Forensic DNA Injection
// ============================================

function loadIdentityBank(examContext: string, subject: string): any[] {
  try {
    let normalizedSubject = subject.toLowerCase();
    
    // NEET Biology Split Normalization
    if (examContext === 'NEET' && (normalizedSubject === 'botany' || normalizedSubject === 'zoology')) {
      normalizedSubject = 'biology';
    }

    const filename = `${examContext.toLowerCase()}_${normalizedSubject}.json`;
    const filePath = path.join(process.cwd(), 'lib/oracle/identities', filename);
    
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data.identities || data;
    }
    return [];
  } catch (error) {
    console.error(`⚠️ Failed to load Identity Bank for ${examContext} ${subject}:`, error);
    return [];
  }
}

// ============================================
// RIGOR PROTOCOLS - Exam-specific directives
// ============================================

function getExamRigorDirective(examContext: ExamContext, subject: Subject): string {
  const base = `EXAM_CONTEXT: ${examContext} | SUBJECT: ${subject} | PROTOCOL_VERSION: 16.0`;
  
  if (examContext === 'NEET') {
    return `${base}
REI v3.0 NEET PROTOCOL (LETHAL-SPEED):
- "Linguistic Noise": High word count and complex sentence structure to pressure time management.
- "Statement-Logic": Focus on False Statement Traps and Assertion-Reasoning where 1 word changes validity.
- "NCERT-Affirmation": 90% strict alignment with 10% Forensic Variations.`;
  }

  if (examContext === 'KCET') {
    return `${base}
REI v3.0 CET PROTOCOL (PATTERN-SYNTHESIS):
- "Heuristic Resonance": Focus on property-based speed-solving shortcuts.
- "Dimensional Traps": Prioritize limiting-case behavior and dimensional analysis.
- "Chapter Fusion": Merge ≥2 distinct chapters (e.g., Matrix-Calculus Fusion).`;
  }

  return base;
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
  console.log(`🔮 [REI v3.0] Step 1: AI Prediction Finalized for ${prediction.topics.length} topics.`);
  console.log(`📦 [DEBUG] AI Raw Mix:`, prediction.topics.map(t => `${t.topicId}: ${t.expectedQuestionCount}Q`).join(', '));

  // Step 2: Calculate optimal topic allocation
  console.log('🧩 [REI v3.0] Step 2: Mapping Predicted Topics to Test Allocation...');
  const allocation = calculateTopicAllocation(context, prediction);
  console.log(`✅ [REI v3.0] Allocation Math Finalized: ${allocation.length} topics across ${context.examConfig.totalQuestions} questions.`);

  // Step 3: Generate questions using Smart Batching (Reduces latency for multiple topics)
  const generationStartTime = Date.now();
  const activeAllocations = allocation.filter(topicAlloc => topicAlloc.questionCount > 0);

  // OPTIMIZATION: Combine multiple topics into fewer LLM calls.
  // Each LLM trip has ~15-20s overhead; batching topics cuts this by 80%+.
  // Each LLM trip has ~15-20s overhead; smaller batches are more robust for complex Math.
  const MAX_QUESTIONS_PER_BATCH = 6;
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
  const PARALLEL_BATCH_SIZE = 10;
  const GROUP_DELAY_MS = 500;

  console.log(`⚡ Optimized into ${batches.length} batches → ${Math.ceil(batches.length / PARALLEL_BATCH_SIZE)} parallel groups of ${PARALLEL_BATCH_SIZE} (Batch size limit: ${MAX_QUESTIONS_PER_BATCH})`);

  const allBatchResults: AnalyzedQuestion[][] = new Array(batches.length);

  // --- REI DIFFICULTY BUDGETING (DYNAMIC) ---
  const diffMix = context.generationRules?.difficultyMix || { easy: 30, moderate: 50, hard: 20 };
  const totalQ = context.examConfig.totalQuestions;
  
  let easyLeft = Math.round((diffMix.easy / 100) * totalQ);
  let modLeft = Math.round((diffMix.moderate / 100) * totalQ);
  let hardLeft = totalQ - (easyLeft + modLeft);

  console.log(`⚖️  REI PROJECTION APPLIED: Easy=${easyLeft}, Mod=${modLeft}, Hard=${hardLeft} (Mix: ${diffMix.easy}/${diffMix.moderate}/${diffMix.hard})`);

  // Compute cumulative start index and target difficulty per batch
  const batchStartIndex: number[] = [];
  const batchDifficulties: ('Easy' | 'Moderate' | 'Hard')[] = [];
  const batchDistributions: { easy: number; moderate: number; hard: number }[] = [];
  let cumulativeIndex = 0;
  
  for (const batch of batches) {
    batchStartIndex.push(cumulativeIndex);
    const questionsInThisBatch = batch.reduce((sum, b) => sum + b.questionCount, 0);
    
    // --- GRANULAR DIFFICULTY ALLOCATION (REI v4.0) ---
    const currentBatchDist = { easy: 0, moderate: 0, hard: 0 };
    let remainingNeeded = questionsInThisBatch;

    // Fill from Easy bucket
    const takeEasy = Math.min(remainingNeeded, easyLeft);
    currentBatchDist.easy = takeEasy;
    easyLeft -= takeEasy;
    remainingNeeded -= takeEasy;

    // Fill from Moderate bucket
    if (remainingNeeded > 0) {
      const takeMod = Math.min(remainingNeeded, modLeft);
      currentBatchDist.moderate = takeMod;
      modLeft -= takeMod;
      remainingNeeded -= takeMod;
    }

    // Fill from Hard bucket (final bucket of truth)
    if (remainingNeeded > 0) {
      const takeHard = Math.min(remainingNeeded, hardLeft);
      currentBatchDist.hard = takeHard;
      hardLeft -= takeHard;
      remainingNeeded -= takeHard;
    }

    // Assign a primary target difficulty for the prompt persona
    let primaryDiff: 'Easy' | 'Moderate' | 'Hard' = 'Easy';
    if (currentBatchDist.easy >= currentBatchDist.moderate && currentBatchDist.easy >= currentBatchDist.hard) primaryDiff = 'Easy';
    else if (currentBatchDist.moderate >= currentBatchDist.hard) primaryDiff = 'Moderate';
    else primaryDiff = 'Hard';

    batchDistributions.push(currentBatchDist);
    batchDifficulties.push(primaryDiff);
    cumulativeIndex += questionsInThisBatch;

    console.log(`📍 Batch Allocation: ${questionsInThisBatch}Q -> E:${currentBatchDist.easy} M:${currentBatchDist.moderate} H:${currentBatchDist.hard} | Primary:${primaryDiff} | Remaining: E:${easyLeft} M:${modLeft} H:${hardLeft}`);
  }

  for (let groupStart = 0; groupStart < batches.length; groupStart += PARALLEL_BATCH_SIZE) {
    const groupEnd = Math.min(groupStart + PARALLEL_BATCH_SIZE, batches.length);
    const groupIndices = Array.from({ length: groupEnd - groupStart }, (_, i) => groupStart + i);

    console.log(`🚀 Group ${Math.floor(groupStart / PARALLEL_BATCH_SIZE) + 1}/${Math.ceil(batches.length / PARALLEL_BATCH_SIZE)}: firing batches [${groupIndices.map(i => i + 1).join(', ')}] in parallel...`);

    await Promise.all(groupIndices.map(async (idx) => {
      const batch = batches[idx];
      const batchSection = batchStartIndex[idx] >= (context.examConfig.examContext === 'NEET' ? (totalQ >= 50 ? 35 : Math.round(totalQ * 35 / 50)) : Infinity) ? 'Section B' : 'Section A';
      
      const targetDifficulty = batchDifficulties[idx];
      const difficultyDistribution = batchDistributions[idx];

      const totalInBatchCount = batch.reduce((sum, b) => sum + b.questionCount, 0);
      console.log(`🎯 Batch ${idx + 1}/${batches.length}: ${totalInBatchCount}Q [${batchSection}] [REI:${targetDifficulty}] [Budget: E:${difficultyDistribution.easy} M:${difficultyDistribution.moderate} H:${difficultyDistribution.hard}] — ${batch.map(b => b.topicName).join(', ')}`);

      const result = await generateTopicQuestionsBatch({
        batchAllocations: batch.map(b => ({ ...b, section: batchSection })),
        context,
        geminiApiKey,
        targetDifficulty,
        difficultyDistribution // Pass the granular distribution to the AI!
      });

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

  // Step 5: Top-up — regenerate exactly the rejected count (up to 3 retries)
  let topupAttempts = 0;
  const MAX_TOPUP_ATTEMPTS = 3;
  
  while (validatedQuestions.length < targetCount && topupAttempts < MAX_TOPUP_ATTEMPTS && activeAllocations.length > 0) {
    topupAttempts++;
    const deficit = targetCount - validatedQuestions.length;
    console.log(`🔄 [Top-up ${topupAttempts}/${MAX_TOPUP_ATTEMPTS}] Needed: ${validatedQuestions.length}/${targetCount} passed. Regenerating ${deficit} missing question(s)...`);

    // Distribute deficit proportionally across allocations
    let remaining = deficit;
    const topupBatch: typeof activeAllocations = [];
    for (const alloc of activeAllocations) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, 5); // Take smaller chunks for higher fidelity
      topupBatch.push({ ...alloc, questionCount: take });
      remaining -= take;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const topupResult = await generateTopicQuestionsBatch({
        batchAllocations: topupBatch.map(b => ({ ...b, section: 'Section A' })),
        context,
        geminiApiKey,
        targetDifficulty: 'Easy' // Default topups to Easy to keep REI stable
      });

      const topupValidated = validateQuestions(topupResult, context, validatedQuestions);
      console.log(`✅ [Top-up ${topupAttempts}] Recovered ${topupValidated.length}/${deficit} valid question(s)`);
      validatedQuestions.push(...topupValidated);
    } catch (topupErr) {
      console.warn(`⚠️ [Top-up ${topupAttempts}] Batch failed:`, (topupErr as any).message);
    }
  }

  const shuffled = shuffleArray(validatedQuestions);
  if (shuffled.length < targetCount) {
    console.warn(`🚨 Final question count (${shuffled.length}) is below target (${targetCount}) after ${topupAttempts} top-up attempts.`);
  } else {
    console.log(`✅ Final question count: ${shuffled.length}/${targetCount}`);
  }

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

  console.log('🔮 [REI v3.0] Step 1: Initiating AI Prediction Phase...');
  console.log('📂 [REI v3.0] RAW PYQ CONTEXT:', JSON.stringify(historicalSummary, null, 2));

  // Enhanced NEET-specific prompt
  const neetExamples = examConfig.examContext === 'NEET' ? `

NEET PHYSICS PATTERN INSIGHTS (2021-2025):
- CORE TOPICS: Electrostatics (3-4Q), Current Electricity (2-3Q), Optics (3-4Q), Modern Physics (3-4Q)
- HIGH-YIELD PATTERNS: Capacitor combinations, AC circuits (LCR/impedance), Photoelectric effect, Nuclear decay
- SHIFTING TRENDS: Wave optics increasing (interference/diffraction), Communication Systems REMOVED from 2026
- NUMERICAL FOCUS: 70% numerical, 30% conceptual - prefer questions with formula applications
- DIFFICULTY MIX: Easy 30% (direct formula), Moderate 50% (2-step), Hard 20% (3-step/tricky)

NEET-SPECIFIC QUESTION CHARACTERISTICS:
✓ Single correct answer (MCQ with 4 options)
✓ NCERT-based with 90% strict alignment
✓ Numerical problems dominate over theory
✓ Formula-heavy: Use standard equations (lens formula, Ohm's law, photoelectric equation)
✓ Avoid: Multi-concept hybrid questions, overly theoretical questions
✓ Prefer: Clear numerical scenarios, specific value calculations

EXAMPLE HIGH-YIELD IDENTITIES:
- "Capacitance energy redistribution when capacitors connected"
- "LCR resonance and power factor calculations"
- "Lens formula with medium change (refractive index)"
- "Photoelectric stopping potential and work function"
- "Radioactive decay law and half-life calculations"
` : '';

  const prompt = `You are an expert exam pattern analyst for ${examConfig.examContext} ${examConfig.subject}.
${neetExamples}
HISTORICAL DATA (${historicalData.length} years):
${JSON.stringify(historicalSummary, null, 2)}

AVAILABLE TOPICS:
${JSON.stringify(topicsSummary, null, 2)}

TARGET: Predict the distribution for a ${examConfig.totalQuestions}-question ${examConfig.examContext} ${examConfig.subject} paper for ${nextYear}.
CRITICAL: The sum of ALL expectedQuestionCount values MUST equal exactly ${examConfig.totalQuestions}.

Analyze the historical pattern and perform a "Recursive Concept Evolution" analysis:
1. Identifying Concepts that are CORE (appear every year with 80%+ consistency).
2. Identifying Concepts that are SHIFTING (e.g., were easy 3 years ago, now asked with 2-step complexity).
3. Predict the "Next Logical Twist": If last year asked for A, and the year before for B, what is the unseen 'C' for ${nextYear}?
4. Expected difficulty distribution (Easy/Moderate/Hard) and statistical probability for each topic.
5. Consider SYLLABUS CHANGES: Remove deprecated topics, boost newly added topics.

CRITICAL: Use the EXACT topicId from the AVAILABLE TOPICS list above.

Return ONLY a JSON object with the following structure:
{
  "topics": [
    {
      "topicId": "UUID or Name from list",
      "topicName": "Human-readable name",
      "probability": "0.0-1.0 (float)",
      "expectedQuestionCount": "number (integer)",
      "trend": "increasing/decreasing/stable",
      "evolutionNote": "Detailed AI Insight string",
      "confidence": "0.0-1.0 (float)",
      "reasoning": "Full analytical logic"
    }
  ],
  "difficultyDistribution": { "easy": "percentage", "moderate": "percentage", "hard": "percentage" },
  "overallConfidence": "0.0-1.0 (float)"
}
`;
  console.log('📡 [REI v3.0] FINAL PREDICTION PROMPT SENT:', prompt);

  try {
    const ai = getGeminiClient(geminiApiKey);

    const result: any = await withGeminiRetry(() => (ai.models as any).generateContent({
      model: AI_CONFIG.defaultModel,
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json'
      }
    } as any));
    
    const text = result.text || '{}';
    console.log('🤖 [REI v3.0] RAW AI PREDICTION RESPONSE:', text);

    const jsonStr = cleanJsonResponse(text);
    const prediction = JSON.parse(jsonStr);
    console.log('🔮 [REI v3.0] Predicted Topic Distribution:', prediction.topics);

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
    let topicsArr = rawTotal > 0
      ? rawTopics.map(t => ({
          ...t,
          expectedQuestionCount: (t.expectedQuestionCount / rawTotal) * examConfig.totalQuestions
        }))
      : rawTopics;

    console.log(`📐 Prediction normalized: raw total=${rawTotal} → scaled to ${examConfig.totalQuestions} (factor ${rawTotal > 0 ? (examConfig.totalQuestions / rawTotal).toFixed(2) : 'N/A'})`);

    // Apply empirically-calibrated identity confidences (NEET all subjects)
    if (examConfig.examContext === 'NEET') {
      try {
        // Load subject-specific calibration file
        const subjectLower = examConfig.subject.toLowerCase();
        const calibratedPath = path.join(
          process.cwd(),
          `docs/oracle/calibration/identity_confidences_neet_${subjectLower}.json`
        );

        if (fs.existsSync(calibratedPath)) {
          const calibratedData = JSON.parse(fs.readFileSync(calibratedPath, 'utf8'));
          const confidences = calibratedData.identityConfidences || {};

          console.log(`🎯 [CALIBRATION] Applying empirically-calibrated identity confidences for NEET ${examConfig.subject}...`);

          // Apply confidence weights to adjust distribution
          topicsArr = topicsArr.map(t => {
            const confidence = confidences[t.topicId] || 1.0;
            const adjustedCount = t.expectedQuestionCount * confidence;

            if (confidence !== 1.0) {
              console.log(`   ${t.topicId}: ${t.expectedQuestionCount.toFixed(1)}Q × ${confidence} = ${adjustedCount.toFixed(1)}Q`);
            }

            return {
              ...t,
              expectedQuestionCount: adjustedCount
            };
          });

          // Re-normalize after applying confidences
          const adjustedTotal = topicsArr.reduce((sum, t) => sum + t.expectedQuestionCount, 0);
          if (adjustedTotal > 0) {
            topicsArr = topicsArr.map(t => ({
              ...t,
              expectedQuestionCount: (t.expectedQuestionCount / adjustedTotal) * examConfig.totalQuestions
            }));
          }

          console.log(`✅ [CALIBRATION] Applied confidence weights, re-normalized to ${examConfig.totalQuestions}Q`);
        } else {
          console.log('⚠️  [CALIBRATION] No calibrated confidences found, using AI predictions as-is');
        }
      } catch (error) {
        console.warn('⚠️  [CALIBRATION] Failed to apply confidences:', (error as any).message);
      }
    }

    // Normalize difficulty distribution (handle both "25%" strings and numbers)
    let normalizedDifficulty = { easy: 30, moderate: 50, hard: 20 }; // default
    if (prediction.difficultyDistribution) {
      const parseDiff = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseInt(val.replace('%', ''));
        return 0;
      };
      normalizedDifficulty = {
        easy: parseDiff(prediction.difficultyDistribution.easy),
        moderate: parseDiff(prediction.difficultyDistribution.moderate),
        hard: parseDiff(prediction.difficultyDistribution.hard)
      };
    }

    return {
      year: nextYear,
      topics: topicsArr,
      difficultyDistribution: normalizedDifficulty,
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

    // MACHINE MODE / PREDICTIVE CALIBRATION: Use AI-predicted difficulty distribution
    if (isOracle || mode === 'predictive_mock') {
      // Use AI prediction if available, otherwise fall back to default
      const aiPredictedDiff = prediction.difficultyDistribution;
      if (aiPredictedDiff && typeof aiPredictedDiff.easy === 'number') {
        difficultyDist = { ...aiPredictedDiff };
        console.log(`      AI-Predicted Difficulty: E:${difficultyDist.easy} M:${difficultyDist.moderate} H:${difficultyDist.hard}`);
      } else {
        // Fallback only if AI didn't provide prediction
        const blueprint = (examConfig as any).difficultyProfile || { easy: 30, moderate: 50, hard: 20 };
        difficultyDist = { ...blueprint };
        console.log(`      Fallback Blueprint: E:${difficultyDist.easy} M:${difficultyDist.moderate} H:${difficultyDist.hard}`);
      }
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
async function generateTopicQuestionsBatch(params: {
  batchAllocations: (TopicAllocation & { section: string })[],
  context: GenerationContext,
  geminiApiKey: string,
  targetDifficulty?: 'Easy' | 'Moderate' | 'Hard',
  difficultyDistribution?: { easy: number; moderate: number; hard: number }
}): Promise<AnalyzedQuestion[]> {

  const { batchAllocations, context, geminiApiKey, targetDifficulty } = params;
  const { examConfig, generationRules } = context;
  const totalInBatch = batchAllocations.reduce((sum: number, a: any) => sum + a.questionCount, 0);
  const targetSection = batchAllocations[0]?.section || 'Section A';
  const topicsText = batchAllocations.map(a => `- ${a.topicMetadata.topicName} (${a.questionCount} questions)\n  Targets: ${a.difficultyDistribution.easy}% Easy, ${a.difficultyDistribution.moderate}% Mod, ${a.difficultyDistribution.hard}% Hard${a.evolutionNote ? `\n  Evolution Insight: ${a.evolutionNote}` : ''}`).join('\n');
  const syllabusText = batchAllocations.map(a => `[TOPIC: ${a.topicMetadata.topicName}] SYLLABUS: ${a.topicMetadata.syllabus}`).join('\n\n');

  const rigorDirective = getExamRigorDirective(examConfig.examContext as ExamContext, examConfig.subject as Subject);

  // --- REI FORENSIC INJECTION ---
  const isOracle = generationRules?.oracleMode?.enabled;
  const oracleDirectives = generationRules?.oracleMode?.directives || [];
  const boardSignature = generationRules?.oracleMode?.boardSignature || 'SYNTHESIZER';
  
  // Load Forensic Identity Bank if in Oracle Mode
  const identities = isOracle 
    ? loadIdentityBank(examConfig.examContext as string, examConfig.subject as string)
    : [];

  const identitiesText = identities.length > 0
    ? `FORENSIC IDENTITIES (MANDATORY ANCHORS):
${identities.map((id: any) => `- [${id.id}] ${id.patternName}: ${id.logicalCore}`).join('\n')}`
    : '';
  
  const missionText = isOracle
    ? `MISSION: CORE EXAM PREDICTION (IDS Target: ${generationRules.oracleMode?.idsTarget || 0.95})
FORENSIC DIRECTIVES:
${oracleDirectives.map(d => `- ${d}`).join('\n')}

${identitiesText}`
    : `MISSION: STANDARD COMPETITIVE ASSESSMENT`;

  const oracleMandate = isOracle ? `
ORACLE MANDATE:
- Anchor all questions to the High-Yield identities provided in the context.
- Maintain the calibrated IDS Target and Board Signature.` : '';

  const difficultyMandate = targetDifficulty
    ? `MANDATORY DIFFICULTY TARGET:
Every single question in this batch MUST be classified as "${targetDifficulty}".
Failure to adhere to this will result in calibration failure. DO NOT vary difficulty within this batch.`
    : `DIFFICULTY TARGETS (PER TOPIC):
${topicsText}`;

  // QUESTION TYPE MANDATE (REI v17 - from actual KCET 2021-2025 analysis)
  let questionTypeMandate = '';

  if (isOracle && examConfig.examContext === 'KCET' && examConfig.subject === 'Math') {
    questionTypeMandate = `
QUESTION TYPE DISTRIBUTION (CRITICAL - Based on KCET 2021-2025 Analysis):
This is the ACTUAL KCET pattern. Follow this distribution STRICTLY for ${totalInBatch} questions:

1. PROPERTY-BASED (69% = ${Math.round(totalInBatch * 0.69)} questions):
   - Greatest Integer Function [x] properties and integrals
   - Matrix properties (symmetric, skew-symmetric, adjoint, rank)
   - Inverse trigonometric identities and domain/range
   - Theorem applications (Rolle's, LMVT, Monotonicity)
   - Relations (reflexive, symmetric, transitive, equivalence)
   - Function properties (bijective, injective, surjective)
   - Determinant properties, Eigenvalues
   - Continuity and Differentiability properties
   Example: "If [x]^2 - 5[x] + 6 = 0, where [x] denotes GIF, then..."
   Example: "For matrix A with |A|=4, if B=2·adj(A), then |B|=?"

2. WORD PROBLEMS (19% = ${Math.round(totalInBatch * 0.19)} questions):
   - Rectangle/square perimeter and area constraints
   - Set theory with finite elements (subsets, relations)
   - Probability with balls/cards (red/black scenarios)
   - Function pre-images and mappings
   - Age/distance/speed problems (minimal)
   Example: "Rectangle length = 5×breadth. Minimum perimeter ≥ 180 cm. Find area."
   Example: "Box with m red and n black balls. Probability of drawing..."

3. COMPUTATIONAL (8% = ${Math.round(totalInBatch * 0.08)} questions):
   - Direct limit evaluation
   - Definite integral computation
   - Derivative calculation
   - Determinant value
   Example: "lim(x→π/4) [√2·cos(x) - 1] / [cot(x) - 1] = ?"
   Example: "∫[0 to 1] log(1/x - 1) dx = ?"

4. PATTERN RECOGNITION (2% = ${Math.round(totalInBatch * 0.02)} questions):
   - Binomial coefficient patterns
   - Series summation formulas
   - GP/AP term relationships
   Example: "In expansion of (1+x)^n, C₁/C₀ + 2·C₂/C₁ + ... = ?"

5. ABSTRACT (2% = ${Math.round(totalInBatch * 0.02)} questions):
   - Conceptual questions without numerical computation
   - Statement-reason type
   Example: "Which statement is true about symmetric matrices?"

CRITICAL: Do NOT generate too many word problems (common AI mistake). KCET is 69% property-based!`;
  } else if (isOracle && examConfig.examContext === 'KCET' && examConfig.subject === 'Physics') {
    questionTypeMandate = `
QUESTION TYPE DISTRIBUTION (CRITICAL - Based on KCET 2021-2025 Analysis):
This is the ACTUAL KCET Physics pattern. Follow this distribution STRICTLY for ${totalInBatch} questions:

1. CONCEPTUAL (77% = ${Math.round(totalInBatch * 0.77)} questions):
   - Laws and principles (Newton's laws, Ohm's law, Faraday's law)
   - Direction of vectors (force, velocity, magnetic field, torque)
   - Property identification (characteristics of waves, materials, particles)
   - "Which of the following" conceptual questions
   - Cause-effect relationships ("What produces...", "Due to...")
   - Statement verification (true/false about laws)
   Example: "A ceiling fan rotating clockwise. Direction of angular velocity is..."
   Example: "Which of the following produces electromagnetic waves?"
   Example: "According to Lenz's law, the induced current..."

2. GRAPH ANALYSIS (15% = ${Math.round(totalInBatch * 0.15)} questions):
   - I-V characteristic curves (for conductors at different temperatures)
   - Variation graphs (R vs f, X_L vs f, X_C vs f in LCR circuits)
   - v-t and a-t graphs (kinematics)
   - Energy vs position graphs (SHM, potential energy)
   - Resistivity-temperature variations
   Example: "The I-V graph for a conductor at 100°C and 400°C shows..."
   Example: "In an LCR circuit, variation of X_L and X_C with frequency..."

3. EXPERIMENTAL (6% = ${Math.round(totalInBatch * 0.06)} questions):
   - Laboratory apparatus (galvanometer, metre bridge, potentiometer)
   - Measurement techniques (vernier caliper, screw gauge, travelling microscope)
   - Experimental observations and readings
   - Determination procedures (resistance, focal length, figure of merit)
   Example: "In an experiment to determine resistance using metre bridge..."
   Example: "Travelling microscope reading for focal length determination..."

4. NUMERICAL PROBLEM (1% = ${Math.round(totalInBatch * 0.01)} questions):
   - Direct calculation with given values
   - Ratio computations
   - Very minimal - KCET Physics is NOT calculation-heavy!
   Example: "60W, 120V bulb connected to 220V. Required series resistance?"

5. DIAGRAM-BASED (1% = ${Math.round(totalInBatch * 0.01)} questions):
   - Ray diagram interpretation
   - Circuit diagram analysis
   Example: "In the circuit diagram shown, the equivalent resistance..."

CRITICAL INSIGHT: KCET Physics is 92% understanding-based (77% conceptual + 15% graph analysis).
Do NOT generate calculation-heavy numerical problems - that's NOT the KCET pattern!
Focus on conceptual clarity, law applications, and graph interpretations.`;
  } else if (isOracle && examConfig.examContext === 'KCET' && examConfig.subject === 'Biology') {
    questionTypeMandate = `
QUESTION TYPE DISTRIBUTION (CRITICAL - Based on KCET 2022-2025 Analysis):
This is the ACTUAL KCET Biology pattern. Follow this distribution STRICTLY for ${totalInBatch} questions:

1. FACTUAL_CONCEPTUAL (61% = ${Math.round(totalInBatch * 0.61)} questions):
   - Direct factual recall (definitions, names, parts, functions)
   - Identification questions ("What is...", "Which of the following...")
   - Single-fact verification without complex reasoning
   - Structure/organelle function questions
   - Process identification (photosynthesis steps, cell cycle phases)
   Example: "The hormone responsible for inducing seed dormancy is..."
   Example: "Which of the following is found only in plant cells?"
   Example: "The primary function of the Loop of Henle is..."

2. DIAGRAM_BASED (11% = ${Math.round(totalInBatch * 0.11)} questions):
   - Label diagrams or identify structures
   - Visual interpretation of biological structures
   - Flowcharts or life cycle diagrams
   - Anatomical structures identification
   Example: "In the diagram of the human heart shown, identify the chamber marked 'X'..."
   Example: "The structure labeled in the neuron diagram is responsible for..."

3. MATCH_COLUMN (8% = ${Math.round(totalInBatch * 0.08)} questions):
   - Pairing items from two columns
   - Matching organisms with characteristics
   - Correlating structures with functions
   - Scientists with discoveries
   Example: "Match the following diseases in Column I with their causative agents in Column II..."

4. STATEMENT_BASED (8% = ${Math.round(totalInBatch * 0.08)} questions):
   - True/false statement verification
   - Assertion-Reason format
   - "Which of the following statements is correct?"
   - Multiple statement evaluation
   Example: "Consider the following statements: (I) DNA replication is semiconservative. (II) Okazaki fragments..."

5. REASONING (6% = ${Math.round(totalInBatch * 0.06)} questions):
   - "Why" or "How" questions requiring explanation
   - Mechanism understanding
   - Process reasoning
   - Cause-effect relationships
   Example: "Why does the lac operon shut down in the presence of glucose?"
   Example: "Explain how crossing over increases genetic variation..."

6. APPLICATION (5% = ${Math.round(totalInBatch * 0.05)} questions):
   - Real-world scenarios (disease, agriculture, biotechnology)
   - Clinical or practical applications
   - Examples of biological concepts
   - Use cases or applications
   Example: "A patient with Type 1 diabetes requires insulin injections because..."
   Example: "Bt cotton is resistant to bollworms due to..."

CRITICAL: KCET Biology is 61% factual recall. Focus on straightforward questions testing knowledge.
Do NOT over-complicate with multi-step reasoning. Most questions are direct fact-checking.`;
  } else if (isOracle && examConfig.examContext === 'NEET' && examConfig.subject === 'Physics') {
    questionTypeMandate = `
QUESTION TYPE DISTRIBUTION (CRITICAL - Based on NEET 2021-2025 Analysis):
This is the ACTUAL NEET Physics pattern. Follow this distribution STRICTLY for ${totalInBatch} questions:

1. SIMPLE_RECALL_MCQ (80% = ${Math.round(totalInBatch * 0.80)} questions):
   - Standard numerical/conceptual MCQs with direct formula application
   - Example: "A capacitor of capacitance 10μF is charged to 100V. Find the energy stored."
   - Example: "The photoelectric work function of a metal is 2.5 eV. Find threshold frequency."
   - NCERT-based numerical problems (Ohm's law, lens formula, Kirchhoff's laws)
   - Focus: Formula mastery, 2-step calculations, concept recall

2. DIAGRAM_BASED_MCQ (10% = ${Math.round(totalInBatch * 0.10)} questions):
   - Circuit diagrams (resistor networks, capacitor combinations, LCR circuits)
   - Ray diagrams (lenses, mirrors, refraction)
   - Graphs (P-V diagrams, V-I characteristics, waveforms)
   - Example: "In the circuit shown, find the current through resistor R2."

3. CALCULATION_MCQ (4% = ${Math.round(totalInBatch * 0.04)} questions):
   - Multi-step calculations requiring 3+ steps
   - Example: "A lens of focal length 20cm forms an image at 30cm. Find object distance and magnification."
   - Combination of multiple formulas

4. MATCH_FOLLOWING_MCQ (2% = ${Math.round(totalInBatch * 0.02)} questions):
   - Column I matched with Column II
   - Example: "Match the physical quantities in Column I with their SI units in Column II."

5. DEFINITIONAL_MCQ (2% = ${Math.round(totalInBatch * 0.02)} questions):
   - Definition-based questions
   - Example: "Which of the following correctly defines electric flux?"

6. ASSERTION_REASON_MCQ (2% = ${Math.round(totalInBatch * 0.02)} questions):
   - Statement verification questions
   - Example: "Assertion: Photoelectric current is independent of frequency. Reason: ..."

CRITICAL NEET CHARACTERISTICS:
- 70% numerical (with specific values), 30% conceptual
- NCERT-strict alignment (90%)
- Formula-heavy: Use standard NCERT formulas
- Single correct answer MCQ (4 options)
- Avoid: Multi-concept hybrid, overly theoretical questions
- Prefer: Clear numerical scenarios, direct applications

DO NOT over-generate diagram-based questions (common AI mistake). NEET is 80% simple recall!`;
  }

  // Determine questionType schema based on subject
  let questionTypeSchema = 'theory_conceptual|property_based|reaction_based|calculation|structure_based|application'; // Default: Chemistry

  if (examConfig.subject === 'Math') {
    questionTypeSchema = 'property_based|word_problem|computational|pattern_recognition|abstract';
  } else if (examConfig.subject === 'Physics') {
    questionTypeSchema = 'simple_recall_mcq|diagram_based_mcq|calculation_mcq|match_following_mcq|definitional_mcq|assertion_reason_mcq';
  } else if (examConfig.subject === 'Biology') {
    questionTypeSchema = 'factual_conceptual|diagram_based|match_column|statement_based|reasoning|application';
  }

  const prompt = `You are a World-Class Entrance Exam Question Architect for ${examConfig.examContext} ${examConfig.subject}.
BOARD EVALUATOR PERSONA: ${boardSignature} (Adopt this personality in question framing)

${rigorDirective}

${missionText}

${oracleMandate}

Generate a total of ${totalInBatch} ULTIMATE-RIGOR MCQ questions.

${difficultyMandate}
${questionTypeMandate}

SECTION TARGET: ${targetSection} (MANDATORY: Assign this to every question)

CONTEXT:
${syllabusText}

QUALITY MANDATE:
1. ZERO "Definition" questions. Use Scenario-based applications.
2. Focus on "The Prediction Gap": Create questions that pre-empt trends for ${new Date().getFullYear() + 1}.
3. RICH LEARNING CONTENT: Every question is a complete learning experience with comprehensive supporting material.
4. UNIQUENESS & VARIETY: Every question in this batch MUST be distinct. Do NOT repeat the same concept, scenario, or calculation pattern. Vary the numerical values and the cognitive angle.
5. LATEX: Use PROPER LaTeX ($...$ inline, $$...$$ display). Ensure all math commands like \\frac, \\sqrt, and \\int are correctly structured.
6. NO direct Theory questions. Focus on speed-tricks and analytical synthesis.

ENRICHMENT REQUIREMENTS (Make every field VALUABLE and CONTEXTUAL):
- Solution Steps: 4-5 detailed steps with clear reasoning, not just formulas
- Exam Tip: Strategic and actionable advice (2-3 sentences), avoid generic statements
- AI Reasoning: Deep strategic analysis (3-4 sentences) - what this tests, why it's placed here, board expectations
- Historical Pattern: Data-driven frequency analysis (2-3 sentences) with percentages if possible
- Mastery Material: Rich conceptual understanding with memory aids
- Memory Trigger: Actual mnemonics, acronyms, or clever memory tricks
- Visual Prompt: How to visualize/imagine the concept (metaphor, mental picture)
- Common Mistakes: 2-3 structured mistakes with psychology behind them
- Variations: Realistic KCET-style question twists and related concepts

Return ONLY a valid JSON array:
[
  {
    "text": "Question text with $proper \\\\LaTeX$...",
    "options": ["...", "...", "...", "..."],
    "correctOptionIndex": 0,
    "marks": ${examConfig.marksPerQuestion === 'variable' ? '1' : examConfig.marksPerQuestion},
    "difficulty": "Easy|Moderate|Hard",
    "topic": "Must match one of the topic names above",
    "questionType": "${questionTypeSchema}",
    "blooms": "Understand|Apply|Analyze|Evaluate",
    "solutionSteps": [
      "Step Title ::: Detailed explanation with reasoning (4-5 steps minimum, use LaTeX for math)"
    ],
    "examTip": "Strategic tip for exam day - practical and actionable (2-3 sentences, NOT generic)",
    "aiReasoning": "Strategic analysis: what this question tests, why it's placed here, board expectations, solving strategy (3-4 sentences with depth)",
    "historicalPattern": "Frequency in KCET/Karnataka exams (give % if known), how it appears, variations seen, confidence level (2-3 sentences with data)",
    "predictiveInsight": "Variation likely to see in future exams",
    "whyItMatters": "Real-world application or engineering/medical relevance",
    "studyTip": "Mastery shortcut or visualization technique (DEPRECATED - use examTip)",
    "masteryMaterial": {
      "coreConcept": "Deep conceptual explanation connecting theory to this question (3-4 sentences, build intuition)",
      "memoryTrigger": "Actual mnemonic, acronym, or memory trick that helps instant recall",
      "visualPrompt": "How to visualize or imagine this concept (metaphor, mental picture, diagram description)",
      "commonTrap": "What students typically confuse this with or get wrong (2 sentences)"
    },
    "commonMistakes": [
      {
        "mistake": "Specific wrong approach students take",
        "why": "Psychological/conceptual reason this mistake happens",
        "howToAvoid": "Concrete strategy to avoid this (actionable)"
      }
    ],
    "keyFormulas": [
      "$formula_1$ with brief when-to-use context",
      "$formula_2$ with application note"
    ],
    "thingsToRemember": [
      "Critical point 1 that students must remember",
      "Critical point 2 with specific detail",
      "4-6 must-remember facts as checklist"
    ],
    "questionVariations": [
      "Variation 1: How this could be twisted in future (with answer hint)",
      "Variation 2: Different angle on same concept",
      "4-5 realistic KCET-style variations"
    ],
    "conceptVariations": [
      "Related concept/theorem 1 students should know",
      "Related concept/theorem 2",
      "3-5 connected concepts or applications"
    ],
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
        const result: any = await withGeminiRetry(() => (ai.models as any).generateContent({
          model: AI_CONFIG.defaultModel,
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 16000,
            responseMimeType: 'application/json'
          }
        } as any));

        text = result.text || '[]';

        const { cleanJsonResponse } = await import('./aiParserUtils');
        const cleanedText = cleanJsonResponse(text);
        
        const questions = JSON.parse(cleanedText);
        const { randomUUID } = await import('crypto');
        return questions.map((q: any) => ({
          id: randomUUID(),
          text: q.text,
          options: q.options || [],
          marks: q.marks || examConfig.marksPerQuestion,
          difficulty: targetDifficulty || q.difficulty || 'Moderate',
          topic: q.topic,
          questionType: q.questionType || q.question_type || undefined,
          subject: examConfig.subject, // Unified Metadata
          examContext: examConfig.examContext, // Unified Metadata
          blooms: q.blooms || 'Apply',
          solutionSteps: q.solutionSteps || q.solution_steps || [],
          examTip: q.examTip || q.studyTip || q.exam_tip || '',
          studyTip: q.studyTip || q.study_tip || '',
          masteryMaterial: q.masteryMaterial || q.mastery_material || {},
          keyFormulas: q.keyFormulas || q.key_formulas || [],
          thingsToRemember: q.thingsToRemember || q.things_to_remember || [],
          questionVariations: q.questionVariations || q.question_variations || [],
          conceptVariations: q.conceptVariations || q.concept_variations || [],
          commonMistakes: q.commonMistakes || q.common_mistakes || [],
          pitfalls: (q.commonMistakes || q.pitfalls || []).map((m: any) => typeof m === 'object' ? m.mistake : m),
          aiReasoning: q.aiReasoning || q.ai_reasoning || '',
          historicalPattern: q.historicalPattern || q.historical_pattern || '',
          predictiveInsight: q.predictiveInsight || q.predictive_insight || '',
          whyItMatters: q.whyItMatters || q.why_it_matters || '',
          keyConcepts: q.keyConcepts || q.key_concepts || [],
          correctOptionIndex: q.correctOptionIndex ?? q.correct_option_index ?? 0,
          section: q.section || targetSection,
          source: `AI-Generated (Smart-Batch ${examConfig.examContext} ${examConfig.subject})`
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
    targetDifficulty?: 'Easy' | 'Moderate' | 'Hard';
  },
  geminiApiKey: string
): Promise<AnalyzedQuestion[]> {

  const { topicMetadata, questionCount, targetDifficulty } = params;

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
        return [];
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
    targetDifficulty?: 'Easy' | 'Moderate' | 'Hard';
  },
  geminiApiKey: string
): Promise<AnalyzedQuestion[]> {
  const { topicMetadata, questionCount, difficultyDistribution, examConfig, section: targetSection = 'Section A', targetDifficulty } = params;

  const { generationRules } = params;
  const rigorDirective = getExamRigorDirective(examConfig.examContext as ExamContext, examConfig.subject as Subject);
  
  const isOracle = generationRules?.oracleMode?.enabled;
  const oracleDirectives = generationRules?.oracleMode?.directives || [];
  const boardSignature = generationRules?.oracleMode?.boardSignature || 'SYNTHESIZER';

  console.log(`🎯 [REI v3.0] Step 3: Synthesizing Batch [${targetDifficulty?.toUpperCase() || 'CALIBRATED'}] for ${topicMetadata.topicName}...`);
  console.log(`📜 [REI v3.0] RAW MISSION: CORE EXAM PREDICTION (IDS Target: ${generationRules?.oracleMode?.idsTarget || 0.95})`);
  console.log(`📜 [REI v3.0] RAW DIRECTIVES: ${oracleDirectives.join(' | ')}`);

  const difficultyMandate = targetDifficulty 
    ? `MANDATORY DIFFICULTY TARGET: 
Every single question in this set MUST be classified as "${targetDifficulty}".
Failure to adhere to this will result in calibration failure. DO NOT vary difficulty within this set.`
    : `DIFFICULTY CALIBRATION:
- Foundation (Easy): ${Math.round(questionCount * difficultyDistribution.easy / 100)} - NOT trivial; must require concept recall.
- Target (Moderate): ${Math.round(questionCount * difficultyDistribution.moderate / 100)} - Requires 2-step reasoning.
- Elite (Hard): ${Math.round(questionCount * difficultyDistribution.hard / 100)} - Multi-concept; requires deep analytical synthesis.`;

  const prompt = `You are a World-Class Entrance Exam Question Architect specializing in ${examConfig.examContext} ${examConfig.subject}.
Your mission is to generate questions that are indistinguishable from the Most Competitive National Level Exam papers.
BOARD EVALUATOR PERSONA: ${boardSignature} (Adopt this personality in question framing)

${rigorDirective}

MISSION: PRE-EMPTIVE COMPETITIVE FORECAST
1. Your goal is to generate questions that pre-empt the expected "Recursive Evolution" of this topic for ${new Date().getFullYear() + 1}.
2. Focus on "The Prediction Gap": Create questions that are 'New Twists' never seen exactly in past papers but logical within current competitive trends.
3. TOPIC: ${topicMetadata.topicName}
4. CONTEXT: ${topicMetadata.syllabus}
5. REQUIRED BLOOM'S LEVELS: ${topicMetadata.bloomsLevels.join(', ')}
6. SECTION TARGET: ${targetSection} (Assign this to every question)

GENERATE: ${questionCount} ULTIMATE-RIGOR MCQ questions.

${difficultyMandate}

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

GENERATE EACH QUESTION WITH THE FOLLOWING RICH SCHEMA:
{
  "text": "Clear question with $proper \\\\LaTeX$ formatting",
  "options": ["A", "B", "C", "D"],
  "correctOptionIndex": 0,
  "difficulty": "Easy|Moderate|Hard",
  "section": "${targetSection}",
  "solutionSteps": [
    "Step Title ::: Detailed explanation with reasoning (4-5 steps minimum, use LaTeX for math)"
  ],
  "examTip": "Strategic tip for exam day - practical and actionable (2-3 sentences, NOT generic)",
  "aiReasoning": "Strategic analysis: what this tests, why it's placed here, board expectations, solving strategy (3-4 sentences with depth)",
  "historicalPattern": "Frequency in KCET/Karnataka exams (give % if known), how it appears, variations seen, confidence level (2-3 sentences with data)",
  "predictiveInsight": "Variation likely to see in future exams",
  "whyItMatters": "Real-world application or engineering/medical relevance",
  "masteryMaterial": {
    "coreConcept": "Deep conceptual explanation connecting theory to this question (3-4 sentences, build intuition)",
    "memoryTrigger": "Actual mnemonic, acronym, or memory trick that helps instant recall",
    "visualPrompt": "How to visualize or imagine this concept (metaphor, mental picture, diagram description)",
    "commonTrap": "What students typically confuse this with or get wrong (2 sentences)"
  },
  "markingSteps": [{"step": "logic point", "mark": "1"}],
  "commonMistakes": [
    {
      "mistake": "Specific wrong approach students take",
      "why": "Psychological/conceptual reason this mistake happens",
      "howToAvoid": "Concrete strategy to avoid this (actionable)"
    }
  ],
  "keyFormulas": [
    "$formula_1$ with brief when-to-use context",
    "$formula_2$ with application note"
  ],
  "thingsToRemember": [
    "Critical point 1 that students must remember",
    "Critical point 2 with specific detail",
    "4-6 must-remember facts as checklist"
  ],
  "questionVariations": [
    "Variation 1: How this could be twisted in future (with answer hint)",
    "Variation 2: Different angle on same concept",
    "4-5 realistic KCET-style variations"
  ],
  "conceptVariations": [
    "Related concept/theorem 1 students should know",
    "Related concept/theorem 2",
    "3-5 connected concepts or applications"
  ],
  "keyConcepts": [{"name": "...", "explanation": "..."}]
}

ENRICHMENT MANDATE FOR FLAGSHIP QUALITY:
- Solution Steps: 4-5 detailed steps with clear reasoning, not just formulas
- Exam Tip: Strategic and actionable advice (2-3 sentences), avoid generic statements
- AI Reasoning: Deep strategic analysis (3-4 sentences) - what this tests, why, board expectations
- Historical Pattern: Data-driven frequency (% if possible), variations, confidence level
- Mastery Material: Rich conceptual understanding with clever memory aids
- Memory Triggers: Actual mnemonics/acronyms (e.g. "SAD = Singular Adjoint Dead")
- Visual Prompts: Metaphors, mental pictures for visualization
- Common Mistakes: 2-3 structured with psychology and solutions
- Variations: Realistic KCET twists and related concepts

CRITICAL RIGOR MANDATE:
- NO generic "Check work" filler - every field must be VALUABLE
- Be specific about KCET/Karnataka syllabus patterns with data
- Use DOUBLE-BACKSLASH for internal LaTeX commands in JSON
- Never return empty arrays - populate with meaningful content
- Make every question a complete learning experience
CRITICAL: Output MUST be valid JSON with NO markdown, NO extra text, JUST THE ARRAY.`;

  console.log(`📡 [REI v3.0] FINAL SYNTHESIS PROMPT (PREVIEW):`, (prompt || '').substring(0, 500) + '...');

  try {
    const ai = getGeminiClient(geminiApiKey);

    const result: any = await withGeminiRetry(() => (ai.models as any).generateContent({
      model: AI_CONFIG.defaultModel,
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2, // Lower temperature for more stable structure
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 16000, // Increase for high-density flagship questions
        responseMimeType: 'application/json'
      }
    } as any));

    const text = result.text || '[]';
    
    const { cleanJsonResponse } = await import('./aiParserUtils');
    const cleanedText = cleanJsonResponse(text);
    
    const questions = JSON.parse(cleanedText);
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
      examTip: q.examTip || q.studyTip || q.exam_tip || '',
      studyTip: q.studyTip || q.study_tip || '',
      masteryMaterial: q.masteryMaterial || q.mastery_material || {},
      keyFormulas: q.keyFormulas || q.key_formulas || [],
      thingsToRemember: q.thingsToRemember || q.things_to_remember || [],
      questionVariations: q.questionVariations || q.question_variations || [],
      conceptVariations: q.conceptVariations || q.concept_variations || [],
      commonMistakes: q.commonMistakes || q.common_mistakes || [],
      pitfalls: (q.commonMistakes || q.pitfalls || []).map((m: any) => typeof m === 'object' ? m.mistake : m),
      aiReasoning: q.aiReasoning || q.ai_reasoning || '',
      historicalPattern: q.historicalPattern || q.historical_pattern || '',
      predictiveInsight: q.predictiveInsight || q.predictive_insight || '',
      whyItMatters: q.whyItMatters || q.why_it_matters || '',
      keyConcepts: q.keyConcepts || q.key_concepts || [],
      markingSteps: q.markingSteps || q.marking_steps || [],
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
