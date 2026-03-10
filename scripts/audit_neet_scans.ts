import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function auditScans() {
    const { data: scans } = await supabaseAdmin
        .from('scans')
        .select('id, name, subject, subjects, is_combined_paper')
        .eq('exam_context', 'NEET');

    console.log('--- NEET Scans ---');
    scans?.forEach(s => {
        console.log(`Scan: "${s.name}" (ID: ${s.id})`);
        console.log(`  Subject: ${s.subject}`);
        console.log(`  Subjects Array: ${JSON.stringify(s.subjects)}`);
        console.log(`  is_combined_paper: ${s.is_combined_paper}`);
    });
}

auditScans();
