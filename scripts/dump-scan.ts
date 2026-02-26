import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function dumpScan() {
    const scanId = '64bad474-f61f-4b4f-8f17-7ebf232e4c83';
    const { data: scan } = await supabaseAdmin
        .from('scans')
        .select('analysis_data')
        .eq('id', scanId)
        .single();

    console.log(JSON.stringify(scan?.analysis_data, null, 2));
}

dumpScan().catch(console.error);
