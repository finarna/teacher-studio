
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

async function checkPatterns() {
    console.log('🔍 Checking KCET Math Historical Patterns...');
    const { data, error } = await supabase
        .from('exam_historical_patterns')
        .select('*')
        .eq('subject', 'Math')
        .eq('exam_context', 'KCET')
        .order('year', { ascending: false });

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ No patterns found for KCET Math.');
        return;
    }

    console.table(data.map(p => ({
        Year: p.year,
        'Hard %': p.difficulty_hard_pct,
        'Mod %': p.difficulty_moderate_pct,
        'Easy %': p.difficulty_easy_pct,
        Note: p.evolution_note
    })));

    console.log('\n🔍 Checking AI Universal Calibration...');
    const { data: calibration, error: calError } = await supabase
        .from('ai_universal_calibration')
        .select('*')
        .eq('exam_type', 'KCET')
        .eq('subject', 'Math')
        .single();

    if (calError) {
        console.error('❌ Calibration Error:', calError.message);
    } else {
        console.table([{
            'Target Year': calibration.target_year,
            'Rigor Velocity': calibration.rigor_velocity,
            'Board Signature': calibration.board_signature,
            'Directives': calibration.calibration_directives?.length
        }]);
        console.log('Directives:', calibration.calibration_directives);
    }
}

checkPatterns();
