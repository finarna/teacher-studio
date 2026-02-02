/**
 * Run Database Migrations
 * Applies SQL migrations to Supabase database
 */

import { supabaseAdmin } from '../lib/supabaseServer.js';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  console.log('\n' + '='.repeat(60));
  console.log('🗄️  Running Database Migrations');
  console.log('='.repeat(60) + '\n');

  const migrations = [
    {
      name: '001_initial_schema.sql',
      description: 'Create database tables, indexes, and triggers',
    },
    {
      name: '002_rls_policies.sql',
      description: 'Apply Row Level Security policies',
    },
  ];

  for (const migration of migrations) {
    console.log(`\n📝 Running: ${migration.name}`);
    console.log(`   ${migration.description}`);

    try {
      // Read SQL file
      const sqlPath = path.join(process.cwd(), 'migrations', migration.name);
      const sql = fs.readFileSync(sqlPath, 'utf-8');

      // Execute SQL
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql }).catch(async () => {
        // Fallback: try executing directly (won't work for all statements)
        // For proper migration, we need to use Supabase CLI or Dashboard
        console.log('   ⚠️  Cannot execute via RPC, please run manually in Supabase SQL Editor');
        return { error: 'Use Supabase SQL Editor for migration' };
      });

      if (error) {
        console.log(`   ⚠️  Please run this migration manually:`);
        console.log(`   1. Go to Supabase Dashboard → SQL Editor`);
        console.log(`   2. Copy contents of migrations/${migration.name}`);
        console.log(`   3. Paste and click "Run"`);
      } else {
        console.log(`   ✅ Migration applied successfully`);
      }
    } catch (err: any) {
      console.error(`   ❌ Error:`, err.message);
      console.log(`   📋 Please apply manually via Supabase Dashboard`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Migration Instructions');
  console.log('='.repeat(60));
  console.log('\nManual migration steps (recommended):');
  console.log('1. Go to: https://supabase.com/dashboard/project/nsxjwjinxkehsubzesml/sql');
  console.log('2. Create new query');
  console.log('3. Copy/paste migrations/001_initial_schema.sql');
  console.log('4. Click "Run"');
  console.log('5. Repeat for migrations/002_rls_policies.sql');
  console.log('\n✅ Done!\n');
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
