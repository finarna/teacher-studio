/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - STRUCTURED CONTEXT BUILDER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Clean JSON context injection pattern (inspired by math chat)
 * - Type-safe context payload
 * - Easy for Gemini to parse
 * - Smart summarization (send relevant data, not everything)
 */

import { Scan } from '../../types';
import { VidyaRole } from './systemInstructions';
import {
  generateCacheKey,
  getCachedContext,
  setCachedContext,
} from './contextCache';

/**
 * Structured context payload sent to Gemini
 */
export interface VidyaContextPayload {
  userRole: VidyaRole;
  currentView: string;

  scannedPapers: {
    total: number;
    recent: Array<{
      name: string;
      date: string;
      subject: string;
      grade: string;
      questionCount: number;
      timestamp: number;
    }>;
  };

  // ALL scans with full analytics (for cross-scan analysis)
  allScansAnalysis?: Array<{
    name: string;
    date: string;
    subject: string;
    grade: string;
    questionCount: number;
    difficultyBreakdown: Record<string, number>;
    topicDistribution: Record<string, number>;
    timestamp: number;
  }>;

  currentScan?: {
    name: string;
    date: string;
    subject: string;
    grade: string;
    questionCount: number;
    topicDistribution: Record<string, number>;
    difficultyBreakdown: Record<string, number>;
  };

  // Smart-limited question list (most relevant subset)
  questions: Array<{
    scanName: string;
    scanDate: string;
    examYear?: number; // Extracted from scan name for temporal analysis
    questionNumber: number;
    topic: string;
    difficulty: string;
    marks: number;
    text: string;
    options?: string[];
    correctAnswer?: string;
  }>;

  // Frequency analysis (if relevant)
  topRecurringQuestions?: Array<{
    text: string;
    frequency: number;
    scans: string[];
  }>;

  // Weak areas (if student mode and data available)
  weakTopics?: string[];
}

/**
 * Extract exam year from scan name
 * Examples: "KCET 2022" → 2022, "JEE Mains 2021" → 2021
 */
function extractExamYear(scanName: string): number | undefined {
  const yearMatch = scanName.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? parseInt(yearMatch[0]) : undefined;
}

/**
 * Compression constants
 */
const MAX_QUESTIONS = 50; // Don't send more than 50 questions
const MAX_QUESTION_TEXT_LENGTH = 500; // Truncate long questions
const MAX_OPTIONS_PER_QUESTION = 4; // Standard MCQ format

/**
 * Helper: Get difficulty score for prioritization
 */
function getDifficultyScore(difficulty: string): number {
  const scores: Record<string, number> = {
    'Hard': 3,
    'Medium': 2,
    'Moderate': 2,
    'Easy': 1,
    'Unknown': 0,
  };
  return scores[difficulty] || 0;
}

/**
 * Helper: Compress question array
 */
function compressQuestions(
  questions: VidyaContextPayload['questions'],
  prioritizeHardest: boolean = true
): VidyaContextPayload['questions'] {
  if (questions.length <= MAX_QUESTIONS) {
    // Already within limit, just truncate long texts
    return questions.map(q => ({
      ...q,
      text: q.text.length > MAX_QUESTION_TEXT_LENGTH
        ? q.text.substring(0, MAX_QUESTION_TEXT_LENGTH) + '...'
        : q.text,
      options: q.options?.slice(0, MAX_OPTIONS_PER_QUESTION),
    }));
  }

  // Prioritize: hardest questions + recent questions
  const sortedByDifficulty = [...questions].sort(
    (a, b) => getDifficultyScore(b.difficulty) - getDifficultyScore(a.difficulty)
  );

  // Take top 30 hardest + 20 most recent
  const hardest = sortedByDifficulty.slice(0, 30);
  const mostRecent = questions.slice(-20);

  // Combine and deduplicate
  const combined = [
    ...hardest,
    ...mostRecent.filter(q =>
      !hardest.some(h => h.scanName === q.scanName && h.questionNumber === q.questionNumber)
    ),
  ].slice(0, MAX_QUESTIONS);

  // Truncate long texts
  return combined.map(q => ({
    ...q,
    text: q.text.length > MAX_QUESTION_TEXT_LENGTH
      ? q.text.substring(0, MAX_QUESTION_TEXT_LENGTH) + '...'
      : q.text,
    options: q.options?.slice(0, MAX_OPTIONS_PER_QUESTION),
  }));
}

/**
 * Build structured context payload from app state
 */
/**
 * Internal context builder (uncached)
 */
function buildContextPayloadInternal(appContext: {
  currentView?: string;
  scannedPapers?: Scan[];
  selectedScan?: Scan;
}, userRole: VidyaRole): VidyaContextPayload {

  const scans = appContext.scannedPapers || [];

  // Sort scans by upload timestamp (most recent first)
  const sortedScans = [...scans].sort((a, b) => b.timestamp - a.timestamp);

  // Build ALL scans summary with difficulty/topic breakdown
  const allScansAnalysis = sortedScans.map(scan => {
    const questions = scan.analysisData?.questions || [];

    // Calculate difficulty breakdown for this scan
    const difficultyBreakdown: Record<string, number> = {};
    questions.forEach((q: any) => {
      const difficulty = q.difficulty || 'Unknown';
      difficultyBreakdown[difficulty] = (difficultyBreakdown[difficulty] || 0) + 1;
    });

    // Calculate topic distribution for this scan
    const topicDist: Record<string, number> = {};
    questions.forEach((q: any) => {
      const topic = q.topic || 'Unknown';
      topicDist[topic] = (topicDist[topic] || 0) + 1;
    });

    return {
      name: scan.name,
      date: scan.date,
      subject: scan.subject,
      grade: scan.grade,
      questionCount: questions.length,
      difficultyBreakdown,
      topicDistribution: topicDist,
      timestamp: scan.timestamp,
    };
  });

  // Keep recent scans for backward compatibility
  const recentScans = allScansAnalysis.slice(0, 5);

  // Build current scan details (if viewing one)
  let currentScan: VidyaContextPayload['currentScan'];
  if (appContext.selectedScan) {
    const scan = appContext.selectedScan;
    const questions = scan.analysisData?.questions || [];

    // Topic distribution
    const topicDist: Record<string, number> = {};
    questions.forEach((q: any) => {
      const topic = q.topic || 'Unknown';
      topicDist[topic] = (topicDist[topic] || 0) + 1;
    });

    // Difficulty breakdown
    const difficultyBreakdown: Record<string, number> = {};
    questions.forEach((q: any) => {
      const difficulty = q.difficulty || 'Unknown';
      difficultyBreakdown[difficulty] = (difficultyBreakdown[difficulty] || 0) + 1;
    });

    currentScan = {
      name: scan.name,
      date: scan.date,
      subject: scan.subject,
      grade: scan.grade,
      questionCount: questions.length,
      topicDistribution: topicDist,
      difficultyBreakdown: difficultyBreakdown,
    };
  }

  // Build questions array (SMART LIMITING)
  // If viewing specific scan: all its questions
  // If viewing all scans: sample questions + recurring ones
  const questions: VidyaContextPayload['questions'] = [];

  // Debug logging to understand what's being selected
  if (appContext.selectedScan) {
    console.log('[ContextBuilder] Selected scan:', {
      name: appContext.selectedScan.name,
      hasQuestions: !!appContext.selectedScan.analysisData?.questions,
      questionCount: appContext.selectedScan.analysisData?.questions?.length || 0,
    });
  } else {
    console.log('[ContextBuilder] No selected scan, using recent scans');
  }

  if (appContext.selectedScan?.analysisData?.questions && appContext.selectedScan.analysisData.questions.length > 0) {
    // Viewing specific scan - include all its questions
    const scan = appContext.selectedScan;
    const examYear = extractExamYear(scan.name);

    console.log(`[ContextBuilder] Including ${scan.analysisData.questions.length} questions from selected scan: ${scan.name}`);

    scan.analysisData.questions.forEach((q: any) => {
      questions.push({
        scanName: scan.name,
        scanDate: scan.date,
        examYear,
        questionNumber: q.questionNumber,
        topic: q.topic || 'General',
        difficulty: q.difficulty || 'Unknown',
        marks: q.marks || 0,
        text: q.text || '',
        options: q.options || [],
        correctAnswer: q.correctOptionIndex !== undefined
          ? String.fromCharCode(65 + q.correctOptionIndex)
          : undefined,
      });
    });
  } else {
    // Not viewing specific scan - use intelligent sampling
    // Prioritize most recent scans, but include variety
    console.log('[ContextBuilder] Sampling questions from multiple scans');

    sortedScans.slice(0, 3).forEach(scan => {
      if (scan.analysisData?.questions) {
        const examYear = extractExamYear(scan.name);
        // Take more diverse questions, not just first 3
        const scanQuestions = scan.analysisData.questions;
        const step = Math.max(1, Math.floor(scanQuestions.length / 3));
        const indices = [0, step, step * 2].filter(i => i < scanQuestions.length);

        indices.forEach(idx => {
          const q = scanQuestions[idx];
          questions.push({
            scanName: scan.name,
            scanDate: scan.date,
            examYear,
            questionNumber: q.questionNumber,
            topic: q.topic || 'General',
            difficulty: q.difficulty || 'Unknown',
            marks: q.marks || 0,
            text: q.text || '',
            options: q.options || [],
            correctAnswer: q.correctOptionIndex !== undefined
              ? String.fromCharCode(65 + q.correctOptionIndex)
              : undefined,
          });
        });
      }
    });
  }

  // Find recurring questions (across all scans)
  const topRecurringQuestions: VidyaContextPayload['topRecurringQuestions'] = [];

  if (scans.length > 1) {
    const questionFrequency: Record<string, { count: number; scans: string[]; text: string }> = {};

    scans.forEach(scan => {
      if (scan.analysisData?.questions) {
        scan.analysisData.questions.forEach((q: any) => {
          if (q.text) {
            const normalized = q.text.substring(0, 100).trim().toLowerCase();
            if (!questionFrequency[normalized]) {
              questionFrequency[normalized] = { count: 0, scans: [], text: q.text };
            }
            questionFrequency[normalized].count++;
            if (!questionFrequency[normalized].scans.includes(scan.name)) {
              questionFrequency[normalized].scans.push(scan.name);
            }
          }
        });
      }
    });

    // Get top 3 recurring questions (appearing in 2+ scans)
    const recurring = Object.values(questionFrequency)
      .filter(item => item.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    recurring.forEach(item => {
      topRecurringQuestions.push({
        text: item.text.substring(0, 150) + (item.text.length > 150 ? '...' : ''),
        frequency: item.count,
        scans: item.scans,
      });
    });
  }

  // COMPRESS QUESTIONS (Phase 4 optimization)
  const compressedQuestions = compressQuestions(questions);

  // Build payload
  const payload: VidyaContextPayload = {
    userRole,
    currentView: appContext.currentView || 'dashboard',
    scannedPapers: {
      total: scans.length,
      recent: recentScans,
    },
    currentScan,
    questions: compressedQuestions,
  };

  // Add ALL scans analysis (for cross-scan analysis queries)
  if (scans.length > 1) {
    payload.allScansAnalysis = allScansAnalysis;
  }

  // Add recurring questions if found
  if (topRecurringQuestions.length > 0) {
    payload.topRecurringQuestions = topRecurringQuestions;
  }

  return payload;
}

/**
 * Format context payload for Gemini (with delimiters)
 */
export function formatContextForGemini(
  payload: VidyaContextPayload,
  userMessage: string
): string {
  // Add clear context summary for better AI understanding
  let contextSummary = '';
  if (payload.currentScan) {
    contextSummary = `\n📄 ACTIVE CONTEXT: User is viewing scan "${payload.currentScan.name}" (${payload.currentScan.subject}, ${payload.currentScan.grade})\n`;
  } else if (payload.scannedPapers.total > 0) {
    contextSummary = `\n📊 ACTIVE CONTEXT: User is viewing all scans (${payload.scannedPapers.total} total)\n`;
  }

  // Highlight cross-scan analysis capability
  if (payload.allScansAnalysis && payload.allScansAnalysis.length > 0) {
    contextSummary += `\n✅ CROSS-SCAN ANALYSIS AVAILABLE: Full difficulty/topic breakdowns for all ${payload.allScansAnalysis.length} scans provided in "allScansAnalysis" array\n`;
  }

  return `[SYSTEM_CONTEXT_DATA]${contextSummary}
${JSON.stringify(payload, null, 2)}
[/SYSTEM_CONTEXT_DATA]

User Query: ${userMessage}`;
}

/**
 * Build structured context payload with smart caching
 *
 * This is the main export used by the chat hook.
 * Checks cache first before building to improve performance.
 */
export function buildContextPayload(appContext: {
  currentView?: string;
  scannedPapers?: Scan[];
  selectedScan?: Scan;
}, userRole: VidyaRole): VidyaContextPayload {
  const startTime = performance.now();

  // Generate cache key
  const scanIds = (appContext.scannedPapers || []).map(s => s.id || s.name);
  const selectedScanId = appContext.selectedScan?.id || appContext.selectedScan?.name || null;
  const currentView = appContext.currentView || 'general';

  const cacheKey = generateCacheKey(scanIds, selectedScanId, currentView, userRole);

  // Try to get from cache
  const cached = getCachedContext(cacheKey);
  if (cached) {
    const duration = performance.now() - startTime;
    console.debug('[Performance] Context retrieved from cache', {
      duration: `${duration.toFixed(2)}ms`,
    });
    return cached;
  }

  // Build new context
  console.debug('[Performance] Building new context');
  const payload = buildContextPayloadInternal(appContext, userRole);

  // Cache it
  setCachedContext(cacheKey, payload);

  const duration = performance.now() - startTime;
  console.debug('[Performance] Context built and cached', {
    duration: `${duration.toFixed(2)}ms`,
    questionCount: payload.questions.length,
    payloadSize: `${(JSON.stringify(payload).length / 1024).toFixed(2)} KB`,
  });

  return payload;
}
