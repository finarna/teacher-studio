# NEET Folder Structure Refactoring Proposal

**Status:** 📋 PROPOSED - Not Yet Implemented
**Date Created:** April 30, 2026
**Purpose:** Clean organization of all NEET calibration code and documentation
**Priority:** Medium (can be done incrementally)

---

## Current Issues

### 1. Scripts Scattered
- ❌ 33+ NEET scripts mixed with KCET scripts in `scripts/oracle/`
- ❌ Hard to distinguish NEET vs KCET scripts
- ❌ Subject-specific scripts not grouped together

### 2. Documentation Mixed
- ❌ NEET docs mixed with KCET docs in `docs/oracle/calibration/`
- ❌ No clear NEET documentation hub
- ❌ Subject-specific reports scattered

### 3. JSON Exports Cluttered
- ❌ Flagship JSON files in project root
- ❌ No organization by exam type or subject
- ❌ Will get worse as more subjects are added

### 4. Identity Banks Not Organized
- ❌ All identity files flat in `lib/oracle/identities/`
- ❌ No separation by exam type

---

## Proposed Structure

```
project_root/
│
├── docs/oracle/
│   │
│   ├── neet/                                    ← NEW: NEET documentation hub
│   │   ├── README.md                            Main entry point, workflow overview
│   │   ├── WORKFLOW_TEMPLATE.md                 Reusable workflow guide
│   │   ├── SCRIPTS_GUIDE.md                     All scripts documentation
│   │   │
│   │   ├── physics/                             Physics-specific documentation
│   │   │   ├── calibration/
│   │   │   │   ├── REPORT_2021_2025.md
│   │   │   │   ├── identity_confidences.json
│   │   │   │   └── engine_config_calibrated.json
│   │   │   ├── reports/
│   │   │   │   ├── FLAGSHIP_MASTER_REPORT.md
│   │   │   │   ├── PHASE7_COMPLETION.md
│   │   │   │   ├── PHASE7.5_COMPLETION.md
│   │   │   │   └── PHASE8_UI_DEPLOYMENT.md
│   │   │   └── analysis/
│   │   │       ├── QUESTION_TYPE_ANALYSIS_2021_2025.json
│   │   │       └── SCAN_ID_REGISTRY.md
│   │   │
│   │   ├── chemistry/                           Chemistry structure (ready for use)
│   │   │   ├── calibration/
│   │   │   ├── reports/
│   │   │   └── analysis/
│   │   │
│   │   ├── botany/                              Botany structure (ready for use)
│   │   │   ├── calibration/
│   │   │   ├── reports/
│   │   │   └── analysis/
│   │   │
│   │   └── zoology/                             Zoology structure (ready for use)
│   │       ├── calibration/
│   │       ├── reports/
│   │       └── analysis/
│   │
│   └── kcet/                                    ← Keep existing KCET separate
│       └── calibration/
│           └── [existing KCET files]
│
├── scripts/oracle/
│   │
│   ├── neet/                                    ← NEW: NEET scripts hub
│   │   ├── README.md                            Scripts guide and quick reference
│   │   │
│   │   ├── shared/                              Shared scripts (all subjects)
│   │   │   ├── phase6_generate_flagship.ts
│   │   │   ├── phase7_quality_checks.ts
│   │   │   ├── phase7_quality_verification.ts
│   │   │   ├── phase7.5_independent_verification.ts
│   │   │   ├── find_all_scans_2021_2025.ts
│   │   │   ├── verify_scans_2021_2025.ts
│   │   │   ├── check_data.ts
│   │   │   ├── check_all_data.ts
│   │   │   └── verify_workflow_alignment.ts
│   │   │
│   │   ├── physics/                             Physics-specific scripts
│   │   │   ├── analyze_question_types_2021_2025.ts
│   │   │   ├── build_identities_2021_2025.ts
│   │   │   ├── iterative_calibration_2021_2025.ts
│   │   │   └── export_flagship.ts
│   │   │
│   │   ├── chemistry/                           Chemistry scripts
│   │   │   ├── analyze_question_types_2021_2025.ts
│   │   │   ├── build_identities_2021_2025.ts
│   │   │   ├── iterative_calibration_2021_2025.ts
│   │   │   └── export_flagship.ts
│   │   │
│   │   ├── botany/                              Botany scripts
│   │   │   ├── analyze_question_types_2021_2025.ts
│   │   │   ├── build_identities_2021_2025.ts
│   │   │   ├── iterative_calibration_2021_2025.ts
│   │   │   └── export_flagship.ts
│   │   │
│   │   └── zoology/                             Zoology scripts
│   │       ├── analyze_question_types_2021_2025.ts
│   │       ├── build_identities_2021_2025.ts
│   │       ├── iterative_calibration_2021_2025.ts
│   │       └── export_flagship.ts
│   │
│   └── kcet/                                    ← Keep existing KCET separate
│       └── [existing KCET scripts]
│
├── lib/oracle/identities/
│   ├── neet/                                    ← NEW: NEET identities
│   │   ├── physics.json                         (180 identities)
│   │   ├── chemistry.json                       (180 identities)
│   │   ├── botany.json                          (180 identities)
│   │   └── zoology.json                         (180 identities)
│   │
│   └── kcet/                                    ← Keep existing KCET separate
│       └── [existing KCET identity files]
│
└── flagship_exports/                            ← NEW: Clean exports directory
    ├── neet_2026/
    │   ├── physics/
    │   │   ├── set_a.json                       (45 questions)
    │   │   └── set_b.json                       (45 questions)
    │   ├── chemistry/
    │   │   ├── set_a.json
    │   │   └── set_b.json
    │   ├── botany/
    │   │   ├── set_a.json
    │   │   └── set_b.json
    │   └── zoology/
    │       ├── set_a.json
    │       └── set_b.json
    │
    └── kcet_2026/
        ├── mathematics/
        │   ├── set_a.json                       (60 questions)
        │   └── set_b.json                       (60 questions)
        ├── physics/
        ├── chemistry/
        └── biology/
```

---

## Benefits of Refactoring

### 1. Clear Separation
- ✅ NEET vs KCET clearly separated
- ✅ No confusion between exam types
- ✅ Easy to navigate for specific exam

### 2. Subject Organization
- ✅ All Physics files in one place
- ✅ All Chemistry files in one place
- ✅ Easy to replicate structure for new subjects

### 3. Scalability
- ✅ Easy to add new subjects (just create new folder)
- ✅ Each subject follows same pattern
- ✅ Can handle future exams (JEE, etc.)

### 4. Clean Project Root
- ✅ No JSON files cluttering root
- ✅ Professional organization
- ✅ Easy to find flagship exports

### 5. Developer Experience
- ✅ Know exactly where to find files
- ✅ Consistent naming conventions
- ✅ Easier onboarding for new developers

---

## Migration Plan

### Phase 1: Create New Directories (5 minutes)
```bash
# Documentation
mkdir -p docs/oracle/neet/{physics,chemistry,botany,zoology}/{calibration,reports,analysis}

# Scripts
mkdir -p scripts/oracle/neet/{shared,physics,chemistry,botany,zoology}

# Identities
mkdir -p lib/oracle/identities/neet

# Exports
mkdir -p flagship_exports/neet_2026/{physics,chemistry,botany,zoology}
```

### Phase 2: Move Documentation Files (10 minutes)

**NEET Physics Documentation:**
```bash
# Move workflow template
mv docs/oracle/calibration/NEET_SUBJECT_WORKFLOW_TEMPLATE.md \
   docs/oracle/neet/WORKFLOW_TEMPLATE.md

# Move scripts guide
mv scripts/oracle/NEET_SCRIPTS_README.md \
   docs/oracle/neet/SCRIPTS_GUIDE.md

# Move Physics calibration
mv docs/oracle/calibration/NEET_PHYSICS_CALIBRATION_REPORT_2021_2025.md \
   docs/oracle/neet/physics/calibration/REPORT_2021_2025.md

mv docs/oracle/calibration/identity_confidences_neet_physics.json \
   docs/oracle/neet/physics/calibration/identity_confidences.json

mv docs/oracle/calibration/engine_config_calibrated_neet_physics.json \
   docs/oracle/neet/physics/calibration/engine_config_calibrated.json

# Move Physics reports
mv docs/oracle/calibration/NEET_PHYSICS_2026_FLAGSHIP_MASTER_REPORT.md \
   docs/oracle/neet/physics/reports/FLAGSHIP_MASTER_REPORT.md

mv docs/oracle/calibration/NEET_PHASE7_COMPLETION_REPORT.md \
   docs/oracle/neet/physics/reports/PHASE7_COMPLETION.md

mv docs/oracle/calibration/NEET_PHASE7.5_COMPLETION_REPORT.md \
   docs/oracle/neet/physics/reports/PHASE7.5_COMPLETION.md

mv docs/oracle/calibration/NEET_PHYSICS_PHASE8_UI_DEPLOYMENT_REPORT.md \
   docs/oracle/neet/physics/reports/PHASE8_UI_DEPLOYMENT.md

# Move Physics analysis
mv docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_PHYSICS.json \
   docs/oracle/neet/physics/analysis/QUESTION_TYPE_ANALYSIS_2021_2025.json

mv docs/oracle/calibration/NEET_PHYSICS_SCAN_ID_REGISTRY.md \
   docs/oracle/neet/physics/analysis/SCAN_ID_REGISTRY.md
```

**Other Subjects (Ready for future):**
```bash
# Chemistry
mv docs/oracle/calibration/identity_confidences_neet_chemistry.json \
   docs/oracle/neet/chemistry/calibration/

mv docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_CHEMISTRY.json \
   docs/oracle/neet/chemistry/analysis/

# Botany
mv docs/oracle/calibration/identity_confidences_neet_botany.json \
   docs/oracle/neet/botany/calibration/

mv docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_BOTANY.json \
   docs/oracle/neet/botany/analysis/

# Zoology
mv docs/oracle/calibration/identity_confidences_neet_zoology.json \
   docs/oracle/neet/zoology/calibration/

mv docs/oracle/QUESTION_TYPE_ANALYSIS_2021_2025_ZOOLOGY.json \
   docs/oracle/neet/zoology/analysis/
```

### Phase 3: Move Script Files (15 minutes)

**Shared Scripts:**
```bash
mv scripts/oracle/phase_generate_flagship_neet.ts \
   scripts/oracle/neet/shared/phase6_generate_flagship.ts

mv scripts/oracle/phase7_quality_checks_neet.ts \
   scripts/oracle/neet/shared/phase7_quality_checks.ts

mv scripts/oracle/phase7_quality_verification_neet.ts \
   scripts/oracle/neet/shared/phase7_quality_verification.ts

mv scripts/oracle/phase7.5_independent_verification_neet.ts \
   scripts/oracle/neet/shared/phase7.5_independent_verification.ts

mv scripts/oracle/find_all_neet_scans_2021_2025.ts \
   scripts/oracle/neet/shared/find_all_scans_2021_2025.ts

mv scripts/oracle/verify_neet_scans_2021_2025.ts \
   scripts/oracle/neet/shared/verify_scans_2021_2025.ts

mv scripts/oracle/check_neet_data.ts \
   scripts/oracle/neet/shared/check_data.ts

mv scripts/oracle/check_all_neet_data.ts \
   scripts/oracle/neet/shared/check_all_data.ts

mv scripts/oracle/verify_neet_workflow_alignment.ts \
   scripts/oracle/neet/shared/verify_workflow_alignment.ts
```

**Physics Scripts:**
```bash
mv scripts/oracle/analyze_neet_physics_question_types_2021_2025.ts \
   scripts/oracle/neet/physics/analyze_question_types_2021_2025.ts

mv scripts/oracle/build_neet_physics_identities_2021_2025.ts \
   scripts/oracle/neet/physics/build_identities_2021_2025.ts

mv scripts/oracle/neet_physics_iterative_calibration_2021_2025.ts \
   scripts/oracle/neet/physics/iterative_calibration_2021_2025.ts

mv scripts/oracle/export_neet_physics_flagship.ts \
   scripts/oracle/neet/physics/export_flagship.ts
```

**Chemistry Scripts:**
```bash
mv scripts/oracle/analyze_neet_chemistry_question_types_2021_2025.ts \
   scripts/oracle/neet/chemistry/analyze_question_types_2021_2025.ts

mv scripts/oracle/build_neet_chemistry_identities_2021_2025.ts \
   scripts/oracle/neet/chemistry/build_identities_2021_2025.ts

mv scripts/oracle/neet_chemistry_iterative_calibration_2021_2025.ts \
   scripts/oracle/neet/chemistry/iterative_calibration_2021_2025.ts

# Create export script (template from physics)
cp scripts/oracle/neet/physics/export_flagship.ts \
   scripts/oracle/neet/chemistry/export_flagship.ts
```

**Botany Scripts:**
```bash
mv scripts/oracle/analyze_neet_botany_question_types_2021_2025.ts \
   scripts/oracle/neet/botany/analyze_question_types_2021_2025.ts

mv scripts/oracle/build_neet_botany_identities_2021_2025.ts \
   scripts/oracle/neet/botany/build_identities_2021_2025.ts

mv scripts/oracle/neet_botany_iterative_calibration_2021_2025.ts \
   scripts/oracle/neet/botany/iterative_calibration_2021_2025.ts
```

**Zoology Scripts:**
```bash
mv scripts/oracle/analyze_neet_zoology_question_types_2021_2025.ts \
   scripts/oracle/neet/zoology/analyze_question_types_2021_2025.ts

mv scripts/oracle/build_neet_zoology_identities_2021_2025.ts \
   scripts/oracle/neet/zoology/build_identities_2021_2025.ts

mv scripts/oracle/neet_zoology_iterative_calibration_2021_2025.ts \
   scripts/oracle/neet/zoology/iterative_calibration_2021_2025.ts
```

### Phase 4: Move Identity Banks (2 minutes)

```bash
mv lib/oracle/identities/neet_physics.json \
   lib/oracle/identities/neet/physics.json

mv lib/oracle/identities/neet_chemistry.json \
   lib/oracle/identities/neet/chemistry.json

mv lib/oracle/identities/neet_botany.json \
   lib/oracle/identities/neet/botany.json

mv lib/oracle/identities/neet_zoology.json \
   lib/oracle/identities/neet/zoology.json
```

### Phase 5: Move JSON Exports (2 minutes)

```bash
mv flagship_neet_physics_2026_set_a.json \
   flagship_exports/neet_2026/physics/set_a.json

mv flagship_neet_physics_2026_set_b.json \
   flagship_exports/neet_2026/physics/set_b.json
```

### Phase 6: Update Import Paths (30 minutes)

**Files to Update:**

1. **Frontend Integration:**
   - `utils/predictedPapersData.ts`: Update import paths
   ```typescript
   // Before
   import neetPhysicsSetA from '../flagship_neet_physics_2026_set_a.json';

   // After
   import neetPhysicsSetA from '../flagship_exports/neet_2026/physics/set_a.json';
   ```

2. **Backend Integration:**
   - `api/learningJourneyEndpoints.js`: Update file paths
   ```javascript
   // Before
   sourceFile = 'flagship_neet_physics_2026_set_a.json';

   // After
   sourceFile = 'flagship_exports/neet_2026/physics/set_a.json';
   ```

3. **Scripts Internal Imports:**
   - Update any scripts that import identity banks
   ```typescript
   // Before
   import identities from '../../lib/oracle/identities/neet_physics.json';

   // After
   import identities from '../../../lib/oracle/identities/neet/physics.json';
   ```

4. **Documentation Links:**
   - Update MASTER_INDEX.md
   - Update README files
   - Update workflow templates

### Phase 7: Create README Files (15 minutes)

**Main NEET README:**
```bash
# Create docs/oracle/neet/README.md
```

**Scripts README:**
```bash
# Create scripts/oracle/neet/README.md (copy from NEET_SCRIPTS_README.md)
```

**Subject-specific READMEs:**
```bash
# Create docs/oracle/neet/physics/README.md
# Create docs/oracle/neet/chemistry/README.md
# Create docs/oracle/neet/botany/README.md
# Create docs/oracle/neet/zoology/README.md
```

### Phase 8: Verify & Test (20 minutes)

1. **Verify imports work:**
   ```bash
   # Test frontend
   npm run dev
   # Check UI loads NEET Physics papers

   # Test scripts
   npx tsx scripts/oracle/neet/physics/analyze_question_types_2021_2025.ts
   ```

2. **Verify all file moves:**
   ```bash
   # Check no broken links in documentation
   # Check all scripts can find identity banks
   # Check UI can load JSON exports
   ```

3. **Update git:**
   ```bash
   git add .
   git commit -m "refactor: reorganize NEET calibration files into clean folder structure

   - Separated NEET from KCET documentation
   - Organized scripts by subject (physics, chemistry, botany, zoology)
   - Moved identity banks to neet/ subdirectory
   - Moved JSON exports to flagship_exports/neet_2026/
   - Updated all import paths
   - Created subject-specific README files

   Benefits:
   - Clear separation of NEET vs KCET
   - Easy to find subject-specific files
   - Scalable structure for future subjects
   - Clean project root"
   ```

---

## Total Time Estimate

| Phase | Task | Time |
|-------|------|------|
| 1 | Create directories | 5 min |
| 2 | Move documentation | 10 min |
| 3 | Move scripts | 15 min |
| 4 | Move identity banks | 2 min |
| 5 | Move JSON exports | 2 min |
| 6 | Update import paths | 30 min |
| 7 | Create READMEs | 15 min |
| 8 | Verify & test | 20 min |
| **Total** | **Complete refactoring** | **~90 min** |

---

## Risks & Mitigation

### Risk 1: Broken Import Paths
**Impact:** High - Scripts and UI won't work
**Mitigation:**
- Update all paths in Phase 6
- Test thoroughly before committing
- Keep backup of original structure

### Risk 2: Documentation Links Broken
**Impact:** Medium - Navigation issues
**Mitigation:**
- Update MASTER_INDEX.md
- Use relative paths in markdown
- Test all links after migration

### Risk 3: Confusion During Transition
**Impact:** Low - Temporary inconvenience
**Mitigation:**
- Do migration in one session
- Document all changes
- Create migration guide for team

---

## Rollback Plan

If refactoring causes issues:

1. **Git Revert:**
   ```bash
   git revert HEAD
   ```

2. **Manual Rollback:**
   - Move files back to original locations
   - Restore original import paths
   - Use this document as reverse guide

---

## Future Enhancements

After initial refactoring, consider:

1. **Add Index Files:**
   - Create index.ts in each script folder for easier imports
   - Create markdown index for documentation

2. **Standardize Naming:**
   - All scripts use same pattern: `<action>_<details>.ts`
   - All reports use same pattern: `<PHASE>_<TYPE>.md`

3. **Add Templates:**
   - Script templates for new subjects
   - Documentation templates for new subjects

4. **Automation:**
   - Script to generate new subject structure
   - Script to validate file organization

---

## Notes

- This is a **PROPOSED** structure, not yet implemented
- Can be done incrementally (subject by subject)
- Should be done before adding Chemistry/Botany/Zoology
- Will make future maintenance much easier
- All existing files will be preserved (just moved)

---

## Decision Log

**Date:** April 30, 2026
**Status:** Documented, awaiting approval
**Next Step:** Review with team, schedule refactoring session
**Owner:** TBD

---

**Document Version:** 1.0
**Last Updated:** April 30, 2026
**Maintained By:** REI Calibration Team
