
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function exportFlagships() {
    console.log("📤 Exporting Flagship Physics Predicted Papers...");

    const { data: attempts, error } = await supabase
        .from('test_attempts')
        .select('*')
        .ilike('test_name', 'PLUS2AI OFFICIAL PHYSICS PREDICTION%')
        .order('created_at', { ascending: false })
        .limit(2);

    if (error || !attempts || attempts.length === 0) {
        console.error("❌ No Physics flagship attempts found in DB.", error);
        return;
    }

    // Set A (usually latest or first in alphabetic order of Set name)
    const setA = attempts.find(a => a.test_name.includes('SET_A')) || attempts[0];
    const setB = attempts.find(a => a.test_name.includes('SET_B')) || attempts[1];

    if (setA) {
        console.log(`✅ Found SET_A: ${setA.test_name}`);
        fs.writeFileSync('flagship_physics_final.json', JSON.stringify(setA.test_config.questions, null, 2));
        console.log(`💾 Saved to flagship_physics_final.json`);
    }

    if (setB) {
        console.log(`✅ Found SET_B: ${setB.test_name}`);
        fs.writeFileSync('flagship_physics_final_b.json', JSON.stringify(setB.test_config.questions, null, 2));
        console.log(`💾 Saved to flagship_physics_final_b.json`);
    }
}

exportFlagships().catch(console.error);
