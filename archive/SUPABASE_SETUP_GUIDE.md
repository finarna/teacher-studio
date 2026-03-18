# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `edujourney-vault` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free (sufficient for current usage)
4. Click **"Create new project"** and wait 2-3 minutes for setup

## Step 2: Get API Credentials

1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long JWT token)
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (different JWT token)

⚠️ **IMPORTANT**: Never commit the service_role key to git! It has full database access.

## Step 3: Update Environment Variables

Add these to your `.env.local` file:

```env
# Existing
VITE_GEMINI_API_KEY=AIzaSyAmHAg-6o6IvxguSa1kYS8YH35cwbMdboo

# NEW - Add Supabase credentials
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Create a **server-side** `.env` file (for backend only, not committed to git):

```env
# Server-side environment variables (DO NOT COMMIT)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Existing Redis config
REDIS_HOST=106.51.142.79
REDIS_PORT=6379
REDIS_PASSWORD=redis123!
```

## Step 4: Run Database Migrations

Once you have your Supabase project:

1. Open Supabase dashboard → **SQL Editor**
2. Run `migrations/001_initial_schema.sql` (creates tables)
3. Run `migrations/002_rls_policies.sql` (sets up security)

Alternatively, use the Supabase CLI:
```bash
npx supabase db push
```

## Step 5: Setup Storage Buckets

Run the storage setup script:
```bash
npm run setup:storage
```

Or manually in Supabase dashboard → **Storage**:
1. Create bucket: `edujourney-images`
2. Make it public: Settings → Public bucket (toggle on)
3. Add CORS policy: Allow `*` origin for development

## Step 6: Enable Authentication

In Supabase dashboard:
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider (should be on by default)
3. Go to **URL Configuration**
4. Add redirect URLs:
   - `http://localhost:9000/**`
   - `http://localhost:9001/**`
   - Your production domain (when ready)

## Step 7: Verify Setup

Check that everything is working:

```bash
# Test database connection
npm run test:db

# Test storage access
npm run test:storage

# Start new Supabase-based server
npm run server
```

## Troubleshooting

### "Failed to connect to Supabase"
- Check that SUPABASE_URL is correct (no trailing slash)
- Verify keys are copied completely (they're very long)
- Ensure project is fully initialized (wait 2-3 minutes after creation)

### "Row Level Security policy violation"
- Check that RLS policies were applied (002_rls_policies.sql)
- Verify you're using service_role key on server-side
- For testing, temporarily disable RLS on a table

### "Storage bucket not found"
- Run setup:storage script
- Or manually create `edujourney-images` bucket in dashboard

## Next Steps

After completing this setup:
1. ✅ Credentials added to `.env.local` and `.env`
2. ✅ Database schema migrated
3. ✅ Storage buckets created
4. ✅ Auth enabled

**Ready to proceed with Phase 2: Backend Implementation**

---

## Security Checklist

- [ ] `.env` added to `.gitignore`
- [ ] Service role key never committed to git
- [ ] RLS policies enabled on all tables
- [ ] Storage buckets have appropriate access policies
- [ ] Auth redirect URLs configured for your domains
