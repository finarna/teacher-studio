/**
 * Semantic Similarity Matcher - Next-Gen Identity Matching
 *
 * Replaces exact-match with AI embeddings + cosine similarity
 * Expected improvement: IHR 35% → 55-60%, Match Rate 57% → 72-78%
 */

import { getGeminiClient, withGeminiRetry } from '../../utils/geminiClient';

export interface IdentityEmbedding {
  identityId: string;
  name: string;
  topic: string;
  logic: string;
  embedding: number[];
}

export interface SimilarityScore {
  identityId: string;
  score: number; // 0.0 to 1.0
  category: 'exact' | 'very_similar' | 'related' | 'same_topic' | 'different';
}

/**
 * Compute cosine similarity between two embedding vectors
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

/**
 * Generate embedding for an identity using Gemini
 */
export async function generateIdentityEmbedding(identity: {
  id: string;
  name: string;
  topic: string;
  logic: string;
}): Promise<IdentityEmbedding> {
  const gemini = getGeminiClient();

  // Create a rich text representation of the identity
  const identityText = `
Physics Identity: ${identity.name}
Topic: ${identity.topic}
Logic: ${identity.logic}
  `.trim();

  try {
    const result = await withGeminiRetry(async () => {
      return await gemini.embedContent({
        content: { parts: [{ text: identityText }] },
        model: 'text-embedding-004'
      });
    });

    return {
      identityId: identity.id,
      name: identity.name,
      topic: identity.topic,
      logic: identity.logic,
      embedding: result.embedding.values
    };
  } catch (error) {
    console.error(`Failed to generate embedding for ${identity.id}:`, error);
    // Return zero embedding as fallback
    return {
      identityId: identity.id,
      name: identity.name,
      topic: identity.topic,
      logic: identity.logic,
      embedding: new Array(768).fill(0) // text-embedding-004 dimension
    };
  }
}

/**
 * Generate embedding for a question
 */
export async function generateQuestionEmbedding(question: {
  text: string;
  topic?: string;
  difficulty?: string;
}): Promise<number[]> {
  const gemini = getGeminiClient();

  const questionText = `
Physics Question
${question.topic ? `Topic: ${question.topic}` : ''}
${question.difficulty ? `Difficulty: ${question.difficulty}` : ''}
Question: ${question.text}
  `.trim();

  try {
    const result = await withGeminiRetry(async () => {
      return await gemini.embedContent({
        content: { parts: [{ text: questionText }] },
        model: 'text-embedding-004'
      });
    });

    return result.embedding.values;
  } catch (error) {
    console.error('Failed to generate question embedding:', error);
    return new Array(768).fill(0);
  }
}

/**
 * Find best matching identity using semantic similarity
 */
export function findBestMatch(
  questionEmbedding: number[],
  identityEmbeddings: IdentityEmbedding[],
  questionTopic?: string
): SimilarityScore {
  let bestMatch: SimilarityScore = {
    identityId: 'UNKNOWN',
    score: 0,
    category: 'different'
  };

  for (const identity of identityEmbeddings) {
    const similarity = cosineSimilarity(questionEmbedding, identity.embedding);

    // Boost similarity if topics match
    let adjustedSimilarity = similarity;
    if (questionTopic && identity.topic === questionTopic) {
      adjustedSimilarity = Math.min(1.0, similarity * 1.1); // 10% boost
    }

    if (adjustedSimilarity > bestMatch.score) {
      bestMatch = {
        identityId: identity.identityId,
        score: adjustedSimilarity,
        category: categorizeSimilarity(adjustedSimilarity, questionTopic === identity.topic)
      };
    }
  }

  return bestMatch;
}

/**
 * Categorize similarity score into graduated credit levels
 */
function categorizeSimilarity(
  score: number,
  sameTopic: boolean
): 'exact' | 'very_similar' | 'related' | 'same_topic' | 'different' {
  if (score >= 0.95) return 'exact';           // 1.0 credit
  if (score >= 0.85) return 'very_similar';    // 0.8 credit
  if (score >= 0.70) return 'related';         // 0.6 credit
  if (sameTopic && score >= 0.50) return 'same_topic'; // 0.4 credit
  return 'different';                          // 0.0 credit
}

/**
 * Convert category to credit score for calibration
 */
export function getCreditScore(category: string): number {
  switch (category) {
    case 'exact': return 1.0;
    case 'very_similar': return 0.8;
    case 'related': return 0.6;
    case 'same_topic': return 0.4;
    default: return 0.0;
  }
}

/**
 * Batch generate embeddings for all identities
 */
export async function generateIdentityEmbeddings(
  identities: Array<{ id: string; name: string; topic: string; logic: string }>
): Promise<IdentityEmbedding[]> {
  console.log(`\n🧬 Generating embeddings for ${identities.length} identities...`);

  const embeddings: IdentityEmbedding[] = [];

  // Process in batches to avoid rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < identities.length; i += BATCH_SIZE) {
    const batch = identities.slice(i, Math.min(i + BATCH_SIZE, identities.length));

    console.log(`   Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(identities.length / BATCH_SIZE)}...`);

    const batchResults = await Promise.all(
      batch.map(identity => generateIdentityEmbedding(identity))
    );

    embeddings.push(...batchResults);

    // Small delay to respect rate limits
    if (i + BATCH_SIZE < identities.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`✅ Generated ${embeddings.length} embeddings`);
  return embeddings;
}
