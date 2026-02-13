import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Checking topic questions metadata...\n');

  // Get a sample of Physics questions
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, topic, marks, difficulty, blooms, year, domain, pedagogy, exam_context, subject')
    .eq('subject', 'Physics')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Found ${questions?.length} sample Physics questions\n`);

  questions?.forEach((q, idx) => {
    console.log(`\n━━━ Question ${idx + 1} ━━━`);
    console.log(`Topic:        ${q.topic || '❌ NULL'}`);
    console.log(`Subject:      ${q.subject || '❌ NULL'}`);
    console.log(`Marks:        ${q.marks || '❌ NULL'}`);
    console.log(`Year:         ${q.year || '❌ NULL'}`);
    console.log(`Domain:       ${q.domain || '❌ NULL'}`);
    console.log(`Difficulty:   ${q.difficulty || '❌ NULL'}`);
    console.log(`Pedagogy:     ${q.pedagogy || '❌ NULL'}`);
    console.log(`Blooms:       ${q.blooms || '❌ NULL'}`);
    console.log(`Exam Context: ${q.exam_context || '❌ NULL'}`);

    // Check completeness
    const hasAllMetadata = q.year && q.domain && q.difficulty && q.pedagogy && q.blooms && q.subject;
    console.log(`Status:       ${hasAllMetadata ? '✅ Complete' : '⚠️ Incomplete'}`);
  });

  // Count how many questions have complete metadata
  const { data: stats } = await supabase
    .from('questions')
    .select('id, year, domain, pedagogy')
    .eq('subject', 'Physics');

  const withYear = stats?.filter(q => q.year).length || 0;
  const withDomain = stats?.filter(q => q.domain).length || 0;
  const withPedagogy = stats?.filter(q => q.pedagogy).length || 0;
  const total = stats?.length || 0;

  console.log(`\n\n📈 Physics Questions Metadata Coverage:`);
  console.log(`─────────────────────────────────────`);
  console.log(`Total Questions:  ${total}`);
  console.log(`With Year:        ${withYear} (${Math.round(withYear/total*100)}%)`);
  console.log(`With Domain:      ${withDomain} (${Math.round(withDomain/total*100)}%)`);
  console.log(`With Pedagogy:    ${withPedagogy} (${Math.round(withPedagogy/total*100)}%)`);
}

main().catch(console.error);
