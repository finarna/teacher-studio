/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Main orchestrator that ties all V3 layers together
 */

import { VidyaAppContext } from '../types/vidya';
import { securityCheck, SecurityCheckResult } from './vidyaSecurity';
import { classifyIntent, requiresGemini, ClassifiedIntent } from './vidyaIntentClassifier';
import { handleQuery, QueryResponse } from './vidyaQueryHandlers';
import {
  renderQueryResponse,
  renderActionResponse,
  renderConversationResponse,
  renderErrorResponse,
  renderSecurityViolation,
  RenderedResponse,
} from './vidyaResponseRenderer';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface VidyaV3Request {
  userInput: string;
  userId: string;
  context: VidyaAppContext;
}

export interface VidyaV3Response {
  success: boolean;
  response: RenderedResponse;
  intent?: ClassifiedIntent;
  usedGemini: boolean;
  securityCheck?: SecurityCheckResult;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process user request through V3 pipeline
 */
export async function processVidyaRequest(request: VidyaV3Request): Promise<VidyaV3Response> {
  const { userInput, userId, context } = request;

  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: SECURITY CHECK
    // ═══════════════════════════════════════════════════════════════════════════

    const securityResult = securityCheck(userInput, userId);

    if (!securityResult.isValid) {
      // Security violation detected
      return {
        success: false,
        response: renderSecurityViolation(securityResult.violations),
        usedGemini: false,
        securityCheck: securityResult,
        error: 'Security violation detected',
      };
    }

    const sanitizedInput = securityResult.sanitizedInput!;

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: INTENT CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════════════════

    const classifiedIntent = classifyIntent(sanitizedInput, context);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: ROUTE TO APPROPRIATE HANDLER
    // ═══════════════════════════════════════════════════════════════════════════

    const needsGemini = requiresGemini(classifiedIntent);

    if (!needsGemini && classifiedIntent.intent === 'QUERY') {
      // Handle query locally - NO GEMINI NEEDED!
      const queryResponse = handleQuery(classifiedIntent, context);
      const rendered = renderQueryResponse(queryResponse);

      return {
        success: true,
        response: rendered,
        intent: classifiedIntent,
        usedGemini: false,
        securityCheck: securityResult,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: PASS TO GEMINI (with structured data context)
    // ═══════════════════════════════════════════════════════════════════════════

    // Gemini will be called from useVidyaV2 with:
    // - Sanitized input
    // - Structured data (not verbose text)
    // - Clear intent information

    return {
      success: true,
      response: renderConversationResponse(
        `Processing with Gemini: "${sanitizedInput}"`
      ),
      intent: classifiedIntent,
      usedGemini: true,
      securityCheck: securityResult,
    };
  } catch (error) {
    console.error('Error processing Vidya request:', error);

    return {
      success: false,
      response: renderErrorResponse(
        'An error occurred while processing your request.',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      usedGemini: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface VidyaV3Stats {
  totalRequests: number;
  locallyHandled: number;
  geminiHandled: number;
  securityBlocked: number;
  averageLocalResponseTime: number;
  averageGeminiResponseTime: number;
}

class VidyaV3StatsTracker {
  private stats: VidyaV3Stats = {
    totalRequests: 0,
    locallyHandled: 0,
    geminiHandled: 0,
    securityBlocked: 0,
    averageLocalResponseTime: 0,
    averageGeminiResponseTime: 0,
  };

  trackRequest(response: VidyaV3Response, responseTime: number) {
    this.stats.totalRequests++;

    if (!response.success && response.error === 'Security violation detected') {
      this.stats.securityBlocked++;
    } else if (response.usedGemini) {
      this.stats.geminiHandled++;
      this.stats.averageGeminiResponseTime =
        (this.stats.averageGeminiResponseTime * (this.stats.geminiHandled - 1) + responseTime) /
        this.stats.geminiHandled;
    } else {
      this.stats.locallyHandled++;
      this.stats.averageLocalResponseTime =
        (this.stats.averageLocalResponseTime * (this.stats.locallyHandled - 1) + responseTime) /
        this.stats.locallyHandled;
    }
  }

  getStats(): VidyaV3Stats {
    return { ...this.stats };
  }

  reset() {
    this.stats = {
      totalRequests: 0,
      locallyHandled: 0,
      geminiHandled: 0,
      securityBlocked: 0,
      averageLocalResponseTime: 0,
      averageGeminiResponseTime: 0,
    };
  }
}

// Global stats tracker
const globalStatsTracker = new VidyaV3StatsTracker();

/**
 * Process request with stats tracking
 */
export async function processWithStats(request: VidyaV3Request): Promise<VidyaV3Response> {
  const startTime = Date.now();
  const response = await processVidyaRequest(request);
  const responseTime = Date.now() - startTime;

  globalStatsTracker.trackRequest(response, responseTime);

  return response;
}

/**
 * Get V3 stats
 */
export function getV3Stats(): VidyaV3Stats {
  return globalStatsTracker.getStats();
}

/**
 * Reset V3 stats
 */
export function resetV3Stats() {
  globalStatsTracker.reset();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  processVidyaRequest,
  processWithStats,
  getV3Stats,
  resetV3Stats,
};
