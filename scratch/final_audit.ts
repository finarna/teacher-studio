import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const JSON_FILES = [
  { file: 'flagship_final.json', subject: 'Math' },
  { file: 'flagship_physics_final.json', subject: 'Physics' },
  { file: 'flagship_chemistry_final.json', subject: 'Chemistry' },
  { file: 'flagship_biology_final.json', subject: 'Biology' }
];

async function finalAudit() {
  console.log('🧐 Starting FINAL Comprehensive Audit...');

  for (const item of JSON_FILES) {
    const filePath = path.join(process.cwd(), item.file);
    if (!fs.existsSync(filePath)) continue;

    console.log(`\n📄 Auditing ${item.file} (${item.subject})...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const questions = data.test_config?.questions || [];
    
    // Fetch ALL topics for this subject to see what's actually in DB
    const { data: dbTopics } = await supabase
      .from('topics')
      .select('name, exam_weightage')
      .eq('subject', item.subject);
    
    // Filter active KCET ones in JS
    const activeNames = new Set(dbTopics?.filter(t => {
      const kcet = t.exam_weightage?.KCET;
      return kcet !== undefined && kcet !== null && Number(kcet) > 0;
    }).map(t => t.name) || []);

    const unmapped = new Set<string>();
    const mapped = new Set<string>();

    questions.forEach((q: any) => {
      if (activeNames.has(q.topic)) {
        mapped.add(q.topic);
      } else {
        unmapped.add(q.topic);
      }
    });

    console.log(`   ✅ Correctly Mapped Topics: ${mapped.size}`);
    if (unmapped.size > 0) {
      console.log(`   ❌ UNMAPPED TOPICS (Will not show in Mastery):`);
      unmapped.forEach(u => {
        const dbStatus = dbTopics?.find(t => t.name === u);
        const weight = dbStatus ? JSON.stringify(dbStatus.exam_weightage) : 'MISSING FROM DB';
        console.log(`      - "${u}" (Status in DB: ${weight})`);
      });
    } else {
      console.log(`   ✨ 100% ALIGNMENT DETECTED!`);
    }
  }
}

finalAudit();
