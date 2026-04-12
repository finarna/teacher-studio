import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function purge() {
    console.log('🗑️  NUCLEAR PURGE: DEPORTING CORRUPTED FLAGSHIP CORES...');
    
    const { data: q, error: qErr } = await supabase
        .from('questions')
        .delete()
        .ilike('source', '%Smart-Batch%')
        .select();

    if (qErr) console.error('❌ Question Delete Error:', qErr);
    else console.log(`✅ Nuked ${q?.length || 0} questions.`);

    console.log('🚀 SYSTEM CLEAN. READY FOR REGEN.');
    process.exit(0);
}

purge();
