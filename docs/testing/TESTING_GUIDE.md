# EduJourney Landing Page & Payment System - Testing Guide

**Version**: 1.0
**Last Updated**: 2026-02-10
**Estimated Testing Time**: 60-90 minutes

---

## 📋 PRE-REQUISITES

Before testing, ensure you have completed:

- [ ] Database migrations run in Supabase
- [ ] Environment variables configured in `.env.local`
- [ ] RazorPay test account created
- [ ] ConvertKit account created (optional for Phase 1-4)
- [ ] Google OAuth configured in Supabase (optional for Phase 5)

---

## 🚀 QUICK START

```bash
# 1. Start the backend server
npm run server
# Backend runs on http://localhost:9001

# 2. In a new terminal, start the frontend
npm run dev
# Frontend runs on http://localhost:9000

# 3. Open browser
open http://localhost:9000
```

---

## 🧪 TEST SUITE

### PHASE 1: Landing Page Testing (15 min)

#### Test 1.1: First Visit - Landing Page Display
**Goal**: Verify landing page shows on first visit

**Steps**:
1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Delete `edujourney_landing_seen` if it exists
4. Navigate to `http://localhost:9000`
5. Landing page should display

**✅ Pass Criteria**:
- Landing page loads without errors
- Hero section visible with animated gradient
- Navigation bar sticky at top
- "Get Started" button visible

**🐛 Troubleshooting**:
- If landing doesn't show: Check console for errors
- If animations broken: Verify framer-motion installed
- If styles missing: Run `npm install` again

---

#### Test 1.2: Navigation & Scrolling
**Goal**: Verify all sections scroll smoothly

**Steps**:
1. Click "Features" in navigation
2. Page should smooth-scroll to features section
3. Click "Pricing" in navigation
4. Page should smooth-scroll to pricing
5. Click "FAQ" in navigation
6. Page should smooth-scroll to FAQ

**✅ Pass Criteria**:
- Smooth scroll animation
- Navigation highlights active section
- Mobile menu works on small screens

---

#### Test 1.3: Mobile Responsiveness
**Goal**: Verify mobile layout

**Steps**:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M or Cmd+Shift+M)
3. Select "iPhone 12 Pro"
4. Scroll through all sections
5. Click hamburger menu icon
6. Mobile menu should slide in

**✅ Pass Criteria**:
- All sections display properly
- No horizontal scroll
- Text readable without zooming
- Buttons accessible
- Hamburger menu functional

---

#### Test 1.4: "Get Started" Flow
**Goal**: Verify transition from landing to auth

**Steps**:
1. On landing page, click "Get Started Free" button
2. Should navigate to authentication screen
3. Close browser
4. Reopen and navigate to `http://localhost:9000`
5. Landing page should NOT show again (goes directly to auth)

**✅ Pass Criteria**:
- First click navigates to auth
- `edujourney_landing_seen` = true in localStorage
- Landing doesn't show on subsequent visits
- Can reset by clearing localStorage

---

### PHASE 2: Authentication Testing (15 min)

#### Test 2.1: Email Signup
**Goal**: Verify email/password signup works

**Steps**:
1. Clear localStorage (landing will show)
2. Click "Get Started"
3. On auth screen, click "Sign up"
4. Fill in:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "test123456"
   - Confirm Password: "test123456"
5. Click "Sign Up"
6. Wait for success

**✅ Pass Criteria**:
- No validation errors
- Loading spinner shows
- Redirects to app on success
- User created in Supabase (check dashboard)
- Free subscription auto-created (check `subscriptions` table)

**🐛 Troubleshooting**:
- "Email already exists": Use a different email
- "Invalid credentials": Check Supabase connection
- No redirect: Check browser console for errors

---

#### Test 2.2: Google OAuth Signup
**Goal**: Verify Google sign-in works

**Steps**:
1. Log out from current session
2. On auth screen, click "Sign up"
3. Click "Sign up with Google" button
4. Should redirect to Google authorization
5. Select Google account
6. Grant permissions
7. Should redirect back to app

**✅ Pass Criteria**:
- Google auth window opens
- Can select Google account
- Redirects back to app
- User created in Supabase
- Free subscription auto-created
- Tagged as "google-auth" in ConvertKit (if configured)

**⚠️ Note**: Requires Google OAuth configured in Supabase Dashboard

---

#### Test 2.3: Login Flow
**Goal**: Verify existing users can log in

**Steps**:
1. Log out if logged in
2. Click "Sign in"
3. Enter email and password from Test 2.1
4. Click "Sign In"
5. Should authenticate successfully

**✅ Pass Criteria**:
- No errors
- Redirects to app
- User session persisted (refresh page, still logged in)

---

#### Test 2.4: Validation Errors
**Goal**: Verify form validation works

**Steps**:
1. On signup form, leave all fields empty
2. Click "Sign Up"
3. Should show error: "Please fill in all required fields"
4. Enter mismatched passwords
5. Should show error: "Passwords do not match"
6. Enter invalid email (no @)
7. Should show error: "Please enter a valid email"

**✅ Pass Criteria**:
- Appropriate error messages
- Red error banner displayed
- Form doesn't submit
- Can dismiss errors

---

### PHASE 3: Database & Migrations (10 min)

#### Test 3.1: Verify Tables Created
**Goal**: Confirm database migrations ran successfully

**Steps**:
1. Open Supabase Dashboard
2. Go to Table Editor
3. Check for tables:
   - `pricing_plans`
   - `subscriptions`
   - `payments`
   - `webhook_events`
   - `email_queue`

**✅ Pass Criteria**:
- All 5 tables exist
- Tables have correct columns
- No migration errors in SQL editor

---

#### Test 3.2: Check Seed Data
**Goal**: Verify pricing plans seeded correctly

**Steps**:
1. In Supabase, go to Table Editor → `pricing_plans`
2. Should see 4 rows:
   - Free (₹0)
   - Pro Monthly (₹499)
   - Pro Yearly (₹4999)
   - Enterprise (₹0, custom)

**✅ Pass Criteria**:
- 4 pricing plans exist
- Prices correct
- Features JSON populated
- All plans active (`is_active = true`)

---

#### Test 3.3: Check Auto-Created Subscription
**Goal**: Verify free subscription auto-created for new users

**Steps**:
1. Sign up with new email (Test 2.1)
2. In Supabase, go to `subscriptions` table
3. Filter by your user_id
4. Should see 1 row with:
   - `status = 'active'`
   - `scans_limit = 5`
   - `scans_used = 0`
   - `plan_id` = Free plan ID

**✅ Pass Criteria**:
- Subscription exists
- Status is active
- Linked to Free plan
- Created automatically on signup

---

### PHASE 4: Payment Flow Testing (20 min)

#### Test 4.1: Fetch Pricing Plans API
**Goal**: Verify pricing API endpoint works

**Steps**:
1. Open browser DevTools → Network tab
2. Log in to app
3. Navigate to pricing page (you may need to add a route)
4. Look for request to `/api/pricing/plans`
5. Should return 4 pricing plans

**✅ Pass Criteria**:
- Request succeeds (200 OK)
- Response contains 4 plans
- Plans sorted by `sort_order`
- All plans active

**Manual API Test**:
```bash
curl http://localhost:9001/api/pricing/plans
# Should return JSON array of 4 plans
```

---

#### Test 4.2: Get Subscription Status API
**Goal**: Verify user can fetch their subscription

**Steps**:
1. Get your auth token:
   ```javascript
   // In browser console:
   const { data } = await supabase.auth.getSession();
   console.log(data.session.access_token);
   ```
2. Test API:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     http://localhost:9001/api/subscription/status
   ```

**✅ Pass Criteria**:
- Returns subscription details
- Shows Free plan
- `scans_used = 0`, `scans_limit = 5`
- `can_create_scan = true`

---

#### Test 4.3: RazorPay Payment Flow (Test Mode)
**Goal**: Complete end-to-end payment

**⚠️ Requires**: RazorPay test keys in .env.local

**Steps**:
1. Log in as test user
2. Navigate to pricing/upgrade section
3. Click "Select Plan" on Pro Monthly (₹499)
4. Payment modal should open
5. Click "Pay ₹499"
6. RazorPay checkout opens
7. Use test card:
   - Card: `4111 1111 1111 1111`
   - CVV: `123`
   - Expiry: `12/25`
   - Name: "Test User"
8. Click "Pay"
9. Wait for success

**✅ Pass Criteria**:
- Modal opens without errors
- RazorPay checkout loads
- Payment succeeds
- Modal closes
- Success toast appears
- Subscription updated to Pro

**🐛 Troubleshooting**:
- "Payment service not configured": Add RazorPay keys
- Signature verification failed: Check webhook secret
- Payment not captured: Check backend logs

---

#### Test 4.4: Verify Payment in Database
**Goal**: Confirm payment recorded

**Steps**:
1. After successful payment (Test 4.3)
2. Go to Supabase → `payments` table
3. Find your payment record
4. Should see:
   - `status = 'captured'`
   - `razorpay_payment_id` populated
   - `amount = 49900` (₹499 in paisa)

**✅ Pass Criteria**:
- Payment record exists
- Status is captured
- Amount correct
- RazorPay IDs populated

---

#### Test 4.5: Verify Subscription Upgraded
**Goal**: Confirm subscription changed to Pro

**Steps**:
1. Go to Supabase → `subscriptions` table
2. Find your subscription
3. Should see:
   - `status = 'active'`
   - `plan_id` = Pro Monthly plan ID
   - `scans_limit = -1` (unlimited)
   - `cancel_at_period_end = false`

**✅ Pass Criteria**:
- Plan upgraded to Pro
- Unlimited scans (`-1`)
- Still active
- No cancellation scheduled

---

### PHASE 5: Webhook Testing (15 min)

#### Test 5.1: Test Webhook Endpoint
**Goal**: Verify webhook accepts RazorPay events

**⚠️ Requires**: ngrok or localtunnel for testing webhooks locally

**Setup**:
```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start ngrok tunnel
ngrok http 9001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

**Steps**:
1. In RazorPay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://YOUR_NGROK_URL/api/webhook/razorpay`
3. Select events:
   - payment.captured
   - payment.failed
   - subscription.activated
   - subscription.cancelled
4. Save webhook
5. Trigger test event from RazorPay dashboard
6. Check backend logs for webhook received

**✅ Pass Criteria**:
- Webhook URL accepts POST requests
- Signature verification passes
- Event logged in `webhook_events` table
- No errors in console

---

#### Test 5.2: Check Webhook Idempotency
**Goal**: Verify duplicate events ignored

**Steps**:
1. Trigger same webhook event twice (Test 5.1)
2. Check `webhook_events` table
3. Should see 2 rows with same `event_id`
4. First should have `processed = true`
5. Second should be skipped (idempotency check)

**✅ Pass Criteria**:
- Both events logged
- Only first one processed
- No duplicate subscriptions/payments created
- Console logs "Already processed"

---

### PHASE 6: Subscription Limits & Feature Gating (10 min)

#### Test 6.1: Free User - Scan Limit Enforcement
**Goal**: Verify free users hit 5-scan limit

**⚠️ Requires**: Scan creation flow in your app

**Steps**:
1. Log in as Free user (new signup)
2. Create 5 scans (one by one)
3. After each, check `subscriptions.scans_used`
4. Should increment: 0 → 1 → 2 → 3 → 4 → 5
5. Attempt 6th scan
6. Should be blocked with error message

**✅ Pass Criteria**:
- First 5 scans succeed
- Usage increments correctly
- 6th scan blocked
- Error message: "Scan limit reached"
- Upgrade prompt shown

---

#### Test 6.2: Pro User - Unlimited Scans
**Goal**: Verify Pro users have no limits

**Steps**:
1. Upgrade to Pro (Test 4.3) or manually update subscription
2. Create 10+ scans
3. Should all succeed
4. Check `subscriptions.scans_used`
5. Should increment but never block

**✅ Pass Criteria**:
- No scan limit
- All scans succeed
- Usage tracked correctly
- No error messages

---

#### Test 6.3: Subscription Status Display
**Goal**: Verify UI shows correct subscription info

**Steps**:
1. Log in as Free user
2. Navigate to settings or dashboard
3. Should see SubscriptionStatus component
4. Displays:
   - Plan name: "Free"
   - Scans used: "X / 5"
   - Progress bar (visual usage)
   - Upgrade button
5. Upgrade to Pro
6. Refresh page
7. Should update to:
   - Plan name: "Pro Monthly"
   - Scans used: "X / Unlimited"
   - No progress bar (unlimited)
   - No upgrade button

**✅ Pass Criteria**:
- Accurate plan display
- Correct usage numbers
- Progress bar color-coded (green → yellow → red)
- Upgrade CTA for free users only

---

### PHASE 7: Email Integration Testing (Optional - 10 min)

**⚠️ Requires**: ConvertKit account configured

#### Test 7.1: New User Subscription
**Goal**: Verify email captured on signup

**Steps**:
1. Sign up new user (Test 2.1)
2. Check `email_queue` table
3. Should see 1 row:
   - `template_type = 'welcome'` or similar
   - `status = 'pending'`
   - `email` = your test email
4. Check ConvertKit dashboard
5. User should appear in subscribers list

**✅ Pass Criteria**:
- Email queued in database
- Subscriber added to ConvertKit
- Tagged with "new-signup"
- Welcome sequence triggered

---

#### Test 7.2: Payment Success Email
**Goal**: Verify email sent after payment

**Steps**:
1. Complete payment (Test 4.3)
2. Check `email_queue` table
3. Should see row with `template_type = 'payment_success'`
4. Check ConvertKit
5. User tagged with "pro-subscriber"

**✅ Pass Criteria**:
- Payment success email queued
- Pro tag applied
- Template data includes subscription ID

---

### PHASE 8: Google OAuth Testing (Optional - 10 min)

**⚠️ Requires**: Google OAuth configured in Supabase

#### Test 8.1: Google Sign-Up Flow
**Goal**: Complete Google OAuth signup

**Steps**:
1. Log out
2. Click "Sign up"
3. Click "Sign up with Google"
4. Select Google account
5. Grant permissions
6. Redirected to app
7. User created in Supabase

**✅ Pass Criteria**:
- OAuth flow completes
- No errors
- User authenticated
- Email from Google account
- Free subscription auto-created

---

#### Test 8.2: Google Sign-In Flow
**Goal**: Existing Google user can sign in

**Steps**:
1. Log out after Test 8.1
2. Click "Sign in"
3. Click "Sign in with Google"
4. Should recognize existing account
5. No permission prompt (already granted)
6. Immediate redirect to app

**✅ Pass Criteria**:
- Fast authentication (no new permissions)
- Same user ID as signup
- Session persisted

---

## 🎯 COMPREHENSIVE END-TO-END TEST (Full Flow)

**Duration**: 15 minutes
**Goal**: Test complete user journey

### Scenario: Teacher Discovers EduJourney → Signs Up → Upgrades → Uses Platform

**Steps**:

1. **Discovery**
   - Clear all localStorage
   - Visit `http://localhost:9000`
   - Landing page displays
   - Read features, scroll to pricing
   - Click "Get Started Free"

2. **Signup**
   - Choose signup option:
     - Option A: Email signup
     - Option B: Google OAuth
   - Complete signup
   - Redirected to app

3. **First Experience**
   - Dashboard loads
   - See "Free Plan" badge
   - Notice "5 scans remaining"
   - Create first scan

4. **Hit Limit**
   - Create 5 scans total
   - Attempt 6th scan
   - See "Upgrade to Pro" modal
   - Click "Upgrade Now"

5. **Payment**
   - Pricing table loads
   - Select "Pro Monthly"
   - Payment modal opens
   - Enter test card
   - Payment succeeds
   - Modal closes with success message

6. **Post-Upgrade**
   - Dashboard updates to "Pro"
   - Shows "Unlimited scans"
   - Create more scans (unlimited)
   - All succeed

7. **Verification**
   - Check Supabase:
     - User in `auth.users`
     - Active Pro subscription
     - Payment captured
     - Usage tracked
   - Check email (if ConvertKit configured):
     - Welcome email received
     - Payment success email received

**✅ Pass Criteria**: All steps complete without errors

---

## 🐛 COMMON ISSUES & FIXES

### Issue 1: "Supabase configuration missing"
**Fix**: Check `.env.local` has correct Supabase keys

### Issue 2: "Payment service not configured"
**Fix**: Add RazorPay keys to `.env.local`

### Issue 3: Landing page doesn't show
**Fix**: Clear localStorage → `edujourney_landing_seen`

### Issue 4: Signature verification failed
**Fix**: Ensure `RAZORPAY_KEY_SECRET` matches dashboard

### Issue 5: Webhook not received
**Fix**: Use ngrok for local testing, update webhook URL

### Issue 6: Free subscription not auto-created
**Fix**: Run migration `005_payment_subscription.sql` again (has trigger)

### Issue 7: Google OAuth fails
**Fix**:
1. Check authorized origins in Google Console
2. Verify redirect URI matches Supabase
3. Enable Google provider in Supabase Dashboard

---

## 📊 TEST RESULTS CHECKLIST

| Phase | Test | Status | Notes |
|-------|------|--------|-------|
| **Landing Page** |
| 1.1 | First visit display | ⬜ | |
| 1.2 | Navigation & scroll | ⬜ | |
| 1.3 | Mobile responsive | ⬜ | |
| 1.4 | Get Started flow | ⬜ | |
| **Authentication** |
| 2.1 | Email signup | ⬜ | |
| 2.2 | Google OAuth signup | ⬜ | |
| 2.3 | Login flow | ⬜ | |
| 2.4 | Validation errors | ⬜ | |
| **Database** |
| 3.1 | Tables created | ⬜ | |
| 3.2 | Seed data | ⬜ | |
| 3.3 | Auto subscription | ⬜ | |
| **Payment** |
| 4.1 | Pricing API | ⬜ | |
| 4.2 | Subscription API | ⬜ | |
| 4.3 | Payment flow | ⬜ | |
| 4.4 | Payment in DB | ⬜ | |
| 4.5 | Subscription upgraded | ⬜ | |
| **Webhooks** |
| 5.1 | Webhook endpoint | ⬜ | |
| 5.2 | Idempotency | ⬜ | |
| **Feature Gating** |
| 6.1 | Free user limits | ⬜ | |
| 6.2 | Pro unlimited | ⬜ | |
| 6.3 | Status display | ⬜ | |
| **Email** (Optional) |
| 7.1 | New user email | ⬜ | |
| 7.2 | Payment email | ⬜ | |
| **OAuth** (Optional) |
| 8.1 | Google signup | ⬜ | |
| 8.2 | Google signin | ⬜ | |

**Overall Completion**: ___/25 tests passed

---

## 🎓 TESTING BEST PRACTICES

1. **Use Test Accounts**: Don't test with real emails/cards
2. **Check Logs**: Backend console shows useful debugging info
3. **Clear Cache**: Between tests, clear localStorage/cookies
4. **Use DevTools**: Network tab shows API calls
5. **Test Mobile**: Always test responsive design
6. **Document Issues**: Note any bugs in issues tracker

---

## 📞 SUPPORT

**Issues Found?**
- Check console logs first
- Review `.env.local` configuration
- Verify database migrations ran
- Check network tab for failed requests
- Review backend logs for errors

**Need Help?**
- RazorPay Docs: https://razorpay.com/docs/
- Supabase Docs: https://supabase.com/docs
- ConvertKit Docs: https://developers.convertkit.com/

---

*Testing Guide v1.0 - Last updated 2026-02-10*
