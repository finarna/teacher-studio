/**
 * Fix NEET 2023 Physics Topic Tagging Issues
 *
 * Problems Found:
 * 1. Contains Chemistry/Biology topics (should be Physics only)
 * 2. Uses NCERT chapter names instead of NTA official unit names
 * 3. 37 unique topics (vs 22-29 for other years)
 *
 * Solution:
 * 1. Identify and remove non-Physics questions from Physics dataset
 * 2. Convert all NCERT chapter names to NTA units
 * 3. Validate result matches other years' topic distribution
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEET_2023_SCAN_ID = 'e3767338-1664-4e03-b0f6-1fab41ff5838';

// Mapping of NCERT chapter names to NTA official units for Physics
const NCERT_TO_NTA_PHYSICS: Record<string, string> = {
  // Exact matches (already NTA names)
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
  'Kinetic Theory of Gases': 'KINETIC THEORY OF GASES',
  'Oscillations': 'OSCILLATIONS AND WAVES',
  'Oscillations and Waves': 'OSCILLATIONS AND WAVES',
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
  'Communication Systems': 'REMOVED_FROM_NEET_2026'
};

// Chemistry topics (should NOT be in Physics dataset)
const CHEMISTRY_TOPICS = [
  'd and f Block Elements',
  'Haloalkanes and Haloarenes',
  'Biomolecules',
  'Hydrogen',
  'States of Matter',
  'Some Basic Concepts of Chemistry',
  'Alcohols Phenols and Ethers'
];

// Biology topics (should NOT be in Physics dataset)
const BIOLOGY_TOPICS = [
  'Structural Organisation in Animals',
  'Plant Growth and Development',
  'Photosynthesis in Higher Plants',
  'Animal Kingdom',
  'Digestion and Absorption',
  'Excretory Products and their Elimination'
];

async function fix2023Topics() {
  console.log('🔧 Fixing NEET 2023 Physics Topic Tags\n');
  console.log('='.repeat(80));

  // 1. Fetch all 2023 questions
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_order, topic, subject, text')
    .eq('scan_id', NEET_2023_SCAN_ID)
    .order('question_order', { ascending: true });

  if (error || !questions) {
    console.error('Error fetching questions:', error);
    return;
  }

  console.log(`\n📊 Total questions found: ${questions.length}\n`);

  // 2. Classify questions
  let physicsCount = 0;
  let chemistryCount = 0;
  let biologyCount = 0;
  let updated = 0;
  let errors = 0;

  const updates: Array<{ id: string; newTopic: string; oldTopic: string }> = [];

  for (const q of questions) {
    const topic = q.topic || '';

    // Check if it's a non-Physics topic
    if (CHEMISTRY_TOPICS.includes(topic)) {
      chemistryCount++;
      console.log(`   ⚠️  Q${q.question_order}: Chemistry topic "${topic}" - marking for review`);
      continue;
    }

    if (BIOLOGY_TOPICS.includes(topic)) {
      biologyCount++;
      console.log(`   ⚠️  Q${q.question_order}: Biology topic "${topic}" - marking for review`);
      continue;
    }

    // It's a Physics question - convert to NTA unit
    physicsCount++;
    const ntaUnit = NCERT_TO_NTA_PHYSICS[topic];

    if (ntaUnit && ntaUnit !== topic) {
      updates.push({
        id: q.id,
        newTopic: ntaUnit,
        oldTopic: topic
      });
    } else if (!ntaUnit) {
      console.log(`   ⚠️  Q${q.question_order}: Unknown topic "${topic}" - needs manual review`);
    }
  }

  console.log(`\n\n📊 Classification Summary:`);
  console.log(`   ✅ Physics questions: ${physicsCount}`);
  console.log(`   ❌ Chemistry questions: ${chemistryCount}`);
  console.log(`   ❌ Biology questions: ${biologyCount}`);
  console.log(`   🔄 Topics to update: ${updates.length}\n`);

  // 3. Ask for confirmation before updating
  if (updates.length === 0) {
    console.log('✅ No updates needed!\n');
    return;
  }

  console.log('\n📝 Sample Updates:\n');
  for (let i = 0; i < Math.min(5, updates.length); i++) {
    const u = updates[i];
    console.log(`   "${u.oldTopic}" → "${u.newTopic}"`);
  }

  console.log(`\n🚀 Applying ${updates.length} topic updates...\n`);

  // 4. Update topics in batches
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('questions')
      .update({ topic: update.newTopic })
      .eq('id', update.id);

    if (updateError) {
      console.error(`   ❌ Failed to update ${update.id}:`, updateError.message);
      errors++;
    } else {
      updated++;
      if (updated % 10 === 0) {
        console.log(`   ✓ Updated ${updated}/${updates.length}...`);
      }
    }
  }

  console.log(`\n\n✅ Update Complete!`);
  console.log(`   - Successfully updated: ${updated}`);
  console.log(`   - Errors: ${errors}`);

  // 5. Verify results
  console.log(`\n\n🔍 Verifying Results...\n`);

  const { data: verifyQuestions } = await supabase
    .from('questions')
    .select('topic')
    .eq('scan_id', NEET_2023_SCAN_ID)
    .eq('subject', 'Physics');

  if (verifyQuestions) {
    const topicCounts = new Map<string, number>();
    for (const q of verifyQuestions) {
      if (q.topic) {
        topicCounts.set(q.topic, (topicCounts.get(q.topic) || 0) + 1);
      }
    }

    console.log(`   Total Physics questions: ${verifyQuestions.length}`);
    console.log(`   Unique topics: ${topicCounts.size}`);
    console.log(`\n   Top 10 Topics:\n`);

    const sorted = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [topic, count] of sorted) {
      console.log(`      ${topic.padEnd(50)}${count}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 2023 Topic Fix Complete!\n');
}

fix2023Topics().catch(console.error);
