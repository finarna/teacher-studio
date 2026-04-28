import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const JSON_FILES = [
  'flagship_final.json',
  'flagship_physics_final.json',
  'flagship_chemistry_final.json',
  'flagship_biology_final.json'
];

async function auditMapping() {
  console.log('🧐 Starting Flagship-to-Registry Mapping Audit...');

  // 1. Fetch all active KCET topics from DB
  const { data: dbTopics } = await supabase
    .from('topics')
    .select('name, subject')
    .eq('exam_weightage->KCET', 2);

  const dbTopicNames = new Set(dbTopics?.map(t => t.name) || []);

  for (const fileName of JSON_FILES) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;

    console.log(`\n📄 Auditing ${fileName}...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const questions = data.test_config?.questions || [];
    
    const unmapped = new Set<string>();
    const mapped = new Set<string>();

    questions.forEach((q: any) => {
      if (dbTopicNames.has(q.topic)) {
        mapped.add(q.topic);
      } else {
        unmapped.add(q.topic);
      }
    });

    console.log(`   ✅ Correctly Mapped Topics: ${mapped.size}`);
    if (unmapped.size > 0) {
      console.log(`   ❌ UNMAPPED TOPICS (Will not show in Mastery):`);
      unmapped.forEach(u => console.log(`      - "${u}"`));
    } else {
      console.log(`   ✨ 100% Alignment Detected!`);
    }
  }
}

auditMapping();
