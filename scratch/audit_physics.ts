
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

async function auditPhysics() {
    console.log('--- 🛡️ PHYSICS CALIBRATION AUDIT ---');
    const { data: physicsRow, error } = await supabase
        .from('ai_universal_calibration')
        .select('*')
        .eq('exam_type', 'KCET')
        .eq('subject', 'Physics')
        .maybeSingle();

    if (error) {
        console.error('❌ Error fetching Physics calibration:', error);
        return;
    }

    if (!physicsRow) {
        console.log('⚠️ No Physics calibration found!');
    } else {
        console.log('Physics Calibration Data:');
        console.log(JSON.stringify(physicsRow, null, 2));

        const easy = physicsRow.difficulty_easy_pct || 0;
        const moderate = physicsRow.difficulty_moderate_pct || 0;
        const hard = physicsRow.difficulty_hard_pct || 0;
        const sum = easy + moderate + hard;

        console.log(`\nDifficulty Check: E:${easy}% M:${moderate}% H:${hard}% | Sum: ${sum}%`);
        
        if (sum > 100) {
            console.log(`🚨 DRIFT DETECTED: Sum is ${sum}%. Expected 100%.`);
        } else if (sum === 0) {
            console.log(`🚨 ZERO CALIBRATION: Sum is 0%. Fix required.`);
        } else {
            console.log(`✅ DRIFT CHECK PASSED: Sum is ${sum}%.`);
        }
    }
}

auditPhysics();
