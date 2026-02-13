import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('Checking questions table...\n');

  const { data, error, count } = await supabase
    .from('questions')
    .select('id, topic, subject', { count: 'exact' })
    .limit(5);

  console.log('Count:', count);
  console.log('Error:', error);
  console.log('Sample data:', JSON.stringify(data, null, 2));
}

check();
