/**
 * Detailed KCET extraction analysis
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function analyzeLatestScan() {
  console.log('🔍 Analyzing Latest KCET Scan\n');

  // Get latest scan
  const { data: scans } = await supabase
    .from('scans')
    .select('*')
    .ilike('name', '%KCET%Math%2021%')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!scans || scans.length === 0) {
    console.log('No scans found');
    return;
  }

  const scan = scans[0];
  console.log(`📄 Scan: ${scan.name}`);
  console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}\n`);

  // Get questions
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('scan_id', scan.id)
    .order('question_order', { ascending: true });

  console.log(`📝 Total Questions: ${questions.length}\n`);

  // Analyze question IDs/numbers
  console.log('🔢 Question IDs (first 60):');
  questions.slice(0, 60).forEach((q, idx) => {
    const qNum = q.metadata?.questionNumber || q.metadata?.id || 'N/A';
    const page = q.metadata?.sourcePage || 'N/A';
    const text = q.text?.substring(0, 50).replace(/\n/g, ' ');
    console.log(`   [${idx}] Page: ${page} | ID: ${qNum} - ${text}...`);
  });

  // Analyze duplicates
  console.log('\n👯 Checking for actual text duplicates:');
  const textMap = new Map();
  questions.forEach((q) => {
    const text = q.text?.trim();
    if (!textMap.has(text)) {
      textMap.set(text, []);
    }
    textMap.get(text).push(q.id);
  });

  let duplicatesFound = 0;
  for (const [text, ids] of textMap.entries()) {
    if (ids.length > 1) {
      duplicatesFound++;
      if (duplicatesFound <= 10) {
        console.log(`   ⚠️  Found ${ids.length} copies of question: "${text.substring(0, 50)}..."`);
        console.log(`       IDs: ${ids.join(', ')}`);
      }
    }
  }
  if (duplicatesFound > 10) {
    console.log(`   ... and ${duplicatesFound - 10} more duplicate questions.`);
  }
  console.log(`\n📊 Unique questions by text: ${textMap.size}`);

  // Check analysis_data in scan
  if (scan.analysis_data && scan.analysis_data.questions) {
    const totalAnalysis = scan.analysis_data.questions.length;
    console.log(`\n📊 Analysis Data:`);
    console.log(`   Questions in analysis_data: ${totalAnalysis}`);

    console.log(`\n📝 Last 10 from analysis_data:`);
    scan.analysis_data.questions.slice(-10).forEach((q, idx) => {
      console.log(`   Q${totalAnalysis - 9 + idx}: ${q.text?.substring(0, 50).replace(/\n/g, ' ')}...`);
    });
  }

  console.log('\n✅ Analysis complete');
}

analyzeLatestScan();
