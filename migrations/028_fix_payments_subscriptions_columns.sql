-- Migration 028: Fix payments & subscriptions missing columns
-- Created: 2026-03-03
-- Description: Adds columns to payments and subscriptions tables that were
--              missing from the initial schema on the new Supabase project
--              (ozrkewbrwgtcunoerzka). All columns are already present in
--              CLEAN_START_SCHEMA_v6.0.sql — this migration patches existing DBs.

-- =====================================================
-- 1. PAYMENTS TABLE — missing columns
-- =====================================================
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency          VARCHAR(3)   NOT NULL DEFAULT 'INR';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS method            VARCHAR(50);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt           VARCHAR(100);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS invoice_url       TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS error_code        VARCHAR(100);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS error_description TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata          JSONB        DEFAULT '{}'::jsonb;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255);

-- =====================================================
-- 2. SUBSCRIPTIONS TABLE — missing columns
-- =====================================================
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(100);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end      BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancelled_at              TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS metadata                  JSONB        DEFAULT '{}'::jsonb;

-- =====================================================
-- 3. Reload PostgREST schema cache
-- =====================================================
NOTIFY pgrst, 'reload schema';
