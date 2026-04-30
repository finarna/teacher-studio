#!/bin/bash

# Phase 7.5: Launch Independent Verification Agent for NEET Subjects
# Usage: ./scripts/oracle/launch_phase7.5_agent_neet.sh <Subject> <ScanID>

set -e

SUBJECT=$1
SCAN_ID=$2

if [ -z "$SUBJECT" ] || [ -z "$SCAN_ID" ]; then
    echo "❌ Usage: $0 <Subject> <ScanID>"
    echo ""
    echo "Valid subjects: Physics, Chemistry, Botany, Zoology"
    echo ""
    echo "Examples:"
    echo "  $0 Physics 2adcb415-9410-4468-b8f3-32206e5ae7cb"
    echo "  $0 Chemistry <chemistry-scan-id>"
    exit 1
fi

SUBJECT_UPPER=$(echo "$SUBJECT" | tr '[:lower:]' '[:upper:]')
VERIFICATION_DIR="docs/oracle/verification"
PHASE7_REPORT="${VERIFICATION_DIR}/NEET_${SUBJECT_UPPER}_PHASE7_VERIFICATION.txt"

# Check if Phase 7 report exists
if [ ! -f "$PHASE7_REPORT" ]; then
    echo "❌ Phase 7 report not found: $PHASE7_REPORT"
    echo "   Please run Phase 7 first:"
    echo "   npx tsx scripts/oracle/phase7_quality_verification_neet.ts $SUBJECT $SCAN_ID"
    exit 1
fi

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   PHASE 7.5: LAUNCHING INDEPENDENT VERIFICATION - NEET $SUBJECT"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Create verification prompt
PROMPT="You are an independent quality auditor reviewing NEET $SUBJECT 2026 flagship predictions.

**TASK:** Perform independent forensic verification of the Phase 7 quality verification results.

**FILES TO READ:**
1. \`$PHASE7_REPORT\` - Phase 7 verification report

**VERIFICATION CHECKLIST:**

**TASK 1: VERIFY QUESTION COUNTS**
- Count total questions claimed: should be 90
- Verify SET A count = 45
- Verify SET B count = 45
- Flag any discrepancies

**TASK 2: VERIFY DIFFICULTY DISTRIBUTION**
- Extract Easy/Moderate/Hard percentages
- Verify percentages add to 100%
- Check variance vs target
- Confirm max variance ≤ 10%

**TASK 3: VERIFY CONTENT COMPLETENESS**
- Check claimed completeness percentage
- Verify all 7 fields reported
- Confirm ≥95% completeness

**TASK 4: VERIFY STRATEGIC DIFFERENTIATION**
- Extract SET A formula bias
- Extract SET B conceptual bias
- Verify meaningful differentiation exists

**TASK 5: IDENTIFY BORDERLINE CASES**
- Metrics near thresholds
- Any warnings in reports
- Areas needing monitoring

**TASK 6: CALCULATE CONFIDENCE SCORE (0-100)**
- 90-100: Excellent, production ready
- 80-89: Good, acceptable with limitations
- 70-79: Acceptable, needs review
- <70: Needs improvement

**TASK 7: PRODUCTION DECISION**
- APPROVED: Ready for deployment
- APPROVED_WITH_CONDITIONS: Ready with monitoring
- NEEDS_REVIEW: Manual review required
- REJECTED: Regeneration recommended

**OUTPUT:**
Create detailed report at: \`docs/oracle/verification/NEET_${SUBJECT_UPPER}_AGENT_VERIFICATION.md\`

Include:
1. Executive Summary (status, confidence, decision)
2. All verification results (✅/❌)
3. Discrepancies found
4. Borderline cases
5. Confidence score with justification
6. Production decision with reasoning
7. Recommendations

Be thorough and flag any inconsistencies."

echo "📝 Verification Prompt Created"
echo "🤖 Launching Verification Agent..."
echo ""

# Note: This script provides the prompt. The actual agent launch happens via Task tool in the calling context.
# For command-line usage, use claude-code CLI:

echo "To launch the agent, use one of these methods:"
echo ""
echo "METHOD 1: Using Task tool (from within Claude Code session)"
echo "  Ask Claude to launch a verification agent with this prompt"
echo ""
echo "METHOD 2: Using claude-code CLI"
echo "  Save prompt to file and run:"
echo "  echo '$PROMPT' > /tmp/neet_${SUBJECT,,}_verification.txt"
echo "  claude-code task --subagent-type general-purpose \\"
echo "    --description 'Phase 7.5 verification NEET $SUBJECT' \\"
echo "    --prompt \"\$(cat /tmp/neet_${SUBJECT,,}_verification.txt)\""
echo ""
echo "Expected output: docs/oracle/verification/NEET_${SUBJECT_UPPER}_AGENT_VERIFICATION.md"
echo ""
echo "After agent completes, check:"
echo "  cat docs/oracle/verification/NEET_${SUBJECT_UPPER}_AGENT_VERIFICATION.md"
echo ""
