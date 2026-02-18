import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const scanId = '48aff221-8677-43fb-b018-1eb5417e653c';

const { data, error } = await supabase
  .from('questions')
  .select('*')
  .eq('scan_id', scanId);

console.log('Scan ID:', scanId);
console.log('Question count:', data?.length || 0);

if (error) {
  console.log('Error:', error);
}

if (data && data.length > 0) {
  console.log('\nFirst question:');
  console.log('  ID:', data[0].id);
  console.log('  Text:', data[0].question_text.substring(0, 60) + '...');
  console.log('  Topic:', data[0].topic);
  console.log('  Domain:', data[0].domain);

  // Check mappings
  const { data: mappings } = await supabase
    .from('topic_question_mapping')
    .select('topic_id')
    .eq('question_id', data[0].id);

  console.log('  Has mapping:', (mappings?.length || 0) > 0);
}
