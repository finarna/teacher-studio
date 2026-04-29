import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function check() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 CHECKING 2023 QUESTION NUMBERS FOR PATTERN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const SCAN_ID = 'e3767338-1664-4e03-b0f6-1fab41ff5838';

  console.log('NEET Typical Pattern:');
  console.log('   Q1-45:    Physics');
  console.log('   Q46-90:   Chemistry');
  console.log('   Q91-135:  Botany');
  console.log('   Q136-180: Zoology\n');

  const { data: questions } = await supabase
    .from('questions')
    .select('id, text, metadata')
    .eq('scan_id', SCAN_ID)
    .order('id', { ascending: true })
    .limit(30);

  if (!questions) {
    console.log('❌ No questions found');
    return;
  }

  console.log(`Sample of first 30 questions (out of 200):\n`);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const appId = q.metadata?.appId || 'N/A';
    const qNum = appId.includes('-') ? appId.split('-')[1] : 'N/A';

    console.log(`${String(i + 1).padStart(2)}. appId: ${String(appId).padEnd(10)} | Q#: ${String(qNum).padStart(3)} | ${q.text.substring(0, 50)}...`);
  }

  console.log('\n\n📊 Analyzing all 200 questions for pattern...\n');

  const { data: allQuestions } = await supabase
    .from('questions')
    .select('metadata')
    .eq('scan_id', SCAN_ID);

  const appIds: string[] = [];
  for (const q of allQuestions || []) {
    if (q.metadata?.appId) {
      appIds.push(q.metadata.appId);
    }
  }

  console.log(`Found ${appIds.length} questions with appId\n`);

  if (appIds.length > 0) {
    // Try to extract numbers
    const numbers: number[] = [];
    for (const appId of appIds) {
      const parts = appId.split('-');
      if (parts.length > 1) {
        const num = parseInt(parts[1]);
        if (!isNaN(num)) {
          numbers.push(num);
        }
      }
    }

    if (numbers.length > 0) {
      numbers.sort((a, b) => a - b);
      console.log(`✅ Question numbers range: ${numbers[0]} to ${numbers[numbers.length - 1]}`);
      console.log(`   Total numbered: ${numbers.length}\n`);

      console.log('📋 Proposed Subject Mapping:');
      console.log(`   Q1-45:    Physics   (${numbers.filter(n => n >= 1 && n <= 45).length} questions)`);
      console.log(`   Q46-90:   Chemistry (${numbers.filter(n => n >= 46 && n <= 90).length} questions)`);
      console.log(`   Q91-135:  Botany    (${numbers.filter(n => n >= 91 && n <= 135).length} questions)`);
      console.log(`   Q136-180: Zoology   (${numbers.filter(n => n >= 136 && n <= 180).length} questions)`);
      console.log(`   Q181+:    Unknown   (${numbers.filter(n => n > 180).length} questions)`);
    } else {
      console.log('❌ Could not extract question numbers from appId');
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

check().catch(console.error);
