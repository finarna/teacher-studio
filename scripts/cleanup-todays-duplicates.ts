/**
 * Clean up duplicate Physics scans created today (2024_physics [18:22])
 */

import { supabaseAdmin } from '../lib/supabaseServer';

async function cleanupTodaysDuplicates() {
  console.log('🧹 Cleaning up today\'s duplicate scans...\n');

  try {
    const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

    // Get all scans created today with name containing "2024_physics"
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

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
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch scans: ${error.message}`);
    }

    console.log(`📊 Found ${scans?.length || 0} scans created today\n`);

    if (!scans || scans.length === 0) {
      console.log('✅ No scans to clean up!');
      return;
    }

    // Group by name to identify duplicates
    const groups: { [key: string]: any[] } = {};
    scans.forEach(scan => {
      if (!groups[scan.name]) {
        groups[scan.name] = [];
      }
      groups[scan.name].push(scan);
    });

    console.log('Duplicate groups found:');
    Object.entries(groups).forEach(([name, scanList]) => {
      if (scanList.length > 1) {
        console.log(`  "${name}": ${scanList.length} copies`);
      }
    });

    // For each group, keep the most recent scan with questions, delete the rest
    const toDelete: string[] = [];
    Object.entries(groups).forEach(([name, scanList]) => {
      if (scanList.length > 1) {
        // Sort by created_at descending (newest first)
        scanList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Find the first scan with questions, or just keep the newest
        const scanWithQuestions = scanList.find(s => (s as any).questions?.[0]?.count > 0);
        const keepScan = scanWithQuestions || scanList[0];

        console.log(`\n📌 Keeping: ${keepScan.name} (${keepScan.created_at})`);
        console.log(`   Questions: ${(keepScan as any).questions?.[0]?.count || 0}`);

        // Mark all others for deletion
        scanList.forEach(scan => {
          if (scan.id !== keepScan.id) {
            toDelete.push(scan.id);
            console.log(`  🗑️  Deleting: ${scan.created_at} (Questions: ${(scan as any).questions?.[0]?.count || 0})`);
          }
        });
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
      .select('id, name, subject, created_at')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false });

    console.log(`\n📊 Remaining scans from today: ${remaining?.length || 0}`);
    if (remaining && remaining.length > 0) {
      console.log('\nRemaining scans:');
      remaining.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name} (${s.subject}) - ${s.created_at}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

cleanupTodaysDuplicates()
  .then(() => {
    console.log('\n✅ Cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
