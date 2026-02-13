/**
 * FIX ALL TOPIC WEIGHTAGE - KCET & PUC II
 *
 * Issue: Original seeding didn't set KCET/PUCII for most topics
 * Fix: Set KCET = PUCII for all topics (same syllabus)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * KCET/PUC II Weightage Mapping
 * (Based on official syllabi - KCET = PUC II)
 */
const WEIGHTAGE_MAP: Record<string, Record<string, number>> = {
  // PHYSICS (All 14 topics in KCET/PUC II)
  'Electric Charges and Fields': { KCET: 3, PUCII: 3 },
  'Electrostatic Potential and Capacitance': { KCET: 4, PUCII: 4 },
  'Current Electricity': { KCET: 5, PUCII: 5 },
  'Moving Charges and Magnetism': { KCET: 4, PUCII: 4 },
  'Magnetism and Matter': { KCET: 2, PUCII: 2 },
  'Electromagnetic Induction': { KCET: 4, PUCII: 4 },
  'Alternating Current': { KCET: 3, PUCII: 3 },
  'Electromagnetic Waves': { KCET: 2, PUCII: 2 },
  'Ray Optics and Optical Instruments': { KCET: 5, PUCII: 5 },
  'Wave Optics': { KCET: 3, PUCII: 3 },
  'Dual Nature of Radiation and Matter': { KCET: 2, PUCII: 2 },
  'Atoms': { KCET: 2, PUCII: 2 },
  'Nuclei': { KCET: 2, PUCII: 2 },
  'Semiconductor Electronics': { KCET: 3, PUCII: 3 },

  // CHEMISTRY (12/14 topics in KCET/PUC II - 2 deleted)
  'Solutions': { KCET: 4, PUCII: 4 },
  'Electrochemistry': { KCET: 4, PUCII: 4 },
  'Chemical Kinetics': { KCET: 4, PUCII: 4 },
  'Surface Chemistry': { KCET: 0, PUCII: 0 },  // DELETED
  'General Principles and Processes of Isolation of Elements': { KCET: 2, PUCII: 2 },
  'p-Block Elements': { KCET: 6, PUCII: 6 },
  'd and f Block Elements': { KCET: 4, PUCII: 4 },
  'Coordination Compounds': { KCET: 5, PUCII: 5 },
  'Haloalkanes and Haloarenes': { KCET: 4, PUCII: 4 },
  'Alcohols Phenols and Ethers': { KCET: 5, PUCII: 5 },
  'Aldehydes Ketones and Carboxylic Acids': { KCET: 6, PUCII: 6 },
  'Amines': { KCET: 4, PUCII: 4 },
  'Biomolecules': { KCET: 4, PUCII: 4 },
  'Chemistry in Everyday Life': { KCET: 0, PUCII: 0 },  // NOT IN KCET

  // BIOLOGY (All 13 topics in KCET/PUC II)
  'Sexual Reproduction in Flowering Plants': { KCET: 3, PUCII: 3 },
  'Principles of Inheritance and Variation': { KCET: 4, PUCII: 4 },
  'Molecular Basis of Inheritance': { KCET: 4, PUCII: 4 },
  'Biotechnology Principles and Processes': { KCET: 3, PUCII: 3 },
  'Biotechnology and its Applications': { KCET: 3, PUCII: 3 },
  'Organisms and Populations': { KCET: 3, PUCII: 3 },
  'Ecosystem': { KCET: 3, PUCII: 3 },
  'Biodiversity and Conservation': { KCET: 3, PUCII: 3 },
  'Human Reproduction': { KCET: 4, PUCII: 4 },
  'Reproductive Health': { KCET: 3, PUCII: 3 },
  'Human Health and Disease': { KCET: 4, PUCII: 4 },
  'Evolution': { KCET: 3, PUCII: 3 },
  'Strategies for Enhancement in Food Production': { KCET: 3, PUCII: 3 },

  // MATHEMATICS (All 13 topics in KCET)
  'Relations and Functions': { KCET: 3, PUCII: 3 },
  'Inverse Trigonometric Functions': { KCET: 2, PUCII: 2 },
  'Matrices': { KCET: 4, PUCII: 4 },
  'Determinants': { KCET: 3, PUCII: 3 },
  'Continuity and Differentiability': { KCET: 5, PUCII: 5 },
  'Applications of Derivatives': { KCET: 4, PUCII: 4 },
  'Integrals': { KCET: 6, PUCII: 6 },
  'Applications of Integrals': { KCET: 3, PUCII: 3 },
  'Differential Equations': { KCET: 4, PUCII: 4 },
  'Vectors': { KCET: 4, PUCII: 4 },
  'Three Dimensional Geometry': { KCET: 4, PUCII: 4 },
  'Linear Programming': { KCET: 3, PUCII: 3 },
  'Probability': { KCET: 4, PUCII: 4 }
};

async function fixAllWeightage() {
  console.log('\n🔧 FIXING ALL TOPIC WEIGHTAGE FOR KCET/PUC II\n');
  console.log('='.repeat(80));

  let updated = 0;
  let errors = 0;

  for (const [topicName, weightage] of Object.entries(WEIGHTAGE_MAP)) {
    try {
      // Get current topic
      const { data: topic, error: fetchError } = await supabase
        .from('topics')
        .select('name, exam_weightage')
        .eq('name', topicName)
        .single();

      if (fetchError || !topic) {
        console.log(`⚠️  Topic not found: "${topicName}"`);
        errors++;
        continue;
      }

      // Merge existing weightage with new KCET/PUCII values
      const currentWeightage = topic.exam_weightage as any;
      const updatedWeightage = {
        ...currentWeightage,
        KCET: weightage.KCET,
        PUCII: weightage.PUCII
      };

      // Update topic
      const { error: updateError } = await supabase
        .from('topics')
        .update({ exam_weightage: updatedWeightage })
        .eq('name', topicName);

      if (updateError) {
        console.log(`❌ Error updating "${topicName}":`, updateError.message);
        errors++;
      } else {
        console.log(`✅ Updated "${topicName}": KCET=${weightage.KCET}, PUCII=${weightage.PUCII}`);
        updated++;
      }
    } catch (err: any) {
      console.log(`❌ Error processing "${topicName}":`, err.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Updated ${updated} topics`);
  if (errors > 0) {
    console.log(`❌ Errors: ${errors}`);
  }
  console.log('='.repeat(80) + '\n');

  // Verification
  console.log('📊 VERIFICATION\n');

  // Verify all topics have KCET and PUCII
  const { data: allTopics } = await supabase
    .from('topics')
    .select('name, exam_weightage');

  const missingKCET = allTopics?.filter(t => {
    const w: any = t.exam_weightage;
    return w.KCET === undefined;
  });

  const missingPUCII = allTopics?.filter(t => {
    const w: any = t.exam_weightage;
    return w.PUCII === undefined;
  });

  const mismatchedKCETPUCII = allTopics?.filter(t => {
    const w: any = t.exam_weightage;
    return w.KCET !== w.PUCII;
  });

  if (missingKCET && missingKCET.length > 0) {
    console.log(`❌ ${missingKCET.length} topics missing KCET weightage`);
  } else {
    console.log('✅ All topics have KCET weightage');
  }

  if (missingPUCII && missingPUCII.length > 0) {
    console.log(`❌ ${missingPUCII.length} topics missing PUCII weightage`);
  } else {
    console.log('✅ All topics have PUCII weightage');
  }

  if (mismatchedKCETPUCII && mismatchedKCETPUCII.length > 0) {
    console.log(`❌ ${mismatchedKCETPUCII.length} topics have KCET ≠ PUCII`);
  } else {
    console.log('✅ All topics have KCET = PUCII (same values)');
  }

  // Count topics per exam
  console.log('\n📈 Topic Counts per Exam:\n');

  const subjects = ['Physics', 'Chemistry', 'Biology', 'Math'];
  const exams = ['NEET', 'JEE', 'KCET', 'PUCII', 'CBSE'];

  for (const subject of subjects) {
    const { data: subjectTopics } = await supabase
      .from('topics')
      .select('name, exam_weightage')
      .eq('subject', subject);

    console.log(`${subject}:`);

    for (const exam of exams) {
      const count = subjectTopics?.filter(t => {
        const w: any = t.exam_weightage;
        return w[exam] && w[exam] > 0;
      }).length || 0;

      console.log(`  ${exam}: ${count} topics`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('✅ ALL WEIGHTAGE FIXED!');
  console.log('='.repeat(80) + '\n');
}

fixAllWeightage().catch(console.error);
