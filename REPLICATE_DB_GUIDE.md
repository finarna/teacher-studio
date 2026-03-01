# 🚀 Supabase Project Replication Guide

This guide will help you move your database to a fresh, healthy Supabase project with optimized schema and "Clean Data" (Official 2026 Syllabi).

---

### Step 1: Create a New Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard).
2. Create naming your project.
3. Once the project is ready, open the **SQL Editor**.

### Step 2: Apply the Consolidated Schema
1. Open the file `CLEAN_START_SCHEMA_v5.sql` in this repository.
2. Copy the **entire contents**.
3. Paste it into the SQL Editor and click **Run**.
4. ✅ This creates all 35+ tables (including Razorpay, Learning Journey, and AI Content), RLS policies for every table, and the Unified Auth Trigger.
   * *Note: This version (v5.0) consolidates all 17 previous migrations into one definitive script.*

### 👑 Step 2.1: Grant Admin Access (After Signup)
Once you've signed up, run this in the SQL Editor to gain full access (or edit the email at the bottom of the v5.0 script before running):
```sql
-- Replace 'YOUR_EMAIL' with your actual email
UPDATE public.profiles SET role = 'admin', subscription_status = 'active' WHERE email = 'YOUR_EMAIL';
UPDATE public.users SET role = 'admin' WHERE email = 'YOUR_EMAIL';
```

---

## 🔐 Step 3: Update Environment Variables

1. Open `.env.local` in your local code editor.
2. Update the following values with your new project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-new-project.supabase.co
   SUPABASE_URL=https://your-new-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-new-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key
   ```
3. Restart your dev server: `npm run dev:all`

---

## 🌱 Step 4: Initialize Clean Data

Run the following commands in your terminal to populate official topics and setup storage:

```bash
# 1. Create Storage Buckets (Images/Sketches)
npx tsx scripts/setup-supabase-storage.ts

# 2. Seed Official 2026 Topics (NEET, JEE, KCET)
npx tsx scripts/seedRealTopics.ts

# 3. Create a New User Account
# Simply go to the app (http://localhost:9000/) and Sign Up.
# The database will automatically create your profile.
```

---

## ✨ Optimizations Included

- **Official Syllabi**: Topics are matched to 2026 NEET/JEE/KCET standards.
- **Improved Indexes**: Faster queries for Practice Lab and Mock Tests.
- **Security**: Full RLS (Row Level Security) isolation for multi-user support.
- **Clean State**: Removed old, potentially corrupted scan data.

---

## ❓ Need Help?
If you encounter any logic errors or missing data, let me know and I'll adjust the scripts!
