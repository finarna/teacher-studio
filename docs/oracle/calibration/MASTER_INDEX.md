# KCET Math Calibration System - Master Index

**Version:** 1.0
**Last Updated:** 2026-04-14
**Status:** ✅ **PRODUCTION READY** - All parameters deployed

---

## 🎯 Quick Summary

**Achievement:** Identity Hit Rate of **79.2%** (0.8% from 80% target!)

The KCET Math calibration system successfully learned from 2021-2025 actual papers and optimized REI parameters to predict which math concepts will appear in future exams with near-80% accuracy.

**All calibrated parameters are now ACTIVE in production and ready for 2026 flagship paper generation.**

---

## 📂 Directory Structure

```
docs/oracle/calibration/
│
├── MASTER_INDEX.md                    ⭐ YOU ARE HERE - Start here!
├── README.md                          📖 Quick start guide
│
├── scripts/                           🔧 Core TypeScript scripts
│   ├── INDEX.md                       📋 Scripts guide
│   ├── questionComparator.ts          (Multi-dimensional comparison engine)
│   ├── parameterAdjuster.ts           (Adaptive RWC calibration algorithm)
│   ├── calibrationReporter.ts         (Report generation)
│   └── kcet_math_iterative_calibration_2021_2025.ts (Main orchestrator)
│
├── reports/                           📊 Generated calibration reports
│   ├── INDEX.md                       📋 Reports guide
│   ├── KCET_MATH_CALIBRATION_REPORT_2021_2025.md (Main summary)
│   ├── KCET_MATH_2022_ITERATION_LOG.md (Year 2022 details)
│   ├── KCET_MATH_2023_ITERATION_LOG.md (Year 2023 details)
│   ├── KCET_MATH_2024_ITERATION_LOG.md (Year 2024 details)
│   └── KCET_MATH_2025_ITERATION_LOG.md (Year 2025 details)
│
├── configs/                           ⚙️ Calibrated parameters
│   ├── INDEX.md                       📋 Configs guide
│   ├── engine_config_calibrated.json  ⭐ PRIMARY CONFIG (ready for use)
│   ├── engine_config_production_current.json (currently deployed)
│   ├── engine_config_pre_calibration_backup.json (backup)
│   └── kcet_math_identities_calibrated.json ⭐ PRIMARY IDENTITY BANK
│
└── documentation/                     📚 Complete documentation
    ├── INDEX.md                       📋 Documentation guide
    ├── SYSTEM_DOCUMENTATION.md        ⭐ Complete technical guide
    ├── EXECUTION_SUMMARY_2026-04-14.md ⭐ Detailed execution log
    ├── FILES_INDEX.md                 📋 Complete file inventory
    └── DEPLOYMENT_VERIFICATION.md     ✅ Deployment checklist
```

**Total:** 24 files | ~391 KB

---

## 🚀 Where to Start

### I am a...

#### **New Team Member** (Onboarding)
1. **Start:** Read `documentation/EXECUTION_SUMMARY_2026-04-14.md` (What was achieved)
2. **Then:** Read `documentation/SYSTEM_DOCUMENTATION.md` (How it works)
3. **Reference:** `documentation/FILES_INDEX.md` (Where things are)

#### **Developer** (Technical Deep Dive)
1. **Start:** Read `documentation/SYSTEM_DOCUMENTATION.md` (Complete technical details)
2. **Then:** Read `scripts/INDEX.md` (How to use scripts)
3. **Reference:** `documentation/EXECUTION_SUMMARY_2026-04-14.md` (Lessons learned)

#### **Project Manager** (High-Level Overview)
1. **Start:** Read `reports/KCET_MATH_CALIBRATION_REPORT_2021_2025.md` (Summary)
2. **Then:** Read `documentation/DEPLOYMENT_VERIFICATION.md` (What's deployed)
3. **Reference:** This file (MASTER_INDEX.md) for navigation

#### **QA/Testing** (Verification)
1. **Start:** Read `documentation/DEPLOYMENT_VERIFICATION.md` (Verification checklist)
2. **Then:** Check `configs/INDEX.md` (What's deployed)
3. **Run:** Verification commands in deployment doc

#### **Data Scientist** (Understanding Results)
1. **Start:** Read `reports/KCET_MATH_CALIBRATION_REPORT_2021_2025.md` (Overall metrics)
2. **Then:** Read each year's iteration log in `reports/`
3. **Analyze:** `documentation/EXECUTION_SUMMARY_2026-04-14.md` (Detailed analysis)

---

## 📋 What Each Directory Contains

### 📁 scripts/ - Core TypeScript Scripts

**Purpose:** The actual code that performs calibration

**What's inside:**
- `questionComparator.ts` - Compares generated vs actual papers (multi-dimensional scoring)
- `parameterAdjuster.ts` - Adjusts REI parameters adaptively (RWC algorithm)
- `calibrationReporter.ts` - Generates markdown reports
- `kcet_math_iterative_calibration_2021_2025.ts` - Main orchestrator script

**When to use:**
- Running full calibration: `npx tsx scripts/kcet_math_iterative_calibration_2021_2025.ts`
- Importing components for custom scripts
- Modifying calibration logic

**Read:** `scripts/INDEX.md` for detailed usage guide

---

### 📁 reports/ - Generated Calibration Reports

**Purpose:** Results and analysis from the calibration run

**What's inside:**
- `KCET_MATH_CALIBRATION_REPORT_2021_2025.md` - Main summary (all years)
- `KCET_MATH_2022_ITERATION_LOG.md` - Year 2022 details (3 iterations)
- `KCET_MATH_2023_ITERATION_LOG.md` - Year 2023 details (2 iterations)
- `KCET_MATH_2024_ITERATION_LOG.md` - Year 2024 details (1 iteration)
- `KCET_MATH_2025_ITERATION_LOG.md` - Year 2025 details (1 iteration)

**When to read:**
- See overall results: Main calibration report
- Understand year-specific details: Individual iteration logs
- Review high-yield identities: Main calibration report
- Analyze parameter changes: Individual iteration logs

**Read:** `reports/INDEX.md` for quick reference guide

---

### 📁 configs/ - Calibrated Parameters

**Purpose:** Production-ready configurations

**What's inside:**
- `engine_config_calibrated.json` ⭐ **USE THIS** for deployment
- `engine_config_production_current.json` - Currently deployed config
- `engine_config_pre_calibration_backup.json` - Backup for rollback
- `kcet_math_identities_calibrated.json` ⭐ **USE THIS** for identity bank

**When to use:**
- Deploying to production: Copy calibrated files to `lib/oracle/`
- Verifying deployment: Compare with current production files
- Rolling back: Use backup files if needed

**Status:** ✅ Already deployed (2026-04-14)

**Read:** `configs/INDEX.md` for deployment instructions

---

### 📁 documentation/ - Complete Documentation

**Purpose:** Technical guides, execution logs, and reference docs

**What's inside:**
- `SYSTEM_DOCUMENTATION.md` ⭐ **Complete technical guide** (~50 KB)
- `EXECUTION_SUMMARY_2026-04-14.md` ⭐ **Detailed execution log** (~40 KB)
- `FILES_INDEX.md` - Complete file inventory (~25 KB)
- `DEPLOYMENT_VERIFICATION.md` - Deployment checklist (~15 KB)

**When to read:**
- Understand system architecture: SYSTEM_DOCUMENTATION.md
- See what happened during calibration: EXECUTION_SUMMARY_2026-04-14.md
- Find a specific file: FILES_INDEX.md
- Verify deployment: DEPLOYMENT_VERIFICATION.md

**Read:** `documentation/INDEX.md` for reading order recommendations

---

## 🎯 Key Achievements

### Identity Hit Rate: 79.2% 🎯
- **What it means:** System can predict which math concepts will appear with 79.2% accuracy
- **How it improved:** 58.3% (2022) → 62.5% (2023) → 70.8% (2024) → 79.2% (2025)
- **Target:** 80% (just 0.8% away!)

### System Confidence: 66.4%
- **What it means:** Overall confidence in predictions (fair confidence level)
- **Limiting factor:** Topic accuracy at 50%

### Total Iterations: 7
- **What it means:** Very efficient calibration (avg 1.8 iterations per year)
- **Trend:** Faster convergence over time (3 → 2 → 1 → 1 iterations)

### 15 High-Confidence Identities
- **What it means:** 15 math concepts identified as high-yield for 2026
- **Confidence level:** ≥75% (13 at 99%, 1 at 94%, 1 at 85%)

---

## 📊 Quick Metrics Reference

| Metric | Value | Status |
|--------|-------|--------|
| **Identity Hit Rate (2025)** | 79.2% | 🎯 0.8% from target |
| **Average Match Rate** | 62.7% | ⚠️ Below 80% target |
| **System Confidence** | 66.4% | ⚠️ Fair |
| **Total Iterations** | 7 | ✅ Efficient |
| **Avg Iterations/Year** | 1.8 | ✅ Fast convergence |
| **High-Confidence Identities** | 15 | ✅ Ready for 2026 |

### Year-by-Year Progression

| Year | IHR | Match Rate | Iterations |
|------|-----|------------|------------|
| 2022 | 58.3% | 58.8% | 3 |
| 2023 | 62.5% | 60.1% | 2 |
| 2024 | 70.8% | 66.8% | 1 |
| 2025 | **79.2%** | 66.6% | 1 |

**Total IHR Improvement:** +20.9% over 4 years

---

## 🔧 Common Tasks

### Run Full Calibration (After KCET 2026)

```bash
# Navigate to project root
cd /Users/apple/FinArna/edujourney---universal-teacher-studio

# Run calibration
npx tsx docs/oracle/calibration/scripts/kcet_math_iterative_calibration_2021_2025.ts
```

**Runtime:** ~20-30 minutes
**Output:** 6 reports + updated configs

---

### Deploy Calibrated Parameters (Already Done!)

```bash
# Engine config (ALREADY DEPLOYED)
cp docs/oracle/calibration/configs/engine_config_calibrated.json lib/oracle/engine_config.json

# Identity bank (ALREADY DEPLOYED during calibration)
# lib/oracle/identities/kcet_math.json already has calibrated confidences
```

---

### Verify Deployment

```bash
# Check engine config
cat lib/oracle/engine_config.json | jq .

# Check identity confidences (should show 15 at ≥75%)
cat lib/oracle/identities/kcet_math.json | jq -r '.identities[] | "\(.id): \(.confidence)"' | grep -E "(0\.[89]|0\.99)"
```

---

### Generate 2026 Flagship Papers

```bash
# Using calibrated parameters (now active)
npx tsx scripts/oracle/generate_2026_flagship_math.ts

# Or using REI master orchestrator
npx tsx scripts/oracle/rei_master_orchestrator.ts --subject math --year 2026
```

---

## 📚 Documentation Reading Guide

### For Quick Overview
**Read:** `reports/KCET_MATH_CALIBRATION_REPORT_2021_2025.md` (10 minutes)

### For Technical Understanding
**Read:** `documentation/SYSTEM_DOCUMENTATION.md` (30-45 minutes)

### For Execution Details
**Read:** `documentation/EXECUTION_SUMMARY_2026-04-14.md` (20-30 minutes)

### For File Navigation
**Read:** `documentation/FILES_INDEX.md` (10 minutes)

### For Deployment Verification
**Read:** `documentation/DEPLOYMENT_VERIFICATION.md` (10 minutes)

---

## 🔍 Finding Specific Information

### "Where can I find..."

**Overall calibration results?**
→ `reports/KCET_MATH_CALIBRATION_REPORT_2021_2025.md`

**Which identities are high-yield for 2026?**
→ `reports/KCET_MATH_CALIBRATION_REPORT_2021_2025.md` → "Top 10 High-Confidence Identities"
→ OR `configs/INDEX.md` → "Top 15 High-Confidence Identities"

**How the comparison algorithm works?**
→ `documentation/SYSTEM_DOCUMENTATION.md` → "Calibration Algorithm"

**What changed in Year 2024?**
→ `reports/KCET_MATH_2024_ITERATION_LOG.md`

**How to run calibration?**
→ `scripts/INDEX.md` → "Usage Instructions"
→ OR `documentation/SYSTEM_DOCUMENTATION.md` → "Usage Guide"

**What parameters were deployed?**
→ `documentation/DEPLOYMENT_VERIFICATION.md` → "Deployment Summary"

**Why identity assignment fix was critical?**
→ `documentation/EXECUTION_SUMMARY_2026-04-14.md` → "Identity Assignment Fix"

**Final calibrated engine config?**
→ `configs/engine_config_calibrated.json`

**All 30 identity confidences?**
→ `configs/kcet_math_identities_calibrated.json`

---

## ⚠️ Important Notes

### Files Are Organized Into Categories

**DO NOT** look for reports in `scripts/` or configs in `reports/`. Each directory has a specific purpose:

- **Scripts** → Code that runs calibration
- **Reports** → Results from calibration runs
- **Configs** → Parameters ready for deployment
- **Documentation** → Guides and reference docs

### Index Files Guide Each Directory

Each directory has an `INDEX.md` file that explains:
- What files are in that directory
- What each file does
- When to use each file
- How to use the files

**Always read the INDEX.md first when entering a new directory!**

### Production Files vs Reference Files

**Production Files (ACTIVE):**
- `lib/oracle/engine_config.json`
- `lib/oracle/identities/kcet_math.json`

**Reference Files (COPIES):**
- Everything in `docs/oracle/calibration/configs/`

The files in `configs/` are copies for reference, backup, and deployment purposes.

---

## 🎊 Status Summary

**Calibration:** ✅ Complete (2026-04-14)
**Deployment:** ✅ Deployed to Production (2026-04-14)
**Documentation:** ✅ Complete (24 files)
**Scripts:** ✅ Ready for reuse
**Reports:** ✅ Generated and saved
**Configs:** ✅ Backed up and deployed

**System is production-ready for 2026 KCET Math flagship paper generation!**

---

## 📞 Support & Questions

### Need help with...

**Understanding results:** Read `reports/KCET_MATH_CALIBRATION_REPORT_2021_2025.md`

**Running calibration:** Read `scripts/INDEX.md` or `documentation/SYSTEM_DOCUMENTATION.md`

**Deploying configs:** Read `configs/INDEX.md` or `documentation/DEPLOYMENT_VERIFICATION.md`

**Finding a file:** Read `documentation/FILES_INDEX.md`

**Technical details:** Read `documentation/SYSTEM_DOCUMENTATION.md`

---

**Master Index Version:** 1.0
**Last Updated:** 2026-04-14
**Maintained By:** REI Calibration Team
**Status:** ✅ Complete & Organized
