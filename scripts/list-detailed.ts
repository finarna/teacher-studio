import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function listAllDetailed() {
    console.log('🔍 Listing ALL topic sketches with detail...');
    const { data, error } = await supabaseAdmin
        .from('topic_sketches')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) console.error(error);
    console.log(`Found ${data?.length || 0} sketches.`);
    data?.forEach(s => {
        console.log(`- [${s.created_at}] Topic: "${s.topic}" | ID: ${s.id} | Scan: ${s.scan_id}`);
    });
}

listAllDetailed().catch(console.error);
