/**
 * Migration Script: Add exam_context to scans
 *
 * This script adds the exam_context field to existing scans in Supabase
 * and applies default values based on subject.
 *
 * Run with: npx tsx scripts/migrate-exam-context.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Default exam context mapping
const DEFAULT_EXAM_MAP: Record<string, string> = {
  'Math': 'KCET',
  'Physics': 'KCET',
  'Chemistry': 'KCET',
  'Biology': 'NEET'
};

async function runMigration() {
  console.log('🚀 Starting exam_context migration...\n');

  try {
    // Step 1: Run SQL migration file
    console.log('📝 Step 1: Running SQL migration...');

    const migrationPath = path.join(__dirname, '../migrations/004_add_exam_context.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute SQL migration
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (sqlError) {
      // If RPC doesn't exist, log warning and continue with manual updates
      console.log('⚠️  Could not run SQL via RPC, will update records manually');
    } else {
      console.log('✅ SQL migration executed successfully');
    }

    // Step 2: Fetch all scans
    console.log('\n📊 Step 2: Fetching scans...');

    const { data: scans, error: fetchError } = await supabase
      .from('scans')
      .select('id, subject, exam_context')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch scans: ${fetchError.message}`);
    }

    if (!scans || scans.length === 0) {
      console.log('✅ No scans found in database');
      return;
    }

    console.log(`📦 Found ${scans.length} scans`);

    // Step 3: Update scans without exam_context
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    console.log('\n🔄 Step 3: Updating scans...');

    for (const scan of scans) {
      if (scan.exam_context) {
        console.log(`⏭️  Skipping ${scan.id.substring(0, 8)}... - already has exam_context: ${scan.exam_context}`);
        skipped++;
        continue;
      }

      const defaultExam = DEFAULT_EXAM_MAP[scan.subject] || 'KCET';

      const { error: updateError } = await supabase
        .from('scans')
        .update({ exam_context: defaultExam })
        .eq('id', scan.id);

      if (updateError) {
        console.error(`❌ Error updating ${scan.id}: ${updateError.message}`);
        errors++;
      } else {
        console.log(`✅ Updated ${scan.id.substring(0, 8)}... - ${scan.subject} → ${defaultExam}`);
        updated++;
      }
    }

    // Step 4: Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`   ✅ Updated:  ${updated}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log(`   ❌ Errors:   ${errors}`);
    console.log(`   📝 Total:    ${scans.length}`);
    console.log('='.repeat(50));

    // Step 5: Verification
    console.log('\n🔍 Step 4: Verifying migration...');

    const { data: verification, error: verifyError } = await supabase
      .from('scans')
      .select('subject, exam_context')
      .is('exam_context', null);

    if (verifyError) {
      console.error('❌ Verification error:', verifyError.message);
    } else if (verification && verification.length > 0) {
      console.log(`⚠️  Warning: ${verification.length} scans still missing exam_context`);
    } else {
      console.log('✅ Verification passed: All scans have exam_context');
    }

    // Step 6: Show distribution
    console.log('\n📈 Step 5: Current distribution:');

    const { data: distribution, error: distError } = await supabase.rpc('get_exam_distribution');

    if (!distError && distribution) {
      console.table(distribution);
    } else {
      // Fallback: Manual count
      const { data: counts } = await supabase
        .from('scans')
        .select('subject, exam_context');

      if (counts) {
        const dist = counts.reduce((acc: any, scan) => {
          const key = `${scan.subject} - ${scan.exam_context}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        console.table(dist);
      }
    }

    console.log('\n✨ Migration complete!\n');

  } catch (error: any) {
    console.error('\n💥 Migration failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('👋 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
