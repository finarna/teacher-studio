
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const PHYSICS_SCAN_MAP = {
    "2021": "6f0d3189-8b85-45bc-b66b-d7f51f886959",
    "2022": "f65c9c40-0aad-4e94-b9c3-0f16e790ca06",
    "2023": "9ca566d7-4638-4229-87c2-9ce4fa82d8c3",
    "2024": "2babb754-40e8-4ba2-99dd-700835509568",
    "2025": "15d3394d-798e-41d3-9f96-b3ad6e7d1444"
};

async function verifySelectedScans() {
    console.log('--- Verifying Selected Physics Scans ---');
    for (const [year, id] of Object.entries(PHYSICS_SCAN_MAP)) {
        const { data: scan, error: sError } = await supabase
            .from('scans')
            .select('name, status')
            .eq('id', id)
            .single();

        if (sError) {
            console.log(`❌ Year ${year} (ID: ${id}): Not found or error: ${sError.message}`);
            continue;
        }

        const { count, error: qError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('scan_id', id);

        console.log(`✅ Year ${year}: ${scan.name} | Qs: ${count} | Status: ${scan.status}`);
    }
}

verifySelectedScans();
