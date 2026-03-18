# AI Analysis Report - Quick Reference

## 🚀 Quick Commands

```bash
# All exams, console output
npm run analyze:ai

# NEET only
npm run analyze:ai:neet

# KCET only
npm run analyze:ai:kcet

# Save to markdown file
npm run analyze:ai:save

# Save as JSON
npm run analyze:ai:json
```

## 🎯 Custom Filters

```bash
# Specific exam
npx tsx scripts/generate-ai-analysis-report.ts --exam NEET

# Specific subject
npx tsx scripts/generate-ai-analysis-report.ts --exam KCET --subject Math

# Custom output file
npx tsx scripts/generate-ai-analysis-report.ts --output my-report.md

# JSON format
npx tsx scripts/generate-ai-analysis-report.ts --json

# Combined
npx tsx scripts/generate-ai-analysis-report.ts --exam NEET --subject Physics --output neet-physics.md
```

## 📊 What You'll Get

### For Each Subject:
- ✅ Historical patterns (2021-2024)
- ✅ Difficulty distributions (Easy/Moderate/Hard %)
- ✅ Board signatures (SYNTHESIZER, LOGICIAN, etc.)
- ✅ IDS scores (0-1 difficulty rating)
- ✅ 2026 AI forecasts
- ✅ Calibration directives (traps & strategies)
- ✅ REI evolution configs
- ✅ Topic distributions with question counts
- ✅ Available exam scans

## 🔍 Key Metrics Explained

| Metric | What it Means | Good Value |
|--------|---------------|------------|
| **IDS Actual** | Difficulty score (0-1) | 0.82 typical |
| **Rigor Velocity** | Difficulty acceleration | 1.0 = stable |
| **Board Signature** | Exam personality | SYNTHESIZER for speed |
| **Synthesis** | Cross-topic integration | 0.7-0.8 |
| **Trap Density** | Misleading options | 0.5-0.8 |
| **Speed Requirement** | Time pressure | 0.95 = very high |
| **Topics Tracked** | Coverage breadth | 30+ ideal |

## ⚡ Board Signatures

- **SYNTHESIZER** → Rapid synthesis, shortcuts, speed-focused
- **LOGICIAN** → Deep reasoning, step-by-step logic
- **INTIMIDATOR** → High difficulty, complex problems
- **ANCHOR** → Foundation-focused, textbook-aligned

## 📁 Output Locations

- **Markdown**: `docs/AI_ANALYSIS_REPORT.md`
- **JSON**: `docs/AI_ANALYSIS_REPORT.json`
- **Custom**: Specify with `--output path/to/file`

## 🛠️ Troubleshooting

### "No historical patterns found"
```bash
# Check scans exist
npx tsx scripts/check-kcet-all-data.ts

# Sync scans to AI tables
npx tsx scripts/sync-scan-to-ai-tables.ts
```

### "No forecasts found"
```bash
# Generate forecasts
npx tsx lib/reiEvolutionEngine.ts
```

### "Subject name mismatch"
Use normalized names:
- ✅ "Math" (not "Mathematics")
- ✅ "Physics", "Chemistry", "Botany", "Zoology"

## 💡 Pro Tips

1. **Run weekly** to track data updates:
   ```bash
   npm run analyze:ai:save
   ```

2. **Before exams** verify forecasts are current:
   ```bash
   npm run analyze:ai | grep "2026 Forecasts"
   ```

3. **After uploading papers** check they're processed:
   ```bash
   npm run analyze:ai:json | jq '.subjects[].scans | length'
   ```

4. **Compare exams** side-by-side:
   ```bash
   npm run analyze:ai:neet > neet.txt
   npm run analyze:ai:kcet > kcet.txt
   diff neet.txt kcet.txt
   ```

## 📚 Full Documentation

See `scripts/README_AI_ANALYSIS.md` for complete guide.
