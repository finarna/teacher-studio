import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTestAttempts() {
  console.log('🔍 CHECKING TEST_ATTEMPTS TABLE FOR FLAGSHIP PAPERS\n');

  const adminUserId = "13282202-5251-4c94-b5ef-95c273378262";

  // Check Biology test attempts
  const { data: bioAttempts } = await supabase
    .from('test_attempts')
    .select('id, test_name, subject, exam_context, total_questions, created_at, status')
    .eq('subject', 'Biology')
    .eq('exam_context', 'KCET')
    .eq('user_id', adminUserId)
    .gte('created_at', '2026-04-18')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('📊 BIOLOGY TEST_ATTEMPTS:');
  if (bioAttempts && bioAttempts.length > 0) {
    console.log(`   ✅ Found ${bioAttempts.length} Biology test attempt(s):\n`);
    for (const attempt of bioAttempts) {
      console.log(`   📄 ${attempt.test_name}`);
      console.log(`      ID: ${attempt.id}`);
      console.log(`      Questions: ${attempt.total_questions}`);
      console.log(`      Status: ${attempt.status}`);
      console.log(`      Created: ${new Date(attempt.created_at).toLocaleString()}`);
      console.log(`      UI Link: /practice/attempt/${attempt.id}\n`);
    }
  } else {
    console.log('   ❌ No Biology test attempts found\n');
  }

  // Check Chemistry test attempts
  const { data: chemAttempts } = await supabase
    .from('test_attempts')
    .select('id, test_name, subject, total_questions, created_at, status')
    .eq('subject', 'Chemistry')
    .eq('exam_context', 'KCET')
    .eq('user_id', adminUserId)
    .ilike('test_name', '%Flagship%')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('📊 CHEMISTRY TEST_ATTEMPTS:');
  if (chemAttempts && chemAttempts.length > 0) {
    console.log(`   ✅ Found ${chemAttempts.length} Chemistry test attempt(s):\n`);
    for (const attempt of chemAttempts) {
      console.log(`   📄 ${attempt.test_name}`);
      console.log(`      ID: ${attempt.id}`);
      console.log(`      Questions: ${attempt.total_questions}`);
      console.log(`      Status: ${attempt.status}`);
      console.log(`      Created: ${new Date(attempt.created_at).toLocaleString()}\n`);
    }
  } else {
    console.log('   ❌ No Chemistry test attempts found\n');
  }

  console.log('\n🔍 ANALYSIS:');
  console.log('If test_attempts records exist, then:');
  console.log('- The flagship papers ARE accessible in the UI');
  console.log('- They are accessed via /practice/attempt/{id}');
  console.log('- The custom_tests table is NOT used for this workflow\n');
}

checkTestAttempts().catch(console.error);
