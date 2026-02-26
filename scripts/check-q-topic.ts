import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkQuestions() {
    const scanId = '64bad474-f61f-4b4f-8f17-7ebf232e4c83';
    const { data: q } = await supabaseAdmin
        .from('questions')
        .select('topic')
        .eq('scan_id', scanId)
        .limit(1);

    console.log('Topic in Questions:', q?.[0]?.topic);
}

checkQuestions().catch(console.error);
