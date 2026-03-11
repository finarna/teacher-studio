import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function fixRogueAIScan() {
    const rogueId = 'ab6b176e-fe5c-4f87-9a66-c6b3d7b8bf6a';

    console.log(`🔧 Fixing rogue AI scan: ${rogueId}`);

    const { error } = await supabaseAdmin
        .from('scans')
        .update({ is_system_scan: false })
        .eq('id', rogueId);

    if (error) {
        console.error('❌ Error:', error.message);
    } else {
        console.log('✅ Done — AI-Generated (NEET Physics) is no longer a system scan.');
    }
}

fixRogueAIScan();
