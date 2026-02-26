import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkScanData() {
    const scanId = '64bad474-f61f-4b4f-8f17-7ebf232e4c83';
    console.log(`🔍 Checking Scan ${scanId}...`);
    const { data: scan } = await supabaseAdmin
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

    if (!scan) return console.log('Scan not found');

    console.log('--- analysis_data keys ---');
    if (scan.analysis_data) {
        console.log(Object.keys(scan.analysis_data));
        if (scan.analysis_data.topicBasedSketches) {
            console.log('topicBasedSketches:', Object.keys(scan.analysis_data.topicBasedSketches));
        }
    }

    console.log('\n--- Checking topic_sketches for this scan ID ---');
    const { data: tSketches } = await supabaseAdmin
        .from('topic_sketches')
        .select('*')
        .eq('scan_id', scanId);

    console.log(`Found ${tSketches?.length || 0} topic sketches in table.`);
    tSketches?.forEach(s => console.log(`- Topic: ${s.topic}`));

    console.log('\n--- Checking questions for this scan ID ---');
    const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('id, topic, sketch_svg_url')
        .eq('scan_id', scanId);
    console.log(`Found ${questions?.length || 0} questions.`);
}

checkScanData().catch(console.error);
