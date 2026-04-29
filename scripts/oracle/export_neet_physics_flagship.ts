import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCAN_ID = '2adcb415-9410-4468-b8f3-32206e5ae7cb'; // NEET Physics 2026 flagship

async function exportFlagship() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║        PHASE 8: UI DEPLOYMENT - NEET PHYSICS 2026                ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 STEP 8.1: Fetching Flagship Questions from Database\n');
  console.log(`   Scan ID: ${SCAN_ID}`);
  console.log('   Subject: NEET Physics');
  console.log('   Expected: 90 questions (45 SET A + 45 SET B)\n');

  // Get all 90 questions ordered by creation date
  const { data: allQuestions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('scan_id', SCAN_ID)
    .order('created_at', { ascending: true }); // Ascending: SET A created first, SET B created second

  if (error || !allQuestions) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`✅ Fetched ${allQuestions.length} questions from database\n`);

  if (allQuestions.length !== 90) {
    console.warn(`⚠️  Warning: Expected 90 questions, got ${allQuestions.length}`);
  }

  // Split into SET A (first 45) and SET B (last 45)
  const setA = allQuestions.slice(0, 45);
  const setB = allQuestions.slice(45, 90);

  console.log('📋 STEP 8.2: Analyzing Question Distribution\n');
  console.log(`   SET A: ${setA.length} questions`);
  console.log(`   SET B: ${setB.length} questions`);
  console.log(`   Total: ${allQuestions.length} questions\n`);

  // Analyze difficulty distribution
  const analyzeDifficulty = (questions: any[], setName: string) => {
    const easy = questions.filter(q => q.difficulty === 'Easy').length;
    const moderate = questions.filter(q => q.difficulty === 'Moderate').length;
    const hard = questions.filter(q => q.difficulty === 'Hard').length;

    console.log(`   ${setName} Difficulty Distribution:`);
    console.log(`     Easy: ${easy} (${((easy / questions.length) * 100).toFixed(1)}%)`);
    console.log(`     Moderate: ${moderate} (${((moderate / questions.length) * 100).toFixed(1)}%)`);
    console.log(`     Hard: ${hard} (${((hard / questions.length) * 100).toFixed(1)}%)`);
  };

  analyzeDifficulty(setA, 'SET A');
  console.log('');
  analyzeDifficulty(setB, 'SET B');
  console.log('');

  // Format questions for JSON
  const formatQuestion = (q: any) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    marks: 4, // NEET: 4 marks per question
    difficulty: q.difficulty,
    topic: q.topic,
    subject: q.subject,
    examContext: q.exam_context || 'NEET',
    blooms: q.blooms_level || 'Understand',
    solutionSteps: q.solution_steps || [],
    examTip: q.exam_tip || '',
    studyTip: q.study_tip || '',
    masteryMaterial: q.mastery_material || {},
    keyFormulas: q.key_formulas || [],
    thingsToRemember: q.things_to_remember || [],
    questionVariations: q.question_variations || [],
    correct_option_index: q.correct_option_index,
    metadata: q.metadata
  });

  console.log('📦 STEP 8.3: Creating JSON Export Files\n');

  // Create SET A JSON
  const setAJson = {
    test_name: 'PLUS2AI OFFICIAL NEET PHYSICS PREDICTION 2026: SET A',
    subject: 'Physics',
    exam_context: 'NEET',
    total_questions: 45,
    total_marks: 180, // 45 questions × 4 marks
    description: 'SET A: Formula for CALCULATION - Emphasis on computational mastery and numerical problem-solving',
    strategic_focus: 'Quantitative problem-solving, multi-step calculations, numerical accuracy, formula application',
    calibration: {
      ids: 0.894,
      rigor: 1.68,
      difficulty_distribution: '20/71/9',
      board_signature: 'DIAGRAM_FORMULA_MCQ'
    },
    test_config: {
      questions: setA.map(formatQuestion)
    }
  };

  // Create SET B JSON
  const setBJson = {
    test_name: 'PLUS2AI OFFICIAL NEET PHYSICS PREDICTION 2026: SET B',
    subject: 'Physics',
    exam_context: 'NEET',
    total_questions: 45,
    total_marks: 180, // 45 questions × 4 marks
    description: 'SET B: Formula for UNDERSTANDING - Emphasis on conceptual relationships and physical meaning',
    strategic_focus: 'Understanding relationships, proportionality, cause-effect reasoning, graphical interpretation',
    calibration: {
      ids: 0.894,
      rigor: 1.68,
      difficulty_distribution: '20/71/9',
      board_signature: 'DIAGRAM_FORMULA_MCQ'
    },
    test_config: {
      questions: setB.map(formatQuestion)
    }
  };

  // Write to root directory
  const rootDir = process.cwd();
  const setAPath = path.join(rootDir, 'flagship_neet_physics_2026_set_a.json');
  const setBPath = path.join(rootDir, 'flagship_neet_physics_2026_set_b.json');

  fs.writeFileSync(setAPath, JSON.stringify(setAJson, null, 2));
  fs.writeFileSync(setBPath, JSON.stringify(setBJson, null, 2));

  console.log(`✅ SET A exported: flagship_neet_physics_2026_set_a.json`);
  console.log(`   Location: ${setAPath}`);
  console.log(`   Size: ${(fs.statSync(setAPath).size / 1024).toFixed(2)} KB`);
  console.log('');
  console.log(`✅ SET B exported: flagship_neet_physics_2026_set_b.json`);
  console.log(`   Location: ${setBPath}`);
  console.log(`   Size: ${(fs.statSync(setBPath).size / 1024).toFixed(2)} KB`);
  console.log('');

  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                 PHASE 8 EXPORT COMPLETE                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log('📋 Summary:');
  console.log(`   Total Questions Exported: ${allQuestions.length}`);
  console.log(`   SET A: 45 questions (Formula for CALCULATION)`);
  console.log(`   SET B: 45 questions (Formula for UNDERSTANDING)`);
  console.log(`   Total Marks: 360 (180 per set)`);
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('   1. Verify JSON files are valid');
  console.log('   2. Test questions in UI');
  console.log('   3. Deploy to production');
  console.log('   4. Monitor student usage');
  console.log('');
  console.log('📄 Files Created:');
  console.log('   - flagship_neet_physics_2026_set_a.json');
  console.log('   - flagship_neet_physics_2026_set_b.json');
  console.log('');
}

exportFlagship().catch(console.error);
