import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findBiologyPapers() {
  console.log('🔍 Finding Biology KCET 2026 Flagship Papers...\n');

  // Look for custom tests with Biology
  const { data: tests } = await supabase
    .from('custom_tests')
    .select('id, test_name, question_count, created_at, user_id')
    .eq('subject', 'Biology')
    .eq('exam_context', 'KCET')
    .ilike('test_name', '%2026 Flagship%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (tests && tests.length > 0) {
    console.log(`✅ Found ${tests.length} Biology Flagship Papers:\n`);

    for (const test of tests) {
      console.log(`📄 ${test.test_name}`);
      console.log(`   Test ID: ${test.id}`);
      console.log(`   User ID: ${test.user_id}`);
      console.log(`   Questions: ${test.question_count}`);
      console.log(`   Created: ${new Date(test.created_at).toLocaleString()}`);
      console.log(`   UI Link: /practice/custom/${test.id}`);

      // Get questions for this test
      const { data: testQuestions } = await supabase
        .from('custom_test_questions')
        .select('question_id')
        .eq('custom_test_id', test.id);

      if (testQuestions && testQuestions.length > 0) {
        console.log(`   ✅ ${testQuestions.length} questions linked`);

        // Get sample question
        const { data: sampleQ } = await supabase
          .from('questions')
          .select('text, difficulty, topic, metadata')
          .eq('id', testQuestions[0].question_id)
          .single();

        if (sampleQ) {
          console.log(`   Sample: ${sampleQ.text.substring(0, 80)}...`);
          console.log(`   Type: ${sampleQ.metadata?.questionType || 'N/A'}, Identity: ${sampleQ.metadata?.identityId || 'N/A'}`);
        }
      }
      console.log();
    }
  } else {
    console.log('⚠️  No custom_tests records found yet.');
    console.log('Checking for AI-Generated Biology questions...\n');

    // Check for AI-generated questions
    const { data: questions } = await supabase
      .from('questions')
      .select('id, text, difficulty, topic, metadata, source, created_at, scan_id')
      .eq('subject', 'Biology')
      .eq('exam_context', 'KCET')
      .ilike('source', '%AI-Generated%')
      .gte('created_at', '2026-04-18')
      .order('created_at', { ascending: false })
      .limit(10);

    if (questions && questions.length > 0) {
      console.log(`✅ Found ${questions.length} AI-Generated Biology questions from today`);

      // Group by scan_id
      const byScan: Record<string, typeof questions> = {};
      questions.forEach(q => {
        if (q.scan_id) {
          if (!byScan[q.scan_id]) byScan[q.scan_id] = [];
          byScan[q.scan_id].push(q);
        }
      });

      console.log(`\nGrouped into ${Object.keys(byScan).length} scan(s):\n`);

      Object.entries(byScan).forEach(([scanId, qs]) => {
        console.log(`📦 Scan ID: ${scanId}`);
        console.log(`   Questions: ${qs.length}`);
        console.log(`   Created: ${new Date(qs[0].created_at).toLocaleString()}`);

        // Count by difficulty
        const easy = qs.filter(q => q.difficulty === 'Easy').length;
        const moderate = qs.filter(q => q.difficulty === 'Moderate').length;
        const hard = qs.filter(q => q.difficulty === 'Hard').length;
        console.log(`   Difficulty: Easy=${easy}, Moderate=${moderate}, Hard=${hard}`);

        // Count identities
        const withIdentity = qs.filter(q => q.metadata?.identityId).length;
        console.log(`   Identity assigned: ${withIdentity}/${qs.length} (${Math.round(withIdentity/qs.length*100)}%)`);

        // Sample question
        console.log(`   Sample: ${qs[0].text.substring(0, 80)}...`);
        console.log();
      });

      // Check if these are in custom_tests
      console.log('🔍 Checking if questions are linked to custom tests...\n');

      const { data: linkedTests } = await supabase
        .from('custom_test_questions')
        .select('custom_test_id, question_id')
        .in('question_id', questions.map(q => q.id))
        .limit(5);

      if (linkedTests && linkedTests.length > 0) {
        const testIds = [...new Set(linkedTests.map(lt => lt.custom_test_id))];
        console.log(`✅ Questions are linked to ${testIds.length} custom test(s)`);

        // Get test details
        const { data: testDetails } = await supabase
          .from('custom_tests')
          .select('id, test_name, user_id')
          .in('id', testIds);

        if (testDetails) {
          testDetails.forEach(test => {
            console.log(`   📄 ${test.test_name}`);
            console.log(`      ID: ${test.id}`);
            console.log(`      UI: /practice/custom/${test.id}`);
          });
        }
      } else {
        console.log('⚠️  Questions not yet linked to custom_tests table.');
        console.log('   They exist in questions table but may need to be added to a test.');
      }
    } else {
      console.log('❌ No Biology questions found from today.');
    }
  }

  // Check for the specific scan ID from generation
  console.log('\n🔍 Checking specific scan ID from generation log...\n');
  const scanId = 'ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9';

  const { data: scanQuestions, count } = await supabase
    .from('questions')
    .select('*', { count: 'exact' })
    .eq('scan_id', scanId);

  if (scanQuestions && count) {
    console.log(`✅ Scan ${scanId}:`);
    console.log(`   Total questions: ${count}`);

    if (count === 120) {
      console.log(`   ✅ This matches the expected 120 questions (SET A + SET B)`);
      console.log(`   Likely contains both sets in one scan`);
    }
  }
}

findBiologyPapers().catch(console.error);
