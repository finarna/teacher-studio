/**
 * Final Topic Cleanup - Fix remaining issues
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

// Additional topic normalizations
const ADDITIONAL_FIXES: Record<string, string> = {
  'Electromagnetic Waves': 'ELECTROMAGNETIC WAVES',
  'Kinetic Theory of Gases': 'KINETIC THEORY OF GASES',
  'Work, Energy, and Power': 'WORK, ENERGY, AND POWER',
  'Motion in a Plane (Uniform Circular Motion)': 'KINEMATICS',
  'Laws of Motion - Circular Motion': 'LAWS OF MOTION',
  'Mechanical Properties of Solids and Thermal Properties of Matter': 'PROPERTIES OF SOLIDS AND LIQUIDS',
};

// Chemistry topics that shouldn't be in Physics
const CHEMISTRY_TOPICS = [
  'The d-and f-Block Elements',
  'Chemical Equilibrium',
  'Chemical Bonding and Molecular Structure',
  'Aldehydes, Ketones and Carboxylic Acids',
];

async function finalCleanup() {
  console.log('\n🔧 Final Topic Cleanup');
  console.log('='.repeat(80));

  for (const [year, scanId] of Object.entries(OFFICIAL_SCANS)) {
    console.log(`\n📅 Year ${year}:`);

    // 1. Fix additional topic normalizations
    for (const [oldTopic, newTopic] of Object.entries(ADDITIONAL_FIXES)) {
      const { data: questions } = await supabase
        .from('questions')
        .select('id')
        .eq('scan_id', scanId)
        .eq('subject', 'Physics')
        .eq('topic', oldTopic);

      if (questions && questions.length > 0) {
        console.log(`   🔧 Fixing "${oldTopic}" → "${newTopic}" (${questions.length} questions)`);

        for (const q of questions) {
          await supabase
            .from('questions')
            .update({ topic: newTopic })
            .eq('id', q.id);
        }
      }
    }

    // 2. Find Chemistry topics in Physics questions
    const { data: chemInPhysics } = await supabase
      .from('questions')
      .select('id, question_order, topic')
      .eq('scan_id', scanId)
      .eq('subject', 'Physics')
      .in('topic', CHEMISTRY_TOPICS);

    if (chemInPhysics && chemInPhysics.length > 0) {
      console.log(`   ⚠️  Found ${chemInPhysics.length} Chemistry topics in Physics:`);
      for (const q of chemInPhysics) {
        console.log(`      Q${q.question_order}: ${q.topic} → will be marked as Chemistry`);

        // Update subject to Chemistry
        await supabase
          .from('questions')
          .update({ subject: 'Chemistry' })
          .eq('id', q.id);
      }
    }

    // 3. Verify final state
    const { data: physicsQuestions } = await supabase
      .from('questions')
      .select('topic')
      .eq('scan_id', scanId)
      .eq('subject', 'Physics');

    if (physicsQuestions) {
      const uniqueTopics = new Set(physicsQuestions.map(q => q.topic).filter(Boolean));
      console.log(`   ✅ Final: ${physicsQuestions.length} Physics questions, ${uniqueTopics.size} unique topics`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Final Cleanup Complete\n');
}

finalCleanup().catch(console.error);
