import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { User, Mail, Calendar, Shield, ArrowLeft, Crown, Sparkles, CreditCard, CheckCircle2, Star } from 'lucide-react';
import PaymentModal from './PaymentModal';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/api';

interface CompactPricingCatalogProps {
  onSelectPlan: (plan: any) => void;
}

function CompactPricingCatalog({ onSelectPlan }: CompactPricingCatalogProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(getApiUrl('/api/pricing/plans'));
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter(plan => plan.billing_period === billingPeriod);

  const getPlanColor = (slug: string) => {
    if (slug.includes('neet')) return 'from-blue-600 to-indigo-600';
    if (slug.includes('jee')) return 'from-purple-600 to-pink-600';
    if (slug.includes('kcet')) return 'from-green-600 to-emerald-600';
    if (slug.includes('ultimate')) return 'from-orange-600 to-red-600';
    return 'from-slate-600 to-slate-700';
  };

  const isPopular = (slug: string) => slug.includes('neet') || slug.includes('jee');
  const isUltimate = (slug: string) => slug.includes('ultimate');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-center">
      {/* Compact Billing Toggle */}
      <div className="flex justify-center mb-4 flex-shrink-0">
        <div className="inline-flex rounded-lg border-2 border-slate-200 p-0.5 bg-slate-50">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
              billingPeriod === 'yearly'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Yearly
            <span className="ml-2 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Full Width 4-Column Grid */}
      <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-xl border-2 transition-all hover:shadow-xl flex flex-col ${
              isPopular(plan.slug)
                ? 'border-blue-500 shadow-lg scale-[1.02]'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Badge */}
            {isPopular(plan.slug) && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Star size={9} fill="white" />
                  Most Popular
                </span>
              </div>
            )}
            {isUltimate(plan.slug) && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-orange-600 to-red-600 text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Crown size={9} />
                  Best Value
                </span>
              </div>
            )}

            {/* Card Header */}
            <div className={`p-5 rounded-t-xl flex-shrink-0 ${isPopular(plan.slug) ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-white'}`}>
              <h3 className="text-base font-black text-slate-900 font-outfit mb-2 leading-tight">{plan.name}</h3>
              <div className="mb-2">
                <span className={`text-3xl font-black bg-gradient-to-r ${getPlanColor(plan.slug)} bg-clip-text text-transparent`}>
                  ₹{(plan.price_inr / 100).toLocaleString('en-IN')}
                </span>
                <span className="text-slate-500 text-xs font-semibold">
                  /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium line-clamp-2">{plan.description}</p>
            </div>

            {/* Features */}
            <div className="px-5 pb-4 flex-1">
              <ul className="space-y-2">
                {plan.features.slice(0, 3).map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium leading-snug">{feature}</span>
                  </li>
                ))}
                {plan.features.length > 3 && (
                  <li className="text-[10px] text-slate-500 font-bold pl-5">
                    +{plan.features.length - 3} more features
                  </li>
                )}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="p-5 pt-0 flex-shrink-0">
              <button
                onClick={() => onSelectPlan(plan)}
                className={`w-full py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                  isPopular(plan.slug) || isUltimate(plan.slug)
                    ? `bg-gradient-to-r ${getPlanColor(plan.slug)} text-white hover:shadow-lg hover:scale-[1.02]`
                    : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                }`}
              >
                {plan.slug.includes('kcet') ? 'Start KCET Prep' :
                 plan.slug.includes('neet') ? 'Ace NEET' :
                 plan.slug.includes('jee') ? 'Crack JEE' :
                 plan.slug.includes('ultimate') ? 'Get Ultimate' : 'Select Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Note */}
      <div className="text-center mt-6 flex-shrink-0">
        <p className="text-xs text-slate-500 font-medium">
          🔒 Secure payment • 💳 All cards accepted • ✨ Cancel anytime
        </p>
      </div>
    </div>
  );
}

interface UserProfileProps {
  onBack: () => void;
}

export default function UserProfile({ onBack }: UserProfileProps) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPricingView, setShowPricingView] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPlanColor = (planName: string) => {
    if (planName.includes('NEET')) return 'from-blue-600 to-indigo-600';
    if (planName.includes('JEE')) return 'from-purple-600 to-pink-600';
    if (planName.includes('KCET')) return 'from-green-600 to-emerald-600';
    if (planName.includes('Ultimate')) return 'from-orange-600 to-red-600';
    return 'from-slate-600 to-slate-700';
  };

  const getPlanBadge = (planName: string) => {
    if (planName.includes('NEET')) return 'NEET';
    if (planName.includes('JEE')) return 'JEE';
    if (planName.includes('KCET')) return 'KCET';
    if (planName.includes('Ultimate')) return 'ULTIMATE';
    return 'PRO';
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col">
      {/* Compact Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      {/* Content - Single Screen */}
      <div className="flex-1 overflow-hidden">
        <div className={`${showPricingView ? 'max-w-full h-full' : 'max-w-6xl'} mx-auto p-4 h-full overflow-auto`}>
          <div className={`grid gap-4 ${showPricingView ? 'grid-cols-1 h-full' : 'grid-cols-1 lg:grid-cols-3'}`}>
            {/* Left Column - Compact Profile (Hidden in Pricing View) */}
            {!showPricingView && (
            <div className="space-y-4 flex flex-col">
              {/* Profile Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Compact Header - Aligned with right column */}
                <div className={`h-20 bg-gradient-to-br ${subscription ? getPlanColor(subscription.plan?.name || '') : 'from-slate-600 to-slate-700'} relative`}>
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>

                <div className="px-4 pb-4 -mt-10 relative">
                  {/* Compact Avatar */}
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center border-4 border-white shadow-lg mb-3">
                    <User size={28} className="text-white" />
                  </div>

                  {/* User Info */}
                  <h1 className="text-lg font-black text-slate-900 font-outfit mb-1 truncate">
                    {user?.email?.split('@')[0] || 'User'}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1 truncate">
                    <Mail size={12} />
                    {user?.email}
                  </p>

                  {/* Plan Badge */}
                  {subscription && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${getPlanColor(subscription.plan?.name || '')} text-white rounded-lg font-bold text-xs shadow-md mb-4`}>
                      <Crown size={12} />
                      {getPlanBadge(subscription.plan?.name || '')} Plan
                    </div>
                  )}

                  {/* Compact Stats */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Member Since</span>
                      <span className="text-slate-900 font-bold">
                        {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Status</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-bold">
                        <CheckCircle2 size={10} />
                        Active
                      </span>
                    </div>
                    {subscription && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Scans Used</span>
                        <span className="text-slate-900 font-bold">
                          {subscription.scans_used || 0} / ∞
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex-shrink-0">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <CreditCard size={14} className="text-slate-400" />
                    Payment History
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    Email Preferences
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* Right Column - Subscription or Pricing View (Full Width in Pricing) */}
            <div className={showPricingView ? 'col-span-1' : 'lg:col-span-2'}>
              <div className={`bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden ${showPricingView ? 'h-full' : ''}`}>

                {!showPricingView ? (
                  <>
                    {/* Compact Header */}
                    <div className="px-6 py-4 flex-shrink-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h2 className="text-2xl font-black text-slate-900 font-outfit mb-1">Current Subscription</h2>
                          <p className="text-xs text-slate-600 font-medium">Manage your plan and billing</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Shield size={22} className="text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 pb-4 flex-1 overflow-auto">
                      {loading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        </div>
                      ) : subscription ? (
                        <div className="space-y-3 flex flex-col">
                          {/* Compact Plan Card */}
                          <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${getPlanColor(subscription.plan?.name || '')} p-5 text-white flex-shrink-0 shadow-xl`}>
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                            <div className="relative z-10">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/25 backdrop-blur-sm rounded-full text-[10px] font-bold mb-2">
                                    <Sparkles size={11} />
                                    ACTIVE PLAN
                                  </div>
                                  <h3 className="text-2xl font-black font-outfit mb-1">{subscription.plan?.name}</h3>
                                  <p className="text-white/90 text-xs font-semibold">{subscription.plan?.billing_period === 'yearly' ? 'Billed Annually' : 'Billed Monthly'}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-3xl font-black font-outfit leading-none mb-1">
                                    ₹{(subscription.plan?.price_inr / 100).toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-white/90 text-xs font-bold">
                                    /{subscription.plan?.billing_period === 'yearly' ? 'month' : 'month'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 inline-flex">
                                <Calendar size={14} />
                                <span className="font-semibold">Renews {formatDate(subscription.current_period_end)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Compact Features Grid */}
                          <div className="flex-1">
                            <div className="grid grid-cols-2 gap-3">
                              {subscription.plan?.features?.slice(0, 6).map((feature: string, index: number) => (
                                <div key={index} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                                  <span className="text-slate-800 font-medium leading-snug">{feature}</span>
                                </div>
                              ))}
                            </div>
                            {subscription.plan?.features?.length > 6 && (
                              <div className="mt-3">
                                <button className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                                  + {subscription.plan.features.length - 6} more features
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Enhanced Action Buttons */}
                          <div className="flex gap-3 flex-shrink-0">
                            <button
                              onClick={() => setShowPricingView(true)}
                              className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-black rounded-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 flex items-center justify-center gap-2 shadow-xl border-2 border-blue-700 hover:border-blue-800"
                            >
                              <Crown size={18} className="animate-pulse" />
                              Change Plan
                            </button>
                            <button className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-slate-600 font-medium text-sm">No active subscription</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Pricing View Header */}
                    <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-black text-slate-900 font-outfit mb-0.5">Choose Your Plan</h2>
                          <p className="text-xs text-slate-600 font-medium">All plans include unlimited scans and AI analysis</p>
                        </div>
                        <button
                          onClick={() => setShowPricingView(false)}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-xs font-bold text-slate-600 flex items-center gap-1"
                        >
                          <ArrowLeft size={12} />
                          Back
                        </button>
                      </div>
                    </div>

                    {/* Inline Pricing Catalog - Full Width */}
                    <div className="flex-1 py-6 overflow-hidden">
                      <CompactPricingCatalog
                        onSelectPlan={(plan) => {
                          setSelectedPlan(plan);
                          setShowPaymentModal(true);
                        }}
                      />
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
