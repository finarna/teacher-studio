/**
 * Fix Scrambled Text in Existing Scan
 * Uses Gemini AI to add proper spacing to concatenated words
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../lib/supabaseServer';

async function fixScrambledText() {
  console.log('🔄 Finding and fixing scrambled text in recent scan...\n');

  try {
    const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379';
    const apiKey = process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY not found in environment');
    }

    // Get the most recent scan
    const { data: scans, error: fetchError } = await supabaseAdmin
      .from('scans')
      .select('id, name, subject')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !scans || scans.length === 0) {
      throw new Error('No scans found');
    }

    const scan = scans[0];
    console.log(`Found scan: ${scan.name} (${scan.subject})\n`);

    // Get all questions for this scan
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('scan_id', scan.id);

    if (questionsError || !questions) {
      throw new Error('Failed to fetch questions');
    }

    console.log(`Found ${questions.length} questions to check\n`);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    let fixedCount = 0;

    for (const q of questions) {
      // Check if text looks scrambled (no spaces or very few spaces relative to length)
      const spaceCount = (q.text.match(/\s/g) || []).length;
      const avgWordLength = q.text.length / (spaceCount + 1);

      // If average "word" length > 15 characters, it's likely scrambled
      if (avgWordLength > 15 || q.text.includes('objectiveoffocallength')) {
        console.log(`\n🔧 Fixing question ${q.id}...`);
        console.log(`   Original: ${q.text.substring(0, 80)}...`);

        try {
          // Use AI to fix spacing
          const prompt = `Fix the spacing in this scrambled text by adding spaces between words. Only output the corrected text, nothing else:

"${q.text}"`;

          const result = await model.generateContent(prompt);
          const fixedText = result.response.text().trim();

          console.log(`   Fixed: ${fixedText.substring(0, 80)}...`);

          // Update question in database
          const { error: updateError } = await supabaseAdmin
            .from('questions')
            .update({ text: fixedText })
            .eq('id', q.id);

          if (updateError) {
            console.error(`   ❌ Failed to update: ${updateError.message}`);
          } else {
            console.log(`   ✅ Updated successfully`);
            fixedCount++;
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
          console.error(`   ❌ Error fixing text:`, err);
        }
      }
    }

    console.log(`\n\n🎉 Fixed ${fixedCount} out of ${questions.length} questions!`);

    if (fixedCount === 0) {
      console.log('✅ No scrambled text found - all questions look good!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the fix
fixScrambledText()
  .then(() => {
    console.log('\n✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });
