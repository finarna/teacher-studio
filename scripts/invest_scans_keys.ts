import { supabaseAdmin } from './lib/supabaseServer.ts';

async function investScans() {
    const { data: scans } = await supabaseAdmin
        .from('scans')
        .select('id, name, year, analysis_data')
        .in('year', ['2021', '2023']);

    scans.forEach(s => {
        console.log(`Scan: ${s.name} (${s.year})`);
        console.log(`Keys:`, Object.keys(s.analysis_data || {}));
        if (s.analysis_data?.topicWeightage) {
            console.log(`topicWeightage:`, s.analysis_data.topicWeightage.slice(0, 2));
        }
        if (s.analysis_data?.topic_weightage) {
            console.log(`topic_weightage:`, s.analysis_data.topic_weightage.slice(0, 2));
        }
    });
}

investScans();
