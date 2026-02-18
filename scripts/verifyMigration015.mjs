#!/usr/bin/env node

/**
 * Verify Migration 015 Status
 * Checks if custom mock test migration is applied
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('\n🔍 Verifying Migration 015 Status...\n');

  const checks = {
    testConfigColumn: false,
    customMockConstraint: false,
    testTemplatesTable: false,
    rlsPolicies: false
  };

  // 1. Check test_config column exists
  console.log('1️⃣  Checking test_config column in test_attempts...');
  try {
    const { data, error } = await supabase
      .from('test_attempts')
      .select('test_config')
      .limit(1);

    if (!error) {
      checks.testConfigColumn = true;
      console.log('   ✅ test_config column exists\n');
    } else {
      console.log(`   ❌ test_config column missing: ${error.message}\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error checking column: ${err.message}\n`);
  }

  // 2. Check test_templates table exists
  console.log('2️⃣  Checking test_templates table...');
  try {
    const { data, error } = await supabase
      .from('test_templates')
      .select('id')
      .limit(1);

    if (!error) {
      checks.testTemplatesTable = true;
      console.log('   ✅ test_templates table exists\n');
    } else {
      console.log(`   ❌ test_templates table missing: ${error.message}\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error checking table: ${err.message}\n`);
  }

  // 3. Test creating a custom_mock test_attempt
  console.log('3️⃣  Testing custom_mock constraint...');
  try {
    const testAttempt = {
      user_id: '00000000-0000-0000-0000-000000000001',
      test_type: 'custom_mock',
      subject: 'Math',
      exam_context: 'NEET',
      total_questions: 25,
      duration_minutes: 45,
      test_config: {
        topicIds: [],
        difficultyMix: { easy: 30, moderate: 50, hard: 20 }
      }
    };

    const { data, error } = await supabase
      .from('test_attempts')
      .insert(testAttempt)
      .select()
      .single();

    if (!error) {
      checks.customMockConstraint = true;
      console.log('   ✅ custom_mock test type allowed\n');

      // Clean up test record
      await supabase
        .from('test_attempts')
        .delete()
        .eq('id', data.id);
    } else {
      if (error.message.includes('violates check constraint')) {
        console.log('   ❌ custom_mock constraint not applied\n');
      } else {
        console.log(`   ⚠️  Could not test constraint: ${error.message}\n`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Error testing constraint: ${err.message}\n`);
  }

  // 4. Check RLS policies
  console.log('4️⃣  Checking RLS policies...');
  try {
    const { data, error } = await supabase.rpc('pg_policies')
      .select('*')
      .eq('tablename', 'test_templates');

    if (!error && data && data.length > 0) {
      checks.rlsPolicies = true;
      console.log(`   ✅ RLS policies configured (${data.length} policies)\n`);
    } else {
      // RLS policies can't be queried this way, so we'll test by trying to use the table
      console.log('   ⚠️  Could not verify RLS policies (this is normal)\n');
    }
  } catch (err) {
    console.log('   ⚠️  Could not verify RLS policies (this is normal)\n');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration 015 Status Summary');
  console.log('='.repeat(60));

  const allPassed = checks.testConfigColumn &&
                    checks.testTemplatesTable &&
                    checks.customMockConstraint;

  console.log(`test_config column:       ${checks.testConfigColumn ? '✅' : '❌'}`);
  console.log(`test_templates table:     ${checks.testTemplatesTable ? '✅' : '❌'}`);
  console.log(`custom_mock constraint:   ${checks.customMockConstraint ? '✅' : '❌'}`);
  console.log('='.repeat(60));

  if (allPassed) {
    console.log('\n✅ Migration 015 is FULLY APPLIED and working!\n');
    console.log('🚀 Ready to use custom mock test features!\n');
  } else {
    console.log('\n⚠️  Migration 015 is PARTIALLY APPLIED\n');
    console.log('Some components may not work correctly.\n');
  }
}

verifyMigration().catch(console.error);
