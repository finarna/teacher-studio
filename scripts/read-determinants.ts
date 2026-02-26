import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function readDeterminants() {
    const { data } = await supabaseAdmin.from('topic_sketches').select('*').eq('topic', 'Determinants');
    console.log(JSON.stringify(data, null, 2));
}

readDeterminants().catch(console.error);
