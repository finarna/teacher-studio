import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkScanSubjects() {
    console.log('🔍 Checking scan subjects...');
    const { data } = await supabaseAdmin.from('scans').select('subject').limit(10);
    console.log('Subjects in scans:', Array.from(new Set(data?.map(s => s.subject))));
}

checkScanSubjects().catch(console.error);
