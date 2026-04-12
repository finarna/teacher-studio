
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkPhysics() {
  console.log('📡 Checking for Physics KCET Scans...');
  
  const { data, error } = await supabase
    .from('scans')
    .select('id, name, subject, year')
    .eq('subject', 'Physics')
    .ilike('name', '%KCET%');

  if (error) {
    console.error('Error fetching Physics scans:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No dedicated Physics KCET scans found in the "scans" table.');
    return;
  }

  console.log(`✅ Found ${data.length} Physics KCET scans:`);
  data.forEach(s => console.log(`- [${s.id}] ${s.name} (${s.year})`));
}

checkPhysics().catch(console.error);
