import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { synthesizeQuestionIntelligence } from '../lib/intelligenceSynthesis';

async function run() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: q } = await supabase.from('questions').select('*').eq('id', '776cf3a3-8604-432e-82fe-4df4c8185ef4').single();
    if (!q) { console.log('Q not found'); return; }

    const result = await synthesizeQuestionIntelligence(
        q,
        'Relations and Functions',
        'Math',
        'KCET',
        supabase,
        process.env.VITE_GEMINI_API_KEY!
    );
    console.log('Final Result keys:', Object.keys(result || {}));
}
run();
