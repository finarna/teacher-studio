const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: q } = await supabaseAdmin.from('scans').select('analysis_data').not('analysis_data', 'is', null).limit(1);
  console.log(JSON.stringify(q[0].analysis_data.questions[0], null, 2));
  process.exit(0);
}
check();
