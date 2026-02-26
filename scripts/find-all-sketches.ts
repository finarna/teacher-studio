import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function findAllSketches() {
    console.log('🔍 Checking ALL scans for topicBasedSketches...');
    const { data: scans } = await supabaseAdmin
        .from('scans')
        .select('id, name, analysis_data')
        .not('analysis_data', 'is', null);

    scans?.forEach(scan => {
        if (scan.analysis_data?.topicBasedSketches) {
            console.log(`✅ Scan ${scan.id} (${scan.name}) has topicBasedSketches:`);
            console.log(`   Topics: ${Object.keys(scan.analysis_data.topicBasedSketches).join(', ')}`);
        }
    });

    console.log('\n🔍 Checking ALL questions for sketches...');
    const { data: qSketches } = await supabaseAdmin
        .from('questions')
        .select('id, topic, sketch_svg_url')
        .not('sketch_svg_url', 'is', null);

    console.log(`Found ${qSketches?.length || 0} questions with sketches.`);
    qSketches?.forEach(q => console.log(`- QID: ${q.id} | Topic: ${q.topic}`));
}

findAllSketches().catch(console.error);
