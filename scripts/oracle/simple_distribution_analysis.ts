/**
 * Simple Distribution Analysis - Using Test Data
 *
 * Analyzes the distribution mismatch from cluster test results
 */

// Generated distribution from AI (from cluster test log)
const generatedMix = {
  'ID-NP-001': 2,
  'ID-NP-002': 3,
  'ID-NP-003': 2,
  'ID-NP-004': 3,
  'ID-NP-005': 2,
  'ID-NP-006': 2,
  'ID-NP-007': 2,
  'ID-NP-008': 2,
  'ID-NP-009': 2,
  'ID-NP-010': 1,
  'ID-NP-011': 2,
  'ID-NP-012': 2,
  'ID-NP-013': 2,
  'ID-NP-014': 2,
  'ID-NP-015': 2,
  'ID-NP-016': 1,
  'ID-NP-017': 2,
  'ID-NP-018': 1,
  'ID-NP-019': 2,
  'ID-NP-020': 1,
  'ID-NP-021': 2,
  'ID-NP-022': 0,
  'ID-NP-023': 1,
  'ID-NP-024': 1,
  'ID-NP-025': 2,
  'ID-NP-026': 1,
  'ID-NP-027': 2,
  'ID-NP-028': 2,
  'ID-NP-029': 1,
  'ID-NP-030': 0
};

// Actual NEET 2024 distribution (from database - 50 questions)
// This needs to be extracted from the test data
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { auditPaperHistoricalContext } from '../../lib/aiPaperAuditor';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEET_2024_SCAN_ID = '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

async function analyzeSimple() {
  console.log('\n🔍 SIMPLE DISTRIBUTION ANALYSIS - NEET 2024');
  console.log('='.repeat(70));

  // Load identities
  const identityBankPath = path.join(process.cwd(), 'lib/oracle/identities/neet_physics.json');
  const identityBank = JSON.parse(fs.readFileSync(identityBankPath, 'utf8'));
  const identities = identityBank.identities;

  // Fetch actual questions (first 50 for comparison with generated 50)
  const { data: actualQuestions, error } = await supabase
    .from('questions')
    .select('text, topic')
    .eq('scan_id', NEET_2024_SCAN_ID)
    .limit(50);

  if (error || !actualQuestions) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Fetched ${actualQuestions.length} actual questions`);

  // Audit to get identity assignments
  const actualPaperText = actualQuestions.map(q => q.text).join('\n\n');
  const actualAudit = await auditPaperHistoricalContext(
    actualPaperText,
    'NEET',
    'Physics',
    2024,
    GEMINI_API_KEY!,
    identities
  );

  if (!actualAudit) {
    console.error('❌ Failed to audit');
    return;
  }

  // Get actual distribution from identity vector
  const actualMix: Record<string, number> = actualAudit.identityVector || {};

  // Analyze mismatch
  const allIdentities = Array.from(new Set([
    ...Object.keys(actualMix),
    ...Object.keys(generatedMix)
  ])).sort();

  const mismatch = allIdentities.map(id => {
    const actual = actualMix[id] || 0;
    const generated = generatedMix[id] || 0;
    const diff = generated - actual;

    return {
      id,
      actual,
      generated,
      diff,
      name: identities.find((i: any) => i.id === id)?.name || id
    };
  }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  // Display
  console.log('\n📊 DISTRIBUTION COMPARISON (50 questions)');
  console.log('='.repeat(90));
  console.log('ID          | Actual | Predicted | Diff | Name');
  console.log('-'.repeat(90));

  mismatch.forEach(item => {
    const emoji = item.diff > 0 ? '📈' : item.diff < 0 ? '📉' : '✅';
    const sign = item.diff > 0 ? '+' : '';
    const name = item.name.substring(0, 45);
    console.log(
      `${emoji} ${item.id.padEnd(10)} | ${String(item.actual).padStart(6)} | ${String(item.generated).padStart(9)} | ${(sign + item.diff).padStart(4)} | ${name}`
    );
  });

  // Summary
  const overPredicted = mismatch.filter(m => m.diff > 1);
  const underPredicted = mismatch.filter(m => m.diff < -1);

  console.log('\n📈 OVER-PREDICTED (AI predicts too many):');
  overPredicted.forEach(item => {
    console.log(`   ${item.id}: +${item.diff} (${item.name})`);
  });

  console.log('\n📉 UNDER-PREDICTED (AI predicts too few):');
  underPredicted.forEach(item => {
    console.log(`   ${item.id}: ${item.diff} (${item.name})`);
  });

  // Calculate total error
  const totalError = mismatch.reduce((sum, item) => sum + Math.abs(item.diff), 0);
  const avgError = totalError / mismatch.length;

  console.log('\n📊 METRICS:');
  console.log(`   Total Prediction Error: ${totalError} questions`);
  console.log(`   Average Error per Identity: ${avgError.toFixed(2)} questions`);
  console.log(`   Over-Predicted Identities: ${overPredicted.length}`);
  console.log(`   Under-Predicted Identities: ${underPredicted.length}`);

  // Alignment score
  const alignmentScore = 1 - (totalError / (actualQuestions.length * 2));
  console.log(`   Distribution Alignment: ${(alignmentScore * 100).toFixed(1)}%`);

  console.log('\n💡 KEY INSIGHTS:');
  if (overPredicted.length > 0) {
    console.log(`\n   Problem: AI over-predicts ${overPredicted.length} identities`);
    console.log('   Impact: Generates questions on topics that don\'t appear as much');
  }

  if (underPredicted.length > 0) {
    console.log(`\n   Problem: AI under-predicts ${underPredicted.length} identities`);
    console.log('   Impact: Misses questions on important topics');
  }

  console.log('\n   Root Cause: AI prediction engine not calibrated on actual 2024 patterns');
  console.log('   Solution: Adjust identityConfidences based on 2021-2025 historical data');

  return {
    actualMix,
    generatedMix,
    mismatch,
    alignmentScore
  };
}

analyzeSimple()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
