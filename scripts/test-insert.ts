import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function testInsert() {
    console.log('🧪 Testing Insert into topic_sketches...');
    const scanId = '74c928d7-4225-4991-84a9-6d0a6349d510'; // From screenshot
    const { data, error } = await supabaseAdmin
        .from('topic_sketches')
        .upsert({
            scan_id: scanId,
            topic: 'Debug Test',
            title: 'Debug Test',
            pages: [],
            page_count: 0
        });

    if (error) {
        console.error('❌ Insert failed:', error);
    } else {
        console.log('✅ Insert successful');
    }
}

testInsert().catch(console.error);
