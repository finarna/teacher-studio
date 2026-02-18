/**
 * Fix: Add year field to existing Biology scan
 *
 * The Biology scan uploaded today doesn't have a year field,
 * so it won't show in Learning Journey Past Year Exams.
 *
 * This script extracts the year from the filename and updates the scan.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || (!supabaseKey && !supabaseServiceKey)) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Use service role key if available for admin access, otherwise anon key
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);

async function fixBiologyScanYear() {
  console.log('🔧 Fixing Biology Scan Year Field\n');
  console.log('='.repeat(60));

  try {
    // Find recent Biology scans without year field
    const { data: scans, error } = await supabase
      .from('scans')
      .select('id, name, created_at, year')
      .eq('subject', 'Biology')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Query error:', error.message);
      process.exit(1);
    }

    if (!scans || scans.length === 0) {
      console.log('⚠️  No Biology scans found');
      process.exit(0);
    }

    console.log(`\n📋 Found ${scans.length} Biology scan(s):\n`);

    let updatedCount = 0;

    for (const scan of scans) {
      const hasYear = scan.year !== null && scan.year !== undefined;

      console.log(`📄 ${scan.name}`);
      console.log(`   ID: ${scan.id}`);
      console.log(`   Current year: ${scan.year || '(none)'}`);
      console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}`);

      if (hasYear) {
        console.log(`   ✅ Already has year field - skipping\n`);
        continue;
      }

      // Extract year from scan name
      const yearMatch = scan.name.match(/20\d{2}|19\d{2}/);
      const extractedYear = yearMatch ? yearMatch[0] : null;

      if (!extractedYear) {
        console.log(`   ⚠️  Could not extract year from name - skipping\n`);
        continue;
      }

      console.log(`   📅 Extracted year: ${extractedYear}`);

      // Update the scan
      const { error: updateError } = await supabase
        .from('scans')
        .update({ year: extractedYear })
        .eq('id', scan.id);

      if (updateError) {
        console.log(`   ❌ Update failed: ${updateError.message}\n`);
      } else {
        console.log(`   ✅ Updated successfully!\n`);
        updatedCount++;
      }
    }

    console.log('='.repeat(60));
    console.log(`\n📊 Summary: Updated ${updatedCount} scan(s)`);

    if (updatedCount > 0) {
      console.log('\n✅ Biology scans should now appear in Learning Journey!');
      console.log('   Refresh the page to see the updated stats.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBiologyScanYear();
