
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'questions' });
    if (error) {
        console.log('RPC failed, trying information_schema...');
        const { data: cols, error: err } = await supabase.from('questions').select('id, text, solution_steps').limit(1);
        if (err) {
            console.error('Error fetching questions:', err);
        } else if (cols && cols.length > 0) {
            console.log('Columns fetched via select(*):', Object.keys(cols[0]));
        } else {
            console.log('No rows in questions table to inspect columns via select(*)');
        }
    } else {
        console.log('Columns:', data);
    }
}

checkColumns();
