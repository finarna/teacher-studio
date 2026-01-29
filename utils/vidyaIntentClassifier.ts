/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - INTENT CLASSIFIER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Classifies user intent BEFORE calling Gemini to route to appropriate handlers
 */

import { VidyaAppContext } from '../types/vidya';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type UserIntent = 'QUERY' | 'ACTION' | 'CONVERSATION' | 'ANALYSIS';

export type QueryType = 'COUNT' | 'LIST' | 'FILTER' | 'RANK' | 'SPECIFIC' | 'TOPICS';

export type ActionType = 'DELETE' | 'CREATE' | 'GENERATE' | 'UPDATE' | 'CLEAR' | 'EXPORT' | 'NAVIGATE';

export interface ClassifiedIntent {
  intent: UserIntent;
  subType?: QueryType | ActionType;
  confidence: number;
  parameters?: IntentParameters;
  originalInput: string;
}

export interface IntentParameters {
  // Query parameters
  entity?: 'questions' | 'scans' | 'lessons' | 'topics';
  count?: number;
  sortBy?: 'difficulty' | 'marks' | 'topic' | 'date';
  order?: 'asc' | 'desc';
  filter?: {
    subject?: string;
    grade?: string;
    difficulty?: string;
    topic?: string;
  };

  // Action parameters
  target?: string;
  destination?: string;
  format?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns for intent classification
 */
const INTENT_PATTERNS = {
  QUERY: {
    COUNT: [
      /how many/i,
      /count/i,
      /total (number of)?/i,
      /number of/i,
    ],
    LIST: [
      /show (me )?(all|the)?/i,
      /list (all|the)?/i,
      /display (all|the)?/i,
      /give me (all|the)?/i,
    ],
    RANK: [
      /top \d+/i,
      /hardest/i,
      /easiest/i,
      /most difficult/i,
      /best/i,
      /worst/i,
      /rank/i,
    ],
    TOPICS: [
      /what (are the )?topics?/i,
      /which topics?/i,
      /topics? covered/i,
      /topics? in (this|the)/i,
      /list topics?/i,
    ],
    FILTER: [
      /find/i,
      /filter/i,
      /where/i,
      /with/i,
      /that have/i,
      /questions? (about|on)/i,
    ],
  },
  ACTION: {
    DELETE: [
      /delete/i,
      /remove/i,
      /get rid of/i,
    ],
    CREATE: [
      /create/i,
      /make/i,
      /add/i,
      /new/i,
    ],
    GENERATE: [
      /generate/i,
      /create sketches?/i,
      /make sketches?/i,
    ],
    NAVIGATE: [
      /go to/i,
      /navigate to/i,
      /open/i,
      /show me (the )?(?:mastermind|analysis|sketches|vault)/i,
    ],
    EXPORT: [
      /export/i,
      /download/i,
      /save as/i,
    ],
    CLEAR: [
      /clear/i,
      /reset/i,
    ],
  },
  ANALYSIS: [
    /analyze/i,
    /compare/i,
    /recommend/i,
    /suggest/i,
    /trends?/i,
    /insights?/i,
    /breakdown/i,
    /distribution/i,
  ],
  CONVERSATION: [
    /^(hi|hello|hey|good morning|good evening)/i,
    /^(thanks|thank you|appreciate)/i,
    /^(bye|goodbye|see you)/i,
    /^(help|what can you do)/i,
    /^(who are you|what are you)/i,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect entity type from input
 */
function detectEntity(input: string): IntentParameters['entity'] | undefined {
  const lower = input.toLowerCase();

  if (/questions?/i.test(lower)) return 'questions';
  if (/scans?|papers?/i.test(lower)) return 'scans';
  if (/lessons?/i.test(lower)) return 'lessons';
  if (/topics?/i.test(lower)) return 'topics';

  // Default to questions for queries about content
  if (/hardest|easiest|difficult/i.test(lower)) return 'questions';

  return undefined;
}

/**
 * Extract count from input (e.g., "top 3" → 3)
 */
function extractCount(input: string): number | undefined {
  const match = input.match(/top (\d+)|first (\d+)|(\d+) (hardest|easiest|best)/i);
  if (match) {
    return parseInt(match[1] || match[2] || match[3], 10);
  }
  return undefined;
}

/**
 * Detect sort criteria from input
 */
function detectSortBy(input: string): IntentParameters['sortBy'] | undefined {
  const lower = input.toLowerCase();

  if (/hardest|difficult/i.test(lower)) return 'difficulty';
  if (/marks?|points?|scores?/i.test(lower)) return 'marks';
  if (/topic/i.test(lower)) return 'topic';
  if (/date|recent|latest/i.test(lower)) return 'date';

  // Default for ranking queries
  if (/top|rank/i.test(lower)) return 'difficulty';

  return undefined;
}

/**
 * Detect sort order from input
 */
function detectOrder(input: string): IntentParameters['order'] {
  const lower = input.toLowerCase();

  if (/easiest|lowest|ascending/i.test(lower)) return 'asc';
  return 'desc'; // Default to descending for "top", "hardest", etc.
}

/**
 * Extract filter criteria from input
 */
function extractFilter(input: string): IntentParameters['filter'] | undefined {
  const lower = input.toLowerCase();
  const filter: IntentParameters['filter'] = {};

  // Subject filter
  if (/math/i.test(lower)) filter.subject = 'Math';
  if (/physics/i.test(lower)) filter.subject = 'Physics';
  if (/chemistry/i.test(lower)) filter.subject = 'Chemistry';
  if (/biology/i.test(lower)) filter.subject = 'Biology';

  // Grade filter
  const gradeMatch = lower.match(/class (\d+)|grade (\d+)/i);
  if (gradeMatch) {
    filter.grade = `Class ${gradeMatch[1] || gradeMatch[2]}`;
  }

  // Difficulty filter
  if (/hard|difficult/i.test(lower)) filter.difficulty = 'Hard';
  if (/medium|moderate/i.test(lower)) filter.difficulty = 'Medium';
  if (/easy|simple/i.test(lower)) filter.difficulty = 'Easy';

  // Topic filter (extract quoted topics or common ones)
  const topicMatch = lower.match(/(about|on|in) ([a-z]+)/i);
  if (topicMatch) {
    filter.topic = topicMatch[2];
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classify user intent
 */
export function classifyIntent(input: string, context?: VidyaAppContext): ClassifiedIntent {
  const lower = input.toLowerCase().trim();

  // 1. Check for CONVERSATION patterns (highest priority - quick responses)
  for (const pattern of INTENT_PATTERNS.CONVERSATION) {
    if (pattern.test(lower)) {
      return {
        intent: 'CONVERSATION',
        confidence: 0.95,
        originalInput: input,
      };
    }
  }

  // 2. Check for ANALYSIS patterns
  for (const pattern of INTENT_PATTERNS.ANALYSIS) {
    if (pattern.test(lower)) {
      return {
        intent: 'ANALYSIS',
        confidence: 0.85,
        originalInput: input,
        parameters: {
          entity: detectEntity(input),
        },
      };
    }
  }

  // 3. Check for ACTION patterns
  for (const [actionType, patterns] of Object.entries(INTENT_PATTERNS.ACTION)) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        return {
          intent: 'ACTION',
          subType: actionType as ActionType,
          confidence: 0.9,
          originalInput: input,
          parameters: {
            entity: detectEntity(input),
          },
        };
      }
    }
  }

  // 4. Check for QUERY patterns
  for (const [queryType, patterns] of Object.entries(INTENT_PATTERNS.QUERY)) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        const parameters: IntentParameters = {
          entity: detectEntity(input),
        };

        // Extract query-specific parameters
        if (queryType === 'RANK') {
          parameters.count = extractCount(input);
          parameters.sortBy = detectSortBy(input);
          parameters.order = detectOrder(input);
        }

        if (queryType === 'FILTER' || queryType === 'LIST') {
          parameters.filter = extractFilter(input);
        }

        return {
          intent: 'QUERY',
          subType: queryType as QueryType,
          confidence: 0.9,
          originalInput: input,
          parameters,
        };
      }
    }
  }

  // 5. Default to CONVERSATION if no pattern matched
  return {
    intent: 'CONVERSATION',
    confidence: 0.5,
    originalInput: input,
  };
}

/**
 * Check if intent requires Gemini
 */
export function requiresGemini(classifiedIntent: ClassifiedIntent): boolean {
  // Only handle VERY SIMPLE queries locally (pure counting, basic listing)
  if (classifiedIntent.intent === 'QUERY') {
    // Only COUNT and basic LIST can be handled locally
    // Everything else should use Gemini for better reasoning
    const verySimpleQueries: QueryType[] = ['COUNT'];
    if (classifiedIntent.subType && verySimpleQueries.includes(classifiedIntent.subType as QueryType)) {
      return false; // Handle locally - just counting
    }

    // All other queries (RANK, LIST with filters, TOPICS, etc.) should use Gemini
    return true;
  }

  // Analysis always needs Gemini
  if (classifiedIntent.intent === 'ANALYSIS') return true;

  // Conversations need Gemini
  if (classifiedIntent.intent === 'CONVERSATION') return true;

  // Actions don't need Gemini (they execute tools)
  return false;
}

/**
 * Get handler type for intent
 */
export function getHandlerType(classifiedIntent: ClassifiedIntent): string {
  if (classifiedIntent.intent === 'QUERY' && !requiresGemini(classifiedIntent)) {
    return `${classifiedIntent.subType}QueryHandler`;
  }

  if (classifiedIntent.intent === 'ACTION') {
    return `${classifiedIntent.subType}ActionHandler`;
  }

  return 'GeminiHandler'; // Fallback to Gemini
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  classifyIntent,
  requiresGemini,
  getHandlerType,
};
