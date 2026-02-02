# 🔧 URGENT: Apply Database Migration

## Problem
Your signup is failing with a **401 error** because user profiles can't be created from the frontend.

## Solution
Apply this database migration to auto-create user profiles via a trigger.

---

## Quick Fix (Copy & Paste)

### Step 1: Open Supabase SQL Editor
**URL:** https://supabase.com/dashboard/project/nsxjwjinxkehsubzesml/sql

### Step 2: Create New Query
Click **"New Query"** button

### Step 3: Paste This SQL

```sql
-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Step 4: Click "RUN"
Click the green **"Run"** button (or press Cmd/Ctrl + Enter)

### Step 5: Verify Success
You should see: **"Success. No rows returned"**

---

## What This Does
- Creates a database trigger that runs automatically when a new user signs up
- Inserts a profile into the `users` table with the user's email and metadata
- No more 401 errors!
- No more manual profile creation needed

---

## After Applying
1. Refresh your browser at `http://localhost:9003`
2. Try signing up again
3. It should work! ✅

---

**Need help?** Just copy the SQL above and paste it into the Supabase SQL Editor. That's it!
