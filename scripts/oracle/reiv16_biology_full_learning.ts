
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { auditPaperHistoricalContext } from '../../lib/aiPaperAuditor';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const EXAM_CONTEXT = 'KCET';
const SUBJECT = 'Biology';

const SCAN_MAP: Record<number, string> = {
    2022: "e77cbf8c-d656-44c4-aee0-cd9f2c6a8cd0",
    2023: "e0c4af04-797f-4d76-9d42-b43bc11850fb",
    2024: "8c789668-46f8-4a7d-800c-196ec5b2f73a",
    2025: "6f10ca9c-8431-466c-becf-1dc8ec8f6446"
};

async function runFullLearning() {
    console.log(`🚀 REI v16.0: Full Learning & Forensic Audit for ${EXAM_CONTEXT} ${SUBJECT}`);
    console.log('================================================================');

    if (!GEMINI_API_KEY) {
        console.error('❌ Missing GEMINI_API_KEY');
        return;
    }

    // 1. Audit each year
    for (const year of [2022, 2023, 2024, 2025]) {
        console.log(`\n🔍 Auditing ${year}...`);
        const scanId = SCAN_MAP[year];
        
        const { data: questions } = await supabase
            .from('questions')
            .select('text, difficulty, topic')
            .eq('scan_id', scanId);

        if (!questions || questions.length === 0) {
            console.warn(`⚠️ No questions found for ${year}`);
            continue;
        }

        const paperText = questions.map(q => q.text).filter(Boolean).join('\n\n');
        
        const auditResult = await auditPaperHistoricalContext(
            paperText,
            EXAM_CONTEXT,
            SUBJECT,
            year,
            GEMINI_API_KEY
        );

        if (!auditResult) {
            console.error(`❌ Audit failed for ${year}`);
            continue;
        }

        console.log(`✅ Audit Complete for ${year}: ${auditResult.boardSignature} | IDS: ${auditResult.idsActual}`);

        const total = questions.length;
        const difficultyCounts = {
            easy: questions.filter(q => q.difficulty === 'Easy').length,
            moderate: questions.filter(q => q.difficulty === 'Moderate').length,
            hard: questions.filter(q => q.difficulty === 'Hard').length
        };

        const patternData = {
            exam_context: EXAM_CONTEXT,
            subject: SUBJECT,
            year: year,
            total_marks: total,
            difficulty_easy_pct: Math.round((difficultyCounts.easy / total) * 100),
            difficulty_moderate_pct: Math.round((difficultyCounts.moderate / total) * 100),
            difficulty_hard_pct: Math.round((difficultyCounts.hard / total) * 100),
            board_signature: auditResult.boardSignature,
            intent_signature: auditResult.intentSignature,
            evolution_note: auditResult.evolutionNote,
            ids_actual: auditResult.idsActual
        };

        await supabase
            .from('exam_historical_patterns')
            .upsert(patternData, { onConflict: 'exam_context,subject,year' });
    }

    // Final Setup for 2026
    const finalConfig = {
        exam_context: EXAM_CONTEXT,
        subject: SUBJECT,
        rigor_drift_multiplier: 1.10, 
        synthesis_weight: 0.85,
        trap_density_weight: 0.70,
        speed_requirement_weight: 0.80,
        ids_baseline: 0.90,
        updated_at: new Date().toISOString()
    };

    await supabase
        .from('rei_evolution_configs')
        .upsert(finalConfig, { onConflict: 'exam_context,subject' });

    const forecast = {
        exam_type: EXAM_CONTEXT,
        subject: SUBJECT,
        target_year: 2026,
        rigor_velocity: 1.10,
        intent_signature: { synthesis: 0.90, trapDensity: 0.75, linguisticLoad: 0.60, speedRequirement: 0.80 },
        board_signature: 'SYNTHESIZER',
        calibration_directives: [
            "Focus on Diagram-Logic mapping",
            "Bridge Chapter-Fusion (Reproduction + Genetics)",
            "Target IDS 0.90 Forensic match"
        ],
        updated_at: new Date().toISOString()
    };

    await supabase
        .from('ai_universal_calibration')
        .upsert(forecast, { onConflict: 'exam_type,subject,target_year' });

    console.log('✅ Biology Brain Sealed & 2026 Forecast Initialized.');
}

runFullLearning().catch(console.error);
