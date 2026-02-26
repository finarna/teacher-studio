import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkBadId() {
    console.log('🔍 Checking for [object Object] scan IDs...');
    const { data: sketches, error } = await supabaseAdmin
        .from('topic_sketches')
        .select('*')
        .eq('scan_id', '[object Object]');

    if (error) console.error(error);
    console.log(`Found ${sketches?.length || 0} sketches with bad ID.`);
    sketches?.forEach(s => console.log(`- Topic: ${s.topic}`));
}

checkBadId().catch(console.error);
