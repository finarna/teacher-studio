import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkRecentScans() {
    console.log('🔍 Checking recent scans in Supabase\n');

    const { data: scans, error } = await supabase
        .from('scans')
        .select('id, name, subject, status, is_system_scan, analysis_data')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    const scanIds = scans.map(s => s.id);

    // Check topic_sketches table for these scans
    const { data: topicSketches, error: tsError } = await supabase
        .from('topic_sketches')
        .select('id, scan_id, topic')
        .in('scan_id', scanIds);

    if (tsError) {
        console.error('❌ TS Error:', tsError);
    }

    for (const scan of scans) {
        const questions = scan.analysis_data?.questions || [];
        const sketchesMeta = scan.analysis_data?.topicBasedSketches || {};
        const dbSketches = (topicSketches || []).filter(ts => ts.scan_id === scan.id);

        console.log(`📄 Scan: ${scan.name}`);
        console.log(`   ID: ${scan.id}`);
        console.log(`   Is System: ${scan.is_system_scan}`);
        console.log(`   Questions in analysis_data: ${questions.length}`);
        console.log(`   Topics in topicBasedSketches (meta/legacy): ${Object.keys(sketchesMeta).length}`);
        console.log(`   Topic sketches in DB table: ${dbSketches.length}`);
        if (dbSketches.length > 0) {
            console.log(`   Topics found: ${dbSketches.map(s => s.topic).join(', ')}`);
        }
        console.log('-'.repeat(40));
    }
}

checkRecentScans();
