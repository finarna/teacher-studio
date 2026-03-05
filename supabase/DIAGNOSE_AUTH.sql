-- ==========================================
-- DIAGNOSE AUTH ISSUE - Run this in Supabase SQL Editor
-- ==========================================
-- This will show you the current state of your auth system
-- and help identify what's preventing signup
--
-- INSTRUCTIONS:
-- 1. Go to: https://supabase.com/dashboard/project/ozrkewbrwgtcunoerzka/sql/new
-- 2. Copy and paste this entire SQL file
-- 3. Click "Run" and review the output
--
-- ==========================================

-- Check 1: Look for any records with NULL confirmation_token
DO $$
DECLARE
  null_token_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_token_count
  FROM auth.users
  WHERE confirmation_token IS NULL;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'CHECK 1: Records with NULL confirmation_token';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Count: %', null_token_count;

  IF null_token_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: Found % record(s) with NULL confirmation_token!', null_token_count;
  ELSE
    RAISE NOTICE '✅ GOOD: No NULL confirmation_token records found';
  END IF;
  RAISE NOTICE '';
END $$;

-- Check 2: Show details of problematic records
DO $$
DECLARE
  user_record RECORD;
  found_records BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'CHECK 2: Details of records with NULL confirmation_token';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  FOR user_record IN
    SELECT
      email,
      created_at,
      confirmed_at,
      email_confirmed_at,
      confirmation_token,
      encrypted_password IS NOT NULL as has_password,
      raw_app_meta_data->>'provider' as provider
    FROM auth.users
    WHERE confirmation_token IS NULL
    ORDER BY created_at DESC
  LOOP
    found_records := TRUE;
    RAISE NOTICE 'Email: %', user_record.email;
    RAISE NOTICE '  Created: %', user_record.created_at;
    RAISE NOTICE '  Confirmed: %', COALESCE(user_record.confirmed_at::TEXT, 'NOT CONFIRMED');
    RAISE NOTICE '  Email Confirmed: %', COALESCE(user_record.email_confirmed_at::TEXT, 'NOT CONFIRMED');
    RAISE NOTICE '  Has Password: %', user_record.has_password;
    RAISE NOTICE '  Provider: %', COALESCE(user_record.provider, 'email');
    RAISE NOTICE '';
  END LOOP;

  IF NOT found_records THEN
    RAISE NOTICE '✅ No problematic records found';
  END IF;
  RAISE NOTICE '';
END $$;

-- Check 3: Look specifically for hello@finarna.com
DO $$
DECLARE
  user_exists BOOLEAN;
  user_details RECORD;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'CHECK 3: Looking for hello@finarna.com';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'hello@finarna.com'
  ) INTO user_exists;

  IF user_exists THEN
    SELECT
      email,
      id,
      created_at,
      confirmed_at,
      email_confirmed_at,
      confirmation_token IS NULL as token_is_null,
      encrypted_password IS NOT NULL as has_password,
      raw_app_meta_data->>'provider' as provider,
      LENGTH(confirmation_token) as token_length
    INTO user_details
    FROM auth.users
    WHERE email = 'hello@finarna.com';

    RAISE NOTICE '⚠️  Record EXISTS for hello@finarna.com:';
    RAISE NOTICE '  ID: %', user_details.id;
    RAISE NOTICE '  Created: %', user_details.created_at;
    RAISE NOTICE '  Confirmed: %', COALESCE(user_details.confirmed_at::TEXT, 'NOT CONFIRMED');
    RAISE NOTICE '  Email Confirmed: %', COALESCE(user_details.email_confirmed_at::TEXT, 'NOT CONFIRMED');
    RAISE NOTICE '  Confirmation Token is NULL: %', user_details.token_is_null;
    RAISE NOTICE '  Token Length: %', COALESCE(user_details.token_length::TEXT, 'NULL');
    RAISE NOTICE '  Has Password: %', user_details.has_password;
    RAISE NOTICE '  Provider: %', COALESCE(user_details.provider, 'email');
    RAISE NOTICE '';
    RAISE NOTICE '🔧 ACTION NEEDED: Delete this record to allow fresh signup';
  ELSE
    RAISE NOTICE '✅ GOOD: No record found for hello@finarna.com';
    RAISE NOTICE '   You should be able to sign up with this email';
  END IF;
  RAISE NOTICE '';
END $$;

-- Check 4: Check for unconfirmed users older than 1 hour
DO $$
DECLARE
  unconfirmed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unconfirmed_count
  FROM auth.users
  WHERE confirmed_at IS NULL
    AND email_confirmed_at IS NULL
    AND created_at < NOW() - INTERVAL '1 hour';

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'CHECK 4: Old unconfirmed users (>1 hour)';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Count: %', unconfirmed_count;

  IF unconfirmed_count > 0 THEN
    RAISE NOTICE '⚠️  Found % old unconfirmed user(s) - consider cleanup', unconfirmed_count;
  ELSE
    RAISE NOTICE '✅ No old unconfirmed users';
  END IF;
  RAISE NOTICE '';
END $$;

-- Check 5: Profile sync check
DO $$
DECLARE
  auth_count INTEGER;
  profile_count INTEGER;
  orphaned_profiles INTEGER;
  orphaned_auth INTEGER;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM public.profiles;

  SELECT COUNT(*) INTO orphaned_profiles
  FROM public.profiles
  WHERE id NOT IN (SELECT id FROM auth.users);

  SELECT COUNT(*) INTO orphaned_auth
  FROM auth.users
  WHERE id NOT IN (SELECT id FROM public.profiles);

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'CHECK 5: Auth vs Profile Sync';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Total auth.users: %', auth_count;
  RAISE NOTICE 'Total profiles: %', profile_count;
  RAISE NOTICE 'Orphaned profiles (no auth): %', orphaned_profiles;
  RAISE NOTICE 'Orphaned auth (no profile): %', orphaned_auth;

  IF orphaned_profiles > 0 OR orphaned_auth > 0 THEN
    RAISE NOTICE '⚠️  WARNING: Sync issue detected!';
  ELSE
    RAISE NOTICE '✅ Auth and profiles are in sync';
  END IF;
  RAISE NOTICE '';
END $$;

-- Check 6: Summary
DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'SUMMARY & NEXT STEPS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the checks above. Common issues:';
  RAISE NOTICE '';
  RAISE NOTICE '1. If CHECK 3 shows a record exists for hello@finarna.com:';
  RAISE NOTICE '   → Run: DELETE FROM auth.users WHERE email = ''hello@finarna.com'';';
  RAISE NOTICE '';
  RAISE NOTICE '2. If CHECK 1 shows NULL confirmation_token records:';
  RAISE NOTICE '   → Those records need to be deleted or fixed';
  RAISE NOTICE '';
  RAISE NOTICE '3. If all checks pass but signup still fails:';
  RAISE NOTICE '   → Check Supabase Auth logs in dashboard';
  RAISE NOTICE '   → Check browser console for detailed errors';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
