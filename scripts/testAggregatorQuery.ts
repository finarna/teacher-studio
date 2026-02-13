import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';
  const subject = 'Physics';

  console.log(`Testing query with userId=${userId}, subject=${subject}`);

  // Exact query from aggregator
  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select('id, subject')
    .eq('user_id', userId)
    .eq('subject', subject);

  console.log('Error:', scansError);
  console.log('Scans:', scans);
  console.log('Count:', scans?.length || 0);
}

testQuery();
