import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function exportFlagshipPapers() {
  console.log('📄 EXPORTING FLAGSHIP MATH PAPERS FROM DATABASE...\n');

  try {
    // Query for SET-A
    console.log('🔍 Searching for SET-A...');
    const { data: setA, error: errorA } = await supabase
      .from('test_attempts')
      .select('*')
      .ilike('test_name', '%SET_A%')
      .eq('subject', 'Mathematics')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (errorA) {
      console.error('❌ Error fetching SET-A:', errorA);
    } else if (setA) {
      const filePathA = path.join(process.cwd(), 'flagship_final.json');
      fs.writeFileSync(filePathA, JSON.stringify(setA, null, 2));
      console.log(`✅ SET-A exported: ${setA.test_config?.questions?.length || 0} questions`);
      console.log(`   File: flagship_final.json\n`);
    } else {
      console.log('⚠️  SET-A not found in database\n');
    }

    // Query for SET-B
    console.log('🔍 Searching for SET-B...');
    const { data: setB, error: errorB } = await supabase
      .from('test_attempts')
      .select('*')
      .ilike('test_name', '%SET_B%')
      .eq('subject', 'Mathematics')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (errorB) {
      console.error('❌ Error fetching SET-B:', errorB);
    } else if (setB) {
      const filePathB = path.join(process.cwd(), 'flagship_final_b.json');
      fs.writeFileSync(filePathB, JSON.stringify(setB, null, 2));
      console.log(`✅ SET-B exported: ${setB.test_config?.questions?.length || 0} questions`);
      console.log(`   File: flagship_final_b.json\n`);
    } else {
      console.log('⚠️  SET-B not found in database\n');
    }

    // Show sample enrichment from first question
    if (setA?.test_config?.questions?.[0]) {
      const q = setA.test_config.questions[0];
      console.log('📊 ENRICHMENT SAMPLE (Question 1 of SET-A):');
      console.log(`   Text: ${q.text?.substring(0, 80)}...`);
      console.log(`   Solution Steps: ${q.solutionSteps?.length || 0}`);
      console.log(`   Exam Tip: ${q.examTip ? '✓' : '✗'}`);
      console.log(`   AI Reasoning: ${q.aiReasoning ? '✓' : '✗'}`);
      console.log(`   Historical Pattern: ${q.historicalPattern ? '✓' : '✗'}`);
      console.log(`   Mastery Material: ${q.masteryMaterial ? '✓' : '✗'}`);
      console.log(`   Key Formulas: ${q.keyFormulas?.length || 0}`);
      console.log(`   Things to Remember: ${q.thingsToRemember?.length || 0}`);
      console.log(`   Common Mistakes: ${q.commonMistakes?.length || 0}`);
      console.log(`   Question Variations: ${q.questionVariations?.length || 0}`);
      console.log(`   Concept Variations: ${q.conceptVariations?.length || 0}\n`);
    }

    console.log('🎉 EXPORT COMPLETE!');
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportFlagshipPapers();
