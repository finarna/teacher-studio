import { supabaseAdmin } from '../lib/supabaseServer.ts';

const SCAN_ID = 'b19037fb-980a-41e1-89a0-d28a5e1c0033'; // 2021 NEET Published

async function resyncSubjectsFromAnalysisData() {
    console.log('🔍 Fetching analysis_data from the published 2021 NEET scan...');

    const { data: scan } = await supabaseAdmin
        .from('scans')
        .select('analysis_data')
        .eq('id', SCAN_ID)
        .single();

    const questions = scan?.analysis_data?.questions || [];
    if (questions.length === 0) {
        console.error('❌ No questions found in analysis_data!');
        return;
    }

    // Check what subjects exist in analysis_data
    const adStats: Record<string, number> = {};
    questions.forEach((q: any) => {
        const s = q.subject || 'Unknown';
        adStats[s] = (adStats[s] || 0) + 1;
    });
    console.log('\n📊 analysis_data subject distribution (GROUND TRUTH):', adStats);

    // Fetch all DB questions for this scan
    const { data: dbQuestions } = await supabaseAdmin
        .from('questions')
        .select('id, subject, question_order, metadata')
        .eq('scan_id', SCAN_ID)
        .order('question_order', { ascending: true });

    if (!dbQuestions || dbQuestions.length === 0) {
        console.error('❌ No questions found in DB for this scan!');
        return;
    }

    const dbStats: Record<string, number> = {};
    dbQuestions.forEach((q: any) => { dbStats[q.subject] = (dbStats[q.subject] || 0) + 1; });
    console.log('📊 Current DB subject distribution (WRONG):', dbStats);

    // Match by question_order (most reliable)
    let updated = 0;
    let noMatch = 0;

    for (const dbQ of dbQuestions) {
        const order = dbQ.question_order;
        const adQ = questions[order]; // Direct index match by order

        if (!adQ) {
            // Try matching by appId in metadata
            const appId = dbQ.metadata?.appId;
            const fallback = questions.find((q: any) => q.id === appId);
            if (fallback && fallback.subject && fallback.subject !== dbQ.subject) {
                const { error } = await supabaseAdmin
                    .from('questions')
                    .update({ subject: fallback.subject })
                    .eq('id', dbQ.id);
                if (!error) updated++;
            } else {
                noMatch++;
            }
            continue;
        }

        const correctSubject = adQ.subject;
        if (correctSubject && correctSubject !== dbQ.subject) {
            const { error } = await supabaseAdmin
                .from('questions')
                .update({ subject: correctSubject })
                .eq('id', dbQ.id);
            if (!error) updated++;
        }
    }

    // Verify
    const { data: finalQ } = await supabaseAdmin
        .from('questions')
        .select('subject')
        .eq('scan_id', SCAN_ID);

    const finalStats: Record<string, number> = {};
    finalQ?.forEach((q: any) => { finalStats[q.subject] = (finalStats[q.subject] || 0) + 1; });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Resynced subjects from analysis_data ground truth');
    console.log(`   Updated: ${updated} questions | No match: ${noMatch}`);
    console.log('Final DB subject distribution:', finalStats);
    console.log('='.repeat(60));
}

resyncSubjectsFromAnalysisData();
