import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function debugVisuals() {
    console.log('🔍 Debugging Visuals for Determinants...');

    const topicName = 'Determinants';

    console.log('--- Checking topic_sketches table ---');
    const { data: tSketches, error: tError } = await supabaseAdmin
        .from('topic_sketches')
        .select('*')
        .ilike('topic', `%${topicName}%`);

    if (tError) console.error('tError:', tError);
    console.log(`Found ${tSketches?.length || 0} topic sketches matching "${topicName}"`);
    tSketches?.forEach(s => {
        console.log(`- ID: ${s.id}, Topic: ${s.topic}, ScanID: ${s.scan_id}, Pages: ${s.pages?.length}`);
    });

    console.log('\n--- Checking scans table for those Scan IDs ---');
    const scanIds = tSketches?.map(s => s.scan_id) || [];
    if (scanIds.length > 0) {
        const { data: scans } = await supabaseAdmin
            .from('scans')
            .select('id, user_id, is_system_scan, subject, exam_context')
            .in('id', scanIds);
        scans?.forEach(sc => {
            console.log(`- ScanID: ${sc.id}, System: ${sc.is_system_scan}, User: ${sc.user_id}, Subject: ${sc.subject}, Context: ${sc.exam_context}`);
        });
    }

    console.log('\n--- Checking topic_resources table ---');
    const { data: tResources } = await supabaseAdmin
        .from('topic_resources')
        .select('*')
        .ilike('topic_name', `%${topicName}%`)
        .limit(5);

    tResources?.forEach(tr => {
        console.log(`- TR ID: ${tr.topic_id}, Name: ${tr.topic_name}, Subject: ${tr.subject}`);
    });
}

debugVisuals().catch(console.error);
