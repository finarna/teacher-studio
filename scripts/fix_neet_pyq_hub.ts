import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function fixNeetPYQHub() {
    console.log('🛠️ Correcting NEET PYQ Hub to ONLY show published 2021 paper...');

    // 1. Mark EVERYTHING as non-system for NEET first to clean up
    await supabaseAdmin
        .from('scans')
        .update({ is_system_scan: false, year: null })
        .eq('exam_context', 'NEET');

    // 2. Map the "NEET Combined Paper [12:31]" to 2021 as the official published paper
    const scanId = 'b19037fb-980a-41e1-89a0-d28a5e1c0033';
    const { error } = await supabaseAdmin
        .from('scans')
        .update({
            year: 2021,
            is_system_scan: true,
            subjects: ["Physics", "Chemistry", "Botany", "Zoology"]
        })
        .eq('id', scanId);

    if (error) {
        console.error('❌ Error updating 2021 NEET scan:', error.message);
    } else {
        console.log(`✅ Successfully set Scan [12:31] as the OFFICIAL 2021 NEET Published Paper.`);
        console.log(`✅ All other NEET scans hiding from the System PYQ Hub.`);
    }
}

fixNeetPYQHub();
