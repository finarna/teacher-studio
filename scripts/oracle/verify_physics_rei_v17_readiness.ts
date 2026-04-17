import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyReadiness() {
  console.log('🔍 PHYSICS REI V17 PRE-FLIGHT VERIFICATION\n');
  console.log('=' .repeat(60));

  let allGood = true;

  // 1. Database Calibration
  console.log('\n1️⃣  DATABASE (ai_universal_calibration)');
  const { data: dbData, error: dbError } = await supabase
    .from('ai_universal_calibration')
    .select('*')
    .eq('exam_type', 'KCET')
    .eq('subject', 'Physics')
    .eq('target_year', 2026)
    .single();

  if (dbError || !dbData) {
    console.log('   ❌ Database record NOT found');
    allGood = false;
  } else {
    console.log('   ✅ Database record found');
    console.log(`   ✅ rigor_velocity: ${dbData.rigor_velocity}`);
    console.log(`   ✅ board_signature: ${dbData.board_signature}`);

    if (dbData.intent_signature?.questionTypeProfile) {
      const qtp = dbData.intent_signature.questionTypeProfile;
      console.log('   ✅ questionTypeProfile:');
      console.log(`      - conceptual: ${qtp.conceptual}%`);
      console.log(`      - graph_analysis: ${qtp.graph_analysis}%`);
      console.log(`      - experimental: ${qtp.experimental}%`);
    } else {
      console.log('   ❌ questionTypeProfile MISSING');
      allGood = false;
    }
  }

  // 2. Identity Bank
  console.log('\n2️⃣  IDENTITY BANK (lib/oracle/identities/kcet_physics.json)');
  const identityPath = path.join(process.cwd(), 'lib/oracle/identities/kcet_physics.json');
  if (!fs.existsSync(identityPath)) {
    console.log('   ❌ Identity bank file NOT found');
    allGood = false;
  } else {
    const identityBank = JSON.parse(fs.readFileSync(identityPath, 'utf-8'));
    console.log(`   ✅ File exists: ${identityBank.identities.length} identities`);
    console.log(`   ✅ Version: ${identityBank.version}`);
    console.log(`   ✅ Calibration status: ${identityBank.calibration?.status}`);

    if (identityBank.calibration?.question_type_profile) {
      console.log('   ✅ question_type_profile present in identity bank');
    } else {
      console.log('   ❌ question_type_profile MISSING from identity bank');
      allGood = false;
    }
  }

  // 3. AI Question Generator
  console.log('\n3️⃣  AI QUESTION GENERATOR (lib/aiQuestionGenerator.ts)');
  const generatorPath = path.join(process.cwd(), 'lib/aiQuestionGenerator.ts');
  const generatorCode = fs.readFileSync(generatorPath, 'utf-8');

  if (generatorCode.includes("examConfig.subject === 'Physics'")) {
    console.log('   ✅ Physics question type mandate present');
    if (generatorCode.includes('CONCEPTUAL (77%')) {
      console.log('   ✅ Correct Physics distribution (77% conceptual)');
    } else {
      console.log('   ⚠️  Physics distribution might be outdated');
    }
  } else {
    console.log('   ❌ Physics question type mandate MISSING');
    allGood = false;
  }

  // 4. REI Engine
  console.log('\n4️⃣  REI EVOLUTION ENGINE (lib/reiEvolutionEngine.ts)');
  const reiPath = path.join(process.cwd(), 'lib/reiEvolutionEngine.ts');
  const reiCode = fs.readFileSync(reiPath, 'utf-8');

  if (reiCode.includes('questionTypeProfile')) {
    console.log('   ✅ questionTypeProfile support in REI engine');
  } else {
    console.log('   ❌ questionTypeProfile support MISSING');
    allGood = false;
  }

  // 5. Scan Data Availability
  console.log('\n5️⃣  SCAN DATA AVAILABILITY');
  const OFFICIAL_SCANS = {
    2021: '6f0d3189-8b85-45bc-b66b-d7f51f886959',
    2022: '7110bd64-a715-4146-a1ba-c282d6b47420',
    2023: '9ca566d7-20d0-4ea2-abcd-a9b050ddb8bb',
    2024: 'a9447e71-2072-4ea7-af79-1bf4ec557825',
    2025: '15d3394d-798e-41d3-9f96-b3ad6e7d1444'
  };

  let scansFound = 0;
  for (const [year, scanId] of Object.entries(OFFICIAL_SCANS)) {
    const { data: scanData } = await supabase
      .from('scans')
      .select('id, subject')
      .eq('id', scanId)
      .single();

    if (scanData) {
      scansFound++;
      console.log(`   ✅ ${year} scan found (${scanData.subject})`);
    } else {
      console.log(`   ❌ ${year} scan NOT found`);
      allGood = false;
    }
  }

  // Final Summary
  console.log('\n' + '='.repeat(60));
  if (allGood) {
    console.log('✅ ALL SYSTEMS GO! Physics is ready for REI v17 flagship generation');
  } else {
    console.log('❌ ISSUES DETECTED! Please fix before generating flagship papers');
  }
  console.log('='.repeat(60) + '\n');
}

verifyReadiness().then(() => process.exit(0));
