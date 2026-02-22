import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data } = await supabase.from('topic_resources').select('study_stage').limit(100);
    const stages = new Set();
    data?.forEach(d => stages.add(d.study_stage));
    console.log("Existing stages:", Array.from(stages));
}
test();
