/**
 * Check if migration is needed and apply if necessary
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

async function checkMigration() {
  console.log('🔍 Checking if migration is needed...\n');

  try {
    // Try to select the new columns from topics table
    const { data, error } = await supabase
      .from('topics')
      .select('representative_symbol, symbol_type, representative_image_url')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Migration needed! Columns do not exist.');
        console.log('\n📝 Please apply migration manually:');
        console.log('   Option 1: Use Supabase Dashboard SQL Editor');
        console.log('   Option 2: Run: psql <connection-string> -f migrations/014_add_topic_symbols.sql');
        console.log('\n   Migration file: migrations/014_add_topic_symbols.sql\n');
        return false;
      } else {
        throw error;
      }
    }

    console.log('✅ Migration already applied! Columns exist.\n');
    return true;

  } catch (error) {
    console.error('❌ Error checking migration:', error);
    return false;
  }
}

checkMigration().then(ready => {
  if (ready) {
    console.log('✅ Database is ready for symbol generation!');
    process.exit(0);
  } else {
    console.log('⚠️  Please apply migration first before running generation script.');
    process.exit(1);
  }
});
