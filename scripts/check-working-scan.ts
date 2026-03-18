import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkImages() {
    const scanId = 'c8ad6afc-4b42-48b2-b673-35b37f1aa695';
    console.log(`🔍 Checking Images for Scan ${scanId} (the working one)...`);
    const { data: scan } = await supabaseAdmin
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

    if (!scan) return console.log('Scan not found');

    if (scan.analysis_data && scan.analysis_data.questions) {
        const questionsWithImages = scan.analysis_data.questions.filter(q => q.extractedImages && q.extractedImages.length > 0);
        console.log(`Found ${questionsWithImages.length} questions with extractedImages in JSON blob.`);
    }

    const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('id, text, metadata, sketch_svg_url')
        .eq('scan_id', scanId);

    if (questions) {
        console.log(`Found ${questions.length} questions in table.`);
        const questionsWithImagesMeta = questions.filter(q => q.metadata && (q.metadata.extractedImages || q.metadata.extractedImageUrls));
        console.log(`${questionsWithImagesMeta.length} questions have extractedImages or urls in metadata.`);
    }
}

checkImages().catch(console.error);
