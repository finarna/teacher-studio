import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Checking Question 765 metadata...\n');

  const { data: question, error } = await supabase
    .from('questions')
    .select('id, text, topic, marks, difficulty, blooms, year, domain, pedagogy, exam_context, subject')
    .eq('id', '765')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!question) {
    console.log('❌ Question 765 not found');
    return;
  }

  console.log('📊 Question 765 Metadata:');
  console.log('─────────────────────────────');
  console.log(`ID:           ${question.id}`);
  console.log(`Text:         ${question.text?.substring(0, 60)}...`);
  console.log(`Topic:        ${question.topic || '❌ NULL'}`);
  console.log(`Marks:        ${question.marks || '❌ NULL'}`);
  console.log(`Difficulty:   ${question.difficulty || '❌ NULL'}`);
  console.log(`Blooms:       ${question.blooms || '❌ NULL'}`);
  console.log(`Year:         ${question.year || '❌ NULL'}`);
  console.log(`Domain:       ${question.domain || '❌ NULL'}`);
  console.log(`Pedagogy:     ${question.pedagogy || '❌ NULL'}`);
  console.log(`Exam Context: ${question.exam_context || '❌ NULL'}`);
  console.log(`Subject:      ${question.subject || '❌ NULL'}`);

  console.log('\n🎯 UI Display Check:');
  console.log('─────────────────────────────');
  console.log(`✅ Question Number: Q ${question.id}`);
  console.log(`${question.subject ? '✅' : '❌'} Subject: ${question.subject || 'Missing'}`);
  console.log(`${question.marks ? '✅' : '❌'} Marks: ${question.marks || 'Missing'}`);
  console.log(`${question.year ? '✅' : '❌'} Year: ${question.year || 'Missing'}`);
  console.log(`${question.domain ? '✅' : '❌'} Domain: ${question.domain || 'Missing'}`);
  console.log(`${question.topic ? '✅' : '❌'} Topic: ${question.topic || 'Missing'}`);
  console.log(`${question.difficulty ? '✅' : '❌'} Difficulty: ${question.difficulty || 'Missing'}`);
  console.log(`${question.pedagogy ? '✅' : '❌'} Pedagogy: ${question.pedagogy || 'Missing'}`);
  console.log(`${question.blooms ? '✅' : '❌'} Bloom's: ${question.blooms || 'Missing'}`);
}

main().catch(console.error);
