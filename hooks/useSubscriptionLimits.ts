import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/api';

interface SubscriptionLimits {
  canCreateScan: boolean;
  scansRemaining: number;
  scansUsed: number;
  scansLimit: number;
  isPro: boolean;
  planName: string;
  planSlug: string;
  currentPeriodEnd: string;
  features: string[];
}

interface UseSubscriptionLimitsReturn {
  limits: SubscriptionLimits | null;
  loading: boolean;
  error: string | null;
  incrementUsage: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage subscription limits and feature gating
 */
export function useSubscriptionLimits(): UseSubscriptionLimitsReturn {
  const { user } = useAuth();
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = async () => {
    if (!user) {
      setLimits(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl('/api/subscription/status'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      const data = await response.json();

      // Calculate scans remaining
      const scansRemaining = data.scans_limit === -1
        ? Infinity
        : Math.max(0, data.scans_limit - data.scans_used);

      setLimits({
        canCreateScan: data.can_create_scan,
        scansRemaining,
        scansUsed: data.scans_used,
        scansLimit: data.scans_limit,
        isPro: data.plan_slug.startsWith('pro'),
        planName: data.plan_name,
        planSlug: data.plan_slug,
        currentPeriodEnd: data.current_period_end,
        features: data.features,
      });
    } catch (err: any) {
      console.error('Error fetching subscription limits:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, [user]);

  /**
   * Increment scan usage after creating a scan
   * Returns true if increment successful, false if limit reached
   */
  const incrementUsage = async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl('/api/subscription/increment-usage'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      // Refetch limits to get updated usage
      await fetchLimits();

      return true;
    } catch (err) {
      console.error('Error incrementing usage:', err);
      return false;
    }
  };

  /**
   * Manually refetch subscription limits
   */
  const refetch = async () => {
    await fetchLimits();
  };

  return {
    limits,
    loading,
    error,
    incrementUsage,
    refetch,
  };
}
