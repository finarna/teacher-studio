/**
 * Build NEET Botany Identity Bank from 2021-2025 actual data
 * Similar to what we did for Physics
 */

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

const NEET_SCANS_2021_2025 = {
  2021: 'ca38a537-5516-469a-abd4-967a76b32028',
  2022: 'b19037fb-980a-41e1-89a0-d28a5e1c0033',
  2023: 'e3767338-1664-4e03-b0f6-1fab41ff5838',
  2024: '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5',
  2025: '4f682118-d0ce-4f6f-95c7-6141e496579f',
};

async function buildBotanyIdentities() {
  console.log('\n🌱 BUILDING NEET CHEMISTRY IDENTITY BANK (2021-2025)\n');
  console.log('='.repeat(70));

  const topicFrequency: Record<string, number[]> = {};
  const topicDetails: Record<string, { count: number; avgPerYear: number; years: number[] }> = {};

  // Analyze all 5 years
  for (const [year, scanId] of Object.entries(NEET_SCANS_2021_2025)) {
    const { data: questions } = await supabase
      .from('questions')
      .select('topic, difficulty')
      .eq('scan_id', scanId)
      .eq('subject', 'Botany');

    console.log(`📅 ${year}: ${questions?.length || 0} Botany questions`);

    questions?.forEach(q => {
      const topic = q.topic || 'Unknown';
      if (!topicFrequency[topic]) {
        topicFrequency[topic] = [0, 0, 0, 0, 0]; // [2021, 2022, 2023, 2024, 2025]
      }
      const yearIndex = parseInt(year) - 2021;
      topicFrequency[topic][yearIndex]++;
    });
  }

  // Calculate statistics
  Object.entries(topicFrequency).forEach(([topic, years]) => {
    const total = years.reduce((a, b) => a + b, 0);
    const avgPerYear = total / 5;
    topicDetails[topic] = {
      count: total,
      avgPerYear,
      years
    };
  });

  // Sort by frequency
  const sortedTopics = Object.entries(topicDetails)
    .map(([topic, stats]) => ({ topic, ...stats }))
    .sort((a, b) => b.count - a.count);

  console.log('\n📊 TOP 30 CHEMISTRY TOPICS (2021-2025):\n');
  console.log('Rank | Topic                                    | Total | Avg/Yr | Distribution');
  console.log('-'.repeat(95));

  sortedTopics.slice(0, 30).forEach((t, idx) => {
    const topicStr = t.topic.substring(0, 40).padEnd(40);
    const dist = t.years.join('-');
    console.log(
      `${String(idx + 1).padStart(4)} | ${topicStr} | ${String(t.count).padStart(5)} | ${t.avgPerYear.toFixed(1).padStart(6)} | ${dist}`
    );
  });

  // Generate identity bank with calibrated confidences
  const identities = sortedTopics.slice(0, 30).map((t, idx) => {
    const id = `ID-NB-${String(idx + 1).padStart(3, '0')}`;

    // Calculate confidence based on frequency
    let confidence = 1.0;
    if (t.avgPerYear >= 3) {
      confidence = 2.0; // High frequency
    } else if (t.avgPerYear >= 2) {
      confidence = 1.5; // Medium-high
    } else if (t.avgPerYear >= 1) {
      confidence = 1.0; // Medium
    } else if (t.avgPerYear >= 0.5) {
      confidence = 0.7; // Low
    } else {
      confidence = 0.2; // Very low
    }

    return {
      id,
      name: t.topic,
      topic: t.topic,
      empiricalFrequency: {
        total_2021_2025: t.count,
        avgPerYear: parseFloat(t.avgPerYear.toFixed(2)),
        distribution: {
          2021: t.years[0],
          2022: t.years[1],
          2023: t.years[2],
          2024: t.years[3],
          2025: t.years[4]
        }
      },
      confidence,
      high_yield: t.avgPerYear >= 2
    };
  });

  // Save identity bank
  const identityBank = {
    version: '2.0',
    subject: 'Botany',
    exam: 'NEET',
    generated_at: new Date().toISOString(),
    years_analyzed: '2021-2025',
    total_questions: 245,
    identities
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'lib/oracle/identities/neet_botany.json'),
    JSON.stringify(identityBank, null, 2)
  );

  // Save calibration confidences
  const calibrationData = {
    version: '2.0',
    description: 'Calibrated identity confidences for NEET Botany based on 2021-2025 empirical data',
    subject: 'Botany',
    exam: 'NEET',
    years_analyzed: 5,
    total_questions: 245,
    generated_at: new Date().toISOString(),
    identityConfidences: Object.fromEntries(
      identities.map(id => [id.id, id.confidence])
    ),
    empiricalDistribution: Object.fromEntries(
      identities.map(id => [id.id, id.empiricalFrequency.avgPerYear])
    ),
    statistics: {
      high_frequency: identities.filter(id => id.confidence >= 2.0).length,
      medium_frequency: identities.filter(id => id.confidence >= 1.0 && id.confidence < 2.0).length,
      low_frequency: identities.filter(id => id.confidence < 1.0).length
    }
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'docs/oracle/calibration/identity_confidences_neet_botany.json'),
    JSON.stringify(calibrationData, null, 2)
  );

  console.log('\n✅ Identity bank saved to: lib/oracle/identities/neet_botany.json');
  console.log('✅ Calibration saved to: docs/oracle/calibration/identity_confidences_neet_botany.json');
  console.log(`\n📈 STATISTICS:`);
  console.log(`   Total identities: ${identities.length}`);
  console.log(`   High frequency (2.0×): ${calibrationData.statistics.high_frequency}`);
  console.log(`   Medium frequency (1.0-1.5×): ${calibrationData.statistics.medium_frequency}`);
  console.log(`   Low frequency (<1.0×): ${calibrationData.statistics.low_frequency}`);
}

buildBotanyIdentities()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
