# NEET Physics Iterative Calibration Script

## Overview

This script performs iterative calibration of the Oracle REI (Rigor Evolution Index) system for NEET Physics exams from 2021-2025. It adapts the proven KCET Math calibration methodology to expand the NEET Physics identity bank from 5 initial identities to 180+ through systematic pattern learning.

## Key Configuration

### Exam Parameters
- **Exam Context**: `NEET`
- **Subject**: `Physics`
- **Total Questions**: `50` (NEET has 50 Physics questions per year, not 60 like KCET)
- **Years**: 2021-2025 (using 2021 as baseline)
- **Target Match Rate**: 80%+
- **Max Iterations per Year**: 10

### Scan IDs (Official NEET Physics Papers)

```typescript
const OFFICIAL_SCANS: Record<number, string> = {
  2021: 'ca38a537-5516-469a-abd4-967a76b32028', // 50 Physics questions
  2022: 'b19037fb-980a-41e1-89a0-d28a5e1c0033', // 50 Physics questions
  2023: 'e3767338-1664-4e03-b0f6-1fab41ff5838', // 50 Physics questions
  2024: '95fa7fc6-4ebd-4183-b61a-b1d5a39cfec5', // 50 Physics questions
  2025: '4f682118-d0ce-4f6f-95c7-6141e496579f'  // 50 Physics questions
};
```

### Identity Bank
- **Location**: `/lib/oracle/identities/neet_physics.json`
- **Initial Count**: 5 identities
- **Target Count**: 180+ identities (after calibration)
- **Structure**: Each identity has `id`, `name`, `logic`, `high_yield`, and `confidence`

## Key Differences from KCET Math Calibration

| Aspect | KCET Math | NEET Physics |
|--------|-----------|--------------|
| **Exam Context** | KCET | NEET |
| **Subject** | Math | Physics |
| **Questions per Paper** | 60 | 50 |
| **Identity Field** | `topic` | `name` |
| **Marks per Question** | 1 | 4 |
| **Total Marks** | 60 | 180 |
| **Duration** | 80 mins | 180 mins |
| **Scan Type** | Dedicated subject scans | Combined paper (filtered by subject='Physics') |

## How It Works

### Phase 1: Baseline Extraction (2021)
1. Fetches 2021 NEET Physics paper (50 questions)
2. Runs AI audit to extract identity vector
3. Establishes baseline IDS (Intent Difficulty Signature)

### Phase 2-5: Iterative Calibration (2022-2025)
For each year:
1. **Fetch** actual paper from database (50 Physics questions)
2. **Audit** actual paper to extract identities
3. **Iterate** (up to 10 times):
   - Generate predicted paper using current parameters
   - Compare with actual paper (identity vectors + topics)
   - Adjust REI parameters based on mismatch
   - Track best-performing state
4. **Report** final metrics and update identity confidences

### Phase 6: Reporting
- Generate comprehensive calibration report
- Create per-year iteration logs
- Update identity bank with calibrated confidences
- Export calibrated engine config

## Prerequisites

1. **Environment Variables**:
   ```bash
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   GEMINI_API_KEY=<your-gemini-api-key>
   ```

2. **Database**:
   - NEET Combined scans for years 2021-2025
   - Each scan must have 50 Physics questions (subject='Physics')

3. **Files**:
   - `/lib/oracle/identities/neet_physics.json` - Identity bank
   - `/lib/oracle/engine_config.json` - Engine configuration

## Validation

Run the validation script first to ensure setup is correct:

```bash
npx tsx scripts/validate-neet-physics-setup.ts
```

This checks:
- Identity bank exists and is properly formatted
- All scan IDs are accessible
- Each scan has exactly 50 Physics questions

## Running the Calibration

```bash
npx tsx scripts/oracle/neet_physics_iterative_calibration_2021_2025.ts
```

### Expected Runtime
- ~20-30 minutes per year (depending on iterations needed)
- Total: ~2-3 hours for full 2021-2025 calibration

### Progress Indicators
```
🔄 NEET PHYSICS ITERATIVE CALIBRATION (2021-2025)
═══════════════════════════════════════════════════

✅ Loaded 5 identities from bank
✅ Loaded engine config v16.0

📊 Phase 1: Extracting 2021 Baseline
   ✓ Fetched 50 questions from 2021 paper
   ✓ Audit complete
   ✓ 2021 IDS Actual: 0.XXX
   ✓ Identity Vector: XX unique identities
   ✓ Total Questions: 50

============================================================
🔄 Phase 2: Calibrating Year 2022
============================================================

   📥 Fetching actual 2022 paper from database...
   ✓ Fetched 50 actual questions
   🔍 Auditing actual 2022 paper...
   ✓ Audit complete - IDS Actual: 0.XXX

   🔄 Iteration 1/10
   ────────────────────────────────────────────────
   🎯 Generating predicted 2022 paper...
   ✓ Generated 50 questions
   ✓ Assigned identity IDs: XX/50 questions
   📊 Comparing generated vs actual...
   ✓ Match Rate: XX.X%
   ✓ Average Score: XX.X%
   ✓ Identity Hit Rate: XX.X%
   ✓ Topic Accuracy: XX.X%
   🔧 Adjusting parameters...

   [... iterations continue ...]

✅ Year 2022 calibration complete!
   Final Match Rate: XX.X%
   Iterations: X
```

## Output Files

All outputs are saved to `/docs/oracle/calibration/`:

1. **Main Report**: `NEET_PHYSICS_CALIBRATION_REPORT_2021_2025.md`
   - Multi-year summary
   - Identity evolution tracking
   - Validation metrics
   - Topic distribution

2. **Iteration Logs**: `NEET_PHYSICS_20XX_ITERATION_LOG.md` (one per year)
   - Detailed iteration-by-iteration breakdown
   - Parameter adjustments
   - Comparison metrics

3. **Calibrated Identity Bank**: `/lib/oracle/identities/neet_physics.json` (updated in-place)
   - Updated identity confidences
   - Calibration metadata
   - Final match rates

4. **Calibrated Engine Config**: `engine_config_calibrated_neet_physics.json`
   - Optimized REI parameters
   - Can be applied to main engine config if desired

## Key Metrics

The calibration tracks these metrics per year:

- **Match Rate**: Percentage of questions with high similarity (primary goal: 80%+)
- **Average Score**: Mean similarity score across all comparisons
- **Identity Hit Rate**: Percentage of correctly predicted identities
- **Topic Accuracy**: Percentage of correct topic predictions
- **Difficulty Accuracy**: Percentage of correct difficulty predictions

## Identity Evolution

The script tracks how each identity's confidence evolves:

```json
{
  "id": "ID-NP-001",
  "topic": "Dimensional Homogeneity Traps",
  "initialConfidence": 0.98,
  "finalConfidence": 0.95
}
```

## Parameter Adjustment Strategy

The script automatically adjusts these parameters based on comparison results:

- **IDS Baseline**: Target difficulty signature
- **Rigor Drift Multiplier**: Year-over-year difficulty evolution
- **Synthesis Weight**: Multi-concept integration tendency
- **Trap Weight**: Distractor complexity
- **Intent Learning Rate**: How aggressively to adjust
- **Volatility Factor**: Randomness in pattern evolution

## Troubleshooting

### Common Issues

1. **"Failed to fetch 20XX paper from database"**
   - Check scan ID is correct
   - Verify scan has Physics questions with `subject='Physics'`
   - Run validation script to diagnose

2. **"No Physics questions found"**
   - NEET papers are stored as "Combined" subject
   - Questions must have `subject='Physics'` field populated
   - Check database migration status

3. **Low match rates (<50%)**
   - Normal for early iterations
   - System will adjust parameters automatically
   - Should improve by iteration 5-10

4. **API rate limiting**
   - Script has 2-second delays between iterations
   - Gemini API has rate limits
   - Wait and resume if needed

## Next Steps After Calibration

1. **Review Reports**:
   - Check final match rates (target: 80%+)
   - Review identity evolution
   - Validate topic distributions

2. **Apply Calibrated Parameters** (optional):
   - Copy calibrated engine config to main config
   - Test with new question generation
   - Monitor performance

3. **Expand Identity Bank**:
   - Add newly discovered identities
   - Refine existing identities based on patterns
   - Re-run calibration if major changes made

4. **Production Deployment**:
   - Use calibrated parameters for NEET Physics prediction
   - Monitor real-world performance
   - Iterate as needed

## Technical Notes

### Identity Matching Logic

The script uses a 3-tier matching strategy:

1. **Exact Match**: `identity.name === question.topic`
2. **Fuzzy Match**: Substring matching
3. **Audit-based**: Use identity vector from AI audit

### Comparison Method

Uses whole-paper identity vector comparison:
- Handles shuffled questions
- Tolerant to minor variations
- Focuses on pattern similarity

### State Management

- Calibration state carries forward between years
- Best state is preserved if performance degrades
- Final state used for reporting and export

## Version History

- **v1.0** (2026-04-28): Initial NEET Physics adaptation
  - Adapted from KCET Math calibration template
  - Configured for 50 questions per year
  - Updated scan IDs for NEET Combined papers
  - Modified identity matching for `name` field

## References

- KCET Math Calibration: `/scripts/oracle/kcet_math_iterative_calibration_2021_2025.ts`
- NEET Physics Identity Bank: `/lib/oracle/identities/neet_physics.json`
- Oracle REI Documentation: `/docs/oracle/`
