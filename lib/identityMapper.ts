/**
 * Identity Mapper - Maps questions to CHM-XXX/PHY-XXX/MAT-XXX identities
 * Based on topic matching from calibrated identity banks
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Cache for loaded identity banks
const identityBankCache: Map<string, any> = new Map();

/**
 * Load identity bank for a subject
 */
function loadIdentityBank(subject: string, exam: string): any {
  const cacheKey = `${exam}_${subject}`;

  if (identityBankCache.has(cacheKey)) {
    return identityBankCache.get(cacheKey);
  }

  try {
    // Support both ES modules and CommonJS
    let __dirname: string;
    if (typeof __filename !== 'undefined') {
      __dirname = path.dirname(__filename);
    } else {
      const __filename = fileURLToPath(import.meta.url);
      __dirname = path.dirname(__filename);
    }

    const bankPath = path.join(__dirname, `oracle/identities/${exam.toLowerCase()}_${subject.toLowerCase()}.json`);

    if (!fs.existsSync(bankPath)) {
      console.warn(`⚠️  Identity bank not found: ${bankPath}`);
      return null;
    }

    const bankData = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
    identityBankCache.set(cacheKey, bankData);
    return bankData;
  } catch (error) {
    console.error(`❌ Failed to load identity bank for ${subject} (${exam}):`, error);
    return null;
  }
}

/**
 * Normalize topic name for matching
 */
function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Calculate similarity score between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeTopic(str1);
  const s2 = normalizeTopic(str2);

  // Exact match
  if (s1 === s2) return 1.0;

  // Contains match (higher score if it's a substring)
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Word overlap
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));

  if (commonWords.length > 0) {
    return 0.5 + (0.3 * commonWords.length / Math.max(words1.length, words2.length));
  }

  return 0.0;
}

/**
 * Map a question to an identity ID
 */
export function mapQuestionToIdentity(
  questionTopic: string,
  subject: string,
  exam: string,
  options?: {
    minConfidence?: number; // Minimum identity confidence to consider (default: 0.5)
    preferHighYield?: boolean; // Prefer high-yield identities (default: true)
  }
): string | null {
  const { minConfidence = 0.5, preferHighYield = true } = options || {};

  const bank = loadIdentityBank(subject, exam);

  if (!bank || !bank.identities || bank.identities.length === 0) {
    return null;
  }

  // Find matching identities
  const matches = bank.identities
    .filter((identity: any) => identity.confidence >= minConfidence)
    .map((identity: any) => ({
      identity,
      similarity: calculateSimilarity(questionTopic, identity.topic)
    }))
    .filter((match: any) => match.similarity > 0.4); // Only consider reasonable matches

  if (matches.length === 0) {
    return null;
  }

  // Sort by similarity, then by confidence, optionally preferring high-yield
  matches.sort((a: any, b: any) => {
    // First by similarity
    if (Math.abs(a.similarity - b.similarity) > 0.1) {
      return b.similarity - a.similarity;
    }

    // Then by high-yield (if preferred)
    if (preferHighYield) {
      const aHighYield = a.identity.high_yield ? 1 : 0;
      const bHighYield = b.identity.high_yield ? 1 : 0;
      if (aHighYield !== bHighYield) {
        return bHighYield - aHighYield;
      }
    }

    // Finally by confidence
    return b.identity.confidence - a.identity.confidence;
  });

  return matches[0].identity.id;
}

/**
 * Batch map multiple questions to identities
 */
export function mapQuestionsToIdentities(
  questions: Array<{ topic: string; id?: string; [key: string]: any }>,
  subject: string,
  exam: string,
  options?: {
    minConfidence?: number;
    preferHighYield?: boolean;
  }
): Array<{ questionId?: string; identityId: string | null }> {
  return questions.map(q => ({
    questionId: q.id,
    identityId: mapQuestionToIdentity(q.topic, subject, exam, options)
  }));
}

/**
 * Get identity bank statistics
 */
export function getIdentityBankStats(subject: string, exam: string): any {
  const bank = loadIdentityBank(subject, exam);

  if (!bank || !bank.identities) {
    return null;
  }

  const highYield = bank.identities.filter((i: any) => i.high_yield).length;
  const avgConfidence = bank.identities.reduce((sum: number, i: any) => sum + i.confidence, 0) / bank.identities.length;

  const topicCounts: Record<string, number> = {};
  bank.identities.forEach((i: any) => {
    topicCounts[i.topic] = (topicCounts[i.topic] || 0) + 1;
  });

  return {
    version: bank.version,
    totalIdentities: bank.identities.length,
    highYieldCount: highYield,
    averageConfidence: avgConfidence.toFixed(3),
    topicDistribution: topicCounts,
    topTopics: Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }))
  };
}
