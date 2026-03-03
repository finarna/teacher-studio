import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function checkColumns() {
  const tables = ['exam_configurations', 'topic_metadata', 'generation_rules'];
  for (const table of tables) {
    console.log('
--- ' + table + ' ---');
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log('Error:', error.message);
    } else {
      console.log('Columns:', Object.keys(data[0] || {}));
    }
  }
}
checkColumns();
