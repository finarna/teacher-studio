import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkSchema() {
    const { data: q } = await supabaseAdmin.from('questions').select('*').limit(1);
    console.log('Questions columns:', Object.keys(q?.[0] || {}));
}

checkSchema();
