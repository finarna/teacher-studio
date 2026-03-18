import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function inspectAnalysisData(scanId: string) {
    const { data: scan } = await supabaseAdmin
        .from('scans')
        .select('analysis_data')
        .eq('id', scanId)
        .single();

    if (scan && scan.analysis_data) {
        console.log(`Questions keys: ${Object.keys(scan.analysis_data.questions[0])}`);
        console.log(`Q1 Text sample: ${scan.analysis_data.questions[0].text.substring(0, 500)}`);
        
        // Check for any unusually large fields
        const q0 = scan.analysis_data.questions[0];
        for (const [key, value] of Object.entries(q0)) {
            const size = JSON.stringify(value).length;
            if (size > 1000) {
                console.log(`Field "${key}" is large: ${size} chars`);
            }
        }
    }
}

const id = process.argv[2] || '8fe5ed6a-529c-438e-b30b-b0001970c28d';
inspectAnalysisData(id).catch(console.error);
