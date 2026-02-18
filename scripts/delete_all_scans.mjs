/**
 * Delete ALL scans from the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteAllScans() {
  console.log('🗑️  DELETING ALL SCANS...\n');

  // Get all scans
  const { data: allScans, error } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, is_system_scan');

  if (error) {
    console.error('❌ Error fetching scans:', error);
    return;
  }

  console.log(`📊 Total scans to delete: ${allScans.length}`);
  console.log(`   Published: ${allScans.filter(s => s.is_system_scan).length}`);
  console.log(`   Unpublished: ${allScans.filter(s => !s.is_system_scan).length}\n`);

  if (allScans.length === 0) {
    console.log('✅ No scans to delete!');
    return;
  }

  console.log('⚠️  WARNING: This will delete ALL scans and related data:');
  console.log('   - All questions');
  console.log('   - All flashcards');
  console.log('   - All topic sketches');
  console.log('   - All practice answers');
  console.log('   - All topic mappings\n');

  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Delete all scans
  console.log('🗑️  Deleting all scans...');

  const { error: deleteError } = await supabase
    .from('scans')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)

  if (deleteError) {
    console.error('❌ Error deleting scans:', deleteError);
    return;
  }

  console.log(`✅ Deleted all ${allScans.length} scans successfully!`);
  console.log('\n🎉 Database is now clean.');
}

deleteAllScans();
