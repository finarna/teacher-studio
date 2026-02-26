import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function findInQuestions() {
    console.log('🔍 Checking questions table for Determinants sketches...');
    const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('id, topic, text, sketch_svg_url, diagram_url, scan_id')
        .ilike('topic', '%deter%')
        .or('sketch_svg_url.not.is.null,diagram_url.not.is.null');

    console.log(`Found ${questions?.length || 0} questions with sketches for Determinants.`);
    questions?.forEach(q => {
        console.log(`- QID: ${q.id}, Topic: ${q.topic}, Text: ${q.text?.substring(0, 50)}`);
        console.log(`  Sketch: ${q.sketch_svg_url ? 'YES' : 'NO'}, Diagram: ${q.diagram_url ? 'YES' : 'NO'}`);
    });
}

findInQuestions().catch(console.error);
