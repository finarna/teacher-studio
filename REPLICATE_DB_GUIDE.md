# 🚀 Supabase Project Replication Guide

This guide will help you move your database to a fresh, healthy Supabase project with optimized schema and "Clean Data" (Official 2026 Syllabi).

**Latest Updates:**
- ✅ **v6.0 Schema** (March 2025): **REI v3.0 Enhanced**. Added Oracle Forecasting columns, generation rules, and 60-question limit support.
- ✅ **v5.5 Schema** (March 2025): Added RLS for Visual Notes (topic_sketches)
- ✅ **Auto-Mapping**: Questions automatically link to official syllabus topics
- ✅ **Complete RLS**: All tables secured with Row Level Security policies
- ✅ **54 Official Topics**: Physics (14), Chemistry (14), Biology (13), Math (13)

**Quick Jump:**
- [Step 1: Create Project](#step-1-create-a-new-supabase-project)
- [Step 2: Apply Schema](#step-2-apply-the-consolidated-schema)
- [Step 3: Environment Variables](#-step-3-update-environment-variables)
- [Step 4: Seed Core Data](#-step-4-initialize-clean-data)
- [Step 5: Restore REI Intelligence](#-step-5-restore-rei-v30-intelligence)
- [Troubleshooting](#-troubleshooting--fixes)

---

### Step 1: Create a New Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard).
2. Create naming your project.
3. Once the project is ready, open the **SQL Editor**.

### Step 2: Apply the Consolidated Schema
1. Open the file `CLEAN_START_SCHEMA_v6.0.sql` in this repository.
2. Copy the **entire contents**.
3. Paste it into the SQL Editor and click **Run**.
4. ✅ This creates all 35+ tables (including Razorpay, Learning Journey, and AI Content), RLS policies for every table, and the Unified Auth Trigger.
   * *Note: This version (v5.6) consolidates all migrations and includes all previous fixes.*

- **v6.0** (Latest): **REI v3.0 RESTORATION**. Added missing Oracle columns and `generation_rules` table. Fixes 30-question limit (now sets 60 for KCET).
- **v5.6**: Full Admin UPDATE/DELETE permissions (Fixes Publish), includes all previous fixes
- **v5.5**: Added RLS policies for topic_sketches (needed for AdminScanApproval counts)
- **v5.4**: Fixed KCET weightage for Math topics, includes all previous fixes
- **v5.3**: Added RLS policies for topic_question_mapping
- **v5.2**: Added missing questions table columns (domain, subject, exam_context, pedagogy)
- **v5.1**: Added flashcards table
- **v5.0**: Initial consolidated schema
- **v4.0**: Previous stable schema

### 👑 Step 2.1: Grant Admin Access (After Signup)
Once you've signed up, run this in the SQL Editor to gain full access (or edit the email at the bottom of the v5.4 script before running):
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

# 3. Seed Official 2026 Topics (NEET, JEE, KCET, CBSE)
npx tsx scripts/seedRealTopics.ts
# ✅ This creates 50+ topics with proper KCET weightage for all subjects
# Topics include: Physics (14), Chemistry (14), Biology (13), Math (13)

# 4. Seed Historical Trends Data (Real 2021 KCET Math)
npx tsx seedTrendsData.ts
# ✅ This syncs actual 2021 Math scans to the AI Trends tables (Patterns & Distributions)

# 5. Restore REI v3.0 Intelligence (60-Question Limit Fix)
npx tsx scripts/restoreFullREI.ts
# ✅ This populates predictive patterns (2021-2024) and sets the 60-question target for mocks.

# 6. Create a New User Account
# Simply go to the app (http://localhost:9000/) and Sign Up.
# The database will automatically create your profile.
```

**What gets seeded:**
- **Physics:** 14 Class 12 topics (Electrostatics, Optics, Modern Physics, etc.)
- **Chemistry:** 14 Class 12 topics (Physical, Inorganic, Organic Chemistry)
- **Biology:** 13 Class 12 topics (Genetics, Ecology, Physiology, etc.)
- **Math:** 13 Class 12 topics (Calculus, Algebra, Vectors, Probability, etc.)

All topics include proper `exam_weightage` for NEET, JEE, KCET, and CBSE.

---

## ✨ Optimizations Included

- **Official Syllabi**: Topics are matched to 2026 NEET/JEE/KCET/CBSE standards.
- **Complete Exam Coverage**: All topics include proper weightage for all applicable exam contexts (NEET, JEE, KCET, CBSE).
- **KCET Math Support**: Fixed weightage ensures all 13 Math topics appear in KCET Learning Journey.
- **Improved Indexes**: Faster queries for Practice Lab and Mock Tests.
- **Security**: Full RLS (Row Level Security) isolation for multi-user support.
- **Auto-Mapping**: Questions automatically link to official syllabus topics via `topic_question_mapping`.
- **Clean State**: Removed old, potentially corrupted scan data.

---

## 🔧 Troubleshooting & Fixes

### KCET Math Topics Not Showing

If you're using an older database and KCET Math topics don't appear in Learning Journey:

**Symptoms:**
- KCET → Math shows 0 topics
- Questions exist but aren't visible in topics view
- Other exam contexts (JEE, CBSE) work fine

**Fix:**
Run this in Supabase SQL Editor:
```bash
# Option 1: Apply the fix script (recommended)
cat FIX_KCET_WEIGHTAGE.sql
# Copy and paste into Supabase SQL Editor

# Option 2: Reseed all topics (clean slate)
npx tsx scripts/seedRealTopics.ts
```

**Why this happens:**
Math topics in older databases had weightage only for JEE and CBSE, missing KCET. The fix adds KCET weightage to all 13 Math topics.

See `KCET_MATH_FIX_SUMMARY.md` for detailed explanation.

### Missing Columns in Questions Table

If you encounter errors about missing columns (domain, subject, exam_context, pedagogy, year):

**Fix:**
```bash
cat FIX_MISSING_COLUMNS.sql
# Copy and paste into Supabase SQL Editor
```

This adds all missing metadata columns and RLS policies needed for AdminScanApproval and Learning Journey.

### Available Fix Scripts

Located in project root:
- `FIX_KCET_WEIGHTAGE.sql` - Adds KCET weightage to Math topics
- `FIX_MISSING_COLUMNS.sql` - Adds missing questions table columns and RLS policies

**Note:** Running `CLEAN_START_SCHEMA_v6.0.sql` includes all these fixes automatically.

---

## ❓ Need Help?
If you encounter any logic errors or missing data, let me know and I'll adjust the scripts!
