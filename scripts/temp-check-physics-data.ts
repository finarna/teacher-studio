
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function checkPhysicsData() {
    console.log('--- Checking KCET Physics Data ---');
    const { data: scans, error: sError } = await supabase
        .from('scans')
        .select('id, year, exam_context, subject, status, name')
        .eq('exam_context', 'KCET')
        .eq('subject', 'Physics')
        .order('year', { ascending: true });

    if (sError) {
        console.error('Error fetching scans:', sError);
        return;
    }

    if (!scans || scans.length === 0) {
        console.log('No Physics scans found for KCET.');
    } else {
        console.log(`Found ${scans.length} scans:`);
        for (const scan of scans) {
            const { data: qData, error: qError } = await supabase
                .from('questions')
                .select('year, difficulty')
                .eq('scan_id', scan.id)
                .limit(10);
            
            const qCount = qData?.length || 0;
            const inferredYear = qData && qData.length > 0 ? qData[0].year : null;
            
            console.log(`- Scan: ${scan.name}, ID: ${scan.id.substring(0,8)}, Year (scan/q): ${scan.year}/${inferredYear}, Qs: ${qCount}+, Status: ${scan.status}`);
        }
    }

    console.log('\n--- Checking Historical Patterns ---');
    const { data: patterns, error: pError } = await supabase
        .from('exam_historical_patterns')
        .select('*')
        .eq('exam_context', 'KCET')
        .eq('subject', 'Physics')
        .order('year', { ascending: true });

    if (pError) console.error(pError);
    else console.table(patterns.map(p => ({
        year: p.year,
        hard: p.difficulty_hard_pct,
        ids: p.ids_actual,
        sig: p.board_signature
    })));
}

checkPhysicsData();
