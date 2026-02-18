/**
 * Run Migration: Add year column to scans table
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('   This migration requires admin access to alter the table schema.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running Migration: Add year column to scans\n');
  console.log('='.repeat(60));

  try {
    // Read migration file
    const migrationSQL = readFileSync('./supabase/migrations/017_add_year_to_scans.sql', 'utf8');

    console.log('\n📝 Migration SQL:');
    console.log(migrationSQL);

    console.log('\n⏳ Executing migration...\n');

    // Execute migration using Supabase SQL query
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('\nPlease run this migration manually in Supabase SQL Editor:');
      console.error('1. Go to https://app.supabase.com/project/_/sql');
      console.error('2. Copy the SQL from supabase/migrations/017_add_year_to_scans.sql');
      console.error('3. Run it in the SQL editor');
      process.exit(1);
    }

    console.log('✅ Migration executed successfully!\n');
    console.log('='.repeat(60));
    console.log('\n📊 Verifying changes...\n');

    // Verify the year column exists and check updated scans
    const { data: scans, error: verifyError } = await supabase
      .from('scans')
      .select('id, name, year, subject')
      .not('year', 'is', null)
      .limit(5);

    if (verifyError) {
      console.error('⚠️  Could not verify migration:', verifyError.message);
    } else {
      console.log(`✅ Found ${scans?.length || 0} scan(s) with year field`);
      if (scans && scans.length > 0) {
        console.log('\nSample scans:');
        scans.forEach((scan, idx) => {
          console.log(`   ${idx + 1}. ${scan.subject} (${scan.year}) - ${scan.name}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Migration complete!');
    console.log('   Biology scans should now appear in Learning Journey Past Year Exams.');
    console.log('   Refresh the page to see updated stats.');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\nManual migration required. Run SQL from:');
    console.error('   supabase/migrations/017_add_year_to_scans.sql');
    process.exit(1);
  }
}

runMigration();
