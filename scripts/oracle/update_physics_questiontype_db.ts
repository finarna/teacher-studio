import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updatePhysicsQuestionTypeProfile() {
  console.log('\n🔄 Updating ai_universal_calibration with Physics Question Type Profile (REI v17)\n');
  console.log('='.repeat(70));

  // Physics question type distribution from actual KCET papers (2021-2025)
  const questionTypeProfile = {
    conceptual: 77,           // Laws, principles, directions, "which of the following"
    graph_analysis: 15,       // I-V curves, variations, graphs
    experimental: 6,          // Lab apparatus, measurements
    numerical_problem: 1,     // Calculations with numbers
    diagram_based: 1,         // Ray diagrams, circuits
    formula_application: 0    // Direct formula plugging
  };

  console.log('\n📊 Physics Question Type Distribution (Actual KCET 2021-2025):');
  Object.entries(questionTypeProfile).forEach(([type, pct]) => {
    console.log(`   ${type.padEnd(25)}: ${pct}%`);
  });

  // Update database
  const { data, error } = await supabase
    .from('ai_universal_calibration')
    .upsert({
      exam_type: 'KCET',
      subject: 'Physics',
      target_year: 2026,
      rigor_velocity: 1.6817,  // From calibration
      intent_signature: {
        synthesis: 0.75,
        trapDensity: 0.30,
        linguisticLoad: 0.5,
        speedRequirement: 0.9,
        difficultyProfile: {
          easy: 30,
          moderate: 50,
          hard: 20
        },
        questionTypeProfile: questionTypeProfile  // ✨ REI v17 Enhancement
      },
      board_signature: 'CONCEPTUAL_GRAPHER',  // Physics-specific signature
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'exam_type,subject,target_year'
    });

  if (error) {
    console.error('\n❌ Error updating database:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Database updated successfully!');
  console.log('   Table: ai_universal_calibration');
  console.log('   Record: KCET Physics');
  console.log('   Field: intent_signature.questionTypeProfile');

  console.log('\n📝 Question Type Profile stored:');
  console.log(JSON.stringify(questionTypeProfile, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log('🎯 NEXT STEPS:');
  console.log('   1. Update aiQuestionGenerator.ts with Physics question type mandate');
  console.log('   2. Regenerate Physics flagship papers with REI v17');
  console.log('   3. Verify question type distribution in generated papers\n');
}

updatePhysicsQuestionTypeProfile().catch(console.error);
