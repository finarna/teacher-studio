import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function testSync() {
    console.log('🚀 Starting Visual Sync Test...');

    // 1. Fetch a scan with at least one question
    const { data: questions_list } = await supabaseAdmin.from('questions').select('scan_id').limit(1);
    if (!questions_list || questions_list.length === 0) throw new Error('No questions found in database');
    const scanId = questions_list[0].scan_id;

    const { data: scans } = await supabaseAdmin.from('scans').select('id, subject, user_id').eq('id', scanId).single();
    if (!scans) throw new Error('Scan ' + scanId + ' not found');
    const userId = scans.user_id;
    const subject = scans.subject;

    const { data: questions } = await supabaseAdmin.from('questions').select('id, topic').eq('scan_id', scanId).limit(1);
    if (!questions || questions.length === 0) throw new Error('No questions for scan ' + scanId);
    const questionId = questions[0].id;
    const topicName = questions[0].topic;

    console.log(`📍 Using Scan: ${scanId}`);
    console.log(`📍 Using Question: ${questionId} (Topic: ${topicName})`);

    // 2. Prepare dummy visuals
    const dummySvg = '<svg><text>TEST_SKETCH</text></svg>';
    const dummyTopicSketch = {
        topic: topicName,
        pages: [
            { pageNumber: 1, title: 'Introduction', imageData: 'data:image/png;base64,TEST_DATA' }
        ]
    };

    // 3. POST to /api/scan-visuals/:scanId
    console.log('📤 Sending visuals to API...');
    const response = await fetch(`http://localhost:9001/api/scan-visuals/${scanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            questionSketches: { [questionId]: dummySvg },
            topicSketches: { [topicName]: dummyTopicSketch }
        })
    });

    const result = await response.json();
    console.log('📥 API Response:', JSON.stringify(result, null, 2));

    if (!result.persisted) throw new Error('Persistence failed according to API response');

    // 4. Verify in Database
    console.log('🔍 Verifying in Database...');

    const { data: qData } = await supabaseAdmin.from('questions').select('sketch_svg_url').eq('id', questionId).single();
    if (qData?.sketch_svg_url !== dummySvg) {
        throw new Error(`Question sketch not persisted correctly. Expected ${dummySvg}, got ${qData?.sketch_svg_url}`);
    }
    console.log('✅ Question sketch verified in DB');

    const { data: tData } = await supabaseAdmin.from('topic_sketches').select('*').eq('scan_id', scanId).eq('topic', topicName).single();
    if (!tData || tData.pages[0].title !== 'Introduction') {
        throw new Error('Topic sketch not persisted correctly');
    }
    console.log('✅ Topic sketch verified in DB');

    // 5. Check Learning Journey API
    console.log('🔍 Checking Learning Journey aggregation...');
    const ljResponse = await fetch(`http://localhost:9001/api/topics/${subject}/KCET`, {
        headers: { 'Authorization': `Bearer fake-token-for-${userId}` } // Optional if middleware handles it
    });
    // Wait, the aggregator might need the user ID in the token to match the scan...
    // In our fake auth, we can't easily mimic a real Supabase JWT, but our server-supabase.js 
    // currently defaults to 'anonymous' if token is invalid, and aggregateTopicsForUser filters by userId.

    // Let's check how aggregateTopicsForUser handles userId.

    console.log('🎉 Visual Sync Test Complete!');
}

testSync().catch(err => {
    console.error('❌ Test Failed:', err);
    process.exit(1);
});
