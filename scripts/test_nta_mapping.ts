/**
 * Test NTA Topic Normalization
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import neetPhysics from '../lib/oracle/identities/neet_physics.json';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeToNTAUnit(dbTopic: string): string {
  const mapping: Record<string, string> = {
    'units and measurements': 'PHYSICS AND MEASUREMENT',
    'motion in a straight line': 'KINEMATICS',
    'motion in a plane': 'KINEMATICS',
    'laws of motion': 'LAWS OF MOTION',
    'work, energy and power': 'WORK, ENERGY, AND POWER',
    'system of particles and rotational motion': 'ROTATIONAL MOTION',
    'gravitation': 'GRAVITATION',
    'mechanical properties of solids': 'PROPERTIES OF SOLIDS AND LIQUIDS',
    'mechanical properties of fluids': 'PROPERTIES OF SOLIDS AND LIQUIDS',
    'thermal properties of matter': 'PROPERTIES OF SOLIDS AND LIQUIDS',
    'thermodynamics': 'THERMODYNAMICS',
    'kinetic theory of gases': 'KINETIC THEORY OF GASES',
    'kinetic theory': 'KINETIC THEORY OF GASES',
    'oscillations': 'OSCILLATIONS AND WAVES',
    'waves': 'OSCILLATIONS AND WAVES',
    'electric charges and fields': 'ELECTROSTATICS',
    'electrostatic potential and capacitance': 'ELECTROSTATICS',
    'current electricity': 'CURRENT ELECTRICITY',
    'moving charges and magnetism': 'MAGNETIC EFFECTS OF CURRENT AND MAGNETISM',
    'magnetism and matter': 'MAGNETIC EFFECTS OF CURRENT AND MAGNETISM',
    'electromagnetic induction': 'ELECTROMAGNETIC INDUCTION AND ALTERNATING CURRENTS',
    'alternating current': 'ELECTROMAGNETIC INDUCTION AND ALTERNATING CURRENTS',
    'electromagnetic waves': 'ELECTROMAGNETIC WAVES',
    'ray optics and optical instruments': 'OPTICS',
    'wave optics': 'OPTICS',
    'dual nature of radiation and matter': 'DUAL NATURE OF MATTER AND RADIATION',
    'atoms': 'ATOMS AND NUCLEI',
    'nuclei': 'ATOMS AND NUCLEI',
    'semiconductor electronics: materials, devices and simple circuits': 'ELECTRONIC DEVICES',
    'communication systems': 'REMOVED_FROM_NEET_2026'
  };

  return mapping[dbTopic.toLowerCase()] || dbTopic.toUpperCase();
}

async function testMapping() {
  console.log('🧪 Testing NTA Topic Normalization\n');

  // Get unique topics from database
  const { data: questions } = await supabase
    .from('questions')
    .select('topic')
    .eq('subject', 'Physics')
    .eq('exam_context', 'NEET')
    .eq('year', 2022);

  const dbTopics = Array.from(new Set(questions?.map(q => q.topic) || []));

  console.log('📊 DB Topic → Normalized NTA Unit → Identity Match\n');
  console.log('━'.repeat(80));

  let totalMatches = 0;
  let totalTopics = 0;

  dbTopics.sort().forEach(dbTopic => {
    const normalized = normalizeToNTAUnit(dbTopic);
    const matches = neetPhysics.identities.filter(id =>
      (id.topic || id.name).toUpperCase() === normalized
    );

    totalTopics++;
    if (matches.length > 0) {
      totalMatches++;
      console.log(`✅ "${dbTopic}"`);
      console.log(`   → ${normalized}`);
      console.log(`   → ${matches.length} identities: ${matches.map(m => m.id).join(', ')}\n`);
    } else {
      console.log(`❌ "${dbTopic}"`);
      console.log(`   → ${normalized}`);
      console.log(`   → NO MATCH IN IDENTITY BANK\n`);
    }
  });

  console.log('━'.repeat(80));
  console.log(`\n📈 Match Rate: ${totalMatches}/${totalTopics} = ${(totalMatches/totalTopics*100).toFixed(1)}%`);

  if (totalMatches / totalTopics < 0.8) {
    console.log('\n⚠️  WARNING: Match rate is still low! Issues:');
    console.log('   1. Check if identity bank topics are uppercase');
    console.log('   2. Verify normalization mapping is complete');
    console.log('   3. Check for spelling differences');
  } else {
    console.log('\n✅ Normalization is working correctly!');
  }
}

testMapping().catch(console.error);
