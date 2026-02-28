
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    const { data, error } = await supabase.from('exam_historical_patterns').select('*').limit(1);
    if (error) {
        console.log('Error fetching:', error);
    } else {
        console.log('Columns found:', Object.keys(data[0] || {}).join(', '));
    }
}
checkSchema();
