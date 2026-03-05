# EduJourney — Database Setup Instructions

## Fresh Project Setup (new Supabase project)

Run **one file** in Supabase SQL Editor:

```
CLEAN_START_SCHEMA_v7.0.sql
```

This file:
- Creates every table, function, trigger, RLS policy
- Creates the `edujourney-images` Storage bucket with policies
- Seeds pricing plans and REI evolution config baselines
- Grants admin role to `prabhubp@gmail.com`

---

## Upgrading an Existing v6.0 DB

Run these two migrations in order:

```sql
-- 1. REI v4.0 deep store tables + exam_historical_patterns columns
migrations/028_rei_deep_store.sql

-- 2. Storage bucket + RLS for visual sketch uploads
migrations/029_storage_visual_rls.sql
```

---

## Migration Index (001 → 029)

| File | What it does |
|------|--------------|
| 001_initial_schema | Core tables |
| 002_rls_policies | RLS for core tables |
| 003_auto_create_user_profile | Trigger: auto-create profile on signup |
| 004_add_exam_context | Add exam_context to scans |
| 005_payment_subscription | Payment/subscription tables |
| 006_payment_rls_policies | Payment RLS |
| 006_add_flashcards_table | flashcards cache table |
| 007_add_missing_columns | questions: domain, subject, exam_context, pedagogy |
| 007_learning_journey | Learning Journey tables |
| 009_add_question_metadata | questions metadata indexes |
| 010_practice_persistence | practice_answers, bookmarked_questions |
| 011_fix_topic_resource_fk | FK fix |
| 011_sync_v5_schema_questions | Sync v5 schema |
| 012_system_scans | is_system_scan flag |
| 013_sketch_progress | sketch_progress table |
| 014_add_topic_symbols | topics.icon_url |
| 015_custom_mock_tests | test_templates |
| 016_quiz_attempts | quiz_attempts table |
| 017_fix_sketch_progress | sketch_progress fix |
| 018_add_notes_completed | topic_resources.notes_completed |
| 019_topic_sketches_rls | topic_sketches RLS policies |
| 020_fix_admin_full_access | Admin RLS fix |
| 021_ai_trends_tables | exam_historical_patterns, topic_metadata |
| 021_fix_test_responses_cascade | test_responses cascade fix |
| 022_fix_practice_sessions_rls | Practice sessions RLS fix |
| 023_fix_sketch_progress_rls | sketch_progress RLS fix |
| 024_fix_upsert_rls_policies | Upsert-safe RLS (WITH CHECK) |
| 025_rei_v3_restoration | REI v3.0: exam_configurations, generation_rules, calibration columns |
| 026_deep_intelligence_columns | questions: ai_reasoning, historical_pattern, predictive_insight, why_it_matters, study_tip |
| 027_fix_quiz_attempts_schema | quiz_attempts columns + indexes |
| 028_rei_deep_store | rei_evolution_configs table + exam_historical_patterns REI columns |
| 028_fix_payments_subscriptions_columns | payments/subscriptions missing columns patch |
| 029_storage_visual_rls | **edujourney-images** Storage bucket + RLS for visual sketches |

---

## Storage Bucket Notes

- Bucket: `edujourney-images` (public)
- Max file size: 20 MB
- Allowed types: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`
- Upload path convention: `sketches/{userId}/{scanId}/{questionOrder}.svg`
- Server-side uploads use the `service_role` key and bypass RLS entirely
- Browser-side uploads go through the `authenticated` role policy (folder must match `auth.uid()`)

---

## Environment Variables Required

```bash
# .env / server environment
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>     # bypasses RLS — keep secret
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>           # safe for browser
```
