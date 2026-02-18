/**
 * Update Biology Topics with KCET Weightages
 *
 * Adds KCET exam weightages to all Biology topics so they appear in Learning Journey
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// KCET Biology weightages based on official syllabus
// Total: 60 questions, distributed across 12 topics
const KCET_WEIGHTAGES = {
  'Sexual Reproduction in Flowering Plants': 8,  // Botany - Important
  'Principles of Inheritance and Variation': 10, // Genetics - Very important
  'Molecular Basis of Inheritance': 10,          // Genetics - Very important
  'Biotechnology Principles and Processes': 8,   // Biotechnology
  'Biotechnology and its Applications': 6,       // Biotechnology
  'Organisms and Populations': 6,                // Ecology
  'Ecosystem': 8,                                // Ecology - Important
  'Biodiversity and Conservation': 6,            // Ecology
  'Human Reproduction': 10,                      // Zoology - Very important
  'Reproductive Health': 5,                      // Zoology
  'Human Health and Disease': 10,                // Zoology - Very important
  'Microbes in Human Welfare': 4,               // Already configured
  'Evolution': 4                                 // Already configured
};

async function updateBiologyWeightages() {
  console.log('🔧 Updating Biology KCET Weightages...\n');

  // Get all Biology topics
  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, name, subject, exam_weightage')
    .eq('subject', 'Biology');

  if (error) {
    console.error('❌ Error fetching topics:', error);
    return;
  }

  if (!topics || topics.length === 0) {
    console.log('⚠️  No Biology topics found');
    return;
  }

  console.log(`Found ${topics.length} Biology topics\n`);

  let updated = 0;
  let skipped = 0;

  for (const topic of topics) {
    const kcetWeightage = KCET_WEIGHTAGES[topic.name];

    if (!kcetWeightage) {
      console.log(`⚠️  No KCET weightage defined for: ${topic.name}`);
      skipped++;
      continue;
    }

    const currentKCET = topic.exam_weightage?.KCET || 0;

    if (currentKCET === kcetWeightage) {
      console.log(`✅ ${topic.name}: Already set to ${kcetWeightage}%`);
      skipped++;
      continue;
    }

    // Update the weightage
    const newWeightage = {
      ...topic.exam_weightage,
      KCET: kcetWeightage
    };

    const { error: updateError } = await supabase
      .from('topics')
      .update({ exam_weightage: newWeightage })
      .eq('id', topic.id);

    if (updateError) {
      console.error(`❌ Error updating ${topic.name}:`, updateError.message);
    } else {
      console.log(`✅ ${topic.name}: ${currentKCET}% → ${kcetWeightage}%`);
      updated++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log(`   Updated: ${updated} topics`);
  console.log(`   Skipped: ${skipped} topics (already correct or undefined)`);
  console.log('='.repeat(60));

  // Verify
  console.log('\n🔍 Verifying...');
  const { data: verifyTopics } = await supabase
    .from('topics')
    .select('name, exam_weightage')
    .eq('subject', 'Biology');

  const withKCET = verifyTopics?.filter(t => t.exam_weightage?.KCET > 0) || [];
  console.log(`✅ ${withKCET.length}/13 Biology topics now have KCET weightage\n`);

  if (withKCET.length > 0) {
    console.log('Topics configured for KCET:');
    withKCET
      .sort((a, b) => (b.exam_weightage?.KCET || 0) - (a.exam_weightage?.KCET || 0))
      .forEach(t => {
        console.log(`  - ${t.name}: ${t.exam_weightage?.KCET}%`);
      });
  }
}

updateBiologyWeightages();
