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

// Official NTA NEET 2026 Botany Syllabus (Class 11 + Class 12)
const NTA_OFFICIAL_CHAPTERS = [
  // Class 11 Botany
  'The Living World',
  'Biological Classification',
  'Plant Kingdom',
  'Morphology of Flowering Plants',
  'Anatomy of Flowering Plants',
  'Cell: The Unit of Life',
  'Cell Cycle and Cell Division',
  'Transport in Plants',
  'Mineral Nutrition',
  'Photosynthesis in Higher Plants',
  'Respiration in Plants',
  'Plant Growth and Development',
  // Class 12 Botany
  'Reproduction in Organisms',
  'Sexual Reproduction in Flowering Plants',
  'Principles of Inheritance and Variation',
  'Molecular Basis of Inheritance',
  'Evolution',
  'Organisms and Populations',
  'Ecosystem',
  'Biodiversity and its Conservation',
  'Biotechnology: Principles and Processes',
  'Biotechnology and its Applications',
  'Strategies for Enhancement in Food Production',
  'Biomolecules'
];

// Topics that are NOT Botany (Physics/Zoology topics wrongly tagged)
const NON_BOTANY_TOPICS = [
  'Alternating Current',  // This is Physics
  'Human Health and Disease',  // This is Zoology
  'Human Reproduction',  // This is Zoology
  'Reproductive Health'  // This is Zoology
];

// Topic normalization map
const TOPIC_MAP: Record<string, string> = {
  'Plant Kingdom - Bryophytes': 'Plant Kingdom',
  'Plant Kingdom - Pteridophytes': 'Plant Kingdom',
  'Plant Kingdom - Gymnosperms': 'Plant Kingdom',
  'Plant Kingdom - Angiosperms': 'Plant Kingdom',
  'Cell - The Unit of Life': 'Cell: The Unit of Life',
  'Cell Cycle and Cell Division': 'Cell Cycle and Cell Division',
  'Photosynthesis in Higher Plants': 'Photosynthesis in Higher Plants',
  'Respiration in Plants': 'Respiration in Plants',
  'Plant Growth and Development': 'Plant Growth and Development',
  'Transport in Plants': 'Transport in Plants',
  'Mineral Nutrition': 'Mineral Nutrition',
  'Sexual Reproduction in Flowering Plants': 'Sexual Reproduction in Flowering Plants',
  'Principles of Inheritance and Variation': 'Principles of Inheritance and Variation',
  'Molecular Basis of Inheritance': 'Molecular Basis of Inheritance',
  'Evolution': 'Evolution',
  'Organisms and Populations': 'Organisms and Populations',
  'Ecosystem': 'Ecosystem',
  'Biodiversity and Conservation': 'Biodiversity and its Conservation',
  'Biotechnology: Principles and Processes': 'Biotechnology: Principles and Processes',
  'Biotechnology and its Applications': 'Biotechnology and its Applications',
  'Strategies for Enhancement in Food Production': 'Strategies for Enhancement in Food Production',
  'Biomolecules': 'Biomolecules',
  'Morphology of Flowering Plants': 'Morphology of Flowering Plants',
  'Anatomy of Flowering Plants': 'Anatomy of Flowering Plants',
  'Biological Classification': 'Biological Classification',
  'The Living World': 'The Living World',
  'Reproduction in Organisms': 'Reproduction in Organisms'
};

async function buildBotanyIdentities() {
  console.log('\n🌱 BUILDING NEET BOTANY IDENTITY BANK (2021-2025)\n');
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
      const rawTopic = q.topic || 'Unknown';

      // Skip non-Botany topics (wrongly tagged Physics/Zoology questions)
      if (NON_BOTANY_TOPICS.some(nonBot => rawTopic.includes(nonBot))) {
        console.log(`   ⚠️  Skipping non-Botany topic: ${rawTopic}`);
        return;
      }

      // Normalize topic to NTA official name
      const topic = TOPIC_MAP[rawTopic] || rawTopic;

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

  // Ensure all NTA official chapters are included (add missing ones with 0 frequency)
  NTA_OFFICIAL_CHAPTERS.forEach(chapter => {
    if (!topicDetails[chapter]) {
      topicDetails[chapter] = {
        count: 0,
        avgPerYear: 0,
        years: [0, 0, 0, 0, 0]
      };
    }
  });

  // Filter to only NTA official chapters and sort by frequency
  const ntaTopics = NTA_OFFICIAL_CHAPTERS.map(chapter => ({
    topic: chapter,
    ...topicDetails[chapter]
  })).sort((a, b) => b.count - a.count);

  console.log('\n📊 NTA OFFICIAL BOTANY CHAPTERS (2021-2025):\n');
  console.log('Rank | Topic                                            | Total | Avg/Yr | Distribution');
  console.log('-'.repeat(105));

  ntaTopics.forEach((t, idx) => {
    const topicStr = t.topic.substring(0, 48).padEnd(48);
    const dist = t.years.join('-');
    console.log(
      `${String(idx + 1).padStart(4)} | ${topicStr} | ${String(t.count).padStart(5)} | ${t.avgPerYear.toFixed(1).padStart(6)} | ${dist}`
    );
  });

  // Generate identity bank with calibrated confidences (all NTA official chapters)
  const identities = ntaTopics.map((t, idx) => {
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

  // Calculate total questions analyzed
  const totalQuestionsAnalyzed = identities.reduce((sum, id) => sum + id.empiricalFrequency.total_2021_2025, 0);

  // Save identity bank
  const identityBank = {
    version: '2.0',
    subject: 'Botany',
    exam: 'NEET',
    generated_at: new Date().toISOString(),
    years_analyzed: '2021-2025',
    total_questions: totalQuestionsAnalyzed,
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
    total_questions: totalQuestionsAnalyzed,
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
