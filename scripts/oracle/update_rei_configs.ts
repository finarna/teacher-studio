import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateReiConfigs() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  UPDATING REI EVOLUTION CONFIGS WITH CALIBRATED PARAMS       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Load calibrated engine config
  const engineConfig = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'lib/oracle/engine_config.json'), 'utf8')
  );

  console.log('📁 Loaded Calibrated Engine Config:');
  console.log(`   - rigor_drift_multiplier: ${engineConfig.rigor_drift_multiplier}`);
  console.log(`   - ids_baseline: ${engineConfig.ids_baseline}`);
  console.log(`   - synthesis_weight: ${engineConfig.synthesis_weight}`);
  console.log(`   - trap_weight: ${engineConfig.trap_weight}`);
  console.log('');

  const EXAM = 'KCET';
  const SUBJECT = 'Math';

  console.log(`🔄 Updating rei_evolution_configs for ${EXAM} ${SUBJECT}...\n`);

  const { error } = await supabase
    .from('rei_evolution_configs')
    .upsert({
      exam_context: EXAM,
      subject: SUBJECT,
      rigor_drift_multiplier: engineConfig.rigor_drift_multiplier,
      ids_baseline: engineConfig.ids_baseline,
      synthesis_weight: engineConfig.synthesis_weight,
      trap_density_weight: engineConfig.trap_weight,
      linguistic_load_weight: engineConfig.intent_learning_rate || 0.25,
      speed_requirement_weight: engineConfig.solve_tension_multiplier || 1.12
    }, {
      onConflict: 'exam_context,subject'
    });

  if (error) {
    console.error('❌ Error updating config:', error.message);
    return;
  }

  console.log('✅ Successfully updated rei_evolution_configs!\n');

  // Verify the update
  const { data: verifyData } = await supabase
    .from('rei_evolution_configs')
    .select('*')
    .eq('exam_context', EXAM)
    .eq('subject', SUBJECT)
    .single();

  if (verifyData) {
    console.log('📊 Verified Updated Configuration:');
    console.log(`   - rigor_drift_multiplier: ${verifyData.rigor_drift_multiplier}`);
    console.log(`   - ids_baseline: ${verifyData.ids_baseline}`);
    console.log(`   - synthesis_weight: ${verifyData.synthesis_weight}`);
    console.log(`   - trap_density_weight: ${verifyData.trap_density_weight}`);
    console.log(`   - last_updated: ${verifyData.last_updated}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ REI EVOLUTION CONFIGS UPDATE COMPLETE');
  console.log('\nFlagship generation will now use calibrated parameters from:');
  console.log('  1. rei_evolution_configs table (engine params) ✅');
  console.log('  2. exam_historical_patterns table (board signatures) ✅');
  console.log('  3. lib/oracle/identities/kcet_math.json (identity confidences) ✅');
  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

updateReiConfigs().catch(console.error);
