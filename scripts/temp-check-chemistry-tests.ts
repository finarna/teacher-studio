import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkChemistryTests() {
  console.log('🔍 CHECKING CHEMISTRY FLAGSHIP TESTS\n');

  // Check Chemistry custom_tests
  const { data: chemTests } = await supabase
    .from('custom_tests')
    .select('id, test_name, question_count, created_at, user_id')
    .eq('subject', 'Chemistry')
    .eq('exam_context', 'KCET')
    .ilike('test_name', '%2026 Flagship%')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('📊 CHEMISTRY TESTS:');
  if (chemTests && chemTests.length > 0) {
    console.log(`   ✅ Found ${chemTests.length} Chemistry Flagship test(s):\n`);
    for (const test of chemTests) {
      console.log(`   📄 ${test.test_name}`);
      console.log(`      Test ID: ${test.id}`);
      console.log(`      User ID: ${test.user_id}`);
      console.log(`      Questions: ${test.question_count}`);
      console.log(`      Created: ${new Date(test.created_at).toLocaleString()}`);
      console.log(`      UI Link: /practice/custom/${test.id}\n`);
    }
  } else {
    console.log('   ❌ No Chemistry tests found\n');
  }

  // Check Physics tests
  const { data: physTests } = await supabase
    .from('custom_tests')
    .select('id, test_name, question_count, created_at')
    .eq('subject', 'Physics')
    .eq('exam_context', 'KCET')
    .ilike('test_name', '%2026 Flagship%')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('📊 PHYSICS TESTS:');
  if (physTests && physTests.length > 0) {
    console.log(`   ✅ Found ${physTests.length} Physics Flagship test(s):\n`);
    for (const test of physTests) {
      console.log(`   📄 ${test.test_name}`);
      console.log(`      Test ID: ${test.id}`);
      console.log(`      Questions: ${test.question_count}`);
      console.log(`      Created: ${new Date(test.created_at).toLocaleString()}\n`);
    }
  } else {
    console.log('   ❌ No Physics tests found\n');
  }

  // Check Math tests
  const { data: mathTests } = await supabase
    .from('custom_tests')
    .select('id, test_name, question_count, created_at')
    .eq('subject', 'Math')
    .eq('exam_context', 'KCET')
    .ilike('test_name', '%2026 Flagship%')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('📊 MATH TESTS:');
  if (mathTests && mathTests.length > 0) {
    console.log(`   ✅ Found ${mathTests.length} Math Flagship test(s):\n`);
    for (const test of mathTests) {
      console.log(`   📄 ${test.test_name}`);
      console.log(`      Test ID: ${test.id}`);
      console.log(`      Questions: ${test.question_count}`);
      console.log(`      Created: ${new Date(test.created_at).toLocaleString()}\n`);
    }
  } else {
    console.log('   ❌ No Math tests found\n');
  }

  console.log('\n🔍 CONCLUSION:');
  console.log('If Chemistry/Physics/Math flagship tests exist but Biology does not,');
  console.log('then the issue is specific to Biology generation.');
  console.log('If NO flagship tests exist for ANY subject, then the createCustomTest()');
  console.log('function may not be creating the test records properly.\n');
}

checkChemistryTests().catch(console.error);
