/**
 * Check Question Data for Correct Answer Index
 *
 * This script checks if questions have correct_option_index populated
 * and shows sample questions missing this data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkQuestionData() {
  console.log('📊 Checking Question Data...\n');

  // Count questions by correct_option_index status
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, correct_option_index, options')
    .not('options', 'is', null);

  const withCorrect = allQuestions?.filter(q => q.correct_option_index !== null).length || 0;
  const withoutCorrect = allQuestions?.filter(q => q.correct_option_index === null).length || 0;

  console.log('📈 Statistics:');
  console.log(`   Total MCQ Questions: ${allQuestions?.length || 0}`);
  console.log(`   ✅ With correct_option_index: ${withCorrect}`);
  console.log(`   ❌ Missing correct_option_index: ${withoutCorrect}\n`);

  // Show sample questions missing correct answers
  const { data: samples, error: samplesError } = await supabase
    .from('questions')
    .select('id, text, options, solution_steps')
    .is('correct_option_index', null)
    .not('options', 'is', null)
    .limit(5);

  if (samplesError) {
    console.error('❌ Error fetching samples:', samplesError);
  }

  console.log('📋 Sample Questions Missing Correct Answer:\n');

  samples?.forEach((q, idx) => {
    console.log(`${idx + 1}. ID: ${q.id.substring(0, 8)}`);
    console.log(`   Text: ${q.text.substring(0, 100)}...`);
    console.log(`   Options: ${q.options?.length} options`);
    console.log(`   Has solution_steps: ${q.solution_steps?.length > 0 ? 'Yes' : 'No'}`);
    if (q.solution_steps && Array.isArray(q.solution_steps)) {
      console.log(`   Solution Steps: ${JSON.stringify(q.solution_steps).substring(0, 150)}...`);
    }
    console.log('');
  });

  // Check specific question from screenshot
  const targetId = 'cd327060-e88d-25ce-1a38-7bd86cf83723';
  const { data: targetQ } = await supabase
    .from('questions')
    .select('*')
    .eq('id', targetId)
    .single();

  if (targetQ) {
    console.log('🎯 Target Question (from screenshot):');
    console.log(`   ID: ${targetQ.id}`);
    console.log(`   Text: ${targetQ.text}`);
    console.log(`   Options: ${JSON.stringify(targetQ.options, null, 2)}`);
    console.log(`   correct_option_index: ${targetQ.correct_option_index}`);
    console.log(`   solution_steps: ${JSON.stringify(targetQ.solution_steps, null, 2)}`);
  }
}

checkQuestionData().catch(console.error);
