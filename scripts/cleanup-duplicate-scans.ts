/**
 * Clean up duplicate Physics scans with 0 questions
 */

import { supabaseAdmin } from '../lib/supabaseServer';

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate scans...\n');

  try {
    const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

    // Get all scans with 0 questions
    const { data: scans, error } = await supabaseAdmin
      .from('scans')
      .select(`
        id,
        name,
        subject,
        created_at,
        questions:questions(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch scans: ${error.message}`);
    }

    // Filter scans with 0 questions
    const emptyScans = scans?.filter(s => {
      const questionCount = (s as any).questions?.[0]?.count || 0;
      return questionCount === 0;
    }) || [];

    console.log(`Found ${emptyScans.length} scans with 0 questions\n`);

    if (emptyScans.length === 0) {
      console.log('✅ No cleanup needed!');
      return;
    }

    // Group by name to identify duplicates
    const groups: { [key: string]: any[] } = {};
    emptyScans.forEach(scan => {
      if (!groups[scan.name]) {
        groups[scan.name] = [];
      }
      groups[scan.name].push(scan);
    });

    console.log('Duplicate groups found:');
    Object.entries(groups).forEach(([name, scans]) => {
      if (scans.length > 1) {
        console.log(`  "${name}": ${scans.length} copies`);
      }
    });

    // Keep the most recent scan from each group, delete the rest
    const toDelete: string[] = [];
    Object.entries(groups).forEach(([name, scans]) => {
      if (scans.length > 1) {
        // Sort by created_at descending (newest first)
        scans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Keep the first (newest), delete the rest
        console.log(`\n📌 Keeping most recent: ${scans[0].name} (${scans[0].created_at})`);

        for (let i = 1; i < scans.length; i++) {
          toDelete.push(scans[i].id);
          console.log(`  🗑️  Deleting: ${scans[i].created_at}`);
        }
      }
    });

    if (toDelete.length === 0) {
      console.log('\n✅ No duplicates to delete!');
      return;
    }

    console.log(`\n🗑️  Deleting ${toDelete.length} duplicate scans...`);

    // Delete in batches
    const { error: deleteError } = await supabaseAdmin
      .from('scans')
      .delete()
      .in('id', toDelete);

    if (deleteError) {
      throw new Error(`Failed to delete scans: ${deleteError.message}`);
    }

    console.log(`\n✅ Successfully deleted ${toDelete.length} duplicate scans!`);

    // Show final state
    const { data: remaining } = await supabaseAdmin
      .from('scans')
      .select('id, name, subject')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log(`\n📊 Final scan count: ${remaining?.length || 0}`);
    if (remaining && remaining.length > 0) {
      console.log('\nRemaining scans:');
      remaining.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name} (${s.subject})`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

cleanupDuplicates()
  .then(() => {
    console.log('\n✅ Cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
