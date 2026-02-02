/**
 * Update the most recent scan's subject from Physics to Math
 */

import { supabaseAdmin } from '../lib/supabaseServer';

async function updateRecentScanSubject() {
  console.log('🔄 Finding and updating most recent scan...\n');

  try {
    // Find the most recent scan for user
    const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379'; // prabhubp@gmail.com

    const { data: scans, error: fetchError } = await supabaseAdmin
      .from('scans')
      .select('id, name, subject, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) {
      throw new Error(`Failed to fetch scans: ${fetchError.message}`);
    }

    if (!scans || scans.length === 0) {
      console.log('❌ No scans found for this user');
      return;
    }

    console.log(`Found ${scans.length} recent scans:\n`);
    scans.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name}`);
      console.log(`   Subject: ${s.subject}`);
      console.log(`   ID: ${s.id}`);
      console.log(`   Created: ${s.created_at}\n`);
    });

    // Find Physics scans
    const physicsScans = scans.filter(s => s.subject === 'Physics');

    if (physicsScans.length === 0) {
      console.log('✅ No Physics scans found - nothing to update');
      return;
    }

    console.log(`\n🔧 Updating ${physicsScans.length} Physics scan(s) to Math...\n`);

    // Update all Physics scans to Math
    for (const scan of physicsScans) {
      const { error: updateError } = await supabaseAdmin
        .from('scans')
        .update({ subject: 'Math' })
        .eq('id', scan.id);

      if (updateError) {
        console.error(`❌ Failed to update ${scan.name}:`, updateError.message);
      } else {
        console.log(`✅ Updated: ${scan.name}`);
        console.log(`   Physics → Math`);
      }
    }

    console.log('\n🎉 All Physics scans updated to Math!');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the update
updateRecentScanSubject()
  .then(() => {
    console.log('\n✅ Update completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });
