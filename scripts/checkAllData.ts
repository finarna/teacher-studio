import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

  console.log('=== CHECKING ALL DATA ===\n');

  // Check scans
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, created_at')
    .eq('user_id', userId);

  console.log(`📊 Scans in Supabase: ${scans?.length || 0}`);
  if (scans && scans.length > 0) {
    const bySubject: Record<string, number> = {};
    scans.forEach(s => {
      const key = `${s.subject} (${s.exam_context})`;
      bySubject[key] = (bySubject[key] || 0) + 1;
    });
    Object.entries(bySubject).forEach(([key, count]) => {
      console.log(`  ✅ ${key}: ${count} scans`);
    });
  }

  // Check questions
  const { data: questions } = await supabase
    .from('questions')
    .select('scan_id, subject, topic, exam_context')
    .eq('user_id', userId);

  console.log(`\n❓ Questions in Supabase: ${questions?.length || 0}`);
  if (questions && questions.length > 0) {
    const bySubject: Record<string, number> = {};
    questions.forEach(q => {
      const key = `${q.subject} (${q.exam_context})`;
      bySubject[key] = (bySubject[key] || 0) + 1;
    });
    Object.entries(bySubject).forEach(([key, count]) => {
      console.log(`  ✅ ${key}: ${count} questions`);
    });
  }

  console.log('\n=== DIAGNOSIS ===');
  if (scans && scans.length > 0) {
    console.log('✅ Scans exist in Supabase');
  } else {
    console.log('❌ NO scans in Supabase');
  }

  if (questions && questions.length > 0) {
    console.log('✅ Questions exist in Supabase');
  } else {
    console.log('❌ NO questions in Supabase');
  }
}

checkData().catch(console.error);
