import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tablesToClear = [
    'exam_topic_distributions',
    'exam_historical_patterns',
    'ai_universal_calibration',
    'topic_sketches',
    'sketch_progress',
    'flashcards',
    'quiz_attempts',
    'test_responses',
    'test_attempts',
    'test_templates',
    'practice_answers',
    'bookmarked_questions',
    'practice_sessions',
    'vidya_sessions',
    'scans'
];

async function run() {
    console.log('⚠️ WARNING: You are about to wipe all dynamic user data! (Scans, REI, Mocks, Visuals, etc.)');
    console.log('This will give you a completely fresh slate to re-upload scans from 2021 onwards.\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Are you sure you want to proceed? Type YES to confirm: ', async (answer) => {
        if (answer !== 'YES') {
            console.log('Aborted.');
            rl.close();
            return;
        }

        console.log('\n🗑️ Starting database cleanup...');

        for (const table of tablesToClear) {
            console.log(`Clearing ${table}...`);
            const { error } = await supabase
                .from(table)
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows safely

            if (error) {
                // Fallback for tables without 'id' or different primary key
                console.warn(`Error on ${table}: ${error.message}. Trying generic wipe...`);
                // If it fails, it might be due to a specific ID type, try deleting where id is not null, or try RPC if needed.
                // Actually .gte('created_at', '1970-01-01') is a safe fallback
                const { error: fallbackError } = await supabase.from(table).delete().gte('created_at', '1970-01-01');
                if (fallbackError) {
                    console.error(`❌ Failed to clear ${table}:`, fallbackError);
                } else {
                    console.log(`✅ Cleared ${table}`);
                }
            } else {
                console.log(`✅ Cleared ${table}`);
            }
        }

        console.log('\n✨ Database is now completely fresh and ready for 2021 uploads!');
        rl.close();
    });
}

run();
