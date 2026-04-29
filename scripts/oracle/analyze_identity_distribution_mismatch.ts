/**
 * Analyze Identity Distribution Mismatch
 *
 * Compares actual vs generated identity distributions to identify
 * why AI prediction doesn't align with actual exam patterns
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { auditPaperHistoricalContext } from '../../lib/aiPaperAuditor';
import { generateTestQuestions, type AnalyzedQuestion } from '../../lib/aiQuestionGenerator';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEET_2024_SCAN_ID = '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5';

interface IdentityCount {
  identityId: string;
  count: number;
  percentage: number;
}

async function analyzeDistributionMismatch() {
  console.log('\n🔍 ANALYZING IDENTITY DISTRIBUTION MISMATCH - NEET 2024');
  console.log('='.repeat(70));

  // Load identities
  const identityBankPath = path.join(
    process.cwd(),
    'lib/oracle/identities/neet_physics.json'
  );
  const identityBank = JSON.parse(fs.readFileSync(identityBankPath, 'utf8'));
  const identities = identityBank.identities;

  // Fetch actual 2024 questions
  console.log('\n📥 Fetching actual NEET 2024 Physics questions...');
  const { data: actualQuestions, error } = await supabase
    .from('questions')
    .select('text, topic, difficulty, options, correct_option_index, solution_steps, subject')
    .eq('scan_id', NEET_2024_SCAN_ID);

  if (error || !actualQuestions) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`✅ Fetched ${actualQuestions.length} actual questions`);

  // Audit actual paper to get identity assignments
  console.log('\n🔍 Auditing actual 2024 paper...');
  const { identityVector: actualIdentityVector } = await auditPaperHistoricalContext(
    'NEET',
    2024,
    'Physics',
    identities
  );

  // Generate predicted paper
  console.log('\n🎯 Generating predicted 2024 paper...');
  const generatedPaper = await generateTestQuestions({
    exam: 'NEET',
    subject: 'Physics',
    studentAccuracy: 0.75,
    identities,
    questionCount: actualQuestions.length,
    year: 2024
  });

  console.log(`✅ Generated ${generatedPaper.length} questions`);

  // Assign identities to generated questions
  console.log('\n🔧 Assigning identity IDs to generated questions...');
  generatedPaper.forEach((q) => {
    if (!q.identityId || q.identityId === 'UNKNOWN') {
      const normalizedTopic = (q.topic || '').toUpperCase().trim();

      let matchingIdentity = identities.find((id: any) =>
        id.topic && id.topic.toUpperCase().trim() === normalizedTopic
      );

      if (!matchingIdentity) {
        matchingIdentity = identities.find((id: any) => {
          const idName = (id.name || '').toUpperCase();
          const idTopic = (id.topic || '').toUpperCase();
          return idName.includes(normalizedTopic) ||
                 normalizedTopic.includes(idName.split(' - ')[0]) ||
                 idTopic.includes(normalizedTopic);
        });
      }

      q.identityId = matchingIdentity?.id || 'UNKNOWN';
    }
  });

  // Count actual identity distribution from identity vector
  const actualIdentities: Record<string, number> = {};
  actualQuestions.forEach((q: any, idx: number) => {
    const identityId = actualIdentityVector[idx] || 'UNKNOWN';
    actualIdentities[identityId] = (actualIdentities[identityId] || 0) + 1;
  });

  // Count generated identity distribution
  const generatedIdentities: Record<string, number> = {};
  generatedPaper.forEach(q => {
    const identityId = q.identityId || 'UNKNOWN';
    generatedIdentities[identityId] = (generatedIdentities[identityId] || 0) + 1;
  });

  // Convert to sorted arrays
  const totalActual = actualQuestions.length;
  const totalGenerated = generatedPaper.length;

  const actualDist: IdentityCount[] = Object.entries(actualIdentities)
    .map(([id, count]) => ({
      identityId: id,
      count,
      percentage: (count / totalActual) * 100
    }))
    .sort((a, b) => b.count - a.count);

  const generatedDist: IdentityCount[] = Object.entries(generatedIdentities)
    .map(([id, count]) => ({
      identityId: id,
      count,
      percentage: (count / totalGenerated) * 100
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate mismatch
  const allIdentities = new Set([
    ...Object.keys(actualIdentities),
    ...Object.keys(generatedIdentities)
  ]);

  const mismatch = Array.from(allIdentities).map(id => {
    const actualCount = actualIdentities[id] || 0;
    const generatedCount = generatedIdentities[id] || 0;
    const difference = generatedCount - actualCount;

    let status: 'over-predicted' | 'under-predicted' | 'aligned' = 'aligned';
    if (difference > 1) status = 'over-predicted';
    else if (difference < -1) status = 'under-predicted';

    return {
      identityId: id,
      actualCount,
      generatedCount,
      difference,
      status
    };
  }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

  // Display results
  console.log('\n📊 ACTUAL vs GENERATED DISTRIBUTION');
  console.log('='.repeat(70));

  console.log('\n🎯 Top 15 Actual Identities:');
  actualDist.slice(0, 15).forEach((item, idx) => {
    const identity = identities.find((id: any) => id.id === item.identityId);
    const name = identity?.name || item.identityId;
    console.log(`  ${idx + 1}. ${item.identityId}: ${item.count}Q (${item.percentage.toFixed(1)}%) - ${name}`);
  });

  console.log('\n🤖 Top 15 Generated Identities:');
  generatedDist.slice(0, 15).forEach((item, idx) => {
    const identity = identities.find((id: any) => id.id === item.identityId);
    const name = identity?.name || item.identityId;
    console.log(`  ${idx + 1}. ${item.identityId}: ${item.count}Q (${item.percentage.toFixed(1)}%) - ${name}`);
  });

  console.log('\n⚠️  TOP 15 MISMATCHES (Biggest Prediction Errors):');
  mismatch.slice(0, 15).forEach((item, idx) => {
    const identity = identities.find((id: any) => id.id === item.identityId);
    const name = identity?.name || item.identityId;
    const emoji = item.status === 'over-predicted' ? '📈' :
                  item.status === 'under-predicted' ? '📉' : '✅';
    const sign = item.difference > 0 ? '+' : '';
    console.log(`  ${idx + 1}. ${emoji} ${item.identityId}: ${sign}${item.difference} (Actual: ${item.actualCount}, Pred: ${item.generatedCount}) - ${name}`);
  });

  // Categorize mismatches
  const overPredicted = mismatch.filter(m => m.status === 'over-predicted');
  const underPredicted = mismatch.filter(m => m.status === 'under-predicted');

  console.log('\n📈 OVER-PREDICTED Identities (AI generates too many):');
  console.log('    Identity ID  | Actual | Predicted | Diff | Name');
  console.log('    ' + '-'.repeat(65));
  overPredicted.forEach(item => {
    const identity = identities.find((id: any) => id.id === item.identityId);
    const name = (identity?.name || item.identityId).substring(0, 30);
    console.log(`    ${item.identityId.padEnd(12)} | ${String(item.actualCount).padStart(6)} | ${String(item.generatedCount).padStart(9)} | ${('+' + item.difference).padStart(4)} | ${name}`);
  });

  console.log('\n📉 UNDER-PREDICTED Identities (AI generates too few):');
  console.log('    Identity ID  | Actual | Predicted | Diff | Name');
  console.log('    ' + '-'.repeat(65));
  underPredicted.forEach(item => {
    const identity = identities.find((id: any) => id.id === item.identityId);
    const name = (identity?.name || item.identityId).substring(0, 30);
    console.log(`    ${item.identityId.padEnd(12)} | ${String(item.actualCount).padStart(6)} | ${String(item.generatedCount).padStart(9)} | ${String(item.difference).padStart(4)} | ${name}`);
  });

  // Calculate alignment score
  const alignmentScore = mismatch.reduce((sum, item) => {
    const maxCount = Math.max(item.actualCount, item.generatedCount, 1);
    const alignment = 1 - (Math.abs(item.difference) / maxCount);
    return sum + alignment;
  }, 0) / mismatch.length;

  console.log('\n📊 DISTRIBUTION ALIGNMENT SCORE:', (alignmentScore * 100).toFixed(1) + '%');

  if (alignmentScore < 0.5) {
    console.log('⚠️  SEVERE MISMATCH - AI predictions poorly aligned with actual exam');
  } else if (alignmentScore < 0.7) {
    console.log('⚠️  MODERATE MISMATCH - Significant room for improvement');
  } else {
    console.log('✅ GOOD ALIGNMENT - Predictions reasonably match actual exam');
  }

  // Recommendations
  console.log('\n💡 ACTIONABLE RECOMMENDATIONS:');
  console.log('='.repeat(70));

  if (overPredicted.length > 0) {
    console.log('\n  1️⃣  REDUCE prediction weight for these over-predicted identities:');
    overPredicted.slice(0, 5).forEach(item => {
      const identity = identities.find((id: any) => id.id === item.identityId);
      console.log(`     • ${item.identityId} (${identity?.name}): Reduce by ${item.difference} questions`);
    });
  }

  if (underPredicted.length > 0) {
    console.log('\n  2️⃣  INCREASE prediction weight for these under-predicted identities:');
    underPredicted.slice(0, 5).forEach(item => {
      const identity = identities.find((id: any) => id.id === item.identityId);
      console.log(`     • ${item.identityId} (${identity?.name}): Increase by ${Math.abs(item.difference)} questions`);
    });
  }

  console.log('\n  3️⃣  Calibrate REI (Recurring Exam Intelligence):');
  console.log('     • Analyze 2021-2025 historical patterns');
  console.log('     • Adjust topic prediction confidences based on actual frequencies');
  console.log('     • Weight recent years (2023-2025) more than older years');

  console.log('\n  4️⃣  Immediate fixes in engine config:');
  console.log('     • Update identityConfidences in calibrated_neet_physics.json');
  console.log('     • Boost under-predicted identities by 20-30%');
  console.log('     • Reduce over-predicted identities by 20-30%');

  console.log('\n  5️⃣  Validation:');
  console.log('     • Test on NEET 2023 (out-of-sample validation)');
  console.log('     • If alignment improves to >70%, deploy');
  console.log('     • If not, iterate on calibration');

  return {
    actual: actualDist,
    generated: generatedDist,
    mismatch,
    overPredicted,
    underPredicted,
    alignmentScore
  };
}

// Run analysis
analyzeDistributionMismatch()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
