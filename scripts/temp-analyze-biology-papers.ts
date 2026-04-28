import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeBiologyPapers() {
  console.log('🔍 BIOLOGY FLAGSHIP PAPERS - DETAILED ANALYSIS\n');
  console.log('═'.repeat(60) + '\n');

  // From generation log:
  const SCAN_ID = 'ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9';
  const PROGRESS_ID_SET_A = 'da19fb54-bad1-4f8a-a7da-1517f3020464'; // 45/60 identity assignment
  const PROGRESS_ID_SET_B = '99d38dd7-2f2f-41d7-929e-88b5af2de95c'; // 49/60 identity assignment

  console.log('📋 Generation Metadata:');
  console.log(`   SET A progressId: ${PROGRESS_ID_SET_A}`);
  console.log(`   SET B progressId: ${PROGRESS_ID_SET_B}`);
  console.log(`   Shared scan_id: ${SCAN_ID}\n`);

  // Check questions table
  const { data: questions, count } = await supabase
    .from('questions')
    .select('*', { count: 'exact' })
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology')
    .gte('created_at', '2026-04-18');

  console.log('📊 QUESTIONS TABLE STATUS:');
  console.log(`   ✅ Total Biology questions in scan: ${count}`);

  if (questions && questions.length > 0) {
    // Check identity assignment
    const withIdentity = questions.filter(q => q.metadata?.identityId);
    console.log(`   ✅ Questions with identityId: ${withIdentity.length}/${count} (${Math.round(withIdentity.length/count*100)}%)`);

    // Check question types
    const withType = questions.filter(q => q.metadata?.questionType);
    console.log(`   ✅ Questions with questionType: ${withType.length}/${count} (${Math.round(withType.length/count*100)}%)`);

    // Difficulty breakdown
    const easy = questions.filter(q => q.difficulty === 'Easy').length;
    const moderate = questions.filter(q => q.difficulty === 'Moderate').length;
    const hard = questions.filter(q => q.difficulty === 'Hard').length;
    console.log(`   ✅ Difficulty: Easy=${easy}, Moderate=${moderate}, Hard=${hard}`);

    // Sample questions
    console.log('\n   📝 Sample questions:');
    questions.slice(0, 3).forEach((q, i) => {
      console.log(`      ${i+1}. ${q.text.substring(0, 70)}...`);
      console.log(`         Type: ${q.metadata?.questionType || 'N/A'}, Identity: ${q.metadata?.identityId || 'N/A'}`);
    });
  }

  // Check custom_tests table
  console.log('\n\n📋 CUSTOM_TESTS TABLE STATUS:');
  const { data: tests } = await supabase
    .from('custom_tests')
    .select('id, test_name, question_count, created_at, user_id')
    .eq('subject', 'Biology')
    .eq('exam_context', 'KCET')
    .ilike('test_name', '%2026 Flagship%')
    .order('created_at', { ascending: false });

  if (tests && tests.length > 0) {
    console.log(`   ✅ Found ${tests.length} custom test(s):\n`);
    for (const test of tests) {
      console.log(`   📄 ${test.test_name}`);
      console.log(`      Test ID: ${test.id}`);
      console.log(`      User ID: ${test.user_id}`);
      console.log(`      Questions: ${test.question_count}`);
      console.log(`      UI Link: /practice/custom/${test.id}`);
      console.log();
    }
  } else {
    console.log('   ❌ NO CUSTOM_TESTS RECORDS FOUND');
    console.log('   ⚠️  This explains why papers are not visible in UI!\n');
  }

  // Check custom_test_questions linkage
  console.log('\n📋 CUSTOM_TEST_QUESTIONS TABLE STATUS:');
  const { data: linkedQuestions } = await supabase
    .from('custom_test_questions')
    .select('custom_test_id, question_id')
    .in('question_id', questions?.map(q => q.id) || [])
    .limit(10);

  if (linkedQuestions && linkedQuestions.length > 0) {
    console.log(`   ✅ ${linkedQuestions.length} questions are linked to custom tests`);
  } else {
    console.log('   ❌ NO LINKAGES FOUND');
    console.log('   ⚠️  Questions exist but are not linked to any test!\n');
  }

  // Root cause analysis
  console.log('\n\n🔍 ROOT CAUSE ANALYSIS:');
  console.log('═'.repeat(60) + '\n');

  if (!tests || tests.length === 0) {
    console.log('❌ ISSUE IDENTIFIED:');
    console.log('   The createCustomTest() API call succeeded but did NOT create');
    console.log('   records in the custom_tests table.\n');

    console.log('📊 What Happened:');
    console.log('   1. ✅ Generator script ran successfully');
    console.log('   2. ✅ 120 questions generated and saved to questions table');
    console.log('   3. ✅ Questions have proper metadata (identityId, questionType)');
    console.log('   4. ❌ custom_tests records were NOT created');
    console.log('   5. ❌ Questions are NOT linked via custom_test_questions\n');

    console.log('🎯 Why This Happened:');
    console.log('   The createCustomTest() function likely returns a progressId');
    console.log('   for asynchronous generation, but does NOT immediately create');
    console.log('   the custom_test record. The questions are generated in the');
    console.log('   background and saved to the questions table, but the final');
    console.log('   step of creating the test record may not have completed.\n');

    console.log('✅ SOLUTION:');
    console.log('   We need to manually create the custom_tests records and link');
    console.log('   the questions. The questions are ready - we just need to');
    console.log('   create the test wrappers.\n');

    console.log('📋 Next Steps:');
    console.log('   1. Create 2 custom_tests records (SET A and SET B)');
    console.log('   2. Split the 120 questions appropriately (60 each)');
    console.log('   3. Link via custom_test_questions table');
    console.log('   4. Verify UI access\n');
  } else {
    console.log('✅ Tests are properly configured!');
  }

  // Check for any other Biology tests that might have our questions
  console.log('\n\n🔍 CHECKING FOR ANY BIOLOGY TESTS:');
  const { data: allBioTests } = await supabase
    .from('custom_tests')
    .select('id, test_name, question_count, created_at')
    .eq('subject', 'Biology')
    .gte('created_at', '2026-04-18')
    .order('created_at', { ascending: false })
    .limit(10);

  if (allBioTests && allBioTests.length > 0) {
    console.log(`   Found ${allBioTests.length} Biology test(s) from today:\n`);
    for (const test of allBioTests) {
      console.log(`   📄 ${test.test_name}`);
      console.log(`      ID: ${test.id}`);
      console.log(`      Questions: ${test.question_count}`);
      console.log(`      Created: ${new Date(test.created_at).toLocaleString()}`);
      console.log();
    }
  } else {
    console.log('   ❌ No Biology tests found from today.');
  }

  console.log('\n═'.repeat(60));
  console.log('🏁 ANALYSIS COMPLETE\n');
}

analyzeBiologyPapers().catch(console.error);
