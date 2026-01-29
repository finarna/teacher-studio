/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - PERFORMANCE MONITORING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive performance tracking and analytics
 */

import { IntentType } from './intentClassifier';

export interface PerformanceMetrics {
  messageId: string;
  intent: IntentType;
  userRole: 'teacher' | 'student';
  contextSize: number; // Bytes
  questionCount: number;
  responseTime: number; // ms
  streamingDuration: number; // ms
  tokenCount: number; // Estimated
  cacheHit: boolean;
  timestamp: Date;
}

// In-memory metrics storage
const metrics: PerformanceMetrics[] = [];
const MAX_METRICS = 100; // Keep last 100 measurements

/**
 * Track performance for a message
 */
export function trackMessagePerformance(data: PerformanceMetrics): void {
  metrics.push(data);

  // Keep only last MAX_METRICS entries
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    const contextSizeKB = (data.contextSize / 1024).toFixed(2);
    const responseTimeSec = (data.responseTime / 1000).toFixed(2);

    console.log('[Performance] Message tracked', {
      intent: data.intent,
      responseTime: `${data.responseTime}ms (${responseTimeSec}s)`,
      contextSize: `${contextSizeKB} KB`,
      tokenCount: data.tokenCount,
      cacheHit: data.cacheHit ? '✅ CACHED' : '🔨 BUILT',
      questionCount: data.questionCount,
    });
  }

  // Future: Send to backend analytics
  // sendToAnalytics(data);
}

/**
 * Estimate token count from text
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Get performance report
 */
export function getPerformanceReport(): {
  totalQueries: number;
  avgResponseTime: number;
  avgContextSize: number;
  avgTokens: number;
  cacheHitRate: number;
  slowestQuery: PerformanceMetrics | null;
  fastestQuery: PerformanceMetrics | null;
  intentBreakdown: Record<IntentType, number>;
  roleBreakdown: Record<string, number>;
} {
  const total = metrics.length;

  if (total === 0) {
    return {
      totalQueries: 0,
      avgResponseTime: 0,
      avgContextSize: 0,
      avgTokens: 0,
      cacheHitRate: 0,
      slowestQuery: null,
      fastestQuery: null,
      intentBreakdown: {} as Record<IntentType, number>,
      roleBreakdown: {},
    };
  }

  // Calculate averages
  const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / total;
  const avgContextSize = metrics.reduce((sum, m) => sum + m.contextSize, 0) / total;
  const avgTokens = metrics.reduce((sum, m) => sum + m.tokenCount, 0) / total;

  // Cache hit rate
  const cacheHits = metrics.filter(m => m.cacheHit).length;
  const cacheHitRate = (cacheHits / total) * 100;

  // Find extremes
  const slowestQuery = metrics.reduce((a, b) => (a.responseTime > b.responseTime ? a : b));
  const fastestQuery = metrics.reduce((a, b) => (a.responseTime < b.responseTime ? a : b));

  // Intent breakdown
  const intentBreakdown: Record<string, number> = {};
  metrics.forEach(m => {
    intentBreakdown[m.intent] = (intentBreakdown[m.intent] || 0) + 1;
  });

  // Role breakdown
  const roleBreakdown: Record<string, number> = {};
  metrics.forEach(m => {
    roleBreakdown[m.userRole] = (roleBreakdown[m.userRole] || 0) + 1;
  });

  return {
    totalQueries: total,
    avgResponseTime: Math.round(avgResponseTime),
    avgContextSize: Math.round(avgContextSize),
    avgTokens: Math.round(avgTokens),
    cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
    slowestQuery,
    fastestQuery,
    intentBreakdown: intentBreakdown as Record<IntentType, number>,
    roleBreakdown,
  };
}

/**
 * Print formatted performance report to console
 */
export function printPerformanceReport(): void {
  const report = getPerformanceReport();

  console.group('📊 VidyaV3 Performance Report');
  console.log(`Total Queries: ${report.totalQueries}`);
  console.log(`Avg Response Time: ${report.avgResponseTime}ms (${(report.avgResponseTime / 1000).toFixed(2)}s)`);
  console.log(`Avg Context Size: ${(report.avgContextSize / 1024).toFixed(2)} KB`);
  console.log(`Avg Tokens: ${report.avgTokens}`);
  console.log(`Cache Hit Rate: ${report.cacheHitRate}%`);

  if (report.slowestQuery) {
    console.log(`\n🐌 Slowest Query: ${report.slowestQuery.responseTime}ms (${report.slowestQuery.intent})`);
  }

  if (report.fastestQuery) {
    console.log(`⚡ Fastest Query: ${report.fastestQuery.responseTime}ms (${report.fastestQuery.intent})`);
  }

  console.log('\n📋 Intent Breakdown:');
  Object.entries(report.intentBreakdown).forEach(([intent, count]) => {
    const percentage = ((count / report.totalQueries) * 100).toFixed(1);
    console.log(`  ${intent}: ${count} (${percentage}%)`);
  });

  console.log('\n👤 Role Breakdown:');
  Object.entries(report.roleBreakdown).forEach(([role, count]) => {
    const percentage = ((count / report.totalQueries) * 100).toFixed(1);
    console.log(`  ${role}: ${count} (${percentage}%)`);
  });

  console.groupEnd();
}

/**
 * Get recent metrics (last N)
 */
export function getRecentMetrics(count: number = 10): PerformanceMetrics[] {
  return metrics.slice(-count);
}

/**
 * Clear all metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
  console.log('[Performance] Metrics cleared');
}

/**
 * Export metrics to JSON (for external analysis)
 */
export function exportMetrics(): string {
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    totalMetrics: metrics.length,
    metrics: metrics,
    summary: getPerformanceReport(),
  }, null, 2);
}

/**
 * Check if performance is degrading
 */
export function checkPerformanceHealth(): {
  status: 'good' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
} {
  const report = getPerformanceReport();
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check response time (thresholds in ms)
  if (report.avgResponseTime > 5000) {
    issues.push(`High average response time: ${report.avgResponseTime}ms`);
    recommendations.push('Consider implementing more aggressive context compression');
  } else if (report.avgResponseTime > 3000) {
    issues.push(`Elevated response time: ${report.avgResponseTime}ms`);
    recommendations.push('Monitor context payload sizes and optimize if needed');
  }

  // Check context size (thresholds in KB)
  const avgContextSizeKB = report.avgContextSize / 1024;
  if (avgContextSizeKB > 80) {
    issues.push(`Large context payloads: ${avgContextSizeKB.toFixed(2)} KB average`);
    recommendations.push('Enable context compression or reduce question limits');
  } else if (avgContextSizeKB > 50) {
    issues.push(`Context size above optimal: ${avgContextSizeKB.toFixed(2)} KB`);
    recommendations.push('Review compression settings');
  }

  // Check cache hit rate
  if (report.cacheHitRate < 30 && report.totalQueries > 10) {
    issues.push(`Low cache hit rate: ${report.cacheHitRate}%`);
    recommendations.push('Users may be switching contexts frequently - this is normal but cache may need tuning');
  }

  // Determine status
  let status: 'good' | 'warning' | 'critical' = 'good';
  if (issues.length > 2 || report.avgResponseTime > 5000) {
    status = 'critical';
  } else if (issues.length > 0) {
    status = 'warning';
  }

  return {
    status,
    issues,
    recommendations,
  };
}

/**
 * Get performance metrics for specific intent type
 */
export function getMetricsByIntent(intent: IntentType): PerformanceMetrics[] {
  return metrics.filter(m => m.intent === intent);
}

/**
 * Get performance metrics for specific role
 */
export function getMetricsByRole(role: 'teacher' | 'student'): PerformanceMetrics[] {
  return metrics.filter(m => m.userRole === role);
}

/**
 * Calculate percentile (e.g., p95, p99)
 */
export function getResponseTimePercentile(percentile: number): number {
  if (metrics.length === 0) return 0;

  const sorted = [...metrics].sort((a, b) => a.responseTime - b.responseTime);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index]?.responseTime || 0;
}

// Development helpers - expose to window in dev mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).vidyaPerf = {
    report: printPerformanceReport,
    export: exportMetrics,
    health: checkPerformanceHealth,
    clear: clearMetrics,
    raw: () => metrics,
    p95: () => getResponseTimePercentile(95),
    p99: () => getResponseTimePercentile(99),
  };

  console.log('💡 VidyaV3 Performance Tools available at window.vidyaPerf');
  console.log('   - vidyaPerf.report() - Print detailed report');
  console.log('   - vidyaPerf.health() - Check performance health');
  console.log('   - vidyaPerf.export() - Export metrics as JSON');
  console.log('   - vidyaPerf.p95() - Get 95th percentile response time');
}
