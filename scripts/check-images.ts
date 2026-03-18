import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkImages() {
    const scanId = '965b1ae5-e15a-4865-8790-91b4ab44479c';
    console.log(`🔍 Checking Images for Scan ${scanId}...`);
    const { data: scan } = await supabaseAdmin
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

    if (!scan) return console.log('Scan not found');

    console.log('--- scan.analysis_data.questions check ---');
    if (scan.analysis_data && scan.analysis_data.questions) {
        const questionsWithImages = scan.analysis_data.questions.filter(q => q.extractedImages && q.extractedImages.length > 0);
        console.log(`Found ${questionsWithImages.length} questions with extractedImages in JSON blob.`);
        if (questionsWithImages.length > 0) {
            console.log(`Sample images length for Q${questionsWithImages[0].id}: ${questionsWithImages[0].extractedImages[0].length} chars`);
        }
    } else {
        console.log('No analysis_data or questions in scan.');
    }

    console.log('\n--- questions table check ---');
    const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('id, text, metadata, sketch_svg_url')
        .eq('scan_id', scanId);

    if (questions) {
        console.log(`Found ${questions.length} questions in table.`);
        const questionsWithImagesMeta = questions.filter(q => q.metadata && q.metadata.extractedImages);
        console.log(`${questionsWithImagesMeta.length} questions have extractedImages in metadata.`);
        
        const questionsWithSketches = questions.filter(q => q.sketch_svg_url);
        console.log(`${questionsWithSketches.length} questions have sketch_svg_url.`);
    }
}

checkImages().catch(console.error);
