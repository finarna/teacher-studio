/**
 * Find all NEET scan IDs from 2021-2025
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findAllNEETScans() {
  console.log('\n🔍 FINDING ALL NEET SCAN IDs (2021-2025)\n');
  console.log('='.repeat(70));

  // Query questions table to find all distinct scan_ids with NEET data
  const { data: questions, error } = await supabase
    .from('questions')
    .select('scan_id, year, subject')
    .gte('year', 2021)
    .lte('year', 2025);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!questions || questions.length === 0) {
    console.log('⚠️  No questions found');
    return;
  }

  // Group by year and scan_id
  const scansByYear: Record<number, Set<string>> = {};
  const scanDetails: Record<string, { year: number; subjects: Set<string>; count: number }> = {};

  questions.forEach(q => {
    if (!q.year || !q.scan_id) return;

    if (!scansByYear[q.year]) {
      scansByYear[q.year] = new Set();
    }
    scansByYear[q.year].add(q.scan_id);

    if (!scanDetails[q.scan_id]) {
      scanDetails[q.scan_id] = { year: q.year, subjects: new Set(), count: 0 };
    }
    scanDetails[q.scan_id].subjects.add(q.subject || 'Unknown');
    scanDetails[q.scan_id].count++;
  });

  // Display results
  console.log('\n📋 SCAN IDs BY YEAR:\n');

  for (const year of [2021, 2022, 2023, 2024, 2025]) {
    const scans = Array.from(scansByYear[year] || []);
    console.log(`📅 ${year}: ${scans.length} scan(s)`);

    scans.forEach(scanId => {
      const details = scanDetails[scanId];
      const subjects = Array.from(details.subjects).join(', ');
      console.log(`   ${scanId}`);
      console.log(`      Subjects: ${subjects}`);
      console.log(`      Questions: ${details.count}`);
    });
    console.log();
  }

  // Generate code snippet
  console.log('\n📝 CODE SNIPPET FOR SCAN IDs:\n');
  console.log('const NEET_SCANS = {');
  for (const year of [2021, 2022, 2023, 2024, 2025]) {
    const scans = Array.from(scansByYear[year] || []);
    if (scans.length > 0) {
      console.log(`  ${year}: '${scans[0]}',`);
    }
  }
  console.log('};');
}

findAllNEETScans()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
