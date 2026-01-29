/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - INTENT CLASSIFICATION LAYER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lightweight intent classification using regex + keywords
 * Routes queries efficiently:
 * - Action requests → Direct tool execution (bypass Gemini)
 * - Info/Educational requests → Gemini with context
 *
 * Benefits:
 * - Faster responses for simple actions
 * - Lower API costs
 * - Better user experience
 */

import { VidyaContextPayload } from './contextBuilder';

/**
 * Intent types
 */
export type IntentType =
  | 'info_request'      // "Which is hardest?" "Show me options"
  | 'analysis_request'  // "Analyze difficulty" "Show trends"
  | 'action_request'    // "Open Board Mastermind" "Generate sketches"
  | 'educational_query' // "Explain this concept" "Help me study"
  | 'unclear';          // Fallback - send to Gemini

export interface Intent {
  type: IntentType;
  confidence: number; // 0-1
  suggestedTool?: string; // For action_request
  category?: string; // For info_request
}

/**
 * Action patterns - requests that can be routed directly to tools
 */
const ACTION_PATTERNS = [
  // Navigation actions
  { pattern: /\b(open|show|go to|navigate to|switch to)\s+(board\s*mastermind|mastermind|analysis|exam\s*analysis|sketches?|gallery|vault)/i, tool: 'navigateTo' },

  // Content generation actions
  { pattern: /\b(generate|create|make)\s+(sketch|diagram|visual|image)/i, tool: 'generateSketches' },
  { pattern: /\b(create|make|build)\s+(lesson|study\s*plan)/i, tool: 'createLesson' },

  // Export actions
  { pattern: /\b(export|download|save\s*as)\s+(pdf|csv|json|data)/i, tool: 'exportData' },

  // Analysis actions (but these need Gemini for intelligence)
  // We'll classify as action_request but still route to Gemini
];

/**
 * Info request patterns - questions about data
 */
const INFO_PATTERNS = [
  { pattern: /\b(which|what).*\b(hardest|most\s*difficult|easiest|simplest)/i, category: 'difficulty_query' },
  { pattern: /\b(show|display|list).*\b(question|topic|option|answer)/i, category: 'data_display' },
  { pattern: /\b(how\s*many|count|number\s*of)\b/i, category: 'count_query' },
  { pattern: /\b(what.*answer|correct\s*answer|right\s*option)/i, category: 'answer_query' },
];

/**
 * Analysis request patterns - deep analytical queries
 */
const ANALYSIS_PATTERNS = [
  { pattern: /\b(analyze|analysis|examine|investigate|study)\b/i, category: 'general_analysis' },
  { pattern: /\b(trend|pattern|evolution|drift|trajectory|progression)/i, category: 'temporal_analysis' },
  { pattern: /\b(compare|comparison|contrast|versus|vs|difference)/i, category: 'comparative_analysis' },
  { pattern: /\b(frequency|recurring|repeated|common|frequent)/i, category: 'frequency_analysis' },
  { pattern: /\b(distribution|breakdown|spread)/i, category: 'distribution_analysis' },
];

/**
 * Educational query patterns - learning/teaching requests
 */
const EDUCATIONAL_PATTERNS = [
  { pattern: /\b(explain|teach|show\s*me\s*how|help\s*me\s*understand)\b/i, category: 'explanation' },
  { pattern: /\b(how\s*(do|does|can|to)|why|what\s*is|what's)\b/i, category: 'concept_question' },
  { pattern: /\b(study|learn|practice|prepare|master)\b/i, category: 'study_guidance' },
  { pattern: /\b(tip|advice|suggestion|recommendation)/i, category: 'guidance' },
  { pattern: /\b(solve|solution|step\s*by\s*step|walkthrough)/i, category: 'problem_solving' },
];

/**
 * Classify user intent from message
 */
export function classifyIntent(
  userMessage: string,
  context?: VidyaContextPayload
): Intent {
  const msg = userMessage.toLowerCase().trim();

  // Check action patterns first (highest priority for routing)
  for (const { pattern, tool } of ACTION_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        type: 'action_request',
        confidence: 0.9,
        suggestedTool: tool,
      };
    }
  }

  // Check analysis patterns (complex queries need Gemini)
  for (const { pattern, category } of ANALYSIS_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        type: 'analysis_request',
        confidence: 0.85,
        category,
      };
    }
  }

  // Check educational patterns
  for (const { pattern, category } of EDUCATIONAL_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        type: 'educational_query',
        confidence: 0.85,
        category,
      };
    }
  }

  // Check info patterns
  for (const { pattern, category } of INFO_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        type: 'info_request',
        confidence: 0.8,
        category,
      };
    }
  }

  // Fallback - send to Gemini (let AI handle it)
  return {
    type: 'unclear',
    confidence: 0.5,
  };
}

/**
 * Determine if query should bypass Gemini and go straight to tool
 */
export function shouldBypassGemini(intent: Intent): boolean {
  // Only bypass for high-confidence action requests with clear tool mappings
  if (intent.type === 'action_request' && intent.confidence > 0.85 && intent.suggestedTool) {
    // Navigation, export, simple actions can bypass
    const bypassableTools = ['navigateTo', 'exportData'];
    return bypassableTools.includes(intent.suggestedTool);
  }

  return false;
}

/**
 * Extract tool parameters from message (for direct tool calls)
 */
export function extractToolParams(
  intent: Intent,
  userMessage: string,
  context?: VidyaContextPayload
): Record<string, any> | null {
  if (!intent.suggestedTool) return null;

  const msg = userMessage.toLowerCase();

  // Navigate to - extract destination
  if (intent.suggestedTool === 'navigateTo') {
    if (msg.includes('mastermind') || msg.includes('board')) return { view: 'mastermind' };
    if (msg.includes('analysis')) return { view: 'analysis' };
    if (msg.includes('sketch') || msg.includes('gallery')) return { view: 'sketches' };
    if (msg.includes('vault')) return { view: 'vault' };
  }

  // Export data - extract format
  if (intent.suggestedTool === 'exportData') {
    if (msg.includes('pdf')) return { type: 'pdf', data: context };
    if (msg.includes('csv')) return { type: 'csv', data: context };
    if (msg.includes('json')) return { type: 'json', data: context };
  }

  return null;
}

/**
 * Get routing decision for a query
 */
export interface RoutingDecision {
  route: 'gemini' | 'tool' | 'hybrid';
  intent: Intent;
  toolName?: string;
  toolParams?: Record<string, any>;
  requiresContext: boolean;
}

export function getRoutingDecision(
  userMessage: string,
  context?: VidyaContextPayload
): RoutingDecision {
  const intent = classifyIntent(userMessage, context);

  // Check if we can bypass Gemini entirely
  if (shouldBypassGemini(intent)) {
    const toolParams = extractToolParams(intent, userMessage, context);
    return {
      route: 'tool',
      intent,
      toolName: intent.suggestedTool,
      toolParams: toolParams || undefined,
      requiresContext: false,
    };
  }

  // All other queries go to Gemini with context
  return {
    route: 'gemini',
    intent,
    requiresContext: intent.type !== 'unclear', // Unclear queries still need context
  };
}
