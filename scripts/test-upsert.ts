import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function testUpsert() {
    const scanId = 'dac6f8c8-46a9-4094-83bc-eaaa0afff451';
    console.log(`🧪 Testing Upsert into topic_sketches for ${scanId}...`);

    const topicName = 'Determinants';
    const { data, error } = await supabaseAdmin
        .from('topic_sketches')
        .upsert({
            scan_id: scanId,
            topic: topicName,
            title: topicName,
            pages: [{ pageNumber: 1, title: 'Test', imageData: 'data:image/png;base64,xxx' }],
            page_count: 1,
            updated_at: new Date().toISOString()
        }, { onConflict: 'scan_id,topic' });

    if (error) {
        console.error('❌ Upsert failed:', error);
    } else {
        console.log('✅ Upsert successful:', data);
    }
}

testUpsert().catch(console.error);
