# Calibration Documentation

**Purpose:** Comprehensive guides, technical documentation, and execution logs

**Location:** `docs/oracle/calibration/documentation/`

---

## Files in This Directory

### 1. SYSTEM_DOCUMENTATION.md ⭐ COMPLETE TECHNICAL GUIDE
**Type:** Complete Technical Documentation
**Size:** ~50 KB
**Purpose:** Full system documentation for developers and technical users

**What's inside:**
1. **System Overview** - Purpose, key achievements, problem solved
2. **Architecture** - System components, technology stack
3. **Core Components** - Detailed breakdown of all 4 scripts
4. **Calibration Algorithm** - Formulas, learning rates, constraints
5. **Data Flow** - Input sources, output files
6. **Usage Guide** - Commands, configuration, deployment
7. **Output Files** - Descriptions of all generated files
8. **Troubleshooting** - Common issues and solutions
9. **Future Enhancements** - Roadmap and planned improvements

**When to read:**
- ✅ **Onboarding new developers** to the calibration system
- ✅ **Understanding how the system works** in depth
- ✅ **Modifying or extending** the calibration logic
- ✅ **Debugging issues** with calibration
- ✅ **Planning future enhancements**

**Key Sections:**
- Multi-dimensional scoring formulas
- RWC parameter adjustment algorithm
- Identity assignment fix (critical)
- Database schema reference
- API dependencies

**Audience:** Developers, Technical Teams

---

### 2. EXECUTION_SUMMARY_2026-04-14.md ⭐ DETAILED EXECUTION LOG
**Type:** Execution Log & Post-Mortem
**Size:** ~40 KB
**Purpose:** Detailed log of the calibration run with analysis and lessons learned

**What's inside:**
1. **Executive Summary** - Mission objective and primary achievement
2. **Execution Timeline** - All 3 attempts (2 failed, 1 success)
3. **Detailed Results by Year** - Full metrics for 2022-2025
4. **Overall Metrics** - Aggregate statistics and IHR progression
5. **Parameter Evolution** - How parameters changed over years
6. **Identity Assignment Fix** - Before/after analysis of critical fix
7. **Output Files Generated** - Complete list with sizes
8. **Technical Performance** - Resource usage, efficiency metrics
9. **Analysis & Insights** - Why IHR reached 79.2% but match rate 66.6%
10. **Validation & Confidence** - System confidence calculation
11. **Recommendations** - Immediate and long-term next steps
12. **Lessons Learned** - Technical and process lessons

**When to read:**
- ✅ **Understanding what happened** during calibration
- ✅ **Learning from the execution** (successes and failures)
- ✅ **Seeing the full timeline** including failed attempts
- ✅ **Understanding critical fixes** (identity assignment)
- ✅ **Planning next calibration run** (post-2026 exam)

**Key Sections:**
- Why first 2 attempts failed (0% IHR, OOM crash)
- How identity assignment fix solved the problem
- Why IHR improved from 58.3% to 79.2%
- Why match rate stayed at ~67% despite high IHR
- Bottleneck analysis (topic accuracy at 50%)

**Audience:** Technical Teams, Project Managers, Post-Execution Review

---

### 3. FILES_INDEX.md 📋 COMPLETE FILE INVENTORY
**Type:** File Inventory & Reference Guide
**Size:** ~25 KB
**Purpose:** Complete index of all calibration files with descriptions

**What's inside:**
1. **Directory Structure** - Visual tree of all files
2. **Core Components** - Detailed descriptions of 4 scripts
3. **Data Files** - Identity bank, engine config
4. **Documentation Files** - All docs with purposes
5. **Report Files** - All 5 reports with summaries
6. **Modified Supporting Files** - AI paper auditor changes
7. **Database Schema** - Reference for Supabase tables
8. **Usage Commands** - How to run scripts
9. **Dependencies** - Runtime and dev dependencies
10. **Metrics Summary** - File statistics
11. **Quick File Finder** - "Need to..." guide
12. **Version History** - Changelog

**When to read:**
- ✅ **Finding a specific file** quickly
- ✅ **Understanding what each file does**
- ✅ **Seeing the complete inventory** of files
- ✅ **Checking file sizes and statistics**

**Key Sections:**
- Quick file finder ("I want to see...")
- File statistics (16 files, ~261 KB)
- Usage commands for each file type

**Audience:** All Users (Quick Reference)

---

### 4. DEPLOYMENT_VERIFICATION.md ✅ DEPLOYMENT CHECKLIST
**Type:** Deployment Guide & Verification
**Size:** ~15 KB
**Purpose:** Verify calibrated parameters are deployed correctly

**What's inside:**
1. **Deployment Summary** - What was deployed
2. **Deployed Components** - Engine config and identity bank
3. **Calibration Metrics Achieved** - Final performance numbers
4. **Impact on Flagship Generation** - Before/after comparison
5. **Verification Checklist** - Step-by-step verification
6. **Next Steps** - How to use deployed parameters
7. **Rollback Instructions** - How to revert if needed

**When to read:**
- ✅ **After deploying** calibrated parameters
- ✅ **Verifying deployment** succeeded
- ✅ **Understanding impact** on flagship generation
- ✅ **Planning rollback** (if needed)

**Key Sections:**
- Parameter change table (before/after)
- Top 15 high-confidence identities
- Deployment verification commands
- Expected improvements in flagship papers

**Audience:** DevOps, Deployment Teams, QA

---

## Quick Reference Guide

### "I want to..."

**Understand how the calibration system works:**
→ Read: `SYSTEM_DOCUMENTATION.md`

**See what happened during the calibration run:**
→ Read: `EXECUTION_SUMMARY_2026-04-14.md`

**Find a specific file:**
→ Read: `FILES_INDEX.md`

**Verify deployment succeeded:**
→ Read: `DEPLOYMENT_VERIFICATION.md`

**Learn the multi-dimensional scoring formula:**
→ Read: `SYSTEM_DOCUMENTATION.md` → "Calibration Algorithm" section

**Understand why identity assignment fix was critical:**
→ Read: `EXECUTION_SUMMARY_2026-04-14.md` → "Identity Assignment Fix" section

**See all files and their purposes:**
→ Read: `FILES_INDEX.md` → "Directory Structure"

**Know which identities are high-yield:**
→ Read: `DEPLOYMENT_VERIFICATION.md` → "Top 15 High-Confidence Identities"

---

## Reading Order Recommendations

### For New Team Members (Onboarding)
1. Start with: `EXECUTION_SUMMARY_2026-04-14.md` (understand what was achieved)
2. Then read: `SYSTEM_DOCUMENTATION.md` (understand how it works)
3. Reference: `FILES_INDEX.md` (know where things are)
4. Check: `DEPLOYMENT_VERIFICATION.md` (see current state)

### For Developers (Technical Deep Dive)
1. Start with: `SYSTEM_DOCUMENTATION.md` (full technical details)
2. Reference: `FILES_INDEX.md` (file locations)
3. Review: `EXECUTION_SUMMARY_2026-04-14.md` (lessons learned)

### For Project Managers (High-Level Overview)
1. Start with: `EXECUTION_SUMMARY_2026-04-14.md` → "Executive Summary"
2. Review: `DEPLOYMENT_VERIFICATION.md` → "Deployment Summary"
3. Reference: `FILES_INDEX.md` → "Metrics Summary"

### For QA/Testing (Verification)
1. Start with: `DEPLOYMENT_VERIFICATION.md`
2. Reference: `SYSTEM_DOCUMENTATION.md` → "Troubleshooting"

---

## Document Relationships

```
SYSTEM_DOCUMENTATION.md (How it works)
        ↓
EXECUTION_SUMMARY_2026-04-14.md (What happened)
        ↓
DEPLOYMENT_VERIFICATION.md (What's deployed)
        ↓
FILES_INDEX.md (Where everything is)
```

---

## Key Concepts Explained

### Identity Hit Rate (IHR) - 79.2%
- Measures: How accurately system predicts which identities will appear
- Formula: |Generated ∩ Actual| / |Generated ∪ Actual| (Jaccard similarity)
- Result: 79.2% means system can predict identity distribution with near-80% accuracy
- **Documented in:** SYSTEM_DOCUMENTATION.md, EXECUTION_SUMMARY_2026-04-14.md

### Match Rate - 66.6%
- Measures: Overall paper similarity (multi-dimensional)
- Formula: (IHR × 50%) + (Topic Acc × 30%) + (Diff Acc × 20%)
- Result: 66.6% reflects that topic accuracy (50%) is limiting factor
- **Documented in:** SYSTEM_DOCUMENTATION.md, EXECUTION_SUMMARY_2026-04-14.md

### RWC Algorithm
- Recursive Weight Correction - adaptive parameter adjustment
- Learning rates: +0.08, +0.12, -0.05, -0.02
- Constraints: Identity [0.35, 0.99], Rigor [1.0, 2.5]
- **Documented in:** SYSTEM_DOCUMENTATION.md

### Identity Assignment Fix
- Problem: Generated questions had no identity IDs → 0% IHR
- Solution: Assign IDs based on topic matching with confidence weighting
- Impact: 0% → 79.2% IHR improvement
- **Documented in:** EXECUTION_SUMMARY_2026-04-14.md, SYSTEM_DOCUMENTATION.md

---

## Version History

### v1.0 (2026-04-14)
- ✅ All documentation files created
- ✅ Complete calibration run documented
- ✅ Deployment verification completed
- ✅ Comprehensive file index created

---

**Category:** Documentation
**Total Files:** 4
**Total Size:** ~130 KB
**Status:** ✅ Complete
**Last Updated:** 2026-04-14
