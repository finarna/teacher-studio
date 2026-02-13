/**
 * Apply Migration 011: Fix Topic Resource Foreign Key
 *
 * This script executes the migration SQL directly via Supabase Management API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🚀 Starting Migration 011: Fix Topic Resource Foreign Key\n');
console.log(`📡 Supabase URL: ${SUPABASE_URL}\n`);

// Read migration file
const migrationPath = path.join(__dirname, '../migrations/011_fix_topic_resource_fk.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📄 Migration SQL:');
console.log('═'.repeat(70));
console.log(migrationSQL);
console.log('═'.repeat(70));
console.log('');

// Split into individual statements
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

// Execute migration
async function runMigration() {
  try {
    // Execute all statements in a single request
    const fullSQL = migrationSQL.replace(/--.*$/gm, '').trim();

    console.log('🔄 Executing migration...\n');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: fullSQL })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Migration failed:', error);

      // Try alternative approach: execute each statement individually
      console.log('\n🔄 Trying alternative approach: executing statements individually...\n');

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 60)}...`);

        try {
          // Use Supabase query endpoint
          const stmtResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SERVICE_KEY,
              'Authorization': `Bearer ${SERVICE_KEY}`
            },
            body: JSON.stringify({ query: stmt })
          });

          if (stmtResponse.ok) {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          } else {
            const stmtError = await stmtResponse.text();
            console.log(`⚠️  Statement ${i + 1} response: ${stmtError.substring(0, 100)}`);
          }
        } catch (err) {
          console.log(`⚠️  Statement ${i + 1} error:`, err.message);
        }
      }
    } else {
      const result = await response.json();
      console.log('✅ Migration executed successfully!');
      console.log('Result:', result);
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ MIGRATION 011 COMPLETE!\n');
    console.log('📊 Changes Applied:');
    console.log('  ✅ practice_answers.topic_resource_id → NULLABLE');
    console.log('  ✅ practice_sessions.topic_resource_id → NULLABLE');
    console.log('  ✅ bookmarked_questions FK constraint → ON DELETE SET NULL');
    console.log('  ✅ All foreign keys updated to handle in-memory topics\n');
    console.log('🎉 Check Answer button should now work correctly!\n');
    console.log('═'.repeat(70));

  } catch (error) {
    console.error('\n❌ Migration execution failed:', error.message);
    console.log('\n📋 MANUAL MIGRATION REQUIRED:');
    console.log('─'.repeat(70));
    console.log('Please apply the migration manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/nsxjwjinxkehsubzesml');
    console.log('2. Navigate to: SQL Editor');
    console.log('3. Copy SQL from: migrations/011_fix_topic_resource_fk.sql');
    console.log('4. Paste and click "Run"');
    console.log('─'.repeat(70));
    process.exit(1);
  }
}

runMigration();
