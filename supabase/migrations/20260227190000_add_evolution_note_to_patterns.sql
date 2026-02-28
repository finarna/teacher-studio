-- Migration: Add evolution_note to exam_historical_patterns
-- This stores the qualitative "evolution notes" from the Auditor for the REI engine

ALTER TABLE exam_historical_patterns
ADD COLUMN IF NOT EXISTS evolution_note TEXT;

COMMENT ON COLUMN exam_historical_patterns.evolution_note IS 'Qualitative insight from the Auditor about how the exam pattern is evolving (e.g., "Shift towards multi-step calculus integration")';
