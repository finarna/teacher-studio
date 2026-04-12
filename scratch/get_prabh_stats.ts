import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users } = await supabase.from('profiles').select('id, name').ilike('name', '%PRABHU%');
  console.log('Users found:', users);
  
  if (users && users.length > 0) {
    const uid = users[0].id;
    const { data: math } = await supabase.from('subject_progress').select('*').eq('user_id', uid).eq('subject', 'Math');
    const { data: chem } = await supabase.from('subject_progress').select('*').eq('user_id', uid).eq('subject', 'Chemistry');
    
    console.log('MATH PROGRESS:', math);
    console.log('CHEM PROGRESS:', chem);
  }
}
check();
