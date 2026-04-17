/**
 * Calibration Reporter - Comprehensive Report Generation
 * Part of REI v16 Iterative Calibration System
 *
 * Generates markdown reports with:
 * - Year-by-year calibration results
 * - Final calibrated parameters
 * - Identity bank evolution
 * - Topic distribution analysis
 * - Validation metrics
 */

import type { CalibrationState } from './parameterAdjuster';
import type { ComparisonSummary } from './questionComparator';
import fs from 'fs';
import path from 'path';

export interface YearCalibrationResult {
  year: number;
  iterations: number;
  finalMatchRate: number;
  finalAverageScore: number;
  identityHitRate: number;
  topicAccuracy: number;
  difficultyAccuracy: number;
  idsActual: number;
  idsPredicted: number;
  calibrationState: CalibrationState;
  comparisonSummary: ComparisonSummary;
  identityVector?: Record<string, number>;
  boardSignature?: string;
}

export interface MultiYearCalibrationReport {
  examContext: string;
  subject: string;
  years: YearCalibrationResult[];
  finalParameters: any;
  identityEvolution: any[];
  topicDistribution: any;
  validationMetrics: any;
}

/**
 * Generate comprehensive calibration report in markdown format
 */
export function generateCalibrationReport(
  report: MultiYearCalibrationReport,
  outputPath: string
): void {
  const lines: string[] = [];

  // Header
  lines.push(`# ${report.examContext} ${report.subject} Iterative Calibration Report (2021-2025)`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**REI Version:** v16.17`);
  lines.push(`**Calibration Method:** Iterative RWC with Multi-Dimensional Question Comparison`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  generateExecutiveSummary(report, lines);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Year-by-Year Results
  lines.push('## Year-by-Year Calibration Results');
  lines.push('');
  generateYearByYearResults(report, lines);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Final Calibrated Parameters
  lines.push('## Final Calibrated Parameters');
  lines.push('');
  generateFinalParameters(report, lines);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Identity Bank Evolution
  lines.push('## Identity Bank Evolution');
  lines.push('');
  generateIdentityEvolution(report, lines);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Topic Distribution Analysis
  lines.push('## Topic Distribution Analysis');
  lines.push('');
  generateTopicDistribution(report, lines);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Validation Metrics
  lines.push('## Validation Metrics');
  lines.push('');
  generateValidationMetrics(report, lines);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Recommendations
  lines.push('## Recommendations & Insights');
  lines.push('');
  generateRecommendations(report, lines);
  lines.push('');

  // Write to file
  const markdown = lines.join('\n');
  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(`\n✅ Calibration report saved: ${outputPath}`);
}

/**
 * Generate executive summary section
 */
function generateExecutiveSummary(
  report: MultiYearCalibrationReport,
  lines: string[]
): void {
  const avgMatchRate = report.years.reduce((sum, y) => sum + y.finalMatchRate, 0) / report.years.length;
  const avgIterations = report.years.reduce((sum, y) => sum + y.iterations, 0) / report.years.length;
  const totalIterations = report.years.reduce((sum, y) => sum + y.iterations, 0);

  const lastYear = report.years[report.years.length - 1];

  lines.push(`### Overall Performance`);
  lines.push('');
  lines.push(`- **Average Match Rate:** ${(avgMatchRate * 100).toFixed(1)}%`);
  lines.push(`- **Average Score:** ${(lastYear.finalAverageScore * 100).toFixed(1)}%`);
  lines.push(`- **Identity Hit Rate:** ${(lastYear.identityHitRate * 100).toFixed(1)}%`);
  lines.push(`- **Topic Accuracy:** ${(lastYear.topicAccuracy * 100).toFixed(1)}%`);
  lines.push(`- **Difficulty Accuracy:** ${(lastYear.difficultyAccuracy * 100).toFixed(1)}%`);
  lines.push('');
  lines.push(`### Calibration Effort`);
  lines.push('');
  lines.push(`- **Total Iterations:** ${totalIterations}`);
  lines.push(`- **Average Iterations per Year:** ${avgIterations.toFixed(1)}`);
  lines.push(`- **Years Calibrated:** ${report.years.length}`);
  lines.push('');
  lines.push(`### Convergence Status`);
  lines.push('');

  const successfulYears = report.years.filter(y => y.finalMatchRate >= 0.80).length;
  const convergenceRate = (successfulYears / report.years.length) * 100;

  if (convergenceRate >= 80) {
    lines.push(`✅ **EXCELLENT** - ${successfulYears}/${report.years.length} years achieved 80%+ match rate`);
  } else if (convergenceRate >= 60) {
    lines.push(`⚠️ **GOOD** - ${successfulYears}/${report.years.length} years achieved 80%+ match rate`);
  } else {
    lines.push(`❌ **NEEDS IMPROVEMENT** - Only ${successfulYears}/${report.years.length} years achieved 80%+ match rate`);
  }
  lines.push('');
}

/**
 * Generate year-by-year results table
 */
function generateYearByYearResults(
  report: MultiYearCalibrationReport,
  lines: string[]
): void {
  lines.push('| Year | Iterations | Match Rate | Avg Score | IHR | Topic Acc | Diff Acc | IDS (Pred) | IDS (Actual) | Status |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');

  for (const year of report.years) {
    const status = year.finalMatchRate >= 0.80 ? '✅ Target' :
                   year.finalMatchRate >= 0.70 ? '⚠️ Close' : '❌ Below';

    lines.push([
      `| ${year.year}`,
      `${year.iterations}`,
      `${(year.finalMatchRate * 100).toFixed(1)}%`,
      `${(year.finalAverageScore * 100).toFixed(1)}%`,
      `${(year.identityHitRate * 100).toFixed(1)}%`,
      `${(year.topicAccuracy * 100).toFixed(1)}%`,
      `${(year.difficultyAccuracy * 100).toFixed(1)}%`,
      `${year.idsPredicted.toFixed(3)}`,
      `${year.idsActual.toFixed(3)}`,
      `${status} |`
    ].join(' | '));
  }

  lines.push('');
  lines.push('**Legend:**');
  lines.push('- **IHR:** Identity Hit Rate (% of identities correctly predicted)');
  lines.push('- **Topic Acc:** Topic Accuracy (% of questions with correct topic)');
  lines.push('- **Diff Acc:** Difficulty Accuracy (% of questions with correct difficulty)');
  lines.push('- **IDS:** Item Difficulty Score (average cognitive demand)');
  lines.push('');

  // Detailed iteration logs for each year
  lines.push('### Detailed Iteration Logs');
  lines.push('');

  for (const year of report.years) {
    lines.push(`#### Year ${year.year}`);
    lines.push('');

    if (year.calibrationState.history.length > 0) {
      lines.push('| Iteration | Match Rate | Avg Score | Key Changes |');
      lines.push('| :--- | :--- | :--- | :--- |');

      for (const iter of year.calibrationState.history) {
        const changes = summarizeParameterChanges(iter.parameterChanges);
        lines.push([
          `| ${iter.iteration}`,
          `${(iter.matchRate * 100).toFixed(1)}%`,
          `${(iter.averageScore * 100).toFixed(1)}%`,
          `${changes} |`
        ].join(' | '));
      }

      lines.push('');
    } else {
      lines.push('No iteration history available.');
      lines.push('');
    }
  }
}

/**
 * Generate final calibrated parameters section
 */
function generateFinalParameters(
  report: MultiYearCalibrationReport,
  lines: string[]
): void {
  const params = report.finalParameters;

  lines.push('### Engine Configuration');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify({
    engine_version: "4.0",
    rigor_drift_multiplier: params.rigorDriftMultiplier,
    ids_baseline: params.idsBaseline,
    synthesis_weight: params.synthesisWeight,
    trap_weight: params.trapWeight,
    intent_learning_rate: params.intentLearningRate,
    volatility_factor: params.volatilityFactor,
    solve_tension_multiplier: params.solveTensionMultiplier,
    projection_buffer: params.projectionBuffer,
    last_updated: new Date().toISOString()
  }, null, 2));
  lines.push('```');
  lines.push('');

  lines.push('### Top 10 High-Confidence Identities');
  lines.push('');

  const sortedIdentities = Object.entries(params.identityConfidences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  lines.push('| Rank | Identity | Confidence | Classification |');
  lines.push('| :--- | :--- | :--- | :--- |');

  sortedIdentities.forEach(([id, conf], idx) => {
    const classification = conf >= 0.80 ? '🔥 High-Yield' :
                          conf >= 0.60 ? '⚡ Moderate' : '📚 Standard';

    lines.push(`| ${idx + 1} | ${id} | ${(conf * 100).toFixed(1)}% | ${classification} |`);
  });

  lines.push('');

  lines.push('### Low-Confidence Identities (< 40%)');
  lines.push('');

  const lowConfIdentities = Object.entries(params.identityConfidences)
    .filter(([, conf]) => conf < 0.40)
    .sort((a, b) => a[1] - b[1]);

  if (lowConfIdentities.length > 0) {
    lines.push('| Identity | Confidence | Status |');
    lines.push('| :--- | :--- | :--- |');

    lowConfIdentities.forEach(([id, conf]) => {
      lines.push(`| ${id} | ${(conf * 100).toFixed(1)}% | ⚠️ Rarely appears |`);
    });

    lines.push('');
  } else {
    lines.push('✅ All identities have confidence >= 40%');
    lines.push('');
  }
}

/**
 * Generate identity evolution analysis
 */
function generateIdentityEvolution(
  report: MultiYearCalibrationReport,
  lines: string[]
): void {
  const identities = report.identityEvolution;

  lines.push('### Confidence Changes (2021 → 2025)');
  lines.push('');

  // Calculate changes
  const changes = identities.map(id => {
    const initial = id.initialConfidence || 0.5;
    const final = id.finalConfidence || 0.5;
    const change = final - initial;
    return { ...id, initial, final, change };
  }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  // Top gainers
  lines.push('#### Top 10 Confidence Gainers');
  lines.push('');
  lines.push('| Identity | Topic | Initial | Final | Change |');
  lines.push('| :--- | :--- | :--- | :--- | :--- |');

  changes.filter(c => c.change > 0).slice(0, 10).forEach(id => {
    lines.push([
      `| ${id.id}`,
      `${id.topic || 'N/A'}`,
      `${(id.initial * 100).toFixed(1)}%`,
      `${(id.final * 100).toFixed(1)}%`,
      `+${(id.change * 100).toFixed(1)}% |`
    ].join(' | '));
  });

  lines.push('');

  // Top losers
  lines.push('#### Top 10 Confidence Losers');
  lines.push('');
  lines.push('| Identity | Topic | Initial | Final | Change |');
  lines.push('| :--- | :--- | :--- | :--- | :--- |');

  changes.filter(c => c.change < 0).slice(0, 10).forEach(id => {
    lines.push([
      `| ${id.id}`,
      `${id.topic || 'N/A'}`,
      `${(id.initial * 100).toFixed(1)}%`,
      `${(id.final * 100).toFixed(1)}%`,
      `${(id.change * 100).toFixed(1)}% |`
    ].join(' | '));
  });

  lines.push('');
}

/**
 * Generate topic distribution analysis
 */
function generateTopicDistribution(
  report: MultiYearCalibrationReport,
  lines: string[]
): void {
  const topics = report.topicDistribution;

  if (!topics || Object.keys(topics).length === 0) {
    lines.push('No topic distribution data available.');
    return;
  }

  lines.push('### Topic Coverage (2025 Final Paper)');
  lines.push('');
  lines.push('| Topic | Questions | Percentage | Trend |');
  lines.push('| :--- | :--- | :--- | :--- |');

  const sortedTopics = Object.entries(topics)
    .sort((a: any, b: any) => b[1].count - a[1].count);

  sortedTopics.forEach(([topic, data]: [string, any]) => {
    const trend = data.trending === 'up' ? '📈 Rising' :
                  data.trending === 'down' ? '📉 Declining' : '➡️ Stable';

    lines.push([
      `| ${topic}`,
      `${data.count}`,
      `${((data.count / 60) * 100).toFixed(1)}%`,
      `${trend} |`
    ].join(' | '));
  });

  lines.push('');
}

/**
 * Generate validation metrics section
 */
function generateValidationMetrics(
  report: MultiYearCalibrationReport,
  lines: string[]
): void {
  const lastYear = report.years[report.years.length - 1];

  lines.push('### Overall System Confidence');
  lines.push('');

  const systemConfidence = (lastYear.finalMatchRate * 0.4) +
                          (lastYear.identityHitRate * 0.3) +
                          (lastYear.topicAccuracy * 0.2) +
                          (lastYear.difficultyAccuracy * 0.1);

  lines.push(`**System Confidence Score:** ${(systemConfidence * 100).toFixed(1)}%`);
  lines.push('');

  if (systemConfidence >= 0.85) {
    lines.push('✅ **EXCELLENT** - High confidence in 2026 predictions');
  } else if (systemConfidence >= 0.75) {
    lines.push('⚡ **GOOD** - Moderate confidence in 2026 predictions');
  } else {
    lines.push('⚠️ **FAIR** - Limited confidence, recommend further calibration');
  }

  lines.push('');
  lines.push('### Prediction Stability');
  lines.push('');

  if (report.years.length >= 2) {
    const lastTwo = report.years.slice(-2);
    const variance = Math.abs(lastTwo[1].finalMatchRate - lastTwo[0].finalMatchRate);

    lines.push(`**Year-over-Year Variance:** ${(variance * 100).toFixed(1)}%`);
    lines.push('');

    if (variance < 0.05) {
      lines.push('✅ **STABLE** - Consistent performance across years');
    } else if (variance < 0.10) {
      lines.push('⚡ **MODERATE** - Some fluctuation in performance');
    } else {
      lines.push('⚠️ **VOLATILE** - Significant performance variation');
    }

    lines.push('');
  }
}

/**
 * Generate recommendations section
 */
function generateRecommendations(
  report: MultiYearCalibrationReport,
  lines: string[]
): void {
  const lastYear = report.years[report.years.length - 1];
  const params = report.finalParameters;

  lines.push('### High-Yield Identities for 2026');
  lines.push('');

  const highYield = Object.entries(params.identityConfidences)
    .filter(([, conf]) => conf >= 0.75)
    .sort((a, b) => b[1] - a[1]);

  lines.push(`Identified **${highYield.length} high-confidence identities** (≥75%) for focused preparation:`);
  lines.push('');

  highYield.slice(0, 15).forEach(([id, conf]) => {
    lines.push(`- **${id}**: ${(conf * 100).toFixed(1)}% confidence`);
  });

  lines.push('');
  lines.push('### Calibration Insights');
  lines.push('');

  // Difficulty insights
  if (params.rigorDriftMultiplier > 1.8) {
    lines.push('- 📈 **Increasing Difficulty Trend**: Papers are getting harder over time');
  } else if (params.rigorDriftMultiplier < 1.3) {
    lines.push('- 📉 **Stable Difficulty**: Papers maintain consistent difficulty level');
  }

  // Synthesis insights
  if (params.synthesisWeight > 0.35) {
    lines.push('- 🧬 **High Synthesis Demand**: Multi-concept fusion questions are prevalent');
  }

  // Topic accuracy insights
  if (lastYear.topicAccuracy < 0.75) {
    lines.push('- ⚠️ **Topic Prediction Variance**: Consider refining topic allocation algorithm');
  }

  // Identity hit rate insights
  if (lastYear.identityHitRate < 0.70) {
    lines.push('- 🎯 **Identity Refinement Needed**: Some identities may need re-definition');
  }

  lines.push('');
  lines.push('### Next Steps');
  lines.push('');
  lines.push('1. **Deploy Calibrated Parameters**: Update production engine with final parameters');
  lines.push('2. **Generate 2026 Flagship**: Use calibrated identities to create practice papers');
  lines.push('3. **Monitor Performance**: Track student accuracy on high-confidence identities');
  lines.push('4. **Post-Exam Validation**: Compare 2026 actual paper with predictions');
  lines.push('');
}

/**
 * Summarize parameter changes for iteration log
 */
function summarizeParameterChanges(changes: Record<string, any>): string {
  const parts: string[] = [];

  if (changes.identities) {
    const count = Object.keys(changes.identities).length;
    parts.push(`${count} identities adjusted`);
  }

  if (changes.rigorDrift) {
    parts.push(`Rigor ${changes.rigorDrift > 0 ? '+' : ''}${changes.rigorDrift.toFixed(2)}`);
  }

  if (changes.intent) {
    parts.push('Intent weights adjusted');
  }

  if (changes.idsBaseline) {
    parts.push(`IDS ${changes.idsBaseline > 0 ? '+' : ''}${changes.idsBaseline.toFixed(2)}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No changes';
}

/**
 * Generate iteration log file for a specific year
 */
export function generateYearIterationLog(
  year: number,
  yearResult: YearCalibrationResult,
  outputDir: string
): void {
  const lines: string[] = [];

  lines.push(`# KCET Math ${year} - Iteration Log`);
  lines.push('');
  lines.push(`**Final Match Rate:** ${(yearResult.finalMatchRate * 100).toFixed(1)}%`);
  lines.push(`**Total Iterations:** ${yearResult.iterations}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Iteration-by-iteration details
  lines.push('## Iteration History');
  lines.push('');

  if (yearResult.calibrationState.history.length > 0) {
    yearResult.calibrationState.history.forEach((iter, idx) => {
      lines.push(`### Iteration ${iter.iteration}`);
      lines.push('');
      lines.push(`- **Match Rate:** ${(iter.matchRate * 100).toFixed(1)}%`);
      lines.push(`- **Average Score:** ${(iter.averageScore * 100).toFixed(1)}%`);
      lines.push(`- **Timestamp:** ${iter.timestamp}`);
      lines.push('');

      if (Object.keys(iter.parameterChanges).length > 0) {
        lines.push('**Parameter Changes:**');
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(iter.parameterChanges, null, 2));
        lines.push('```');
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    });
  } else {
    lines.push('No iteration history recorded.');
    lines.push('');
  }

  // Question-by-question comparison
  lines.push('## Question-by-Question Comparison');
  lines.push('');

  if (yearResult.comparisonSummary && yearResult.comparisonSummary.details) {
    lines.push('| Q# | Generated Identity | Actual Identity | Overall Score | Match | Discrepancies |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');

    yearResult.comparisonSummary.details.forEach(detail => {
      const genId = detail.generated.identityId || 'Unknown';
      const actId = detail.actual.identityId || 'Unknown';
      const score = (detail.overallScore * 100).toFixed(1) + '%';
      const match = detail.isMatch ? '✅' : '❌';
      const discrep = detail.discrepancies.slice(0, 2).join('; ');

      lines.push([
        `| ${detail.questionNumber}`,
        `${genId}`,
        `${actId}`,
        `${score}`,
        `${match}`,
        `${discrep} |`
      ].join(' | '));
    });

    lines.push('');
  }

  // Write to file
  const filename = `KCET_MATH_${year}_ITERATION_LOG.md`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
  console.log(`✅ Year ${year} iteration log saved: ${filepath}`);
}
