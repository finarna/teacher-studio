/**
 * Apply Migration 015: Custom Mock Tests
 * Run this with: node scripts/applyMigration015.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Starting Migration 015: Custom Mock Tests\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'migrations', '015_custom_mock_tests.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded successfully');
    console.log('📊 Applying migration to database...\n');

    // Execute the migration using Supabase client
    // Note: Supabase client doesn't support raw SQL execution directly
    // We'll need to manually execute this via the Supabase dashboard SQL editor

    console.log('⚠️  MANUAL MIGRATION REQUIRED');
    console.log('━'.repeat(60));
    console.log('\nPlease follow these steps:\n');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to: SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the SQL below');
    console.log('5. Click "Run"\n');
    console.log('━'.repeat(60));
    console.log('\nMIGRATION SQL:\n');
    console.log(migrationSQL);
    console.log('\n' + '━'.repeat(60));
    console.log('\n✅ After running the SQL above, this migration will be complete!\n');

    // Verify tables exist (this will work if migration was already applied)
    console.log('🔍 Verifying migration status...\n');

    const { data: tables, error } = await supabaseAdmin
      .from('test_templates')
      .select('id')
      .limit(0);

    if (!error) {
      console.log('✅ test_templates table exists!');
      console.log('✅ Migration 015 has been applied successfully!\n');
      return true;
    } else if (error.code === '42P01') {
      console.log('⏳ test_templates table does not exist yet');
      console.log('💡 Please apply the migration SQL shown above\n');
      return false;
    } else {
      throw error;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 If you see permission errors, please:');
    console.log('   1. Ensure SUPABASE_SERVICE_ROLE_KEY is correct in .env.local');
    console.log('   2. Apply migration manually via Supabase Dashboard\n');
    return false;
  }
}

applyMigration()
  .then((success) => {
    if (!success) {
      console.log('⚠️  Migration needs manual application');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
