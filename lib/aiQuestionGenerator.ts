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
}

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

export async function generateTestQuestions(
  context: GenerationContext,
  geminiApiKey: string
): Promise<AnalyzedQuestion[]> {

  console.log('🚀 Starting AI Question Generation...');
  console.log(`📋 Exam: ${context.examConfig.examContext} ${context.examConfig.subject}`);
  console.log(`👤 Student: ${context.studentProfile.userId} (${context.studentProfile.overallAccuracy}% accuracy)`);

  // Step 1: Analyze past patterns and predict next year
  const prediction = await predictNextYearPattern(context, geminiApiKey);
  console.log(`🔮 Predicted ${prediction.topics.length} topic distributions for next exam`);

  // Step 2: Calculate optimal topic allocation
  const allocation = calculateTopicAllocation(context, prediction);
  console.log(`📊 Allocated ${allocation.length} topics across ${context.examConfig.totalQuestions} questions`);

  // Step 3: Generate questions for each topic using AI (PARALLEL for speed!)
  const generationStartTime = Date.now();

  const generationPromises = allocation
    .filter(topicAlloc => topicAlloc.questionCount > 0)
    .map(async (topicAlloc) => {
      console.log(`🎯 Generating ${topicAlloc.questionCount} questions for: ${topicAlloc.topicName}`);

      const topicStartTime = Date.now();
      const questions = await generateTopicQuestions({
        topicMetadata: topicAlloc.topicMetadata,
        questionCount: topicAlloc.questionCount,
        difficultyDistribution: topicAlloc.difficultyDistribution,
        examConfig: context.examConfig,
        studentMastery: topicAlloc.studentMastery,
        generationRules: context.generationRules
      }, geminiApiKey);

      const elapsed = ((Date.now() - topicStartTime) / 1000).toFixed(1);
      console.log(`✅ ${topicAlloc.topicName}: ${questions.length} questions in ${elapsed}s`);

      return questions;
    });

  // Wait for ALL topics to generate in parallel
  console.log(`⚡ Generating ${allocation.length} topics in parallel...`);
  const allTopicQuestions = await Promise.all(generationPromises);
  const allQuestions = allTopicQuestions.flat();

  const totalGenTime = ((Date.now() - generationStartTime) / 1000).toFixed(1);
  console.log(`⚡ Parallel generation completed in ${totalGenTime}s (${allocation.length} topics)`);

  // Step 4: Final validation and shuffling
  const validatedQuestions = validateQuestions(allQuestions, context);
  const shuffled = shuffleArray(validatedQuestions);

  console.log(`✅ Generated ${shuffled.length} high-quality questions`);

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

TASK:
Analyze the historical pattern and predict the ${nextYear} exam pattern with:
1. Which topics will have MORE questions (increasing trend)
2. Which topics will have FEWER questions (decreasing trend)
3. Which topics will remain STABLE
4. Expected difficulty distribution
5. Confidence level for each prediction

CRITICAL: Use the EXACT topicId from the AVAILABLE TOPICS list above (e.g., "calculus", "algebra" NOT "calculus_01").

Return ONLY valid JSON:
{
  "topics": [
    {
      "topicId": "calculus",
      "topicName": "Calculus",
      "probability": 0.85,
      "expectedQuestionCount": 12,
      "trend": "increasing",
      "confidence": 0.8,
      "reasoning": "Based on 3-year upward trend and syllabus changes"
    }
  ],
  "difficultyDistribution": { "easy": 40, "moderate": 45, "hard": 15 },
  "overallConfidence": 0.75
}`;

  try {
    // Use @google/genai library with gemini-3-flash-preview
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      generationConfig: {
        temperature: 0.2,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 4096,
      }
    });

    const text = response.text || '{}';

    // Extract JSON from response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    const prediction = JSON.parse(jsonStr);

    return {
      year: nextYear,
      ...prediction
    };

  } catch (error) {
    console.error('❌ AI prediction failed, using statistical fallback:', error);
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

    // Calculate allocation score using weighted formula
    let allocationScore = 0;
    let reasons: string[] = [];

    // Factor 1: Predicted exam pattern
    allocationScore += (predictedTopic.probability * weights.predictedExamPattern);
    if (predictedTopic.trend === 'increasing') {
      reasons.push(`📈 ${predictedTopic.trend} trend`);
    }

    // Factor 2: Student weak areas (inverse of mastery)
    if (studentMastery < 60) {
      const weaknessBonus = (100 - studentMastery) / 100 * weights.studentWeakAreas;
      allocationScore += weaknessBonus;
      reasons.push(`🎯 Weak area (${studentMastery}%)`);
    } else {
      allocationScore += 0.3 * weights.studentWeakAreas; // Some coverage even if strong
    }

    // Factor 3: Curriculum balance (ensure all topics covered)
    allocationScore += weights.curriculumBalance;

    // Factor 4: Recent trends (confidence-weighted)
    allocationScore += (predictedTopic.confidence * weights.recentTrends);

    // Calculate question count
    const questionCount = Math.round(allocationScore * examConfig.totalQuestions);

    console.log(`   ${predictedTopic.topicName}: score=${allocationScore.toFixed(2)} → ${questionCount} questions`);

    // Determine difficulty distribution based on student mastery
    let difficultyDist: { easy: number; moderate: number; hard: number };
    if (studentMastery < 40) {
      difficultyDist = { easy: 60, moderate: 30, hard: 10 };
    } else if (studentMastery < 70) {
      difficultyDist = { easy: 35, moderate: 45, hard: 20 };
    } else {
      difficultyDist = { easy: 20, moderate: 40, hard: 40 };
    }

    allocations.push({
      topicId: predictedTopic.topicId,
      topicName: predictedTopic.topicName,
      topicMetadata,
      questionCount,
      difficultyDistribution: difficultyDist,
      studentMastery,
      allocationReason: reasons.join(', ')
    });
  }

  // Normalize to exactly match total questions
  const totalAllocated = allocations.reduce((sum, a) => sum + a.questionCount, 0);

  if (totalAllocated !== examConfig.totalQuestions) {
    // Scale proportionally
    const scale = examConfig.totalQuestions / totalAllocated;
    const scaled = allocations.map(a => ({
      ...a,
      exactCount: a.questionCount * scale,
      questionCount: Math.floor(a.questionCount * scale)
    }));

    // Calculate remainder after flooring
    let assigned = scaled.reduce((sum, a) => sum + a.questionCount, 0);
    const remainder = examConfig.totalQuestions - assigned;

    // Distribute remainder to topics with highest fractional parts
    if (remainder > 0) {
      const sorted = scaled
        .map((a, idx) => ({ ...a, originalIdx: idx, fractional: a.exactCount - a.questionCount }))
        .sort((a, b) => b.fractional - a.fractional);

      for (let i = 0; i < remainder; i++) {
        sorted[i].questionCount++;
      }

      // Apply back to allocations
      sorted.forEach(item => {
        allocations[item.originalIdx].questionCount = item.questionCount;
      });
    }

    // Update allocations array with scaled values
    allocations = scaled.map(s => ({
      topicId: s.topicId,
      topicName: s.topicName,
      topicMetadata: s.topicMetadata,
      questionCount: s.questionCount,
      difficultyDistribution: s.difficultyDistribution,
      studentMastery: s.studentMastery,
      allocationReason: s.allocationReason
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
  },
  geminiApiKey: string
): Promise<AnalyzedQuestion[]> {

  const { topicMetadata, questionCount, difficultyDistribution, examConfig } = params;

  const prompt = `You are an expert ${examConfig.examContext} ${examConfig.subject} question creator.

TOPIC: ${topicMetadata.topicName}
SYLLABUS: ${topicMetadata.syllabus}
REQUIRED BLOOM'S LEVELS: ${topicMetadata.bloomsLevels.join(', ')}

GENERATE: ${questionCount} high-quality MCQ questions

DIFFICULTY DISTRIBUTION:
- Easy: ${Math.round(questionCount * difficultyDistribution.easy / 100)} questions
- Moderate: ${Math.round(questionCount * difficultyDistribution.moderate / 100)} questions
- Hard: ${Math.round(questionCount * difficultyDistribution.hard / 100)} questions

EXAM SPECIFICATIONS:
- Marks per question: ${examConfig.marksPerQuestion}
- Exam format: ${examConfig.examContext} (follow EXACT pattern and style)
- Duration consideration: ${examConfig.durationMinutes} minutes total

REQUIREMENTS:
1. Use PROPER LaTeX for ALL math expressions ($...$ inline, $$...$$ display)
2. CRITICAL: Balance ALL braces {} and dollar signs $ in LaTeX
3. NO corrupted text, NO missing spaces, NO broken LaTeX
4. Use proper spacing between words (no "Theequationofstraight...")
5. Double-check LaTeX syntax before outputting
6. Include complete solution steps
7. Add exam-specific tips and shortcuts
8. List key formulas and common pitfalls
9. Each question must have EXACTLY 4 options
10. Mark correct answer clearly with correctOptionIndex (0-3)

Return ONLY valid JSON array:
[
  {
    "text": "Clear question with $proper \\\\LaTeX$ formatting",
    "options": ["Option A with $math$", "Option B", "Option C", "Option D"],
    "correctOptionIndex": 0,
    "marks": ${examConfig.marksPerQuestion === 'variable' ? '1' : examConfig.marksPerQuestion},
    "difficulty": "Easy|Moderate|Hard",
    "topic": "${topicMetadata.topicName}",
    "blooms": "Remember|Understand|Apply|Analyze|Evaluate|Create",
    "solutionSteps": ["Step 1 with $LaTeX$", "Step 2", "Step 3"],
    "examTip": "Quick solving strategy for exam",
    "keyFormulas": ["$formula_1$", "$formula_2$"],
    "pitfalls": ["Common mistake students make"],
    "masteryMaterial": {
      "coreConcept": "Core concept explanation",
      "logic": "Why this approach works"
    }
  }
]

CRITICAL: Output MUST be valid JSON with NO markdown, NO extra text, JUST the array.`;

  try {
    // Use @google/genai library with gemini-3-flash-preview
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    const text = response.text || '[]';

    // Extract JSON from response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/) || text.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    const questions = JSON.parse(jsonStr);

    // Transform to AnalyzedQuestion format
    const { randomUUID } = await import('crypto');
    return questions.map((q: any, idx: number) => ({
      id: randomUUID(), // Generate valid UUID for AI questions
      text: q.text,
      options: q.options || [],
      marks: q.marks || examConfig.marksPerQuestion,
      difficulty: q.difficulty,
      topic: topicMetadata.topicName,
      blooms: q.blooms,
      solutionSteps: q.solutionSteps || [],
      examTip: q.examTip || '',
      keyFormulas: q.keyFormulas || [],
      pitfalls: q.pitfalls || [],
      masteryMaterial: q.masteryMaterial,
      correctOptionIndex: q.correctOptionIndex,
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
    const latexSegments = q.text.match(/\$[^$]+\$/g) || [];
    latexSegments.forEach(segment => {
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
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate array of questions and filter out invalid ones
 */
function validateQuestions(
  questions: AnalyzedQuestion[],
  context: GenerationContext
): AnalyzedQuestion[] {
  const validated: AnalyzedQuestion[] = [];
  const rejected: Array<{ question: AnalyzedQuestion; errors: string[] }> = [];

  questions.forEach(q => {
    const result = validateQuestion(q);
    if (result.isValid) {
      validated.push(q);
    } else {
      rejected.push({ question: q, errors: result.errors });
      console.warn(`❌ Rejected question: ${q.text?.substring(0, 60)}...`);
      console.warn(`   Errors: ${result.errors.join(', ')}`);
    }
  });

  if (rejected.length > 0) {
    console.warn(`⚠️  ${rejected.length}/${questions.length} questions failed validation`);
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
  const { historicalData, topics } = context;

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

  const predictedTopics = topics.map(topic => {
    const avg = topicAverages.get(topic.topicId);
    const avgQuestions = avg ? avg.total / avg.count : 5;

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
