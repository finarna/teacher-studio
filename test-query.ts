import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: q1 } = await supabase.from('questions').select('text, id').limit(1);
    console.log('Question from table:', q1?.[0]?.text?.substring(0, 100));

    const { data: q2 } = await supabase.from('scans').select('analysis_data').not('analysis_data', 'is', null).limit(1);
    console.log('Question from scan JSON:', q2?.[0]?.analysis_data?.questions?.[0]?.text?.substring(0, 100));
}
check();
