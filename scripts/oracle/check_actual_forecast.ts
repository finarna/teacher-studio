import { getForecastedCalibration } from '../../lib/reiEvolutionEngine';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

async function checkForecast() {
  console.log('🔍 Checking actual forecast data from database...\n');

  const forecast = await getForecastedCalibration('KCET', 'Math');

  console.log('📊 FORECAST DATA RETURNED:');
  console.log(JSON.stringify(forecast, null, 2));

  console.log('\n📊 KEY PARAMETERS:');
  console.log(`   IDS Target: ${forecast.idsTarget}`);
  console.log(`   Rigor Velocity: ${forecast.rigorVelocity}`);
  console.log(`   Board Signature: ${forecast.boardSignature}`);

  console.log('\n📊 DIFFICULTY PROFILE:');
  console.log(`   Easy: ${forecast.difficultyProfile.easy}%`);
  console.log(`   Moderate: ${forecast.difficultyProfile.moderate}%`);
  console.log(`   Hard: ${forecast.difficultyProfile.hard}%`);
  console.log(`   Total: ${forecast.difficultyProfile.easy + forecast.difficultyProfile.moderate + forecast.difficultyProfile.hard}%`);

  console.log('\n📊 INTENT SIGNATURE:');
  console.log(`   Synthesis: ${forecast.intentSignature.synthesis}`);
  console.log(`   Trap Density: ${forecast.intentSignature.trapDensity}`);
  console.log(`   Linguistic Load: ${forecast.intentSignature.linguisticLoad}`);
  console.log(`   Speed Requirement: ${forecast.intentSignature.speedRequirement}`);

  console.log('\n📊 DIRECTIVES:');
  forecast.directives.forEach((d, i) => console.log(`   ${i + 1}. ${d}`));
}

checkForecast().catch(console.error);
