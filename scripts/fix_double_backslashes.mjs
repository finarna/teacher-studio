#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═'.repeat(120));
console.log('FIXING DOUBLE-ESCAPED BACKSLASHES IN DATABASE');
console.log('═'.repeat(120));
console.log();

// Get latest scan
const { data: scans } = await supabase
  .from('scans')
  .select('id, name')
  .order('created_at', { ascending: false })
  .limit(1);

console.log(`📄 Scan: ${scans[0].name}`);
console.log(`🆔 ID: ${scans[0].id.substring(0, 8)}...`);
console.log();

// Get ALL questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, question_order, text, options')
  .eq('scan_id', scans[0].id)
  .order('question_order');

console.log(`Total questions: ${questions.length}`);
console.log();

let fixedCount = 0;
const updates = [];

for (const q of questions) {
  let needsUpdate = false;
  let fixedText = q.text;
  let fixedOptions = [...q.options];

  // Fix text - replace doubled backslashes with single for LaTeX commands only
  // BUT only inside math delimiters ($...$)
  const textParts = fixedText.split('$');
  textParts.forEach((part, i) => {
    if (i % 2 === 1) { // Inside dollar signs
      const original = part;

      // List of LaTeX commands that should have single backslash
      const commands = [
        'frac', 'sqrt', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
        'log', 'ln', 'det', 'lim', 'sum', 'int', 'prod',
        'alpha', 'beta', 'gamma', 'delta', 'theta', 'phi', 'pi', 'lambda', 'omega', 'mu', 'nu', 'rho', 'sigma', 'tau',
        'in', 'cap', 'cup', 'subset', 'subseteq', 'supseteq', 'supset', 'times', 'pm', 'mp',
        'leq', 'geq', 'neq', 'approx', 'equiv', 'cong',
        'to', 'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
        'infty', 'partial', 'nabla', 'forall', 'exists',
        'begin', 'end', 'left', 'right',
        'text', 'mathrm', 'mathbf', 'mathit', 'mathcal',
        'cdot', 'dots', 'ldots', 'cdots', 'vdots', 'ddots',
        'vec', 'hat', 'bar', 'tilde', 'widetilde', 'overline', 'underline'
      ];

      // Replace \\command with \command for each LaTeX command
      // In the actual string we have 2 backslashes, so regex needs \\\\ (4 in source = 2 in pattern)
      // Replace with 1 backslash, so \\ (2 in source = 1 in string)
      commands.forEach(cmd => {
        const regex = new RegExp(`\\\\\\\\${cmd}`, 'g');
        part = part.replace(regex, `\\\\${cmd}`);
      });

      textParts[i] = part;
      if (part !== original) {
        needsUpdate = true;
      }
    }
  });
  fixedText = textParts.join('$');

  // Fix options
  fixedOptions = fixedOptions.map(opt => {
    const optParts = opt.split('$');
    optParts.forEach((part, i) => {
      if (i % 2 === 1) {
        const original = part;

        const commands = [
          'frac', 'sqrt', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
          'log', 'ln', 'det', 'lim', 'sum', 'int', 'prod',
          'alpha', 'beta', 'gamma', 'delta', 'theta', 'phi', 'pi', 'lambda', 'omega', 'mu', 'nu', 'rho', 'sigma', 'tau',
          'in', 'cap', 'cup', 'subset', 'subseteq', 'supseteq', 'supset', 'times', 'pm', 'mp',
          'leq', 'geq', 'neq', 'approx', 'equiv', 'cong',
          'to', 'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
          'infty', 'partial', 'nabla', 'forall', 'exists',
          'begin', 'end', 'left', 'right',
          'text', 'mathrm', 'mathbf', 'mathit', 'mathcal',
          'cdot', 'dots', 'ldots', 'cdots', 'vdots', 'ddots',
          'vec', 'hat', 'bar', 'tilde', 'widetilde', 'overline', 'underline'
        ];

        commands.forEach(cmd => {
          const regex = new RegExp(`\\\\\\\\${cmd}`, 'g');
          part = part.replace(regex, `\\\\${cmd}`);
        });

        optParts[i] = part;
        if (part !== original) {
          needsUpdate = true;
        }
      }
    });
    return optParts.join('$');
  });

  if (needsUpdate) {
    fixedCount++;
    updates.push({
      id: q.id,
      question_order: q.question_order,
      text: fixedText,
      options: fixedOptions
    });

    console.log(`✅ Q${q.question_order}: Fixed double backslashes`);
  }
}

console.log();
console.log('═'.repeat(120));
console.log(`📊 Questions needing fixes: ${fixedCount}/${questions.length}`);
console.log('═'.repeat(120));
console.log();

if (fixedCount === 0) {
  console.log('✅ No questions need fixing!');
  process.exit(0);
}

console.log(`⚠️  Ready to update ${fixedCount} questions in database`);
console.log();
console.log('Proceeding with updates...');
console.log();

// Update database
for (const update of updates) {
  const { error } = await supabase
    .from('questions')
    .update({
      text: update.text,
      options: update.options
    })
    .eq('id', update.id);

  if (error) {
    console.error(`❌ Error updating Q${update.question_order}:`, error);
  } else {
    console.log(`✅ Updated Q${update.question_order}`);
  }
}

console.log();
console.log('═'.repeat(120));
console.log('✅ DATABASE FIX COMPLETE!');
console.log('═'.repeat(120));
console.log();
console.log(`Updated ${fixedCount} questions`);
console.log('All LaTeX should now render correctly in the UI');
