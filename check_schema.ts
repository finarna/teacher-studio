
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkSchema() {
    const { data, error } = await supabase.from('exam_topic_distributions').select('*').limit(1);
    console.log('Sample Row:', data);
}
checkSchema();
