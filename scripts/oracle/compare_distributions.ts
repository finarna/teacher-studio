import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEET_2024_SCAN_ID = '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5';

async function compareDistributions() {
  console.log('\n📊 COMPARING ACTUAL vs PREDICTED DISTRIBUTION (2024)\n');
  console.log('='.repeat(70));

  // Load identities
  const identityBankPath = path.join(process.cwd(), 'lib/oracle/identities/neet_physics.json');
  const identityBank = JSON.parse(fs.readFileSync(identityBankPath, 'utf8'));
  const identities = identityBank.identities;

  // Fetch actual 2024 questions
  const { data: questions, error } = await supabase
    .from('questions')
    .select('identity_id, topic')
    .eq('scan_id', NEET_2024_SCAN_ID)
    .eq('subject', 'Physics')
    .order('question_order');

  if (error || !questions) {
    console.error('❌ Error:', error);
    return;
  }

  // Count actual distribution
  const actualDist: Record<string, number> = {};
  questions.forEach(q => {
    if (q.identity_id) {
      actualDist[q.identity_id] = (actualDist[q.identity_id] || 0) + 1;
    }
  });

  // Load calibrated confidences
  const calibratedPath = path.join(process.cwd(), 'docs/oracle/calibration/identity_confidences_2021_2025_calibrated.json');
  const calibratedData = JSON.parse(fs.readFileSync(calibratedPath, 'utf8'));
  const confidences = calibratedData.identityConfidences || {};

  // Simulate what AI would predict (assume equal 2Q baseline, then apply calibration)
  const aiBaseline = 2; // AI predicts ~2 questions per identity
  const predictedDist: Record<string, number> = {};

  // Apply calibration to baseline
  let totalPredicted = 0;
  identities.forEach((id: any) => {
    const confidence = confidences[id.id] || 1.0;
    const rawPrediction = aiBaseline * confidence;
    predictedDist[id.id] = rawPrediction;
    totalPredicted += rawPrediction;
  });

  // Normalize to 50 questions
  Object.keys(predictedDist).forEach(id => {
    predictedDist[id] = (predictedDist[id] / totalPredicted) * 50;
  });

  // Compare
  console.log('\n📊 DISTRIBUTION COMPARISON:\n');
  console.log('ID         | Actual | Predicted | Error | Status');
  console.log('-'.repeat(70));

  let totalError = 0;
  const allIds = new Set([...Object.keys(actualDist), ...Object.keys(predictedDist)]);

  const comparisonData: Array<{id: string, actual: number, predicted: number, error: number}> = [];

  allIds.forEach(id => {
    const actual = actualDist[id] || 0;
    const predicted = Math.round(predictedDist[id] || 0);
    const error = Math.abs(actual - predicted);
    totalError += error;
    comparisonData.push({ id, actual, predicted, error });
  });

  // Sort by error (descending)
  comparisonData.sort((a, b) => b.error - a.error);

  comparisonData.forEach(({ id, actual, predicted, error }) => {
    const status = error === 0 ? '✅' : error <= 1 ? '🟡' : '❌';
    console.log(`${id.padEnd(10)} | ${String(actual).padStart(6)} | ${String(predicted).padStart(9)} | ${String(error).padStart(5)} | ${status}`);
  });

  console.log('-'.repeat(70));
  console.log(`\n📈 METRICS:`);
  console.log(`   Total Prediction Error: ${totalError} questions`);
  console.log(`   Distribution Alignment: ${((50 - totalError/2) / 50 * 100).toFixed(1)}%`);
  console.log(`   Perfect Matches: ${comparisonData.filter(d => d.error === 0).length}/${allIds.size}`);
  console.log(`   Close Matches (±1): ${comparisonData.filter(d => d.error <= 1).length}/${allIds.size}`);
}

compareDistributions()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
