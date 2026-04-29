import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeScan() {
  const scanId = 'e3767338-1664-4e03-b0f6-1fab41ff5838';

  const { data: questions } = await supabase
    .from('questions')
    .select('question_order, subject, topic')
    .eq('scan_id', scanId)
    .order('question_order', { ascending: true });

  if (!questions) return;

  console.log('\n🔍 NEET 2023 Scan Analysis:');
  console.log('='.repeat(80));
  console.log(`\nTotal questions in scan: ${questions.length}`);

  const bySubject = {
    Physics: questions.filter(q => q.subject === 'Physics'),
    Chemistry: questions.filter(q => q.subject === 'Chemistry'),
    Biology: questions.filter(q => q.subject === 'Biology'),
  };

  console.log('\n📊 Subject Distribution:');
  console.log(`   Physics:   ${bySubject.Physics.length} questions`);
  console.log(`   Chemistry: ${bySubject.Chemistry.length} questions`);
  console.log(`   Biology:   ${bySubject.Biology.length} questions`);

  console.log('\n📍 Question Number Ranges:');
  console.log(`   Physics:   Q${Math.min(...bySubject.Physics.map(q => q.question_order))} to Q${Math.max(...bySubject.Physics.map(q => q.question_order))}`);
  console.log(`   Chemistry: Q${Math.min(...bySubject.Chemistry.map(q => q.question_order))} to Q${Math.max(...bySubject.Chemistry.map(q => q.question_order))}`);
  console.log(`   Biology:   Q${Math.min(...bySubject.Biology.map(q => q.question_order))} to Q${Math.max(...bySubject.Biology.map(q => q.question_order))}`);

  console.log('\n📝 Physics Questions (first 10):');
  bySubject.Physics.slice(0, 10).forEach(q => {
    console.log(`   Q${q.question_order}: ${q.topic}`);
  });

  console.log('\n📝 Chemistry Questions (first 5):');
  bySubject.Chemistry.slice(0, 5).forEach(q => {
    console.log(`   Q${q.question_order}: ${q.topic}`);
  });

  console.log('\n📝 Biology Questions (first 5):');
  bySubject.Biology.slice(0, 5).forEach(q => {
    console.log(`   Q${q.question_order}: ${q.topic}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Complete\n');
}

analyzeScan().catch(console.error);
