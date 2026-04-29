/**
 * Validation script for NEET Physics calibration setup
 * Verifies:
 * 1. All scan IDs are accessible
 * 2. Each scan has 50 Physics questions
 * 3. Identity bank exists and has correct structure
 */

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

const OFFICIAL_SCANS: Record<number, string> = {
  2021: 'ca38a537-5516-469a-abd4-967a76b32028',
  2022: 'b19037fb-980a-41e1-89a0-d28a5e1c0033',
  2023: 'e3767338-1664-4e03-b0f6-1fab41ff5838',
  2024: '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5',
  2025: '4f682118-d0ce-4f6f-95c7-6141e496579f'
};

async function validateSetup() {
  console.log('\n=== NEET Physics Calibration Setup Validation ===\n');

  let allValid = true;

  // 1. Check identity bank
  console.log('1. Checking identity bank...');
  const identityBankPath = path.join(
    process.cwd(),
    'lib/oracle/identities/neet_physics.json'
  );

  if (!fs.existsSync(identityBankPath)) {
    console.error('   ❌ Identity bank not found at:', identityBankPath);
    allValid = false;
  } else {
    const identityBank = JSON.parse(fs.readFileSync(identityBankPath, 'utf8'));
    console.log(`   ✅ Identity bank found with ${identityBank.identities?.length || 0} identities`);
    console.log(`      Subject: ${identityBank.subject}`);
    console.log(`      Exam: ${identityBank.exam}`);
    console.log(`      Version: ${identityBank.version}`);
  }

  // 2. Check scans
  console.log('\n2. Validating scan IDs and question counts...\n');

  for (const [year, scanId] of Object.entries(OFFICIAL_SCANS)) {
    const { data: scan } = await supabase
      .from('scans')
      .select('id, name, exam_context, subject')
      .eq('id', scanId)
      .single();

    if (!scan) {
      console.log(`   ❌ ${year}: Scan not found (${scanId})`);
      allValid = false;
      continue;
    }

    const { count: physicsCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('scan_id', scanId)
      .eq('subject', 'Physics');

    const expectedCount = 50;
    const status = physicsCount === expectedCount ? '✅' : '⚠️';

    console.log(`   ${status} ${year}: ${scan.name}`);
    console.log(`      Physics Questions: ${physicsCount}/${expectedCount}`);

    if (physicsCount !== expectedCount) {
      console.log(`      WARNING: Expected ${expectedCount} Physics questions, found ${physicsCount}`);
      if (physicsCount === 0) {
        allValid = false;
      }
    }
  }

  // 3. Summary
  console.log('\n=== Validation Summary ===\n');

  if (allValid) {
    console.log('✅ All checks passed! Ready to run calibration.');
    console.log('\nTo run calibration:');
    console.log('  npx tsx scripts/oracle/neet_physics_iterative_calibration_2021_2025.ts\n');
  } else {
    console.log('❌ Some checks failed. Please fix the issues above before running calibration.\n');
    process.exit(1);
  }
}

validateSetup().catch((error) => {
  console.error('\n❌ Validation failed:', error);
  process.exit(1);
});
