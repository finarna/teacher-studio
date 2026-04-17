import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCANS = {
  2025: 'c202f81d-cc53-40b1-a473-8f621faac5ba',
  2024: '7019df69-f2e2-4464-afbb-cc56698cb8e9'
};

async function compareQuestions() {
  // Get 10 KCET 2024 Math questions
  const { data: actual2024 } = await supabase
    .from('questions')
    .select('text, options, difficulty, topic, question_order')
    .eq('scan_id', SCANS[2024])
    .order('question_order')
    .limit(10);

  console.log('=== ACTUAL KCET 2024 MATH QUESTIONS (First 10) ===\n');
  actual2024?.forEach((q) => {
    console.log(`Q${q.question_order}. [${q.difficulty || 'N/A'}] ${q.topic || 'Unknown'}`);
    console.log(`   ${q.text?.substring(0, 180) || 'No text'}${q.text && q.text.length > 180 ? '...' : ''}`);
    if (q.options && q.options.length >= 2) {
      console.log(`   A) ${q.options[0]?.substring(0, 60)}`);
      console.log(`   B) ${q.options[1]?.substring(0, 60)}`);
    }
    console.log('');
  });
}

compareQuestions().catch(console.error);
