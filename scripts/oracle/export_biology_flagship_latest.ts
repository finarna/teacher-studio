import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_ID = 'ea306fe3-85ac-4bfa-a9e1-012d99f3c2f9';

async function exportBiologyFlagship() {
  console.log('🎯 EXPORTING LATEST 120 BIOLOGY QUESTIONS TO JSON FILES\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Get the latest 120 questions ordered by creation date
  const { data: allQuestions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('scan_id', SCAN_ID)
    .eq('subject', 'Biology')
    .order('created_at', { ascending: false })
    .limit(120);

  if (error || !allQuestions) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`✅ Fetched ${allQuestions.length} questions from database\n`);

  // Split into SET B (newer 60) and SET A (older 60)
  const setB = allQuestions.slice(0, 60);
  const setA = allQuestions.slice(60, 120);

  console.log(`📊 Distribution:\n`);
  console.log(`   SET A (older 60): Created ${new Date(setA[0].created_at).toLocaleString()}`);
  console.log(`   SET B (newer 60): Created ${new Date(setB[0].created_at).toLocaleString()}\n`);

  // Verify difficulty distribution
  const verifySet = (set: any[], name: string) => {
    const easy = set.filter(q => q.difficulty === 'Easy').length;
    const moderate = set.filter(q => q.difficulty === 'Moderate').length;
    const hard = set.filter(q => q.difficulty === 'Hard').length;

    console.log(`${name} Difficulty:`);
    console.log(`   Easy: ${easy} (${Math.round(easy/set.length*100)}%)`);
    console.log(`   Moderate: ${moderate} (${Math.round(moderate/set.length*100)}%)`);
    console.log(`   Hard: ${hard} (${Math.round(hard/set.length*100)}%)\n`);

    if (hard > 0) {
      console.log(`⚠️  WARNING: ${name} has ${hard} HARD questions (expected 0)!\n`);
    }
  };

  verifySet(setA, 'SET A');
  verifySet(setB, 'SET B');

  // Format questions for the JSON files (matching the existing structure)
  const formatQuestion = (q: any) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    marks: 1,
    difficulty: q.difficulty,
    topic: q.topic,
    subject: q.subject,
    examContext: q.exam_context || 'KCET',
    blooms: q.blooms_level || 'Understand',
    solutionSteps: q.solution_steps || [],
    examTip: q.exam_tip || '',
    studyTip: q.study_tip || '',
    masteryMaterial: q.mastery_material || {
      coreConcept: '',
      memoryTrigger: '',
      visualPrompt: '',
      commonTrap: ''
    },
    keyFormulas: q.key_formulas || [],
    thingsToRemember: q.things_to_remember || [],
    questionVariations: q.question_variations || [],
    correct_option_index: q.correct_option_index,
    metadata: q.metadata
  });

  // Create SET A JSON
  const setAJson = {
    test_name: 'PLUS2AI OFFICIAL BIOLOGY PREDICTION 2026: SET_A',
    subject: 'Biology',
    exam_context: 'KCET',
    total_questions: 60,
    test_config: {
      questions: setA.map(formatQuestion)
    }
  };

  // Create SET B JSON
  const setBJson = {
    test_name: 'PLUS2AI OFFICIAL BIOLOGY PREDICTION 2026: SET_B',
    subject: 'Biology',
    exam_context: 'KCET',
    total_questions: 60,
    test_config: {
      questions: setB.map(formatQuestion)
    }
  };

  // Write to root directory
  const rootDir = process.cwd();
  const setAPath = path.join(rootDir, 'flagship_biology_final.json');
  const setBPath = path.join(rootDir, 'flagship_biology_final_b.json');

  console.log('📝 Writing JSON files...\n');

  fs.writeFileSync(setAPath, JSON.stringify(setAJson, null, 2));
  fs.writeFileSync(setBPath, JSON.stringify(setBJson, null, 2));

  console.log(`✅ SET A exported to: flagship_biology_final.json`);
  console.log(`✅ SET B exported to: flagship_biology_final_b.json\n`);

  // Verify file sizes
  const setASize = fs.statSync(setAPath).size;
  const setBSize = fs.statSync(setBPath).size;

  console.log(`📦 File Sizes:\n`);
  console.log(`   SET A: ${(setASize / 1024).toFixed(2)} KB`);
  console.log(`   SET B: ${(setBSize / 1024).toFixed(2)} KB\n`);

  console.log('═══════════════════════════════════════════════════════\n');
  console.log('✅ EXPORT COMPLETE!\n');
  console.log('🎯 Next steps:\n');
  console.log('   1. Refresh the UI (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)');
  console.log('   2. Open "Biology Set-A Prediction" test');
  console.log('   3. Verify questions now show 90% Easy, 10% Moderate (0% Hard)\n');
  console.log('═══════════════════════════════════════════════════════\n');
}

exportBiologyFlagship().catch(console.error);
