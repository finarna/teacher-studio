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

async function checkUserIds() {
  const { data: scans } = await supabase
    .from('scans')
    .select('id, user_id, subject, name')
    .eq('subject', 'Physics')
    .limit(5);

  console.log('\nPhysics scans:');
  scans?.forEach(s => {
    console.log(`  - ID: ${s.id}`);
    console.log(`    Name: ${s.name}`);
    console.log(`    User ID: ${s.user_id || 'NULL'}`);
    console.log('');
  });
}

checkUserIds();
