#!/usr/bin/env tsx
/**
 * AI Prediction Analysis Report Generator
 *
 * Generates comprehensive analysis reports for exam AI prediction settings,
 * historical patterns, and REI optimization status.
 *
 * Usage:
 *   npx tsx scripts/generate-ai-analysis-report.ts [options]
 *
 * Options:
 *   --exam <NEET|KCET>     Filter by specific exam (default: all)
 *   --subject <subject>     Filter by specific subject (default: all)
 *   --output <file.md>      Save to markdown file (default: console only)
 *   --json                  Output as JSON instead of markdown
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface HistoricalPattern {
  year: number;
  subject: string;
  exam_context: string;
  difficulty_easy_pct: number;
  difficulty_moderate_pct: number;
  difficulty_hard_pct: number;
  board_signature: string;
  ids_actual: number;
  rigor_velocity: number | null;
  intent_signature: {
    synthesis: number;
    trapDensity: number;
    linguisticLoad: number;
    speedRequirement: number;
  };
  evolution_note: string;
  total_marks: number;
}

interface Calibration {
  subject: string;
  target_year: number;
  rigor_velocity: number;
  board_signature: string;
  intent_signature: any;
  calibration_directives: string[];
}

interface REIConfig {
  exam_context: string;
  subject: string;
  rigor_drift_multiplier: number;
  ids_baseline: number;
  synthesis_weight: number;
  trap_density_weight: number;
  linguistic_load_weight: number;
  speed_requirement_weight: number;
}

interface TopicDistribution {
  topic_id: string;
  question_count: number;
  average_marks: number;
  difficulty_easy_count: number;
  difficulty_moderate_count: number;
  difficulty_hard_count: number;
  exam_historical_patterns?: {
    year: number;
    subject: string;
  };
}

interface Scan {
  id: string;
  name: string;
  year: number | null;
  subject: string;
  exam_context: string;
  is_system_scan: boolean;
}

interface AnalysisReport {
  timestamp: string;
  examContext: string;
  subjects: {
    [subject: string]: {
      historicalPatterns: HistoricalPattern[];
      calibration: Calibration | null;
      reiConfig: REIConfig | null;
      topicDistributions: TopicDistribution[];
      scans: Scan[];
      summary: {
        yearsTracked: number[];
        totalQuestions: number;
        avgDifficulty: number;
        boardSignature: string;
        idsActual: number;
        hasForecasts: boolean;
        topicsTracked: number;
        totalScans: number;
        systemScans: number;
      };
    };
  };
}

// Parse command line arguments
const args = process.argv.slice(2);
const examFilter = args.includes('--exam') ? args[args.indexOf('--exam') + 1] : null;
const subjectFilter = args.includes('--subject') ? args[args.indexOf('--subject') + 1] : null;
const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
const jsonOutput = args.includes('--json');

async function fetchHistoricalPatterns(examContext: string, subject?: string): Promise<HistoricalPattern[]> {
  let query = supabase
    .from('exam_historical_patterns')
    .select('*')
    .eq('exam_context', examContext)
    .order('year', { ascending: false });

  if (subject) {
    query = query.eq('subject', subject);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchCalibration(examContext: string, subject: string): Promise<Calibration | null> {
  const { data, error } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', examContext)
    .eq('subject', subject)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function fetchREIConfig(examContext: string, subject: string): Promise<REIConfig | null> {
  const { data, error } = await supabase
    .from('rei_evolution_configs')
    .select('*')
    .eq('exam_context', examContext)
    .eq('subject', subject)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function fetchTopicDistributions(examContext: string, subject: string): Promise<TopicDistribution[]> {
  const { data, error } = await supabase
    .from('exam_topic_distributions')
    .select('topic_id, question_count, average_marks, difficulty_easy_count, difficulty_moderate_count, difficulty_hard_count, exam_historical_patterns!inner(year, subject, exam_context)')
    .eq('exam_historical_patterns.exam_context', examContext)
    .eq('exam_historical_patterns.subject', subject);

  if (error) throw error;
  return data || [];
}

async function fetchScans(examContext: string, subject?: string): Promise<Scan[]> {
  let query = supabase
    .from('scans')
    .select('id, name, year, subject, exam_context, is_system_scan')
    .eq('exam_context', examContext)
    .order('year', { ascending: false });

  if (subject) {
    query = query.eq('subject', subject);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function generateAnalysisReport(examContext: string): Promise<AnalysisReport> {
  const patterns = await fetchHistoricalPatterns(examContext);

  // Group patterns by subject
  const subjectGroups = patterns.reduce((acc, pattern) => {
    if (!acc[pattern.subject]) acc[pattern.subject] = [];
    acc[pattern.subject].push(pattern);
    return acc;
  }, {} as Record<string, HistoricalPattern[]>);

  const report: AnalysisReport = {
    timestamp: new Date().toISOString(),
    examContext,
    subjects: {}
  };

  // Process each subject
  for (const [subject, subjectPatterns] of Object.entries(subjectGroups)) {
    if (subjectFilter && subject !== subjectFilter) continue;

    const calibration = await fetchCalibration(examContext, subject);
    const reiConfig = await fetchREIConfig(examContext, subject);
    const topicDistributions = await fetchTopicDistributions(examContext, subject);
    const scans = await fetchScans(examContext, subject);

    const yearsTracked = [...new Set(subjectPatterns.map(p => p.year))].sort((a, b) => b - a);
    const totalQuestions = subjectPatterns.reduce((sum, p) => sum + p.total_marks, 0);
    const avgDifficulty = subjectPatterns.reduce((sum, p) => sum + p.ids_actual, 0) / subjectPatterns.length;
    const latestPattern = subjectPatterns[0];

    report.subjects[subject] = {
      historicalPatterns: subjectPatterns,
      calibration,
      reiConfig,
      topicDistributions,
      scans,
      summary: {
        yearsTracked,
        totalQuestions,
        avgDifficulty,
        boardSignature: latestPattern.board_signature,
        idsActual: latestPattern.ids_actual,
        hasForecasts: !!calibration,
        topicsTracked: new Set(topicDistributions.map(t => t.topic_id)).size,
        totalScans: scans.length,
        systemScans: scans.filter(s => s.is_system_scan).length
      }
    };
  }

  return report;
}

function formatMarkdownReport(reports: AnalysisReport[]): string {
  let md = `# AI Prediction Analysis Report\n\n`;
  md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  md += `---\n\n`;

  for (const report of reports) {
    md += `## ${report.examContext} Exam Analysis\n\n`;

    for (const [subject, data] of Object.entries(report.subjects)) {
      md += `### ${subject}\n\n`;

      // Summary
      md += `#### 📊 Summary\n\n`;
      md += `| Metric | Value |\n`;
      md += `|--------|-------|\n`;
      md += `| Years Tracked | ${data.summary.yearsTracked.join(', ')} |\n`;
      md += `| Total Questions | ${data.summary.totalQuestions} |\n`;
      md += `| Avg Difficulty (IDS) | ${data.summary.avgDifficulty.toFixed(2)} |\n`;
      md += `| Board Signature | ${data.summary.boardSignature} |\n`;
      md += `| 2026 Forecasts | ${data.summary.hasForecasts ? '✅ Active' : '⚠️ Missing'} |\n`;
      md += `| Topics Tracked | ${data.summary.topicsTracked} |\n`;
      md += `| System Scans | ${data.summary.systemScans} / ${data.summary.totalScans} |\n\n`;

      // Historical Patterns
      md += `#### 📈 Historical Patterns\n\n`;
      for (const pattern of data.historicalPatterns) {
        md += `**${pattern.year}:**\n`;
        md += `- Difficulty: Easy ${pattern.difficulty_easy_pct}% | Moderate ${pattern.difficulty_moderate_pct}% | Hard ${pattern.difficulty_hard_pct}%\n`;
        md += `- Board Signature: ${pattern.board_signature}\n`;
        md += `- IDS Actual: ${pattern.ids_actual}\n`;
        md += `- Intent: Synthesis=${pattern.intent_signature.synthesis}, Trap=${pattern.intent_signature.trapDensity}, Speed=${pattern.intent_signature.speedRequirement}\n`;
        md += `- Evolution Note: ${pattern.evolution_note.substring(0, 200)}...\n\n`;
      }

      // AI Calibration
      if (data.calibration) {
        md += `#### 🔮 ${data.calibration.target_year} AI Forecast\n\n`;
        md += `- **Board Signature:** ${data.calibration.board_signature}\n`;
        md += `- **Rigor Velocity:** ${data.calibration.rigor_velocity}x\n`;
        md += `- **Calibration Directives (${data.calibration.calibration_directives.length}):**\n`;
        data.calibration.calibration_directives.slice(0, 10).forEach((directive, i) => {
          md += `  ${i + 1}. ${directive}\n`;
        });
        md += `\n`;
      }

      // REI Config
      if (data.reiConfig) {
        md += `#### ⚙️ REI Evolution Config\n\n`;
        md += `- **IDS Baseline:** ${data.reiConfig.ids_baseline}\n`;
        md += `- **Rigor Drift Multiplier:** ${data.reiConfig.rigor_drift_multiplier}\n`;
        md += `- **Intent Weights:**\n`;
        md += `  - Synthesis: ${data.reiConfig.synthesis_weight}\n`;
        md += `  - Trap Density: ${data.reiConfig.trap_density_weight}\n`;
        md += `  - Linguistic Load: ${data.reiConfig.linguistic_load_weight}\n`;
        md += `  - Speed Requirement: ${data.reiConfig.speed_requirement_weight}\n\n`;
      }

      // Topic Distributions
      if (data.topicDistributions.length > 0) {
        md += `#### 🎯 Topic Distribution Summary\n\n`;
        const topicsByYear = data.topicDistributions.reduce((acc, t) => {
          const year = (t.exam_historical_patterns as any)?.year || 'Unknown';
          if (!acc[year]) acc[year] = [];
          acc[year].push(t);
          return acc;
        }, {} as Record<string, TopicDistribution[]>);

        for (const [year, topics] of Object.entries(topicsByYear)) {
          md += `**${year}:** ${topics.length} topics tracked\n`;
          const topTopics = topics.sort((a, b) => b.question_count - a.question_count).slice(0, 5);
          topTopics.forEach(t => {
            md += `  - ${t.topic_id}: ${t.question_count}Q (E:${t.difficulty_easy_count}, M:${t.difficulty_moderate_count}, H:${t.difficulty_hard_count})\n`;
          });
        }
        md += `\n`;
      }

      // Scans
      md += `#### 📄 Available Scans\n\n`;
      const systemScans = data.scans.filter(s => s.is_system_scan);
      if (systemScans.length > 0) {
        md += `**System Scans (${systemScans.length}):**\n`;
        systemScans.forEach(s => {
          md += `- ${s.year || 'No Year'} | ${s.name}\n`;
        });
      } else {
        md += `⚠️ No system scans found\n`;
      }
      md += `\n`;

      md += `---\n\n`;
    }
  }

  return md;
}

async function main() {
  console.log('🔍 Generating AI Prediction Analysis Report...\n');

  const examContexts = examFilter ? [examFilter] : ['NEET', 'KCET'];
  const reports: AnalysisReport[] = [];

  for (const examContext of examContexts) {
    try {
      const report = await generateAnalysisReport(examContext);
      reports.push(report);
    } catch (error) {
      console.error(`Error analyzing ${examContext}:`, error);
    }
  }

  if (jsonOutput) {
    const jsonReport = JSON.stringify(reports, null, 2);
    if (outputFile) {
      fs.writeFileSync(outputFile, jsonReport);
      console.log(`✅ JSON report saved to: ${outputFile}`);
    } else {
      console.log(jsonReport);
    }
  } else {
    const markdown = formatMarkdownReport(reports);
    if (outputFile) {
      fs.writeFileSync(outputFile, markdown);
      console.log(`✅ Markdown report saved to: ${outputFile}`);
    } else {
      console.log(markdown);
    }
  }

  console.log('\n✅ Analysis complete!\n');
}

main().catch(console.error);
