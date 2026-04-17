import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('scan_id', 'eba5ed94-dde7-4171-80ff-aecbf0c969f7')
    .limit(1);

  if (error) {
    console.log('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Available columns:');
    console.log(Object.keys(data[0]).sort().join('\n'));
  }
}

checkSchema();
