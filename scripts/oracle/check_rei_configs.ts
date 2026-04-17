import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkConfigs() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  CHECKING REI EVOLUTION CONFIGS TABLE                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const { data, error } = await supabase
    .from('rei_evolution_configs')
    .select('*')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Math');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  const count = data?.length || 0;
  console.log(`📊 Found ${count} record(s) for KCET Math\n`);

  if (data && data.length > 0) {
    const config = data[0];
    console.log('Current Configuration:');
    console.log(`  - rigor_drift_multiplier: ${config.rigor_drift_multiplier || 'NOT SET'}`);
    console.log(`  - ids_baseline: ${config.ids_baseline || 'NOT SET'}`);
    console.log(`  - synthesis_weight: ${config.synthesis_weight || 'NOT SET'}`);
    console.log(`  - trap_density_weight: ${config.trap_density_weight || 'NOT SET'}`);
    console.log(`  - linguistic_load_weight: ${config.linguistic_load_weight || 'NOT SET'}`);
    console.log(`  - speed_requirement_weight: ${config.speed_requirement_weight || 'NOT SET'}`);
    console.log(`  - last_updated: ${config.last_updated || 'NOT SET'}`);
  } else {
    console.log('⚠️  No configuration found for KCET Math in rei_evolution_configs table');
    console.log('   This table is used by getForecastedCalibration() to override historical patterns');
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

checkConfigs().catch(console.error);
