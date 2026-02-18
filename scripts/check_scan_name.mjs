/**
 * Check Biology Scan Name Field
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkScanName() {
  console.log('🔍 Checking Biology scan fields...\n');

  const { data: scans, error } = await supabase
    .from('scans')
    .select('*')
    .eq('id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📋 Scan fields:');
  console.log('   ID:', scans.id);
  console.log('   name:', scans.name);
  console.log('   file_name:', scans.file_name);
  console.log('   year:', scans.year);
  console.log('   subject:', scans.subject);
  console.log('   exam_context:', scans.exam_context);
  console.log('   is_system_scan:', scans.is_system_scan);
  console.log('   created_at:', scans.created_at);
  console.log('\n📊 All columns:', Object.keys(scans));
}

checkScanName();
