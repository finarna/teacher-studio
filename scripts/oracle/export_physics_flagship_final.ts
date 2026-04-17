import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function exportPhysicsFlagship() {
  console.log('📦 Exporting Physics flagship papers...\n');

  // Get the most recent 120 Physics KCET AI-generated questions
  const { data: allQuestions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('subject', 'Physics')
    .eq('exam_context', 'KCET')
    .like('source', 'AI-Generated%')
    .order('created_at', { ascending: false })
    .limit(120);

  if (error || !allQuestions) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  console.log(`✅ Found ${allQuestions.length} recent Physics questions\n`);

  if (allQuestions.length < 60) {
    console.error(`⚠️  Not enough questions found (need 120, got ${allQuestions.length})`);
    return;
  }

  // Split into two sets (most recent 60 = SET_B, next 60 = SET_A based on generation order)
  const setB = allQuestions.slice(0, 60);
  const setA = allQuestions.slice(60, 120);

  const sets = [
    { name: 'SET_A', questions: setA, file: 'flagship_physics_final.json' },
    { name: 'SET_B', questions: setB, file: 'flagship_physics_final_b.json' }
  ];

  for (const { name, questions, file } of sets) {
    console.log(`📝 ${name}:`);
    console.log(`   Questions: ${questions.length}`);

    if (questions.length > 0) {
      console.log(`   First question created: ${questions[0]?.created_at}`);
      console.log(`   Last question created: ${questions[questions.length - 1]?.created_at}`);
    }

    // Analyze difficulty distribution
    const difficulties = questions.reduce((acc: any, q: any) => {
      acc[q.difficulty || 'unknown'] = (acc[q.difficulty || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    console.log(`   Difficulty: E=${difficulties.easy || 0} M=${difficulties.moderate || 0} H=${difficulties.hard || 0}`);

    // Export to file
    const exportData = {
      meta: {
        version: 'REI v17.0',
        subject: 'Physics',
        exam: 'KCET',
        targetYear: 2026,
        setName: name,
        generatedAt: questions[0]?.created_at || new Date().toISOString(),
        questionCount: questions.length,
        calibration: {
          idsTarget: 0.680,
          rigorVelocity: 1.6817,
          boardSignature: 'CONCEPTUAL_GRAPHER',
          questionTypeProfile: {
            conceptual: 77,
            graph_analysis: 15,
            experimental: 6,
            numerical_problem: 1,
            diagram_based: 1
          },
          difficultyProfile: {
            easy: 30,
            moderate: 50,
            hard: 20
          },
          status: 'CALIBRATED_2021_2025_REI_V17'
        }
      },
      questions: questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correctOptionIndex: q.correct_option_index,
        marks: q.marks,
        difficulty: q.difficulty,
        topic: q.topic,
        blooms: q.blooms,
        solutionSteps: q.solution_steps,
        examTip: q.exam_tip,
        keyFormulas: q.key_formulas,
        pitfalls: q.pitfalls,
        masteryMaterial: q.mastery_material,
        source: q.source
      }))
    };

    fs.writeFileSync(file, JSON.stringify(exportData, null, 2));
    console.log(`   ✅ Exported to ${file}\n`);
  }

  console.log('🎉 Physics flagship export complete!');
  console.log('\n📊 Files created:');
  console.log('   - flagship_physics_final.json (SET_A)');
  console.log('   - flagship_physics_final_b.json (SET_B)');
}

exportPhysicsFlagship().catch(console.error);
