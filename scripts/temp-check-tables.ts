import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTables() {
  console.log('🔍 Checking database schema for test-related tables...\n');

  // Check test_attempts table
  const { data: attempts, error: attemptsError } = await supabase
    .from('test_attempts')
    .select('*')
    .limit(1);

  console.log('test_attempts:', attemptsError ? `❌ ${attemptsError.message}` : '✅ Exists');

  // Try custom_tests
  const { data: custom, error: customError } = await supabase
    .from('custom_tests')
    .select('*')
    .limit(1);

  console.log('custom_tests:', customError ? `❌ ${customError.message}` : '✅ Exists');

  // Try custom_test_questions
  const { data: customQ, error: customQError } = await supabase
    .from('custom_test_questions')
    .select('*')
    .limit(1);

  console.log('custom_test_questions:', customQError ? `❌ ${customQError.message}` : '✅ Exists');

  // Check test_attempts schema
  if (!attemptsError && attempts) {
    console.log('\ntest_attempts columns:', Object.keys(attempts[0] || {}));
  }
}

checkTables().catch(console.error);
