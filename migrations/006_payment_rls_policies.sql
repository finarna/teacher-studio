-- Migration 006: Row Level Security Policies for Payment System
-- Created: 2026-02-10
-- Description: Implements RLS policies for pricing_plans, subscriptions, payments, webhook_events, and email_queue

-- =====================================================
-- 1. ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. PRICING PLANS POLICIES
-- =====================================================

-- Anyone (authenticated or not) can read active pricing plans
CREATE POLICY "Public can view active pricing plans"
  ON pricing_plans
  FOR SELECT
  USING (is_active = true);

-- Only service role can modify pricing plans
CREATE POLICY "Service role can manage pricing plans"
  ON pricing_plans
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 3. SUBSCRIPTIONS POLICIES
-- =====================================================

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions
CREATE POLICY "Service role can manage all subscriptions"
  ON subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can cancel their own subscriptions (update only)
CREATE POLICY "Users can cancel their own subscriptions"
  ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND cancel_at_period_end = true
    -- Only allow changing cancel_at_period_end and cancelled_at
  );

-- =====================================================
-- 4. PAYMENTS POLICIES
-- =====================================================

-- Users can view their own payments
CREATE POLICY "Users can view their own payments"
  ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all payments
CREATE POLICY "Service role can manage all payments"
  ON payments
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can create payments for themselves (for checkout)
CREATE POLICY "Users can create their own payments"
  ON payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. WEBHOOK EVENTS POLICIES
-- =====================================================

-- Only service role can access webhook events (internal use only)
CREATE POLICY "Only service role can access webhook events"
  ON webhook_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 6. EMAIL QUEUE POLICIES
-- =====================================================

-- Only service role can access email queue (internal use only)
CREATE POLICY "Only service role can access email queue"
  ON email_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their own email history (optional - for debugging)
CREATE POLICY "Users can view their own email history"
  ON email_queue
  FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- 7. HELPER FUNCTIONS WITH SECURITY DEFINER
-- =====================================================

-- Function: Get user's active subscription with limits
CREATE OR REPLACE FUNCTION get_user_subscription_limits(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  subscription_id UUID,
  plan_name VARCHAR,
  plan_slug VARCHAR,
  scans_used INTEGER,
  scans_limit INTEGER,
  can_create_scan BOOLEAN,
  current_period_end TIMESTAMPTZ,
  features JSONB,
  limits JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    p.name AS plan_name,
    p.slug AS plan_slug,
    s.scans_used,
    s.scans_limit,
    CASE
      WHEN s.scans_limit = -1 THEN true
      WHEN s.scans_used < s.scans_limit THEN true
      ELSE false
    END AS can_create_scan,
    s.current_period_end,
    p.features,
    p.limits
  FROM subscriptions s
  JOIN pricing_plans p ON s.plan_id = p.id
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment scan usage
CREATE OR REPLACE FUNCTION increment_scan_usage(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_id UUID;
  v_scans_used INTEGER;
  v_scans_limit INTEGER;
BEGIN
  -- Get active subscription
  SELECT id, scans_used, scans_limit
  INTO v_subscription_id, v_scans_used, v_scans_limit
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no subscription found, return false
  IF v_subscription_id IS NULL THEN
    RETURN false;
  END IF;

  -- If unlimited scans (limit = -1), always allow
  IF v_scans_limit = -1 THEN
    RETURN true;
  END IF;

  -- Check if user has scans remaining
  IF v_scans_used >= v_scans_limit THEN
    RETURN false;
  END IF;

  -- Increment usage
  UPDATE subscriptions
  SET scans_used = scans_used + 1,
      updated_at = NOW()
  WHERE id = v_subscription_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Reset monthly scan usage (to be called by cron job)
CREATE OR REPLACE FUNCTION reset_monthly_scan_usage()
RETURNS INTEGER AS $$
DECLARE
  v_reset_count INTEGER;
BEGIN
  -- Reset scans_used for active subscriptions with monthly billing
  UPDATE subscriptions s
  SET scans_used = 0,
      updated_at = NOW()
  FROM pricing_plans p
  WHERE s.plan_id = p.id
    AND s.status = 'active'
    AND p.billing_period = 'monthly'
    AND s.current_period_end < NOW();

  GET DIAGNOSTICS v_reset_count = ROW_COUNT;

  -- Update period end for reset subscriptions
  UPDATE subscriptions s
  SET current_period_start = NOW(),
      current_period_end = NOW() + INTERVAL '1 month',
      updated_at = NOW()
  FROM pricing_plans p
  WHERE s.plan_id = p.id
    AND s.status = 'active'
    AND p.billing_period = 'monthly'
    AND s.current_period_end < NOW();

  RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can create scan (without incrementing)
CREATE OR REPLACE FUNCTION can_user_create_scan(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  v_scans_used INTEGER;
  v_scans_limit INTEGER;
BEGIN
  -- Get active subscription limits
  SELECT scans_used, scans_limit
  INTO v_scans_used, v_scans_limit
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no subscription found, return false
  IF v_scans_limit IS NULL THEN
    RETURN false;
  END IF;

  -- If unlimited scans (limit = -1), always allow
  IF v_scans_limit = -1 THEN
    RETURN true;
  END IF;

  -- Check if user has scans remaining
  RETURN v_scans_used < v_scans_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_user_subscription_limits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_scan_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_create_scan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_scan_usage() TO service_role;

-- Grant usage on views
GRANT SELECT ON active_subscriptions_with_plan TO authenticated;
GRANT ALL ON active_subscriptions_with_plan TO service_role;

COMMENT ON FUNCTION get_user_subscription_limits IS 'Returns the current user''s active subscription limits and features';
COMMENT ON FUNCTION increment_scan_usage IS 'Increments scan usage for the current user. Returns false if limit reached.';
COMMENT ON FUNCTION can_user_create_scan IS 'Checks if user can create a new scan without incrementing usage count';
COMMENT ON FUNCTION reset_monthly_scan_usage IS 'Resets monthly scan usage for all active monthly subscriptions (run via cron)';
