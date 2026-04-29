/**
 * Analyze Historical Identity Distribution (2021-2025)
 *
 * Aggregates actual NEET Physics identity distributions across 5 years
 * to find empirical weightage for proper calibration
 */

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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

// NEET Physics scan IDs for each year
const SCAN_IDS: Record<number, string> = {
  2021: 'e5518b6b-6097-44ac-b2b8-0bb65f1a7c49',
  2022: 'd4fa5896-3f97-4de7-9d34-3dac45fd0b20',
  2023: 'd01ad94d-51a7-48e1-9cd4-8e4e05a72ea6',
  2024: '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5',
  2025: 'f8a07dcb-a7ab-4a2b-92d3-c9bafea5e03f'
};

interface YearDistribution {
  year: number;
  identities: Record<string, number>;
  total: number;
}

async function analyzeHistoricalDistribution() {
  console.log('\n🔍 ANALYZING HISTORICAL DISTRIBUTION (2021-2025)');
  console.log('='.repeat(70));

  // Load identities
  const identityBankPath = path.join(process.cwd(), 'lib/oracle/identities/neet_physics.json');
  const identityBank = JSON.parse(fs.readFileSync(identityBankPath, 'utf8'));
  const identities = identityBank.identities;

  const yearDistributions: YearDistribution[] = [];
  const aggregateDistribution: Record<string, number> = {};

  // Analyze each year
  for (const [year, scanId] of Object.entries(SCAN_IDS)) {
    console.log(`\n📅 Analyzing NEET ${year}...`);

    try {
      // Fetch questions
      const { data: questions, error } = await supabase
        .from('questions')
        .select('text, topic')
        .eq('scan_id', scanId)
        .limit(50); // First 50 physics questions

      if (error || !questions || questions.length === 0) {
        console.log(`⚠️  No questions found for ${year}, skipping...`);
        continue;
      }

      console.log(`   Fetched ${questions.length} questions`);

      // Audit to get identity assignments
      const paperText = questions.map(q => q.text).join('\n\n');
      const audit = await auditPaperHistoricalContext(
        paperText,
        'NEET',
        'Physics',
        parseInt(year),
        GEMINI_API_KEY!,
        identities
      );

      if (!audit || !audit.identityVector) {
        console.log(`⚠️  Audit failed for ${year}, skipping...`);
        continue;
      }

      // Count distribution
      const yearDist: Record<string, number> = {};
      Object.entries(audit.identityVector).forEach(([id, count]) => {
        yearDist[id] = count as number;
        aggregateDistribution[id] = (aggregateDistribution[id] || 0) + (count as number);
      });

      yearDistributions.push({
        year: parseInt(year),
        identities: yearDist,
        total: questions.length
      });

      console.log(`   ✅ Analyzed ${Object.keys(yearDist).length} unique identities`);

    } catch (error) {
      console.log(`   ❌ Error analyzing ${year}:`, error);
    }
  }

  if (yearDistributions.length === 0) {
    console.log('\n❌ No data collected, exiting...');
    return;
  }

  // Calculate aggregate statistics
  const totalQuestions = yearDistributions.reduce((sum, y) => sum + y.total, 0);
  const yearsAnalyzed = yearDistributions.length;

  console.log('\n📊 AGGREGATE ANALYSIS (2021-2025)');
  console.log('='.repeat(70));
  console.log(`Years analyzed: ${yearsAnalyzed}`);
  console.log(`Total questions: ${totalQuestions}`);

  // Sort by frequency
  const sortedIdentities = Object.entries(aggregateDistribution)
    .map(([id, count]) => ({
      id,
      totalCount: count,
      avgPerYear: count / yearsAnalyzed,
      percentage: (count / totalQuestions) * 100,
      name: identities.find((i: any) => i.id === id)?.name || id
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  // Display top identities
  console.log('\n🎯 TOP 20 IDENTITIES (by frequency across 5 years):');
  console.log('Rank | ID          | Total | Avg/Yr | %     | Name');
  console.log('-'.repeat(90));

  sortedIdentities.slice(0, 20).forEach((item, idx) => {
    const rank = (idx + 1).toString().padStart(2);
    const name = item.name.substring(0, 45);
    console.log(
      `${rank}   | ${item.id.padEnd(11)} | ${String(item.totalCount).padStart(5)} | ${item.avgPerYear.toFixed(1).padStart(6)} | ${item.percentage.toFixed(1).padStart(5)} | ${name}`
    );
  });

  // Categorize by frequency
  const highFreq = sortedIdentities.filter(i => i.avgPerYear >= 2.5);
  const mediumFreq = sortedIdentities.filter(i => i.avgPerYear >= 1.5 && i.avgPerYear < 2.5);
  const lowFreq = sortedIdentities.filter(i => i.avgPerYear >= 0.5 && i.avgPerYear < 1.5);
  const veryLowFreq = sortedIdentities.filter(i => i.avgPerYear < 0.5);

  console.log('\n📈 FREQUENCY CATEGORIES:');
  console.log(`   High Frequency (≥2.5 Q/year): ${highFreq.length} identities`);
  highFreq.forEach(i => console.log(`      • ${i.id}: ${i.avgPerYear.toFixed(1)} Q/yr - ${i.name}`));

  console.log(`\n   Medium Frequency (1.5-2.5 Q/year): ${mediumFreq.length} identities`);
  mediumFreq.forEach(i => console.log(`      • ${i.id}: ${i.avgPerYear.toFixed(1)} Q/yr - ${i.name}`));

  console.log(`\n   Low Frequency (0.5-1.5 Q/year): ${lowFreq.length} identities`);
  lowFreq.forEach(i => console.log(`      • ${i.id}: ${i.avgPerYear.toFixed(1)} Q/yr - ${i.name}`));

  console.log(`\n   Very Low/Rare (<0.5 Q/year): ${veryLowFreq.length} identities`);
  veryLowFreq.forEach(i => console.log(`      • ${i.id}: ${i.avgPerYear.toFixed(1)} Q/yr - ${i.name}`));

  // Generate calibrated identity confidences
  console.log('\n💡 CALIBRATED IDENTITY CONFIDENCES:');
  console.log('='.repeat(70));

  const confidenceMap: Record<string, number> = {};

  sortedIdentities.forEach(item => {
    // Formula: confidence = (avgPerYear / 2.0) capped at 1.0
    // This assumes avg should be ~2 questions per identity
    // High frequency (3+ Q/yr) → confidence 1.0+
    // Medium frequency (2 Q/yr) → confidence 1.0
    // Low frequency (1 Q/yr) → confidence 0.5
    // Very low (0.5 Q/yr) → confidence 0.25

    let confidence: number;
    if (item.avgPerYear >= 2.5) {
      confidence = 1.2; // Boost high-frequency topics
    } else if (item.avgPerYear >= 1.5) {
      confidence = 1.0; // Standard weight
    } else if (item.avgPerYear >= 0.8) {
      confidence = 0.7; // Reduce medium-low topics
    } else if (item.avgPerYear >= 0.3) {
      confidence = 0.4; // Significantly reduce low topics
    } else {
      confidence = 0.2; // Minimal weight for rare topics
    }

    confidenceMap[item.id] = confidence;
  });

  // Display recommended confidences
  console.log('\n{');
  sortedIdentities.forEach(item => {
    console.log(`  "${item.id}": ${confidenceMap[item.id]}, // ${item.avgPerYear.toFixed(1)} Q/yr - ${item.name}`);
  });
  console.log('}');

  // Save to file
  const configPath = path.join(
    process.cwd(),
    'docs/oracle/calibration/identity_confidences_2021_2025_calibrated.json'
  );

  const config = {
    version: '1.0',
    description: 'Calibrated identity confidences based on 2021-2025 NEET Physics historical analysis',
    years_analyzed: yearsAnalyzed,
    total_questions: totalQuestions,
    generated_at: new Date().toISOString(),
    identityConfidences: confidenceMap,
    statistics: {
      high_frequency: highFreq.map(i => ({ id: i.id, avgPerYear: i.avgPerYear, name: i.name })),
      medium_frequency: mediumFreq.map(i => ({ id: i.id, avgPerYear: i.avgPerYear, name: i.name })),
      low_frequency: lowFreq.map(i => ({ id: i.id, avgPerYear: i.avgPerYear, name: i.name })),
      very_low_frequency: veryLowFreq.map(i => ({ id: i.id, avgPerYear: i.avgPerYear, name: i.name }))
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log('\n✅ Saved calibrated confidences to:');
  console.log(`   ${configPath}`);

  console.log('\n📋 NEXT STEPS:');
  console.log('   1. Review the calibrated confidences above');
  console.log('   2. Update aiQuestionGenerator.ts to use these confidences');
  console.log('   3. Retest on NEET 2024 to validate improvement');
  console.log('   4. If match rate reaches 70%+, deploy to production');

  return {
    yearDistributions,
    aggregateDistribution,
    sortedIdentities,
    confidenceMap
  };
}

analyzeHistoricalDistribution()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
