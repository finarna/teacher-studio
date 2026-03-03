import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function checkDuplicates() {
  const { data: patterns, error } = await supabase.from('exam_historical_patterns').select('*');
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  console.log('Exam Historical Patterns:');
  patterns.forEach(p => {
    console.log(`[${p.exam_context}] ${p.subject} ${p.year} (Marks: ${p.total_marks}, Hard: ${p.difficulty_hard_pct}%)`);
  });

  const { data: scans, error: scanError } = await supabase.from('scans').select('id, name, exam_context, subject, year, created_at, is_system_scan');
  if (scanError) {
    console.error('Scan Error:', scanError.message);
    return;
  }
  console.log('
Scans in system:');
  scans.forEach(s => {
    console.log(`[${s.exam_context}] ${s.subject} ${s.year} - ${s.name} (Created: ${s.created_at})`);
  });
}
checkDuplicates();
