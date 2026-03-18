import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkJsonSize() {
    const scanId = '965b1ae5-e15a-4865-8790-91b4ab44479c';
    const { data: scan } = await supabaseAdmin
        .from('scans')
        .select('analysis_data')
        .eq('id', scanId)
        .single();

    if (scan && scan.analysis_data) {
        const jsonString = JSON.stringify(scan.analysis_data);
        console.log(`Scan ${scanId} analysis_data length: ${jsonString.length} chars (~${(jsonString.length / 1024).toFixed(2)} KB)`);
        
        const qCount = scan.analysis_data.questions?.length || 0;
        const qWithImages = scan.analysis_data.questions?.filter(q => q.extractedImages && q.extractedImages.length > 0) || [];
        console.log(`Questions: ${qCount}, Questions with images: ${qWithImages.length}`);
    }
}

checkJsonSize().catch(console.error);
