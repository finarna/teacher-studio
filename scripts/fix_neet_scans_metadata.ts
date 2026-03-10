import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function fixNeetScans() {
    console.log('🛠️ Fixing NEET Scans metadata for PYQ Hub...');

    // 1. "NEET  Combined Paper [12:31]" -> 2024
    const { error: err1 } = await supabaseAdmin
        .from('scans')
        .update({
            year: 2024,
            is_system_scan: true,
            subjects: ["Physics", "Chemistry", "Botany", "Zoology"]
        })
        .eq('id', 'b19037fb-980a-41e1-89a0-d28a5e1c0033');

    // 2. "2022_NEET [09:05]" -> 2022
    const { error: err2 } = await supabaseAdmin
        .from('scans')
        .update({
            year: 2022,
            is_system_scan: true
        })
        .eq('id', '14b834fb-532b-48a8-8b9d-b3a6ce4ea7c8');

    // 3. "NEET  Combined Paper [09:52]" -> 2023
    const { error: err3 } = await supabaseAdmin
        .from('scans')
        .update({
            year: 2023,
            is_system_scan: true,
            subjects: ["Physics", "Chemistry", "Botany", "Zoology"]
        })
        .eq('id', 'd22af736-65f4-4ee4-8f05-3d6ea8e1f407');

    if (err1 || err2 || err3) {
        console.error('❌ Error updating scans:', { err1, err2, err3 });
    } else {
        console.log('✅ NEET scans updated successfully with correct years and system status.');
    }
}

fixNeetScans();
