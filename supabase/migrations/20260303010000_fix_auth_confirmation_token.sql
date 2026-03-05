-- ==========================================
-- FIX AUTH CONFIRMATION TOKEN NULL VALUES
-- ==========================================
-- This migration fixes the issue where auth.users has NULL confirmation_token values
-- which causes signup errors: "Scan error on column index 3, name confirmation_token"

-- Step 1: Check for and clean up corrupted auth records with NULL confirmation_token
-- that are not yet confirmed (these are incomplete signups that failed)
DO $$
BEGIN
  -- Delete incomplete auth.users records where confirmation_token is NULL
  -- and email is not confirmed (these are failed/partial signups)
  DELETE FROM auth.users
  WHERE confirmation_token IS NULL
    AND confirmed_at IS NULL
    AND email_confirmed_at IS NULL
    AND created_at < NOW() - INTERVAL '1 hour'; -- Only delete old incomplete records

  RAISE NOTICE 'Cleaned up incomplete auth records with NULL confirmation_token';
END $$;

-- Step 2: For confirmed users with NULL confirmation_token, set it to empty string
-- (this shouldn't happen but is a safety measure)
DO $$
BEGIN
  UPDATE auth.users
  SET confirmation_token = ''
  WHERE confirmation_token IS NULL
    AND (confirmed_at IS NOT NULL OR email_confirmed_at IS NOT NULL);

  RAISE NOTICE 'Fixed confirmed users with NULL confirmation_token';
END $$;

-- Step 3: Check if there are any orphaned profiles without auth.users
-- (cleanup from previous issues)
DO $$
BEGIN
  DELETE FROM public.profiles
  WHERE id NOT IN (SELECT id FROM auth.users);

  RAISE NOTICE 'Cleaned up orphaned profiles';
END $$;
