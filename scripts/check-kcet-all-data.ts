import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKCET() {
  console.log('\n🔍 CHECKING ALL KCET DATA\n');

  // Check all KCET scans (any subject)
  const { data: allScans, error } = await supabase
    .from('scans')
    .select('id, name, year, subject, exam_context, is_system_scan')
    .eq('exam_context', 'KCET')
    .order('year', { ascending: false });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${allScans?.length || 0} KCET scans total:\n`);
    allScans?.forEach(s => {
      console.log(`  ${s.is_system_scan ? '✅ SYSTEM' : '⚠️  USER'} | ${s.year || 'NO YEAR'} | ${s.subject || 'NO SUBJECT'} | ${s.name}`);
    });
  }

  // Check KCET historical patterns (any subject)
  const { data: patterns } = await supabase
    .from('exam_historical_patterns')
    .select('year, subject')
    .eq('exam_context', 'KCET')
    .order('year', { ascending: false });

  console.log(`\nFound ${patterns?.length || 0} KCET historical patterns:\n`);
  patterns?.forEach(p => {
    console.log(`  ${p.year} | ${p.subject}`);
  });
}

checkKCET().catch(console.error);
