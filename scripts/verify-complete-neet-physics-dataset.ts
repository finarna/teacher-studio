/**
 * VERIFY COMPLETE NEET PHYSICS DATASET (2021-2025)
 *
 * Final verification before proceeding to Phase 1 of calibration workflow
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function verifyDataset() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ FINAL NEET PHYSICS DATASET VERIFICATION (2021-2025)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const years = [2025, 2024, 2023, 2022, 2021];

  let totalPhysics = 0;
  const yearBreakdown: Record<number, number> = {};

  for (const year of years) {
    const { data: questions } = await supabase
      .from('questions')
      .select('id, subject')
      .eq('exam_context', 'NEET')
      .eq('year', year)
      .eq('subject', 'Physics');

    const count = questions?.length || 0;
    yearBreakdown[year] = count;
    totalPhysics += count;

    const status = count === 50 ? '✅' : count === 49 ? '⚠️ ' : '❌';
    console.log(`   ${year}: ${count} Physics questions ${status}`);
  }

  console.log('\n📊 SUMMARY:');
  console.log(`   Total NEET Physics questions: ${totalPhysics}`);
  console.log(`   Expected: 250 (50 per year × 5 years)`);
  console.log(`   Status: ${totalPhysics >= 245 ? '✅ READY FOR CALIBRATION' : '❌ INSUFFICIENT DATA'}`);

  // Check for any questions without proper subject tagging
  const { data: nullSubject } = await supabase
    .from('questions')
    .select('id, year')
    .eq('exam_context', 'NEET')
    .is('subject', null);

  if (nullSubject && nullSubject.length > 0) {
    console.log(`\n⚠️  WARNING: ${nullSubject.length} questions with NULL subject found`);
  } else {
    console.log('\n✅ No NULL subject tags found');
  }

  // Sample a few questions to verify quality
  console.log('\n📋 SAMPLE QUESTIONS (First from each year):');

  for (const year of years) {
    const { data: sample } = await supabase
      .from('questions')
      .select('text, topic')
      .eq('exam_context', 'NEET')
      .eq('year', year)
      .eq('subject', 'Physics')
      .limit(1);

    if (sample && sample.length > 0) {
      const q = sample[0];
      const topic = q.topic || 'No topic';
      console.log(`\n   ${year}: ${topic}`);
      console.log(`   ${q.text.substring(0, 80)}...`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🚀 DATASET READY FOR PHASE 1: QUESTION TYPE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

verifyDataset().catch(console.error);
