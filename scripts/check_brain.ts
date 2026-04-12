import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkDb() {
    console.log("🚀 FORCING SYNC OF MASTER AUDIT...");
    const { data: updateData, error: updateError } = await supabaseAdmin
        .from('ai_universal_calibration')
        .update({ 
            intent_signature: { 
                synthesis: 0.95, 
                trapDensity: 0.65, 
                linguisticLoad: 0.4, 
                speedRequirement: 0.82, 
                difficultyProfile: { easy: 58, moderate: 25, hard: 17 } 
            } 
        })
        .eq('exam_type', 'KCET')
        .eq('subject', 'Math')
        .select();
    
    if (updateError) {
        console.error("❌ UPDATE ERROR:", updateError);
        return;
    }
    
    console.log(`✅ ROWS UPDATED: ${updateData?.length || 0}`);
    console.log("💎 LATEST RECORD:", JSON.stringify(updateData?.[0], null, 2));
}

checkDb();
