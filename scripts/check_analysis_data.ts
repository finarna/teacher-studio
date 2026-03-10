import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkAnalysisData() {
    const scanId = 'b19037fb-980a-41e1-89a0-d28a5e1c0033'; // 2024 NEET Combined
    const { data: scan } = await supabaseAdmin.from('scans').select('analysis_data').eq('id', scanId).single();

    if (!scan || !scan.analysis_data) {
        console.log('❌ No scan or analysis_data found.');
        return;
    }

    const { questions } = scan.analysis_data;
    if (!questions) {
        console.log('❌ No questions in analysis_data.');
        return;
    }

    const stats = {};
    questions.forEach((q: any) => {
        stats[q.subject] = (stats[q.subject] || 0) + 1;
    });

    console.log(`📊 Analysis Data for NEET 2024 (ID: ${scanId}):`);
    console.log('Question distribution in JSON array:', stats);
}

checkAnalysisData();
