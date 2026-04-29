import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function getScans() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 ALL 2023 NEET SCANS WITH FULL IDs');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, year, is_system_scan, subjects, subject, is_combined_paper')
    .eq('exam_context', 'NEET')
    .eq('year', 2023);

  console.log(`Found ${scans?.length || 0} scans for 2023:\n`);

  for (const scan of scans || []) {
    const { data: qs } = await supabase
      .from('questions')
      .select('id, subject')
      .eq('scan_id', scan.id);

    const qCount = qs ? qs.length : 0;
    const subjectDist: Record<string, number> = {};
    for (const q of qs || []) {
      const subj = q.subject || 'NULL';
      subjectDist[subj] = (subjectDist[subj] || 0) + 1;
    }

    console.log(`📄 ${scan.name}`);
    console.log(`   Full ID: ${scan.id}`);
    console.log(`   System Scan: ${scan.is_system_scan ? '✅' : '❌'}`);
    console.log(`   Combined: ${scan.is_combined_paper ? '✅' : '❌'}`);
    console.log(`   Subject field: ${scan.subject || 'NULL'}`);
    console.log(`   Subjects array: ${JSON.stringify(scan.subjects)}`);
    console.log(`   Questions: ${qCount}`);
    if (qCount > 0) {
      console.log(`   Subject distribution:`);
      for (const [subj, count] of Object.entries(subjectDist).sort((a, b) => b[1] - a[1])) {
        console.log(`      ${subj}: ${count}`);
      }
    }
    console.log('');
  }
}

getScans().catch(console.error);
