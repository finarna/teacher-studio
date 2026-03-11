import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkNeetSystemScans() {
    console.log('🔍 All NEET scans with is_system_scan=true:\n');

    const { data: scans, error } = await supabaseAdmin
        .from('scans')
        .select('id, name, subject, subjects, year, created_at, user_id, metadata, summary')
        .eq('exam_context', 'NEET')
        .eq('is_system_scan', true);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log(`Total: ${scans?.length || 0} scans\n`);
    scans?.forEach(s => {
        console.log(`ID:       ${s.id}`);
        console.log(`Name:     ${s.name}`);
        console.log(`Subject:  ${s.subject}`);
        console.log(`Subjects: ${JSON.stringify(s.subjects)}`);
        console.log(`Year:     ${s.year}`);
        console.log(`Summary:  ${s.summary}`);
        console.log(`Metadata: ${JSON.stringify(s.metadata)}`);
        console.log(`UserID:   ${s.user_id}`);
        console.log(`Created:  ${s.created_at}`);
        console.log('---');
    });
}

checkNeetSystemScans();
