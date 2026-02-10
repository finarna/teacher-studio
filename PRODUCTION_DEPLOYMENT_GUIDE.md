# Production Deployment Guide - learn.dataziv.com

This guide covers deploying EduJourney to production with the payment integration.

---

## ✅ COMPLETED: Frontend API Configuration

All frontend components have been updated to use the centralized API helper (`lib/api.ts`) which automatically routes to your production domain.

### Updated Files:
1. ✅ `components/PricingTable.tsx` - Uses `getApiUrl('/api/pricing/plans')`
2. ✅ `components/PaymentModal.tsx` - Uses `getApiUrl()` for create-order and verify endpoints
3. ✅ `components/SubscriptionStatus.tsx` - Uses `getApiUrl('/api/subscription/status')`
4. ✅ `hooks/useSubscriptionLimits.ts` - Uses `getApiUrl()` for all API calls

### Environment Configuration:
Your `.env.local` is configured with:
```env
VITE_API_URL=https://learn.dataziv.com
RAZORPAY_KEY_ID=rzp_test_SEKB76i4nZd8T5
RAZORPAY_KEY_SECRET=A4DcqfTHkVNJ2rFDGV0t1X8R
```

---

## 🚀 DEPLOYMENT CHECKLIST

### 1. Backend Deployment (learn.dataziv.com)

**Environment Variables on Production Server:**

Create/update `.env.local` on your production server with:

```env
# Supabase
VITE_SUPABASE_URL=https://nsxjwjinxkehsubzesml.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Gemini AI
VITE_GEMINI_API_KEY=AIzaSyAKqwcOh0O5C3mi172QhCkPeaqn-8zAzdY

# RazorPay (Test Mode)
RAZORPAY_KEY_ID=rzp_test_SEKB76i4nZd8T5
RAZORPAY_KEY_SECRET=A4DcqfTHkVNJ2rFDGV0t1X8R
# NOTE: Get webhook secret from RazorPay dashboard (Step 2 below)
RAZORPAY_WEBHOOK_SECRET=<TO_BE_ADDED_AFTER_WEBHOOK_SETUP>

# Server
PORT=9001

# API URL (use production domain)
VITE_API_URL=https://learn.dataziv.com
```

**Start Backend Server:**
```bash
cd /path/to/edujourney
npm install
npm run server
```

**Verify Backend Running:**
```bash
curl https://learn.dataziv.com/api/pricing/plans
# Should return JSON with 4 pricing plans
```

---

### 2. Configure RazorPay Webhook for Production

**Step 1: Go to RazorPay Dashboard**
- Visit: https://dashboard.razorpay.com/
- Login with your account
- Ensure you're in "Test Mode" (toggle in top-left)

**Step 2: Create Webhook**
- Go to: Settings → Webhooks
- Click "Add New Webhook"
- **Webhook URL**: `https://learn.dataziv.com/api/webhook/razorpay`
- **Active Events**: Select ALL, or minimum:
  - `payment.captured`
  - `payment.failed`
  - `subscription.activated`
  - `subscription.cancelled`
- **Secret**: Click "Generate Secret" or provide your own
- Click "Create Webhook"

**Step 3: Copy Webhook Secret**
- After creation, copy the **Webhook Secret** (format: `whsec_...`)
- Add to production `.env.local`:
  ```env
  RAZORPAY_WEBHOOK_SECRET=whsec_your_secret_here
  ```
- Restart backend server:
  ```bash
  npm run server
  ```

**Step 4: Test Webhook**
- In RazorPay dashboard, find your webhook
- Click "Send Test Webhook"
- Select event type: `payment.captured`
- Click "Send"
- Check backend logs for webhook processing confirmation

---

### 3. Frontend Deployment

**Build Frontend:**
```bash
npm run build
```

**Deploy dist/ folder** to your hosting service (Vercel/Netlify/Cloudflare Pages)

**Environment Variables on Frontend Hosting:**

If deploying frontend separately (e.g., Vercel), add these environment variables:

```env
VITE_API_URL=https://learn.dataziv.com
VITE_SUPABASE_URL=https://nsxjwjinxkehsubzesml.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSyAKqwcOh0O5C3mi172QhCkPeaqn-8zAzdY
VITE_RAZORPAY_KEY_ID=rzp_test_SEKB76i4nZd8T5
```

**Note**: Only `VITE_*` variables are exposed to the browser. Never expose secrets like `RAZORPAY_KEY_SECRET` to frontend.

---

### 4. Database Migrations

**Run migrations in Supabase:**

1. Go to https://app.supabase.com
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Run these migrations in order:

**Migration 005: Payment Tables**
- Open `/Users/apple/FinArna/edujourney---universal-teacher-studio/migrations/005_payment_subscription.sql`
- Copy entire contents
- Paste into SQL editor
- Click "Run"
- Verify tables created: `pricing_plans`, `subscriptions`, `payments`, `webhook_events`, `email_queue`

**Migration 006: RLS Policies**
- Open `/Users/apple/FinArna/edujourney---universal-teacher-studio/migrations/006_payment_rls_policies.sql`
- Copy entire contents
- Paste into SQL editor
- Click "Run"
- Verify functions created: `get_user_subscription_limits()`, `increment_scan_usage()`, `can_user_create_scan()`

**Verify Data:**
- Go to "Table Editor"
- Check `pricing_plans` table has 4 rows (Free, Pro Monthly, Pro Yearly, Enterprise)

---

### 5. Google OAuth Configuration (Optional)

**Step 1: Google Cloud Console**
- Go to: https://console.cloud.google.com/
- Select your project or create new one
- Go to: APIs & Services → Credentials
- Click "Create Credentials" → "OAuth 2.0 Client ID"

**Step 2: Configure OAuth Client**
- Application type: "Web application"
- Name: "EduJourney Production"
- **Authorized JavaScript origins**:
  - `https://learn.dataziv.com`
  - `http://localhost:9000` (for local testing)
- **Authorized redirect URIs**:
  - `https://nsxjwjinxkehsubzesml.supabase.co/auth/v1/callback`
- Click "Create"
- Copy Client ID and Client Secret

**Step 3: Configure in Supabase**
- Go to Supabase Dashboard → Authentication → Providers
- Find "Google" in list
- Toggle to "Enabled"
- Paste Client ID and Client Secret
- Click "Save"

**Step 4: Update Site URL**
- In Supabase: Authentication → URL Configuration
- **Site URL**: `https://learn.dataziv.com`
- **Redirect URLs**:
  - `https://learn.dataziv.com/**`
  - `http://localhost:9000/**` (for local testing)
- Click "Save"

---

### 6. ConvertKit Email Integration (Optional)

**Step 1: Create ConvertKit Account**
- Go to: https://convertkit.com/
- Sign up for free plan
- Verify email

**Step 2: Get API Credentials**
- Go to: Account → Settings → Advanced
- Copy API Key and API Secret
- Add to production `.env.local`:
  ```env
  CONVERTKIT_API_KEY=your_api_key
  CONVERTKIT_API_SECRET=your_api_secret
  ```

**Step 3: Create Form**
- Go to: Grow → Landing Pages & Forms
- Create "Inline" form named "EduJourney Signup"
- Copy Form ID from URL
- Add to `.env.local`:
  ```env
  CONVERTKIT_FORM_ID=123456
  ```

**Step 4: Create Tags**
Create these tags and save their IDs:
- `new-signup`
- `teacher`
- `student`
- `google-auth`
- `email-auth`
- `pro-subscriber`
- `first-scan-complete`

Add to `.env.local`:
```env
CONVERTKIT_TAG_NEW_SIGNUP=123456
CONVERTKIT_TAG_TEACHER=123457
CONVERTKIT_TAG_STUDENT=123458
CONVERTKIT_TAG_GOOGLE_AUTH=123459
CONVERTKIT_TAG_EMAIL_AUTH=123460
CONVERTKIT_TAG_PRO_SUBSCRIBER=123461
CONVERTKIT_TAG_FIRST_SCAN_COMPLETE=123462
```

**Step 5: Create Welcome Sequence**
- Go to: Automate → Sequences
- Create sequence: "Welcome to EduJourney"
- Add 5 emails (Day 0, 2, 5, 7, 14)
- Copy Sequence ID from URL
- Add to `.env.local`:
  ```env
  CONVERTKIT_WELCOME_SEQUENCE=987654
  ```

---

## 🧪 TESTING PRODUCTION DEPLOYMENT

### Test 1: API Endpoints
```bash
# Test pricing plans
curl https://learn.dataziv.com/api/pricing/plans

# Should return:
[
  { "id": "...", "name": "Free", "price_inr": 0, ... },
  { "id": "...", "name": "Pro (Monthly)", "price_inr": 49900, ... },
  ...
]
```

### Test 2: Frontend Loads
- Visit: https://learn.dataziv.com
- Should see landing page with animations
- Click "Get Started" → Should see signup form
- Google sign-in button visible (if OAuth configured)

### Test 3: Payment Flow (Test Mode)
1. Sign up with email/password or Google
2. Navigate to pricing page
3. Click "Select Plan" on Pro Monthly
4. Payment modal opens
5. RazorPay checkout appears
6. Use test card: **4111 1111 1111 1111**
   - CVV: Any 3 digits
   - Expiry: Any future date
   - Name: Test User
7. Complete payment
8. Verify subscription activated
9. Check dashboard shows Pro plan

### Test 4: Webhook Delivery
1. Complete a test payment (Test 3)
2. Check RazorPay dashboard → Webhooks
3. View webhook delivery logs
4. Should see `200 OK` response
5. Check backend logs for webhook processing

### Test 5: Subscription Limits
1. Sign up with free account
2. Create 5 scans (free limit)
3. Try to create 6th scan
4. Should see upgrade prompt
5. Upgrade to Pro
6. Verify unlimited scans enabled

---

## 🔒 SECURITY CHECKLIST

- [ ] `.env.local` is in `.gitignore` (never committed)
- [ ] `RAZORPAY_KEY_SECRET` only on backend (never exposed to frontend)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only on backend
- [ ] HTTPS enabled on production domain (RazorPay requires HTTPS)
- [ ] Webhook secret configured and matches RazorPay dashboard
- [ ] CORS configured correctly on backend
- [ ] Supabase RLS policies enabled on all tables
- [ ] Rate limiting enabled on payment endpoints (optional)

---

## 🚨 TROUBLESHOOTING

### "Payment verification failed"
- Check `RAZORPAY_KEY_SECRET` matches dashboard
- Verify webhook signature calculation in backend
- Check backend logs for detailed error

### "Webhook not received"
- Verify webhook URL is `https://learn.dataziv.com/api/webhook/razorpay`
- Check webhook secret matches `.env.local`
- Ensure backend server is running and accessible
- Test webhook delivery from RazorPay dashboard

### "Subscription not activated"
- Check database `payments` table for payment record
- Check `subscriptions` table for subscription
- Verify webhook event logged in `webhook_events` table
- Check backend logs for webhook processing

### "API calls failing from frontend"
- Verify `VITE_API_URL=https://learn.dataziv.com` in `.env.local`
- Rebuild frontend: `npm run build`
- Clear browser cache
- Check browser console for CORS errors
- Verify backend CORS allows frontend origin

### "Google OAuth not working"
- Verify redirect URI matches exactly: `https://<project>.supabase.co/auth/v1/callback`
- Check authorized origins include your domain
- Ensure Google provider enabled in Supabase
- Check Supabase site URL is correct

---

## 📊 MONITORING

### Key Metrics to Monitor:

1. **Payment Success Rate**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE status = 'captured') as successful,
     COUNT(*) FILTER (WHERE status = 'failed') as failed,
     ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'captured') / COUNT(*), 2) as success_rate
   FROM payments;
   ```

2. **Subscription Growth**
   ```sql
   SELECT
     plan_name,
     COUNT(*) as active_subscriptions
   FROM subscriptions s
   JOIN pricing_plans p ON s.plan_id = p.id
   WHERE s.status = 'active'
   GROUP BY plan_name;
   ```

3. **Webhook Reliability**
   ```sql
   SELECT
     event_type,
     COUNT(*) as total_events,
     COUNT(DISTINCT event_id) as unique_events
   FROM webhook_events
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY event_type;
   ```

4. **Daily Revenue (Test Mode)**
   ```sql
   SELECT
     DATE(created_at) as date,
     SUM(amount / 100.0) as revenue_inr
   FROM payments
   WHERE status = 'captured'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

---

## 🎉 PRODUCTION READY

Once all tests pass and monitoring is in place:

1. ✅ Frontend deployed and accessible
2. ✅ Backend API responding correctly
3. ✅ RazorPay webhook configured and tested
4. ✅ Database migrations applied
5. ✅ Payment flow working end-to-end
6. ✅ Subscription limits enforced
7. ✅ Google OAuth working (optional)
8. ✅ ConvertKit emails sending (optional)

**You're ready to launch!** 🚀

---

## 📞 SUPPORT

**RazorPay Issues:**
- Dashboard: https://dashboard.razorpay.com/
- Support: https://razorpay.com/support/
- Docs: https://razorpay.com/docs/

**Supabase Issues:**
- Dashboard: https://app.supabase.com
- Discord: https://discord.supabase.com/
- Docs: https://supabase.com/docs

**ConvertKit Issues:**
- Dashboard: https://app.convertkit.com
- Support: support@convertkit.com
- Docs: https://developers.convertkit.com/

---

*Last Updated: 2026-02-10*
*Production Domain: learn.dataziv.com*
*Test Mode: RazorPay test credentials active*
