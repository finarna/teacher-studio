
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import { auditPaperHistoricalContext, persistAuditToHistoricalPattern } from '../lib/aiPaperAuditor';

dotenv.config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const supabase = createClient(
    (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

const ACTUAL_TEXT_PATH = './actual_2024_text.txt';
const ORACLE_PATH = './KCET_MATH_2024_PREDICTED_ORACLE.md';

async function main() {
    if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY not set');
        return;
    }

    const actualText = fs.readFileSync(ACTUAL_TEXT_PATH, 'utf-8');
    const oracleContent = fs.readFileSync(ORACLE_PATH, 'utf-8');

    console.log('🧠 Auditing 2024 Actual Paper...');
    const audit = await auditPaperHistoricalContext(
        actualText,
        'KCET',
        'Math',
        2024,
        GEMINI_API_KEY
    );

    if (audit) {
        console.log('✅ Audit Complete:', JSON.stringify(audit, null, 2));

        // Find or create the historical pattern record for 2024
        const { data: existingPattern } = await supabase
            .from('exam_historical_patterns')
            .select('id')
            .eq('year', 2024)
            .eq('exam_context', 'KCET')
            .eq('subject', 'Math')
            .single() as any;

        let patternId;
        if (!existingPattern) {
            console.log('📝 Creating 2024 Historical Pattern record...');
            const { data: newPattern, error: createError } = await supabase
                .from('exam_historical_patterns')
                .insert({
                    year: 2024,
                    exam_context: 'KCET',
                    subject: 'Math',
                    total_marks: 60,
                    difficulty_easy_pct: 35,
                    difficulty_moderate_pct: 45,
                    difficulty_hard_pct: 20
                })
                .select()
                .single() as any;

            if (createError) {
                console.error('❌ Failed to create pattern:', createError);
            } else {
                patternId = newPattern.id;
            }
        } else {
            patternId = existingPattern.id;
        }

        if (patternId) {
            await persistAuditToHistoricalPattern(supabase, patternId, audit);
        }
    }

    console.log('📊 Comparing Oracle vs Actual 2024...');
    const ai = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
  You are an expert exam analyst.
  I am providing you with the text of the ACTUAL KCET 2024 Math paper and my AI's PREDICTED "Oracle" paper for 2024.
  
  TASK:
  1. Analyze the ACTUAL 2024 paper to get topic distribution (Integrals, Calculus, Algebra, etc.).
  2. Map out the Difficulty Profile of the ACTUAL paper.
  3. Compare the ACTUAL paper with the PREDICTED Oracle paper.
  4. Calculate a "Hit Rate" (0-100%) based on:
     - Topic Distribution accuracy.
     - Specific "Twists" predicted vs actual (e.g., did we predict a functional identity and did it appear?).
     - Rigor alignment.
  
  Return a detailed markdown report for the user.
  
  --- ACTUAL 2024 TEXT ---
  ${actualText}
  
  --- PREDICTED ORACLE PAPER 2024 ---
  ${oracleContent}
  `;

    const result = await model.generateContent(prompt);
    const report = result.response.text();

    fs.writeFileSync('REI_v3_ORACLE_VS_ACTUAL_2024_REPORT.md', report);
    console.log('✅ Comparison report generated: REI_v3_ORACLE_VS_ACTUAL_2024_REPORT.md');
}

main().catch(console.error);
