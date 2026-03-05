
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!
);

async function backupREIConfig() {
    console.log('📦 [REI v4.0] Starting Full Intelligence Backup before DB Wipe...');

    const backupDir = path.join(process.cwd(), 'REI_INTELLIGENCE_BACKUP');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const tables = [
        'rei_evolution_configs',
        'exam_historical_patterns',
        'ai_universal_calibration',
        'exam_topic_distributions'
    ];

    for (const table of tables) {
        console.log(`\n🔍 Fetching ${table}...`);
        const { data, error } = await supabase.from(table).select('*');

        if (error) {
            console.error(`❌ Error backing up ${table}:`, error.message);
            continue;
        }

        const filePath = path.join(backupDir, `${table}_backup.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`✅ ${table} backed up to: ${filePath} (${data?.length || 0} records)`);
    }

    console.log('\n================================================================');
    console.log('🏆 REI Intelligence Backup Complete.');
    console.log('You can now wipe the DB. Use this data to verify the incremental');
    console.log('re-upload process results against this "Known Truth" baseline.');
    console.log('================================================================');
}

backupREIConfig().catch(console.error);
