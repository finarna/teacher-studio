import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function logLatexIssues() {
    console.log('Fetching the most recent scan...');
    const { data: scan } = await supabaseAdmin.from('scans').select('id, name').order('created_at', { ascending: false }).limit(1).single();
    if (!scan) return;

    console.log(`Checking LaTeX issues for scan: ${scan.name} (${scan.id})`);

    const { data: questions } = await supabaseAdmin.from('questions').select('id, question_number, text').eq('scan_id', scan.id);

    let count = 0;
    questions?.forEach(q => {
        if (typeof q.text === 'string') {
            if (q.text.includes('\\ight') || q.text.includes('egin{')) {
                count++;
                console.log(`\n============== Q#${q.question_number || 'Unknown'} (${q.id}) ==============`);
                let snippet = q.text.substring(0, 300);
                if (snippet.length === 300) snippet += '...';
                console.log(snippet);
            }
        }
    });

    console.log(`\nTotal questions with LaTeX syntax issues: ${count}`);
}

logLatexIssues();
