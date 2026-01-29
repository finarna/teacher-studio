/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V2 - PROACTIVE SUGGESTION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Generates context-aware proactive suggestions based on user behavior,
 * app state, and detected patterns
 */

import {
  VidyaSuggestion,
  VidyaAppContext,
  VidyaActivity,
  UserRole,
  VidyaAction,
} from '../types/vidya';
import { Scan } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGESTION RULES ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class VidyaSuggestionEngine {
  private appContext: VidyaAppContext;
  private userRole: UserRole;
  private activityLog: VidyaActivity[];
  private dismissedSuggestions: Set<string>;

  constructor(
    appContext: VidyaAppContext,
    userRole: UserRole,
    activityLog: VidyaActivity[] = []
  ) {
    this.appContext = appContext;
    this.userRole = userRole;
    this.activityLog = activityLog;
    this.dismissedSuggestions = new Set();
  }

  /**
   * Generate all applicable suggestions
   */
  generateSuggestions(): VidyaSuggestion[] {
    const suggestions: VidyaSuggestion[] = [];

    // Run all suggestion rules
    const rules = [
      this.suggestFirstScan,
      this.suggestInactiveScanning,
      this.suggestLessonCreation,
      this.suggestSketchGeneration,
      this.suggestInsightsAnalysis,
      this.suggestExportData,
      this.suggestPracticeQuiz,
      this.suggestImproveMastery,
      this.suggestViewAnalysis,
      this.suggestMilestone,
    ];

    rules.forEach((rule) => {
      const suggestion = rule.call(this);
      if (suggestion && !this.dismissedSuggestions.has(suggestion.id)) {
        suggestions.push(suggestion);
      }
    });

    // Sort by priority
    return suggestions.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(suggestionId: string): void {
    this.dismissedSuggestions.add(suggestionId);
  }

  /**
   * Update context
   */
  updateContext(appContext: VidyaAppContext, activityLog: VidyaActivity[]): void {
    this.appContext = appContext;
    this.activityLog = activityLog;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUGGESTION RULES (TEACHER MODE)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Suggest first scan if no papers scanned
   */
  private suggestFirstScan(): VidyaSuggestion | null {
    if (this.userRole !== 'teacher') return null;

    const scans = this.appContext.scannedPapers || [];
    if (scans.length > 0) return null;

    return {
      id: 'first-scan',
      trigger: 'view_changed',
      priority: 'high',
      message:
        '👋 Welcome! Ready to scan your first exam paper? I will analyze difficulty, topics, and generate high-yield sketches.',
      dismissible: true,
    };
  }

  /**
   * Suggest scanning if inactive for 3+ days
   */
  private suggestInactiveScanning(): VidyaSuggestion | null {
    if (this.userRole !== 'teacher') return null;

    const scans = this.appContext.scannedPapers || [];
    if (scans.length === 0) return null;

    const daysSinceLastScan = this.getDaysSinceLastScan();
    if (daysSinceLastScan < 3) return null;

    return {
      id: 'inactive-scanning',
      trigger: 'inactivity',
      priority: 'medium',
      message: `It has been ${daysSinceLastScan} days since your last scan. Want to analyze a new paper?`,
      dismissible: true,
    };
  }

  /**
   * Suggest lesson creation if many scans but no lessons
   */
  private suggestLessonCreation(): VidyaSuggestion | null {
    if (this.userRole !== 'teacher') return null;

    const scans = this.appContext.scannedPapers || [];
    const lessons = this.appContext.customLessons || [];

    if (scans.length < 5 || lessons.length > 0) return null;

    // Find most common topic
    const topicCounts: Record<string, number> = {};
    scans.forEach((scan) => {
      if (scan.analysisData?.topicWeightage) {
        scan.analysisData.topicWeightage.forEach((topic: any) => {
          topicCounts[topic.name] = (topicCounts[topic.name] || 0) + 1;
        });
      }
    });

    const topTopic = Object.entries(topicCounts).sort(([, a], [, b]) => b - a)[0];

    if (!topTopic) return null;

    return {
      id: 'suggest-lesson',
      trigger: 'pattern_detected',
      priority: 'medium',
      message: `You have scanned ${scans.length} papers! The topic "${topTopic[0]}" appears frequently. Want to create a lesson on it?`,
      dismissible: true,
      metadata: { topic: topTopic[0], frequency: topTopic[1] },
    };
  }

  /**
   * Suggest sketch generation after new scan
   */
  private suggestSketchGeneration(): VidyaSuggestion | null {
    if (this.userRole !== 'teacher') return null;

    // Check if there's a recent scan without sketches
    const recentScan = this.getRecentActivity('scan', 5 * 60 * 1000); // Last 5 minutes
    if (!recentScan) return null;

    const scan = this.appContext.selectedScan;
    if (!scan || !scan.analysisData) return null;

    const questionCount = scan.analysisData.questions?.length || 0;
    if (questionCount === 0) return null;

    return {
      id: 'generate-sketches',
      trigger: 'data_updated',
      priority: 'high',
      message: `Scan complete! "${scan.name}" has ${questionCount} questions. Generate high-yield visual sketches?`,
      dismissible: true,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Expires in 10 minutes
    };
  }

  /**
   * Suggest insights analysis
   */
  private suggestInsightsAnalysis(): VidyaSuggestion | null {
    if (this.userRole !== 'teacher') return null;

    const scans = this.appContext.scannedPapers || [];
    if (scans.length < 3) return null;

    // Check if insights haven't been requested recently
    const recentInsights = this.getRecentActivity('other', 30 * 60 * 1000); // Last 30 min
    if (recentInsights) return null;

    return {
      id: 'suggest-insights',
      trigger: 'pattern_detected',
      priority: 'low',
      message: `With ${scans.length} scans, I can show you topic trends, difficulty patterns, and predictions. Interested?`,
      dismissible: true,
    };
  }

  /**
   * Suggest data export
   */
  private suggestExportData(): VidyaSuggestion | null {
    if (this.userRole !== 'teacher') return null;

    const scans = this.appContext.scannedPapers || [];
    if (scans.length < 10) return null;

    // Only suggest once
    if (this.dismissedSuggestions.has('export-data')) return null;

    return {
      id: 'export-data',
      trigger: 'milestone_reached',
      priority: 'low',
      message: `You have scanned ${scans.length} papers! Want to export your analysis data for backup or sharing?`,
      dismissible: true,
    };
  }

  /**
   * Suggest viewing specific analysis
   */
  private suggestViewAnalysis(): VidyaSuggestion | null {
    if (this.userRole !== 'teacher') return null;
    if (this.appContext.currentView === 'analysis') return null;

    const scan = this.appContext.selectedScan;
    if (!scan || scan.status !== 'Complete') return null;

    return {
      id: 'view-analysis',
      trigger: 'data_updated',
      priority: 'medium',
      message: `"${scan.name}" is ready! View the complete analysis with charts and insights?`,
      dismissible: true,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUGGESTION RULES (STUDENT MODE)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Suggest practice quiz for low mastery
   */
  private suggestPracticeQuiz(): VidyaSuggestion | null {
    if (this.userRole !== 'student') return null;

    const progress = this.appContext.userProgress;
    if (!progress || progress.masteryScore >= 70) return null;

    // Check if quiz was attempted recently
    const recentQuizzes = progress.quizHistory || [];
    if (recentQuizzes.length > 0) {
      const lastQuiz = recentQuizzes[recentQuizzes.length - 1];
      // Don't suggest if quiz was taken in last hour
      const hoursSinceQuiz =
        (Date.now() - new Date(lastQuiz.timestamp || 0).getTime()) / (1000 * 60 * 60);
      if (hoursSinceQuiz < 1) return null;
    }

    return {
      id: 'practice-quiz',
      trigger: 'milestone_reached',
      priority: 'high',
      message: `Your mastery is at ${progress.masteryScore}%. A quick practice quiz can help boost your understanding!`,
      dismissible: true,
    };
  }

  /**
   * Suggest mastery improvement strategies
   */
  private suggestImproveMastery(): VidyaSuggestion | null {
    if (this.userRole !== 'student') return null;

    const progress = this.appContext.userProgress;
    if (!progress) return null;

    const misconceptions = progress.misconceptions || [];
    if (misconceptions.length === 0) return null;

    return {
      id: 'improve-mastery',
      trigger: 'pattern_detected',
      priority: 'medium',
      message: `I notice you are struggling with ${misconceptions.length} topics. Want tips on how to master them?`,
      dismissible: true,
    };
  }

  /**
   * Suggest milestone celebration
   */
  private suggestMilestone(): VidyaSuggestion | null {
    if (this.userRole !== 'student') return null;

    const progress = this.appContext.userProgress;
    if (!progress) return null;

    // Check for milestone achievements
    if (progress.masteryScore === 100) {
      return {
        id: 'milestone-100',
        trigger: 'milestone_reached',
        priority: 'urgent',
        message: '🎉 Perfect mastery achieved! You have completed this lesson with 100% mastery. Amazing work!',
        dismissible: true,
      };
    }

    if (progress.masteryScore >= 80 && progress.masteryScore < 85) {
      return {
        id: 'milestone-80',
        trigger: 'milestone_reached',
        priority: 'high',
        message: '✨ Great progress! You have reached 80%+ mastery. Keep going to achieve excellence!',
        dismissible: true,
      };
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get days since last scan
   */
  private getDaysSinceLastScan(): number {
    const scans = this.appContext.scannedPapers || [];
    if (scans.length === 0) return Infinity;

    const latestScan = scans.reduce((latest, scan) =>
      scan.timestamp > latest.timestamp ? scan : latest
    );

    const daysDiff = (Date.now() - latestScan.timestamp) / (1000 * 60 * 60 * 24);
    return Math.floor(daysDiff);
  }

  /**
   * Check for recent activity of a specific type
   */
  private getRecentActivity(
    type: VidyaActivity['type'],
    withinMs: number
  ): VidyaActivity | null {
    const cutoff = Date.now() - withinMs;

    return (
      this.activityLog
        .reverse()
        .find((activity) => activity.type === type && activity.timestamp.getTime() > cutoff) ||
      null
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create suggestion engine instance
 */
export function createSuggestionEngine(
  appContext: VidyaAppContext,
  userRole: UserRole,
  activityLog: VidyaActivity[] = []
): VidyaSuggestionEngine {
  return new VidyaSuggestionEngine(appContext, userRole, activityLog);
}

/**
 * Filter expired suggestions
 */
export function filterExpiredSuggestions(
  suggestions: VidyaSuggestion[]
): VidyaSuggestion[] {
  const now = new Date();
  return suggestions.filter(
    (s) => !s.expiresAt || s.expiresAt.getTime() > now.getTime()
  );
}
