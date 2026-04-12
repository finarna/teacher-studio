
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

async function fixPhysicsCalibration() {
    console.log('🛠️ FIXING PHYSICS CALIBRATION...');
    const { data: row, error: fetchError } = await supabase
        .from('ai_universal_calibration')
        .select('*')
        .eq('exam_type', 'KCET')
        .eq('subject', 'Physics')
        .maybeSingle();

    if (fetchError) {
        console.error('❌ Error fetching Physics calibration:', fetchError);
        return;
    }

    if (!row) {
        console.log('⚠️ No row found. Creating fresh Physics calibration.');
        const { error: insertError } = await supabase
            .from('ai_universal_calibration')
            .insert({
                exam_type: 'KCET',
                subject: 'Physics',
                target_year: 2026,
                difficulty_easy_pct: 40,
                difficulty_moderate_pct: 40,
                difficulty_hard_pct: 20,
                rigor_velocity: 0.85,
                intent_signature: {
                    idsTarget: 0.85,
                    synthesis: 0.75,
                    trapDensity: 0.85,
                    linguisticLoad: 0.45,
                    speedRequirement: 0.8,
                    difficultyProfile: { easy: 40, moderate: 40, hard: 20 }
                },
                calibration_directives: ["Dimension-Graph Behavior Shifting v16.0", "100% Data Rigour Locking"],
                board_signature: "SYNTHESIZER"
            });
        if (insertError) console.error('❌ Insert failed:', insertError);
        else console.log('✅ Created fresh Physics calibration.');
    } else {
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
        else console.log('✅ Updated Physics calibration to 40/40/20.');
    }
}

fixPhysicsCalibration();
