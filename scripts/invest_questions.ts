import { supabaseAdmin } from './lib/supabaseServer.ts';

async function investQuestions() {
    const { data: scans } = await supabaseAdmin
        .from('scans')
        .select('id, name, year, analysis_data')
        .in('year', ['2021', '2023']);

    scans.forEach(s => {
        console.log(`Scan: ${s.name} (${s.year})`);
        const q0 = s.analysis_data?.questions?.[0];
        console.log(`Question 1:`, q0 ? { topic: q0.topic, text: q0.text?.substring(0, 50) } : 'NONE');
        console.log(`Question count in analysis_data:`, s.analysis_data?.questions?.length || 0);
    });
}

investQuestions();
