import { supabaseAdmin } from './lib/supabaseServer.ts';

async function checkScan() {
    const scanId = 'eba5ed94-dde7-4171-80ff-aecbf0c969f7';
    console.log(`🔍 Checking scan_id ${scanId} in topic_sketches...`);
    const { data: topicSketches, error: tsError } = await supabaseAdmin
        .from('topic_sketches')
        .select('*')
        .eq('scan_id', scanId);

    if (tsError) console.error(tsError);
    console.log(`Found ${topicSketches?.length || 0} topic_sketches for this scan.`);
    topicSketches?.forEach(s => console.log(`- Topic: ${s.topic}`));

    console.log(`\n🔍 Checking scan_id ${scanId} in questions...`);
    const { data: questions, error: qError } = await supabaseAdmin
        .from('questions')
        .select('id, question_order, sketch_svg_url, topic')
        .eq('scan_id', scanId)
        .not('sketch_svg_url', 'is', null);

    if (qError) console.error(qError);
    console.log(`Found ${questions?.length || 0} questions with sketch_svg_url.`);
    questions?.forEach(q => console.log(`- Q Order: ${q.question_order}, Topic: ${q.topic}, Sketch: ${q.sketch_svg_url?.substring(0, 50)}...`));

    // Also check analysis_data
    const { data: scan } = await supabaseAdmin.from('scans').select('analysis_data').eq('id', scanId).single();
    const adQuestionsCount = scan?.analysis_data?.questions?.length || 0;
    console.log(`\n📊 Scan analysis_data.questions count: ${adQuestionsCount}`);
}

checkScan().catch(console.error);
