import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkScan() {
    console.log('Fetching the most recent scan...');
    const { data: scan, error: scanErr } = await supabaseAdmin
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (scanErr || !scan) {
        console.error('Failed to fetch recent scan:', scanErr?.message || 'Not found');
        return;
    }

    console.log('--- RECENT SCAN STATUS ---');
    console.log(`ID: ${scan.id}`);
    console.log(`Name: ${scan.name}`);
    console.log(`Status: ${scan.status}`);
    console.log(`Subject: ${scan.subject}`);
    console.log(`Exam Context: ${scan.exam_context}`);
    console.log(`System Scan?: ${scan.is_system_scan}`);

    console.log('\n--- FETCHING QUESTIONS ---');
    const { data: questions, error: qErr } = await supabaseAdmin
        .from('questions')
        .select('*')
        .eq('scan_id', scan.id);

    if (qErr) {
        console.error('Failed to fetch questions:', qErr.message);
    } else {
        console.log(`TOTAL QUESTIONS EXTRACTED: ${questions?.length || 0}`);

        let hasLatexIssues = 0;
        let mappedQuestions = 0;
        let reiLogged = 0;
        let missingContent = 0;

        questions?.forEach((q: any) => {
            if (!q.text) {
                missingContent++;
            } else if (typeof q.text === 'string') {
                if (q.text.includes('\\ight') || q.text.includes('egin{')) {
                    hasLatexIssues++;
                }
            } else {
                missingContent++;
            }

            // check mapping
            const subtopic = q.metadata?.subtopic || q.metadata?.subTopic || q.metadata?.['Sub-topic'];
            if (q.topic && subtopic) {
                mappedQuestions++;
            }

            // we check structured data like ai_reasoning, historical_pattern, predictive_insight for REI deeply store
            if (q.ai_reasoning || q.historical_pattern || q.predictive_insight || q.metadata?.complexity_matrix) {
                reiLogged++;
            }
        });

        console.log(`Mapped Questions (has Topic & Subtopic): ${mappedQuestions}/${questions?.length}`);
        console.log(`Questions with Deep REI Intel / Complexity Data: ${reiLogged}/${questions?.length}`);
        console.log(`Questions with missing text: ${missingContent}`);
        console.log(`Questions with potential LaTeX syntax issues: ${hasLatexIssues}`);

        // Print sample of question 1
        if (questions && questions.length > 0) {
            console.log('\n--- SAMPLE QUESTION (First Question) ---');
            console.log(`Topic: ${questions[0].topic}`);
            const firstSubtopic = questions[0].metadata?.subtopic || questions[0].metadata?.subTopic || questions[0].metadata?.['Sub-topic'] || 'N/A';
            console.log(`Subtopic: ${firstSubtopic}`);
            console.log(`Difficulty: ${questions[0].difficulty}`);
            console.log(`AI Reasoning (REI): ${questions[0].ai_reasoning ? 'YES' : 'NO'}`);
            console.log(`Text Snippet: ${typeof questions[0].text === 'string' ? questions[0].text.substring(0, 100).replace(/\n/g, ' ') : 'N/A'}...`);
        }
    }

    console.log('\n--- Checking historical patterns / Publish table ---');
    const { data: pubData } = await supabaseAdmin.from('scan_publish_logs').select('*').eq('scan_id', scan.id);
    if (pubData) {
        console.log(`Publish Logs found: ${pubData.length}`);
    } else {
        console.log(`Publish Logs found: 0 or table does not exist`);
    }

    const { data: appData } = await supabaseAdmin.from('admin_study_logs').select('*').limit(1);
    console.log(`Admin log entries? ${appData ? appData.length : 'none'}`);
}

checkScan().catch(console.error);
