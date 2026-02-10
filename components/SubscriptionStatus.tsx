import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useToast } from './ToastNotification';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/api';

interface SubscriptionData {
  subscription_id: string;
  plan_name: string;
  plan_slug: string;
  scans_used: number;
  scans_limit: number;
  can_create_scan: boolean;
  current_period_end: string;
  features: string[];
  limits: Record<string, any>;
}

interface SubscriptionStatusProps {
  onUpgrade?: () => void;
}

export default function SubscriptionStatus({ onUpgrade }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl('/api/subscription/status'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Handle new API format: { hasActiveSubscription, subscription }
        if (data.subscription) {
          // Transform to expected format
          const sub = data.subscription;
          setSubscription({
            subscription_id: sub.id,
            plan_name: sub.plan?.name || 'Unknown Plan',
            plan_slug: sub.plan?.slug || '',
            scans_used: sub.scans_used || 0,
            scans_limit: sub.scans_limit || -1,
            can_create_scan: true,
            current_period_end: sub.current_period_end,
            features: sub.plan?.features || [],
            limits: sub.plan?.limits || {},
          });
        } else {
          setSubscription(null);
        }
      } else {
        showToast('Failed to load subscription status', 'error');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      showToast('Failed to load subscription status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (): number => {
    if (!subscription) return 0;
    if (subscription.scans_limit === -1) return 100; // Unlimited
    return (subscription.scans_used / subscription.scans_limit) * 100;
  };

  const getProgressColor = (): string => {
    const percentage = getProgressPercentage();
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-600">No active subscription found.</p>
      </div>
    );
  }

  const isPro = subscription.plan_slug && !subscription.plan_slug.includes('free');
  const isFree = subscription.plan_slug === 'free';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className={`p-6 border-b border-gray-200 ${isPro ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : 'bg-gray-50'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-gray-900">
                {subscription.plan_name}
              </h3>
              {isPro && (
                <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                  PRO
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {isFree ? 'Free Plan' : `Renews on ${formatDate(subscription.current_period_end)}`}
            </p>
          </div>
          {isFree && onUpgrade && (
            <button
              onClick={onUpgrade}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Scan Usage */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Scans Used</span>
          <span className="text-sm font-semibold text-gray-900">
            {subscription.scans_limit === -1
              ? `${subscription.scans_used} / Unlimited`
              : `${subscription.scans_used} / ${subscription.scans_limit}`}
          </span>
        </div>

        {/* Progress Bar */}
        {subscription.scans_limit !== -1 && (
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${Math.min(getProgressPercentage(), 100)}%` }}
            />
          </div>
        )}

        {/* Warning if nearing limit */}
        {!subscription.can_create_scan && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Scan limit reached</p>
              <p className="text-xs text-red-600 mt-1">
                Upgrade to Pro for unlimited scans
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Plan Features</h4>
        <ul className="space-y-2">
          {subscription.features.slice(0, 5).map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-600">{feature}</span>
            </li>
          ))}
          {subscription.features.length > 5 && (
            <li className="text-sm text-gray-500 ml-6">
              + {subscription.features.length - 5} more features
            </li>
          )}
        </ul>
      </div>

      {/* Actions */}
      {isFree && onUpgrade && (
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-b-xl border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Need more scans?</p>
              <p className="text-xs text-gray-600">Upgrade to Pro for unlimited access</p>
            </div>
            <button
              onClick={onUpgrade}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
