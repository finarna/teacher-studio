import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * REI NEURAL AUDIT: NEET 2026 CALCULATED FORECAST
 */
async function getForecastedCalibration(examContext, subject) {
    // 1. Fetch historical pattern
    const { data: historicalData } = await supabase
        .from('exam_historical_patterns')
        .select('*')
        .eq('exam_context', examContext)
        .eq('subject', subject)
        .order('year', { ascending: false })
        .limit(2);

    if (!historicalData || historicalData.length === 0) return null;

    let recent = historicalData[0];
    let previous = historicalData[1] || recent;

    // DRIFT CALCULATION: Delta in "Extreme Rigor" (Hard %)
    const rigorDrift = (recent.difficulty_hard_pct || 0) - (previous.difficulty_hard_pct || 0);

    // 2. Fetch the Master Audited Calibration
    const { data: universalCalibration } = await supabase
        .from('ai_universal_calibration')
        .select('*')
        .eq('exam_type', examContext)
        .eq('subject', subject)
        .eq('target_year', 2026)
        .single();

    const driftMultiplier = 1.8;
    
    // Baseline profiles
    const baselines = {
        NEET: { easy: 30, moderate: 50, hard: 20 }
    };
    const baseline = baselines[examContext] || { easy: 40, moderate: 40, hard: 20 };

    // Dynamic forecast for 2026
    const forecastedHard = Math.min(65, Math.max(15, (recent.difficulty_hard_pct || 0) + (rigorDrift * driftMultiplier)));
    const remaining = 100 - forecastedHard;
    const forecastedEasy = Math.round(remaining * (baseline.easy / (baseline.easy + baseline.moderate)));
    const forecastedModerate = 100 - forecastedHard - forecastedEasy;

    return {
        subject,
        rigorVelocity: universalCalibration?.rigor_velocity || 1.0,
        difficultyProfile: {
            easy: forecastedEasy,
            moderate: forecastedModerate,
            hard: forecastedHard
        },
        idsTarget: universalCalibration?.intent_signature?.idsTarget || 0.9,
        directives: universalCalibration?.calibration_directives || []
    };
}

async function audit() {
    console.log('🧠 [REI v16.0] INITIATING NEURAL AUDIT FOR NEET...');
    const subjects = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
    
    for (const s of subjects) {
        try {
            const f = await getForecastedCalibration('NEET', s);
            if (!f) {
                console.log(`\n⚠️ NEET ${s}: No historical data found.`);
                continue;
            }
            console.log(`\n🎯 NEET ${s} 2026 REI FORECAST:`);
            console.log(`   - Difficulty Mix: E:${f.difficultyProfile.easy}% M:${f.difficultyProfile.moderate}% H:${f.difficultyProfile.hard}%`);
            console.log(`   - IDS Target: ${f.idsTarget}`);
            console.log(`   - Rigor Velocity: ${f.rigorVelocity}x`);
            console.log(`   - Directives: ${f.directives[0] || 'None'}`);
        } catch (e) {
            console.error(`❌ Audit failed for ${s}:`, e.message);
        }
    }
    process.exit(0);
}

audit();
