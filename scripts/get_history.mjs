import fs from 'fs';
import https from 'https';

async function run() {
  try {
    const env = {};
    const content = fs.readFileSync('.env', 'utf8');
    content.split('\n').filter(l => l && !l.startsWith('#')).forEach(l => {
      const i = l.indexOf('=');
      if (i !== -1) {
        env[l.substring(0, i).trim()] = l.substring(i+1).trim().replace(/^['"]|['"]$/g, '');
      }
    });

    const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) { console.log('NO_CONFIG'); return; }

    const tableUrl = url + '/rest/v1/test_attempts?select=created_at,test_name,total_questions,exam_context&order=created_at.desc&limit=10';
    
    const req = https.request(tableUrl, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('RESULTS_START');
        console.log(data);
        console.log('RESULTS_END');
      });
    });

    req.on('error', (e) => console.error(e));
    req.end();
  } catch(e) { console.error(e); }
}
run();
