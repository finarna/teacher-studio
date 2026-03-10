import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function listNeetScans() {
    const { data: scans } = await supabaseAdmin
        .from('scans')
        .select('id, name, year, is_system_scan')
        .eq('exam_context', 'NEET');
    console.log(scans);
}

listNeetScans();
