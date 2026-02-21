/**
 * Delete All Mock Tests
 * Cleans up test_attempts and test_responses tables
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteMockTests(userId: string, dryRun: boolean = true) {
  console.log('🗑️  Deleting All Mock Tests\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no database changes)' : '💾 LIVE DELETE'}`);
  console.log(`User ID: ${userId}\n`);

  // Get all test attempts for this user
  const { data: attempts, error: attemptsError } = await supabase
    .from('test_attempts')
    .select('id, test_name, test_type, created_at')
    .eq('user_id', userId)
    .eq('test_type', 'custom_mock');

  if (attemptsError) {
    console.error('❌ Error fetching test attempts:', attemptsError);
    return;
  }

  console.log(`📊 Found ${attempts?.length || 0} mock tests\n`);

  if (!attempts || attempts.length === 0) {
    console.log('✨ No mock tests found for this user.');
    return;
  }

  // Show what will be deleted
  console.log('Tests to be deleted:');
  attempts.forEach((attempt, idx) => {
    console.log(`  ${idx + 1}. ${attempt.test_name} (${new Date(attempt.created_at).toLocaleDateString()})`);
  });
  console.log('');

  if (!dryRun) {
    // Delete test responses first (foreign key constraint)
    const attemptIds = attempts.map(a => a.id);

    console.log('🗑️  Deleting test responses...');
    const { error: responsesError } = await supabase
      .from('test_responses')
      .delete()
      .in('attempt_id', attemptIds);

    if (responsesError) {
      console.error('❌ Error deleting test responses:', responsesError);
      return;
    }
    console.log('✅ Test responses deleted\n');

    // Delete test attempts
    console.log('🗑️  Deleting test attempts...');
    const { error: deleteError } = await supabase
      .from('test_attempts')
      .delete()
      .in('id', attemptIds);

    if (deleteError) {
      console.error('❌ Error deleting test attempts:', deleteError);
      return;
    }
    console.log('✅ Test attempts deleted\n');

    console.log(`\n✅ Successfully deleted ${attempts.length} mock tests!`);
  } else {
    console.log('\n💡 This was a DRY RUN. To actually delete, run with --live flag');
  }
}

// CLI interface
const args = process.argv.slice(2);
const userId = args.find(arg => arg.startsWith('--user='))?.split('=')[1];
const live = args.includes('--live');

if (!userId) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              DELETE ALL MOCK TESTS                             ║
╚════════════════════════════════════════════════════════════════╝

Usage:
  npm run delete-tests -- --user=USER_ID                  # Dry run
  npm run delete-tests -- --user=USER_ID --live           # Actually delete

Example:
  npm run delete-tests -- --user=924a88dd-4f98-4a5f-939a-89f9b1ce4174 --live

`);
  process.exit(1);
}

deleteMockTests(userId, !live)
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
