import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: scans, error: scansError } = await supabase.from('scans').select('id').limit(1);
  if (!scans || scans.length === 0) return console.log("No scan found");
  
  const scanId = scans[0].id;
  
  const q = {
    scan_id: scanId,
    text: 'Test Q',
    options: ['A', 'B', 'C', 'D'],
    correct_option_index: 0,
    marks: 1,
    difficulty: 'Moderate',
    topic: 'Test Topic'
  };
  
  const { data, error } = await supabase.from('questions').insert([q]).select();
  console.log("Error:", error);
}
test().catch(console.error);
