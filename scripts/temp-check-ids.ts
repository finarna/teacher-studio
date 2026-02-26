import { supabaseAdmin } from './lib/supabaseServer.js';

async function run() {
    const { data: scans } = await supabaseAdmin.from('scans').select('id, subject, user_id').order('created_at', { ascending: false }).limit(1);
    if (!scans || scans.length === 0) { console.log('No scans found'); return; }

    const scanId = scans[0].id;
    const userId = scans[0].user_id;

    const { data: questions } = await supabaseAdmin.from('questions').select('id, topic').eq('scan_id', scanId).limit(1);
    if (!questions || questions.length === 0) { console.log('No questions for scan ' + scanId); return; }

    console.log(JSON.stringify({
        scanId: scanId,
        userId: userId,
        subject: scans[0].subject,
        questionId: questions[0].id,
        topic: questions[0].topic
    }));
}

run().catch(console.error);
