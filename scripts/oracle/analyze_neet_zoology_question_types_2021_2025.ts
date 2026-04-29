/**
 * NEET PHYSICS QUESTION TYPE ANALYSIS (2021-2025)
 *
 * Part of: REPEATABLE CALIBRATION WORKFLOW - Phase 1, Step 1.4
 *
 * Purpose: Analyze historical NEET uzoology papers to identify question type distribution
 * Output: QUESTION_TYPE_ANALYSIS_2021_2025_PHYSICS.json
 *
 * CRITICAL DISTINCTION for NEET:
 * - Answer Format: Uniform MCQ (4 options, single correct, OMR marking)
 * - Question Types: DIVERSE (Assertion-Reason, Match-the-Following, Statement-Based, etc.)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const SUBJECT = 'Zoology';
const EXAM = 'NEET';
const YEARS = [2021, 2022, 2023, 2024, 2025];  // All 5 years with complete data

// Question TYPE classification function (for MCQ answer format)
function classifyQuestionType(questionText: string, options: string[]): string {
  const text = questionText.toLowerCase();

  // Match-the-Following type MCQ
  if (text.includes('match') && (text.includes('column') || text.includes('list'))) {
    return 'match_following_mcq';
  }
  if (text.match(/column\s*[ia].*column\s*[iib]/i)) {
    return 'match_following_mcq';
  }

  // Assertion-Reason type MCQ
  if (text.includes('assertion') && text.includes('reason')) {
    return 'assertion_reason_mcq';
  }
  if (text.match(/assertion.*reason/i) || text.match(/statement.*reason/i)) {
    return 'assertion_reason_mcq';
  }

  // Statement-Based type MCQ (how many correct)
  if (text.match(/how many.*statements.*correct/i)) {
    return 'statement_based_mcq';
  }
  if (text.match(/how many.*following.*correct/i)) {
    return 'statement_based_mcq';
  }

  // True/False combination type MCQ
  if (text.match(/which.*following.*(true|correct)/i) && text.match(/[i1]\./)) {
    return 'true_false_combo_mcq';
  }

  // Sequence/Fill-in-blanks type MCQ
  if (text.match(/correct sequence/i) || text.match(/correct order/i)) {
    return 'sequence_mcq';
  }

  // Exception-based type MCQ
  if (text.match(/all.*except/i) || text.match(/incorrect/i)) {
    return 'exception_based_mcq';
  }

  // Diagram-based type MCQ
  if (text.includes('diagram') || text.includes('figure') || text.includes('graph')) {
    return 'diagram_based_mcq';
  }

  // Reason-based type MCQ
  if (text.match(/because/i) || text.match(/reason for/i)) {
    return 'reason_based_mcq';
  }

  // Definitional type MCQ
  if (text.match(/define|definition|what is|which.*correctly defines/i)) {
    return 'definitional_mcq';
  }

  // Calculation type MCQ (has numbers, units, formulas)
  if (text.match(/calculate|find|determine/) && text.match(/\d+/)) {
    return 'calculation_mcq';
  }

  // Default: Simple recall MCQ
  return 'simple_recall_mcq';
}

async function analyzeQuestionTypes() {
  console.log(`🔍 ANALYZING ${EXAM} ${SUBJECT} QUESTION TYPES (${YEARS.join('-')})\n`);
  console.log(`📌 Note: NEET uses uniform MCQ answer format (4 options) but has DIVERSE question types\n`);

  const questionTypeCounts: Record<string, number> = {
    match_following_mcq: 0,
    assertion_reason_mcq: 0,
    statement_based_mcq: 0,
    true_false_combo_mcq: 0,
    sequence_mcq: 0,
    exception_based_mcq: 0,
    diagram_based_mcq: 0,
    reason_based_mcq: 0,
    definitional_mcq: 0,
    calculation_mcq: 0,
    simple_recall_mcq: 0
  };

  let totalQuestions = 0;

  for (const year of YEARS) {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, text, options')
      .eq('subject', SUBJECT)
      .eq('exam_context', EXAM)
      .eq('year', year);

    if (error) {
      console.error(`❌ Error fetching ${year} questions:`, error);
      continue;
    }

    if (!questions || questions.length === 0) {
      console.log(`⚠️  Year ${year}: No questions found, skipping...`);
      continue;
    }

    console.log(`📊 Year ${year}: ${questions.length} questions`);

    for (const q of questions) {
      const questionType = classifyQuestionType(q.text, q.options || []);
      questionTypeCounts[questionType]++;
      totalQuestions++;
    }
  }

  console.log(`\n✅ Total Questions Analyzed: ${totalQuestions}\n`);
  console.log(`📋 QUESTION TYPE DISTRIBUTION (within MCQ format):\n`);

  // Calculate percentages
  const questionTypeDistribution: Record<string, number> = {};
  for (const [qType, count] of Object.entries(questionTypeCounts)) {
    const percentage = Math.round((count / totalQuestions) * 100);
    questionTypeDistribution[qType] = percentage;
    if (count > 0) {
      console.log(`   ${qType}: ${count} (${percentage}%)`);
    }
  }

  // Create output JSON
  const outputPath = path.join(
    __dirname,
    `../../docs/oracle/QUESTION_TYPE_ANALYSIS_${YEARS[0]}_${YEARS[YEARS.length-1]}_${SUBJECT.toUpperCase()}.json`
  );

  const output = {
    subject: SUBJECT,
    exam: EXAM,
    years_analyzed: `${YEARS[0]}-${YEARS[YEARS.length-1]}`,
    total_questions: totalQuestions,
    answer_format: "MCQ (4 options, single correct)",  // Uniform for NEET
    question_type_distribution: questionTypeDistribution,
    question_type_counts: questionTypeCounts,
    analysis_date: new Date().toISOString(),
    note: "NEET uses uniform MCQ answer format but has diverse question types within that format"
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n✅ Question type analysis saved to: ${outputPath}\n`);
  console.log(`📍 NEXT STEP: Proceed to Phase 2 (Calibration Execution)\n`);
}

analyzeQuestionTypes().catch(console.error);
