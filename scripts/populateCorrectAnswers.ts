/**
 * Populate Correct Answer Index for ALL Questions (All Subjects)
 *
 * Uses Gemini AI to analyze question text and options to determine correct answer
 * with STRICT CORRECTNESS enforcement per exam syllabus
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.VITE_GEMINI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

async function determineCorrectAnswer(question: any): Promise<number | null> {
  const examContext = question.exam_context || 'CBSE';
  const subject = question.subject || 'General';

  const prompt = `You are an expert ${subject} examiner with deep knowledge of ${examContext} examination patterns and syllabus requirements.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
Your task is to identify the EXACT correct answer as per ${examContext} ${subject} syllabus and examination standards.

🚨 STRICT CORRECTNESS POLICY - ZERO TOLERANCE FOR "CLOSE ENOUGH":
- DO NOT accept "technically close" or "approximately correct" answers
- DO NOT accept answers that are "correct in general" but wrong per ${examContext} syllabus
- The answer must be EXACTLY correct according to ${examContext} official syllabus and marking scheme
- If an option is mathematically/scientifically correct but uses different notation/convention than ${examContext} standard, it is WRONG
- If an option gives a value that is "close" to the correct value but not exact, it is WRONG
- Only ONE option can be correct - choose the one that matches ${examContext} examination standards EXACTLY
- Consider the specific exam context: ${examContext} may have different conventions, formulas, or standards than other exams
- For NEET/JEE/KCET: Follow NCERT textbook standards and official exam guidelines strictly
- For CBSE: Follow CBSE board examination marking scheme and NCERT curriculum exactly

EXAM-SPECIFIC CONSIDERATIONS:
${examContext === 'NEET' ? '- NEET Biology: Use NCERT taxonomy and nomenclature exactly\n- NEET Physics/Chemistry: Use SI units and NCERT formulas\n- NEET expects NCERT-based answers, not alternative textbook interpretations' : ''}
${examContext === 'JEE' ? '- JEE Math: Use standard JEE notation (e.g., ℝ for real numbers, ℂ for complex)\n- JEE Physics: Follow SI units and dimensional analysis strictly\n- JEE expects rigorous mathematical proofs and exact numerical values' : ''}
${examContext === 'KCET' ? '- KCET follows state board + competitive exam hybrid pattern\n- Use PUC (Pre-University College) textbook standards for Karnataka' : ''}
${examContext === 'CBSE' ? '- CBSE follows NCERT textbooks exactly\n- Use CBSE marking scheme conventions\n- Match CBSE sample paper answer formats' : ''}

Question: ${question.text}

Options:
${question.options.map((opt: string, idx: number) => `${idx}: ${opt}`).join('\n')}

${question.solution_steps?.length > 0 ? `\nSolution Steps Available: ${JSON.stringify(question.solution_steps)}` : ''}

Topic: ${question.topic || 'Not specified'}
Exam Context: ${examContext}
Subject: ${subject}

STEP-BY-STEP ANALYSIS (DO THIS MENTALLY):
1. Identify the concept being tested from ${examContext} ${subject} syllabus
2. Solve the problem step-by-step using ONLY ${examContext}-approved methods and formulas
3. Calculate the EXACT answer (not approximate)
4. Compare your calculated answer with ALL four options character-by-character
5. Verify the matching option uses ${examContext}-standard notation and units
6. Double-check: Is this answer EXACTLY correct per ${examContext} syllabus? Not just "close" or "technically correct"?
7. If multiple options seem close, choose the one that matches ${examContext} conventions EXACTLY

FINAL CHECK:
- Does the answer match ${examContext} official syllabus? ✓
- Is the notation/format standard for ${examContext}? ✓
- Is the numerical value EXACT (not approximate)? ✓
- Would this answer get full marks in ${examContext} examination? ✓

IMPORTANT: Return ONLY a single number (0, 1, 2, or 3) indicating the correct option index. No explanation, just the number.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    const answerIndex = parseInt(response);

    if (isNaN(answerIndex) || answerIndex < 0 || answerIndex > 3) {
      console.log(`   ⚠️  Invalid response from AI: "${response}"`);
      return null;
    }

    return answerIndex;
  } catch (error) {
    console.error('   ❌ AI Error:', error);
    return null;
  }
}

async function populateCorrectAnswers(
  subject?: string,
  examContext?: string,
  limit: number = 20,
  dryRun: boolean = true
) {
  console.log('🚀 Populating Correct Answers for Questions\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no database updates)' : '💾 LIVE UPDATE'}`);
  console.log(`Subject Filter: ${subject || 'ALL'}`);
  console.log(`Exam Context Filter: ${examContext || 'ALL'}`);
  console.log(`Limit: ${limit} questions\n`);

  // Build query
  let query = supabase
    .from('questions')
    .select('id, text, options, solution_steps, topic, exam_context, subject')
    .is('correct_option_index', null)
    .not('options', 'is', null)
    .limit(limit);

  // Apply filters
  if (subject) {
    query = query.eq('subject', subject);
  }
  if (examContext) {
    query = query.eq('exam_context', examContext);
  }

  const { data: questions, error } = await query;

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  console.log(`📊 Found ${questions?.length || 0} questions to process\n`);

  if (!questions || questions.length === 0) {
    console.log('✨ No questions found needing correct answers.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    console.log(`\n[${i + 1}/${questions.length}] Processing Q${q.id.substring(0, 8)}...`);
    console.log(`   Subject: ${q.subject || 'Unknown'}`);
    console.log(`   Exam: ${q.exam_context || 'Unknown'}`);
    console.log(`   Topic: ${q.topic || 'Unknown'}`);
    console.log(`   Question: ${q.text.substring(0, 80)}...`);
    console.log(`   Options: ${q.options.length} options`);

    const correctIndex = await determineCorrectAnswer(q);

    if (correctIndex !== null) {
      console.log(`   ✅ AI determined correct answer: Option ${correctIndex} (${String.fromCharCode(65 + correctIndex)})`);
      console.log(`      Answer: ${q.options[correctIndex]?.substring(0, 60)}...`);

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('questions')
          .update({ correct_option_index: correctIndex })
          .eq('id', q.id);

        if (updateError) {
          console.error('   ❌ Update failed:', updateError);
          failCount++;
        } else {
          console.log('   💾 Database updated successfully');
          successCount++;
        }
      } else {
        successCount++;
      }
    } else {
      console.log(`   ❌ Failed to determine correct answer`);
      failCount++;
    }

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📊 SUMMARY:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📈 Success Rate: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`);

  if (dryRun) {
    console.log(`\n💡 This was a DRY RUN. To update the database, run with dryRun=false`);
  }
}

// CLI interface
const args = process.argv.slice(2);
const subject = args.find(arg => arg.startsWith('--subject='))?.split('=')[1];
const examContext = args.find(arg => arg.startsWith('--exam='))?.split('=')[1];
const limit = parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '20');
const live = args.includes('--live');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  POPULATE CORRECT ANSWERS - STRICT CORRECTNESS ENFORCED       ║
╚════════════════════════════════════════════════════════════════╝

Usage:
  npm run populate-answers                           # Dry run, all subjects, 20 questions
  npm run populate-answers --subject=Math            # Only Math questions
  npm run populate-answers --exam=NEET               # Only NEET questions
  npm run populate-answers --limit=50                # Process 50 questions
  npm run populate-answers --live                    # Actually update database
  npm run populate-answers --subject=Physics --exam=JEE --limit=100 --live

`);

populateCorrectAnswers(subject, examContext, limit, !live)
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
