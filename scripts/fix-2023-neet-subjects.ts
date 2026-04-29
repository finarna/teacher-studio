/**
 * FIX 2023 NEET SUBJECT TAGGING
 *
 * NEET Combined Paper Structure (ALWAYS the same):
 * - Questions 1-50:   Physics
 * - Questions 51-100: Chemistry
 * - Questions 101-150: Botany
 * - Questions 151-200: Zoology
 *
 * Since we have exactly 200 questions, we'll tag them in order.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const SCAN_ID_2023 = 'e3767338-1664-4e03-b0f6-1fab41ff5838';

async function fix2023Subjects() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔧 FIXING 2023 NEET SUBJECT TAGS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Scan ID: ${SCAN_ID_2023}\n`);
  console.log('NEET Standard Structure:');
  console.log('   Q1-50:   Physics');
  console.log('   Q51-100: Chemistry');
  console.log('   Q101-150: Botany');
  console.log('   Q151-200: Zoology\n');

  // Get all questions ordered by creation (insertion order should match PDF order)
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, subject, created_at')
    .eq('scan_id', SCAN_ID_2023)
    .order('created_at', { ascending: true }); // Assuming inserted in order

  if (error || !questions) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`Found ${questions.length} questions\n`);

  if (questions.length !== 200) {
    console.error(`❌ ERROR: Expected exactly 200 questions, found ${questions.length}`);
    return;
  }

  // Assign subjects based on position
  const updates: Array<{ id: string; subject: string; position: number }> = [];

  for (let i = 0; i < questions.length; i++) {
    const position = i + 1;
    let subject: string;

    if (position <= 50) {
      subject = 'Physics';
    } else if (position <= 100) {
      subject = 'Chemistry';
    } else if (position <= 150) {
      subject = 'Botany';
    } else {
      subject = 'Zoology';
    }

    updates.push({
      id: questions[i].id,
      subject,
      position
    });
  }

  // Show sample
  console.log('📋 SAMPLE ASSIGNMENTS:\n');
  console.log(`Q1   (${updates[0].id.substring(0, 8)}...): ${updates[0].subject}`);
  console.log(`Q25  (${updates[24].id.substring(0, 8)}...): ${updates[24].subject}`);
  console.log(`Q50  (${updates[49].id.substring(0, 8)}...): ${updates[49].subject}`);
  console.log(`Q51  (${updates[50].id.substring(0, 8)}...): ${updates[50].subject}`);
  console.log(`Q75  (${updates[74].id.substring(0, 8)}...): ${updates[74].subject}`);
  console.log(`Q100 (${updates[99].id.substring(0, 8)}...): ${updates[99].subject}`);
  console.log(`Q101 (${updates[100].id.substring(0, 8)}...): ${updates[100].subject}`);
  console.log(`Q125 (${updates[124].id.substring(0, 8)}...): ${updates[124].subject}`);
  console.log(`Q150 (${updates[149].id.substring(0, 8)}...): ${updates[149].subject}`);
  console.log(`Q151 (${updates[150].id.substring(0, 8)}...): ${updates[150].subject}`);
  console.log(`Q175 (${updates[174].id.substring(0, 8)}...): ${updates[174].subject}`);
  console.log(`Q200 (${updates[199].id.substring(0, 8)}...): ${updates[199].subject}`);

  console.log('\n📊 DISTRIBUTION:');
  const counts = { Physics: 0, Chemistry: 0, Botany: 0, Zoology: 0 };
  for (const update of updates) {
    counts[update.subject]++;
  }
  console.log(`   Physics:   ${counts.Physics}`);
  console.log(`   Chemistry: ${counts.Chemistry}`);
  console.log(`   Botany:    ${counts.Botany}`);
  console.log(`   Zoology:   ${counts.Zoology}`);

  console.log('\n🚀 APPLYING UPDATES...\n');

  let updated = 0;
  let failed = 0;

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('questions')
      .update({ subject: update.subject })
      .eq('id', update.id);

    if (updateError) {
      console.error(`   ❌ Failed Q${update.position}: ${updateError.message}`);
      failed++;
    } else {
      updated++;
      if (updated % 50 === 0) {
        console.log(`   ✅ Updated ${updated}/200 questions...`);
      }
    }
  }

  console.log(`\n✅ COMPLETE!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed:  ${failed}\n`);

  console.log('═══════════════════════════════════════════════════════════════\n');
}

fix2023Subjects().catch(console.error);
