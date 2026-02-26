import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkScan() {
    const scanId = 'dac6f8c8-46a9-4094-83bc-eaaa0afff451';
    console.log(`🔍 Checking scan_id ${scanId} in topic_sketches...`);
    const { data, error } = await supabaseAdmin
        .from('topic_sketches')
        .select('*')
        .eq('scan_id', scanId);

    if (error) console.error(error);
    console.log(`Found ${data?.length || 0} sketches for this scan.`);
    data?.forEach(s => console.log(`- Topic: ${s.topic}`));
}

checkScan().catch(console.error);
