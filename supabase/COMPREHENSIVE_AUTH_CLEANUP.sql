-- ==========================================
-- COMPREHENSIVE AUTH CLEANUP
-- ==========================================
-- This fixes ALL corrupted auth records including:
-- - NULL confirmation_token
-- - NULL created_at (NEW ISSUE!)
-- - NULL updated_at
-- - Any other incomplete records
--
-- INSTRUCTIONS:
-- 1. Go to: https://supabase.com/dashboard/project/ozrkewbrwgtcunoerzka/sql/new
-- 2. Copy and paste this entire SQL file
-- 3. Click "Run"
-- 4. WAIT 1 HOUR (rate limit cooldown)
-- 5. Clear browser cache completely
-- 6. Try signing up again
--
-- ==========================================

-- Step 1: Identify ALL problematic records
DO $$
DECLARE
  null_confirmation_token INTEGER;
  null_created_at INTEGER;
  null_updated_at INTEGER;
  total_problematic INTEGER;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'STEP 1: Identifying ALL problematic auth records';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  SELECT COUNT(*) INTO null_confirmation_token
  FROM auth.users
  WHERE confirmation_token IS NULL;

  SELECT COUNT(*) INTO null_created_at
  FROM auth.users
  WHERE created_at IS NULL;

  SELECT COUNT(*) INTO null_updated_at
  FROM auth.users
  WHERE updated_at IS NULL;

  total_problematic := null_confirmation_token + null_created_at + null_updated_at;

  RAISE NOTICE 'Records with NULL confirmation_token: %', null_confirmation_token;
  RAISE NOTICE 'Records with NULL created_at: %', null_created_at;
  RAISE NOTICE 'Records with NULL updated_at: %', null_updated_at;
  RAISE NOTICE '';
  RAISE NOTICE 'Total problematic fields: %', total_problematic;
  RAISE NOTICE '';
END $$;

-- Step 2: Show which emails will be affected
DO $$
DECLARE
  user_record RECORD;
  found_any BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'STEP 2: Records that will be cleaned up';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  FOR user_record IN
    SELECT
      email,
      confirmation_token IS NULL as null_token,
      created_at IS NULL as null_created,
      updated_at IS NULL as null_updated,
      confirmed_at IS NULL as not_confirmed
    FROM auth.users
    WHERE confirmation_token IS NULL
       OR created_at IS NULL
       OR updated_at IS NULL
  LOOP
    found_any := TRUE;
    RAISE NOTICE 'Email: %', user_record.email;
    RAISE NOTICE '  NULL confirmation_token: %', user_record.null_token;
    RAISE NOTICE '  NULL created_at: %', user_record.null_created;
    RAISE NOTICE '  NULL updated_at: %', user_record.null_updated;
    RAISE NOTICE '  Not confirmed: %', user_record.not_confirmed;
    RAISE NOTICE '';
  END LOOP;

  IF NOT found_any THEN
    RAISE NOTICE '✅ No problematic records found!';
  END IF;
  RAISE NOTICE '';
END $$;

-- Step 3: Delete INCOMPLETE records (NULL created_at or NULL confirmation_token + unconfirmed)
-- These are partial signup attempts that failed
DELETE FROM auth.users
WHERE (
    -- Missing created_at timestamp (completely corrupted)
    created_at IS NULL
    OR
    -- Missing confirmation_token AND not confirmed (incomplete signup)
    (confirmation_token IS NULL AND confirmed_at IS NULL AND email_confirmed_at IS NULL)
  );

-- Step 4: Fix CONFIRMED users with NULL timestamps (defensive)
-- If a user is confirmed but has NULL timestamps, set them to now
UPDATE auth.users
SET
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW()),
  confirmation_token = COALESCE(confirmation_token, '')
WHERE
  (created_at IS NULL OR updated_at IS NULL OR confirmation_token IS NULL)
  AND (confirmed_at IS NOT NULL OR email_confirmed_at IS NOT NULL);

-- Step 5: Clean up orphaned profiles
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 6: Verify the cleanup
DO $$
DECLARE
  remaining_nulls INTEGER;
  total_users INTEGER;
  total_profiles INTEGER;
  auth_count INTEGER;
  profile_count INTEGER;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'STEP 3: Verification';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  SELECT COUNT(*) INTO remaining_nulls
  FROM auth.users
  WHERE confirmation_token IS NULL
     OR created_at IS NULL
     OR updated_at IS NULL;

  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;

  RAISE NOTICE 'Remaining problematic records: %', remaining_nulls;
  RAISE NOTICE 'Total auth.users: %', total_users;
  RAISE NOTICE 'Total profiles: %', total_profiles;
  RAISE NOTICE '';

  IF remaining_nulls = 0 THEN
    RAISE NOTICE '✅✅✅ SUCCESS! All corrupted records cleaned up!';
  ELSE
    RAISE NOTICE '⚠️  WARNING: % problematic record(s) remain', remaining_nulls;
    RAISE NOTICE '   These may be confirmed users - review manually';
  END IF;
  RAISE NOTICE '';
END $$;

-- Step 7: Final instructions
DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'CLEANUP COMPLETE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: You are currently RATE LIMITED!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. WAIT 1 HOUR before trying to sign up again';
  RAISE NOTICE '   (Supabase rate limit: max 4 signup attempts per hour per email)';
  RAISE NOTICE '';
  RAISE NOTICE '2. Clear your browser cache completely:';
  RAISE NOTICE '   - Open DevTools (F12)';
  RAISE NOTICE '   - Open Console tab';
  RAISE NOTICE '   - Run: localStorage.clear(); sessionStorage.clear();';
  RAISE NOTICE '   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Win)';
  RAISE NOTICE '';
  RAISE NOTICE '3. After 1 hour, try signing up with hello@finarna.com';
  RAISE NOTICE '';
  RAISE NOTICE '4. If it still fails, use a DIFFERENT email temporarily:';
  RAISE NOTICE '   - yourname+test@gmail.com';
  RAISE NOTICE '   - test123@example.com';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
