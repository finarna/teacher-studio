import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateMasterCalibration() {
  console.log('🔧 Updating ai_universal_calibration with CALIBRATED VALUES...\n');

  const { data, error } = await supabase
    .from('ai_universal_calibration')
    .update({
      rigor_velocity: 1.6817,
      intent_signature: {
        synthesis: 0.294,
        trapDensity: 0.30,
        linguisticLoad: 0.25,
        speedRequirement: 1.12,
        idsTarget: 0.8942,
        difficultyProfile: {
          easy: 37,
          moderate: 48,
          hard: 15
        }
      },
      updated_at: new Date().toISOString()
    })
    .eq('exam_type', 'KCET')
    .eq('subject', 'Math')
    .eq('target_year', 2026)
    .select();

  if (error) {
    console.error('❌ Update failed:', error.message);
    return;
  }

  console.log('✅ Updated successfully!');
  console.log(JSON.stringify(data, null, 2));
}

updateMasterCalibration().catch(console.error);
