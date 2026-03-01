#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     📡 Watching for PDF Upload - LaTeX Monitor            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log('✅ Database cleared - ready for fresh upload');
console.log('🚀 Upload your PDF now!\n');
console.log('Checking every 3 seconds...\n');

let checkCount = 0;
let foundScan = false;

const check = async () => {
  if (foundScan) return;

  checkCount++;
  process.stdout.write(`\r⏳ Polling... (check #${checkCount})  `);

  const { data: scans } = await supabase
    .from('scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (scans && scans.length > 0) {
    foundScan = true;
    const scan = scans[0];

    console.log('\n\n✨ NEW SCAN DETECTED!\n');
    console.log('─'.repeat(60));
    console.log(`📄 Name: ${scan.name}`);
    console.log(`🆔 ID: ${scan.id.substring(0, 8)}...`);
    console.log(`📚 Subject: ${scan.subject || 'N/A'}`);
    console.log(`🎯 Exam: ${scan.exam_context || 'N/A'}`);
    console.log('─'.repeat(60));

    // Wait a moment for questions to sync
    console.log('\n⏳ Waiting for questions to sync...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('scan_id', scan.id);

    if (!questions || questions.length === 0) {
      console.log('⚠️  No questions found yet - sync may still be in progress');
      process.exit(0);
    }

    console.log(`\n✅ Questions synced: ${questions.length}\n`);

    // LATEX CHECK
    console.log('🔍 LaTeX Quality Analysis:\n');

    let totalIssues = 0;
    const problematic = [];

    for (let i = 0; i < Math.min(10, questions.length); i++) {
      const q = questions[i];
      const hasDouble = q.text?.includes('\\\\');

      if (hasDouble) {
        totalIssues++;
        problematic.push({
          num: i + 1,
          text: q.text.substring(0, 60)
        });
      }

      const status = hasDouble ? '❌' : '✅';
      console.log(`   ${status} Q${i + 1}: ${q.text.substring(0, 70)}...`);
    }

    console.log('\n' + '─'.repeat(60));
    console.log('📊 FINAL RESULTS:\n');
    console.log(`   Total questions:     ${questions.length}`);
    console.log(`   Sample checked:      ${Math.min(10, questions.length)}`);
    console.log(`   LaTeX issues found:  ${totalIssues}`);
    console.log(`   Status:              ${totalIssues === 0 ? '✅ PERFECT - 0 ERRORS!' : '❌ HAS ERRORS'}`);

    if (totalIssues > 0) {
      console.log('\n⚠️  Issues detected in:');
      problematic.forEach(p => {
        console.log(`   Q${p.num}: ${p.text}...`);
      });
    }

    // SCHEMA CHECK
    console.log('\n🗄️  Database Schema Check:\n');
    const q = questions[0];
    console.log(`   metadata:        ${q.hasOwnProperty('metadata') ? '✅' : '❌'}`);
    console.log(`   question_order:  ${q.hasOwnProperty('question_order') ? '✅' : '❌'}`);
    console.log(`   blooms:          ${q.hasOwnProperty('blooms') ? '✅' : '❌'}`);
    console.log(`   sketch_svg_url:  ${q.hasOwnProperty('sketch_svg_url') ? '✅' : '❌'}`);

    console.log('\n' + '═'.repeat(60));
    console.log(totalIssues === 0 ? '🎉 ALL SYSTEMS GO!' : '⚠️  NEEDS ATTENTION');
    console.log('═'.repeat(60) + '\n');

    process.exit(0);
  }
};

// Poll every 3 seconds
const interval = setInterval(check, 3000);

// Initial check
check();

// Timeout after 5 minutes
setTimeout(() => {
  if (!foundScan) {
    console.log('\n\n⏱️  Timeout - no upload detected in 5 minutes');
    clearInterval(interval);
    process.exit(0);
  }
}, 300000);
