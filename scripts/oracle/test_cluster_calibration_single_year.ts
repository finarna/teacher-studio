/**
 * Test Cluster-Based Calibration on Single Year (2024)
 * Quick validation before running full 2021-2025 calibration
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { auditPaperHistoricalContext } from '../../lib/aiPaperAuditor';
import { generateTestQuestions, type AnalyzedQuestion } from '../../lib/aiQuestionGenerator';
import {
  comparePapersUsingIdentityVectors
} from '../../lib/oracle/questionComparator';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY not found');
}

const NEET_2024_SCAN_ID = '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5';

async function testClusterCalibration() {
  console.log('\n🧪 TESTING CLUSTER-BASED CALIBRATION (NEET 2024)');
  console.log('═'.repeat(70));

  // Load identity bank
  const identityBankPath = path.join(
    process.cwd(),
    'lib/oracle/identities/neet_physics.json'
  );
  const identityBank = JSON.parse(fs.readFileSync(identityBankPath, 'utf8'));
  const identities = identityBank.identities;

  console.log(`\n✅ Loaded ${identities.length} identities`);

  // Fetch actual 2024 paper
  console.log('\n📥 Fetching NEET 2024 Physics questions...');
  const { data: actualQuestions, error } = await supabase
    .from('questions')
    .select('text, topic, difficulty, options, correct_option_index, solution_steps, subject')
    .eq('scan_id', NEET_2024_SCAN_ID)
    .eq('subject', 'Physics')
    .order('question_order')
    .limit(50);

  if (error || !actualQuestions || actualQuestions.length === 0) {
    console.error('❌ Failed to fetch questions:', error?.message);
    return;
  }

  console.log(`✅ Fetched ${actualQuestions.length} questions`);

  // Audit actual paper
  console.log('\n🔍 Auditing actual 2024 paper...');
  const actualPaperText = actualQuestions.map(q => q.text).join('\n\n');
  const actualAudit = await auditPaperHistoricalContext(
    actualPaperText,
    'NEET',
    'Physics',
    2024,
    GEMINI_API_KEY,
    identities
  );

  if (!actualAudit) {
    console.error('❌ Failed to audit paper');
    return;
  }

  console.log(`✅ Audit complete - IDS: ${actualAudit.idsActual.toFixed(3)}`);

  // Convert to AnalyzedQuestion format
  const actualPaper: AnalyzedQuestion[] = actualQuestions.map((q, idx) => ({
    text: q.text,
    options: q.options || [],
    correctAnswer: q.options && q.correct_option_index !== null ? q.options[q.correct_option_index] : undefined,
    topic: q.topic,
    difficulty: q.difficulty as 'Easy' | 'Moderate' | 'Hard',
    identityId: mapQuestionToIdentity(q.text, q.topic, actualAudit.identityVector, idx, identities),
    solution: Array.isArray(q.solution_steps) ? q.solution_steps.join('\n') : '',
    solutionSteps: Array.isArray(q.solution_steps) ? q.solution_steps : [],
    conceptTags: [q.topic].filter(Boolean)
  }));

  // Generate predicted paper using current calibrated parameters
  console.log('\n🎯 Generating predicted 2024 paper...');

  // Build full generation context
  const topics = identities.map((id: any) => ({
    topicId: id.id,
    topicName: id.topic || id.name,
    syllabus: id.logic || id.name,
    bloomsLevels: ['Apply', 'Analyze'],
    estimatedDifficulty: 5,
    prerequisites: []
  }));

  const historicalData = [
    {
      year: 2023,
      examContext: 'NEET',
      subject: 'Physics',
      topicDistribution: identities.slice(0, 15).map((id: any) => ({
        topicId: id.id,
        questionCount: 2,
        averageMarks: 4,
        difficultyBreakdown: { easy: 0.3, moderate: 0.5, hard: 0.2 }
      })),
      overallDifficulty: { easy: 0.3, moderate: 0.5, hard: 0.2 },
      totalMarks: 180
    }
  ];

  const studentProfile = {
    userId: 'cluster_test_system',
    examContext: 'NEET',
    subject: 'Physics',
    topicMastery: [],
    overallAccuracy: 75,
    studyStreak: 0
  };

  const generatedPaper = await generateTestQuestions(
    {
      examConfig: {
        examContext: 'NEET',
        subject: 'Physics',
        totalQuestions: 50,
        durationMinutes: 180,
        marksPerQuestion: 4,
        passingPercentage: 50,
        difficultyProfile: {
          easy: 30,
          moderate: 50,
          hard: 20
        }
      },
      historicalData,
      studentProfile,
      topics,
      generationRules: {
        weights: {
          predictedExamPattern: 1.0,
          studentWeakAreas: 0.0,
          curriculumBalance: 0.0,
          recentTrends: 0.0
        },
        adaptiveDifficulty: {
          enabled: false,
          baselineAccuracy: 75,
          stepSize: 0.1
        },
        freshness: {
          avoidRecentQuestions: false,
          daysSinceLastAttempt: 0,
          maxRepetitionAllowed: 10
        },
        strategyMode: 'predictive_mock' as const,
        oracleMode: {
          enabled: true,
          idsTarget: 0.67,
          rigorVelocity: 1.0,
          intentSignature: {
            synthesis: 0.6,
            trapDensity: 0.3,
            linguisticLoad: 0.5,
            speedRequirement: 0.7
          },
          directives: [
            'Focus on high-confidence identities',
            'Maintain calibrated difficulty distribution'
          ],
          boardSignature: 'SYNTHESIZER' as const
        },
        difficultyMix: {
          easy: 30,
          moderate: 50,
          hard: 20
        }
      }
    },
    GEMINI_API_KEY,
    50
  );

  console.log(`✅ Generated ${generatedPaper.length} questions`);

  // Assign identity IDs to generated questions with improved matching
  console.log('\n🔧 Assigning identity IDs to generated questions...');

  let assignedCount = 0;
  let unknownCount = 0;

  generatedPaper.forEach((q, idx) => {
    if (!q.identityId || q.identityId === 'UNKNOWN') {
      // Normalize topic for comparison
      const normalizedTopic = (q.topic || '').toUpperCase().trim();

      // Try exact topic match first
      let matchingIdentity = identities.find((id: any) =>
        id.topic && id.topic.toUpperCase().trim() === normalizedTopic
      );

      // Fallback: Try name match
      if (!matchingIdentity) {
        matchingIdentity = identities.find((id: any) => {
          const idName = (id.name || '').toUpperCase();
          const idTopic = (id.topic || '').toUpperCase();
          return idName.includes(normalizedTopic) ||
                 normalizedTopic.includes(idName.split(' - ')[0]) ||
                 idTopic.includes(normalizedTopic);
        });
      }

      if (matchingIdentity) {
        q.identityId = matchingIdentity.id;
        assignedCount++;
      } else {
        q.identityId = 'UNKNOWN';
        unknownCount++;
        if (unknownCount <= 5) {  // Only log first 5 to avoid spam
          console.log(`   ⚠️  No identity found for Q${idx + 1} topic: "${q.topic}"`);
        }
      }
    } else {
      assignedCount++;
    }
  });

  console.log(`✅ Identity assignment complete:`);
  console.log(`   Assigned: ${assignedCount}/${generatedPaper.length} questions`);
  console.log(`   Unknown: ${unknownCount}/${generatedPaper.length} questions`);

  // Compare papers using cluster-based matching
  console.log('\n📊 Comparing papers with CLUSTER-BASED MATCHING...');
  const summary = comparePapersUsingIdentityVectors(generatedPaper, actualPaper);

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║          CLUSTER-BASED CALIBRATION RESULTS            ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`\n  📈 Match Rate:          ${(summary.matchRate * 100).toFixed(1)}%`);
  console.log(`  📊 Average Score:       ${(summary.averageScore * 100).toFixed(1)}%`);
  console.log(`  🎯 Identity Hit Rate:   ${(summary.identityHitRate * 100).toFixed(1)}%`);
  console.log(`  📚 Topic Accuracy:      ${(summary.topicAccuracy * 100).toFixed(1)}%`);
  console.log(`  💪 Difficulty Accuracy: ${(summary.difficultyAccuracy * 100).toFixed(1)}%`);

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║               BASELINE COMPARISON                     ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`\n  Baseline (Exact Match):    57.2%`);
  console.log(`  Cluster-Based:             ${(summary.matchRate * 100).toFixed(1)}%`);
  console.log(`  Improvement:               ${(summary.matchRate * 100 - 57.2 >= 0 ? '+' : '')}${(summary.matchRate * 100 - 57.2).toFixed(1)}%`);

  // Detailed breakdown
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║            CLUSTER MATCH BREAKDOWN                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const exactMatches = summary.details.filter(d => d.scores.identityMatch === 1.0).length;
  const clusterMatches = summary.details.filter(d => d.scores.identityMatch === 0.7).length;
  const topicMatches = summary.details.filter(d => d.scores.identityMatch === 0.4).length;
  const noMatches = summary.details.filter(d => d.scores.identityMatch === 0.0).length;

  console.log(`  ✅ Exact Identity Match (100%):  ${exactMatches} questions (${(exactMatches / 50 * 100).toFixed(1)}%)`);
  console.log(`  🟡 Cluster Match (70%):          ${clusterMatches} questions (${(clusterMatches / 50 * 100).toFixed(1)}%)`);
  console.log(`  🔵 Topic Match (40%):            ${topicMatches} questions (${(topicMatches / 50 * 100).toFixed(1)}%)`);
  console.log(`  ❌ No Match (0%):                ${noMatches} questions (${(noMatches / 50 * 100).toFixed(1)}%)`);

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                  RECOMMENDATION                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  if (summary.matchRate >= 0.68) {
    console.log('  🎉 EXCELLENT: Cluster-based matching achieves target!');
    console.log(`     Match rate ${(summary.matchRate * 100).toFixed(1)}% exceeds 68% threshold`);
    console.log('     ✅ Ready for full 2021-2025 calibration deployment');
  } else if (summary.matchRate >= 0.60) {
    console.log('  ✅ GOOD: Significant improvement over baseline');
    console.log(`     Match rate ${(summary.matchRate * 100).toFixed(1)}% shows promise`);
    console.log('     → Recommend full calibration to validate across all years');
  } else {
    console.log('  ⚠️  MODERATE: Improvement present but below target');
    console.log(`     Match rate ${(summary.matchRate * 100).toFixed(1)}% needs investigation`);
    console.log('     → Review cluster definitions and matching thresholds');
  }

  console.log('\n✅ Test complete\n');
}

function mapQuestionToIdentity(
  text: string,
  topic: string | undefined,
  identityVector: Record<string, number>,
  index: number,
  identities: any[]
): string {
  // Simple mapping based on topic
  const matchingIdentity = identities.find((id: any) =>
    id.topic === topic ||
    id.name.toLowerCase().includes((topic || '').toLowerCase())
  );

  return matchingIdentity?.id || 'UNKNOWN';
}

testClusterCalibration().catch(console.error);
