# EduJourney - Configuration Quick Start Guide

**Time to Complete**: 30-40 minutes
**Difficulty**: Beginner-friendly

---

## 🎯 OVERVIEW

This guide walks you through configuring all external services needed for EduJourney. Follow these steps in order for the smoothest setup.

---

## ✅ CHECKLIST

- [ ] 1. Database Migrations (10 min)
- [ ] 2. RazorPay Setup (10 min)
- [ ] 3. Google OAuth Setup (10 min)
- [ ] 4. ConvertKit Setup (15 min) - Optional
- [ ] 5. Environment Variables (5 min)

---

## 1️⃣ DATABASE MIGRATIONS (10 min)

### Run SQL Migrations in Supabase

**Steps**:

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project
   - Click "SQL Editor" in left sidebar

2. **Run Migration 005** (Payment Tables)
   - Click "New Query"
   - Open file: `/migrations/005_payment_subscription.sql`
   - Copy entire contents
   - Paste into SQL editor
   - Click "Run" (bottom right)
   - Wait for success message

3. **Run Migration 006** (RLS Policies)
   - Click "New Query" again
   - Open file: `/migrations/006_payment_rls_policies.sql`
   - Copy entire contents
   - Paste into SQL editor
   - Click "Run"
   - Wait for success message

4. **Verify Tables Created**
   - Click "Table Editor" in left sidebar
   - Should see new tables:
     - `pricing_plans` (4 rows)
     - `subscriptions`
     - `payments`
     - `webhook_events`
     - `email_queue`

**✅ Done when**: All 5 tables visible in Table Editor

---

## 2️⃣ RAZORPAY SETUP (10 min)

### Create Test Account & Get API Keys

**Steps**:

1. **Sign Up for RazorPay**
   - Go to: https://dashboard.razorpay.com/signup
   - Fill in business details
   - Verify email
   - Complete KYC (basic info only for test mode)

2. **Get API Keys**
   - After login, go to: Settings → API Keys
   - Click "Generate Test Key"
   - Copy:
     - **Key ID**: `rzp_test_...`
     - **Key Secret**: `...` (click "Show" to reveal)
   - Save these for `.env.local`

3. **Get Webhook Secret**
   - Go to: Settings → Webhooks
   - Click "Add New Webhook"
   - Webhook URL: `http://localhost:9001/api/webhook/razorpay` (for local testing)
   - Active Events: Select ALL events (or minimum: payment.captured, payment.failed)
   - Click "Create Webhook"
   - Copy **Webhook Secret**: `whsec_...`
   - Save for `.env.local`

4. **Test Mode Configuration**
   - Ensure you're in "Test Mode" (toggle in top-left)
   - Test mode uses test keys (rzp_test_...)
   - Production mode uses live keys (rzp_live_...)

**✅ Done when**: You have 3 keys saved:
- Key ID
- Key Secret
- Webhook Secret

**📌 Important**: Keep these keys secret! Never commit to git.

---

## 3️⃣ GOOGLE OAUTH SETUP (10 min)

### Configure Google Cloud & Supabase

**Steps**:

1. **Create Google Cloud Project**
   - Go to: https://console.cloud.google.com/
   - Click "Select a project" → "New Project"
   - Name: "EduJourney"
   - Click "Create"

2. **Enable Google+ API**
   - Search for "Google+ API" in search bar
   - Click "Enable"

3. **Create OAuth Credentials**
   - Go to: APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "EduJourney Web"
   - Authorized JavaScript origins:
     - `http://localhost:9000`
     - `https://your-production-domain.com` (add later)
   - Authorized redirect URIs:
     - `https://<your-project>.supabase.co/auth/v1/callback`
     - To find this: Go to Supabase → Settings → API → Project URL
     - Format: `https://abcdefghijk.supabase.co/auth/v1/callback`
   - Click "Create"
   - Copy:
     - **Client ID**: `123456789.apps.googleusercontent.com`
     - **Client Secret**: `GOCSPX-...`

4. **Configure in Supabase**
   - Open Supabase Dashboard
   - Go to: Authentication → Providers
   - Find "Google" in list
   - Toggle to "Enabled"
   - Paste:
     - Client ID (from step 3)
     - Client Secret (from step 3)
   - Click "Save"

5. **Test OAuth Flow**
   - In Supabase, under URL Configuration:
   - Site URL: `http://localhost:9000` (for local dev)
   - Redirect URLs: `http://localhost:9000/**` (allow all local paths)
   - Click "Save"

**✅ Done when**: Google provider enabled in Supabase + credentials saved

**📌 Note**: OAuth won't work locally without HTTPS. Use ngrok or deploy to test OAuth.

---

## 4️⃣ CONVERTKIT SETUP (15 min) - Optional

### Email Marketing Configuration

**⚠️ Note**: This is optional for MVP. You can test payments without email integration.

**Steps**:

1. **Create ConvertKit Account**
   - Go to: https://convertkit.com/
   - Sign up for free plan (up to 1,000 subscribers)
   - Verify email

2. **Get API Credentials**
   - Go to: Account → Settings → Advanced
   - Copy:
     - **API Key**: Your public key
     - **API Secret**: Your private key
   - Save for `.env.local`

3. **Create a Form**
   - Go to: Grow → Landing Pages & Forms
   - Click "Create a Form"
   - Choose "Inline" form
   - Name: "EduJourney Signup"
   - Customize (or skip customization)
   - Click "Save"
   - Copy **Form ID** from URL: `https://app.convertkit.com/forms/designers/FORM_ID/edit`

4. **Create Tags**
   - Go to: Grow → Tags
   - Create these tags:
     - `new-signup`
     - `teacher`
     - `student`
     - `google-auth`
     - `email-auth`
     - `pro-subscriber`
     - `first-scan-complete`
   - After creating each, copy its **Tag ID** from URL
   - Save all IDs for `.env.local`

5. **Create Welcome Sequence** (Optional)
   - Go to: Automate → Sequences
   - Click "New Sequence"
   - Name: "Welcome to EduJourney"
   - Add 5 emails:
     - Day 0: Welcome & Getting Started
     - Day 2: Feature Overview
     - Day 5: Tips for Teachers
     - Day 7: Pro Plan Benefits
     - Day 14: Success Stories
   - Click "Save"
   - Copy **Sequence ID** from URL

**✅ Done when**: You have:
- API Key & Secret
- Form ID
- 7 Tag IDs
- Sequence ID (optional)

---

## 5️⃣ ENVIRONMENT VARIABLES (5 min)

### Configure .env.local

**Steps**:

1. **Copy Template**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in Values**
   Open `.env.local` and update:

   ```env
   # Supabase (you should already have these)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key

   # Gemini AI (you should already have this)
   VITE_GEMINI_API_KEY=your-gemini-key

   # RazorPay (from Step 2)
   RAZORPAY_KEY_ID=rzp_test_your_key_id
   RAZORPAY_KEY_SECRET=your_test_key_secret
   RAZORPAY_WEBHOOK_SECRET=whsec_your_webhook_secret

   # ConvertKit (from Step 4) - Optional
   CONVERTKIT_API_KEY=your_api_key
   CONVERTKIT_API_SECRET=your_api_secret
   CONVERTKIT_FORM_ID=123456
   CONVERTKIT_TAG_NEW_SIGNUP=123456
   CONVERTKIT_TAG_TEACHER=123457
   CONVERTKIT_TAG_STUDENT=123458
   CONVERTKIT_TAG_GOOGLE_AUTH=123459
   CONVERTKIT_TAG_EMAIL_AUTH=123460
   CONVERTKIT_TAG_PRO_SUBSCRIBER=123461
   CONVERTKIT_TAG_FIRST_SCAN_COMPLETE=123462
   CONVERTKIT_WELCOME_SEQUENCE=987654

   # Server
   PORT=9001
   ```

3. **Verify Configuration**
   ```bash
   # Check file exists
   ls -la .env.local

   # Check no syntax errors (should print variables)
   cat .env.local | grep RAZORPAY
   ```

**✅ Done when**: `.env.local` has all required keys

**🔒 Security**: Never commit `.env.local` to git! It's in `.gitignore`.

---

## 🧪 VERIFY SETUP

### Test Each Component

**1. Test Backend**
```bash
npm run server
# Should see: "✅ RazorPay initialized"
# Should see: "✅ Supabase connected successfully"
```

**2. Test Database**
```bash
# In browser console:
const { data } = await supabase.from('pricing_plans').select('*');
console.log(data); // Should show 4 plans
```

**3. Test RazorPay**
```bash
curl http://localhost:9001/api/pricing/plans
# Should return JSON with 4 pricing plans
```

**4. Test Google OAuth**
- Visit: http://localhost:9000
- Click "Sign up"
- "Sign up with Google" button should be visible
- Click it (will fail locally without HTTPS, that's OK)

**5. Test ConvertKit** (Optional)
```bash
# Test API connection
curl https://api.convertkit.com/v3/subscribers?api_secret=YOUR_API_SECRET
# Should return JSON (may be empty list)
```

---

## 🚀 READY TO TEST

You're all set! Now run the full test suite:

1. Follow: `TESTING_GUIDE.md`
2. Start with Phase 1 (Landing Page)
3. Complete all tests
4. Report any issues

---

## 🐛 TROUBLESHOOTING

### "Supabase connection failed"
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Verify project is active in Supabase dashboard

### "RazorPay not configured"
- Ensure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are in `.env.local`
- Restart backend server after adding keys

### "Table does not exist"
- Run migrations again (Step 1)
- Check for SQL errors in Supabase SQL Editor history

### "Google OAuth fails"
- Verify redirect URI matches exactly in Google Console
- Check Supabase has Google enabled
- Use ngrok for local HTTPS testing

### "Webhook not received"
- Use ngrok: `ngrok http 9001`
- Update webhook URL in RazorPay to ngrok URL
- Ensure webhook secret matches

---

## 📊 CONFIGURATION CHECKLIST

| Step | Component | Status | Time |
|------|-----------|--------|------|
| 1 | Database migrations | ⬜ | 10 min |
| 2 | RazorPay setup | ⬜ | 10 min |
| 3 | Google OAuth | ⬜ | 10 min |
| 4 | ConvertKit (optional) | ⬜ | 15 min |
| 5 | Environment variables | ⬜ | 5 min |

**Total Time**: 30-45 minutes

---

## 🎉 NEXT STEPS

After configuration:

1. ✅ Run: `npm run server` (backend)
2. ✅ Run: `npm run dev` (frontend)
3. ✅ Follow: `TESTING_GUIDE.md`
4. ✅ Test landing page flow
5. ✅ Test payment with test card
6. ✅ Verify everything works
7. 🚀 Deploy to production!

---

## 📞 SUPPORT RESOURCES

- **RazorPay Support**: https://razorpay.com/support/
- **Supabase Discord**: https://discord.supabase.com/
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **ConvertKit Support**: support@convertkit.com

---

*Configuration Guide v1.0 - Last updated 2026-02-10*
