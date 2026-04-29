import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function check() {
  console.log('🔍 Checking 2023 exam_context field...\n');

  const SCAN_ID = 'e3767338-1664-4e03-b0f6-1fab41ff5838';

  const { data: questions } = await supabase
    .from('questions')
    .select('id, year, subject, exam_context')
    .eq('scan_id', SCAN_ID)
    .limit(10);

  console.log('Sample of 2023 questions:');
  for (const q of questions || []) {
    console.log(`   Year: ${q.year || 'NULL'}, Subject: ${q.subject || 'NULL'}, Exam: ${q.exam_context || 'NULL'}`);
  }

  // Count by exam_context
  const { data: all } = await supabase
    .from('questions')
    .select('exam_context')
    .eq('scan_id', SCAN_ID);

  const contextCounts: Record<string, number> = {};
  for (const q of all || []) {
    const ctx = q.exam_context || 'NULL';
    contextCounts[ctx] = (contextCounts[ctx] || 0) + 1;
  }

  console.log('\nExam context distribution:');
  for (const [ctx, count] of Object.entries(contextCounts)) {
    console.log(`   ${ctx}: ${count}`);
  }
}

check().catch(console.error);
