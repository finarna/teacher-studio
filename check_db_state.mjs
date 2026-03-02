import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
const content = fs.readFileSync('.env', 'utf8');
content.split('\n').filter(l => l && !l.startsWith('#')).forEach(l => {
  const i = l.indexOf('=');
  if (i !== -1) {
     env[l.substring(0, i).trim()] = l.substring(i + 1).trim().replace(/^['"]|['"]$/g, '');
  }
});

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('--- Checking DB State ---');
  
  const { data: configs, error: configError } = await supabase.from('exam_configurations').select('*');
  console.log('Exam Configurations Count:', configs?.length || 0);
  if (configs) console.log(configs);

  const { data: topics, error: topicError } = await supabase.from('topic_metadata').select('count', { count: 'exact', head: true });
  console.log('Topic Metadata Count:', topics?.length || 0);

  const { data: rules, error: rulesError } = await supabase.from('generation_rules').select('*');
  console.log('Generation Rules Count:', rules?.length || 0);
  if (rules) console.log(rules);

  const { data: calibrations, error: calibError } = await supabase.from('ai_universal_calibration').select('*');
  console.log('AI Universal Calibration Count:', calibrations?.length || 0);
}
run();
