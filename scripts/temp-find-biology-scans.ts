import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findBiologyScans() {
  console.log('🔍 Looking for Official KCET Biology Papers (2021-2025)...\n');

  // Check scans table for Biology papers
  const { data: scans, error } = await supabase
    .from('scans')
    .select('id, name, year, subject, exam_context, created_at, is_system_scan')
    .eq('exam_context', 'KCET')
    .or('subject.eq.Biology,name.ilike.%biology%')
    .gte('year', 2021)
    .lte('year', 2025)
    .order('year');

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (!scans || scans.length === 0) {
    console.log('❌ No Biology KCET scans found for 2021-2025');
    console.log('\nChecking all KCET scans...');

    const { data: allScans } = await supabase
      .from('scans')
      .select('id, name, year, subject, exam_context')
      .eq('exam_context', 'KCET')
      .order('year');

    if (allScans && allScans.length > 0) {
      console.log(`\nFound ${allScans.length} KCET scans:`);
      const bySubject = allScans.reduce((acc: any, s: any) => {
        const subj = s.subject || 'Unknown';
        acc[subj] = (acc[subj] || 0) + 1;
        return acc;
      }, {});

      Object.entries(bySubject).forEach(([subj, count]) => {
        console.log(`  ${subj}: ${count}`);
      });

      console.log('\nSample KCET scans by year:');
      const byYear: any = {};
      allScans.forEach(s => {
        if (!byYear[s.year]) byYear[s.year] = [];
        byYear[s.year].push(s);
      });

      Object.keys(byYear).sort().forEach(year => {
        console.log(`\n  Year ${year}:`);
        byYear[year].forEach((s: any) => {
          console.log(`    - ${s.name} (${s.subject})`);
        });
      });
    }
  } else {
    console.log(`✅ Found ${scans.length} Biology KCET scans:\n`);

    for (const scan of scans) {
      // Get question count for this scan
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('scan_id', scan.id);

      console.log(`Year ${scan.year}: ${scan.name}`);
      console.log(`  Scan ID: ${scan.id}`);
      console.log(`  System Scan: ${scan.is_system_scan ? 'Yes' : 'No'}`);
      console.log(`  Questions: ${count || 0}`);
      console.log(`  Created: ${scan.created_at}`);
      console.log();
    }
  }

  process.exit(0);
}

findBiologyScans().catch(console.error);
