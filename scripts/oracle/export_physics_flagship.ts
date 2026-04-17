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

  // Find the most recent Physics papers
  const { data: tests, error } = await supabase
    .from('custom_tests')
    .select('*')
    .eq('subject', 'Physics')
    .eq('exam_context', 'KCET')
    .like('test_name', '%PLUS2AI OFFICIAL PHYSICS PREDICTION 2026%')
    .order('created_at', { ascending: false })
    .limit(2);

  if (error || !tests || tests.length < 2) {
    console.error('❌ Error fetching tests:', error);
    return;
  }

  console.log(`✅ Found ${tests.length} Physics flagship papers`);

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const setName = test.test_name.includes('SET_A') ? 'SET_A' : 'SET_B';
    const fileName = setName === 'SET_A' ? 'flagship_physics_final.json' : 'flagship_physics_final_b.json';

    console.log(`\n📝 ${setName}:`);
    console.log(`   Test ID: ${test.id}`);
    console.log(`   Name: ${test.test_name}`);
    console.log(`   Questions: ${test.questions?.length || 0}`);
    console.log(`   Created: ${test.created_at}`);

    // Export to file
    const exportData = {
      meta: {
        version: 'REI v17.0',
        subject: 'Physics',
        exam: 'KCET',
        targetYear: 2026,
        setName: setName,
        generatedAt: test.created_at,
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
      test: {
        id: test.id,
        name: test.test_name,
        questionCount: test.questions?.length || 0,
        difficultyMix: test.difficulty_mix,
        questions: test.questions
      }
    };

    fs.writeFileSync(fileName, JSON.stringify(exportData, null, 2));
    console.log(`   ✅ Exported to ${fileName}`);
  }

  console.log('\n🎉 Physics flagship export complete!');
}

exportPhysicsFlagship().catch(console.error);
