import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function find2021Scan() {
    const { data: scans } = await supabaseAdmin
        .from('scans')
        .select('id, name, year, is_system_scan')
        .ilike('name', '%2021%');
    console.log('Scans with 2021 in name:', scans);

    // Also check all NEET scans without filtration
    const { data: neet } = await supabaseAdmin
        .from('scans')
        .select('id, name, year, is_system_scan')
        .eq('exam_context', 'NEET');
    console.log('All NEET scans:', neet);
}

find2021Scan();
