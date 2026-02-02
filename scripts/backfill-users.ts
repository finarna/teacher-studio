/**
 * Backfill User Profiles Script
 * Creates public.users profiles for all auth.users who don't have one yet
 */

import { supabaseAdmin } from '../lib/supabaseServer';

async function backfillUsers() {
  console.log('🔄 Starting user profile backfill...\n');

  try {
    // Step 1: Check current state
    console.log('📊 Checking current state...');
    const { data: statsBefore, error: statsError } = await supabaseAdmin.rpc('check_user_profiles', {});

    if (statsError) {
      console.log('⚠️  Could not call check function, proceeding with backfill...');
    } else {
      console.log('Current state:', statsBefore);
    }

    // Step 2: Backfill missing users
    console.log('\n🔧 Backfilling missing user profiles...');

    const { data: backfillResult, error: backfillError } = await supabaseAdmin.rpc('backfill_user_profiles', {});

    if (backfillError) {
      // If RPC doesn't exist, run raw SQL instead
      console.log('RPC not found, running direct SQL...');

      const sqlQuery = `
        INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
        SELECT
          au.id,
          au.email,
          COALESCE(au.raw_user_meta_data->>'full_name', au.email),
          'student' AS role,
          au.created_at,
          NOW() AS updated_at
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL;
      `;

      const { data, error } = await supabaseAdmin.rpc('exec_sql', { query: sqlQuery });

      if (error) {
        // Last resort: query and insert one by one
        console.log('Using fallback method: fetch and insert...');

        // Get all auth users
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

        if (authError) {
          throw new Error(`Failed to list auth users: ${authError.message}`);
        }

        console.log(`Found ${authUsers.users.length} auth users`);

        // Get existing public users
        const { data: publicUsers, error: publicError } = await supabaseAdmin
          .from('users')
          .select('id');

        if (publicError) {
          throw new Error(`Failed to list public users: ${publicError.message}`);
        }

        const existingIds = new Set(publicUsers?.map(u => u.id) || []);
        console.log(`Found ${existingIds.size} existing profiles`);

        // Find missing users
        const missingUsers = authUsers.users.filter(u => !existingIds.has(u.id));
        console.log(`Found ${missingUsers.length} missing profiles`);

        if (missingUsers.length === 0) {
          console.log('\n✅ All users already have profiles!');
          return;
        }

        // Insert missing profiles
        const inserts = missingUsers.map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name || u.email || null,
          role: 'student',
          created_at: u.created_at,
          updated_at: new Date().toISOString(),
        }));

        const { data: insertResult, error: insertError } = await supabaseAdmin
          .from('users')
          .insert(inserts);

        if (insertError) {
          throw new Error(`Failed to insert users: ${insertError.message}`);
        }

        console.log(`\n✅ Successfully created ${missingUsers.length} user profiles!`);

        // Show created users
        console.log('\nCreated profiles:');
        inserts.forEach(u => {
          console.log(`  - ${u.email} (${u.id})`);
        });

      } else {
        console.log('✅ Backfill completed via RPC:', data);
      }
    } else {
      console.log('✅ Backfill completed:', backfillResult);
    }

    // Step 3: Verify final state
    console.log('\n📊 Verifying final state...');

    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const { data: publicUsers } = await supabaseAdmin.from('users').select('id');

    const authCount = authUsers?.users.length || 0;
    const publicCount = publicUsers?.length || 0;
    const missing = authCount - publicCount;

    console.log(`\nFinal State:`);
    console.log(`  Auth users: ${authCount}`);
    console.log(`  Public profiles: ${publicCount}`);
    console.log(`  Missing profiles: ${missing}`);

    if (missing === 0) {
      console.log('\n🎉 SUCCESS! All users now have profiles!');
    } else {
      console.log(`\n⚠️  Warning: ${missing} profiles still missing`);
    }

  } catch (error) {
    console.error('\n❌ Error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillUsers()
  .then(() => {
    console.log('\n✅ Backfill script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill script failed:', error);
    process.exit(1);
  });
