import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function manualInsert() {
    const scanId = 'dac6f8c8-46a9-4094-83bc-eaaa0afff451';
    console.log(`🧪 Manually inserting Determinants for ${scanId}...`);
    const { data, error } = await supabaseAdmin
        .from('topic_sketches')
        .insert({
            scan_id: scanId,
            topic: 'Determinants',
            title: 'Determinants Study Guide',
            pages: [{ title: 'Intro', pageNumber: 1, imageData: 'fake' }],
            page_count: 1
        });
    if (error) console.error(error);
    else console.log('✅ Manual insert successful');
}

manualInsert().catch(console.error);
