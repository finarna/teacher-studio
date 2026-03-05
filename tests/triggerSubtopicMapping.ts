import { supabaseAdmin } from '../lib/supabaseServer.ts';
import { synthesizeQuestionIntelligence } from '../lib/intelligenceSynthesis.ts';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function runMapping() {
    console.log('Fetching most recent REAL scan...');
    // Filter to get the actual scanned paper we were working on
    const { data: scan } = await supabaseAdmin.from('scans')
        .select('*')
        .ilike('name', '%KCET-Board-Exam%')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!scan) {
        console.log('No real scan found, falling back to latest...');
        const { data: lastScan } = await supabaseAdmin.from('scans').select('*').order('created_at', { ascending: false }).limit(1).single();
        if (!lastScan) return;
        processScan(lastScan);
    } else {
        processScan(scan);
    }
}

async function processScan(scan: any) {
    console.log(`Triggering Force-Subtopic Synthesis for Scan: ${scan.name} (${scan.id})\n`);

    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("Missing Gemini API key in env!");
        return;
    }

    // Fetch ALL questions for this scan
    const { data: questions } = await supabaseAdmin.from('questions')
        .select('*')
        .eq('scan_id', scan.id);

    if (!questions || questions.length === 0) {
        console.log('No questions found.');
        return;
    }

    console.log(`Processing ${questions.length} questions...`);

    let successCount = 0;
    // Process top 10 for now as a test
    const targetQuestions = questions.slice(0, 10);

    for (const q of targetQuestions) {
        const topicName = q.topic || 'General';
        const result = await synthesizeQuestionIntelligence(
            q,
            topicName,
            scan.subject,
            scan.exam_context,
            supabaseAdmin,
            apiKey,
            'gemini-3-flash-preview'
        );

        if (result) {
            successCount++;
            console.log(`✅ Processed ${q.id} - Subtopic: ${result.subtopic || result.metadata?.subtopic}`);
        }

        // Delay to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n============== REPORT ==============`);
    console.log(`✅ Success: ${successCount}/${targetQuestions.length}`);
}

runMapping();
