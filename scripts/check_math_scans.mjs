/**
 * Check Math scans for LaTeX issues
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMathScans() {
  console.log('🔍 Checking Math scans...\n');

  const { data: scans, error } = await supabase
    .from('scans')
    .select('*')
    .eq('subject', 'Math')
    .eq('is_system_scan', true)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Found ${scans.length} published Math scans:\n`);

  for (const scan of scans) {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('scan_id', scan.id);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Scan: ${scan.name || scan.file_name}`);
    console.log(`ID: ${scan.id}`);
    console.log(`Year: ${scan.year}`);
    console.log(`Questions: ${count}`);
    console.log(`Created: ${new Date(scan.created_at).toLocaleString()}`);
  }

  // Now check latest Math scan for LaTeX issues
  if (scans.length > 0) {
    const latestScan = scans[0];
    console.log(`\n\n🔍 Checking latest Math scan for LaTeX issues...`);
    console.log(`Scan: ${latestScan.name || latestScan.file_name}\n`);

    const { data: questions } = await supabase
      .from('questions')
      .select('id, text, solution_steps')
      .eq('scan_id', latestScan.id)
      .limit(5);

    questions?.forEach((q, idx) => {
      console.log(`\nQuestion ${idx + 1}: ${q.text?.substring(0, 80)}...`);
      console.log(`  Has solution_steps: ${q.solution_steps ? 'YES' : 'NO'}`);

      if (q.solution_steps && q.solution_steps.length > 0) {
        const hasLatex = q.solution_steps.some(s =>
          s.includes('\\{') || s.includes('\\dots') || s.includes('\\sum') || /\\[a-z]/.test(s)
        );
        console.log(`  Has LaTeX markup: ${hasLatex ? 'YES ❌' : 'NO ✓'}`);

        if (hasLatex) {
          const badStep = q.solution_steps.find(s =>
            s.includes('\\{') || s.includes('\\dots') || /\\[a-z]/.test(s)
          );
          console.log(`  Example: "${badStep?.substring(0, 100)}..."`);
        }
      }

      // Check question text for LaTeX issues
      if (q.text) {
        const textHasLatex = q.text.includes('\\{') || q.text.includes('\\dots') || q.text.includes('\\sum');
        console.log(`  Question text has LaTeX: ${textHasLatex ? 'YES ❌' : 'NO ✓'}`);
        if (textHasLatex) {
          console.log(`  Text sample: "${q.text.substring(0, 100)}..."`);
        }
      }
    });

    // Count totals
    const { data: allQuestions } = await supabase
      .from('questions')
      .select('solution_steps, text')
      .eq('scan_id', latestScan.id);

    const withLatexSolutions = allQuestions?.filter(q =>
      q.solution_steps?.some(s =>
        s.includes('\\{') || s.includes('\\dots') || /\\[a-z]/.test(s)
      )
    ).length || 0;

    const withLatexText = allQuestions?.filter(q =>
      q.text?.includes('\\{') || q.text?.includes('\\dots')
    ).length || 0;

    console.log(`\n\n📊 Summary for latest Math scan:`);
    console.log(`  Total questions: ${allQuestions?.length || 0}`);
    console.log(`  Questions with LaTeX in solution_steps: ${withLatexSolutions}`);
    console.log(`  Questions with LaTeX in text: ${withLatexText}`);
  }
}

checkMathScans();
