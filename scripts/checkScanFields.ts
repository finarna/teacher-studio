import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkFields() {
  const scanId = 'bd210344-5d6b-4229-93b9-e49d7b5095ea';

  const { data } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  console.log('\n📋 All fields in scan record:\n');
  console.log(JSON.stringify(data, null, 2));
}

checkFields();
