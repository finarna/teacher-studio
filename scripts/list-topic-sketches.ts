import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function listTopicSketches() {
    console.log('🔍 Listing all topic sketches in database...');
    const { data: sketches } = await supabaseAdmin
        .from('topic_sketches')
        .select('*')
        .limit(20);

    sketches?.forEach(s => {
        console.log(`- ID: ${s.id} | Topic: ${s.topic} | Scan: ${s.scan_id}`);
    });
}

listTopicSketches().catch(console.error);
