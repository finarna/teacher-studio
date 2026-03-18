const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: topics } = await supabaseAdmin.from('topic_sketches').select('topic, updated_at, page_count').order('updated_at', { ascending: false }).limit(2);
  console.log("Latest Topic Sketches in DB:", topics);
  process.exit(0);
}
check();
