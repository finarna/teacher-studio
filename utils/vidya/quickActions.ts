/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - CONTEXT-AWARE QUICK ACTIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Smart suggestion chips that reduce user typing friction
 * Inspired by clean math chat pattern
 *
 * Context-aware: Actions adapt based on:
 * - User role (Teacher/Student)
 * - Current view
 * - Available data (scanned papers, current scan)
 */

import { VidyaRole } from './systemInstructions';
import { VidyaContextPayload } from './contextBuilder';

export interface QuickAction {
  id: string;
  label: string;
  prompt: string; // Full prompt to send to Vidya
  icon?: string; // Lucide icon name (optional)
}

/**
 * Get quick actions based on role and context
 */
export function getQuickActions(
  role: VidyaRole,
  context: VidyaContextPayload
): QuickAction[] {
  const actions: QuickAction[] = [];

  if (role === 'teacher') {
    // TEACHER MODE ACTIONS
    return getTeacherQuickActions(context);
  } else {
    // STUDENT MODE ACTIONS
    return getStudentQuickActions(context);
  }
}

/**
 * Teacher mode quick actions
 */
function getTeacherQuickActions(context: VidyaContextPayload): QuickAction[] {
  const actions: QuickAction[] = [];

  // If viewing a specific scan
  if (context.currentScan) {
    const scanName = context.currentScan.name;

    actions.push({
      id: 'analyze-current-scan',
      label: `Analyze ${scanName.substring(0, 15)}...`,
      prompt: `Analyze the difficulty distribution and topic coverage in "${scanName}". Identify areas students might struggle with.`,
      icon: 'BarChart3',
    });

    actions.push({
      id: 'study-plan',
      label: 'Generate Study Plan',
      prompt: `Create a structured study plan prioritizing the hardest topics in "${scanName}". Include time estimates and practice recommendations.`,
      icon: 'Calendar',
    });

    if (context.currentScan.questionCount > 0) {
      actions.push({
        id: 'pedagogical-insights',
        label: 'Teaching Insights',
        prompt: `What are the key pedagogical considerations for teaching the topics in "${scanName}"? Include common student misconceptions.`,
        icon: 'Lightbulb',
      });
    }
  }

  // If multiple scans available
  if (context.scannedPapers.total > 1) {
    actions.push({
      id: 'cross-scan-analysis',
      label: 'Cross-Scan Analysis',
      prompt: `Compare difficulty and topic distribution across all ${context.scannedPapers.total} scanned papers. Identify trends and patterns.`,
      icon: 'TrendingUp',
    });
  }

  // If recurring questions found
  if (context.topRecurringQuestions && context.topRecurringQuestions.length > 0) {
    actions.push({
      id: 'recurring-analysis',
      label: 'Recurring Questions',
      prompt: `Analyze the most frequently appearing questions. Why are these patterns important? What do they reveal about exam structure?`,
      icon: 'Repeat',
    });
  }

  // General teacher actions
  if (actions.length < 3) {
    actions.push({
      id: 'weak-topics',
      label: 'Identify Weak Topics',
      prompt: `Based on question difficulty and complexity, which topics require the most teaching attention?`,
      icon: 'AlertCircle',
    });
  }

  // Limit to 4 actions max
  return actions.slice(0, 4);
}

/**
 * Student mode quick actions
 */
function getStudentQuickActions(context: VidyaContextPayload): QuickAction[] {
  const actions: QuickAction[] = [];

  // If viewing a specific scan
  if (context.currentScan) {
    const scanName = context.currentScan.name;

    actions.push({
      id: 'hardest-question',
      label: 'Which is Hardest?',
      prompt: `Which question in "${scanName}" is the most difficult and why? How should I approach it?`,
      icon: 'Zap',
    });

    actions.push({
      id: 'study-tips',
      label: 'Study Tips',
      prompt: `Give me specific study tips and strategies for mastering the topics in "${scanName}".`,
      icon: 'BookOpen',
    });
  }

  // If recurring questions available
  if (context.topRecurringQuestions && context.topRecurringQuestions.length > 0) {
    const topQuestion = context.topRecurringQuestions[0];
    actions.push({
      id: 'master-recurring',
      label: 'Master Top Pattern',
      prompt: `Teach me how to solve the question that appears most frequently: "${topQuestion.text.substring(0, 50)}..." It appears ${topQuestion.frequency} times.`,
      icon: 'Target',
    });
  }

  // If questions available
  if (context.questions.length > 0) {
    actions.push({
      id: 'topic-breakdown',
      label: 'Topic Breakdown',
      prompt: `Break down the main topics I need to study. Which ones are most important?`,
      icon: 'List',
    });
  }

  // General student actions
  if (actions.length < 3) {
    actions.push({
      id: 'study-schedule',
      label: 'Create Schedule',
      prompt: `Help me create a study schedule based on my exam papers. Prioritize by difficulty and importance.`,
      icon: 'Calendar',
    });
  }

  // Limit to 4 actions max
  return actions.slice(0, 4);
}

/**
 * Get default actions when no context available
 */
export function getDefaultQuickActions(role: VidyaRole): QuickAction[] {
  if (role === 'teacher') {
    return [
      {
        id: 'upload-scan',
        label: 'How to Upload Papers',
        prompt: 'How do I upload and scan exam papers in the app?',
        icon: 'Upload',
      },
      {
        id: 'features-overview',
        label: 'Features Overview',
        prompt: 'What analytical features are available for teachers?',
        icon: 'Info',
      },
    ];
  } else {
    return [
      {
        id: 'getting-started',
        label: 'Getting Started',
        prompt: 'How can you help me study and prepare for exams?',
        icon: 'HelpCircle',
      },
      {
        id: 'study-tips-general',
        label: 'General Study Tips',
        prompt: 'What are some effective study strategies for exam preparation?',
        icon: 'BookOpen',
      },
    ];
  }
}
