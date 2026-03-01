#!/usr/bin/env node
/**
 * Verify LaTeX fixes and migration 007 status
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║              LaTeX & Migration Verification                   ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Check LaTeX fixes
const { data: scans } = await supabase
  .from('scans')
  .select('analysis_data')
  .order('created_at', { ascending: false })
  .limit(1);

if (scans?.[0]?.analysis_data?.questions) {
  const questions = scans[0].analysis_data.questions;
  console.log('📐 LaTeX Rendering Check:\n');

  const testQuestions = [
    { idx: 17, label: 'Q18' },
    { idx: 19, label: 'Q20' },
    { idx: 20, label: 'Q21' },
  ];

  let allFixed = true;
  for (const { idx, label } of testQuestions) {
    const q = questions[idx];
    if (!q) continue;
    const hasDouble = q.text.includes('\\\\');
    const status = hasDouble ? '❌ BROKEN' : '✅ FIXED';
    console.log(`   ${label}: ${status}`);
    if (hasDouble) {
      console.log(`        ${q.text.substring(0, 60)}...`);
      allFixed = false;
    }
  }

  console.log(allFixed ? '\n✅ All LaTeX rendering fixed!\n' : '\n❌ LaTeX still has issues\n');
}

// Check migration 007 status
console.log('🗄️  Migration 007 Status:\n');

const { data: scanData, error: scanError } = await supabase
  .from('scans')
  .select('blooms_taxonomy, topic_weightage, summary')
  .limit(0);

const { data: questionData, error: questionError } = await supabase
  .from('questions')
  .select('blooms, domain, difficulty')
  .limit(0);

const scanColumns = !scanError;
const questionColumns = !questionError;

console.log(`   scans columns:     ${scanColumns ? '✅ EXISTS' : '❌ MISSING'}`);
console.log(`   questions columns: ${questionColumns ? '✅ EXISTS' : '❌ MISSING'}`);

if (!scanColumns || !questionColumns) {
  console.log('\n⚠️  Migration 007 not applied yet!');
  console.log('   Run: node scripts/run_migration_007.mjs');
  console.log('   Then copy/paste the SQL into Supabase SQL Editor\n');
} else {
  console.log('\n✅ Migration 007 applied successfully!\n');
}

console.log('╚════════════════════════════════════════════════════════════════╝');
