
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function dumpOne() {
    const { data } = await supabase.from('ai_universal_calibration').select('*').limit(1);
    console.log('FULL ROW KEYS:', Object.keys(data?.[0] || {}));
    console.log('FULL ROW DATA:', data?.[0]);
}
dumpOne();
