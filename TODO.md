# EduJourney - Universal Teacher Studio TODO

## ✅ Completed Tasks

1. **LaTeX Syntax Sanitization** (Fixed)
   - [x] Auto-fixed ~5 questions with malformed LaTeX (`egin{`, `\ight`, etc.) using `fixLatexIssues.ts`.
   - [x] Implemented logic to ensure future extraction processes use correct backslashing.

2. **Topic/Subtopic Mapping Completeness** (Fixed)
   - [x] Updated `intelligenceSynthesis.ts` to explicitly generate `subtopic` data.
   - [x] Modified database logic to store `subtopic` safely within the `metadata` JSON field.
   - [x] Ran force-sync script to populate subtopics for the KCET 2021 Math scan.

3. **Visual Generation Logic** (Fixed)
   - [x] Relaxed "Class 12 Only" constraints for PYQs (Previous Year Questions).
   - [x] Added `EXCEPTION` clause to AI prompts to allow generation of visuals for out-of-boundary questions that appear in actual exam contexts.
   - [x] Fixed `401 Unauthorized` sync failure by ensuring fresh session token extraction in `App.tsx`.

4. **Parallel Batch Modes** (In Progress)
   - [x] Sample batch of 5 visuals successfully generated and saved to DB.
   - [x] SCALE: Run full batch generation for all 60 questions.

---

## 🛠️ Remaining Pipeline & Status Fixes

1. **Admin Scan Publish Screen - Status Visibility**
   - [x] Update the **Admin Scan Publish** UI layout to clearly display the active status of the REI Cognitive Synthesis engine.
   - [x] Display an explicit mapping progress bar (e.g. `Synthesized X / 60 Questions`).
   - [x] Expose insights from the deepest REI variables like `ai_reasoning` and `predictive_insight` directly on the admin preview. 

2. **Parallel Batch Scaling**
   - [x] Finalize the "Generate All Visuals" performance for 60+ question batches to handle long-running timeouts.
