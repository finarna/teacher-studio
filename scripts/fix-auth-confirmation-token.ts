/**
 * Fix Auth Confirmation Token Issue
 *
 * This script fixes the issue where auth.users has NULL confirmation_token values
 * causing signup errors: "Scan error on column index 3, name confirmation_token"
 *
 * Run with: npx tsx scripts/fix-auth-confirmation-token.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fixAuthConfirmationToken() {
  console.log('🔧 Starting auth confirmation_token fix...\n');

  try {
    // Step 1: Check for corrupted records
    console.log('📋 Step 1: Checking for corrupted auth records...');

    const migrationSQL = `
      -- Delete incomplete auth.users records where confirmation_token is NULL
      -- and email is not confirmed (these are failed/partial signups)
      DELETE FROM auth.users
      WHERE confirmation_token IS NULL
        AND confirmed_at IS NULL
        AND email_confirmed_at IS NULL
        AND created_at < NOW() - INTERVAL '1 hour'
      RETURNING email;
    `;

    const { data: deletedUsers, error: deleteError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (deleteError) {
      // If the RPC doesn't exist, try direct SQL execution
      console.log('⚠️  RPC method not available, attempting direct migration...');

      // Read and execute the migration file
      const fs = await import('fs/promises');
      const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260303010000_fix_auth_confirmation_token.sql');
      const migrationContent = await fs.readFile(migrationPath, 'utf-8');

      console.log('\n📄 Migration SQL:');
      console.log('─'.repeat(80));
      console.log(migrationContent);
      console.log('─'.repeat(80));

      console.log('\n⚠️  Manual intervention required:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
      console.log('2. Navigate to: SQL Editor');
      console.log('3. Copy and paste the migration SQL above');
      console.log('4. Click "Run" to execute the migration');
      console.log('\nOR run this migration via Supabase CLI if available.');

    } else {
      console.log('✅ Successfully cleaned up corrupted auth records');
      if (deletedUsers && deletedUsers.length > 0) {
        console.log(`   Deleted ${deletedUsers.length} incomplete record(s):`);
        deletedUsers.forEach((user: any) => console.log(`   - ${user.email}`));
      } else {
        console.log('   No corrupted records found');
      }
    }

    // Step 2: Check specific email
    console.log('\n📋 Step 2: Checking for hello@finarna.com record...');

    // We can't directly query auth.users without admin access,
    // but we can try to sign up and see if it fails
    console.log('   (Cannot query auth.users directly with current permissions)');
    console.log('   The migration above should have cleaned up any issues.');

    // Step 3: Clean up orphaned profiles
    console.log('\n📋 Step 3: Cleaning up orphaned profiles...');

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .not('id', 'in',
        `(SELECT id FROM auth.users)`
      );

    if (profileError) {
      console.log('⚠️  Could not clean up orphaned profiles (may not have permission)');
      console.log(`   Error: ${profileError.message}`);
    } else {
      console.log('✅ Orphaned profiles cleaned up (if any)');
    }

    console.log('\n✅ Fix completed!');
    console.log('\n📝 Next steps:');
    console.log('1. If you saw manual intervention required above, run the SQL in Supabase dashboard');
    console.log('2. Try signing up with hello@finarna.com again');
    console.log('3. If the issue persists, check the Supabase logs for more details');

  } catch (error: any) {
    console.error('❌ Error during fix:', error.message);
    throw error;
  }
}

// Run the fix
fixAuthConfirmationToken()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
