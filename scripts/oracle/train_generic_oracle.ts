import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import fs from 'fs';
import { getForecastedCalibration, saveForecastedCalibration } from '../../lib/reiEvolutionEngine';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function trainOracle(subject: string) {
    console.log(`🧠 [REI v16.0] TRAINING ORACLE FOR: ${subject}`);
    
    // 1. Fetch Calibration from the Evolution Engine
    // This function already calculates the forecast using historical gradients
    const forecast = await getForecastedCalibration('KCET' as any, subject as any);
    
    console.log(`📊 FORECASTED CALIBRATION (2026):`);
    console.log(`- IDS Target: ${forecast.idsTarget}`);
    console.log(`- Rigor Velocity: ${forecast.rigorVelocity}`);
    console.log(`- Difficulty: E:${forecast.difficultyProfile.easy} M:${forecast.difficultyProfile.moderate} H:${forecast.difficultyProfile.hard}`);
    
    // Check for 120% drift (common bug where sum is 120)
    const sum = forecast.difficultyProfile.easy + forecast.difficultyProfile.moderate + forecast.difficultyProfile.hard;
    if (sum !== 100) {
        console.log(`🚨 DRIFT DETECTED: SUM IS ${sum}%! Normalizing...`);
        const total = sum;
        forecast.difficultyProfile.easy = Math.round((forecast.difficultyProfile.easy / total) * 100);
        forecast.difficultyProfile.moderate = Math.round((forecast.difficultyProfile.moderate / total) * 100);
        forecast.difficultyProfile.hard = 100 - forecast.difficultyProfile.easy - forecast.difficultyProfile.moderate;
        console.log(`✅ Normalized: E:${forecast.difficultyProfile.easy} M:${forecast.difficultyProfile.moderate} H:${forecast.difficultyProfile.hard}`);
    }

    // 2. Persist to DB
    console.log(`📡 Persisting to ai_universal_calibration...`);
    await saveForecastedCalibration(forecast);
    
    console.log(`✅ TRAINING COMPLETE FOR ${subject}.`);
}

async function main() {
    const subjects = ['Math', 'Physics'];
    for (const sub of subjects) {
        await trainOracle(sub);
    }
}

main().catch(console.error);
