# Troubleshooting Steps - Auth Signup Issue

You've already run the cleanup scripts but the issue persists. Let's diagnose what's happening.

## Step-by-Step Diagnostic Process

### Step 1: Run Diagnostic SQL

First, let's see what's actually in the database:

1. Go to: https://supabase.com/dashboard/project/ozrkewbrwgtcunoerzka/sql/new
2. Copy and paste the contents of: `supabase/DIAGNOSE_AUTH.sql`
3. Click "Run"
4. **Read the output carefully** - it will tell you:
   - If NULL confirmation_token records still exist
   - If hello@finarna.com record exists
   - Whether it's confirmed or not
   - Sync status between auth and profiles

### Step 2: Based on Diagnostic Results

#### Scenario A: hello@finarna.com still exists in database

If CHECK 3 shows the record exists:

**Solution:** Run the force delete script:
1. Go to SQL Editor: https://supabase.com/dashboard/project/ozrkewbrwgtcunoerzka/sql/new
2. Copy contents of: `supabase/FORCE_DELETE_HELLO_FINARNA.sql`
3. Run it
4. Verify it says "SUCCESS: hello@finarna.com has been deleted"
5. Try signing up again

#### Scenario B: No record exists but signup still fails

If CHECK 3 shows no record but signup still fails:

**Possible causes:**
1. Supabase email confirmation settings
2. Rate limiting
3. Auth configuration issues
4. Browser cache

**Solutions:**

##### Check Email Confirmation Settings
1. Go to: https://supabase.com/dashboard/project/ozrkewbrwgtcunoerzka/auth/users
2. Click "Configuration" tab
3. Check "Enable email confirmations"
   - If enabled: User must click email link before account is active
   - If disabled: User is auto-confirmed after signup

4. Check "Secure email change"
   - Should be enabled for production

##### Check Rate Limiting
1. Go to Auth Logs: https://supabase.com/dashboard/project/ozrkewbrwgtcunoerzka/logs/auth-logs
2. Look for entries with hello@finarna.com
3. Check if there are rate limit errors
4. If rate limited, wait 1 hour and try again

##### Clear Browser Cache & Cookies
```bash
# In browser DevTools Console:
localStorage.clear();
sessionStorage.clear();
# Then hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

#### Scenario C: NULL confirmation_token records still exist

If CHECK 1 shows NULL tokens still exist:

**This means the cleanup scripts didn't run with proper permissions.**

**Solution:**
1. Go to SQL Editor
2. Run this **with admin privileges**:
```sql
-- Force delete ALL incomplete records with NULL confirmation_token
DELETE FROM auth.users
WHERE confirmation_token IS NULL
  AND confirmed_at IS NULL
  AND email_confirmed_at IS NULL;
```

### Step 3: Check Supabase Auth Logs

While trying to sign up:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Click "Clear" to clear existing requests
4. Try signing up with hello@finarna.com
5. Look for the POST request to `/auth/v1/signup`
6. Check the response:
   - Status code (should be 200 for success)
   - Response body (will show detailed error)

**Common status codes:**
- `500` = Server error (database issue, our current problem)
- `422` = Validation error (email format, password too short)
- `429` = Rate limited (too many attempts)
- `400` = Bad request (email already registered)

### Step 4: Alternative - Use Supabase Dashboard to Manually Create User

If all else fails, you can manually create the user:

1. Go to: https://supabase.com/dashboard/project/ozrkewbrwgtcunoerzka/auth/users
2. Click "Add user" → "Create new user"
3. Enter:
   - Email: hello@finarna.com
   - Password: (your desired password)
   - Auto Confirm User: ✅ (check this)
4. Click "Create user"
5. Try logging in with those credentials

This bypasses the signup flow entirely.

## Advanced Debugging

### Check Supabase Auth Configuration

1. Go to: https://supabase.com/dashboard/project/ozrkewbrwgtcunoerzka/settings/auth
2. Verify these settings:

**Email Auth:**
- ✅ Enable email signups
- ✅ Enable email confirmations (if you want confirmation emails)
- Site URL: Should match your app URL

**Password Requirements:**
- Minimum length: 6 (matches your frontend validation)

**Session Security:**
- JWT expiry: Default (3600 seconds)

### Check Database Trigger

Verify the auto-profile creation trigger is working:

```sql
-- Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Should return:
- trigger_name: `on_auth_user_created`
- event_manipulation: `INSERT`
- event_object_table: `users`
- action_statement: Should reference `handle_new_user()`

### Test with Different Email

Try signing up with a completely different email (not hello@finarna.com):
- Example: `test-$(date +%s)@example.com`
- Or: `yourname+test@gmail.com` (Gmail plus addressing)

**If this works:** The issue is specific to hello@finarna.com
**If this fails:** The issue is systemic (auth configuration problem)

## Nuclear Option: Reset Auth Schema

⚠️ **WARNING: This will delete ALL users!** Only do this in development!

```sql
-- Delete all auth users (cascades to profiles via FK)
TRUNCATE auth.users CASCADE;

-- Verify cleanup
SELECT COUNT(*) FROM auth.users;
SELECT COUNT(*) FROM public.profiles;
-- Both should return 0
```

Then try signing up fresh.

## What We Fixed

Even though the issue persists, we did fix these things:

1. ✅ Added autocomplete attributes to password inputs (removes browser warnings)
2. ✅ Created diagnostic tools to identify the exact issue
3. ✅ Created cleanup migrations for NULL confirmation_token
4. ✅ Created force delete script for specific emails

## Next Steps

1. **Run DIAGNOSE_AUTH.sql** and share the output
2. **Check browser Network tab** during signup attempt
3. **Check Supabase Auth Logs** for detailed error messages
4. **Try a different email** to isolate if it's email-specific

## Still Not Working?

If you've tried all of the above and it still doesn't work, the issue might be:

1. **Supabase service issue** - Check https://status.supabase.com/
2. **Project-specific configuration** - Contact Supabase support
3. **Network/firewall issue** - Check if auth endpoints are accessible
4. **Browser extension blocking** - Try in incognito mode

Share the results of the diagnostic SQL and I can help further!
