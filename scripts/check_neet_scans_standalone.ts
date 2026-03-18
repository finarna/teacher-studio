
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkScans() {
    const { data: scans, error } = await supabase
        .from('scans')
        .select('id, name, subject, exam_context, subjects, year, is_system_scan')
        .eq('exam_context', 'NEET')
        .eq('is_system_scan', true);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('NEET Scans:', JSON.stringify(scans, null, 2));
}

checkScans();
