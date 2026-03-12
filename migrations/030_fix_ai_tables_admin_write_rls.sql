-- ============================================================
-- 🛡️ MIGRATION 030: ADMIN WRITE ACCESS FOR AI INTELLIGENCE TABLES
-- ============================================================
-- Description: Adds admin INSERT/UPDATE/DELETE policies for
-- exam_historical_patterns and exam_topic_distributions so that
-- syncScanToAITables can write from the admin client.
-- ============================================================

CREATE POLICY "Admins can write exam_historical_patterns"
ON exam_historical_patterns
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can write exam_topic_distributions"
ON exam_topic_distributions
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 030: Admin write RLS for AI intelligence tables applied!';
END $$;
