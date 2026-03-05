
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getForecastedCalibration } from '../lib/reiEvolutionEngine';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

async function recalibrate() {
    console.log('🚀 [REI v3.0] Recalibrating Intelligence for KCET Math...');

    // This will trigger the logic in reievolutionEngine.ts which fetches from historical_patterns
    const calibration = await getForecastedCalibration('KCET', 'Math');

    console.log('\n🎯 NEW CALIBRATION STATE for 2026 Target:');
    console.log('-------------------------------------------');
    console.log(`Rigor Velocity: ${calibration.rigorVelocity}x`);
    console.log(`Difficulty Profile:`, calibration.difficultyProfile);
    console.log(`Directives:`, calibration.directives);
    console.log(`Board Signature: ${calibration.boardSignature}`);

    // Fetch historical patterns to show the calculation context
    const { data: patterns } = await supabase
        .from('exam_historical_patterns')
        .select('*')
        .eq('subject', 'Math')
        .eq('exam_context', 'KCET')
        .order('year', { ascending: false });

    console.log('\n📊 Calculation Context (Raw Data):');
    console.table(patterns?.map(p => ({
        Year: p.year,
        'Hard %': p.difficulty_hard_pct
    })));
}

recalibrate();
