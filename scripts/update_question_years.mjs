import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const scanId = '48aff221-8677-43fb-b018-1eb5417e653c';
const year = '2022';

console.log(`Updating all questions for scan ${scanId} to year ${year}...`);

const { data, error } = await supabase
  .from('questions')
  .update({ year: year })
  .eq('scan_id', scanId)
  .select('id');

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log(`✅ Updated ${data.length} questions to year ${year}`);
}
