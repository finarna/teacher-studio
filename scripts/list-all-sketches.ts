import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function listAllTopicSketches() {
    console.log('🔍 Listing ALL topic sketches in database...');
    const { data, error } = await supabaseAdmin
        .from('topic_sketches')
        .select('id, scan_id, topic, title, created_at')
        .order('created_at', { ascending: false });

    if (error) console.error(error);
    console.log(`Found ${data?.length || 0} sketches.`);
    data?.forEach(s => console.log(`- Created: ${s.created_at} | Topic: "${s.topic}" | Scan: ${s.scan_id}`));
}

listAllTopicSketches().catch(console.error);
