
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

async function checkSubjects() {
    const { data: scans } = await supabase.from('scans').select('subject, exam_context').limit(10);
    console.log('Scans Subject/Context:', scans);

    const { data: patterns } = await supabase.from('exam_historical_patterns').select('subject, exam_context, year, difficulty_hard_pct');
    console.log('Historical Patterns:', patterns);

    const { data: calibration } = await supabase.from('ai_universal_calibration').select('*');
    console.log('Calibration:', calibration);
}

checkSubjects();
