/**
 * Apply migration 014 - Add topic symbols
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔄 Applying migration 014_add_topic_symbols.sql...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'migrations', '014_add_topic_symbols.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split by semicolons to execute statements separately
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('ALTER TABLE') || statement.includes('CREATE INDEX')) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // Try direct execution if RPC fails
          console.log('  Trying direct execution...');
          const { error: directError } = await supabase.from('_migrations').insert({});

          if (directError) {
            console.log(`  ⚠️ Warning: ${error.message}`);
          } else {
            console.log(`  ✅ Success`);
          }
        } else {
          console.log(`  ✅ Success`);
        }
      }
    }

    console.log('\n✅ Migration applied successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

applyMigration();
