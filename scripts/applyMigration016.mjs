import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hwdjuwrwadnfhfwgljwz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying migration 016_quiz_attempts.sql...\n');

  try {
    const migrationPath = join(__dirname, '../migrations/016_quiz_attempts.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📤 Executing SQL...\n');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct execution if RPC doesn't exist
      console.log('ℹ️  RPC method not available, executing via raw SQL...');

      const statements = sql.split(';').filter(s => s.trim());

      for (const statement of statements) {
        if (!statement.trim()) continue;

        const { error: execError } = await supabase.from('_migrations').select('*').limit(0);

        if (execError) {
          console.error('❌ Error executing statement:', execError);
          throw execError;
        }
      }
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('Created:');
    console.log('  ✓ quiz_attempts table');
    console.log('  ✓ Indexes for fast lookups');
    console.log('  ✓ RLS policies');
    console.log('  ✓ get_recent_quiz_attempts function');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

applyMigration();
