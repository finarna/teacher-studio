import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkMetadata(scanId: string) {
    const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('id, metadata, sketch_svg_url')
        .eq('scan_id', scanId);

    if (questions) {
        console.log(`Checking ${questions.length} questions...`);
        questions.forEach((q, i) => {
            const extImages = q.metadata?.extractedImages;
            console.log(`Q${i+1} (${q.id}): extImages exists: ${!!extImages}, count: ${extImages?.length || 0}`);
            if (extImages && extImages.length > 0) {
              console.log(`   Sample: ${extImages[0].substring(0, 30)}...`);
            }
        });
    }
}

const id = process.argv[2] || '8fe5ed6a-529c-438e-b30b-b0001970c28d';
checkMetadata(id).catch(console.error);
