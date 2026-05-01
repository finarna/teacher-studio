/**
 * Build NEET Chemistry Identity Bank from 2021-2025 actual data
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

// Official NTA NEET 2026 Chemistry Syllabus (20 chapters)
const NTA_OFFICIAL_CHAPTERS = [
  'Some Basic Concepts in Chemistry',
  'Atomic Structure',
  'Chemical Bonding and Molecular Structure',
  'Chemical Thermodynamics',
  'Equilibrium',
  'Redox Reactions and Electrochemistry',
  'Chemical Kinetics',
  'Solutions',
  'Classification of Elements and Periodicity in Properties',
  'p-Block Elements',
  'd and f Block Elements',
  'Coordination Compounds',
  'Some Basic Principles of Organic Chemistry',
  'Hydrocarbons',
  'Purification and Characterisation of Organic Compounds',
  'Haloalkanes and Haloarenes',
  'Alcohols, Phenols and Ethers',
  'Aldehydes, Ketones and Carboxylic Acids',
  'Amines',
  'Biomolecules'
];

// Chapters removed from NEET 2026 (should be excluded)
const REMOVED_CHAPTERS = [
  'States of Matter',
  'Hydrogen',
  's-Block Elements',
  'Environmental Chemistry',
  'Surface Chemistry',
  'General Principles and Processes of Isolation of Elements',
  'Polymers',
  'Chemistry in Everyday Life'
];

// Topic normalization map
const TOPIC_MAP: Record<string, string> = {
  'Some Basic Concepts of Chemistry': 'Some Basic Concepts in Chemistry',
  'Structure of Atom': 'Atomic Structure',
  'Atoms': 'Atomic Structure',
  'Chemical Bonding and Molecular Structure': 'Chemical Bonding and Molecular Structure',
  'Thermodynamics': 'Chemical Thermodynamics',
  'Chemical Thermodynamics': 'Chemical Thermodynamics',
  'Chemical Equilibrium': 'Equilibrium',
  'Equilibrium': 'Equilibrium',
  'Redox Reactions': 'Redox Reactions and Electrochemistry',
  'Electrochemistry': 'Redox Reactions and Electrochemistry',
  'Chemical Kinetics': 'Chemical Kinetics',
  'Solutions': 'Solutions',
  'The Solid State': 'Solutions', // Merge into Solutions
  'Classification of Elements and Periodicity in Properties': 'Classification of Elements and Periodicity in Properties',
  'The p-Block Elements': 'p-Block Elements',
  'The p-Block Elements (Group 18)': 'p-Block Elements',
  'The d-and f-Block Elements': 'd and f Block Elements',
  'Coordination Compounds': 'Coordination Compounds',
  'Organic Chemistry - Some Basic Principles and Techniques': 'Some Basic Principles of Organic Chemistry',
  'Some Basic Principles of Organic Chemistry': 'Some Basic Principles of Organic Chemistry',
  'Hydrocarbons': 'Hydrocarbons',
  'Purification and Characterisation of Organic Compounds': 'Purification and Characterisation of Organic Compounds',
  'Haloalkanes and Haloarenes': 'Haloalkanes and Haloarenes',
  'Alcohols, Phenols and Ethers': 'Alcohols, Phenols and Ethers',
  'Aldehydes, Ketones and Carboxylic Acids': 'Aldehydes, Ketones and Carboxylic Acids',
  'Amines': 'Amines',
  'Biomolecules': 'Biomolecules'
};

async function buildChemistryIdentities() {
  console.log('\n🧪 BUILDING NEET CHEMISTRY IDENTITY BANK (2021-2025)\n');
  console.log('='.repeat(70));

  const topicFrequency: Record<string, number[]> = {};
  const topicDetails: Record<string, { count: number; avgPerYear: number; years: number[] }> = {};

  // Analyze all 5 years
  for (const [year, scanId] of Object.entries(NEET_SCANS_2021_2025)) {
    const { data: questions } = await supabase
      .from('questions')
      .select('topic, difficulty')
      .eq('scan_id', scanId)
      .eq('subject', 'Chemistry');

    console.log(`📅 ${year}: ${questions?.length || 0} Chemistry questions`);

    questions?.forEach(q => {
      const rawTopic = q.topic || 'Unknown';

      // Skip removed chapters
      if (REMOVED_CHAPTERS.some(removed => rawTopic.includes(removed))) {
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

  // Ensure all 20 NTA chapters are included (add missing ones with 0 frequency)
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

  console.log('\n📊 NTA OFFICIAL CHEMISTRY CHAPTERS (2021-2025):\n');
  console.log('Rank | Topic                                            | Total | Avg/Yr | Distribution');
  console.log('-'.repeat(105));

  ntaTopics.forEach((t, idx) => {
    const topicStr = t.topic.substring(0, 48).padEnd(48);
    const dist = t.years.join('-');
    console.log(
      `${String(idx + 1).padStart(4)} | ${topicStr} | ${String(t.count).padStart(5)} | ${t.avgPerYear.toFixed(1).padStart(6)} | ${dist}`
    );
  });

  // Generate identity bank with calibrated confidences (all 20 official chapters)
  const identities = ntaTopics.map((t, idx) => {
    const id = `ID-NC-${String(idx + 1).padStart(3, '0')}`;

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

  // Calculate total questions (excluding removed chapters)
  const totalQuestions = ntaTopics.reduce((sum, t) => sum + t.count, 0);

  // Save identity bank
  const identityBank = {
    version: '3.0',
    subject: 'Chemistry',
    exam: 'NEET',
    generated_at: new Date().toISOString(),
    years_analyzed: '2021-2025',
    total_questions: totalQuestions,
    nta_aligned: true,
    identities
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'lib/oracle/identities/neet_chemistry.json'),
    JSON.stringify(identityBank, null, 2)
  );

  // Save calibration confidences
  const calibrationData = {
    version: '3.0',
    description: 'Calibrated identity confidences for NEET Chemistry (NTA 2026 Syllabus - 20 chapters)',
    subject: 'Chemistry',
    exam: 'NEET',
    years_analyzed: 5,
    total_questions: totalQuestions,
    nta_aligned: true,
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
    path.join(process.cwd(), 'docs/oracle/calibration/identity_confidences_neet_chemistry.json'),
    JSON.stringify(calibrationData, null, 2)
  );

  console.log('\n✅ Identity bank saved to: lib/oracle/identities/neet_chemistry.json');
  console.log('✅ Calibration saved to: docs/oracle/calibration/identity_confidences_neet_chemistry.json');
  console.log(`\n📈 STATISTICS:`);
  console.log(`   Total identities: ${identities.length} (NTA Official Syllabus)`);
  console.log(`   High frequency (2.0×): ${calibrationData.statistics.high_frequency}`);
  console.log(`   Medium frequency (1.0-1.5×): ${calibrationData.statistics.medium_frequency}`);
  console.log(`   Low frequency (<1.0×): ${calibrationData.statistics.low_frequency}`);
  console.log(`\n✅ ALIGNED WITH NTA NEET 2026 SYLLABUS (20 chapters)`);
}

buildChemistryIdentities()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
