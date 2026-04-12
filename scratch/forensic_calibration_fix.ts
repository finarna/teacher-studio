
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

async function forensicFix() {
    console.log('🧬 STARTING FORENSIC REPAIR: ai_universal_calibration');

    const subjects = ['Math', 'Physics'];
    for (const subject of subjects) {
        console.log(`\n--- Auditing ${subject} ---`);
        const { data: row, error } = await supabase
            .from('ai_universal_calibration')
            .select('*')
            .eq('exam_type', 'KCET')
            .eq('subject', subject)
            .eq('target_year', 2026)
            .maybeSingle();

        if (error) {
            console.error(`❌ Error fetching ${subject}:`, error);
            continue;
        }

        const defaultProfile = { easy: 40, moderate: 40, hard: 20 };
        
        if (!row) {
            console.log(`⚠️  No calibration found for ${subject}. Initializing...`);
            const { error: insertError } = await supabase
                .from('ai_universal_calibration')
                .insert({
                    exam_type: 'KCET',
                    subject: subject,
                    target_year: 2026,
                    rigor_velocity: 1.0,
                    intent_signature: {
                        idsTarget: 0.9,
                        synthesis: 0.8,
                        trapDensity: 0.7,
                        linguisticLoad: 0.5,
                        speedRequirement: 0.9,
                        difficultyProfile: defaultProfile
                    },
                    calibration_directives: ["Universal Anchor Baseline v16.0", "100% Data Rigour Locking"],
                    board_signature: "SYNTHESIZER"
                });
            if (insertError) console.error(`❌ Insert failed for ${subject}:`, insertError);
            else console.log(`✅ Initialized ${subject} with 40/40/20 profile.`);
        } else {
            const sig = row.intent_signature || {};
            const easy = sig.difficultyProfile?.easy ?? 40;
            const moderate = sig.difficultyProfile?.moderate ?? 40;
            const hard = sig.difficultyProfile?.hard ?? 20;
            const sum = easy + moderate + hard;

            console.log(`Current Profile (JSON): E:${easy} M:${moderate} H:${hard} | Sum: ${sum}%`);

            if (sum !== 100 || easy === 0) {
                console.log(`🚨 FIXING DRIFT: Resetting to 40/40/20...`);
                const { error: updateError } = await supabase
                    .from('ai_universal_calibration')
                    .update({
                        intent_signature: {
                            ...sig,
                            difficultyProfile: defaultProfile,
                            idsTarget: sig.idsTarget || 0.9 // Ensure IDS exists
                        },
                        rigor_velocity: row.rigor_velocity || 1.0
                    })
                    .eq('id', row.id);

                if (updateError) console.error(`❌ Update failed for ${subject}:`, updateError);
                else console.log(`✅ ${subject} calibration locked at 100% rigor.`);
            } else {
                console.log(`✅ ${subject} calibration is stable.`);
            }
        }
    }
}

forensicFix();
