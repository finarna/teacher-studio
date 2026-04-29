import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify2027Calibration() {
  console.log('\n🔍 VERIFYING NEET 2027 CALIBRATIONS\n');

  const { data, error } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', 'NEET')
    .eq('target_year', 2027)
    .order('subject');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No 2027 calibrations found\n');
    return;
  }

  console.log(`Found ${data.length} calibration(s) for NEET 2027:\n`);

  data.forEach((cal: any) => {
    console.log(`Subject: ${cal.subject}`);
    console.log(`  Target Year: ${cal.target_year}`);
    console.log(`  Board Signature: ${cal.board_signature}`);
    console.log(`  Rigor Velocity: ${cal.rigor_velocity}`);
    console.log(`  IDS Target: ${cal.intent_signature?.idsTarget}`);
    console.log(`  Difficulty: ${cal.intent_signature?.difficultyEasyPct}/${cal.intent_signature?.difficultyModeratePct}/${cal.intent_signature?.difficultyHardPct}`);

    if (cal.intent_signature?.questionTypeProfile) {
      console.log('  Question Type Profile:');
      Object.entries(cal.intent_signature.questionTypeProfile)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .forEach(([type, pct]) => {
          console.log(`    ${type}: ${pct}%`);
        });
    }

    console.log('');
  });
}

verify2027Calibration().catch(console.error);
