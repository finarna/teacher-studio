/**
 * Check and Fix All NEET Physics Years (2021-2025)
 *
 * Issues to fix:
 * 1. Subject classification by question order (Q0-49 = Physics)
 * 2. Topic normalization to NTA units
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OFFICIAL_SCANS: Record<number, string> = {
  2021: 'ca38a537-5516-469a-abd4-967a76b32028',
  2022: 'b19037fb-980a-41e1-89a0-d28a5e1c0033',
  2023: 'e3767338-1664-4e03-b0f6-1fab41ff5838',
  2024: '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5',
  2025: '4f682118-d0ce-4f6f-95c7-6141e496579f'
};

// NCERT chapter names → NTA official units mapping
const NCERT_TO_NTA: Record<string, string> = {
  // Already NTA format (keep as-is)
  'PHYSICS AND MEASUREMENT': 'PHYSICS AND MEASUREMENT',
  'KINEMATICS': 'KINEMATICS',
  'LAWS OF MOTION': 'LAWS OF MOTION',
  'WORK, ENERGY, AND POWER': 'WORK, ENERGY, AND POWER',
  'ROTATIONAL MOTION': 'ROTATIONAL MOTION',
  'GRAVITATION': 'GRAVITATION',
  'THERMODYNAMICS': 'THERMODYNAMICS',
  'KINETIC THEORY OF GASES': 'KINETIC THEORY OF GASES',
  'CURRENT ELECTRICITY': 'CURRENT ELECTRICITY',
  'ELECTROMAGNETIC WAVES': 'ELECTROMAGNETIC WAVES',
  'OPTICS': 'OPTICS',
  'PROPERTIES OF SOLIDS AND LIQUIDS': 'PROPERTIES OF SOLIDS AND LIQUIDS',
  'OSCILLATIONS AND WAVES': 'OSCILLATIONS AND WAVES',
  'ELECTROSTATICS': 'ELECTROSTATICS',
  'ELECTROMAGNETIC INDUCTION AND ALTERNATING CURRENTS': 'ELECTROMAGNETIC INDUCTION AND ALTERNATING CURRENTS',
  'MAGNETIC EFFECTS OF CURRENT AND MAGNETISM': 'MAGNETIC EFFECTS OF CURRENT AND MAGNETISM',
  'DUAL NATURE OF MATTER AND RADIATION': 'DUAL NATURE OF MATTER AND RADIATION',
  'ATOMS AND NUCLEI': 'ATOMS AND NUCLEI',
  'ELECTRONIC DEVICES': 'ELECTRONIC DEVICES',

  // NCERT chapters → NTA units
  'Units and Measurements': 'PHYSICS AND MEASUREMENT',
  'Motion in a Straight Line': 'KINEMATICS',
  'Motion in a Plane': 'KINEMATICS',
  'Work, Energy and Power': 'WORK, ENERGY, AND POWER',
  'System of Particles and Rotational Motion': 'ROTATIONAL MOTION',
  'Mechanical Properties of Solids': 'PROPERTIES OF SOLIDS AND LIQUIDS',
  'Mechanical Properties of Fluids': 'PROPERTIES OF SOLIDS AND LIQUIDS',
  'Thermal Properties of Matter': 'PROPERTIES OF SOLIDS AND LIQUIDS',
  'Kinetic Theory': 'KINETIC THEORY OF GASES',
  'Oscillations': 'OSCILLATIONS AND WAVES',
  'Waves': 'OSCILLATIONS AND WAVES',
  'Electric Charges and Fields': 'ELECTROSTATICS',
  'Electrostatic Potential and Capacitance': 'ELECTROSTATICS',
  'Electromagnetic Induction': 'ELECTROMAGNETIC INDUCTION AND ALTERNATING CURRENTS',
  'Alternating Current': 'ELECTROMAGNETIC INDUCTION AND ALTERNATING CURRENTS',
  'Electromagnetic Waves / Alternating Current': 'ELECTROMAGNETIC INDUCTION AND ALTERNATING CURRENTS',
  'Moving Charges and Magnetism': 'MAGNETIC EFFECTS OF CURRENT AND MAGNETISM',
  'Magnetism and Matter': 'MAGNETIC EFFECTS OF CURRENT AND MAGNETISM',
  'Ray Optics and Optical Instruments': 'OPTICS',
  'Wave Optics': 'OPTICS',
  'Dual Nature of Radiation and Matter': 'DUAL NATURE OF MATTER AND RADIATION',
  'Atoms': 'ATOMS AND NUCLEI',
  'Nuclei': 'ATOMS AND NUCLEI',
  'Semiconductor Electronics: Materials, Devices and Simple Circuits': 'ELECTRONIC DEVICES',
  'Communication Systems': 'REMOVED_FROM_NEET_2026',

  // Some variations that might exist
  'Current Electricity': 'CURRENT ELECTRICITY',
  'Laws of Motion': 'LAWS OF MOTION',
  'Gravitation': 'GRAVITATION',
  'Thermodynamics': 'THERMODYNAMICS',
};

function getCorrectSubject(questionOrder: number): string {
  if (questionOrder >= 0 && questionOrder <= 49) return 'Physics';
  if (questionOrder >= 50 && questionOrder <= 99) return 'Chemistry';
  if (questionOrder >= 100 && questionOrder <= 149) return 'Botany';
  if (questionOrder >= 150 && questionOrder <= 199) return 'Zoology';
  return 'Unknown';
}

async function checkAndFixYear(year: number) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📅 NEET ${year} - Checking and Fixing`);
  console.log('='.repeat(80));

  const scanId = OFFICIAL_SCANS[year];

  // 1. Get all questions
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_order, subject, topic')
    .eq('scan_id', scanId)
    .order('question_order', { ascending: true });

  if (error || !questions) {
    console.error(`❌ Error fetching ${year} questions:`, error);
    return;
  }

  console.log(`\n📊 Total questions: ${questions.length}`);

  // 2. Check subject classification
  const subjectMisclassified = questions.filter(q => {
    const correct = getCorrectSubject(q.question_order);
    return q.subject !== correct && correct !== 'Unknown';
  });

  console.log(`\n🔍 Subject Classification:`);
  if (subjectMisclassified.length > 0) {
    console.log(`   ⚠️  ${subjectMisclassified.length} questions misclassified`);

    // Show sample
    console.log(`\n   Sample misclassifications:`);
    for (let i = 0; i < Math.min(5, subjectMisclassified.length); i++) {
      const q = subjectMisclassified[i];
      console.log(`      Q${q.question_order}: ${q.subject} → ${getCorrectSubject(q.question_order)}`);
    }

    // Fix subject classification
    console.log(`\n   🔧 Fixing subject classification...`);
    let fixed = 0;
    for (const q of subjectMisclassified) {
      const { error: updateError } = await supabase
        .from('questions')
        .update({ subject: getCorrectSubject(q.question_order) })
        .eq('id', q.id);

      if (!updateError) {
        fixed++;
        if (fixed % 10 === 0) {
          console.log(`      ✓ Fixed ${fixed}/${subjectMisclassified.length}...`);
        }
      }
    }
    console.log(`   ✅ Fixed ${fixed} subject classifications`);
  } else {
    console.log(`   ✅ All subjects correctly classified`);
  }

  // 3. Get Physics questions only (Q0-49)
  const { data: physicsQuestions } = await supabase
    .from('questions')
    .select('id, question_order, topic')
    .eq('scan_id', scanId)
    .eq('subject', 'Physics')
    .order('question_order', { ascending: true });

  if (!physicsQuestions) {
    console.log(`\n❌ Could not fetch Physics questions`);
    return;
  }

  console.log(`\n🔍 Physics Questions: ${physicsQuestions.length}`);

  // 4. Check topic normalization
  const topicsNeedingFix = physicsQuestions.filter(q => {
    const ntaTopic = NCERT_TO_NTA[q.topic];
    return ntaTopic && ntaTopic !== q.topic && ntaTopic !== 'REMOVED_FROM_NEET_2026';
  });

  console.log(`\n🔍 Topic Normalization:`);
  if (topicsNeedingFix.length > 0) {
    console.log(`   ⚠️  ${topicsNeedingFix.length} Physics topics need normalization`);

    // Show unique topic conversions
    const uniqueConversions = new Map<string, string>();
    for (const q of topicsNeedingFix) {
      const ntaTopic = NCERT_TO_NTA[q.topic];
      if (ntaTopic) {
        uniqueConversions.set(q.topic, ntaTopic);
      }
    }

    console.log(`\n   Topic conversions to apply:`);
    for (const [old, nta] of uniqueConversions.entries()) {
      const count = topicsNeedingFix.filter(q => q.topic === old).length;
      console.log(`      "${old}" → "${nta}" (${count} questions)`);
    }

    // Fix topics
    console.log(`\n   🔧 Normalizing topics to NTA units...`);
    let fixedTopics = 0;
    for (const q of topicsNeedingFix) {
      const ntaTopic = NCERT_TO_NTA[q.topic];
      if (ntaTopic) {
        const { error: updateError } = await supabase
          .from('questions')
          .update({ topic: ntaTopic })
          .eq('id', q.id);

        if (!updateError) {
          fixedTopics++;
          if (fixedTopics % 10 === 0) {
            console.log(`      ✓ Fixed ${fixedTopics}/${topicsNeedingFix.length}...`);
          }
        }
      }
    }
    console.log(`   ✅ Normalized ${fixedTopics} topics`);
  } else {
    console.log(`   ✅ All Physics topics already in NTA format`);
  }

  // 5. Final verification
  const { data: finalPhysics } = await supabase
    .from('questions')
    .select('topic')
    .eq('scan_id', scanId)
    .eq('subject', 'Physics');

  if (finalPhysics) {
    const topicCounts = new Map<string, number>();
    for (const q of finalPhysics) {
      if (q.topic) {
        topicCounts.set(q.topic, (topicCounts.get(q.topic) || 0) + 1);
      }
    }

    console.log(`\n📊 Final Physics Topic Distribution:`);
    console.log(`   Total Physics questions: ${finalPhysics.length}`);
    console.log(`   Unique topics: ${topicCounts.size}`);

    // Check for non-NTA topics
    const nonNTATopics = Array.from(topicCounts.keys()).filter(topic => {
      return !Object.values(NCERT_TO_NTA).includes(topic);
    });

    if (nonNTATopics.length > 0) {
      console.log(`\n   ⚠️  Non-NTA topics still present:`);
      for (const topic of nonNTATopics.slice(0, 5)) {
        console.log(`      - ${topic} (${topicCounts.get(topic)} questions)`);
      }
    } else {
      console.log(`   ✅ All topics in NTA format`);
    }
  }

  console.log(`\n✅ Year ${year} complete`);
}

async function checkAll() {
  console.log('\n🔧 Checking and Fixing All NEET Years (2021-2025)');
  console.log('='.repeat(80));

  for (const year of [2021, 2022, 2023, 2024, 2025]) {
    await checkAndFixYear(year);
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log('✅ ALL YEARS COMPLETE');
  console.log('='.repeat(80));
  console.log();
}

checkAll().catch(console.error);
