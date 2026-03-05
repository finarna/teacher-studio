
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { auditPaperHistoricalContext } from '../lib/aiPaperAuditor';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

async function audit2025() {
    const fullText = fs.readFileSync('./actual_2025_text.txt', 'utf8');

    console.log('🧠 Running AI Auditor on Actual 2025 Paper...');
    const audit = await auditPaperHistoricalContext(
        fullText,
        'KCET',
        'Math',
        2025,
        API_KEY!
    );

    if (audit) {
        console.log('✅ Audit Complete:', JSON.stringify(audit, null, 2));

        // Persist to DB
        const { data: pattern, error: fetchError } = await supabase
            .from('exam_historical_patterns')
            .select('id')
            .eq('exam_context', 'KCET')
            .eq('subject', 'Math')
            .eq('year', 2025)
            .single();

        if (pattern) {
            await supabase.from('exam_historical_patterns').update({
                board_signature: audit.boardSignature,
                intent_signature: audit.intentSignature,
                evolution_note: audit.evolutionNote,
                rigor_detected: audit.rigorDetected,
                difficulty_hard_pct: audit.idsActual > 0.9 ? 35 : (audit.idsActual > 0.8 ? 25 : 15) // Approximate
            }).eq('id', pattern.id);
            console.log('✅ 2025 Signature persisted to DB.');
        } else {
            // Create if not exists
            await supabase.from('exam_historical_patterns').insert({
                exam_context: 'KCET',
                subject: 'Math',
                year: 2025,
                board_signature: audit.boardSignature,
                intent_signature: audit.intentSignature,
                evolution_note: audit.evolutionNote,
                rigor_detected: audit.rigorDetected,
                difficulty_hard_pct: audit.idsActual > 0.9 ? 35 : (audit.idsActual > 0.8 ? 25 : 15)
            });
            console.log('✅ 2025 Signature created in DB.');
        }
    }
}

audit2025().catch(console.error);
