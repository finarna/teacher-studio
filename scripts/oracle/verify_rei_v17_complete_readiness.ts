import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyREIv17Readiness() {
  console.log('🔍 REI V17 COMPLETE SYSTEM VERIFICATION\n');
  console.log('=' .repeat(70));

  const subjects = ['Math', 'Physics'];
  const allPassed = [];

  for (const subject of subjects) {
    console.log(`\n📊 ${subject.toUpperCase()} VERIFICATION\n`);

    // 1. Check identity bank
    const identityPath = `lib/oracle/identities/kcet_${subject.toLowerCase()}.json`;
    const identityData = JSON.parse(fs.readFileSync(identityPath, 'utf-8'));

    console.log(`✓ Identity Bank: ${identityData.identities.length} identities`);
    console.log(`  - Version: ${identityData.version}`);
    console.log(`  - Status: ${identityData.calibration.status}`);
    console.log(`  - IDS Target: ${identityData.calibration.ids_target}`);
    console.log(`  - Rigor Velocity: ${identityData.calibration.rigor_velocity}`);
    console.log(`  - Board Signature: ${identityData.calibration.board_signature}`);
    console.log(`  - Question Types:`, Object.entries(identityData.calibration.question_type_profile).map(([k,v]) => `${k}=${v}%`).join(', '));
    console.log(`  - Difficulty:`, Object.entries(identityData.calibration.difficulty_profile).map(([k,v]) => `${k}=${v}%`).join(', '));

    // 2. Check database
    const { data: dbData, error } = await supabase
      .from('ai_universal_calibration')
      .select('*')
      .eq('exam_type', 'KCET')
      .eq('subject', subject)
      .eq('target_year', 2026)
      .single();

    if (error || !dbData) {
      console.log(`❌ Database record NOT FOUND!`);
      allPassed.push(false);
      continue;
    }

    console.log(`✓ Database: Record found`);
    console.log(`  - IDS Target: ${dbData.intent_signature?.idsTarget}`);
    console.log(`  - Rigor Velocity: ${dbData.rigor_velocity}`);
    console.log(`  - Board Signature: ${dbData.board_signature}`);
    console.log(`  - Question Types:`, Object.entries(dbData.intent_signature?.questionTypeProfile || {}).map(([k,v]) => `${k}=${v}%`).join(', '));

    // 3. Verify consistency
    const consistent =
      Math.abs(identityData.calibration.ids_target - (dbData.intent_signature?.idsTarget || 0)) < 0.01 &&
      identityData.calibration.rigor_velocity === dbData.rigor_velocity &&
      identityData.calibration.board_signature === dbData.board_signature;

    if (consistent) {
      console.log(`✓ Consistency: Identity bank ↔ Database MATCH!`);
    } else {
      console.log(`❌ Consistency: MISMATCH between identity bank and database!`);
      allPassed.push(false);
      continue;
    }

    // 4. Check AI generator integration
    const generatorCode = fs.readFileSync('lib/aiQuestionGenerator.ts', 'utf-8');
    const hasMandate = generatorCode.includes(`examConfig.subject === '${subject}'`) &&
                       generatorCode.includes('QUESTION TYPE DISTRIBUTION');

    if (hasMandate) {
      console.log(`✓ AI Generator: Question type mandate integrated`);
    } else {
      console.log(`❌ AI Generator: Question type mandate MISSING!`);
      allPassed.push(false);
      continue;
    }

    // 5. Verify scan data
    const { data: scans } = await supabase
      .from('question_scans')
      .select('year')
      .eq('exam_type', 'KCET')
      .eq('subject', subject)
      .in('year', [2021, 2022, 2023, 2024, 2025])
      .order('year');

    if (scans && scans.length === 5) {
      console.log(`✓ Scan Data: All 5 years (2021-2025) available`);
    } else {
      console.log(`❌ Scan Data: Only ${scans?.length || 0}/5 years found!`);
      allPassed.push(false);
      continue;
    }

    allPassed.push(true);
    console.log(`\n✅ ${subject} is REI v17 READY!`);
  }

  console.log('\n' + '='.repeat(70));

  if (allPassed.every(p => p)) {
    console.log('\n🎉 ALL SYSTEMS GO! REI V17 COMPLETE FOR BOTH SUBJECTS!');
    console.log('\n🚀 Ready to generate flagship papers:');
    console.log('   - Math: flagship_final.json & flagship_final_b.json');
    console.log('   - Physics: flagship_physics_final.json & flagship_physics_final_b.json');
  } else {
    console.log('\n⚠️  Some verification checks failed. Review above.');
  }
}

verifyREIv17Readiness().catch(console.error);
