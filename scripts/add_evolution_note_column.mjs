
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addColumn() {
    const sql = "ALTER TABLE exam_historical_patterns ADD COLUMN IF NOT EXISTS evolution_note TEXT;";
    console.log(`Executing: ${sql}`);

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Error adding column:', error);
        console.log('You might need to add this manually via the Supabase dashboard:');
        console.log('ALTER TABLE exam_historical_patterns ADD COLUMN evolution_note TEXT;');
    } else {
        console.log('✅ Successfully added evolution_note column to exam_historical_patterns');
    }
}

addColumn();
