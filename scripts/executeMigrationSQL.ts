/**
 * Execute migration SQL using Supabase Management API
 */

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

async function executeMigration() {
  console.log('🔄 Executing migration SQL...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'migrations', '014_add_topic_symbols.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Remove comments and split into statements
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement using Supabase REST API
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing...`);
      console.log(`  ${statement.substring(0, 60)}...`);

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: statement })
      });

      if (!response.ok) {
        // If RPC doesn't exist, try alternative method - just log and continue
        console.log(`  ⚠️ Could not execute via API (this is normal)`);
        console.log(`  💡 Please apply migration manually via Supabase Dashboard\n`);
        console.log(`  SQL to execute:\n${migrationSQL}\n`);
        return false;
      }

      console.log(`  ✅ Success\n`);
    }

    console.log('✅ Migration completed!\n');
    return true;

  } catch (error) {
    console.error('❌ Error:', error);
    console.log(`\n💡 Please apply migration manually:\n`);
    console.log(`1. Go to Supabase Dashboard > SQL Editor`);
    console.log(`2. Copy content from migrations/014_add_topic_symbols.sql`);
    console.log(`3. Paste and run\n`);
    return false;
  }
}

executeMigration();
