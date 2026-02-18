/**
 * Mark Biology scans as system scans so they're visible to all users
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function markBiologyAsSystemScans() {
  console.log('🔧 Marking Biology Scans as System Scans\n');
  console.log('='.repeat(60));

  try {
    // Find all Biology scans that are NOT system scans yet
    const { data: scans, error: fetchError } = await supabase
      .from('scans')
      .select('id, name, subject, is_system_scan')
      .eq('subject', 'Biology')
      .eq('is_system_scan', false);

    if (fetchError) {
      console.error('❌ Query error:', fetchError.message);
      process.exit(1);
    }

    if (!scans || scans.length === 0) {
      console.log('✅ All Biology scans are already marked as system scans!');
      process.exit(0);
    }

    console.log(`\n📋 Found ${scans.length} Biology scan(s) that need to be marked:\n`);

    scans.forEach((scan, idx) => {
      console.log(`${idx + 1}. ${scan.name.substring(0, 60)}`);
    });

    console.log('\n🔄 Updating scans to is_system_scan = TRUE...\n');

    // Update all Biology scans to be system scans
    const { data: updated, error: updateError } = await supabase
      .from('scans')
      .update({ is_system_scan: true })
      .eq('subject', 'Biology')
      .eq('is_system_scan', false)
      .select('id, name');

    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      process.exit(1);
    }

    console.log('='.repeat(60));
    console.log(`\n✅ Success! Updated ${updated?.length || 0} Biology scan(s)`);
    console.log('\n📊 These scans are now visible to ALL users in Learning Journey!');
    console.log('   Refresh the page to see them in Past Year Exams.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

markBiologyAsSystemScans();
