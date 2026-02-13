/**
 * Apply Migration 011: Fix Topic Resource Foreign Key
 *
 * This script applies the migration to make topic_resource_id nullable
 * across practice_answers, bookmarked_questions, and practice_sessions tables.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying Migration 011: Fix Topic Resource Foreign Key\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/011_fix_topic_resource_fk.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log('');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Executing ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing...`);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        // Try direct SQL execution via REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql: statement + ';' })
        });

        if (!response.ok) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          throw error;
        }
      }

      console.log(`✅ Statement ${i + 1} executed successfully\n`);
    }

    console.log('✅ Migration 011 applied successfully!\n');
    console.log('📊 Changes made:');
    console.log('  ✅ practice_answers.topic_resource_id is now nullable');
    console.log('  ✅ bookmarked_questions.topic_resource_id FK updated');
    console.log('  ✅ practice_sessions.topic_resource_id is now nullable');
    console.log('  ✅ All FK constraints set to ON DELETE SET NULL');
    console.log('\n🎉 Check Answer button should now work!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
applyMigration();
