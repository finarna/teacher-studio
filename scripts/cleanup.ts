import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function cleanup() {
    console.log('🧹 Cleaning up test sketches...');
    const { error } = await supabaseAdmin
        .from('topic_sketches')
        .delete()
        .or('topic.eq.Debug Test,topic.eq.Determinants');

    if (error) console.error(error);
    else console.log('✅ Deleted test sketches.');
}

cleanup().catch(console.error);
