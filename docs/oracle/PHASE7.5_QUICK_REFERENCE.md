# Phase 7.5: Independent Forensic Verification - Quick Reference

**Generic Script for All NEET Subjects**

---

## One-Command Setup

```bash
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts <Subject> <ScanID>
```

---

## Usage Examples

### NEET Physics ✅ COMPLETE
```bash
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts Physics 2adcb415-9410-4468-b8f3-32206e5ae7cb
```

### NEET Chemistry ⏳ PENDING
```bash
# After completing Phase 7 for Chemistry:
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts Chemistry <chemistry-scan-id>
```

### NEET Botany ⏳ PENDING
```bash
# After completing Phase 7 for Botany:
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts Botany <botany-scan-id>
```

### NEET Zoology ⏳ PENDING
```bash
# After completing Phase 7 for Zoology:
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts Zoology <zoology-scan-id>
```

---

## Prerequisites

Phase 7.5 can only run AFTER Phase 7 is complete:

1. ✅ Phase 7 verification script must have been executed
2. ✅ Phase 7 report must exist: `docs/oracle/verification/NEET_<SUBJECT>_PHASE7_VERIFICATION.txt`
3. ✅ All Phase 7 quality checks must have passed

---

## What Phase 7.5 Does

### Purpose: Independent Forensic Verification

Phase 7.5 launches an **independent AI agent** to verify all claims made in Phase 7 reports. This catches:
- Arithmetic errors in percentage calculations
- Inconsistencies across reports
- Borderline cases near quality thresholds
- Missing validations
- Overconfident claims

### 9-Task Verification Checklist

The agent performs these tasks autonomously:

1. **VERIFY QUESTION COUNTS**
   - Total questions = 90
   - SET A count = 45
   - SET B count = 45
   - Flag any discrepancies

2. **VERIFY DIFFICULTY DISTRIBUTION**
   - Extract Easy/Moderate/Hard percentages
   - Verify percentages add to 100%
   - Check variance vs calibration target
   - Confirm max variance ≤ 10%

3. **VERIFY CONTENT COMPLETENESS**
   - Check claimed completeness percentage
   - Verify all 7 fields reported (text, options, answer, solution, tip, difficulty, topic)
   - Confirm ≥95% completeness

4. **VERIFY STRATEGIC DIFFERENTIATION**
   - Extract SET A formula bias score
   - Extract SET B conceptual bias score
   - Verify meaningful differentiation exists

5. **CROSS-REFERENCE REPORTS**
   - Compare numbers across all available reports
   - Verify scan ID consistency
   - Check calibration parameters match

6. **VERIFY QUESTION TYPE DISTRIBUTION**
   - Check board signature accuracy
   - Verify question type percentages
   - Assess if distribution is acceptable

7. **IDENTIFY BORDERLINE CASES**
   - Metrics near thresholds
   - Any warnings in reports
   - Areas needing monitoring

8. **CALCULATE CONFIDENCE SCORE (0-100)**
   - 90-100: Excellent, production ready
   - 80-89: Good, acceptable with limitations
   - 70-79: Acceptable, needs review
   - <70: Needs improvement

9. **PRODUCTION DECISION**
   - APPROVED: Ready for deployment
   - APPROVED_WITH_CONDITIONS: Ready with monitoring
   - NEEDS_REVIEW: Manual review required
   - REJECTED: Regeneration recommended

---

## Expected Output

### Console Output

```
╔═══════════════════════════════════════════════════════════════════╗
║   PHASE 7.5: INDEPENDENT FORENSIC VERIFICATION - NEET <Subject>   ║
╚═══════════════════════════════════════════════════════════════════╝

📋 STEP 7.5.1: Preparing Independent Verification
   Subject: NEET <Subject>
   Scan ID: <scan-id>
   Phase 7 Report: docs/oracle/verification/NEET_<SUBJECT>_PHASE7_VERIFICATION.txt

🤖 STEP 7.5.2: Launching Independent Verification Agent
   Agent Type: general-purpose
   Mode: Autonomous verification
   Expected Duration: 2-5 minutes

📊 STEP 7.5.3: Agent Verification Instructions
   The agent will:
   1. Read all Phase 7 reports
   2. Verify all claimed metrics
   3. Cross-reference numbers across reports
   4. Identify inconsistencies or warnings
   5. Calculate confidence score
   6. Make production readiness decision
   7. Generate detailed verification report

📝 Expected Output:
   Report: docs/oracle/verification/NEET_<SUBJECT>_AGENT_VERIFICATION.md
```

### Agent Output File

**Location:** `docs/oracle/verification/NEET_<SUBJECT>_AGENT_VERIFICATION.md`

**Contents:**
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

---

## Agent Launch Methods

### Method 1: Using Task Tool (Recommended)

Within a Claude Code session, ask Claude to launch the verification agent with the generated prompt.

The Phase 7.5 script automatically creates the verification prompt and saves it to `/tmp/neet_<subject>_verification_prompt.txt`.

### Method 2: Using claude-code CLI

```bash
# The script will display the exact command to run
# Example output:
echo '<verification-prompt>' > /tmp/neet_physics_verification.txt
claude-code task --subagent-type general-purpose \
  --description "Phase 7.5 verification NEET Physics" \
  --prompt "$(cat /tmp/neet_physics_verification.txt)"
```

---

## Verification Thresholds

### Confidence Score Interpretation

| Score Range | Quality Level | Action Required |
|-------------|---------------|-----------------|
| 90-100 | Excellent | Deploy to production immediately |
| 80-89 | Good | Deploy with documented limitations |
| 70-79 | Acceptable | Manual review before deployment |
| 60-69 | Marginal | Consider regeneration |
| <60 | Poor | Regeneration required |

### Production Readiness Criteria

**APPROVED:**
- Confidence ≥ 80
- All critical checks passed
- No major discrepancies
- Content completeness ≥ 95%

**APPROVED_WITH_CONDITIONS:**
- Confidence 70-79
- Minor warnings present
- Borderline cases documented
- Requires monitoring in production

**NEEDS_REVIEW:**
- Confidence 60-69
- Some checks failed
- Significant warnings
- Human review required before deployment

**REJECTED:**
- Confidence < 60
- Critical checks failed
- Major discrepancies found
- Regeneration recommended

---

## Troubleshooting

### Error: "Phase 7 report not found"

**Cause:** Phase 7 hasn't been run yet

**Solution:**
```bash
# Run Phase 7 first
npx tsx scripts/oracle/phase7_quality_verification_neet.ts <Subject> <ScanID>

# Then run Phase 7.5
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts <Subject> <ScanID>
```

### Error: "Invalid subject"

**Solution:** Use exact capitalization: Physics, Chemistry, Botany, Zoology

### Agent Not Launching

**Solution:**
- Ensure you're in a Claude Code session with Task tool access
- Or use the claude-code CLI method shown in console output
- Check that the prompt file was created in `/tmp/`

### Low Confidence Score (<70)

**Possible Causes:**
- Question count mismatch
- Difficulty variance > 10%
- Content completeness < 95%
- Missing metadata
- Inconsistent reports

**Action:**
1. Review agent verification report for specific failures
2. Check Phase 7 report for warnings
3. Consider regenerating with stricter parameters
4. Verify database integrity

---

## NEET Physics Results (Reference)

### Phase 7.5 Completion Status: ✅ COMPLETE

**Confidence Score:** 89/100 (Good)

**Production Decision:** APPROVED

**Key Findings:**
- ✅ Question counts verified: 90 total (45+45 split)
- ✅ Difficulty distribution: 7% variance (within ±10%)
- ✅ Content completeness: 100% (all 7 fields)
- ✅ Strategic differentiation: Moderate (SET A formula bias +1.60)
- ⚠️ SET B still formula-heavy but acceptable for Physics
- ⚠️ Minor question type variance (calculation_mcq 0% vs 4% historical)

**Borderline Cases:**
- SET B conceptual emphasis (improved but still formula-heavy)
- Question type distribution (acceptable variance but flagged)

**Recommendation:** Deploy to production with documented limitations

**Report:** `docs/oracle/verification/NEET_PHYSICS_AGENT_VERIFICATION.md`

---

## Quick Command Reference

```bash
# STEP 1: Ensure Phase 7 is complete
cat docs/oracle/verification/NEET_<SUBJECT>_PHASE7_VERIFICATION.txt

# STEP 2: Run Phase 7.5 setup
npx tsx scripts/oracle/phase7.5_independent_verification_neet.ts <Subject> <ScanID>

# STEP 3: Launch verification agent (via Task tool or CLI)
# Follow instructions displayed in console output

# STEP 4: Review agent verification report
cat docs/oracle/verification/NEET_<SUBJECT>_AGENT_VERIFICATION.md

# STEP 5: Check confidence score and production decision
# Look for:
# - Overall Status: PASS/FAIL
# - Confidence Score: ≥70 required
# - Production Decision: APPROVED/NEEDS_REVIEW/REJECTED
```

---

## Integration with Workflow

### Phase Sequence

```
Phase 6: Generate Flagship Questions (90 total)
    ↓
Phase 7: Quality Verification (4 automated checks)
    ↓
Phase 7.5: Independent Forensic Verification (agent-based)
    ↓
Phase 8: UI Deployment (if approved)
```

### Decision Tree

```
Phase 7 Passes
    ↓
Phase 7.5 Agent Verification
    ↓
Confidence ≥ 80? → YES → Deploy to Phase 8
    ↓
Confidence 70-79? → YES → Manual Review → Deploy with conditions
    ↓
Confidence < 70? → YES → Review failures → Consider regeneration
```

---

## Time Estimates

- **Phase 7.5 Setup:** 30 seconds
- **Agent Execution:** 2-5 minutes
- **Report Review:** 5-10 minutes
- **Total Time:** 10-15 minutes per subject

---

## Files Created

### Scripts
- `scripts/oracle/phase7.5_independent_verification_neet.ts` - Main setup script
- `scripts/oracle/launch_phase7.5_agent_neet.sh` - Bash wrapper (optional)

### Output
- `docs/oracle/verification/NEET_<SUBJECT>_AGENT_VERIFICATION.md` - Agent report
- `/tmp/neet_<subject>_verification_prompt.txt` - Verification prompt

### Documentation
- `docs/oracle/PHASE7.5_QUICK_REFERENCE.md` - This file
- `docs/oracle/calibration/NEET_PHASE7.5_COMPLETION_REPORT.md` - Completion report

---

## Valid Subjects

- Physics
- Chemistry
- Botany
- Zoology

**Time to Execute:** 10-15 minutes per subject (including agent runtime)

---

**Last Updated:** April 29, 2026
**Status:** Production Ready
**Tested With:** NEET Physics 2026
**Confidence Score:** 89/100 (APPROVED)
