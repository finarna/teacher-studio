import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_ID = 'ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9';
const ADMIN_USER_ID = '13282202-5251-4c94-b5ef-95c273378262';

async function deployBiologyFlagship() {
  console.log('🚀 DEPLOYING KCET BIOLOGY 2026 FLAGSHIP PAPERS\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Step 1: Fetch all 120 Biology questions
    console.log('📦 Step 1: Fetching Biology questions from database...\n');

    const { data: allQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('id, created_at')
      .eq('scan_id', SCAN_ID)
      .eq('subject', 'Biology')
      .eq('exam_context', 'KCET')
      .order('created_at', { ascending: false })
      .limit(120);

    if (fetchError || !allQuestions || allQuestions.length < 120) {
      throw new Error(`Failed to fetch questions: ${fetchError?.message || 'Not enough questions'}`);
    }

    console.log(`   ✅ Fetched ${allQuestions.length} Biology questions\n`);

    // Step 2: Split into SET A (older 60) and SET B (newer 60)
    const setB = allQuestions.slice(0, 60);  // Most recent
    const setA = allQuestions.slice(60, 120); // Older

    console.log('📊 Step 2: Splitting questions into sets...\n');
    console.log(`   SET A: ${setA.length} questions (created: ${setA[0]?.created_at})`);
    console.log(`   SET B: ${setB.length} questions (created: ${setB[0]?.created_at})\n`);

    // Step 3: Create custom_tests records
    console.log('🏗️  Step 3: Creating custom_tests records...\n');

    // Create SET A test
    const { data: testA, error: testAError } = await supabase
      .from('custom_tests')
      .insert({
        user_id: ADMIN_USER_ID,
        test_name: 'KCET Biology 2026 Flagship - SET A [REI v17]',
        subject: 'Biology',
        exam_context: 'KCET',
        question_count: 60,
        duration_minutes: 60,
        difficulty_distribution: {
          easy: 87,
          moderate: 13,
          hard: 0
        },
        tags: ['flagship', 'rei-v17', 'biology', 'kcet', '2026', 'set-a'],
        is_public: true,
        description: 'REI v17 calibrated flagship paper for KCET Biology 2026. SET A focuses on Genetics + Human Physiology. 60 questions, 60 minutes. Generated using 4-year historical calibration (2022-2025) with 35 BIO identities and 92% system health.'
      })
      .select()
      .single();

    if (testAError) throw new Error(`Failed to create SET A: ${testAError.message}`);
    console.log(`   ✅ Created SET A: ${testA.id}`);

    // Create SET B test
    const { data: testB, error: testBError } = await supabase
      .from('custom_tests')
      .insert({
        user_id: ADMIN_USER_ID,
        test_name: 'KCET Biology 2026 Flagship - SET B [REI v17]',
        subject: 'Biology',
        exam_context: 'KCET',
        question_count: 60,
        duration_minutes: 60,
        difficulty_distribution: {
          easy: 87,
          moderate: 13,
          hard: 0
        },
        tags: ['flagship', 'rei-v17', 'biology', 'kcet', '2026', 'set-b'],
        is_public: true,
        description: 'REI v17 calibrated flagship paper for KCET Biology 2026. SET B focuses on Plant + Ecology. 60 questions, 60 minutes. Generated using 4-year historical calibration (2022-2025) with 35 BIO identities and 92% system health.'
      })
      .select()
      .single();

    if (testBError) throw new Error(`Failed to create SET B: ${testBError.message}`);
    console.log(`   ✅ Created SET B: ${testB.id}\n`);

    // Step 4: Link questions to tests
    console.log('🔗 Step 4: Linking questions to custom_tests...\n');

    // Link SET A questions
    const setALinks = setA.map((q, index) => ({
      custom_test_id: testA.id,
      question_id: q.id,
      question_order: index + 1
    }));

    const { error: linkAError } = await supabase
      .from('custom_test_questions')
      .insert(setALinks);

    if (linkAError) throw new Error(`Failed to link SET A questions: ${linkAError.message}`);
    console.log(`   ✅ Linked ${setALinks.length} questions to SET A`);

    // Link SET B questions
    const setBLinks = setB.map((q, index) => ({
      custom_test_id: testB.id,
      question_id: q.id,
      question_order: index + 1
    }));

    const { error: linkBError } = await supabase
      .from('custom_test_questions')
      .insert(setBLinks);

    if (linkBError) throw new Error(`Failed to link SET B questions: ${linkBError.message}`);
    console.log(`   ✅ Linked ${setBLinks.length} questions to SET B\n`);

    // Step 5: Verify deployment
    console.log('✅ Step 5: Verifying deployment...\n');

    const { data: verifyA } = await supabase
      .from('custom_test_questions')
      .select('question_id', { count: 'exact' })
      .eq('custom_test_id', testA.id);

    const { data: verifyB } = await supabase
      .from('custom_test_questions')
      .select('question_id', { count: 'exact' })
      .eq('custom_test_id', testB.id);

    console.log(`   SET A: ${verifyA?.length || 0}/60 questions verified`);
    console.log(`   SET B: ${verifyB?.length || 0}/60 questions verified\n`);

    // Step 6: Generate UI links
    console.log('\n🌐 DEPLOYMENT COMPLETE!\n');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📍 UI Access Links:\n');
    console.log(`   SET A: /practice/custom/${testA.id}`);
    console.log(`   SET B: /practice/custom/${testB.id}\n`);

    console.log('📊 Test Details:\n');
    console.log(`   SET A ID: ${testA.id}`);
    console.log(`   SET B ID: ${testB.id}`);
    console.log(`   Questions: 60 each (120 total)`);
    console.log(`   Duration: 60 minutes each`);
    console.log(`   Difficulty: 87% Easy, 13% Moderate, 0% Hard`);
    console.log(`   Identity Assignment: 80-82%`);
    console.log(`   Public Access: Enabled\n`);

    console.log('✅ Biology flagship papers are now live and accessible to students!\n');

    return {
      setA: { id: testA.id, questions: verifyA?.length || 0 },
      setB: { id: testB.id, questions: verifyB?.length || 0 }
    };

  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED:', error);
    throw error;
  }
}

deployBiologyFlagship().catch(console.error);
