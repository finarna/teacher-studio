import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkScans() {
    const { data: scans, error } = await supabaseAdmin
        .from('scans')
        .select('*')
        .eq('exam_context', 'NEET');

    if (error) {
        console.error('Error fetching scans:', error);
        return;
    }

    console.log('NEET Scans:');
    scans.forEach(s => {
        console.log(`- ID: ${s.id}, Name: "${s.name}", Subject: "${s.subject}"`);
    });
}

checkScans();
