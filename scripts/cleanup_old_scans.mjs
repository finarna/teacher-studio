/**
 * Delete all scans except the latest published ones
 * Keeps only the most recent scan per subject+exam combination
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupOldScans() {
  console.log('🧹 Cleaning up old scans...\n');

  // Get all published scans
  const { data: allScans, error } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, year, created_at, is_system_scan')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching scans:', error);
    return;
  }

  console.log(`📊 Total scans: ${allScans.length}`);
  console.log(`   Published: ${allScans.filter(s => s.is_system_scan).length}`);
  console.log(`   Unpublished: ${allScans.filter(s => !s.is_system_scan).length}\n`);

  // Group by subject + exam_context
  const groups = {};
  allScans.forEach(scan => {
    const key = `${scan.subject}-${scan.exam_context}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(scan);
  });

  console.log('📋 Scans by subject:');
  Object.entries(groups).forEach(([key, scans]) => {
    console.log(`   ${key}: ${scans.length} scans`);
  });

  // Determine which scans to keep
  const toKeep = [];
  const toDelete = [];

  Object.entries(groups).forEach(([key, scans]) => {
    // Sort by created_at descending (newest first)
    scans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Keep latest 2 published scans per subject+exam
    const published = scans.filter(s => s.is_system_scan);
    const unpublished = scans.filter(s => !s.is_system_scan);

    if (published.length > 0) {
      // Keep latest 2 published
      toKeep.push(...published.slice(0, 2));
      toDelete.push(...published.slice(2));

      // Delete all unpublished for this subject
      toDelete.push(...unpublished);
    } else {
      // No published scans, keep latest 1 unpublished
      toKeep.push(unpublished[0]);
      toDelete.push(...unpublished.slice(1));
    }
  });

  console.log(`\n📊 Cleanup plan:`);
  console.log(`   Keep: ${toKeep.length} scans`);
  console.log(`   Delete: ${toDelete.length} scans\n`);

  if (toDelete.length === 0) {
    console.log('✅ No scans to delete!');
    return;
  }

  // Show what will be deleted
  console.log('🗑️  Scans to be deleted:');
  toDelete.forEach(scan => {
    console.log(`   - [${scan.subject}/${scan.exam_context}] ${scan.name.substring(0, 60)}... (${scan.created_at.substring(0, 10)})`);
  });

  // Confirm deletion
  console.log('\n⚠️  This will delete these scans and all related questions, flashcards, etc.');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Delete scans
  const scanIdsToDelete = toDelete.map(s => s.id);

  console.log('🗑️  Deleting scans...');

  const { error: deleteError } = await supabase
    .from('scans')
    .delete()
    .in('id', scanIdsToDelete);

  if (deleteError) {
    console.error('❌ Error deleting scans:', deleteError);
    return;
  }

  console.log(`✅ Deleted ${toDelete.length} scans successfully!`);

  // Show what's left
  console.log('\n📊 Remaining scans:');
  toKeep.forEach(scan => {
    const status = scan.is_system_scan ? '✅ Published' : '📝 Draft';
    console.log(`   ${status} [${scan.subject}/${scan.exam_context}] ${scan.name.substring(0, 60)}...`);
  });

  console.log(`\n🎉 Done! Reduced from ${allScans.length} to ${toKeep.length} scans.`);
}

cleanupOldScans();
