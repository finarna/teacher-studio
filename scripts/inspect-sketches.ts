import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function inspectSketches() {
    const scanIds = [
        'dac6f8c8-46a9-4094-83bc-eaaa0afff451', '64bad474-f61f-4b4f-8f17-7ebf232e4c83',
        '4f4b4577-25f2-47d4-9b1b-48e3e6d4b105', '09a2363a-5641-40c4-8fe4-cb885d85f7dc',
        '95977600-3e8f-4428-ac0a-0418e25d04a9', 'b3caa641-7496-443a-b230-90d03c1d68d8',
        '80173184-cdb4-461d-a12b-7a3a708db443', '07c0bd39-a05d-49d3-b426-99e744fda9c7',
        '3f37213d-775a-4b3e-80dc-6010e95cbaee', '45616bb8-d5b6-47f7-8560-eacf84e99dfb',
        '74c928d7-4225-4991-84a9-6d0a6349d510'
    ];

    console.log(`🔍 Inspecting sketches for ${scanIds.length} scans...`);

    const { data: sketches, error } = await supabaseAdmin
        .from('topic_sketches')
        .select('id, scan_id, topic, title, page_count')
        .in('scan_id', scanIds);

    if (error) {
        console.error('Error fetching sketches:', error);
        return;
    }

    console.log(`Found ${sketches?.length || 0} sketches in the table.`);
    sketches?.forEach(s => {
        console.log(`- ID: ${s.id} | Topic: "${s.topic}" | Title: "${s.title}" | Pages: ${s.page_count} | Scan: ${s.scan_id}`);
    });
}

inspectSketches().catch(console.error);
