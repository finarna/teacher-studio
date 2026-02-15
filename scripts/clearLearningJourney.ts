/**
 * Clear Learning Journey - Reset for Testing
 *
 * This script:
 * 1. Removes all topic-question mappings
 * 2. Unpublishes all scans
 * 3. Gives you a clean slate to test publish workflow
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearLearningJourney() {
  console.log('\n🧹 CLEARING LEARNING JOURNEY\n');
  console.log('='.repeat(70));

  try {
    // Step 1: Count existing mappings
    const { count: beforeCount } = await supabase
      .from('topic_question_mapping')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Current state:`);
    console.log(`   Topic-question mappings: ${beforeCount || 0}`);

    // Step 2: Count published scans
    const { count: publishedCount } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('is_system_scan', true);

    console.log(`   Published scans: ${publishedCount || 0}`);

    // Step 3: Delete all topic-question mappings
    console.log(`\n🗑️  Removing all topic-question mappings...`);
    const { error: deleteError } = await supabase
      .from('topic_question_mapping')
      .delete()
      .neq('question_id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting mappings:', deleteError);
    } else {
      console.log(`✅ Removed ${beforeCount || 0} mappings`);
    }

    // Step 4: Unpublish all scans
    console.log(`\n🔒 Unpublishing all scans...`);
    const { error: unpublishError } = await supabase
      .from('scans')
      .update({ is_system_scan: false })
      .eq('is_system_scan', true);

    if (unpublishError) {
      console.error('Error unpublishing scans:', unpublishError);
    } else {
      console.log(`✅ Unpublished ${publishedCount || 0} scans`);
    }

    // Step 5: Verify clean state
    const { count: afterMappings } = await supabase
      .from('topic_question_mapping')
      .select('*', { count: 'exact', head: true });

    const { count: afterPublished } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('is_system_scan', true);

    console.log(`\n✅ Clean state verified:`);
    console.log(`   Topic-question mappings: ${afterMappings || 0}`);
    console.log(`   Published scans: ${afterPublished || 0}`);

    console.log(`\n🎉 Learning Journey cleared!`);
    console.log(`\nNext steps:`);
    console.log(`1. Go to Admin Scan Approval UI`);
    console.log(`2. Click "Publish to System" on any scan`);
    console.log(`3. Questions will auto-map and appear in Learning Journey`);
    console.log(`4. Verify by going to Learning Journey tab`);

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

clearLearningJourney();
