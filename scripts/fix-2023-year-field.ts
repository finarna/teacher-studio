/**
 * FIX 2023 YEAR FIELD ON QUESTIONS
 *
 * The questions have proper subject tags but year field is NULL.
 * Need to set year=2023 on all questions in the 2023 scan.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const SCAN_ID_2023 = 'e3767338-1664-4e03-b0f6-1fab41ff5838';

async function fixYearField() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔧 FIXING 2023 YEAR FIELD');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Scan ID: ${SCAN_ID_2023}\n`);

  // Update all questions in this scan to have year=2023
  const { error } = await supabase
    .from('questions')
    .update({ year: 2023 })
    .eq('scan_id', SCAN_ID_2023);

  if (error) {
    console.error('❌ Error updating year field:', error);
    return;
  }

  console.log('✅ Successfully updated year field to 2023\n');

  // Verify
  const { data: questions } = await supabase
    .from('questions')
    .select('id, year, subject')
    .eq('scan_id', SCAN_ID_2023);

  console.log('📊 VERIFICATION:');
  console.log(`   Total questions: ${questions?.length || 0}`);

  if (questions) {
    const yearCounts: Record<string, number> = {};
    for (const q of questions) {
      const yr = q.year?.toString() || 'NULL';
      yearCounts[yr] = (yearCounts[yr] || 0) + 1;
    }

    for (const [yr, count] of Object.entries(yearCounts)) {
      const status = yr === '2023' ? '✅' : '❌';
      console.log(`   Year ${yr}: ${count} questions ${status}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

fixYearField().catch(console.error);
