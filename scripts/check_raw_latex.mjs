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
  .select('id')
  .order('created_at', { ascending: false })
  .limit(1);

const { data: questions } = await supabase
  .from('questions')
  .select('question_order, text')
  .eq('scan_id', scans[0].id)
  .in('question_order', [18, 20, 21])
  .order('question_order');

for (const q of questions) {
  console.log('═'.repeat(80));
  console.log(`Q${q.question_order} - RAW DATABASE CONTENT:`);
  console.log('═'.repeat(80));

  // Show raw JSON
  console.log('\n📋 Raw JSON:');
  console.log(JSON.stringify(q.text, null, 2));

  // Check for specific issues
  console.log('\n🔍 Issue Analysis:');

  const issues = [];

  if (q.text.includes('\\text{')) {
    issues.push('❌ Has \\text{} wrappers');
    const matches = q.text.match(/\\text\{[^}]+\}/g);
    if (matches) {
      console.log(`   Found ${matches.length} \\text{} wrappers: ${matches.slice(0, 5).join(', ')}`);
    }
  }

  if (q.text.includes('\\\\')) {
    issues.push('❌ Has double backslashes');
  }

  // Check for missing backslashes
  const missingBackslash = [
    'frac{', 'sqrt{', 'sin ', 'cos ', 'tan ', 'pi', 'leq', 'geq',
    'begin{', 'end{', 'left', 'right'
  ];

  for (const pattern of missingBackslash) {
    const regex = new RegExp(`(?<!\\\\)\\b${pattern.replace(/[{}]/g, '\\$&')}`, 'g');
    if (regex.test(q.text)) {
      issues.push(`❌ Missing \\ before "${pattern}"`);
    }
  }

  if (issues.length === 0) {
    console.log('   ✅ No issues detected');
  } else {
    issues.forEach(i => console.log(`   ${i}`));
  }

  console.log('\n📝 Display:');
  console.log(q.text);
  console.log('\n');
}
