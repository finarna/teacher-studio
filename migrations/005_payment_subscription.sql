-- Migration 005: Payment and Subscription System
-- Created: 2026-02-10
-- Description: Creates tables for pricing plans, subscriptions, payments, webhooks, and email queue

-- =====================================================
-- 1. PRICING PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL, -- 'free', 'pro-monthly', 'pro-yearly', 'enterprise'
  description TEXT,
  price_inr INTEGER NOT NULL DEFAULT 0, -- Price in paisa (₹499 = 49900)
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly', 'one-time'
  features JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of feature strings
  limits JSONB NOT NULL DEFAULT '{}'::jsonb, -- { scans_per_month: 5, subjects: 1 }
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active plans
CREATE INDEX idx_pricing_plans_active ON pricing_plans(is_active, sort_order);

-- =====================================================
-- 2. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES pricing_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'paused'
  razorpay_subscription_id VARCHAR(100) UNIQUE, -- RazorPay subscription ID
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,

  -- Usage tracking
  scans_used INTEGER NOT NULL DEFAULT 0,
  scans_limit INTEGER NOT NULL DEFAULT 5,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_razorpay ON subscriptions(razorpay_subscription_id);
CREATE UNIQUE INDEX idx_subscriptions_active_user ON subscriptions(user_id) WHERE status = 'active';

-- =====================================================
-- 3. PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- RazorPay Details
  razorpay_order_id VARCHAR(100) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(100) UNIQUE,
  razorpay_signature VARCHAR(255),

  -- Payment Details
  amount INTEGER NOT NULL, -- Amount in paisa
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'captured', 'failed', 'refunded'
  method VARCHAR(50), -- 'card', 'upi', 'netbanking', 'wallet'

  -- Receipt and Invoice
  receipt VARCHAR(100),
  invoice_url TEXT,

  -- Failure Details
  error_code VARCHAR(100),
  error_description TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_razorpay_order ON payments(razorpay_order_id);
CREATE INDEX idx_payments_razorpay_payment ON payments(razorpay_payment_id);

-- =====================================================
-- 4. WEBHOOK EVENTS TABLE (Idempotency)
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(100) UNIQUE NOT NULL, -- RazorPay event ID
  event_type VARCHAR(100) NOT NULL, -- 'payment.captured', 'subscription.activated', etc.
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_created ON webhook_events(created_at DESC);

-- =====================================================
-- 5. EMAIL QUEUE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'welcome', 'payment_success', 'subscription_cancelled'
  template_data JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_user ON email_queue(user_id);
CREATE INDEX idx_email_queue_created ON email_queue(created_at DESC);

-- =====================================================
-- 6. SEED DATA - DEFAULT PRICING PLANS
-- =====================================================
INSERT INTO pricing_plans (name, slug, description, price_inr, billing_period, features, limits, sort_order)
VALUES
  (
    'Free',
    'free',
    'Perfect for trying out EduJourney',
    0,
    'monthly',
    '["5 scans per month", "Basic AI analysis", "Question bank access", "PDF export", "Email support", "Single subject"]'::jsonb,
    '{"scans_per_month": 5, "subjects": 1, "advanced_ai": false, "priority_support": false, "analytics": false}'::jsonb,
    1
  ),
  (
    'Pro Monthly',
    'pro-monthly',
    'For professional teachers',
    49900,
    'monthly',
    '["Unlimited scans", "Advanced AI analysis", "Full question bank", "All export formats", "Priority support", "All subjects (Math, Physics, Chemistry, Biology)", "Performance analytics", "Custom training materials", "Predictive insights"]'::jsonb,
    '{"scans_per_month": -1, "subjects": -1, "advanced_ai": true, "priority_support": true, "analytics": true}'::jsonb,
    2
  ),
  (
    'Pro Yearly',
    'pro-yearly',
    'For professional teachers (save 2 months)',
    499900,
    'yearly',
    '["Unlimited scans", "Advanced AI analysis", "Full question bank", "All export formats", "Priority support", "All subjects (Math, Physics, Chemistry, Biology)", "Performance analytics", "Custom training materials", "Predictive insights", "2 months free"]'::jsonb,
    '{"scans_per_month": -1, "subjects": -1, "advanced_ai": true, "priority_support": true, "analytics": true}'::jsonb,
    3
  ),
  (
    'Enterprise',
    'enterprise',
    'For schools and institutions',
    0,
    'custom',
    '["Everything in Pro", "Unlimited team members", "Custom integrations", "Dedicated account manager", "SLA guarantee", "Custom training", "API access", "White-label options"]'::jsonb,
    '{"scans_per_month": -1, "subjects": -1, "advanced_ai": true, "priority_support": true, "analytics": true, "team": true, "custom_integrations": true}'::jsonb,
    4
  )
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 7. FUNCTIONS - Auto-create Free Subscription for New Users
-- =====================================================
CREATE OR REPLACE FUNCTION auto_create_free_subscription()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Get the free plan ID
  SELECT id INTO free_plan_id FROM pricing_plans WHERE slug = 'free' LIMIT 1;

  IF free_plan_id IS NOT NULL THEN
    -- Create a free subscription for the new user
    INSERT INTO subscriptions (
      user_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      scans_limit
    ) VALUES (
      NEW.id,
      free_plan_id,
      'active',
      NOW(),
      NOW() + INTERVAL '100 years', -- Free plan never expires
      5
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create free subscription
DROP TRIGGER IF EXISTS on_user_created_create_free_subscription ON auth.users;
CREATE TRIGGER on_user_created_create_free_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_free_subscription();

-- =====================================================
-- 8. FUNCTIONS - Updated At Trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
DROP TRIGGER IF EXISTS update_pricing_plans_updated_at ON pricing_plans;
CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. HELPER VIEWS
-- =====================================================

-- View: Active Subscriptions with Plan Details
CREATE OR REPLACE VIEW active_subscriptions_with_plan AS
SELECT
  s.id,
  s.user_id,
  s.status,
  s.scans_used,
  s.scans_limit,
  s.current_period_end,
  p.name AS plan_name,
  p.slug AS plan_slug,
  p.price_inr,
  p.billing_period,
  p.features,
  p.limits,
  CASE
    WHEN s.scans_limit = -1 THEN true
    WHEN s.scans_used < s.scans_limit THEN true
    ELSE false
  END AS can_create_scan
FROM subscriptions s
JOIN pricing_plans p ON s.plan_id = p.id
WHERE s.status = 'active';

COMMENT ON VIEW active_subscriptions_with_plan IS 'View showing active subscriptions with plan details and scan availability';
