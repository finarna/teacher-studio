import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('topics')
  .select('id, name, subject, domain')
  .eq('subject', 'Math')
  .order('name');

if (error) {
  console.error('Error:', error);
} else {
  console.log('\n📚 OFFICIAL MATH TOPICS:\n');
  console.log('Total:', data.length, 'topics\n');
  data.forEach(t => {
    console.log(`• ${t.name} [${t.domain || 'No Domain'}]`);
  });
}
