/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - BACKEND INTEGRATION (Phase 5)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Backend API integration for:
 * - Audit logging
 * - Analytics tracking
 * - Performance metrics
 * - Security events
 */

import { PerformanceMetrics } from './performanceMonitor';

/**
 * Backend API configuration
 */
const API_CONFIG = {
  baseURL: import.meta.env.VITE_BACKEND_URL || '/api/v1',
  timeout: 5000,
  retryAttempts: 2,
};

/**
 * Audit event types
 */
export type AuditEventType =
  | 'ACCESS_DENIED'
  | 'PERMISSION_FILTERED'
  | 'SUSPICIOUS_QUERY'
  | 'TOOL_EXECUTED'
  | 'CONTEXT_CACHED'
  | 'PERFORMANCE_THRESHOLD_EXCEEDED';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  eventType: AuditEventType;
  userId?: string;
  userRole: 'teacher' | 'student';
  sessionId?: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Queue for batching audit logs
 */
const auditQueue: AuditLogEntry[] = [];
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds

/**
 * Send audit log to backend
 */
export async function sendAuditLog(entry: AuditLogEntry): Promise<boolean> {
  // Add to queue
  auditQueue.push(entry);

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('[Audit]', {
      type: entry.eventType,
      role: entry.userRole,
      severity: entry.severity,
      details: entry.details,
    });
  }

  // Flush if batch size reached
  if (auditQueue.length >= BATCH_SIZE) {
    return flushAuditLogs();
  }

  return true;
}

/**
 * Flush audit logs to backend
 */
async function flushAuditLogs(): Promise<boolean> {
  if (auditQueue.length === 0) return true;

  const batch = [...auditQueue];
  auditQueue.length = 0; // Clear queue

  try {
    const response = await fetch(`${API_CONFIG.baseURL}/audit/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs: batch }),
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    });

    if (!response.ok) {
      console.warn('[Audit] Failed to send logs:', response.statusText);
      // Re-queue on failure (up to retry limit)
      if (batch.length < BATCH_SIZE * 2) {
        auditQueue.unshift(...batch);
      }
      return false;
    }

    console.log(`[Audit] Sent ${batch.length} logs to backend`);
    return true;
  } catch (error) {
    console.warn('[Audit] Network error sending logs:', error);
    // Re-queue on network error
    if (batch.length < BATCH_SIZE * 2) {
      auditQueue.unshift(...batch);
    }
    return false;
  }
}

/**
 * Send performance metrics to backend
 */
export async function sendPerformanceMetrics(
  metrics: PerformanceMetrics
): Promise<boolean> {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/analytics/performance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    });

    if (!response.ok) {
      console.warn('[Analytics] Failed to send performance metrics');
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[Analytics] Network error sending metrics:', error);
    return false;
  }
}

/**
 * Send user interaction event
 */
export async function trackUserInteraction(event: {
  type: 'message_sent' | 'quick_action_clicked' | 'role_switched' | 'chat_opened' | 'chat_closed';
  userRole: 'teacher' | 'student';
  details?: Record<string, any>;
}): Promise<boolean> {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/analytics/interaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...event,
        timestamp: new Date(),
      }),
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    });

    return response.ok;
  } catch (error) {
    // Silent fail for analytics
    return false;
  }
}

/**
 * Report error to backend
 */
export async function reportError(error: {
  type: 'gemini_api_error' | 'context_build_error' | 'tool_execution_error' | 'unknown_error';
  message: string;
  stack?: string;
  context?: Record<string, any>;
}): Promise<boolean> {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/errors/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...error,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
      }),
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    });

    if (response.ok) {
      console.log('[ErrorReporting] Error reported to backend');
    }

    return response.ok;
  } catch (networkError) {
    console.error('[ErrorReporting] Failed to report error:', networkError);
    return false;
  }
}

/**
 * Get feature flags from backend (dynamic configuration)
 */
export async function fetchFeatureFlags(): Promise<Record<string, boolean>> {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/config/feature-flags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    });

    if (!response.ok) {
      console.warn('[Config] Failed to fetch feature flags');
      return {};
    }

    const data = await response.json();
    return data.flags || {};
  } catch (error) {
    console.warn('[Config] Network error fetching feature flags:', error);
    return {};
  }
}

/**
 * Initialize backend integration
 */
export function initializeBackendIntegration(): () => void {
  // Start periodic audit log flushing
  const flushInterval = setInterval(() => {
    flushAuditLogs();
  }, FLUSH_INTERVAL);

  // Flush on page unload
  const handleBeforeUnload = () => {
    flushAuditLogs();
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Return cleanup function
  return () => {
    clearInterval(flushInterval);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    flushAuditLogs(); // Final flush
  };
}

/**
 * Helper: Create audit log entry
 */
export function createAuditEntry(
  eventType: AuditEventType,
  userRole: 'teacher' | 'student',
  details: Record<string, any>,
  severity: 'info' | 'warning' | 'error' = 'info'
): AuditLogEntry {
  return {
    eventType,
    userRole,
    timestamp: new Date(),
    details,
    severity,
  };
}

/**
 * Integration with existing RBAC audit logging
 */
export function enhanceRBACLogging(): void {
  // This can be called to upgrade console-based logging to backend logging
  // Could intercept console.warn calls for '[RBAC Audit]' and send to backend
  console.log('[Backend] Enhanced RBAC logging initialized');
}

// Development helpers
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).vidyaBackend = {
    flushLogs: flushAuditLogs,
    queueSize: () => auditQueue.length,
    testAudit: (type: AuditEventType) => {
      sendAuditLog(createAuditEntry(type, 'student', { test: true }, 'info'));
    },
  };

  console.log('💡 VidyaV3 Backend Tools available at window.vidyaBackend');
}
