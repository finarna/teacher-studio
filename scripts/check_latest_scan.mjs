#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: scans } = await supabase
  .from('scans')
  .select('id, name, created_at')
  .order('created_at', { ascending: false })
  .limit(1);

console.log('Current scans in database:');
console.log();

if (!scans || scans.length === 0) {
  console.log('❌ NO SCANS FOUND - Database is empty');
  process.exit(0);
}

const scan = scans[0];
console.log(`📄 ${scan.name}`);
console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}`);
console.log(`   ID: ${scan.id.substring(0, 8)}...`);
console.log();

// Check Q55 (the inequalities question)
const { data: questions } = await supabase
  .from('questions')
  .select('question_order, text, options')
  .eq('scan_id', scan.id)
  .in('question_order', [17, 49, 50, 55, 56])
  .order('question_order');

for (const q of questions) {
  console.log('═'.repeat(80));
  console.log(`Q${q.question_order}`);
  console.log('═'.repeat(80));
  console.log('RAW JSON TEXT:');
  console.log(JSON.stringify(q.text));
  console.log();

  if (q.options && q.options.length > 0) {
    console.log('RAW JSON OPTIONS:');
    q.options.slice(0, 2).forEach((opt, i) => {
      console.log(`  ${String.fromCharCode(65 + i)}: ${JSON.stringify(opt)}`);
    });
    console.log();
  }

  // Check for issues
  const textIssues = q.text?.match(/\text\{[^}]+\}/g) || [];
  const optionIssues = q.options?.filter(o => o.match(/\text\{[^}]+\}/g)).length || 0;

  if (textIssues.length > 0 || optionIssues > 0) {
    console.log('❌ ISSUES FOUND:');
    if (textIssues.length > 0) {
      console.log(`   Text has ${textIssues.length} \\text{} wrappers`);
      console.log(`   Examples: ${textIssues.slice(0, 3).join(', ')}`);
    }
    if (optionIssues > 0) {
      console.log(`   ${optionIssues} options have \\text{} wrappers`);
    }
  } else {
    console.log('✅ No \\text{} wrapper issues');
  }
  console.log();
}
