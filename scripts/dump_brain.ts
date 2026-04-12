import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkDb() {
    console.log("🚀 DUMPING ENTIRE TABLE...");
    const { data, error } = await supabaseAdmin
        .from('ai_universal_calibration')
        .select('*');
    
    if (error) {
        console.error("❌ DB ERROR:", error);
        return;
    }
    
    console.log(`💎 TOTAL RECORDS: ${data?.length || 0}`);
    data.forEach(r => {
        console.log(`- ID: ${r.id} | EXAM: ${r.exam_type} | SUBJ: ${r.subject} | YEAR: ${r.target_year}`);
    });
}

checkDb();
