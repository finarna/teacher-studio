import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkNEETCalibrations() {
  console.log('\n🔍 CHECKING ACTUAL NEET CALIBRATIONS IN DATABASE\n');
  console.log('═'.repeat(80));

  const { data, error } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', 'NEET')
    .order('subject');

  if (error) {
    console.error('❌ Error querying database:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('\n⚠️  NO NEET CALIBRATIONS FOUND IN DATABASE');
    console.log('\nThis means:');
    console.log('  1. Phase 4 SQL inserts have NOT been executed yet');
    console.log('  2. We need to create calibration SQL for ALL 4 subjects');
    console.log('  3. Cannot generate flagship papers without calibration data\n');
    return;
  }

  console.log(`\n✅ Found ${data.length} NEET calibration(s):\n`);

  data.forEach((cal: any) => {
    console.log(`Subject: ${cal.subject}`);
    console.log(`  Target Year: ${cal.target_year}`);
    console.log(`  Board Signature: ${cal.board_signature}`);
    console.log(`  IDS Target: ${cal.ids_target}`);
    console.log(`  Rigor Velocity: ${cal.rigor_velocity}`);
    console.log(`  Difficulty: ${cal.difficulty_easy_pct}/${cal.difficulty_moderate_pct}/${cal.difficulty_hard_pct}`);

    if (cal.intent_signature?.questionTypeProfile) {
      console.log(`  Question Type Profile:`);
      const profile = cal.intent_signature.questionTypeProfile;
      Object.entries(profile).forEach(([type, pct]) => {
        if (pct > 0) {
          console.log(`    ${type}: ${pct}%`);
        }
      });
    }

    if (cal.calibration_directives && cal.calibration_directives.length > 0) {
      console.log(`  Directives: ${cal.calibration_directives.length} items`);
    }

    console.log('');
  });

  console.log('═'.repeat(80));
  console.log('\n📊 SUMMARY:\n');

  const subjects = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
  const foundSubjects = data.map((d: any) => d.subject);
  const missingSubjects = subjects.filter(s => !foundSubjects.includes(s));

  console.log(`✅ Calibrated: ${foundSubjects.join(', ')}`);

  if (missingSubjects.length > 0) {
    console.log(`❌ Missing: ${missingSubjects.join(', ')}`);
    console.log(`\nNeed to create calibration SQL for: ${missingSubjects.join(', ')}\n`);
  } else {
    console.log(`✅ All 4 NEET subjects are calibrated!\n`);
  }
}

checkNEETCalibrations().catch(console.error);
