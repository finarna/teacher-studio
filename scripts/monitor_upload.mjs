#!/usr/bin/env node
/**
 * Real-time upload monitoring script
 * Watches for scan upload and LaTeX extraction logs
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║          📡 Upload Monitor - Ready to Track                ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('👀 Watching for new scans...\n');
console.log('📋 What I\'ll check:');
console.log('   ✓ LaTeX extraction quality (looking for double backslashes)');
console.log('   ✓ Database sync (metadata, question_order columns)');
console.log('   ✓ Question count');
console.log('   ✓ Analysis data completeness\n');
console.log('🚀 Upload your PDF now!\n');
console.log('─'.repeat(60));

let lastScanId = null;

// Poll for new scans every 2 seconds
const pollInterval = setInterval(async () => {
  try {
    const { data: scans } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!scans || scans.length === 0) return;

    const latestScan = scans[0];

    // New scan detected!
    if (latestScan.id !== lastScanId) {
      lastScanId = latestScan.id;

      console.log('\n✨ NEW SCAN DETECTED!\n');
      console.log(`📄 Name: ${latestScan.name}`);
      console.log(`🆔 ID: ${latestScan.id}`);
      console.log(`📅 Created: ${new Date(latestScan.created_at).toLocaleTimeString()}`);
      console.log(`📚 Subject: ${latestScan.subject || 'N/A'}`);
      console.log(`🎯 Exam Context: ${latestScan.exam_context || 'N/A'}\n`);

      // Check for questions
      const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('scan_id', latestScan.id);

      if (qError) {
        console.error('❌ Error fetching questions:', qError.message);
      } else if (questions && questions.length > 0) {
        console.log(`✅ Questions synced: ${questions.length}\n`);

        // Check for LaTeX issues
        let latexIssues = 0;
        const sampleQuestions = questions.slice(0, 5);

        console.log('🔍 LaTeX Quality Check (first 5 questions):\n');

        for (const q of sampleQuestions) {
          const hasDoubleBackslash = q.text?.includes('\\\\');
          const status = hasDoubleBackslash ? '❌' : '✅';
          latexIssues += hasDoubleBackslash ? 1 : 0;

          console.log(`   ${status} Q${questions.indexOf(q) + 1}: ${q.text?.substring(0, 60)}...`);
        }

        console.log(`\n📊 LaTeX Summary:`);
        console.log(`   Total questions: ${questions.length}`);
        console.log(`   Checked: ${sampleQuestions.length}`);
        console.log(`   Issues found: ${latexIssues}`);
        console.log(`   Status: ${latexIssues === 0 ? '✅ PERFECT' : '❌ HAS ERRORS'}\n`);

        // Check schema columns
        console.log('🗄️  Schema Check:');
        const hasMetadata = questions[0].hasOwnProperty('metadata');
        const hasQuestionOrder = questions[0].hasOwnProperty('question_order');
        const hasBlooms = questions[0].hasOwnProperty('blooms');

        console.log(`   metadata:        ${hasMetadata ? '✅' : '❌'}`);
        console.log(`   question_order:  ${hasQuestionOrder ? '✅' : '❌'}`);
        console.log(`   blooms:          ${hasBlooms ? '✅' : '❌'}\n`);

        console.log('─'.repeat(60));
        console.log('✅ MONITORING COMPLETE\n');
        console.log('Press Ctrl+C to exit');

        clearInterval(pollInterval);
      } else {
        console.log('⏳ Waiting for questions to sync...\n');
      }
    }
  } catch (err) {
    console.error('❌ Monitoring error:', err.message);
  }
}, 2000);

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n👋 Monitoring stopped');
  clearInterval(pollInterval);
  process.exit(0);
});
