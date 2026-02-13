#!/usr/bin/env node

/**
 * Apply Sketch Progress Migration
 * Creates the sketch_progress table for tracking user progress on visual sketches
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nMake sure these are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n' + '='.repeat(70));
console.log('📊 Sketch Progress Migration');
console.log('='.repeat(70) + '\n');

async function applyMigration() {
  try {
    // Read migration SQL
    const migrationPath = join(__dirname, '..', 'migrations', '013_sketch_progress.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Reading migration file: 013_sketch_progress.sql\n');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments
      if (statement.trim().startsWith('--')) continue;

      console.log(`   [${i + 1}/${statements.length}] Executing...`);

      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        }).catch(async () => {
          // If RPC doesn't work, try direct execution via REST API
          // Note: This may not work for all statement types
          return { error: 'RPC not available, use manual migration' };
        });

        if (error) {
          console.log(`   ⚠️  Statement ${i + 1} needs manual execution`);
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`   ⚠️  Statement ${i + 1} error:`, err.message);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎯 Manual Migration Instructions');
    console.log('='.repeat(70) + '\n');

    console.log('If automated migration failed, please run manually:\n');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log(`   https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql\n`);
    console.log('2. Create new query');
    console.log('3. Copy/paste contents of: migrations/013_sketch_progress.sql');
    console.log('4. Click "Run"\n');

    // Verify table was created
    console.log('🔍 Verifying table creation...\n');

    const { data, error } = await supabase
      .from('sketch_progress')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Table not created - please run manual migration');
        console.log('   Error: Table "sketch_progress" does not exist\n');
      } else {
        console.log('⚠️  Verification error:', error.message);
        console.log('   The table may exist but RLS policies may be blocking access\n');
      }
    } else {
      console.log('✅ Table "sketch_progress" exists and is accessible!\n');
      console.log('📊 Current records:', data.length);
      console.log('\n🎉 Migration completed successfully!\n');
    }

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error('\nPlease apply migration manually via Supabase Dashboard\n');
  }
}

console.log('Starting migration...\n');

applyMigration()
  .then(() => {
    console.log('Done!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
