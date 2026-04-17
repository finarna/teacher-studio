
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function findBestScans() {
    console.log('--- Finding Best Physics Scans for iterative learning ---');
    const years = [2021, 2022, 2023, 2024, 2025];
    const bestScans: Record<number, any> = {};

    const { data: allScans } = await supabase
        .from('scans')
        .select('id, name, year, subject, status')
        .eq('exam_context', 'KCET')
        .eq('subject', 'Physics');

    if (!allScans) return;

    for (const year of years) {
        // Try exact year match first, then grep year from name
        let yearScans = allScans.filter(s => s.year === year || s.name.includes(year.toString()));
        
        if (yearScans.length === 0) {
            console.log(`⚠️ No scans found for ${year}`);
            continue;
        }

        const scanDetails = [];
        for (const scan of yearScans) {
            const { count } = await supabase
                .from('questions')
                .select('*', { count: 'exact', head: true })
                .eq('scan_id', scan.id);
            scanDetails.push({ ...scan, count: count || 0 });
        }

        // Sort by question count descending
        scanDetails.sort((a, b) => b.count - a.count);
        bestScans[year] = scanDetails[0];
        console.log(`✅ ${year}: ${scanDetails[0].name} (${scanDetails[0].id}) - Qs: ${scanDetails[0].count}`);
    }

    console.log('\nFinal Map:');
    console.log(JSON.stringify(bestScans, null, 2));
}

findBestScans();
