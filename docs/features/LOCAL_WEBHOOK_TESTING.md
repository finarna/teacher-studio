# Local Webhook Testing with ngrok

RazorPay webhooks require a publicly accessible URL, so localhost won't work. Use ngrok to expose your local server for testing.

---

## 🚀 QUICK START

### Step 1: Install ngrok

**Option A: Download from website**
- Go to: https://ngrok.com/download
- Download for macOS
- Unzip and move to `/usr/local/bin/`

**Option B: Using Homebrew**
```bash
brew install ngrok/ngrok/ngrok
```

### Step 2: Sign Up for ngrok (Free)
- Go to: https://dashboard.ngrok.com/signup
- Sign up for free account
- Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken

### Step 3: Configure ngrok
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

---

## 🧪 TESTING WORKFLOW

### 1. Start Your Backend Server
```bash
npm run server
# Backend running on http://localhost:9001
```

### 2. Start ngrok Tunnel (in another terminal)
```bash
ngrok http 9001
```

You'll see output like:
```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        India (in)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:9001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy the HTTPS URL**: `https://abc123.ngrok-free.app`

### 3. Update RazorPay Webhook URL

**In RazorPay Dashboard:**
- Go to: https://dashboard.razorpay.com/
- Settings → Webhooks
- Click on your webhook (or create new one)
- **Update Webhook URL** to: `https://abc123.ngrok-free.app/api/webhook/razorpay`
- Select events: payment.captured, payment.failed, subscription.activated, subscription.cancelled
- **Copy Webhook Secret** (format: `whsec_...`)
- Click "Save"

### 4. Update .env.local with Webhook Secret
```bash
# Add this line to .env.local
RAZORPAY_WEBHOOK_SECRET=whsec_your_secret_here
```

### 5. Restart Backend Server
```bash
# Stop server (Ctrl+C)
npm run server
# Server restarts with webhook secret
```

### 6. Start Frontend
```bash
npm run dev
# Frontend on http://localhost:9000
```

---

## 🧪 TEST PAYMENT WITH WEBHOOKS

### 1. Complete a Test Payment
- Visit: http://localhost:9000
- Sign up or login
- Go to pricing page
- Select Pro Monthly plan
- Payment modal opens

### 2. Use Test Card Details
- **Card Number**: 4111 1111 1111 1111
- **CVV**: Any 3 digits (e.g., 123)
- **Expiry**: Any future date (e.g., 12/25)
- **Name**: Test User
- Click "Pay"

### 3. Monitor Webhook Delivery

**In ngrok Web Interface:**
- Visit: http://127.0.0.1:4040
- You'll see all HTTP requests
- Look for POST request to `/api/webhook/razorpay`
- Check request body and response

**In Backend Logs:**
```bash
# You should see:
✅ Webhook received: payment.captured
✅ Payment captured successfully
✅ Subscription activated
```

**In RazorPay Dashboard:**
- Go to: Settings → Webhooks
- Click on your webhook
- View "Recent Deliveries"
- Should see `200 OK` response

### 4. Verify Database Changes

**In Supabase Dashboard:**
- Go to: Table Editor
- Check `payments` table:
  - Status should be "captured"
  - razorpay_payment_id populated
- Check `subscriptions` table:
  - Status should be "active"
  - plan_id should be Pro plan
- Check `webhook_events` table:
  - Event logged with type "payment.captured"

---

## 🎯 ALTERNATIVE: Test Without Webhooks

If you don't want to set up ngrok, you can still test payments **without** webhooks:

### What Works:
- ✅ Payment modal opens
- ✅ RazorPay checkout works
- ✅ Payment is processed
- ✅ Frontend verification (`/api/payment/verify`)
- ✅ Subscription is activated
- ✅ User sees success message

### What Doesn't Work:
- ❌ Webhook events (payment.captured, payment.failed)
- ❌ Automatic email notifications triggered by webhooks
- ❌ Webhook event logging in database
- ❌ Idempotency checks for webhooks

### How to Test Without Webhooks:

1. **Comment out webhook secret requirement** in `server-supabase.js` (optional):
```javascript
// In /api/webhook/razorpay endpoint
// Comment out signature verification for local testing
// const isValid = razorpay.webhooks.validateWebhookSignature(
//   body, signature, webhookSecret
// );
// if (!isValid) {
//   return res.status(400).json({ error: 'Invalid signature' });
// }
```

2. **Payments still work** because the main flow uses `/api/payment/verify` which doesn't rely on webhooks

3. **Manual webhook testing** using RazorPay dashboard's "Send Test Webhook" feature (but still needs public URL)

---

## 🔄 NGROK TIPS

### Keep ngrok URL Stable (Paid Feature)
- Free tier: URL changes every time you restart ngrok
- Paid tier ($10/month): Get fixed subdomain like `https://yourdomain.ngrok.io`

### Restart ngrok If URL Changes
```bash
# Stop ngrok (Ctrl+C)
ngrok http 9001
# Get new URL and update RazorPay webhook URL
```

### View All Requests
- Visit: http://127.0.0.1:4040
- See all HTTP traffic through the tunnel
- Inspect request/response headers and bodies

### ngrok Alternatives
- **localtunnel**: `npm install -g localtunnel && lt --port 9001`
- **serveo**: `ssh -R 80:localhost:9001 serveo.net`
- **cloudflared**: Cloudflare Tunnel (free, requires account)

---

## 📝 COMPLETE TESTING CHECKLIST

- [ ] ngrok installed and configured
- [ ] Backend server running on localhost:9001
- [ ] ngrok tunnel active (https://xxx.ngrok-free.app)
- [ ] RazorPay webhook URL updated to ngrok URL
- [ ] Webhook secret copied to .env.local
- [ ] Backend server restarted with webhook secret
- [ ] Frontend running on localhost:9000
- [ ] Test payment completed successfully
- [ ] Webhook received and logged in ngrok interface
- [ ] Webhook processed successfully in backend logs
- [ ] Payment status "captured" in database
- [ ] Subscription status "active" in database
- [ ] Webhook event logged in webhook_events table

---

## 🚨 TROUBLESHOOTING

### "Webhook signature validation failed"
- Verify webhook secret matches RazorPay dashboard
- Check `.env.local` has correct `RAZORPAY_WEBHOOK_SECRET`
- Restart backend server after adding secret

### "ngrok tunnel not working"
- Check ngrok is authenticated: `ngrok config check`
- Verify port 9001 is correct: `ngrok http 9001`
- Try different region: `ngrok http 9001 --region=in`

### "RazorPay webhook shows 404"
- Verify webhook URL is: `https://xxx.ngrok-free.app/api/webhook/razorpay`
- Check backend server is running
- Test endpoint manually: `curl https://xxx.ngrok-free.app/api/pricing/plans`

### "Backend not receiving webhooks"
- Check ngrok web interface (http://127.0.0.1:4040) for incoming requests
- Verify RazorPay sent the webhook (check Recent Deliveries in dashboard)
- Check backend logs for any errors

---

## 🎉 PRODUCTION DEPLOYMENT

When deploying to production, you **don't need ngrok**:

1. Update `.env.local` on production server:
```env
VITE_API_URL=https://learn.dataziv.com
```

2. Update RazorPay webhook URL to:
```
https://learn.dataziv.com/api/webhook/razorpay
```

3. Webhooks work automatically with public domain!

---

*Last Updated: 2026-02-10*
*Recommended: Use ngrok for local webhook testing*
*Alternative: Test without webhooks (payments still work)*
