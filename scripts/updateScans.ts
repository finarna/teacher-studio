import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setSystemScans() {
    const { error } = await supabase
        .from('scans')
        .update({ is_system_scan: true })
        .not('id', 'is', null);

    if (error) console.error("Error updating:", error);
    else console.log("Successfully updated all scans to be system scans.");
}
setSystemScans().catch(console.error);
