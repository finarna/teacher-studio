/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - SEMANTIC INTENT CLASSIFICATION (Gemini-Powered)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Hybrid Intent Routing System:
 * 1. Fast keyword matching for obvious queries (high confidence)
 * 2. Gemini semantic routing for ambiguous/contextual queries (low confidence)
 * 3. Conversation history awareness
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { VidyaMessage } from '../../types';
import { Intent, IntentType } from './intentClassifier';

/**
 * Semantic classification system prompt
 */
const SEMANTIC_CLASSIFIER_PROMPT = `You are an intent classification AI for an educational chat system.

Analyze the user's query and classify it into ONE of these intent types:

1. **info_request**: User asking for specific information from their data
   - Examples: "Which question is hardest?", "Show me chemistry questions", "What's the answer to Q5?"

2. **analysis_request**: User requesting deep analytical insights
   - Examples: "Analyze difficulty trends", "Compare physics vs chemistry", "Show me patterns"

3. **action_request**: User wants to trigger an action or navigation
   - Examples: "Open Board Mastermind", "Generate sketches", "Export to PDF"

4. **educational_query**: User asking for learning help or concept explanations
   - Examples: "Explain this formula", "How do I solve quadratic equations?", "Why does this work?"

5. **unclear**: Cannot confidently classify (ambiguous, context needed)

CONVERSATION HISTORY AWARENESS:
- Consider previous messages for context
- If user says "what about chemistry?" after discussing physics, understand the comparison intent
- If user says "show me more" understand they want similar info to previous query

RESPONSE FORMAT (JSON only):
{
  "intent": "info_request" | "analysis_request" | "action_request" | "educational_query" | "unclear",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification",
  "suggestedTool": "navigateTo" | "generateSketches" | "exportData" | null,
  "category": "difficulty_query" | "comparative_analysis" | "explanation" | null
}

IMPORTANT: Respond ONLY with valid JSON, no markdown formatting.`;

/**
 * Classify intent using Gemini for semantic understanding
 */
export async function classifyIntentSemantically(
  userMessage: string,
  conversationHistory: VidyaMessage[],
  apiKey: string
): Promise<Intent | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SEMANTIC_CLASSIFIER_PROMPT,
    });

    // Build conversation context (last 3 messages for efficiency)
    const recentHistory = conversationHistory.slice(-3);
    const historyText = recentHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
      .join('\n');

    const prompt = `CONVERSATION HISTORY:
${historyText}

CURRENT USER QUERY:
${userMessage}

Classify the current query considering the conversation context.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON response
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const classification = JSON.parse(cleaned);

    // Convert to our Intent format
    return {
      type: classification.intent as IntentType,
      confidence: classification.confidence,
      suggestedTool: classification.suggestedTool || undefined,
      category: classification.category || undefined,
    };
  } catch (error) {
    console.error('[SemanticClassifier] Failed to classify intent:', error);
    return null; // Fallback to keyword classification
  }
}

/**
 * Hybrid classification: Try keywords first, fallback to semantic if needed
 */
export async function classifyIntentHybrid(
  userMessage: string,
  conversationHistory: VidyaMessage[],
  keywordIntent: Intent,
  apiKey: string
): Promise<Intent> {
  // If keyword classification has high confidence (>0.75), trust it
  if (keywordIntent.confidence > 0.75) {
    console.log('[IntentRouter] High confidence keyword match:', keywordIntent.type, keywordIntent.confidence);
    return keywordIntent;
  }

  // Low confidence - use Gemini for semantic understanding
  console.log('[IntentRouter] Low confidence, using semantic classification...');
  const semanticIntent = await classifyIntentSemantically(userMessage, conversationHistory, apiKey);

  if (semanticIntent && semanticIntent.confidence > 0.6) {
    console.log('[IntentRouter] Semantic classification:', semanticIntent.type, semanticIntent.confidence);
    return semanticIntent;
  }

  // Both failed - return keyword classification as fallback
  console.log('[IntentRouter] Fallback to keyword classification');
  return keywordIntent;
}
