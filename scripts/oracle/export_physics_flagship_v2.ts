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
  console.log('📦 Exporting Physics flagship papers from questions table...\n');

  const progressIds = [
    { id: '89aa7dd4-c766-4898-9942-2caaeba60b00', set: 'SET_A', file: 'flagship_physics_final.json' },
    { id: '54310c0e-25d3-4971-991e-7ead81076984', set: 'SET_B', file: 'flagship_physics_final_b.json' }
  ];

  for (const { id, set, file } of progressIds) {
    console.log(`\n📝 Fetching ${set} (progressId: ${id})...`);

    // Get questions from the questions table
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('scan_id', 'e51fe03e-621a-44a8-921d-c58e4fdff0c7')  // AI-Generated scan ID from logs
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) {
      console.error(`❌ Error fetching questions for ${set}:`, error);
      continue;
    }

    if (!questions || questions.length === 0) {
      console.log(`⚠️  No questions found for ${set}`);
      continue;
    }

    console.log(`✅ Found ${questions.length} questions`);

    // Export to file
    const exportData = {
      meta: {
        version: 'REI v17.0',
        subject: 'Physics',
        exam: 'KCET',
        targetYear: 2026,
        setName: set,
        generatedAt: new Date().toISOString(),
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
          }
        }
      },
      questions: questions
    };

    fs.writeFileSync(file, JSON.stringify(exportData, null, 2));
    console.log(`   ✅ Exported to ${file}`);

    // Quick analysis
    const difficulties = questions.reduce((acc: any, q: any) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {});

    console.log(`   📊 Difficulty distribution:`, difficulties);
  }

  console.log('\n🎉 Physics flagship export complete!');
}

exportPhysicsFlagship().catch(console.error);
