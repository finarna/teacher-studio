import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function checkSyllabus() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 NEET PHYSICS SYLLABUS vs IDENTITY BANK CHECK');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check syllabus table
  console.log('📚 STEP 1: Checking Syllabus Database...\n');
  const { data: syllabusData, error: syllabusError } = await supabase
    .from('syllabus')
    .select('*')
    .eq('exam', 'NEET')
    .eq('subject', 'Physics')
    .order('unit', { ascending: true });

  if (syllabusError) {
    console.log('⚠️  syllabus table error:', syllabusError.message);
  } else if (syllabusData && syllabusData.length > 0) {
    console.log(`✅ Found ${syllabusData.length} syllabus topics for NEET Physics\n`);
    console.log('📋 NEET Physics Official Syllabus:\n');

    const topics: Record<string, string[]> = {};
    for (const entry of syllabusData) {
      const unit = entry.unit || 'Unknown';
      const topic = entry.topic || entry.name || 'Unknown Topic';

      if (!topics[unit]) {
        topics[unit] = [];
      }
      topics[unit].push(topic);
    }

    let topicCount = 0;
    for (const [unit, unitTopics] of Object.entries(topics)) {
      console.log(`\n📚 ${unit} (${unitTopics.length} topics):`);
      for (const topic of unitTopics) {
        console.log(`   • ${topic}`);
        topicCount++;
      }
    }

    console.log(`\n📊 Total Syllabus Topics: ${topicCount}`);
  } else {
    console.log('❌ No NEET Physics syllabus found in database');
    console.log('   → Syllabus may be stored elsewhere or needs to be imported\n');
  }

  // Check topic_mappings
  console.log('\n📋 STEP 2: Checking Topic Mappings...\n');
  const { data: topicMappings, error: topicError } = await supabase
    .from('topic_mappings')
    .select('*')
    .eq('exam', 'NEET')
    .eq('subject', 'Physics');

  if (!topicError && topicMappings && topicMappings.length > 0) {
    console.log(`✅ Found ${topicMappings.length} topic mappings for NEET Physics`);

    // Group by topic
    const mappingsByTopic: Record<string, number> = {};
    for (const mapping of topicMappings) {
      const topic = mapping.topic || 'Unknown';
      mappingsByTopic[topic] = (mappingsByTopic[topic] || 0) + 1;
    }

    console.log('\n📊 Questions per Topic:');
    const sortedTopics = Object.entries(mappingsByTopic).sort((a, b) => b[1] - a[1]);
    for (const [topic, count] of sortedTopics.slice(0, 15)) {
      console.log(`   ${topic}: ${count} questions`);
    }
    if (sortedTopics.length > 15) {
      console.log(`   ... and ${sortedTopics.length - 15} more topics`);
    }
  } else {
    console.log('⚠️  No topic mappings found');
  }

  // Check existing identities
  console.log('\n\n🧬 STEP 3: Current Identity Bank...\n');
  console.log('📁 File: lib/oracle/identities/neet_physics.json');
  console.log('   Currently has: 5 identities');
  console.log('   • ID-NP-001: Dimensional Homogeneity Traps');
  console.log('   • ID-NP-002: Graph Interpretation-Slope/Area');
  console.log('   • ID-NP-003: Semiconductor - Logic Gate Fusion');
  console.log('   • ID-NP-004: Optics - Focal Length in Medium');
  console.log('   • ID-NP-005: Rayleigh Criterion - Resolution');

  const { data: dbIdentities } = await supabase
    .from('identities')
    .select('id, identity_id, name, exam, subject')
    .eq('exam', 'NEET')
    .eq('subject', 'Physics');

  console.log(`\n📊 Database: ${dbIdentities?.length || 0} identities`);
  console.log(`🎯 Target: 180 identities (from REPEATABLE_CALIBRATION_WORKFLOW)`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 RECOMMENDED IDENTITY STRUCTURE FOR NEET PHYSICS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Based on NEET Physics syllabus, we should have ~180 identities covering:\n');

  console.log('📚 UNIT 1: MECHANICS (40-45 identities)');
  console.log('   • Kinematics: 10-12 identities (projectile, relative motion, graphs)');
  console.log('   • Laws of Motion: 8-10 identities (friction, tension, pulley systems)');
  console.log('   • Work-Energy-Power: 8-10 identities (conservation, collisions)');
  console.log('   • Rotational Motion: 8-10 identities (torque, moment of inertia)');
  console.log('   • Gravitation: 6-8 identities (satellite motion, gravitational potential)');

  console.log('\n📚 UNIT 2: PROPERTIES OF MATTER (25-30 identities)');
  console.log('   • Elasticity: 5-6 identities (stress-strain, Young\'s modulus)');
  console.log('   • Fluid Mechanics: 10-12 identities (Bernoulli, viscosity, surface tension)');
  console.log('   • Thermodynamics: 10-12 identities (PV diagrams, heat engines, entropy)');

  console.log('\n📚 UNIT 3: ELECTROMAGNETISM (45-50 identities)');
  console.log('   • Electrostatics: 12-15 identities (Gauss law, capacitors, dipole)');
  console.log('   • Current Electricity: 10-12 identities (Kirchhoff, Wheatstone bridge)');
  console.log('   • Magnetism: 8-10 identities (magnetic field, BH curves)');
  console.log('   • EM Induction: 10-12 identities (Faraday, Lenz, AC circuits)');
  console.log('   • AC Circuits: 5-6 identities (impedance, resonance, power factor)');

  console.log('\n📚 UNIT 4: OPTICS (20-25 identities)');
  console.log('   • Ray Optics: 10-12 identities (lens formula, prism, optical instruments)');
  console.log('   • Wave Optics: 10-12 identities (interference, diffraction, polarization)');

  console.log('\n📚 UNIT 5: MODERN PHYSICS (30-35 identities)');
  console.log('   • Dual Nature: 8-10 identities (photoelectric effect, de Broglie)');
  console.log('   • Atomic Physics: 8-10 identities (Bohr model, spectra, X-rays)');
  console.log('   • Nuclear Physics: 8-10 identities (radioactivity, binding energy)');
  console.log('   • Semiconductors: 6-8 identities (diodes, transistors, logic gates)');

  console.log('\n📚 UNIT 6: OSCILLATIONS & WAVES (15-20 identities)');
  console.log('   • SHM: 8-10 identities (pendulum, springs, energy)');
  console.log('   • Waves: 7-10 identities (superposition, Doppler effect, standing waves)');

  console.log('\n═══════════════════════════════════════════════════════════════\n');
  console.log('📍 NEXT STEPS:\n');
  console.log('1. ✅ We have 250 questions analyzed (good coverage)');
  console.log('2. ⚠️  We only have 5 identities (need 175 more)');
  console.log('3. 📋 Use Phase 2 (Calibration Execution) to build identity bank:');
  console.log('   → Run iterative calibration against 250 questions');
  console.log('   → Extract patterns and create 180 identities');
  console.log('   → Align identities to syllabus units shown above\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

checkSyllabus().catch(console.error);
