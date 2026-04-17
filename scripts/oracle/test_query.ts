import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testQuery() {
  const { data: questions, error } = await supabase
    .from('questions')
    .select('text, topic, difficulty, options, correct_answer, solution')
    .eq('scan_id', 'eba5ed94-dde7-4171-80ff-aecbf0c969f7')
    .order('display_order');

  console.log('Error:', error);
  console.log('Data count:', questions?.length);
}

testQuery();
