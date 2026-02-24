import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function run() {
  const { data, error } = await supabase.from('pg_tables').select('*');
  if (error) {
    const { data: qData, error: qError } = await supabase.rpc('get_tables');
    if (qError) {
      // Just try to fetch from information_schema via RPC or just query auth.users?
      console.log('Cant list tables easily without rpc');
    } else {
      console.log(qData);
    }
  } else {
    console.log(data);
  }
}
run();
