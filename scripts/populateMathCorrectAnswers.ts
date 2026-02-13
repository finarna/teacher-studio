/**
 * Populate Correct Answer Index for Math Questions
 *
 * Uses Gemini AI to analyze question text and options to determine correct answer
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
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function determineCorrectAnswer(question: any): Promise<number | null> {
  const prompt = `You are a math expert. Analyze this question and determine which option is correct.

Question: ${question.text}

Options:
${question.options.map((opt: string, idx: number) => `${idx}: ${opt}`).join('\n')}

${question.solution_steps?.length > 0 ? `Solution Steps: ${JSON.stringify(question.solution_steps)}` : ''}

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

async function populateMathCorrectAnswers(dryRun: boolean = true) {
  console.log('🚀 Populating Correct Answers for Math Questions\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no database updates)' : '💾 LIVE UPDATE'}\n`);

  // Get Math questions missing correct_option_index
  const { data: mathQuestions, error } = await supabase
    .from('questions')
    .select('id, text, options, solution_steps, topic')
    .is('correct_option_index', null)
    .not('options', 'is', null)
    .ilike('topic', '%math%')  // Math questions
    .limit(20);  // Start with 20 for testing

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  console.log(`📊 Found ${mathQuestions?.length || 0} Math questions to process\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < (mathQuestions?.length || 0); i++) {
    const q = mathQuestions![i];

    console.log(`\n[${i + 1}/${mathQuestions!.length}] Processing Q${q.id.substring(0, 8)}...`);
    console.log(`   Question: ${q.text.substring(0, 100)}...`);
    console.log(`   Options: ${q.options.length} options`);

    const correctIndex = await determineCorrectAnswer(q);

    if (correctIndex !== null) {
      console.log(`   ✅ AI determined correct answer: Option ${correctIndex} (${String.fromCharCode(65 + correctIndex)})`);

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
        console.log('   🔍 DRY RUN - Would update to: ' + correctIndex);
        successCount++;
      }
    } else {
      console.log('   ❌ Could not determine correct answer');
      failCount++;
    }

    // Rate limiting - wait 1 second between API calls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Successfully processed: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📈 Success rate: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n💡 To actually update the database, run:');
    console.log('   npx tsx scripts/populateMathCorrectAnswers.ts --live');
  }
}

// Check command line args
const dryRun = !process.argv.includes('--live');

populateMathCorrectAnswers(dryRun).catch(console.error);
