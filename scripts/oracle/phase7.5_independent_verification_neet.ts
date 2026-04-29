import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const VALID_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

interface VerificationTask {
  subject: string;
  scanId: string;
  verificationReportPath: string;
  acceptanceReportPath: string;
  phase7ReportPath: string;
}

async function launchIndependentVerification(subject: string, scanId: string) {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log(`║   PHASE 7.5: INDEPENDENT FORENSIC VERIFICATION - NEET ${subject.padEnd(9)}   ║`);
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  const subjectUpper = subject.toUpperCase();

  // Define file paths
  const verificationDir = path.join(process.cwd(), 'docs/oracle/verification');
  if (!fs.existsSync(verificationDir)) {
    fs.mkdirSync(verificationDir, { recursive: true });
  }

  const phase7ReportPath = path.join(verificationDir, `NEET_${subjectUpper}_PHASE7_VERIFICATION.txt`);
  const acceptanceReportPath = path.join(
    process.cwd(),
    `docs/oracle/calibration/NEET_${subjectUpper}_FLAGSHIP_FINAL_ACCEPTANCE.md`
  );

  // Check if Phase 7 report exists
  if (!fs.existsSync(phase7ReportPath)) {
    console.error(`❌ Phase 7 report not found: ${phase7ReportPath}`);
    console.error('   Please run Phase 7 verification first:');
    console.error(`   npx tsx scripts/oracle/phase7_quality_verification_neet.ts ${subject} ${scanId}`);
    return;
  }

  console.log('📋 STEP 7.5.1: Preparing Independent Verification\n');
  console.log(`   Subject: NEET ${subject}`);
  console.log(`   Scan ID: ${scanId}`);
  console.log(`   Phase 7 Report: ${phase7ReportPath}`);

  if (fs.existsSync(acceptanceReportPath)) {
    console.log(`   Acceptance Report: ${acceptanceReportPath}`);
  }

  // Create verification prompt
  const verificationPrompt = `You are an independent quality auditor reviewing NEET ${subject} 2026 flagship predictions.

**TASK:** Perform independent forensic verification of the Phase 7 quality verification results.

**FILES TO READ:**
1. \`${phase7ReportPath}\` - Phase 7 verification report
${fs.existsSync(acceptanceReportPath) ? `2. \`${acceptanceReportPath}\` - Acceptance report\n` : ''}

**VERIFICATION CHECKLIST:**

**TASK 1: VERIFY QUESTION COUNTS**
- Count total questions claimed in reports
- Verify SET A count = 45
- Verify SET B count = 45
- Verify total = 90
- Flag any discrepancies

**TASK 2: VERIFY DIFFICULTY DISTRIBUTION**
- Extract claimed Easy/Moderate/Hard counts and percentages
- Verify percentages add to 100%
- Check variance vs calibration target
- Confirm max variance ≤ 10%
- Flag if variance > 15%

**TASK 3: VERIFY CONTENT COMPLETENESS**
- Check claimed completeness percentage
- Verify all 7 fields are reported (text, options, answer, solution, tip, difficulty, topic)
- Confirm ≥95% completeness or flag missing content
- Check if all fields show 100%

**TASK 4: VERIFY STRATEGIC DIFFERENTIATION (if applicable)**
- Extract SET A formula bias score (should be positive for formula-heavy)
- Extract SET B conceptual bias score (ideally positive for concept-heavy)
- Verify SET A has formula emphasis
- Check if meaningful differentiation exists between sets
- Note: For Physics/Chemistry, SET B may still be formula-heavy (acceptable)

**TASK 5: CROSS-REFERENCE REPORTS**
- Compare numbers across all available reports
- Verify scan ID is consistent
- Check calibration parameters match (IDS, Rigor, Difficulty targets)
- Flag any inconsistencies or contradictions

**TASK 6: VERIFY QUESTION TYPE DISTRIBUTION (CRITICAL for NEET)**
- Check board signature accuracy
- Verify simple_recall_mcq and diagram_based_mcq percentages
- Note any missing question types (calculation, match_following, etc.)
- Assess if type distribution is acceptable given board signature

**TASK 7: IDENTIFY BORDERLINE CASES**
- Questions or metrics near acceptability thresholds
- Any warnings flagged in Phase 7 report
- Difficulty percentages close to variance limits
- Content completeness below 100%
- Weak strategic differentiation

**TASK 8: CALCULATE CONFIDENCE SCORE**
Based on your verification:
- 100: Perfect, all checks pass, no warnings
- 90-99: Excellent, minor warnings only
- 80-89: Good, acceptable with documented limitations
- 70-79: Acceptable, needs review before production
- <70: Needs improvement, consider regeneration

**TASK 9: PRODUCTION READINESS DECISION**
- APPROVED: Ready for deployment
- APPROVED_WITH_CONDITIONS: Ready but requires monitoring
- NEEDS_REVIEW: Manual review required before approval
- REJECTED: Regeneration recommended

**OUTPUT:**
Create a detailed verification report at:
\`docs/oracle/verification/NEET_${subjectUpper}_AGENT_VERIFICATION.md\`

Include:
1. Executive Summary (status, confidence score, decision)
2. All counts verified (✅ or ❌)
3. Difficulty distribution analysis
4. Content completeness analysis
5. Strategic differentiation assessment
6. Any discrepancies found
7. List of borderline cases for human review
8. Cross-reference consistency check
9. Overall verification status (PASS/FAIL/PARTIAL)
10. Confidence score (0-100) with justification
11. Production decision with reasoning
12. Recommendations for Phase 8 or improvements needed

Be thorough, objective, and flag any inconsistencies. If numbers don't add up, investigate why.`;

  console.log('\n🤖 STEP 7.5.2: Launching Independent Verification Agent\n');
  console.log('   Agent Type: general-purpose');
  console.log('   Mode: Autonomous verification');
  console.log('   Expected Duration: 2-5 minutes\n');

  // Write prompt to temporary file for agent
  const promptPath = `/tmp/neet_${subject.toLowerCase()}_verification_prompt.txt`;
  fs.writeFileSync(promptPath, verificationPrompt);

  console.log(`   Verification prompt saved: ${promptPath}`);
  console.log('   Launching agent...\n');

  // Use claude-code CLI to launch verification agent
  const agentCommand = `claude-code task --subagent-type general-purpose --description "Phase 7.5 verification NEET ${subject}" --prompt "${verificationPrompt.replace(/"/g, '\\"')}"`;

  console.log('   💡 To manually launch the verification agent, run:');
  console.log(`   ${agentCommand}\n`);

  console.log('📊 STEP 7.5.3: Agent Verification Instructions\n');
  console.log('   The agent will:');
  console.log('   1. Read all Phase 7 reports');
  console.log('   2. Verify all claimed metrics');
  console.log('   3. Cross-reference numbers across reports');
  console.log('   4. Identify inconsistencies or warnings');
  console.log('   5. Calculate confidence score');
  console.log('   6. Make production readiness decision');
  console.log('   7. Generate detailed verification report\n');

  console.log('📝 Expected Output:\n');
  console.log(`   Report: docs/oracle/verification/NEET_${subjectUpper}_AGENT_VERIFICATION.md`);
  console.log('   Contents:');
  console.log('   - Executive Summary');
  console.log('   - Detailed Verification Results');
  console.log('   - Borderline Cases');
  console.log('   - Confidence Score (0-100)');
  console.log('   - Production Decision\n');

  console.log('⏳ STEP 7.5.4: Waiting for Agent Completion\n');
  console.log('   Note: This is a manual step. Please:');
  console.log('   1. Launch the verification agent using Task tool or CLI');
  console.log('   2. Wait for agent to complete (2-5 minutes)');
  console.log(`   3. Review generated report: NEET_${subjectUpper}_AGENT_VERIFICATION.md`);
  console.log('   4. Verify confidence score ≥ 70 for production readiness\n');

  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                  PHASE 7.5 SETUP COMPLETE                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log(`   Subject: NEET ${subject}`);
  console.log('   Status: Ready for agent verification');
  console.log(`   Next: Launch verification agent with prompt at ${promptPath}\n`);

  console.log('📋 Quick Reference:\n');
  console.log('   After agent completes, check:');
  console.log(`   cat docs/oracle/verification/NEET_${subjectUpper}_AGENT_VERIFICATION.md\n`);
  console.log('   Look for:');
  console.log('   - Overall Status: PASS/FAIL');
  console.log('   - Confidence Score: ≥70 required');
  console.log('   - Production Decision: APPROVED/NEEDS_REVIEW/REJECTED\n');
}

// ========================================================================
// MAIN EXECUTION
// ========================================================================
const subject = process.argv[2];
const scanId = process.argv[3];

if (!subject || !VALID_SUBJECTS.includes(subject)) {
  console.error('❌ Invalid subject. Usage:');
  console.error('   npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts <Subject> <ScanID>');
  console.error('');
  console.error('Valid subjects: Physics, Chemistry, Botany, Zoology');
  console.error('');
  console.error('Examples:');
  console.error('   npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts Physics 2adcb415-9410-4468-b8f3-32206e5ae7cb');
  console.error('   npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts Chemistry <scan-id>');
  console.error('');
  console.error('Note: This script prepares for Phase 7.5. You must then launch the verification agent.');
  process.exit(1);
}

if (!scanId) {
  console.error('❌ Scan ID required.');
  console.error('   Check: docs/oracle/calibration/NEET_<SUBJECT>_SCAN_ID_REGISTRY.md');
  process.exit(1);
}

launchIndependentVerification(subject, scanId).catch(console.error);
