import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkScansSchema() {
    const { data } = await supabaseAdmin.from('scans').select('*').limit(1);
    console.log('Scans columns:', Object.keys(data?.[0] || {}));
}

checkScansSchema();
