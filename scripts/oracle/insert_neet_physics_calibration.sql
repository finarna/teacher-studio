-- NEET Physics Calibration Database Insert
-- Generated: 2026-04-29
-- Calibration Period: 2021-2025
-- Average Match Rate: 86.5%
-- System Confidence: 89.3%

INSERT INTO ai_universal_calibration (
  id,
  exam_type,
  subject,
  target_year,
  rigor_velocity,
  ids_target,
  board_signature,
  intent_signature,
  calibration_directives,
  difficulty_easy_pct,
  difficulty_moderate_pct,
  difficulty_hard_pct,
  created_at
) VALUES (
  gen_random_uuid(),
  'NEET',                    -- National Eligibility Entrance Test
  'Physics',                 -- Subject
  2027,                      -- Target year (next exam)
  1.68,                      -- rigor_drift_multiplier from calibration
  0.894,                     -- ids_baseline from calibration
  'FORMULA_NUMERICAL',       -- Physics is formula/calculation based
  jsonb_build_object(
    'synthesis', 0.294,      -- From calibration: synthesis_weight
    'trapDensity', 0.30,     -- From calibration: trap_weight
    'linguisticLoad', 0.25,  -- From calibration: intent_learning_rate
    'speedRequirement', 0.90,
    'questionTypeProfile', jsonb_build_object(
      'simple_recall_mcq', 78,
      'diagram_based_mcq', 12,
      'calculation_mcq', 4,
      'definitional_mcq', 3,
      'match_following_mcq', 2,
      'assertion_reason_mcq', 0,
      'statement_based_mcq', 0
    )
  ),
  ARRAY[
    'NEET Physics 2025 trend: 20/71/9 (Easy/Moderate/Hard) - CRITICAL SHIFT from historical 50/50/0',
    'Historical pattern (2021-2024): NO hard questions, 50/50 Easy/Moderate split',
    '2025 introduced Hard questions for first time (9%) - trend likely to continue',
    'Use 2025 pattern for 2026-2027 predictions: ~10Q Easy, ~35Q Moderate, ~5Q Hard',
    'Focus on formula-based numericals (78% simple recall)',
    'Include diagram-based questions (12% - graphs, ray diagrams, circuits)',
    'Target IDS: 0.894 (Range: 0.64-0.71 actual)',
    'High-yield topics: ELECTROSTATICS (4.6 Q/year), OPTICS (4.0 Q/year), CURRENT ELECTRICITY (4.0 Q/year)',
    'Medium-yield: MAGNETIC EFFECTS (3.6 Q/year), EM INDUCTION & AC (3.6 Q/year)',
    'Focus on conceptual prediction (Tier 2: 70-85%) rather than exact matches',
    'Avoid overfitting - 0% Tier 1 is ideal for national exam'
  ],
  20,                        -- Easy: 10 questions out of 50 (2025 trend)
  71,                        -- Moderate: 35-36 questions out of 50 (2025 trend)
  9,                         -- Hard: 4-5 questions out of 50 (2025 trend)
  NOW()
)
ON CONFLICT (exam_type, subject, target_year)
DO UPDATE SET
  rigor_velocity = EXCLUDED.rigor_velocity,
  ids_target = EXCLUDED.ids_target,
  board_signature = EXCLUDED.board_signature,
  intent_signature = EXCLUDED.intent_signature,
  calibration_directives = EXCLUDED.calibration_directives,
  difficulty_easy_pct = EXCLUDED.difficulty_easy_pct,
  difficulty_moderate_pct = EXCLUDED.difficulty_moderate_pct,
  difficulty_hard_pct = EXCLUDED.difficulty_hard_pct,
  updated_at = NOW();

-- Verify insertion
SELECT
  exam_type,
  subject,
  target_year,
  rigor_velocity,
  ids_target,
  board_signature,
  intent_signature->>'synthesis' as synthesis,
  intent_signature->>'trapDensity' as trap_density,
  intent_signature->'questionTypeProfile'->>'simple_recall_mcq' as simple_recall_pct,
  difficulty_easy_pct,
  difficulty_moderate_pct,
  difficulty_hard_pct,
  array_length(calibration_directives, 1) as directive_count
FROM ai_universal_calibration
WHERE exam_type = 'NEET'
  AND subject = 'Physics'
  AND target_year = 2027;
