/**
 * List all scans for the user
 */

import { supabaseAdmin } from '../lib/supabaseServer';

async function listScans() {
  try {
    const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';

    const { data: scans, error } = await supabaseAdmin
      .from('scans')
      .select(`
        id,
        name,
        subject,
        status,
        created_at,
        questions:questions(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch scans: ${error.message}`);
    }

    console.log(`\n📊 Found ${scans?.length || 0} scans:\n`);

    if (scans && scans.length > 0) {
      scans.forEach((s, i) => {
        const questionCount = (s as any).questions?.[0]?.count || 0;
        console.log(`${i + 1}. ${s.name}`);
        console.log(`   Subject: ${s.subject}`);
        console.log(`   Status: ${s.status}`);
        console.log(`   Questions: ${questionCount}`);
        console.log(`   Created: ${s.created_at}`);
        console.log(`   ID: ${s.id}\n`);
      });
    } else {
      console.log('No scans found.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

listScans()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
