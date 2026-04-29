import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function checkNEETPhysics() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 NEET PHYSICS - READINESS CHECK FOR REPEATABLE CALIBRATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check scans first
  console.log('📄 STEP 1: Checking NEET Physics Scans/Papers...\n');
  const { data: scans, error: scanError } = await supabase
    .from('scans')
    .select('id, year, exam_context, subject, status, name')
    .eq('exam_context', 'NEET')
    .eq('subject', 'Physics')
    .order('year', { ascending: false });

  if (scanError) {
    console.error('❌ Error fetching scans:', scanError);
  } else if (!scans || scans.length === 0) {
    console.log('⚠️  NO NEET Physics scans found in database!');
  } else {
    console.log(`✅ Found ${scans.length} NEET Physics scans:\n`);
    for (const scan of scans) {
      console.log(`   📋 ${scan.year} - ${scan.name} (${scan.status})`);
    }
  }

  // Check questions
  console.log('\n📝 STEP 2: Checking NEET Physics Questions...\n');
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, year, exam_context, subject')
    .eq('exam_context', 'NEET')
    .eq('subject', 'Physics')
    .order('year', { ascending: false });

  if (error) {
    console.error('❌ Error fetching questions:', error);
    return;
  }

  const count = questions ? questions.length : 0;
  console.log(`✅ Total NEET Physics questions: ${count}\n`);

  if (questions && questions.length > 0) {
    const byYear: Record<number, number> = {};
    for (const q of questions) {
      byYear[q.year] = (byYear[q.year] || 0) + 1;
    }

    console.log('📊 BREAKDOWN BY YEAR:');
    for (const [year, count] of Object.entries(byYear).sort((a, b) => Number(b[0]) - Number(a[0]))) {
      const status = count === 45 ? '✅' : count < 45 ? '⚠️' : '✅';
      console.log(`   ${year}: ${count} questions ${status} (Expected: 45)`);
    }

    const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const yearRange = maxYear - minYear + 1;

    console.log(`\n📅 Year Range: ${minYear}-${maxYear} (${yearRange} years)`);
    console.log(`✅ Minimum Required: 3 years (2021-2025 ideal)`);

    if (yearRange < 3) {
      console.log(`⚠️  WARNING: Only ${yearRange} year(s) available. Need at least 3 years for calibration.`);
    }
  } else {
    console.log('❌ NO NEET Physics questions found in database!');
  }

  // Check identities
  console.log('\n🧬 STEP 3: Checking Identity Banks...\n');
  const { data: identities } = await supabase
    .from('identities')
    .select('id, identity_id, exam, subject, high_yield')
    .eq('exam', 'NEET')
    .eq('subject', 'Physics');

  const idCount = identities ? identities.length : 0;
  const highYieldCount = identities ? identities.filter(i => i.high_yield).length : 0;

  console.log(`📊 Database Identities: ${idCount}`);
  console.log(`📁 File Identities: 5 (in lib/oracle/identities/neet_physics.json)`);
  console.log(`🎯 Target: 180 identities (from REPEATABLE_CALIBRATION_WORKFLOW.md)`);
  console.log(`⭐ High-Yield: ${highYieldCount}/${idCount}\n`);

  if (idCount < 180) {
    console.log(`⚠️  Gap: ${180 - idCount} identities needed`);
  }

  // Summary and next steps
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 READINESS SUMMARY FOR REPEATABLE CALIBRATION WORKFLOW');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const hasMinimumYears = questions && questions.length > 0 &&
    (Object.keys(questions.reduce((acc: Record<number, number>, q) => {
      acc[q.year] = 1;
      return acc;
    }, {})).length >= 3);

  const hasMinimumIdentities = idCount >= 50; // At least starter set
  const hasQuestions = count > 0;

  console.log(`✅ Prerequisites Check:`);
  console.log(`   ${hasQuestions ? '✅' : '❌'} Questions Available: ${hasQuestions ? 'YES' : 'NO'}`);
  console.log(`   ${hasMinimumYears ? '✅' : '⚠️'} Minimum 3 Years: ${hasMinimumYears ? 'YES' : 'NO (need more years)'}`);
  console.log(`   ${hasMinimumIdentities ? '✅' : '⚠️'} Starter Identities: ${hasMinimumIdentities ? 'YES' : 'NO (need ${50 - idCount} more)'}`);

  console.log('\n📍 NEXT STEPS:\n');

  if (!hasQuestions) {
    console.log('1. ❌ BLOCKER: No NEET Physics questions in database');
    console.log('   → Extract NEET Physics papers (2021-2025) from PDFs');
    console.log('   → Load into database using existing extraction scripts\n');
  } else if (!hasMinimumYears) {
    console.log('1. ⚠️  WARNING: Less than 3 years of data');
    console.log('   → Can proceed but results will be less reliable');
    console.log('   → Recommend adding more years (2021-2025)\n');
  }

  if (!hasMinimumIdentities) {
    console.log('2. ⚠️  Identity bank is very small (only 5-10 identities)');
    console.log('   → Phase 2 (Calibration Execution) will bootstrap from KCET/existing');
    console.log('   → Can proceed with calibration workflow\n');
  }

  if (hasQuestions && hasMinimumYears) {
    console.log('✅ READY TO START! Begin with:');
    console.log('   Phase 1: Data Preparation (analyze_neet_physics_question_types_2021_2025.ts)');
    console.log('   Phase 2: Calibration Execution (iterative calibration)\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

checkNEETPhysics().catch(console.error);
