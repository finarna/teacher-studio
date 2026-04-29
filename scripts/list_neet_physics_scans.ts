/**
 * List all NEET Physics published scans
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listScans() {
  console.log('📋 Listing all NEET Physics Published Scans\n');
  console.log('='.repeat(80));

  const { data: scans, error } = await supabase
    .from('published_paper_scans')
    .select('id, exam, year, subject, display_name, created_at')
    .eq('exam', 'NEET')
    .order('year', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!scans || scans.length === 0) {
    console.log('\n   No NEET scans found in database');
    return;
  }

  console.log(`\n   Total NEET Scans: ${scans.length}\n`);

  // Group by year and subject
  const byYear = new Map<number, any[]>();

  for (const scan of scans) {
    if (!byYear.has(scan.year)) {
      byYear.set(scan.year, []);
    }
    byYear.get(scan.year)!.push(scan);
  }

  for (const [year, yearScans] of Array.from(byYear.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`\n   Year ${year}:`);
    for (const scan of yearScans) {
      console.log(`      ${scan.id}: ${scan.subject} - ${scan.display_name}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Complete\n');
}

listScans().catch(console.error);
