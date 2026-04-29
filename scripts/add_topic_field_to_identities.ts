/**
 * Add NCERT Topic Field to Identity Banks
 *
 * This script adds the "topic" field to identity banks to align
 * with NCERT chapter taxonomy (for topic accuracy in calibration).
 *
 * Usage:
 *   bun run scripts/add_topic_field_to_identities.ts <subject>
 *
 * Examples:
 *   bun run scripts/add_topic_field_to_identities.ts physics
 *   bun run scripts/add_topic_field_to_identities.ts chemistry
 *   bun run scripts/add_topic_field_to_identities.ts biology
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// NCERT Topic Mappings (Identity Name Pattern → NCERT Chapter)
const TOPIC_MAPPINGS = {
  physics: {
    'Dimensional Analysis': 'Units and Measurements',
    'Units and Measurements': 'Units and Measurements',
    'Current Electricity': 'Current Electricity',
    'Capacitance': 'Electrostatic Potential and Capacitance',
    'Electrostatic Potential': 'Electrostatic Potential and Capacitance',
    'Semiconductor': 'Semiconductor Electronics: Materials, Devices and Simple Circuits',
    'Ray Optics': 'Ray Optics and Optical Instruments',
    'Optical Instruments': 'Ray Optics and Optical Instruments',
    'Magnetism': 'Moving Charges and Magnetism',
    'Moving Charges': 'Moving Charges and Magnetism',
    'AC Circuits': 'Alternating Current',
    'Alternating Current': 'Alternating Current',
    'Rotational Motion': 'System of Particles and Rotational Motion',
    'System of Particles': 'System of Particles and Rotational Motion',
    'Photoelectric Effect': 'Dual Nature of Radiation and Matter',
    'Dual Nature': 'Dual Nature of Radiation and Matter',
    'Electromagnetic Waves': 'Electromagnetic Waves',
    'Electrostatics': 'Electric Charges and Fields',
    'Electric Charges': 'Electric Charges and Fields',
    'Gauss': 'Electric Charges and Fields',
    'Wave Optics': 'Wave Optics',
    'Interference': 'Wave Optics',
    'Diffraction': 'Wave Optics',
    'Polarization': 'Wave Optics',
    'Thermodynamics': 'Thermodynamics',
    'Modern Physics': 'Atoms',
    'Atomic Models': 'Atoms',
    'Bohr': 'Atoms',
    'Gravitation': 'Gravitation',
    'Orbital': 'Gravitation',
    'SHM': 'Oscillations',
    'Oscillations': 'Oscillations',
    'Electromagnetic Induction': 'Electromagnetic Induction',
    'Faraday': 'Electromagnetic Induction',
    'Kinetic Theory': 'Kinetic Theory of Gases',
    'Gas Laws': 'Kinetic Theory of Gases',
    'Work-Energy': 'Work, Energy and Power',
    'Work, Energy': 'Work, Energy and Power',
    'Collision': 'Work, Energy and Power',
    'Nuclear Physics': 'Nuclei',
    'Radioactive': 'Nuclei',
    'Communication Systems': 'Communication Systems',
    'Modulation': 'Communication Systems',
    'Fluid Mechanics': 'Mechanical Properties of Fluids',
    'Bernoulli': 'Mechanical Properties of Fluids',
    'Thermal Properties': 'Thermal Properties of Matter',
    'Heat Transfer': 'Thermal Properties of Matter',
    'Waves': 'Waves',
    'Sound': 'Waves',
    'Doppler': 'Waves',
    'Magnetic Materials': 'Magnetism and Matter',
    'Hysteresis': 'Magnetism and Matter',
    'Kinematics': 'Motion in a Straight Line',
    'Projectile': 'Motion in a Plane',
    'Circular Motion': 'Motion in a Plane',
    'Motion in a Plane': 'Motion in a Plane',
    'Motion in a Straight Line': 'Motion in a Straight Line',
    'Laws of Motion': 'Laws of Motion',
    'Resolution': 'Ray Optics and Optical Instruments',
    'Rayleigh': 'Ray Optics and Optical Instruments'
  },

  chemistry: {
    'Atomic Structure': 'Structure of Atom',
    'Periodic Table': 'Classification of Elements and Periodicity in Properties',
    'Chemical Bonding': 'Chemical Bonding and Molecular Structure',
    'States of Matter': 'States of Matter: Gases and Liquids',
    'Thermodynamics': 'Thermodynamics',
    'Equilibrium': 'Equilibrium',
    'Redox Reactions': 'Redox Reactions',
    'Hydrogen': 'Hydrogen',
    's-Block': 's-Block Elements',
    'p-Block': 'p-Block Elements',
    'd-Block': 'd and f Block Elements',
    'Coordination': 'Coordination Compounds',
    'Organic Chemistry': 'Organic Chemistry - Some Basic Principles and Techniques',
    'Hydrocarbons': 'Hydrocarbons',
    'Haloalkanes': 'Haloalkanes and Haloarenes',
    'Alcohols': 'Alcohols, Phenols and Ethers',
    'Aldehydes': 'Aldehydes, Ketones and Carboxylic Acids',
    'Amines': 'Amines',
    'Biomolecules': 'Biomolecules',
    'Polymers': 'Polymers',
    'Environmental': 'Chemistry in Everyday Life'
  },

  biology: {
    'Cell Structure': 'Cell: The Unit of Life',
    'Biomolecules': 'Biomolecules',
    'Cell Cycle': 'Cell Cycle and Cell Division',
    'Photosynthesis': 'Photosynthesis in Higher Plants',
    'Respiration': 'Respiration in Plants',
    'Plant Growth': 'Plant Growth and Development',
    'Digestion': 'Digestion and Absorption',
    'Breathing': 'Breathing and Exchange of Gases',
    'Body Fluids': 'Body Fluids and Circulation',
    'Excretion': 'Excretory Products and their Elimination',
    'Locomotion': 'Locomotion and Movement',
    'Neural Control': 'Neural Control and Coordination',
    'Chemical Coordination': 'Chemical Coordination and Integration',
    'Reproduction': 'Reproduction in Organisms',
    'Sexual Reproduction': 'Sexual Reproduction in Flowering Plants',
    'Human Reproduction': 'Human Reproduction',
    'Reproductive Health': 'Reproductive Health',
    'Heredity': 'Principles of Inheritance and Variation',
    'Molecular Basis': 'Molecular Basis of Inheritance',
    'Evolution': 'Evolution',
    'Human Health': 'Human Health and Disease',
    'Microbes': 'Microbes in Human Welfare',
    'Biotechnology': 'Biotechnology: Principles and Processes',
    'Biotechnology Applications': 'Biotechnology and its Applications',
    'Organisms': 'Organisms and Populations',
    'Ecosystem': 'Ecosystem',
    'Biodiversity': 'Biodiversity and Conservation',
    'Environmental Issues': 'Environmental Issues'
  }
};

function findMatchingTopic(identityName: string, subject: string): string | null {
  const mappings = TOPIC_MAPPINGS[subject as keyof typeof TOPIC_MAPPINGS];
  if (!mappings) return null;

  // Try exact matches first
  for (const [pattern, topic] of Object.entries(mappings)) {
    if (identityName.toLowerCase().includes(pattern.toLowerCase())) {
      return topic;
    }
  }

  return null;
}

function addTopicFieldToIdentities(subject: string, dryRun: boolean = false) {
  const identityPath = path.join(__dirname, `../lib/oracle/identities/neet_${subject}.json`);

  if (!fs.existsSync(identityPath)) {
    console.error(`❌ Identity file not found: ${identityPath}`);
    console.log(`\nAvailable files:`);
    const dir = path.join(__dirname, '../lib/oracle/identities');
    fs.readdirSync(dir).forEach(file => console.log(`   - ${file}`));
    process.exit(1);
  }

  console.log(`📂 Reading identity file: ${identityPath}`);
  const identityBank = JSON.parse(fs.readFileSync(identityPath, 'utf-8'));

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  console.log(`\n🔍 Processing ${identityBank.identities.length} identities...\n`);

  identityBank.identities.forEach((identity: any, idx: number) => {
    const hasTopicField = identity.hasOwnProperty('topic');

    if (hasTopicField && !dryRun) {
      console.log(`   ${idx + 1}. ${identity.id}: ⏭️  Already has topic="${identity.topic}"`);
      skipped++;
      return;
    }

    const matchedTopic = findMatchingTopic(identity.name, subject);

    if (matchedTopic) {
      if (!dryRun) {
        identity.topic = matchedTopic;
      }
      console.log(`   ${idx + 1}. ${identity.id}: ✅ "${identity.name}" → "${matchedTopic}"`);
      updated++;
    } else {
      console.log(`   ${idx + 1}. ${identity.id}: ⚠️  No mapping found for "${identity.name}"`);
      notFound++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped (already has topic): ${skipped}`);
  console.log(`   ⚠️  No mapping found: ${notFound}`);
  console.log(`   📝 Total: ${identityBank.identities.length}`);

  if (notFound > 0) {
    console.log(`\n⚠️  WARNING: ${notFound} identities have no topic mapping!`);
    console.log(`   Add mappings to TOPIC_MAPPINGS.${subject} in this script.`);
  }

  if (!dryRun) {
    const backupPath = identityPath.replace('.json', '_backup_before_topic.json');
    fs.writeFileSync(backupPath, JSON.stringify(identityBank, null, 2));
    console.log(`\n💾 Backup saved: ${backupPath}`);

    fs.writeFileSync(identityPath, JSON.stringify(identityBank, null, 2));
    console.log(`✅ Updated identity file: ${identityPath}`);
  } else {
    console.log(`\n🔍 DRY RUN - No changes written to file`);
  }
}

// Main execution
const args = process.argv.slice(2);
const subject = args[0];
const dryRun = args.includes('--dry-run');

if (!subject) {
  console.log(`Usage: bun run scripts/add_topic_field_to_identities.ts <subject> [--dry-run]

Subjects:
  - physics
  - chemistry
  - biology

Options:
  --dry-run    Preview changes without writing to file

Examples:
  bun run scripts/add_topic_field_to_identities.ts physics
  bun run scripts/add_topic_field_to_identities.ts chemistry --dry-run
`);
  process.exit(1);
}

if (!['physics', 'chemistry', 'biology'].includes(subject)) {
  console.error(`❌ Invalid subject: ${subject}`);
  console.log(`   Valid subjects: physics, chemistry, biology`);
  process.exit(1);
}

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Add NCERT Topic Field to Identity Banks                      ║
║  Subject: ${subject.toUpperCase().padEnd(51)}║
║  Mode: ${(dryRun ? 'DRY RUN (preview only)' : 'LIVE (will update file)').padEnd(54)}║
╚════════════════════════════════════════════════════════════════╝
`);

addTopicFieldToIdentities(subject, dryRun);

console.log(`\n✅ Done!\n`);
