import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const scanId = '48aff221-8677-43fb-b018-1eb5417e653c';

const { data: scan, error } = await supabase
  .from('scans')
  .select('id, subject, exam_context, year, created_at')
  .eq('id', scanId)
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log('Scan Details:');
  console.log('  Subject:', scan.subject);
  console.log('  Exam:', scan.exam_context);
  console.log('  Year field:', scan.year);
  console.log('  Created:', scan.created_at);
}

// Check all Biology KCET scans
const { data: allScans } = await supabase
  .from('scans')
  .select('id, year, is_system_scan, created_at')
  .eq('subject', 'Biology')
  .eq('exam_context', 'KCET')
  .not('year', 'is', null)
  .order('year', { ascending: false });

console.log(`\nAll Biology KCET scans with year field (${allScans?.length || 0}):`);
allScans?.forEach(s => {
  const marker = s.id === scanId ? ' ← YOUR SCAN' : '';
  const systemTag = s.is_system_scan ? ' [PUBLISHED]' : '';
  console.log(`  - Year ${s.year}${systemTag} (${s.id.substring(0, 8)}...)${marker}`);
});
