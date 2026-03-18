# Auth Signup Issue - Fix Guide

## Problem Summary

You're experiencing a signup error when trying to register with `hello@finarna.com`:

```
AuthApiError: Database error finding user
unable to fetch records: sql: Scan error on column index 3, name "confirmation_token":
converting NULL to string is unsupported
```

**Root Cause:** There's a corrupted/incomplete user record in the `auth.users` table where the `confirmation_token` is NULL. This happens when a signup attempt fails midway but leaves a partial record in the database.

## Why This Happens

1. **Partial Signup:** A previous signup attempt with `hello@finarna.com` started but failed
2. **NULL Token:** The database record was created with `confirmation_token = NULL`
3. **Schema Mismatch:** Supabase's auth server expects `confirmation_token` to be a string, not NULL
4. **Subsequent Failures:** All future signup attempts fail because the email already "exists" in a broken state

## Quick Fix (Recommended)

### Option 1: Run SQL in Supabase Dashboard (Fastest)

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/ozrkewbrwgtcunoerzka/sql/new

2. **Copy the Fix SQL:**
   - Open file: `supabase/FIX_AUTH_ISSUE.sql`
   - Copy the entire contents

3. **Execute:**
   - Paste into the SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Check Output:**
   - You should see messages showing:
     - Number of corrupted records found
     - Which emails were affected
     - Confirmation that cleanup completed

5. **Try Signup Again:**
   - Go back to your app
   - Try signing up with `hello@finarna.com`
   - It should work now!

### Option 2: Run TypeScript Script

```bash
npx tsx scripts/fix-auth-confirmation-token.ts
```

This script will:
- Attempt to clean up corrupted records
- If it can't (permission issues), it will show you the SQL to run manually
- Provide next steps

## What The Fix Does

The SQL script performs these operations:

1. **Identifies** incomplete signup records (NULL confirmation_token + not confirmed)
2. **Deletes** corrupted auth.users records older than 1 hour
3. **Updates** any confirmed users with NULL tokens to empty string
4. **Cleans up** orphaned profiles (profiles without auth.users)
5. **Verifies** the fix was successful

## Prevention

To prevent this in the future, the migration files have been updated:
- `supabase/migrations/20260303010000_fix_auth_confirmation_token.sql`

This migration can be run periodically or during deployments to clean up any corrupted records.

## Alternative Manual Fix

If you have access to the Supabase dashboard auth users table:

1. Go to: **Authentication → Users**
2. Search for `hello@finarna.com`
3. If found, click the three dots → **Delete User**
4. Try signing up again

## Verification

After running the fix:

1. ✅ Signup with `hello@finarna.com` should work
2. ✅ No "Database error finding user" errors
3. ✅ Profile should be created automatically via trigger
4. ✅ You should receive a confirmation email (if email confirmation is enabled)

## Additional Notes

### Email Confirmation Settings

Check your Supabase auth settings:
- Go to: **Authentication → Email Templates**
- If "Confirm email" is enabled, users must click the link in their email
- If disabled, users are auto-confirmed after signup

### Google OAuth vs Email/Password

You mentioned `finance.arna@gmail.com` works via Google login. This is because:
- Google OAuth creates a different type of auth record
- It doesn't use the `confirmation_token` field in the same way
- OAuth signups are auto-confirmed

## Troubleshooting

### If the fix doesn't work:

1. **Check Supabase Logs:**
   - Go to: **Logs → Auth Logs**
   - Look for errors related to signup

2. **Verify Migration Ran:**
   - In SQL Editor, run:
     ```sql
     SELECT COUNT(*) FROM auth.users WHERE confirmation_token IS NULL;
     ```
   - Should return 0 (or only show confirmed users)

3. **Check RLS Policies:**
   - The `handle_new_user()` trigger should auto-create profiles
   - Verify in: **Database → Functions → handle_new_user**

4. **Check for Email Conflicts:**
   - Ensure `hello@finarna.com` isn't in some other table or service

### Still Having Issues?

If the problem persists:
1. Share the exact error from browser console
2. Check Supabase dashboard logs
3. Verify the migration output messages
4. Try with a completely different email to isolate the issue

## Files Created

1. **supabase/FIX_AUTH_ISSUE.sql** - Direct SQL fix for Supabase dashboard
2. **supabase/migrations/20260303010000_fix_auth_confirmation_token.sql** - Migration for automated cleanup
3. **scripts/fix-auth-confirmation-token.ts** - TypeScript cleanup script
4. **AUTH_SIGNUP_FIX.md** (this file) - Complete documentation

## Support

If you need further assistance:
- Check Supabase docs: https://supabase.com/docs/guides/auth
- Supabase Discord: https://discord.supabase.com/
- GitHub Issues (for persistent bugs)
