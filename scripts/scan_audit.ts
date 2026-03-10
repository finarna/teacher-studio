import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkScanDistribution() {
    const { data: scans } = await supabaseAdmin.from('scans').select('id, name');
    console.log('Available NEET Scans:', scans);

    for (const scan of scans || []) {
        const { data: questions } = await supabaseAdmin
            .from('questions')
            .select('subject, topic')
            .eq('scan_id', scan.id);

        if (questions && questions.length > 0) {
            console.log(`\n📄 Scan: ${scan.name} (${scan.id}):`);
            const counts = {};
            questions.forEach(q => {
                counts[q.subject] = (counts[q.subject] || 0) + 1;
            });
            console.log('  Distribution:', counts);
        }
    }
}

checkScanDistribution();
