/**
 * Check if solution_steps contain raw LaTeX markup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLatexMarkup() {
  console.log('🔍 Checking for LaTeX markup in solution_steps...\n');

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, text, solution_steps')
    .eq('scan_id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c')
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  let hasLatexCount = 0;

  questions.forEach((q, idx) => {
    const hasLatex = q.solution_steps.some(s =>
      s.includes('\\begin{itemize}') ||
      s.includes('\\end{itemize}') ||
      s.includes('\\item ')
    );

    if (hasLatex) {
      hasLatexCount++;
      console.log(`\n❌ Question ${idx + 1} HAS LaTeX markup:`);
      console.log(`   Text: ${q.text?.substring(0, 60)}...`);
      console.log(`   First step:\n   "${q.solution_steps[0]?.substring(0, 150)}..."`);
    } else {
      console.log(`\n✅ Question ${idx + 1} is clean (no LaTeX markup)`);
    }
  });

  // Count all questions with LaTeX
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('solution_steps')
    .eq('scan_id', 'ac0c3b81-e9be-4747-994b-a4ec3baf8e1c');

  const totalWithLatex = allQuestions.filter(q =>
    q.solution_steps.some(s =>
      s.includes('\\begin{itemize}') ||
      s.includes('\\end{itemize}') ||
      s.includes('\\item ')
    )
  ).length;

  console.log(`\n\n📊 Summary:`);
  console.log(`   Questions with LaTeX markup: ${totalWithLatex}/56`);
  console.log(`   Questions clean: ${56 - totalWithLatex}/56`);
}

checkLatexMarkup();
