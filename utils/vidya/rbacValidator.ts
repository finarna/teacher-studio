/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - RBAC SECURITY VALIDATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Role-Based Access Control for Vidya chatbot
 * Ensures appropriate data access and action permissions based on user role
 *
 * Design Philosophy:
 * - Lightweight validation (trust AI, validate boundaries)
 * - Clear permission rules
 * - Audit logging for security monitoring
 * - Graceful degradation (filter, don't block)
 */

import { VidyaRole } from './systemInstructions';
import { VidyaContextPayload } from './contextBuilder';
import { IntentType } from './intentClassifier';

/**
 * Permission levels for different data types
 */
export enum PermissionLevel {
  FULL_ACCESS = 'full',        // Teacher: All analytics, answer keys, admin data
  EDUCATIONAL = 'educational', // Student: Questions, explanations, study guidance
  RESTRICTED = 'restricted',   // Sensitive data - redacted or filtered
}

/**
 * Data categories requiring permission checks
 */
export type DataCategory =
  | 'analytics'           // Difficulty distributions, statistical analysis
  | 'answer_keys'         // Correct answers, solutions
  | 'question_content'    // Question text, options, topics
  | 'study_guidance'      // Explanations, study tips, learning resources
  | 'pedagogical_insights'// Teaching strategies, misconceptions
  | 'cross_scan_data'     // Multi-paper analysis, trends
  | 'administrative'      // User data, scan metadata, system info
  | 'temporal_analysis';  // Longitudinal trends, cognitive drift

/**
 * Action categories requiring permission checks
 */
export type ActionCategory =
  | 'view_analytics'
  | 'access_answers'
  | 'generate_content'
  | 'export_data'
  | 'cross_compare'
  | 'temporal_analysis'
  | 'pedagogical_planning';

/**
 * RBAC Permission Matrix
 */
const PERMISSION_MATRIX: Record<VidyaRole, Record<DataCategory, PermissionLevel>> = {
  teacher: {
    analytics: PermissionLevel.FULL_ACCESS,
    answer_keys: PermissionLevel.FULL_ACCESS,
    question_content: PermissionLevel.FULL_ACCESS,
    study_guidance: PermissionLevel.FULL_ACCESS,
    pedagogical_insights: PermissionLevel.FULL_ACCESS,
    cross_scan_data: PermissionLevel.FULL_ACCESS,
    administrative: PermissionLevel.FULL_ACCESS,
    temporal_analysis: PermissionLevel.FULL_ACCESS,
  },
  student: {
    analytics: PermissionLevel.EDUCATIONAL, // Basic stats only, no deep analytics
    answer_keys: PermissionLevel.RESTRICTED, // No direct answers, guidance only
    question_content: PermissionLevel.FULL_ACCESS,
    study_guidance: PermissionLevel.FULL_ACCESS,
    pedagogical_insights: PermissionLevel.RESTRICTED, // No teaching strategies
    cross_scan_data: PermissionLevel.EDUCATIONAL, // Basic comparisons, no deep analysis
    administrative: PermissionLevel.RESTRICTED,
    temporal_analysis: PermissionLevel.EDUCATIONAL, // Progress trends, not analytical
  },
};

/**
 * Action Permission Matrix
 */
const ACTION_PERMISSIONS: Record<VidyaRole, Set<ActionCategory>> = {
  teacher: new Set([
    'view_analytics',
    'access_answers',
    'generate_content',
    'export_data',
    'cross_compare',
    'temporal_analysis',
    'pedagogical_planning',
  ]),
  student: new Set([
    'view_analytics', // Limited to educational stats
    'generate_content', // Study materials only
    'cross_compare', // Basic comparisons for study planning
  ]),
};

/**
 * Validation result
 */
export interface ValidationResult {
  allowed: boolean;
  level: PermissionLevel;
  reason?: string;
  filteredData?: any;
}

/**
 * Check if a role has permission for a data category
 */
export function validateDataAccess(
  role: VidyaRole,
  category: DataCategory
): ValidationResult {
  const level = PERMISSION_MATRIX[role][category];

  if (level === PermissionLevel.RESTRICTED) {
    return {
      allowed: false,
      level,
      reason: `${category} is restricted for ${role} role`,
    };
  }

  return {
    allowed: true,
    level,
  };
}

/**
 * Check if a role can perform an action
 */
export function validateAction(
  role: VidyaRole,
  action: ActionCategory
): ValidationResult {
  const allowed = ACTION_PERMISSIONS[role].has(action);

  if (!allowed) {
    return {
      allowed: false,
      level: PermissionLevel.RESTRICTED,
      reason: `Action ${action} not permitted for ${role} role`,
    };
  }

  return {
    allowed: true,
    level: PermissionLevel.FULL_ACCESS,
  };
}

/**
 * Filter context data based on role permissions
 *
 * This is the main security function that filters context payload
 * before sending to Gemini, ensuring students don't see restricted data
 */
export function filterContextByRole(
  context: VidyaContextPayload,
  role: VidyaRole
): VidyaContextPayload {
  // Teachers get full context, no filtering
  if (role === 'teacher') {
    return context;
  }

  // STUDENT MODE: Filter restricted data
  const filteredContext: VidyaContextPayload = {
    ...context,
    questions: context.questions.map((q) => {
      // Remove correct answers for students (guidance mode, not answer mode)
      const { correctAnswer, ...questionWithoutAnswer } = q;
      return {
        ...questionWithoutAnswer,
        // Keep options for learning, but remove answer indication
        options: q.options,
      };
    }),
  };

  // Filter currentScan to remove sensitive analytics for students
  if (filteredContext.currentScan) {
    filteredContext.currentScan = {
      ...filteredContext.currentScan,
      // Keep topic distribution and difficulty breakdown for study planning
      topicDistribution: filteredContext.currentScan.topicDistribution,
      difficultyBreakdown: filteredContext.currentScan.difficultyBreakdown,
    };
  }

  return filteredContext;
}

/**
 * Map intent types to action categories for validation
 */
export function intentToActionCategory(intent: IntentType): ActionCategory | null {
  switch (intent) {
    case 'analysis_request':
      return 'view_analytics';
    case 'action_request':
      return 'generate_content';
    case 'info_request':
      return 'view_analytics';
    case 'educational_query':
      return null; // Always allowed for all roles
    default:
      return null;
  }
}

/**
 * Validate intent against role permissions
 */
export function validateIntent(
  role: VidyaRole,
  intent: IntentType
): ValidationResult {
  const actionCategory = intentToActionCategory(intent);

  // Educational queries are always allowed
  if (!actionCategory || intent === 'educational_query') {
    return {
      allowed: true,
      level: PermissionLevel.FULL_ACCESS,
    };
  }

  return validateAction(role, actionCategory);
}

/**
 * Audit log for security events
 * (Can be extended to send to backend/analytics)
 */
export function auditSecurityEvent(
  event: 'ACCESS_DENIED' | 'PERMISSION_FILTERED' | 'SUSPICIOUS_QUERY',
  details: {
    role: VidyaRole;
    category?: DataCategory | ActionCategory;
    intent?: IntentType;
    query?: string;
    timestamp?: Date;
  }
): void {
  const auditEntry = {
    event,
    ...details,
    timestamp: details.timestamp || new Date(),
  };

  // Log to console for now (Phase 4: Send to backend analytics)
  console.warn('[RBAC Audit]', auditEntry);

  // Future: Send to backend audit log
  // await fetch('/api/audit/log', { method: 'POST', body: JSON.stringify(auditEntry) });
}

/**
 * Security validation for entire chat flow
 *
 * This is the main function called before sending context to Gemini
 */
export function validateChatSecurity(
  role: VidyaRole,
  intent: IntentType,
  context: VidyaContextPayload,
  userQuery: string
): {
  validated: boolean;
  filteredContext: VidyaContextPayload;
  warnings: string[];
} {
  const warnings: string[] = [];

  // 1. Validate intent against role permissions
  const intentValidation = validateIntent(role, intent);
  if (!intentValidation.allowed) {
    auditSecurityEvent('ACCESS_DENIED', {
      role,
      intent,
      query: userQuery,
    });
    warnings.push(intentValidation.reason || 'Intent not permitted');
  }

  // 2. Filter context data based on role
  const filteredContext = filterContextByRole(context, role);

  // 3. Check for suspicious queries (Phase 4: Enhanced detection)
  const suspiciousPatterns = [
    /give\s+me\s+answers?/i,
    /show\s+me\s+correct\s+answer/i,
    /what'?s?\s+the\s+answer/i,
  ];

  if (role === 'student' && suspiciousPatterns.some((p) => p.test(userQuery))) {
    auditSecurityEvent('SUSPICIOUS_QUERY', {
      role,
      query: userQuery,
    });
    warnings.push('Detected answer-seeking query from student');
  }

  return {
    validated: warnings.length === 0,
    filteredContext,
    warnings,
  };
}
