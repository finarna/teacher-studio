import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupFlagship() {
    console.log("🧹 CLEANING UP OLD FLAGSHIP PAPERS...");

    // 1. Find and delete from test_attempts
    const { data: attempts, error: fetchError } = await supabase
        .from('test_attempts')
        .select('id, test_name')
        .ilike('test_name', 'PLUS2AI OFFICIAL PREDICTION%');

    if (fetchError) {
        console.error("❌ Error fetching attempts:", fetchError);
    } else if (attempts && attempts.length > 0) {
        console.log(`🗑️ Found ${attempts.length} papers in test_attempts to delete.`);
        const attemptIds = attempts.map(a => a.id);
        const { error: deleteError } = await supabase
            .from('test_attempts')
            .delete()
            .in('id', attemptIds);
        if (deleteError) console.error("❌ Error deleting attempts:", deleteError);
        else console.log("✅ Successfully deleted old flagship papers from test_attempts.");
    }

    // 2. Find and delete from mock_tests (The New Architecture)
    try {
        const { data: mocks, error: mockFetchError } = await supabase
            .from('mock_tests')
            .select('id, title')
            .ilike('title', 'PLUS2AI OFFICIAL PREDICTION%');

        if (mockFetchError) {
            if (mockFetchError.code === 'PGRST205') {
                console.log("ℹ️ Table 'mock_tests' does not exist yet. Skipping.");
            } else {
                console.error("❌ Error fetching mock_tests:", mockFetchError);
            }
        } else if (mocks && mocks.length > 0) {
            console.log(`🗑️ Found ${mocks.length} papers in mock_tests to delete.`);
            const mockIds = mocks.map(m => m.id);
            const { error: mockDeleteError } = await supabase
                .from('mock_tests')
                .delete()
                .in('id', mockIds);
            if (mockDeleteError) console.error("❌ Error deleting mock_tests:", mockDeleteError);
            else console.log("✅ Successfully deleted old flagship papers from mock_tests.");
        }
    } catch (e) {
        console.log("ℹ️ Skipping mock_tests cleanup.");
    }
}

cleanupFlagship();
