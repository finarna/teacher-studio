
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

async function debugDistributions() {
    console.log('🔍 Debugging Intelligence Layers...');

    const { data: scans } = await supabase
        .from('scans')
        .select('id, year, name')
        .eq('subject', 'Math')
        .eq('exam_context', 'KCET');

    console.log('Scans found:', scans?.length);

    for (const scan of scans || []) {
        const { count } = await supabase
            .from('exam_topic_distributions')
            .select('*', { count: 'exact', head: true })
            .eq('pattern_id', (await getPatternId(scan.id)) || '');

        console.log(`Scan ${scan.year} - ${scan.name}: ${count} topic distributions`);
    }
}

async function getPatternId(scanId: string) {
    const { data } = await supabase
        .from('exam_historical_patterns')
        .select('id')
        .eq('scan_id', scanId)
        .single();
    return data?.id;
}

debugDistributions();
