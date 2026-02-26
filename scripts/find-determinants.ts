import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function findDeterminants() {
    console.log('🔍 Listing all scans with "topicBasedSketches"...');
    const { data: scans } = await supabaseAdmin
        .from('scans')
        .select('id, user_id, is_system_scan, subject, exam_context, analysis_data')
        .not('analysis_data', 'is', null);

    let count = 0;
    scans?.forEach(scan => {
        if (scan.analysis_data?.topicBasedSketches) {
            const topics = Object.keys(scan.analysis_data.topicBasedSketches);
            if (topics.some(t => t.toLowerCase().includes('deter'))) {
                console.log(`✅ Found in Scan ${scan.id}:`);
                console.log(`   - Topics: ${topics.join(', ')}`);
                console.log(`   - Subject: ${scan.subject}, Context: ${scan.exam_context}`);
                console.log(`   - System: ${scan.is_system_scan}, User: ${scan.user_id}`);
                count++;
            }
        }
    });
    console.log(`\nTotal scans with Determinants: ${count}`);
}

findDeterminants().catch(console.error);
