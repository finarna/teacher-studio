
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectConstraints() {
    console.log('🔍 Inspecting constraints for practice_sessions...');

    // Use RPC if available, or just try to trigger an error to see if it reports the constraint name
    // Actually, we can try to query information_schema if we have permissions
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: `
      SELECT
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          tc.constraint_type
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'practice_sessions' AND tc.table_schema = 'public';
    `
    });

    if (error) {
        console.warn('❌ RPC execute_sql failed (expected if not exists). Trying alternative...');
        // Fallback: try to insert a duplicate if we suspect one
    } else {
        console.table(data);
    }
}

inspectConstraints();
