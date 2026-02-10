import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useToast } from './ToastNotification';
import { getApiUrl } from '../lib/api';
import useEmblaCarousel from 'embla-carousel-react';

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_inr: number;
  billing_period: string;
  features: string[];
  limits: Record<string, any>;
  is_active: boolean;
  sort_order: number;
}

interface PricingTableProps {
  onSelectPlan: (plan: PricingPlan) => void;
}

export default function PricingTable({ onSelectPlan }: PricingTableProps) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { user } = useAuth();
  const { showToast } = useToast();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    loop: false,
    dragFree: true,
    containScroll: 'trimSnaps'
  });

  const [allPlans, setAllPlans] = useState<PricingPlan[]>([]);

  useEffect(() => {
    fetchPricingPlans();
  }, []);

  useEffect(() => {
    // Filter plans based on selected billing period
    const filteredPlans = allPlans.filter((plan: PricingPlan) => plan.billing_period === billingPeriod);
    setPlans(filteredPlans);
  }, [billingPeriod, allPlans]);

  const fetchPricingPlans = async () => {
    try {
      const response = await fetch(getApiUrl('/api/pricing/plans'));
      if (response.ok) {
        const data = await response.json();
        setAllPlans(data);
        // Initially show monthly plans
        const monthlyPlans = data.filter((plan: PricingPlan) => plan.billing_period === 'monthly');
        setPlans(monthlyPlans);
      } else {
        showToast('Failed to load pricing plans', 'error');
      }
    } catch (error) {
      console.error('Error fetching pricing plans:', error);
      showToast('Failed to load pricing plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (priceInPaisa: number): string => {
    if (priceInPaisa === 0) return '₹0';
    return `₹${(priceInPaisa / 100).toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Billing Period Toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-lg border-2 border-slate-200 p-1 bg-slate-50">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all duration-200 ${
              billingPeriod === 'monthly'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all duration-200 ${
              billingPeriod === 'yearly'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Yearly
            <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Carousel Navigation Buttons */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => emblaApi?.scrollPrev()}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-30"
          disabled={!emblaApi}
        >
          <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-600">Swipe to explore plans</span>
        <button
          onClick={() => emblaApi?.scrollNext()}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-30"
          disabled={!emblaApi}
        >
          <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Embla Carousel Container */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6 py-4">
          {plans.map((plan) => {
        const isPopular = plan.slug === 'neet-monthly' || plan.slug === 'jee-monthly';
        const isUltimate = plan.slug === 'ultimate-monthly';
        const isEnterprise = plan.slug === 'enterprise';

        return (
          <div
            key={plan.id}
            className={`group relative rounded-2xl border-2 transition-all duration-300 cursor-pointer flex-[0_0_90%] md:flex-[0_0_45%] lg:flex-[0_0_30%] ${
              isPopular
                ? 'border-blue-500 shadow-xl scale-[1.02] bg-gradient-to-br from-blue-50 to-indigo-50'
                : 'border-slate-200 shadow-md bg-white hover:border-slate-300 hover:shadow-xl hover:scale-[1.02]'
            } p-6 flex flex-col overflow-hidden`}
          >
            {/* Decorative background gradient */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              isPopular ? 'bg-gradient-to-br from-blue-100/50 to-indigo-100/50' : 'bg-gradient-to-br from-slate-50 to-slate-100'
            }`} />

            {isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Most Popular
                </span>
              </div>
            )}

            {isUltimate && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                  Best Value
                </span>
              </div>
            )}

            <div className="flex-1 relative z-10">
              <h3 className="text-2xl font-black text-slate-900 mb-1 font-outfit">
                {plan.name}
              </h3>

              <div className="mb-4">
                {isEnterprise ? (
                  <div className="text-4xl font-black text-slate-900 font-outfit">Custom</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-slate-900 font-outfit">
                        {formatPrice(plan.price_inr)}
                      </span>
                      <span className="text-sm text-slate-500 font-semibold">
                        {plan.billing_period === 'monthly' && '/month'}
                        {plan.billing_period === 'yearly' && '/year'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <p className="text-sm text-slate-600 font-medium mb-6 min-h-[40px]">{plan.description}</p>

              <ul className="space-y-2.5 mb-6">
                {plan.features.slice(0, 6).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      <svg
                        className={`w-5 h-5 ${isPopular ? 'text-blue-600' : 'text-green-500'} flex-shrink-0`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-700 font-medium leading-snug">{feature}</span>
                  </li>
                ))}
                {plan.features.length > 6 && (
                  <li className="text-xs text-slate-500 font-semibold pl-7">
                    + {plan.features.length - 6} more features
                  </li>
                )}
              </ul>
            </div>

            <button
              onClick={() => onSelectPlan(plan)}
              disabled={!user}
              className={`relative z-10 w-full py-3.5 px-4 rounded-xl font-bold transition-all duration-300 text-sm shadow-md ${
                isPopular
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5'
                  : isUltimate
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:shadow-xl hover:from-orange-700 hover:to-red-700 transform hover:-translate-y-0.5'
                  : isEnterprise
                  ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-xl transform hover:-translate-y-0.5'
                  : 'bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white hover:shadow-xl transform hover:-translate-y-0.5'
              } ${!user && 'opacity-50 cursor-not-allowed hover:transform-none'}`}
            >
              {isEnterprise ? 'Contact Sales' : plan.slug.includes('kcet') ? 'Start KCET Prep' : plan.slug.includes('neet') ? 'Ace NEET' : plan.slug.includes('jee') ? 'Crack JEE' : plan.slug.includes('ultimate') ? 'Get Ultimate Access' : 'Select Plan'}
            </button>

            {!user && (
              <p className="text-xs text-slate-500 mt-2 text-center font-medium relative z-10">
                Sign in to select a plan
              </p>
            )}
          </div>
        );
      })}
        </div>
      </div>
    </div>
  );
}
