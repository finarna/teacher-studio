/**
 * REI Evolution Engine (REI v3.0)
 * 
 * This engine implements the "Forecast Chain":
 * Scan PYQ Analysis -> Evolution Logic -> Forecasted Calibration -> Mock Params
 */

import type { ExamContext, Subject } from '../types';
import type { HistoricalExamData, GenerationRules } from './aiQuestionGenerator';
import { supabase } from './supabase';

export interface ForecastedCalibration {
    examContext: ExamContext;
    subject: Subject;
    targetYear: number;
    rigorVelocity: number; // Acceleration of rigor relative to norm
    difficultyProfile: {
        easy: number;
        moderate: number;
        hard: number;
    };
    intentSignature: {
        synthesis: number;
        trapDensity: number;
        linguisticLoad: number;
        speedRequirement: number;
    };
    directives: string[];
    boardSignature: 'SYNTHESIZER' | 'LOGICIAN' | 'INTIMIDATOR' | 'ANCHOR' | 'DEFAULT';
}

/**
 * The "Predictive Oracle" Logic
 * Chained logic to compute the 2026 forecast based on historical gradients.
 */
export async function getForecastedCalibration(
    examContext: ExamContext,
    subject: Subject
): Promise<ForecastedCalibration> {
    // 1. Fetch historical pattern from the Auditor's findings
    const { data: historicalData, error } = await supabase
        .from('exam_historical_patterns')
        .select('*')
        .eq('exam_context', examContext)
        .eq('subject', subject)
        .order('year', { ascending: false })
        .limit(5);

    // Fallback to static "Blueprint" if no historical data exists
    const baseline = getBaselineProfile(examContext);

    if (!historicalData || historicalData.length < 2) {
        return {
            examContext,
            subject,
            targetYear: 2026,
            rigorVelocity: 1.0,
            difficultyProfile: baseline.profile,
            intentSignature: baseline.signature,
            directives: ["Standard Blueprint Alignment"],
            boardSignature: baseline.boardSignature
        };
    }

    // 2. Perform Recursive Rigor Gradient Analysis
    // Compare most recent year with previous years to detect "Drift"
    const recent = historicalData[0];
    const previous = historicalData[1];

    // DRIFT CALCULATION: Delta in "Extreme Rigor" (Hard %)
    const rigorDrift = (recent.difficulty_hard_pct || 20) - (previous.difficulty_hard_pct || 20);

    // RWC (Recursive Weight Correction) logic:
    // Acceleration Factor: If hard Qs are increasing, forecast predicts a "Rigor Spike"
    const rigorVelocity = 1.0 + (rigorDrift / 100);

    // 3. Chain to Mock Test Params (Complexity Matrix)
    // Dynamic forecast for 2026 based on the 2-year gradient
    const forecastedHard = Math.min(65, Math.max(15, (recent.difficulty_hard_pct || 20) + (rigorDrift * 1.8)));
    const remaining = 100 - forecastedHard;
    const forecastedEasy = Math.round(remaining * (baseline.profile.easy / (baseline.profile.easy + baseline.profile.moderate)));
    const forecastedModerate = 100 - forecastedHard - forecastedEasy;

    // 4. Extract Evolution Intent from Data
    // This is the "Auditor" chain: PYQ Audit -> Evolution Notes -> Calibration Directives
    const directives = extractDirectivesFromNotes(historicalData, examContext, subject, rigorDrift);

    const calibration = {
        examContext,
        subject,
        targetYear: 2026,
        rigorVelocity: Number(rigorVelocity.toFixed(2)),
        difficultyProfile: {
            easy: forecastedEasy,
            moderate: forecastedModerate,
            hard: Math.round(forecastedHard)
        },
        intentSignature: {
            synthesis: examContext === 'JEE' ? 0.92 : 0.4,
            trapDensity: examContext === 'NEET' ? 0.85 : 0.5,
            linguisticLoad: examContext === 'NEET' ? 0.80 : 0.3,
            speedRequirement: examContext === 'KCET' ? 0.95 : 0.6
        },
        directives,
        boardSignature: baseline.boardSignature
    };

    // 5. [NEW] Persist the "Processed Intelligence" for auditing and rapid retrieval
    await saveForecastedCalibration(calibration);

    return calibration;
}

/**
 * Persist the Oracle's findings to the ai_universal_calibration table
 * This stores the "Processed Intelligence" (REI v3.0 Phase 2 Output)
 */
async function saveForecastedCalibration(calibration: ForecastedCalibration) {
    try {
        const { error } = await supabase
            .from('ai_universal_calibration')
            .upsert({
                exam_type: calibration.examContext,
                subject: calibration.subject,
                target_year: calibration.targetYear,
                rigor_velocity: calibration.rigorVelocity,
                intent_signature: calibration.intentSignature,
                calibration_directives: calibration.directives,
                board_signature: calibration.boardSignature,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'exam_type,subject,target_year'
            });

        if (error) {
            console.error('⚠️ Failed to persist calibration:', error.message);
            if (error.message.includes('column') || error.message.includes('constraint')) {
                console.warn('💡 ACTION REQUIRED: Please run the latest migration in Supabase SQL Editor and run: NOTIFY pgrst, "reload schema";');
            }
        }
        else console.log(`✅ [PHASE 2] Persisted Processed Intelligence for ${calibration.examContext}`);
    } catch (err) {
        console.error('❌ Error in saveForecastedCalibration:', err);
    }
}

/**
 * The "Auditor" Logic: Extracting specific calibration directives from historical evolution notes
 * This bridges the gap between raw data and the AI prompt engine.
 */
function extractDirectivesFromNotes(
    history: any[],
    exam: ExamContext,
    subject: Subject,
    drift: number
): string[] {
    // 1. Core Pattern Anchors (Domain Defaults)
    const baseDirectives = {
        JEE: ["Cross-Chapter conceptual fusion", "Nonlinear Logic Jumps"],
        NEET: ["A-R Logic Trap Resonance", "NCERT-Plus Calibration"],
        KCET: ["Heuristic Shortcut Mapping", "Property-based matrix mechanics"],
        CBSE: ["Step-Wise Blueprint fidelity", "PYQ Anchor resonance"]
    }[exam] || ["Standard pattern resonance"];

    // 2. Chain AI-extracted evolution notes from the Auditor (last 2 years of PYQs)
    const auditorInsights = history.slice(0, 2)
        .map(h => h.evolution_note)
        .filter(Boolean);

    const dynamicDirectives = auditorInsights.length > 0
        ? [...new Set([...baseDirectives, ...auditorInsights])]
        : baseDirectives;

    // 3. Rigor Correction Injection
    if (drift > 5) {
        dynamicDirectives.push("URGENT: Rigor Acceleration Detected (+" + drift + "%)");
        dynamicDirectives.push("Inject Adaptive Distortion Factor 1.25x");
    }

    return dynamicDirectives;
}

/**
 * Baseline patterns per Domain (Static Fallback)
 */
function getBaselineProfile(exam: ExamContext) {
    const profiles: Record<string, any> = {
        JEE: {
            profile: { easy: 20, moderate: 40, hard: 40 },
            signature: { synthesis: 0.9, trapDensity: 0.6, linguisticLoad: 0.3, speedRequirement: 0.5 },
            boardSignature: 'LOGICIAN'
        },
        NEET: {
            profile: { easy: 30, moderate: 50, hard: 20 },
            signature: { synthesis: 0.5, trapDensity: 0.9, linguisticLoad: 0.9, speedRequirement: 0.7 },
            boardSignature: 'INTIMIDATOR'
        },
        KCET: {
            profile: { easy: 40, moderate: 40, hard: 20 },
            signature: { synthesis: 0.4, trapDensity: 0.5, linguisticLoad: 0.4, speedRequirement: 0.9 },
            boardSignature: 'SYNTHESIZER'
        },
        CBSE: {
            profile: { easy: 50, moderate: 30, hard: 20 },
            signature: { synthesis: 0.3, trapDensity: 0.4, linguisticLoad: 0.3, speedRequirement: 0.4 },
            boardSignature: 'ANCHOR'
        }
    };
    return profiles[exam] || profiles.CBSE;
}
