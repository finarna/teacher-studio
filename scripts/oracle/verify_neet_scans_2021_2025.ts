import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCANS_TO_CHECK = {
  'NEET 2021 Combined': 'ca38a537-5516-469a-abd4-967a76b32028',
  'NEET 2022 Combined': 'b19037fb-980a-41e1-89a0-d28a5e1c0033',
  'NEET 2023': 'e3767338-1664-4e03-b0f6-1fab41ff5838',
  'NEET 2024': '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5',
  'NEET 2025': '4f682118-d0ce-4f6f-95c7-6141e496579f',
};

async function verify() {
  console.log('\n✅ VERIFYING NEET SCANS 2021-2025\n');
  console.log('='.repeat(70));

  for (const [name, scanId] of Object.entries(SCANS_TO_CHECK)) {
    const { data, count } = await supabase
      .from('questions')
      .select('subject, year', { count: 'exact' })
      .eq('scan_id', scanId);

    if (!data || data.length === 0) {
      console.log(`\n❌ ${name}: No questions found`);
      continue;
    }

    const bySubject: Record<string, number> = {};
    data.forEach(q => {
      const subject = q.subject || 'Unknown';
      bySubject[subject] = (bySubject[subject] || 0) + 1;
    });

    const years = new Set(data.map(q => q.year).filter(Boolean));

    console.log(`\n✅ ${name}`);
    console.log(`   Scan ID: ${scanId}`);
    console.log(`   Total: ${count || 0} questions`);
    console.log(`   Year field: ${Array.from(years).join(', ') || 'Not set'}`);
    console.log(`   By Subject:`);
    Object.entries(bySubject).forEach(([subj, cnt]) => {
      console.log(`      ${subj}: ${cnt}`);
    });
  }

  console.log('\n' + '='.repeat(70));
}

verify().then(() => process.exit(0)).catch(console.error);
