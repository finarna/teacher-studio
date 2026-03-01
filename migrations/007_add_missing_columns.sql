-- ============================================================
-- Migration 007: Add missing columns to scans table
-- The live DB was created before CLEAN_START_SCHEMA_v5 was complete.
-- These ADD COLUMN ... IF NOT EXISTS calls are idempotent.
-- ============================================================

-- Core JSONB analytics columns missing from old live schema
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS blooms_taxonomy        JSONB;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS difficulty_distribution JSONB;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS topic_weightage         JSONB;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS trends                  JSONB;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS predictive_topics       JSONB;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS faq                     JSONB;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS strategy                JSONB;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS summary                 TEXT;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS overall_difficulty      TEXT CHECK (overall_difficulty IN ('Easy', 'Moderate', 'Hard'));
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS year                    INTEGER;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS metadata                JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS is_system_scan          BOOLEAN DEFAULT FALSE;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS exam_context            TEXT NOT NULL DEFAULT 'KCET';
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS scan_date               TIMESTAMPTZ DEFAULT NOW();

-- questions table extra columns
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS solution_steps  JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS exam_tip         TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS key_formulas     JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS pitfalls         JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS mastery_material TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS blooms           TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS domain           TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic            TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS difficulty       TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS marks            INTEGER DEFAULT 1;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS source           TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_option_index INTEGER;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS has_visual_element       BOOLEAN DEFAULT FALSE;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS visual_element_type      TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS visual_element_description TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS visual_element_position  TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS visual_bounding_box      JSONB;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS visual_concept   TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS diagram_url      TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS metadata         JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_order   INTEGER;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS sketch_svg_url   TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
