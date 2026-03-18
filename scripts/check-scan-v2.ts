import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkScan(scanId: string) {
    console.log(`🔍 Checking Scan ${scanId}...`);
    const { data: scan } = await supabaseAdmin
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

    if (!scan) return console.log('Scan not found');

    console.log(`Name: ${scan.name}`);
    console.log(`Status: ${scan.status}`);
    
    if (scan.analysis_data && scan.analysis_data.questions) {
        console.log(`Questions in analysis_data: ${scan.analysis_data.questions.length}`);
        const withImages = scan.analysis_data.questions.filter(q => q.extractedImages && q.extractedImages.length > 0);
        console.log(`Questions with images in analysis_data: ${withImages.length}`);
        if (withImages.length > 0) {
            console.log(`Sample image preview: ${withImages[0].extractedImages[0].substring(0, 50)}...`);
        }
    }

    const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('id, text, metadata, sketch_svg_url')
        .eq('scan_id', scanId);

    if (questions) {
        console.log(`Questions in table: ${questions.length}`);
    }
}

const id = process.argv[2] || '8fe5ed6a-529c-438e-b30b-b0001970c28d';
checkScan(id).catch(console.error);
