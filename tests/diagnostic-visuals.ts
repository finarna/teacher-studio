import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkSolutionsAndVisuals() {
    console.log('Fetching scan...');
    const { data: scan, error: scanErr } = await supabaseAdmin.from('scans').select('id, name').order('created_at', { ascending: false }).limit(1).single();
    if (scanErr || !scan) {
        console.error('Failed to get scan', scanErr?.message);
        return;
    }

    console.log(`Scanning Solutions & Visuals Status for: ${scan.name}`);
    console.log(`Scan ID: ${scan.id}\n`);

    const { data: questions, error } = await supabaseAdmin.from('questions').select('id, solution_steps, correct_option_index, sketch_svg_url, topic, metadata').eq('scan_id', scan.id);

    if (error) {
        console.error('Error fetching questions', error.message);
        return;
    }

    if (!questions) return;

    let hasSolutionSteps = 0;
    let hasCorrectOption = 0;
    let hasSketch = 0;

    questions.forEach(q => {
        if (q.solution_steps && q.solution_steps.length > 0) hasSolutionSteps++;
        if (q.correct_option_index !== null && typeof q.correct_option_index !== 'undefined') hasCorrectOption++;
        if (q.sketch_svg_url) hasSketch++;
    });

    console.log(`Total Questions: ${questions.length}`);
    console.log(`✅ Solution Steps Populated: ${hasSolutionSteps}/${questions.length}`);
    console.log(`✅ Correct Options Populated: ${hasCorrectOption}/${questions.length}`);
    console.log(`✅ Sketched/Visuals Generated: ${hasSketch}/${questions.length}\n`);

    // Let's sample a few questions to see if anything is coming in yet
    const sample = questions.filter(q => q.solution_steps?.length > 0 || q.sketch_svg_url || q.correct_option_index !== null).slice(0, 2);
    if (sample.length > 0) {
        console.log(`--- Snapshot of incoming data ---`);
        sample.forEach(q => {
            console.log(`Q: Solution Steps: ${q.solution_steps?.length || 0} | Correct Option Index: ${q.correct_option_index} | Sketch: ${q.sketch_svg_url ? 'Yes' : 'No'}`);
        });
    } else {
        console.log('⏳ Awaiting data... Nothing generated yet.');
    }
}

checkSolutionsAndVisuals();
