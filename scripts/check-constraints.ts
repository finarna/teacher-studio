import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkConstraints() {
    console.log('🔍 Checking constraints on topic_sketches...');
    const { data, error } = await supabaseAdmin.rpc('get_table_constraints', { t_name: 'topic_sketches' });

    if (error) {
        console.log('RPC failed, trying direct query...');
        const { data: d2 } = await supabaseAdmin.from('topic_sketches').select('*').limit(1);
        console.log('Current row keys:', d2?.[0] ? Object.keys(d2[0]) : 'No data');
    } else {
        console.log('Constraints:', data);
    }
}

checkConstraints().catch(console.error);
