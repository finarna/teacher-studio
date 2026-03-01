/**
 * Check KCET Math 2021 extraction in database
 * Verifies questions in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkKCETInDB() {
  console.log('🔍 Checking KCET Math 2021 in database\n');

  try {
    // Find KCET Math 2021 scan
    const { data: scans, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .ilike('name', '%KCET%Math%2021%')
      .order('created_at', { ascending: false });

    if (scanError) {
      console.error('❌ Error fetching scans:', scanError);
      return;
    }

    if (!scans || scans.length === 0) {
      console.log('⚠️  No KCET Math 2021 scans found in database');
      console.log('\n💡 Upload the PDF through the UI to test extraction\n');
      return;
    }

    console.log(`📊 Found ${scans.length} KCET Math 2021 scan(s):\n`);

    for (const scan of scans) {
      console.log(`📄 Scan: ${scan.name}`);
      console.log(`   ID: ${scan.id}`);
      console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}`);
      console.log(`   Status: ${scan.status}`);

      // Get questions for this scan
      const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('scan_id', scan.id)
        .order('question_order', { ascending: true });

      if (qError) {
        console.error('   ❌ Error fetching questions:', qError);
        continue;
      }

      console.log(`\n   📝 Questions: ${questions?.length || 0}/60`);

      if (questions && questions.length > 0) {
        // Check for LaTeX corruption
        let corruptionCount = 0;
        let missingQuestions = [];

        questions.forEach((q, idx) => {
          if (q.text?.includes('\\b\\') || q.text?.includes('\\\\begin')) {
            corruptionCount++;
          }
        });

        // Check for gaps in question numbers
        const questionIds = questions.map(q => parseInt(q.metadata?.questionNumber || 0)).filter(n => n > 0).sort((a, b) => a - b);
        for (let i = 1; i <= 60; i++) {
          if (!questionIds.includes(i)) {
            missingQuestions.push(i);
          }
        }

        console.log(`\n   🔍 Analysis:`);
        console.log(`      Total extracted: ${questions.length}`);
        console.log(`      LaTeX corruption: ${corruptionCount} questions`);

        if (missingQuestions.length > 0) {
          console.log(`      Missing Qs: ${missingQuestions.slice(0, 10).join(', ')}${missingQuestions.length > 10 ? '...' : ''}`);
        } else {
          console.log(`      ✅ No missing questions!`);
        }

        // Show sample questions
        console.log(`\n   📋 Sample Questions:`);
        questions.slice(0, 3).forEach((q, i) => {
          console.log(`\n      Q${i + 1}: ${q.text?.substring(0, 100)}...`);
          console.log(`         Topic: ${q.topic || 'N/A'}`);
          console.log(`         Difficulty: ${q.difficulty || 'N/A'}`);
          if (q.text?.includes('\\b\\')) {
            console.log(`         ⚠️  Contains \\b\\ corruption`);
          }
          if (q.text?.includes('\\\\begin')) {
            console.log(`         ⚠️  Contains double backslash`);
          }
        });
      } else {
        console.log('   ⚠️  No questions found for this scan');
      }

      console.log('\n' + '='.repeat(60) + '\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkKCETInDB();
