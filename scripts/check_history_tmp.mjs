import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
const content = fs.readFileSync('.env', 'utf8');
content.split('\n').filter(l => l && !l.startsWith('#')).forEach(l => {
  const i = l.indexOf('=');
  if (i !== -1) {
     const k = l.substring(0, i).trim();
     const v = l.substring(i + 1).trim().replace(/^['"]|['"]$/g, '');
     env[k] = v;
  }
});

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('test_attempts')
    .select('created_at, test_name, exam_context, total_questions, status, subject')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('DB Error:', error.message);
  } else {
    console.log('--- TEST ATTEMPTS ---');
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
