/**
 * Resync all scans to AI tables with normalized topic names
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { syncScanToAITables } from '../lib/syncScanToAITables';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resyncAll() {
  console.log('🔄 Resyncing all scans to AI tables with normalized topic names...\n');

  // Get all scans with year data
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, year, exam_context, subject')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math')
    .not('year', 'is', null)
    .order('year');

  if (!scans || scans.length === 0) {
    console.log('No scans found to resync');
    return;
  }

  console.log(`Found ${scans.length} scans to resync:\n`);
  scans.forEach(s => console.log(`  ${s.year} - ${s.name}`));
  console.log('');

  for (const scan of scans) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Resyncing ${scan.year} - ${scan.name}...`);
    console.log('='.repeat(70));

    try {
      const result = await syncScanToAITables(supabase, scan.id);

      if (result.success) {
        console.log(`✅ Success!`);
        console.log(`   Pattern: ${result.patternId}`);
        console.log(`   Topics: ${result.topicsProcessed}`);
        console.log(`   Distributions: ${result.distributionsCreated}`);
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('\n✅ Resync complete!\n');
  console.log('Check trends API to verify:');
  console.log('  curl http://localhost:9001/api/trends/historical/KCET/Math | jq\n');
}

resyncAll()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
