# REI v4.0 Intelligence Architecture & Deep Store

## 1. Overview
The Recursive Evolution Intelligence (REI) Engine has been aggressively updated to **v4.0**, establishing a fully dynamic, database-driven PyqChain that stores and computes pedagogical shift patterns automatically upon scanning.

This eliminates hardcoded calibration configs and introduces a "living" intelligence system directly integrated with the **Admin Scan Approval** dashboard.

## 2. Structural Upgrades

### A. Deep Configuration Database (`rei_evolution_configs`)
We have introduced a dedicated table for storing base behavioral constants. This removes arbitrary multipliers from the typescript code.
- **`rigor_drift_multiplier`**: Tunes the acceleration rate of problem complexity year-over-year.
- **`ids_baseline`**: Item Difficulty Score anchoring.
- **`speed_requirement_weight`** / **`synthesis_weight`**: Domain-specific heuristics mapped to standard profiles (e.g., JEE logic leaps vs. KCET property matching).

### B. PyqChain Signature Tracking (`exam_historical_patterns`)
The `syncScanToAITables` pipeline now natively embeds the **AI Paper Auditor**.
When a new document is scanned, the Auditor evaluates the full payload to extract:
- **`board_signature`**: The dominant evaluator persona (e.g., "SYNTHESIZER", "TRAP-SETTER").
- **`intent_signature`**: Syntactic and semantic intent parameters.
- **`rigor_velocity`**: Detected shift acceleration (+% drift from the previous year).
- **`evolution_note` / Directives**: Real, extracted directives like "Heuristic Shortcut Mapping" and "Geometric Seam Obfuscation".

### C. Predictive Oracle Cache (`ai_universal_calibration`)
The engine dynamically processes historic data gradients (t-1, t-2) to project the expected state for year `t+1` (e.g., projecting 2026 based on the slope between 2024 and 2025). 
These finalized, computed predictions are safely cached in the Calibration Table, decoupling UI computation from real-time database locks.

---

## 3. UI/UX: The Strategic Briefing Dashboard
With the backend fully supporting predictive DB payloads, the Admin portal introduces the **REI Prediction Oracle**. 
- Retrieves pre-computed 2026 tactical traps dynamically.
- Interactive filtering by standard `ExamContext` and `Subject` components.
- Dedicated "Traps" hazard visualization (categorizes phrases invoking "Trap", "Shift", "Seam", etc. separate from standard evolutionary directives).

---

## 4. Reset & Initial Setup Strategy
To support proper PyQ processing (building the historic gradient sequentially):
1. **Reset**: Use `npx tsx migrations/reset_db_for_fresh_start.ts` to fully wipe `exam_historical_patterns`, `ai_universal_calibration`, `topic_distributions`, and mock data arrays.
2. **Seed Baseline**: Run baseline structural deployments via `CLEAN_START_SCHEMA_v6.0.sql`, which provides a foundation for `rei_evolution_configs` (e.g., Math KCET default weights).
3. **Sequential Pipeline Execution**:
   - Upload 2021 Scan -> System maps, extracts properties, creates Signature T_1.
   - Upload 2022 Scan -> System compares against T_1, determines rigor velocity, sets T_2.
   - Upload 2023 Scan -> System identifies the continuing trajectory (T_3).
   - Once synced to present day, the Strategic Briefing UI reflects the highly-accurate, algorithmically backed Oracle prediction for the upcoming year.

*This concludes the REI v4 architectural documentation.*
