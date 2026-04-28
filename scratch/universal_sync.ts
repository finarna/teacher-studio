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

async function universalSync() {
  console.log('🌎 Starting FINAL Universal Sync (Math Protocol)...');

  for (const item of JSON_FILES) {
    const filePath = path.join(process.cwd(), item.file);
    if (!fs.existsSync(filePath)) continue;

    console.log(`\n📂 Subject: ${item.subject} (${item.file})`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const questions = data.test_config?.questions || [];
    
    const uniqueTopics = new Set<string>();
    questions.forEach((q: any) => { if (q.topic) uniqueTopics.add(q.topic); });

    for (const topicName of uniqueTopics) {
      const { data: existing } = await supabase
        .from('topics')
        .select('id, exam_weightage')
        .eq('subject', item.subject)
        .eq('name', topicName);

      if (existing && existing.length > 0) {
        const topic = existing[0];
        const weightage = topic.exam_weightage || {};
        weightage.KCET = 2;
        await supabase.from('topics').update({ exam_weightage: weightage }).eq('id', topic.id);
        console.log(`  ✅ Synced: ${topicName}`);
      } else {
        await supabase.from('topics').insert({
          name: topicName,
          subject: item.subject,
          exam_weightage: { KCET: 2 },
          representative_symbol: 'book',
          symbol_type: 'lucide'
        });
        console.log(`  ➕ Added: ${topicName}`);
      }
    }
  }

  console.log('\n🌟 Sync Complete! Running Final Audit...');
}

universalSync();
