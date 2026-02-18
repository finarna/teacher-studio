import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const scanId = '48aff221-8677-43fb-b018-1eb5417e653c';
const year = '2022';

console.log(`Setting year to ${year} for scan ${scanId}...`);

const { data, error } = await supabase
  .from('scans')
  .update({ year: year })
  .eq('id', scanId)
  .select();

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ Updated scan year to', year);
  console.log('   Scan:', data[0].subject, data[0].exam_context);
  console.log('   Year:', data[0].year);
  console.log('\n🎉 Your scan will now appear in Past Year Exams under 2022!');
}
