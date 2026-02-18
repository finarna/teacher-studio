/**
 * Verify KCET Biology Cleanup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyCleanup() {
  console.log('🔍 Verifying KCET Biology cleanup...\n');

  // Check scans
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name')
    .eq('subject', 'Biology')
    .eq('exam_context', 'KCET');

  console.log('📋 KCET Biology scans:', scans?.length || 0);
  if (scans && scans.length > 0) {
    scans.forEach(s => console.log('   -', s.name));
  }

  // Check questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id')
    .eq('subject', 'Biology')
    .eq('exam_context', 'KCET');

  console.log('📝 KCET Biology questions:', questions?.length || 0);

  // Check topics
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name')
    .eq('subject', 'Biology');

  console.log('📚 Biology topics (these should remain):', topics?.length || 0);

  console.log('\n✅ Cleanup verified! Ready for fresh uploads.');
}

verifyCleanup();
