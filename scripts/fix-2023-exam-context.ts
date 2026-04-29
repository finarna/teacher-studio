/**
 * FIX 2023 EXAM_CONTEXT FIELD
 *
 * Set exam_context='NEET' on all 200 questions in the 2023 scan.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const SCAN_ID_2023 = 'e3767338-1664-4e03-b0f6-1fab41ff5838';

async function fixExamContext() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔧 FIXING 2023 EXAM_CONTEXT FIELD');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Scan ID: ${SCAN_ID_2023}\n`);

  // Update all questions in this scan to have exam_context='NEET'
  const { error } = await supabase
    .from('questions')
    .update({ exam_context: 'NEET' })
    .eq('scan_id', SCAN_ID_2023);

  if (error) {
    console.error('❌ Error updating exam_context field:', error);
    return;
  }

  console.log('✅ Successfully updated exam_context field to NEET\n');

  // Verify
  const { data: questions } = await supabase
    .from('questions')
    .select('id, year, subject, exam_context')
    .eq('scan_id', SCAN_ID_2023)
    .limit(5);

  console.log('📊 VERIFICATION (sample):');
  for (const q of questions || []) {
    console.log(`   Year: ${q.year}, Subject: ${q.subject}, Exam: ${q.exam_context} ✅`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

fixExamContext().catch(console.error);
