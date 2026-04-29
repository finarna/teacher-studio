/**
 * Verify NEET Workflow Alignment
 * Check if all required scripts from REPEATABLE_CALIBRATION_WORKFLOW exist for all NEET subjects
 */

import fs from 'fs';
import path from 'path';

const SUBJECTS = ['physics', 'chemistry', 'botany', 'zoology'];
const EXAM = 'neet';

// Required scripts based on REPEATABLE_CALIBRATION_WORKFLOW.md
const REQUIRED_SCRIPTS = [
  // Phase 2: Calibration Execution
  { template: '${exam}_${subject}_iterative_calibration_2021_2025.ts', description: 'Iterative calibration script' },

  // Phase 3: Question Type Analysis
  { template: 'analyze_${exam}_${subject}_question_types_2021_2025.ts', description: 'Question type analyzer' },

  // Phase 1/Build: Identity Bank Builder
  { template: 'build_${exam}_${subject}_identities_2021_2025.ts', description: 'Identity bank builder' },
];

// Optional but recommended scripts
const OPTIONAL_SCRIPTS = [
  { template: 'generate_flagship_${subject}.ts', description: 'Flagship generator' },
  { template: 'verify_${exam}_${subject}_setup.ts', description: 'Setup verifier' },
  { template: 'export_${subject}_flagship_latest.ts', description: 'Flagship exporter' },
];

console.log('\n📋 NEET WORKFLOW ALIGNMENT VERIFICATION\n');
console.log('='.repeat(80));

function checkScript(template: string, subject: string, exam: string): boolean {
  const filename = template
    .replace('${exam}', exam)
    .replace('${subject}', subject);

  const scriptPath = path.join(process.cwd(), 'scripts/oracle', filename);
  return fs.existsSync(scriptPath);
}

// Check required scripts
console.log('\n🔍 REQUIRED SCRIPTS:\n');

const results: Record<string, { required: number; found: number; missing: string[] }> = {};

for (const subject of SUBJECTS) {
  results[subject] = { required: 0, found: 0, missing: [] };

  console.log(`\n${subject.toUpperCase()}:`);

  for (const script of REQUIRED_SCRIPTS) {
    results[subject].required++;
    const exists = checkScript(script.template, subject, EXAM);
    const filename = script.template.replace('${exam}', EXAM).replace('${subject}', subject);

    if (exists) {
      results[subject].found++;
      console.log(`  ✅ ${filename}`);
    } else {
      results[subject].missing.push(filename);
      console.log(`  ❌ ${filename} - MISSING`);
    }
  }
}

// Check optional scripts
console.log('\n\n🔍 OPTIONAL SCRIPTS:\n');

for (const subject of SUBJECTS) {
  console.log(`\n${subject.toUpperCase()}:`);

  for (const script of OPTIONAL_SCRIPTS) {
    const exists = checkScript(script.template, subject, EXAM);
    const filename = script.template.replace('${exam}', EXAM).replace('${subject}', subject);

    if (exists) {
      console.log(`  ✅ ${filename}`);
    } else {
      console.log(`  ⚠️  ${filename} - Not found (optional)`);
    }
  }
}

// Check identity banks and calibration files
console.log('\n\n🔍 IDENTITY BANKS & CALIBRATION FILES:\n');

for (const subject of SUBJECTS) {
  const identityPath = path.join(process.cwd(), `lib/oracle/identities/neet_${subject}.json`);
  const calibrationPath = path.join(process.cwd(), `docs/oracle/calibration/identity_confidences_neet_${subject}.json`);

  const hasIdentity = fs.existsSync(identityPath);
  const hasCalibration = fs.existsSync(calibrationPath);

  console.log(`\n${subject.toUpperCase()}:`);
  console.log(`  ${hasIdentity ? '✅' : '❌'} lib/oracle/identities/neet_${subject}.json`);
  console.log(`  ${hasCalibration ? '✅' : '❌'} docs/oracle/calibration/identity_confidences_neet_${subject}.json`);
}

// Summary
console.log('\n\n📊 SUMMARY:\n');
console.log('='.repeat(80));

for (const [subject, stats] of Object.entries(results)) {
  const percentage = ((stats.found / stats.required) * 100).toFixed(0);
  const status = stats.found === stats.required ? '✅' : '⚠️';

  console.log(`${status} ${subject.toUpperCase()}: ${stats.found}/${stats.required} required scripts (${percentage}%)`);

  if (stats.missing.length > 0) {
    console.log(`   Missing: ${stats.missing.join(', ')}`);
  }
}

// Recommendations
console.log('\n\n💡 RECOMMENDATIONS:\n');
console.log('='.repeat(80));

const allSubjectsMissing: Set<string> = new Set();
Object.values(results).forEach(r => r.missing.forEach(m => allSubjectsMissing.add(m)));

if (allSubjectsMissing.size === 0) {
  console.log('✅ All subjects have complete script coverage!');
  console.log('\nNext steps:');
  console.log('  1. Run question type analysis for each subject');
  console.log('  2. Run iterative calibration for each subject');
  console.log('  3. Generate flagship papers for testing');
} else {
  console.log('⚠️  Some scripts are missing. Priority actions:\n');

  // Group by script type
  const missingByType: Record<string, string[]> = {};

  Object.entries(results).forEach(([subject, stats]) => {
    stats.missing.forEach(script => {
      if (!missingByType[script]) {
        missingByType[script] = [];
      }
      missingByType[script].push(subject);
    });
  });

  Object.entries(missingByType).forEach(([script, subjects]) => {
    console.log(`\n  Create ${script} for: ${subjects.join(', ')}`);

    // Get the base script name (physics version) to copy from
    const baseScript = script.replace('chemistry', 'physics').replace('botany', 'physics').replace('zoology', 'physics');
    console.log(`  Template: scripts/oracle/${baseScript}`);
  });
}

console.log('\n' + '='.repeat(80) + '\n');
