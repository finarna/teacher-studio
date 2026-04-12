
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

async function checkAndFixCalibration() {
    console.log('🔍 DEEP AUDIT: ai_universal_calibration JSON contents...');
    
    const { data: calibrations, error } = await supabase
        .from('ai_universal_calibration')
        .select('*');

    if (error) {
        console.error('❌ Error fetching calibrations:', error);
        return;
    }

    for (const row of calibrations) {
        console.log(`\n--- [${row.exam_type}] [${row.subject}] ${row.target_year} ---`);
        console.log(`Columns: E:${row.difficulty_easy_pct} M:${row.difficulty_moderate_pct} H:${row.difficulty_hard_pct}`);
        console.log(`JSON DifficultyProfile:`, JSON.stringify(row.intent_signature?.difficultyProfile));
        
        const sig = row.intent_signature?.difficultyProfile || {};
        const easy = row.difficulty_easy_pct ?? sig.easy ?? 40;
        const moderate = row.difficulty_moderate_pct ?? sig.moderate ?? 40;
        const hard = row.difficulty_hard_pct ?? sig.hard ?? 20;
        const sum = easy + moderate + hard;
        
        if (sum > 100 || sum === 0 || easy === 70) {
            console.log(`⚠️  FIXING CALIBRATION... (Sum: ${sum}%)`);
            const { error: updateError } = await supabase
                .from('ai_universal_calibration')
                .update({
                    difficulty_easy_pct: 40,
                    difficulty_moderate_pct: 40,
                    difficulty_hard_pct: 20,
                    intent_signature: {
                        ...(row.intent_signature || {}),
                        difficultyProfile: { easy: 40, moderate: 40, hard: 20 }
                    }
                })
                .eq('id', row.id);
            
            if (updateError) console.error('❌ Update failed:', updateError);
            else console.log('✅ Reverted to 40/40/20 Standard.');
        }
    }
}

checkAndFixCalibration();
