#!/usr/bin/env node

/**
 * Check test_attempts constraint for custom_mock
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConstraint() {
  console.log('\n🔍 Checking test_type constraint...\n');

  // Query PostgreSQL system tables for constraint definition
  const { data, error } = await supabase.rpc('pg_get_constraintdef', {
    constraint_oid: '(SELECT oid FROM pg_constraint WHERE conname = \'test_attempts_test_type_check\')'
  });

  if (error) {
    console.log('Using SQL query instead...\n');

    // Try direct SQL query
    const query = `
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'test_attempts_test_type_check';
    `;

    // We can't run arbitrary SQL through Supabase client, so let's test another way
    // Try to insert a custom_mock record with all required fields
    const testRecord = {
      user_id: '00000000-0000-0000-0000-000000000001',
      test_type: 'custom_mock',
      test_name: 'Test Migration Verification',
      subject: 'Math',
      exam_context: 'NEET',
      total_questions: 25,
      duration_minutes: 45,
      status: 'in_progress',
      test_config: { test: true }
    };

    console.log('Testing by inserting a custom_mock record...');
    const { data: insertData, error: insertError } = await supabase
      .from('test_attempts')
      .insert(testRecord)
      .select()
      .single();

    if (insertError) {
      if (insertError.message.includes('violates check constraint')) {
        console.log('❌ custom_mock is NOT allowed in constraint');
        console.log('   Error:', insertError.message);
      } else {
        console.log('⚠️  Different error:', insertError.message);
      }
    } else {
      console.log('✅ custom_mock constraint is working!');
      console.log('   Successfully created test_attempt with id:', insertData.id);

      // Clean up
      await supabase
        .from('test_attempts')
        .delete()
        .eq('id', insertData.id);

      console.log('   (Test record cleaned up)');
    }
  }
}

checkConstraint().catch(console.error);
