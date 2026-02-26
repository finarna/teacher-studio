import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkSchema() {
    console.log('🔍 Checking schema of topic_sketches...');
    const { data: cols, error: err1 } = await supabaseAdmin.rpc('get_table_info', { table_name: 'topic_sketches' });
    if (err1) {
        // If RPC doesn't exist, try a direct query to information_schema
        const { data, error } = await supabaseAdmin.from('topic_sketches').select('*').limit(1);
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table empty, cannot infer columns from data.');
        }
    } else {
        console.log('Info:', cols);
    }
}

checkSchema().catch(console.error);
