-- ============================================================
-- 🧠 REI v3.0 DEEP INTELLIGENCE & CONFIGURATION STORE
-- ============================================================
-- Migration: 028_rei_deep_store.sql
-- Description: Adds configuration tables for REI constants and upgrades historical patterns.
-- ============================================================

-- 1. REI Evolution Constants Store
-- This replaces hardcoded magic numbers (like 1.8x multiplier)
CREATE TABLE IF NOT EXISTS public.rei_evolution_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_context TEXT NOT NULL,
    subject TEXT,
    rigor_drift_multiplier NUMERIC DEFAULT 1.8,
    ids_baseline NUMERIC DEFAULT 0.95,
    synthesis_weight NUMERIC DEFAULT 0.7,
    trap_density_weight NUMERIC DEFAULT 0.8,
    linguistic_load_weight NUMERIC DEFAULT 0.5,
    speed_requirement_weight NUMERIC DEFAULT 0.9,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_context, subject)
);

-- 2. Upgrade exam_historical_patterns with Signature Columns
-- These are captured DURING THE SCAN analysis by the AI Auditor
ALTER TABLE public.exam_historical_patterns 
ADD COLUMN IF NOT EXISTS board_signature TEXT, -- e.g. 'SYNTHESIZER'
ADD COLUMN IF NOT EXISTS intent_signature JSONB, -- { synthesis: 0.8, speed: 0.9 }
ADD COLUMN IF NOT EXISTS rigor_velocity NUMERIC, -- The 'acceleration' detected in this specific year
ADD COLUMN IF NOT EXISTS ids_actual NUMERIC; -- Measured Item Difficulty Score of the real paper

-- 3. Add RLS for new tables
ALTER TABLE public.rei_evolution_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Configs viewable by everyone" ON public.rei_evolution_configs;
CREATE POLICY "Configs viewable by everyone" ON public.rei_evolution_configs FOR SELECT USING (true);

-- 4. Initial Seed for KCET/JEE/NEET
INSERT INTO public.rei_evolution_configs (exam_context, subject, rigor_drift_multiplier, ids_baseline, synthesis_weight, trap_density_weight, linguistic_load_weight, speed_requirement_weight)
VALUES
('KCET', 'Math', 1.8, 0.98, 0.7, 0.8, 0.5, 0.95),
('JEE', 'Math', 2.0, 0.99, 0.75, 0.85, 0.6, 0.6),
('NEET', 'Physics', 1.9, 0.96, 0.75, 0.85, 0.55, 0.85),
('NEET', 'Chemistry', 1.7, 0.95, 0.7, 0.8, 0.5, 0.8),
('NEET', 'Botany', 1.5, 0.93, 0.65, 0.7, 0.6, 0.75),
('NEET', 'Zoology', 1.5, 0.93, 0.65, 0.7, 0.6, 0.75)
ON CONFLICT (exam_context, subject) DO NOTHING;

NOTIFY pgrst, 'reload schema';
