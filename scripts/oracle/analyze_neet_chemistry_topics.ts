/**
 * Analyze NEET Chemistry topics to build identity bank
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEET_SCANS = {
  2023: 'e3767338-1664-4e03-b0f6-1fab41ff5838',
  2024: '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5',
  2025: '4f682118-d0ce-4f6f-95c7-6141e496579f',
};

async function analyzeChemistryTopics() {
  console.log('\n🧪 ANALYZING NEET CHEMISTRY TOPICS (2023-2025)\n');
  console.log('='.repeat(70));

  const topicFrequency: Record<string, number[]> = {};

  for (const [year, scanId] of Object.entries(NEET_SCANS)) {
    const { data: questions } = await supabase
      .from('questions')
      .select('topic')
      .eq('scan_id', scanId)
      .eq('subject', 'Chemistry');

    console.log(`\n📅 ${year}: ${questions?.length || 0} questions`);

    questions?.forEach(q => {
      const topic = q.topic || 'Unknown';
      if (!topicFrequency[topic]) {
        topicFrequency[topic] = [0, 0, 0]; // [2023, 2024, 2025]
      }
      const yearIndex = year === '2023' ? 0 : year === '2024' ? 1 : 2;
      topicFrequency[topic][yearIndex]++;
    });
  }

  // Sort by total frequency
  const sortedTopics = Object.entries(topicFrequency)
    .map(([topic, years]) => ({
      topic,
      year2023: years[0],
      year2024: years[1],
      year2025: years[2],
      total: years.reduce((a, b) => a + b, 0),
      avgPerYear: years.reduce((a, b) => a + b, 0) / 3
    }))
    .sort((a, b) => b.total - a.total);

  console.log('\n📊 TOPIC FREQUENCY ANALYSIS:\n');
  console.log('Topic                                    | 2023 | 2024 | 2025 | Total | Avg/Yr');
  console.log('-'.repeat(85));

  sortedTopics.forEach(t => {
    const topicStr = t.topic.substring(0, 40).padEnd(40);
    console.log(
      `${topicStr} | ${String(t.year2023).padStart(4)} | ${String(t.year2024).padStart(4)} | ${String(t.year2025).padStart(4)} | ${String(t.total).padStart(5)} | ${t.avgPerYear.toFixed(1)}`
    );
  });

  console.log('\n📈 DISTRIBUTION STATISTICS:');
  console.log(`   Total unique topics: ${sortedTopics.length}`);
  console.log(`   High frequency (>=5 total): ${sortedTopics.filter(t => t.total >= 5).length}`);
  console.log(`   Medium frequency (2-4): ${sortedTopics.filter(t => t.total >= 2 && t.total < 5).length}`);
  console.log(`   Low frequency (1): ${sortedTopics.filter(t => t.total === 1).length}`);

  // Save for identity bank creation
  fs.writeFileSync(
    'docs/oracle/calibration/neet_chemistry_topic_analysis.json',
    JSON.stringify({ topics: sortedTopics, analyzedAt: new Date().toISOString() }, null, 2)
  );

  console.log('\n✅ Analysis saved to: docs/oracle/calibration/neet_chemistry_topic_analysis.json');
}

analyzeChemistryTopics()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
