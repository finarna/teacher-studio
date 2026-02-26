import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkScanMeta() {
    const scanId = 'dac6f8c8-46a9-4094-83bc-eaaa0afff451';
    const { data } = await supabaseAdmin.from('scans').select('id, subject, exam_context, is_system_scan, user_id').eq('id', scanId).single();
    console.log(JSON.stringify(data, null, 2));
}

checkScanMeta().catch(console.error);
