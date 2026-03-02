import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// The question ID that's being shown to the user (from console log)
const targetQuestionId = '69ebe871-465e-4bb3-ae6d-f2394b1947bd';

// Complete solution data to add
const enrichedSolution = {
  subject: 'MATHS',
  exam_context: 'KCET',
  solution_steps: [
    'Step 1: Identify the restriction ::: The function $f(x) = \\frac{x}{1 - |x|}$ is defined for all real numbers $x$ except where the denominator is zero. We need to find where $1 - |x| = 0$.',
    'Step 2: Solve for the restriction ::: We have $1 - |x| = 0$, which implies $|x| = 1$. Since absolute value gives two solutions, this means $x = 1$ or $x = -1$.',
    'Step 3: Determine the domain ::: The domain of $f(x)$ is all real numbers except $x = 1$ and $x = -1$. In set notation, this is written as $R - \\{-1, 1\\}$ (R excluding the set containing -1 and 1).',
    'Step 4: Verify the correct option ::: Comparing our result with the given options, option (d) $R - \\{-1, 1\\}$ matches our solution exactly.'
  ],
  key_formulas: [
    'Domain: Set of all $x$ where denominator $\\neq 0$',
    'Absolute Value: $|x| = a \\Rightarrow x = \\pm a$ (gives two solutions)',
    'Set Notation: $R - \\{a, b\\}$ means all real numbers except $a$ and $b$'
  ],
  pitfalls: [
    {
      mistake: 'Confusing $R - [-1, 1]$ with $R - \\{-1, 1\\}$',
      why: '$R - [-1, 1]$ means excluding the interval from -1 to 1 (all numbers between -1 and 1), while $R - \\{-1, 1\\}$ means excluding only the two points -1 and 1',
      howToAvoid: 'Remember: Square brackets [] indicate intervals (ranges), curly braces {} indicate sets (specific values). For domain, we exclude POINTS where denominator is zero, not intervals.'
    },
    {
      mistake: 'Forgetting that $|x| = 1$ gives TWO solutions',
      why: 'Many students only consider $x = 1$ and miss $x = -1$, or vice versa',
      howToAvoid: 'Always expand absolute value equations: $|x| = a$ means $x = a$ OR $x = -a$. Both positive and negative values satisfy the equation.'
    },
    {
      mistake: 'Writing domain as $(-\\infty, 1) \\cup (0, 1)$',
      why: 'This excludes the entire region from -∞ to 0, which is incorrect. We only need to exclude the two points -1 and 1.',
      howToAvoid: 'Double-check: Does your answer make sense? Can f(0) be calculated? Yes! So 0 should be in the domain.'
    }
  ],
  exam_tip: 'Domain questions appear in 70%+ of KCET exams. For rational functions, ALWAYS check where denominator = 0 first. Common trap: intervals vs sets notation - KCET loves testing this distinction.',
  visual_concept: 'Graph: The function has vertical asymptotes at x = -1 and x = 1 where the denominator becomes zero. The function is continuous everywhere else on the real number line.',
  common_mistakes: [
    {
      mistake: 'Confusing interval notation with set notation',
      why: 'Brackets [] vs braces {} have different meanings',
      howToAvoid: 'Remember: {} for specific points, [] for ranges'
    },
    {
      mistake: 'Missing one solution from absolute value',
      why: 'Absolute value equations give two solutions',
      howToAvoid: 'Always write |x| = a as x = ±a'
    }
  ]
};

async function enrichQuestion() {
  console.log('\n🔧 ENRICHING Q19 WITH COMPLETE SOLUTION DATA\n');
  console.log(`Target Question ID: ${targetQuestionId}\n`);

  // First, check current state
  const { data: before, error: beforeError } = await supabase
    .from('questions')
    .select('text, subject, exam_context, solution_steps, key_formulas')
    .eq('id', targetQuestionId)
    .single();

  if (beforeError) {
    console.log(`❌ Error fetching question: ${beforeError.message}\n`);
    return;
  }

  console.log('📊 BEFORE UPDATE:');
  console.log(`  Text: ${before.text?.slice(0, 50)}...`);
  console.log(`  Subject: ${before.subject || '❌ NULL'}`);
  console.log(`  Exam: ${before.exam_context || '❌ NULL'}`);
  console.log(`  Solution Steps: ${before.solution_steps?.length || 0}`);
  console.log(`  Key Formulas: ${before.key_formulas?.length || 0}`);
  console.log('');

  // Update the question
  console.log('⚙️  UPDATING WITH ENRICHED DATA...\n');

  const { data: updated, error: updateError } = await supabase
    .from('questions')
    .update({
      subject: enrichedSolution.subject,
      exam_context: enrichedSolution.exam_context,
      solution_steps: enrichedSolution.solution_steps,
      key_formulas: enrichedSolution.key_formulas,
      pitfalls: enrichedSolution.pitfalls,
      exam_tip: enrichedSolution.exam_tip,
      visual_concept: enrichedSolution.visual_concept
    })
    .eq('id', targetQuestionId)
    .select();

  if (updateError) {
    console.log(`❌ Error updating: ${updateError.message}\n`);
    return;
  }

  console.log('✅ UPDATE SUCCESSFUL!\n');

  // Verify the update
  const { data: after } = await supabase
    .from('questions')
    .select('*')
    .eq('id', targetQuestionId)
    .single();

  console.log('📊 AFTER UPDATE:');
  console.log(`  Subject: ${after.subject || 'NULL'}`);
  console.log(`  Exam: ${after.exam_context || 'NULL'}`);
  console.log(`  Solution Steps: ${after.solution_steps?.length || 0}`);
  console.log(`  Key Formulas: ${after.key_formulas?.length || 0}`);
  console.log(`  Pitfalls: ${after.pitfalls?.length || 0}`);
  console.log(`  Exam Tip: ${after.exam_tip ? 'YES' : 'NO'}`);
  console.log(`  Visual Concept: ${after.visual_concept ? 'YES' : 'NO'}`);
  console.log('');

  console.log('📝 SOLUTION PREVIEW:\n');
  if (after.solution_steps && after.solution_steps.length > 0) {
    after.solution_steps.forEach((step, idx) => {
      const [title, content] = step.includes(':::') ? step.split(':::') : ['', step];
      console.log(`${idx + 1}. ${title.trim()}`);
      console.log(`   ${content.trim().slice(0, 100)}...\n`);
    });
  }

  console.log('⚡ KEY FORMULAS:\n');
  if (after.key_formulas && after.key_formulas.length > 0) {
    after.key_formulas.forEach((formula, idx) => {
      console.log(`${idx + 1}. ${formula}`);
    });
  }
  console.log('');

  console.log('⚠️  COMMON MISTAKES:\n');
  if (after.pitfalls && after.pitfalls.length > 0) {
    after.pitfalls.forEach((pitfall, idx) => {
      console.log(`${idx + 1}. ${pitfall.mistake}`);
      console.log(`   Why: ${pitfall.why.slice(0, 80)}...`);
      console.log(`   Fix: ${pitfall.howToAvoid.slice(0, 80)}...\n`);
    });
  }

  console.log('='.repeat(80));
  console.log('✅ QUESTION ENRICHMENT COMPLETE');
  console.log('='.repeat(80));
  console.log('\n💡 Next: Refresh the page and click "VIEW DETAILED SOLUTION" to see changes\n');
}

enrichQuestion().catch(console.error);
