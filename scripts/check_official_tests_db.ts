import { supabaseAdmin } from '../lib/supabaseServer';

async function checkOfficialTests() {
  console.log('Checking test_attempts table for PLUS2AI OFFICIAL tests...\n');

  const { data, error } = await supabaseAdmin
    .from('test_attempts')
    .select('*')
    .ilike('test_name', '%PLUS2AI OFFICIAL%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} test attempts:\n`);
  data?.forEach((test, i) => {
    console.log(`${i + 1}. ${test.test_name}`);
    console.log(`   ID: ${test.id}`);
    console.log(`   Subject: ${test.subject}`);
    console.log(`   Exam: ${test.exam_context}`);
    console.log(`   Status: ${test.status}`);
    console.log(`   user_id: ${test.user_id}`);
    console.log(`   Created: ${test.created_at}`);
    console.log(`   Test Type: ${test.test_type}`);
    console.log('');
  });
}

checkOfficialTests().then(() => process.exit(0));
