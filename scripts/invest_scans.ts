import { supabaseAdmin } from './lib/supabaseServer.ts';

async function investScans() {
    const { data: scans } = await supabaseAdmin
        .from('scans')
        .select('id, name, year, exam_context, subject, analysis_data')
        .eq('exam_context', 'KCET')
        .eq('subject', 'Math');

    console.log('KCET Math Scans:', JSON.stringify(scans.map(s => ({
        id: s.id,
        name: s.name,
        year: s.year,
        topicWeightage: s.analysis_data?.topicWeightage || s.analysis_data?.topic_weightage || 'NONE'
    })), null, 2));
}

investScans();
