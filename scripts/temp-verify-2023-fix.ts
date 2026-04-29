import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function verify2023() {
  console.log('🔍 Checking 2023 NEET scan...\n');

  const SCAN_ID = 'e3767338-1664-4e03-b0f6-1fab41ff5838';

  // Check scan details
  const { data: scan } = await supabase
    .from('scans')
    .select('id, name, year, is_system_scan, subjects')
    .eq('id', SCAN_ID)
    .single();

  console.log('📄 SCAN:', scan);

  // Check questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, subject, year')
    .eq('scan_id', SCAN_ID);

  console.log(`\nTotal questions: ${questions?.length || 0}`);

  if (questions) {
    const subjectCounts: Record<string, number> = {};
    for (const q of questions) {
      const subj = q.subject || 'NULL';
      subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
    }

    console.log('\nSubject breakdown:');
    for (const [subj, count] of Object.entries(subjectCounts)) {
      console.log(`   ${subj}: ${count}`);
    }

    console.log('\nYear values in questions:');
    const yearCounts: Record<string, number> = {};
    for (const q of questions) {
      const yr = q.year?.toString() || 'NULL';
      yearCounts[yr] = (yearCounts[yr] || 0) + 1;
    }
    for (const [yr, count] of Object.entries(yearCounts)) {
      console.log(`   ${yr}: ${count}`);
    }
  }

  // Also check if questions exist by year filter
  console.log('\n\nCHECKING BY YEAR FILTER:');
  const { data: byYear } = await supabase
    .from('questions')
    .select('id, subject')
    .eq('year', 2023)
    .eq('exam_context', 'NEET');

  console.log(`Questions with year=2023 and exam_context=NEET: ${byYear?.length || 0}`);
}

verify2023().catch(console.error);
