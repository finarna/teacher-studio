/**
 * Phase 1: Data Preparation - NEET Physics
 * Verify historical data (2021-2025) exists in database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUBJECT = 'Physics';
const EXAM = 'NEET';
const YEARS = [2021, 2022, 2023, 2024, 2025];

async function verifyData() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 1: DATA PREPARATION - NEET PHYSICS                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Step 1.1: Verify Historical Data
  console.log('📊 Step 1.1: Verifying Historical Data (2021-2025)\n');

  const { data: yearCounts, error: yearError } = await supabase
    .from('questions')
    .select('year', { count: 'exact' })
    .eq('subject', SUBJECT)
    .eq('exam_context', EXAM)
    .in('year', YEARS);

  if (yearError) {
    console.error('❌ Error querying database:', yearError);
    process.exit(1);
  }

  // Group by year
  const countsByYear: Record<number, number> = {};
  yearCounts?.forEach((q: any) => {
    countsByYear[q.year] = (countsByYear[q.year] || 0) + 1;
  });

  console.log('┌──────┬─────────────────┐');
  console.log('│ Year │ Question Count  │');
  console.log('├──────┼─────────────────┤');
  YEARS.forEach(year => {
    const count = countsByYear[year] || 0;
    const status = count > 0 ? '✅' : '❌';
    console.log(`│ ${year} │ ${status} ${count.toString().padEnd(13)}│`);
  });
  console.log('└──────┴─────────────────┘\n');

  const totalQuestions = Object.values(countsByYear).reduce((a, b) => a + b, 0);
  console.log(`Total Questions: ${totalQuestions}`);
  console.log(`Expected: ~225 (45 per year × 5 years)\n`);

  if (totalQuestions === 0) {
    console.log('❌ NO DATA FOUND! Please import NEET Physics questions first.\n');
    process.exit(1);
  }

  // Step 1.2: Verify Topic Metadata
  console.log('📊 Step 1.2: Verifying Topic Distribution\n');

  const { data: topics, error: topicError } = await supabase
    .from('questions')
    .select('topic')
    .eq('subject', SUBJECT)
    .eq('exam_context', EXAM)
    .in('year', YEARS);

  if (topicError) {
    console.error('❌ Error querying topics:', topicError);
    process.exit(1);
  }

  const topicCounts: Record<string, number> = {};
  topics?.forEach((q: any) => {
    if (q.topic) {
      topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
    }
  });

  console.log('Top 10 Topics:');
  Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([topic, count]) => {
      console.log(`  ${topic}: ${count}`);
    });
  console.log();

  // Step 1.3: Validate Question Quality
  console.log('📊 Step 1.3: Validating Question Quality\n');

  const { data: allQuestions, error: qualityError } = await supabase
    .from('questions')
    .select('id, text, difficulty, topic, options')
    .eq('subject', SUBJECT)
    .eq('exam_context', EXAM)
    .in('year', YEARS);

  if (qualityError) {
    console.error('❌ Error querying questions:', qualityError);
    process.exit(1);
  }

  let missingText = 0;
  let missingDifficulty = 0;
  let missingTopic = 0;
  let badOptions = 0;

  allQuestions?.forEach((q: any) => {
    if (!q.text || q.text.trim() === '') missingText++;
    if (!q.difficulty) missingDifficulty++;
    if (!q.topic) missingTopic++;
    if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
      badOptions++;
    }
  });

  console.log('┌─────────────────────────┬───────┐');
  console.log('│ Check                   │ Count │');
  console.log('├─────────────────────────┼───────┤');
  console.log(`│ Missing Text            │ ${missingText.toString().padStart(5)} │`);
  console.log(`│ Missing Difficulty      │ ${missingDifficulty.toString().padStart(5)} │`);
  console.log(`│ Missing Topic           │ ${missingTopic.toString().padStart(5)} │`);
  console.log(`│ Bad Options (not 4)     │ ${badOptions.toString().padStart(5)} │`);
  console.log('├─────────────────────────┼───────┤');
  console.log(`│ Total Questions         │ ${(allQuestions?.length || 0).toString().padStart(5)} │`);
  console.log('└─────────────────────────┴───────┘\n');

  const qualityScore = ((allQuestions?.length || 0) - missingText - missingDifficulty - missingTopic - badOptions) / (allQuestions?.length || 1) * 100;
  console.log(`Quality Score: ${qualityScore.toFixed(1)}%`);

  if (qualityScore < 90) {
    console.log('⚠️  WARNING: Quality score below 90%. Please fix missing data.\n');
  } else {
    console.log('✅ Data quality is good!\n');
  }

  // Summary
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 1 SUMMARY                                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Historical Data: ${totalQuestions} questions across ${YEARS.length} years`);
  console.log(`✅ Topic Coverage: ${Object.keys(topicCounts).length} unique topics`);
  console.log(`✅ Quality Score: ${qualityScore.toFixed(1)}%`);
  console.log('\n✅ PHASE 1 COMPLETE - Ready for Phase 2 (Calibration)\n');
}

verifyData().catch(console.error);
