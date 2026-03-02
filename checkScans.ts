import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
    console.log('--- Database Check ---');

    const { data: patterns } = await supabase.from('exam_historical_patterns').select('*');
    console.log('Exam Patterns:', patterns);

    const { data: scans } = await supabase.from('scans')
        .select('id, name, year, subject, exam_context')
        .eq('exam_context', 'KCET')
        .eq('subject', 'Math');

    if (scans) {
        console.log('Found', scans.length, 'KCET Math scans');
        const years = scans.map(s => s.year);
        const distribution: any = {};
        years.forEach(y => {
            const key = String(y);
            distribution[key] = (distribution[key] || 0) + 1;
        });
        console.log('Year Distribution:', distribution);
    } else {
        console.log('No scans found or error');
    }

    const { data: topics } = await supabase.from('topics').select('count', { head: true });
    console.log('Total Topics:', topics);

    process.exit(0);
}

run();
