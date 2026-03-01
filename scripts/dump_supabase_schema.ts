import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function dumpSchema() {
    console.log('🔍 DUMPING CURRENT DATABASE SCHEMA FROM SUPABASE...\n');

    // Multi-statement SQL via RPC if possible, else multiple calls
    const { data: tables, error: tableError } = await supabase.rpc('exec_sql', {
        query: `
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `
    });

    if (tableError) {
        console.error('❌ Failed to fetch schema via RPC:', tableError.message);

        // Fallback: Try a direct query if table permissions allow
        console.log('🔄 Trying direct query...');
        // Note: Standard Supabase REST API doesn't allow querying information_schema directly
        // Let's try to query some key tables and see the columns
        const keyTables = ['scans', 'questions', 'users', 'profiles', 'test_attempts', 'topic_resources', 'student_performance_profiles'];

        for (const table of keyTables) {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`❌ Table ${table}: ${error.message}`);
            } else if (data && data.length > 0) {
                console.log(`✅ Table ${table} columns:`, Object.keys(data[0]).join(', '));
            } else {
                console.log(`✅ Table ${table} exists but is empty.`);
            }
        }
        return;
    }

    const schema: Record<string, string[]> = {};
    (tables as any[]).forEach(row => {
        if (!schema[row.table_name]) schema[row.table_name] = [];
        schema[row.table_name].push(row.column_name);
    });

    Object.entries(schema).forEach(([tableName, columns]) => {
        console.log(`\n📦 TABLE: ${tableName}`);
        console.log(`   COLUMNS: ${columns.join(', ')}`);
    });
}

dumpSchema();
