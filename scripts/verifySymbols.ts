/**
 * Verify AI-generated symbols in database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifySymbols() {
  console.log('🔍 Verifying AI-Generated Symbols...\n');

  // Get sample topics from each subject
  const { data, error } = await supabase
    .from('topics')
    .select('name, subject, representative_symbol, symbol_type')
    .order('subject', { ascending: true })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${data.length} topics with symbols:\n`);

  let currentSubject = '';
  data.forEach(topic => {
    if (topic.subject !== currentSubject) {
      currentSubject = topic.subject;
      console.log(`\n📚 ${currentSubject.toUpperCase()}`);
      console.log('─'.repeat(50));
    }
    console.log(`${topic.name}`);
    console.log(`  Symbol: ${topic.representative_symbol} (${topic.symbol_type})`);
  });

  console.log('\n✅ Verification complete!');
}

verifySymbols();
