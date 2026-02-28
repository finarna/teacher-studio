import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    const migrationFile = process.argv[2];
    if (!migrationFile) {
        console.error('Usage: npx tsx scripts/runMigration.ts <path_to_sql>');
        process.exit(1);
    }

    console.log(`🔄 Applying migration ${migrationFile}...\n`);

    try {
        const migrationSQL = readFileSync(migrationFile, 'utf-8');

        // Split by semicolons, but be careful with DO blocks
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 100)}...`);
            const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

            if (error) {
                console.error(`  ❌ Error: ${error.message}`);
                // Fallback for some environments: try to run it directly if it's a simple query
                // But most DDL requires higher privileges or specific RPCs
            } else {
                console.log(`  ✅ Success`);
            }
        }

        console.log('\n🏁 Finished processing migration.\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

applyMigration();
