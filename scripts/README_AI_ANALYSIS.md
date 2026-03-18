# AI Prediction Analysis Report Generator

Comprehensive analysis tool for examining AI prediction settings, historical patterns, and REI (Recursive Evolution Intelligence) optimization across NEET and KCET exam systems.

## Overview

This script generates detailed reports showing:
- Historical exam patterns (difficulty distributions, board signatures, IDS scores)
- AI calibration forecasts for upcoming exam years
- REI evolution configuration settings
- Topic-level distribution analysis
- Available system scans and data coverage
- Intent signatures (synthesis, trap density, linguistic load, speed requirements)

## Quick Start

### Basic Usage

```bash
# Generate report for all exams (console output)
npm run analyze:ai

# Generate report for NEET only
npm run analyze:ai:neet

# Generate report for KCET only
npm run analyze:ai:kcet

# Save report to markdown file
npm run analyze:ai:save

# Save report as JSON
npm run analyze:ai:json
```

### Advanced Usage

```bash
# Filter by specific exam
npx tsx scripts/generate-ai-analysis-report.ts --exam NEET

# Filter by specific subject
npx tsx scripts/generate-ai-analysis-report.ts --exam KCET --subject Math

# Save to custom file
npx tsx scripts/generate-ai-analysis-report.ts --output custom-report.md

# Generate JSON report
npx tsx scripts/generate-ai-analysis-report.ts --json --output report.json

# Combine filters
npx tsx scripts/generate-ai-analysis-report.ts --exam NEET --subject Physics --output neet-physics-analysis.md
```

## Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--exam` | Filter by exam context (NEET or KCET) | `--exam NEET` |
| `--subject` | Filter by subject | `--subject Math` |
| `--output` | Save to file instead of console | `--output report.md` |
| `--json` | Output as JSON instead of markdown | `--json` |

## Report Contents

### 1. Summary Metrics
- **Years Tracked**: Historical years with data
- **Total Questions**: Cumulative questions analyzed
- **Avg Difficulty (IDS)**: Item Difficulty Score average
- **Board Signature**: Exam personality (SYNTHESIZER, LOGICIAN, INTIMIDATOR, ANCHOR)
- **2026 Forecasts**: Availability of AI predictions
- **Topics Tracked**: Number of unique topics monitored
- **System Scans**: Count of official exam papers

### 2. Historical Patterns
For each year:
- **Difficulty Distribution**: Easy/Moderate/Hard percentages
- **Board Signature**: Exam personality type
- **IDS Actual**: Measured difficulty score (0-1.0)
- **Intent Signature**: Weights for synthesis, traps, linguistic load, speed
- **Evolution Note**: AI-generated qualitative analysis

### 3. AI Forecast (2026)
- **Board Signature**: Predicted exam personality
- **Rigor Velocity**: Difficulty acceleration multiplier
- **Calibration Directives**: Specific traps and strategies identified

### 4. REI Evolution Config
Baseline settings for recursive intelligence:
- **IDS Baseline**: Default difficulty score
- **Rigor Drift Multiplier**: Year-over-year difficulty acceleration factor
- **Intent Weights**: Importance of synthesis, traps, linguistic complexity, speed

### 5. Topic Distribution Summary
Per year breakdown:
- Topics tracked with question counts
- Difficulty distribution per topic (Easy/Moderate/Hard)
- Top 5 most frequent topics

### 6. Available Scans
List of official exam papers in database:
- System scans (official past papers)
- User-uploaded scans
- Year and subject coverage

## Understanding the Metrics

### Board Signatures
- **SYNTHESIZER**: Emphasizes rapid synthesis, pattern recognition, shortcuts
- **LOGICIAN**: Deep conceptual understanding, step-by-step reasoning
- **INTIMIDATOR**: High difficulty, complex multi-step problems
- **ANCHOR**: Foundation-focused, textbook-aligned questions

### IDS (Item Difficulty Score)
- Scale: 0.0 (easiest) to 1.0 (hardest)
- NEET average: ~0.82
- KCET Math: 0.82 (with high speed requirement)

### Intent Signature
- **Synthesis** (0-1): Cross-topic integration required
- **Trap Density** (0-1): Likelihood of misleading options
- **Linguistic Load** (0-1): Reading comprehension complexity
- **Speed Requirement** (0-1): Time pressure intensity

### Rigor Velocity
- Multiplier showing difficulty acceleration
- 1.0 = stable difficulty
- >1.0 = increasing difficulty year-over-year
- <1.0 = decreasing difficulty

## Output Formats

### Markdown Output (Default)
- Human-readable report with headers, tables, lists
- Suitable for documentation and sharing
- Automatically formatted with emojis and structure

### JSON Output (--json flag)
- Machine-readable structured data
- Includes all raw data points
- Suitable for further processing or API integration

Example JSON structure:
```json
{
  "timestamp": "2026-03-15T00:00:00.000Z",
  "examContext": "KCET",
  "subjects": {
    "Math": {
      "historicalPatterns": [...],
      "calibration": {...},
      "reiConfig": {...},
      "topicDistributions": [...],
      "scans": [...],
      "summary": {...}
    }
  }
}
```

## Use Cases

### 1. Pre-Exam Intelligence Review
Generate reports before major exam seasons to verify:
- All historical data is present
- Forecasts are up-to-date
- Topic distributions are tracked

```bash
npm run analyze:ai:save
# Review docs/AI_ANALYSIS_REPORT.md
```

### 2. Subject-Specific Analysis
Deep-dive into specific subjects:
```bash
npx tsx scripts/generate-ai-analysis-report.ts --exam NEET --subject Physics --output neet-physics.md
```

### 3. Data Pipeline Validation
After uploading new exam papers, verify they're processed:
```bash
npm run analyze:ai:json
# Check that new year appears in historicalPatterns
```

### 4. REI Configuration Audits
Compare baseline settings across exams:
```bash
npm run analyze:ai
# Review REI Evolution Config sections
```

### 5. Forecasting Updates
Check if AI calibrations are current:
```bash
npm run analyze:ai
# Verify "2026 Forecasts: ✅ Active" for all subjects
```

## Automated Workflows

### Weekly Intelligence Audit
```bash
#!/bin/bash
# weekly-ai-audit.sh
npm run analyze:ai:save
git add docs/AI_ANALYSIS_REPORT.md
git commit -m "chore: weekly AI intelligence audit $(date +%Y-%m-%d)"
git push
```

### Pre-Release Validation
```bash
#!/bin/bash
# pre-release-check.sh
npm run analyze:ai:json --output /tmp/ai-report.json
# Run validations on JSON output
node scripts/validate-ai-coverage.js /tmp/ai-report.json
```

## Troubleshooting

### Missing Historical Patterns
If a subject shows "NO HISTORICAL PATTERNS FOUND":
1. Check if system scans exist for that subject
2. Verify scans have `is_system_scan = true`
3. Run sync script: `npx tsx scripts/sync-scan-to-ai-tables.ts`

### Missing Forecasts
If "2026 Forecasts: ⚠️ Missing":
1. Check if historical patterns exist (need at least 1 year)
2. Run REI engine: `npx tsx lib/reiEvolutionEngine.ts`
3. Verify `ai_universal_calibration` table has records

### Subject Name Mismatches
Database uses normalized names:
- "Math" (not "Mathematics" or "Maths")
- "Physics", "Chemistry", "Botany", "Zoology" (for NEET)
- Check subject names in scans table if filtering doesn't work

### Missing Topic Distributions
If topic counts are 0:
1. Verify `exam_topic_distributions` table is populated
2. Check foreign key relationship with `exam_historical_patterns`
3. Run topic sync: `npx tsx scripts/sync-topic-distributions.ts`

## Related Scripts

- **verify-ai-predictions.ts**: Detailed verification with database queries
- **check-kcet-all-data.ts**: KCET-specific data checker
- **sync-scan-to-ai-tables.ts**: Synchronize scans to AI tables
- **reiEvolutionEngine.ts**: Generate AI forecasts

## Database Tables Used

1. **exam_historical_patterns**: Core historical data
2. **ai_universal_calibration**: AI forecasts
3. **rei_evolution_configs**: Baseline settings
4. **exam_topic_distributions**: Topic-level tracking
5. **scans**: Exam paper records

## Report Sample

See `docs/AI_ANALYSIS_REPORT.md` for a full example report.

## Support

For issues or questions:
1. Check the generated report for data gaps
2. Verify database connectivity (`.env.local` configured)
3. Review logs for specific error messages
4. Check related documentation in `docs/` folder

## Version History

- **v1.0**: Initial release with markdown/JSON output
- **v1.1**: Added subject filtering and custom output paths
- **v1.2**: Enhanced topic distribution analysis
- **Current**: Full REI v4.0 support with calibration directives
