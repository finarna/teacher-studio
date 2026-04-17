
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const { data: scans } = await supabase
        .from('scans')
        .select('id, name')
        .eq('subject', 'Biology')
        .ilike('name', '%2022%');
    
    for (const scan of scans || []) {
        const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('scan_id', scan.id);
        console.log(`${scan.name} (${scan.id}): ${count} Qs`);
    }
}
main();
