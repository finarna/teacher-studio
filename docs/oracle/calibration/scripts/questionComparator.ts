/**
 * Question Comparator - Multi-Dimensional Scoring Engine
 * Part of REI v16 Iterative Calibration System
 *
 * Compares generated vs actual questions across 5 dimensions:
 * 1. Identity Match (40%)
 * 2. Topic Match (20%)
 * 3. Difficulty Match (15%)
 * 4. Concept Similarity (15%)
 * 5. Solution Pattern Match (10%)
 */

import { getGeminiClient, withGeminiRetry } from '../../utils/geminiClient';

export interface AnalyzedQuestion {
  id?: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
  topic?: string;
  difficulty?: 'Easy' | 'Moderate' | 'Hard';
  identityId?: string;
  solution?: string;
  conceptTags?: string[];
  solutionSteps?: string[];
}

export interface QuestionComparisonScores {
  identityMatch: number;        // 0-1: Exact ID match
  topicMatch: number;            // 0-1: Same topic
  difficultyMatch: number;       // 0-1: Same E/M/H
  conceptSimilarity: number;     // 0-1: AI embedding similarity
  solutionPatternMatch: number;  // 0-1: Solution approach similarity
}

export interface QuestionComparisonResult {
  questionNumber: number;
  generated: AnalyzedQuestion;
  actual: AnalyzedQuestion;
  scores: QuestionComparisonScores;
  overallScore: number;  // Weighted average (threshold: 0.70 for "match")
  isMatch: boolean;      // overallScore >= 0.70
  discrepancies: string[];
}

export interface ComparisonSummary {
  totalQuestions: number;
  matches: number;
  matchRate: number;
  averageScore: number;
  topicAccuracy: number;
  difficultyAccuracy: number;
  identityHitRate: number;
  details: QuestionComparisonResult[];
}

/**
 * Compare two questions using multi-dimensional scoring
 */
export function compareQuestions(
  generated: AnalyzedQuestion,
  actual: AnalyzedQuestion,
  questionNumber: number
): QuestionComparisonResult {
  const scores: QuestionComparisonScores = {
    identityMatch: 0,
    topicMatch: 0,
    difficultyMatch: 0,
    conceptSimilarity: 0,
    solutionPatternMatch: 0
  };

  const discrepancies: string[] = [];

  // 1. Identity Match (40% weight) - Exact match on identity ID
  if (generated.identityId && actual.identityId) {
    const genId = normalizeIdentityId(generated.identityId);
    const actId = normalizeIdentityId(actual.identityId);

    if (genId === actId) {
      scores.identityMatch = 1.0;
    } else {
      scores.identityMatch = 0.0;
      discrepancies.push(`Identity mismatch: Generated=${generated.identityId}, Actual=${actual.identityId}`);
    }
  } else {
    // If identity not available, use partial credit based on topic similarity
    scores.identityMatch = 0.3;
    discrepancies.push(`Missing identity mapping`);
  }

  // 2. Topic Match (20% weight) - Same topic category
  if (generated.topic && actual.topic) {
    const genTopic = normalizeTopic(generated.topic);
    const actTopic = normalizeTopic(actual.topic);

    if (genTopic === actTopic) {
      scores.topicMatch = 1.0;
    } else if (areRelatedTopics(genTopic, actTopic)) {
      scores.topicMatch = 0.5;
      discrepancies.push(`Related topics: Generated=${generated.topic}, Actual=${actual.topic}`);
    } else {
      scores.topicMatch = 0.0;
      discrepancies.push(`Topic mismatch: Generated=${generated.topic}, Actual=${actual.topic}`);
    }
  } else {
    scores.topicMatch = 0.5; // Neutral if topic data missing
  }

  // 3. Difficulty Match (15% weight) - Same difficulty level
  if (generated.difficulty && actual.difficulty) {
    if (generated.difficulty === actual.difficulty) {
      scores.difficultyMatch = 1.0;
    } else if (areAdjacentDifficulties(generated.difficulty, actual.difficulty)) {
      scores.difficultyMatch = 0.5;
      discrepancies.push(`Adjacent difficulty: Generated=${generated.difficulty}, Actual=${actual.difficulty}`);
    } else {
      scores.difficultyMatch = 0.0;
      discrepancies.push(`Difficulty mismatch: Generated=${generated.difficulty}, Actual=${actual.difficulty}`);
    }
  } else {
    scores.difficultyMatch = 0.5; // Neutral if difficulty data missing
  }

  // 4. Concept Similarity (15% weight) - Based on concept tags
  if (generated.conceptTags && actual.conceptTags &&
      generated.conceptTags.length > 0 && actual.conceptTags.length > 0) {
    scores.conceptSimilarity = calculateConceptOverlap(generated.conceptTags, actual.conceptTags);

    if (scores.conceptSimilarity < 0.5) {
      discrepancies.push(`Low concept overlap: ${(scores.conceptSimilarity * 100).toFixed(1)}%`);
    }
  } else {
    // Fallback: Simple text similarity
    scores.conceptSimilarity = calculateTextSimilarity(generated.text, actual.text);
  }

  // 5. Solution Pattern Match (10% weight) - Based on solution steps
  if (generated.solutionSteps && actual.solutionSteps &&
      generated.solutionSteps.length > 0 && actual.solutionSteps.length > 0) {
    scores.solutionPatternMatch = calculateSolutionSimilarity(
      generated.solutionSteps,
      actual.solutionSteps
    );

    if (scores.solutionPatternMatch < 0.3) {
      discrepancies.push(`Different solution approach`);
    }
  } else {
    scores.solutionPatternMatch = 0.5; // Neutral if solution data missing
  }

  // Calculate weighted overall score
  const weights = {
    identityMatch: 0.40,
    topicMatch: 0.20,
    difficultyMatch: 0.15,
    conceptSimilarity: 0.15,
    solutionPatternMatch: 0.10
  };

  const overallScore =
    scores.identityMatch * weights.identityMatch +
    scores.topicMatch * weights.topicMatch +
    scores.difficultyMatch * weights.difficultyMatch +
    scores.conceptSimilarity * weights.conceptSimilarity +
    scores.solutionPatternMatch * weights.solutionPatternMatch;

  const isMatch = overallScore >= 0.70;

  return {
    questionNumber,
    generated,
    actual,
    scores,
    overallScore,
    isMatch,
    discrepancies
  };
}

/**
 * Compare entire papers using identity vector approach
 * (Papers can have different question orders/sets)
 */
export function compareQuestionsByPosition(
  generatedPaper: AnalyzedQuestion[],
  actualPaper: AnalyzedQuestion[]
): QuestionComparisonResult[] {
  // Extract identity vectors from both papers
  const generatedVector = extractIdentityVector(generatedPaper);
  const actualVector = extractIdentityVector(actualPaper);

  // For detailed comparison, use best-match pairing (simplified bipartite matching)
  const results = performBestMatchComparison(generatedPaper, actualPaper);

  return results;
}

/**
 * Extract identity vector (identity -> count) from paper
 */
function extractIdentityVector(paper: AnalyzedQuestion[]): Record<string, number> {
  const vector: Record<string, number> = {};

  for (const question of paper) {
    const id = normalizeIdentityId(question.identityId || 'UNKNOWN');
    vector[id] = (vector[id] || 0) + 1;
  }

  return vector;
}

/**
 * Perform best-match comparison (greedy approach)
 * For each generated question, find the best matching actual question
 */
function performBestMatchComparison(
  generatedPaper: AnalyzedQuestion[],
  actualPaper: AnalyzedQuestion[]
): QuestionComparisonResult[] {
  const results: QuestionComparisonResult[] = [];
  const usedActualIndices = new Set<number>();

  // For each generated question, find best match in actual paper
  for (let genIdx = 0; genIdx < generatedPaper.length; genIdx++) {
    const generated = generatedPaper[genIdx];
    let bestMatch: { question: AnalyzedQuestion; index: number; score: number } | null = null;

    // Find best matching actual question (not yet used)
    for (let actIdx = 0; actIdx < actualPaper.length; actIdx++) {
      if (usedActualIndices.has(actIdx)) continue;

      const actual = actualPaper[actIdx];
      const tempResult = compareQuestions(generated, actual, genIdx + 1);

      if (!bestMatch || tempResult.overallScore > bestMatch.score) {
        bestMatch = {
          question: actual,
          index: actIdx,
          score: tempResult.overallScore
        };
      }
    }

    if (bestMatch) {
      usedActualIndices.add(bestMatch.index);
      const result = compareQuestions(generated, bestMatch.question, genIdx + 1);
      results.push(result);
    } else {
      // No match found (shouldn't happen if papers are same length)
      const result = compareQuestions(
        generated,
        createPlaceholderQuestion('Actual'),
        genIdx + 1
      );
      results.push(result);
    }
  }

  return results;
}

/**
 * Compute summary statistics from comparison results
 */
export function computeComparisonSummary(
  results: QuestionComparisonResult[]
): ComparisonSummary {
  const totalQuestions = results.length;
  const matches = results.filter(r => r.isMatch).length;
  const matchRate = matches / totalQuestions;

  const totalScore = results.reduce((sum, r) => sum + r.overallScore, 0);
  const averageScore = totalScore / totalQuestions;

  const topicMatches = results.filter(r => r.scores.topicMatch >= 0.9).length;
  const topicAccuracy = topicMatches / totalQuestions;

  const difficultyMatches = results.filter(r => r.scores.difficultyMatch >= 0.9).length;
  const difficultyAccuracy = difficultyMatches / totalQuestions;

  const identityMatches = results.filter(r => r.scores.identityMatch >= 0.9).length;
  const identityHitRate = identityMatches / totalQuestions;

  return {
    totalQuestions,
    matches,
    matchRate,
    averageScore,
    topicAccuracy,
    difficultyAccuracy,
    identityHitRate,
    details: results
  };
}

/**
 * Compare papers using identity vector approach (whole-paper comparison)
 * This is more accurate for papers with shuffled question orders
 */
export function comparePapersUsingIdentityVectors(
  generatedPaper: AnalyzedQuestion[],
  actualPaper: AnalyzedQuestion[]
): ComparisonSummary {
  // Extract identity vectors
  const generatedVector = extractIdentityVector(generatedPaper);
  const actualVector = extractIdentityVector(actualPaper);

  // Extract topic distributions
  const generatedTopics = extractTopicDistribution(generatedPaper);
  const actualTopics = extractTopicDistribution(actualPaper);

  // Extract difficulty distributions
  const generatedDifficulty = extractDifficultyDistribution(generatedPaper);
  const actualDifficulty = extractDifficultyDistribution(actualPaper);

  // Compute identity hit rate (Jaccard similarity of identity sets)
  const identityHitRate = computeIdentityHitRate(generatedVector, actualVector);

  // Compute topic accuracy (how well topic distribution matches)
  const topicAccuracy = computeDistributionSimilarity(generatedTopics, actualTopics);

  // Compute difficulty accuracy (how well difficulty distribution matches)
  const difficultyAccuracy = computeDistributionSimilarity(generatedDifficulty, actualDifficulty);

  // Overall match rate is weighted average
  const matchRate = (
    identityHitRate * 0.50 +        // 50% weight on identity matching
    topicAccuracy * 0.30 +           // 30% weight on topic distribution
    difficultyAccuracy * 0.20        // 20% weight on difficulty distribution
  );

  const averageScore = matchRate; // For aggregate comparison, these are the same

  // Generate detailed comparison for reporting (using best-match)
  const detailedResults = performBestMatchComparison(generatedPaper, actualPaper);

  return {
    totalQuestions: generatedPaper.length,
    matches: Math.round(matchRate * generatedPaper.length),
    matchRate,
    averageScore,
    topicAccuracy,
    difficultyAccuracy,
    identityHitRate,
    details: detailedResults
  };
}

/**
 * Extract topic distribution (topic -> count)
 */
function extractTopicDistribution(paper: AnalyzedQuestion[]): Record<string, number> {
  const distribution: Record<string, number> = {};

  for (const question of paper) {
    const topic = normalizeTopic(question.topic || 'Unknown');
    distribution[topic] = (distribution[topic] || 0) + 1;
  }

  return distribution;
}

/**
 * Extract difficulty distribution (difficulty -> count)
 */
function extractDifficultyDistribution(paper: AnalyzedQuestion[]): Record<string, number> {
  const distribution: Record<string, number> = {
    'easy': 0,
    'moderate': 0,
    'hard': 0
  };

  for (const question of paper) {
    const diff = (question.difficulty || 'Moderate').toLowerCase();
    distribution[diff] = (distribution[diff] || 0) + 1;
  }

  return distribution;
}

/**
 * Compute identity hit rate using Jaccard similarity
 * IHR = |Generated ∩ Actual| / |Generated ∪ Actual|
 */
function computeIdentityHitRate(
  generatedVector: Record<string, number>,
  actualVector: Record<string, number>
): number {
  const generatedIds = new Set(Object.keys(generatedVector).filter(id => id !== 'UNKNOWN'));
  const actualIds = new Set(Object.keys(actualVector).filter(id => id !== 'UNKNOWN'));

  if (generatedIds.size === 0 && actualIds.size === 0) return 1.0;
  if (generatedIds.size === 0 || actualIds.size === 0) return 0.0;

  // Intersection: identities that appear in both
  const intersection = new Set([...generatedIds].filter(id => actualIds.has(id)));

  // Union: all unique identities
  const union = new Set([...generatedIds, ...actualIds]);

  return intersection.size / union.size;
}

/**
 * Compute distribution similarity (normalized L1 distance)
 * Returns 1.0 for identical distributions, 0.0 for completely different
 */
function computeDistributionSimilarity(
  dist1: Record<string, number>,
  dist2: Record<string, number>
): number {
  // Normalize distributions to percentages
  const total1 = Object.values(dist1).reduce((sum, v) => sum + v, 0);
  const total2 = Object.values(dist2).reduce((sum, v) => sum + v, 0);

  if (total1 === 0 && total2 === 0) return 1.0;
  if (total1 === 0 || total2 === 0) return 0.0;

  const norm1: Record<string, number> = {};
  const norm2: Record<string, number> = {};

  for (const key in dist1) {
    norm1[key] = dist1[key] / total1;
  }

  for (const key in dist2) {
    norm2[key] = dist2[key] / total2;
  }

  // Compute L1 distance
  const allKeys = new Set([...Object.keys(norm1), ...Object.keys(norm2)]);
  let distance = 0;

  for (const key of allKeys) {
    const val1 = norm1[key] || 0;
    const val2 = norm2[key] || 0;
    distance += Math.abs(val1 - val2);
  }

  // Convert distance to similarity (1 - distance/2)
  // L1 distance ranges from 0 to 2, so we divide by 2
  return 1.0 - (distance / 2);
}

/**
 * Enhanced comparison using AI for semantic similarity
 * (Optional - for higher accuracy, uses AI to compare question semantics)
 */
export async function compareQuestionsWithAI(
  generated: AnalyzedQuestion,
  actual: AnalyzedQuestion,
  questionNumber: number,
  geminiApiKey: string
): Promise<QuestionComparisonResult> {
  // Start with basic comparison
  const baseResult = compareQuestions(generated, actual, questionNumber);

  try {
    const ai = getGeminiClient(geminiApiKey);

    const prompt = `You are an expert exam question analyzer. Compare these two math questions and rate their similarity.

GENERATED QUESTION:
${generated.text}
Topic: ${generated.topic || 'Unknown'}
Difficulty: ${generated.difficulty || 'Unknown'}
Identity: ${generated.identityId || 'Unknown'}

ACTUAL QUESTION:
${actual.text}
Topic: ${actual.topic || 'Unknown'}
Difficulty: ${actual.difficulty || 'Unknown'}
Identity: ${actual.identityId || 'Unknown'}

Rate the similarity on these dimensions (0.0 to 1.0):
1. Concept Similarity: Are they testing the same mathematical concept?
2. Solution Pattern: Do they require the same solution approach?

Return ONLY valid JSON:
{
  "conceptSimilarity": 0.85,
  "solutionPatternMatch": 0.75,
  "reasoning": "Brief explanation"
}`;

    const result = await withGeminiRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    }));

    const text = (result.text || "{}").trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    const aiScores = JSON.parse(cleaned);

    // Override concept and solution scores with AI-based scores
    if (aiScores.conceptSimilarity !== undefined) {
      baseResult.scores.conceptSimilarity = Math.max(0, Math.min(1, aiScores.conceptSimilarity));
    }
    if (aiScores.solutionPatternMatch !== undefined) {
      baseResult.scores.solutionPatternMatch = Math.max(0, Math.min(1, aiScores.solutionPatternMatch));
    }

    // Recalculate overall score
    const weights = {
      identityMatch: 0.40,
      topicMatch: 0.20,
      difficultyMatch: 0.15,
      conceptSimilarity: 0.15,
      solutionPatternMatch: 0.10
    };

    baseResult.overallScore =
      baseResult.scores.identityMatch * weights.identityMatch +
      baseResult.scores.topicMatch * weights.topicMatch +
      baseResult.scores.difficultyMatch * weights.difficultyMatch +
      baseResult.scores.conceptSimilarity * weights.conceptSimilarity +
      baseResult.scores.solutionPatternMatch * weights.solutionPatternMatch;

    baseResult.isMatch = baseResult.overallScore >= 0.70;

  } catch (error) {
    console.warn(`⚠️ AI comparison failed for Q${questionNumber}, using basic scores:`, error);
  }

  return baseResult;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeIdentityId(id: string): string {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeTopic(topic: string): string {
  return topic.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[&\-]/g, ' ');
}

function areRelatedTopics(topic1: string, topic2: string): boolean {
  const relatedGroups = [
    ['sets', 'relations', 'functions'],
    ['trigonometry', 'inverse trigonometry', 'trigonometric functions'],
    ['complex numbers', 'quadratic equations'],
    ['permutations', 'combinations', 'probability'],
    ['matrices', 'determinants'],
    ['limits', 'derivatives', 'continuity', 'differentiability'],
    ['integrals', 'application of integrals'],
    ['vectors', 'vector algebra', '3d geometry'],
    ['straight lines', 'conic sections', 'circles']
  ];

  for (const group of relatedGroups) {
    const topic1Match = group.some(t => topic1.includes(t));
    const topic2Match = group.some(t => topic2.includes(t));
    if (topic1Match && topic2Match) return true;
  }

  return false;
}

function areAdjacentDifficulties(
  diff1: 'Easy' | 'Moderate' | 'Hard',
  diff2: 'Easy' | 'Moderate' | 'Hard'
): boolean {
  const levels = { 'Easy': 1, 'Moderate': 2, 'Hard': 3 };
  const diff = Math.abs(levels[diff1] - levels[diff2]);
  return diff === 1;
}

function calculateConceptOverlap(tags1: string[], tags2: string[]): number {
  if (tags1.length === 0 && tags2.length === 0) return 1.0;
  if (tags1.length === 0 || tags2.length === 0) return 0.0;

  const set1 = new Set(tags1.map(t => t.toLowerCase()));
  const set2 = new Set(tags2.map(t => t.toLowerCase()));

  const intersection = new Set([...set1].filter(t => set2.has(t)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size; // Jaccard similarity
}

function calculateTextSimilarity(text1: string, text2: string): number {
  // Simple word-level Jaccard similarity
  const words1 = text1.toLowerCase().match(/\w+/g) || [];
  const words2 = text2.toLowerCase().match(/\w+/g) || [];

  if (words1.length === 0 && words2.length === 0) return 1.0;
  if (words1.length === 0 || words2.length === 0) return 0.0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter(w => set2.has(w)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

function calculateSolutionSimilarity(steps1: string[], steps2: string[]): number {
  if (steps1.length === 0 && steps2.length === 0) return 1.0;
  if (steps1.length === 0 || steps2.length === 0) return 0.0;

  // Check if number of steps is similar
  const lengthRatio = Math.min(steps1.length, steps2.length) / Math.max(steps1.length, steps2.length);

  // Check text similarity of steps
  let totalSimilarity = 0;
  const minLength = Math.min(steps1.length, steps2.length);

  for (let i = 0; i < minLength; i++) {
    totalSimilarity += calculateTextSimilarity(steps1[i], steps2[i]);
  }

  const avgSimilarity = minLength > 0 ? totalSimilarity / minLength : 0;

  return (lengthRatio * 0.3) + (avgSimilarity * 0.7);
}

function createPlaceholderQuestion(type: 'Generated' | 'Actual'): AnalyzedQuestion {
  return {
    text: `[${type} question missing]`,
    topic: 'Unknown',
    difficulty: 'Moderate',
    identityId: 'UNKNOWN',
    conceptTags: [],
    solutionSteps: []
  };
}
