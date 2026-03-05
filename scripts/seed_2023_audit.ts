
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import { auditPaperHistoricalContext, persistAuditToHistoricalPattern } from '../lib/aiPaperAuditor';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

const ACTUAL_TEXT_PATH = 'actual_2023_text.txt';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

async function seed2023Signature() {
    console.log('🧠 Running AI Auditor on Actual 2023 Paper...');

    const text = fs.readFileSync(ACTUAL_TEXT_PATH, 'utf-8');

    const audit = await auditPaperHistoricalContext(
        text,
        'KCET',
        'Math',
        2023,
        GEMINI_API_KEY!
    );

    if (!audit) {
        console.error('❌ Audit failed');
        return;
    }

    console.log('✅ Audit Complete:', JSON.stringify(audit, null, 2));

    // Ensure the historical pattern record exists for 2023
    const { data: existingPattern } = await supabase
        .from('exam_historical_patterns')
        .select('id')
        .eq('year', 2023)
        .eq('exam_context', 'KCET')
        .eq('subject', 'Math')
        .single() as any;

    let patternId;
    if (!existingPattern) {
        console.log('📝 Creating 2023 Historical Pattern record...');
        const { data: newPattern, error: createError } = await supabase
            .from('exam_historical_patterns')
            .insert({
                year: 2023,
                exam_context: 'KCET',
                subject: 'Math',
                total_marks: 60,
                difficulty_easy_pct: 30,
                difficulty_moderate_pct: 45,
                difficulty_hard_pct: 25
            })
            .select()
            .single() as any;

        if (createError) throw createError;
        patternId = newPattern.id;
    } else {
        patternId = existingPattern.id;
    }

    await persistAuditToHistoricalPattern(supabase, patternId, audit);
    console.log('🚀 2023 Signature seeded into REI Database.');
}

seed2023Signature().catch(console.error);
