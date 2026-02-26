import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function verifyDeterminants() {
    console.log('🔍 Searching for "Determinants" in topic_sketches...');
    const { data, error } = await supabaseAdmin
        .from('topic_sketches')
        .select('*')
        .ilike('topic', '%Determinants%');

    if (error) console.error(error);
    console.log(`Found ${data?.length || 0} sketches.`);
    data?.forEach(s => {
        console.log(`- ID: ${s.id} | Topic: "${s.topic}" | Created: ${s.created_at} | Scan: ${s.scan_id}`);
    });
}

verifyDeterminants().catch(console.error);
