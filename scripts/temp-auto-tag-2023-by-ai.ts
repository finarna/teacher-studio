/**
 * AUTO-TAG 2023 NEET QUESTIONS BY AI CLASSIFICATION
 *
 * Since question numbers aren't available, we'll use AI to classify
 * each question into Physics/Chemistry/Botany/Zoology based on content.
 *
 * Pattern from properly tagged years:
 * - Each subject has exactly 50 questions
 * - Physics: numerical, formulas, units, circuits, waves
 * - Chemistry: molecules, reactions, elements, compounds
 * - Botany: plants, photosynthesis, tissues, reproduction
 * - Zoology: animals, human anatomy, genetics, evolution
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const SCAN_ID_2023 = 'e3767338-1664-4e03-b0f6-1fab41ff5838';

// Simple keyword-based classification (faster than AI)
function classifySubject(questionText: string): string {
  const text = questionText.toLowerCase();

  // Physics keywords
  const physicsKeywords = [
    'force', 'mass', 'velocity', 'acceleration', 'energy', 'power', 'circuit',
    'voltage', 'current', 'resistance', 'magnetic', 'electric', 'wave', 'frequency',
    'wavelength', 'photon', 'electron', 'nucleus', 'atom', 'quantum', 'momentum',
    'kinetic', 'potential', 'joule', 'watt', 'newton', 'coulomb', 'ampere',
    'capacitor', 'inductor', 'lens', 'mirror', 'refraction', 'diffraction'
  ];

  // Chemistry keywords
  const chemistryKeywords = [
    'molecule', 'compound', 'element', 'reaction', 'bond', 'ionic', 'covalent',
    'acid', 'base', 'salt', 'ph', 'oxidation', 'reduction', 'catalyst', 'mole',
    'molarity', 'alkane', 'alkene', 'benzene', 'alcohol', 'ether', 'aldehyde',
    'ketone', 'carboxylic', 'amine', 'polymer', 'isomer', 'electron configuration'
  ];

  // Botany keywords
  const botanyKeywords = [
    'plant', 'leaf', 'root', 'stem', 'flower', 'petal', 'sepal', 'stamen',
    'carpel', 'chlorophyll', 'photosynthesis', 'xylem', 'phloem', 'stomata',
    'guard cell', 'mesophyll', 'epidermis', 'cortex', 'pith', 'cambium',
    'meristem', 'parenchyma', 'collenchyma', 'sclerenchyma', 'gymnospe', 'angiospe',
    'monocot', 'dicot', 'legume', 'fabaceae', 'solanaceae'
  ];

  // Zoology keywords
  const zoologyKeywords = [
    'animal', 'vertebrate', 'mammal', 'bird', 'reptile', 'amphibian', 'fish',
    'digestion', 'stomach', 'intestine', 'liver', 'pancreas', 'kidney', 'nephron',
    'heart', 'blood', 'artery', 'vein', 'hemoglobin', 'rbc', 'wbc', 'platelet',
    'muscle', 'bone', 'cartilage', 'neuron', 'synapse', 'hormone', 'insulin',
    'testosterone', 'estrogen', 'mitosis', 'meiosis', 'gamete', 'zygote',
    'embryo', 'fetus', 'placenta', 'menstruation'
  ];

  let physicsScore = 0;
  let chemistryScore = 0;
  let botanyScore = 0;
  let zoologyScore = 0;

  for (const keyword of physicsKeywords) {
    if (text.includes(keyword)) physicsScore++;
  }
  for (const keyword of chemistryKeywords) {
    if (text.includes(keyword)) chemistryScore++;
  }
  for (const keyword of botanyKeywords) {
    if (text.includes(keyword)) botanyScore++;
  }
  for (const keyword of zoologyKeywords) {
    if (text.includes(keyword)) zoologyScore++;
  }

  // Return subject with highest score
  const scores = { Physics: physicsScore, Chemistry: chemistryScore, Botany: botanyScore, Zoology: zoologyScore };
  const maxScore = Math.max(physicsScore, chemistryScore, botanyScore, zoologyScore);

  if (maxScore === 0) return 'Unknown'; // No keywords matched

  for (const [subject, score] of Object.entries(scores)) {
    if (score === maxScore) return subject;
  }

  return 'Unknown';
}

async function autoTag2023Questions() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🤖 AUTO-TAGGING 2023 NEET QUESTIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Scan ID: ${SCAN_ID_2023}\n`);

  // Get all questions
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, subject')
    .eq('scan_id', SCAN_ID_2023);

  if (error || !questions) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`Found ${questions.length} questions to classify\n`);

  const classifications: Record<string, number> = {
    Physics: 0,
    Chemistry: 0,
    Botany: 0,
    Zoology: 0,
    Unknown: 0
  };

  const updates: Array<{ id: string; subject: string }> = [];

  // Classify all questions
  console.log('🔍 Classifying questions...\n');
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const classified = classifySubject(q.text);
    classifications[classified]++;
    updates.push({ id: q.id, subject: classified });

    if ((i + 1) % 20 === 0) {
      console.log(`   Processed ${i + 1}/${questions.length} questions...`);
    }
  }

  console.log(`\n✅ Classification complete!\n`);
  console.log('📊 RESULTS:');
  for (const [subject, count] of Object.entries(classifications)) {
    const expected = subject === 'Unknown' ? 0 : 50;
    const status = count === expected ? '✅' : count > 0 ? '⚠️' : '❌';
    console.log(`   ${subject}: ${count} ${status} (Expected: ${expected || 'N/A'})`);
  }

  console.log('\n⚠️  DRY RUN MODE - NOT UPDATING DATABASE');
  console.log('Review the classification above. If acceptable, uncomment update code below.\n');

  // UNCOMMENT TO ACTUALLY UPDATE:
  /*
  console.log('\n📝 Updating database...');
  let updated = 0;
  for (const update of updates) {
    if (update.subject === 'Unknown') continue; // Skip unknowns

    const { error: updateError } = await supabase
      .from('questions')
      .update({ subject: update.subject })
      .eq('id', update.id);

    if (!updateError) updated++;
  }
  console.log(`✅ Updated ${updated} questions`);
  */

  console.log('═══════════════════════════════════════════════════════════════\n');
}

autoTag2023Questions().catch(console.error);
