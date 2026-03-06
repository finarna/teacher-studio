const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: topics } = await supabaseAdmin.from('topic_sketches').select('topic, updated_at, page_count').order('updated_at', { ascending: false }).limit(5);
  console.log("Latest Topic Sketches in DB:", topics);
  const { data: qs } = await supabaseAdmin.from('questions').select('id, sketch_svg_url, updated_at').not('sketch_svg_url', 'is', null).order('updated_at', { ascending: false }).limit(2);
  console.log("Recent Question Sketches in DB:", qs);
}
check();
