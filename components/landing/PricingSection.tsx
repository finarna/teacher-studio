import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';

interface PricingSectionProps {
  onGetStarted: () => void;
}

const pricingPlans = [
  {
    name: 'KCET+PUC Aspirant',
    priceMonthly: '₹299',
    priceYearly: '₹2,990',
    description: 'Master Karnataka board exams and KCET entrance',
    features: [
      'Unlimited scans',
      'KCET question bank',
      'PUC syllabus coverage',
      'Physics, Chemistry, Math, Biology',
      'Performance analytics',
      'Previous year papers',
      'Mock tests',
      'PDF & Word export',
    ],
    cta: 'Start Learning',
    highlighted: false,
    color: 'from-green-600 to-emerald-600',
  },
  {
    name: 'NEET Achiever',
    priceMonthly: '₹499',
    priceYearly: '₹4,990',
    description: 'Complete prep for medical entrance success',
    features: [
      'Unlimited scans',
      '15,000+ NEET questions',
      'Physics, Chemistry, Biology',
      'NCERT-focused analysis',
      'NEET pattern mock tests',
      'Chapter-wise analytics',
      'Previous 10 years papers',
      'Priority support',
    ],
    cta: 'Ace NEET',
    highlighted: true,
    badge: 'Most Popular',
    color: 'from-blue-600 to-indigo-600',
  },
  {
    name: 'JEE Champion',
    priceMonthly: '₹499',
    priceYearly: '₹4,990',
    description: 'Conquer JEE Main & Advanced with confidence',
    features: [
      'Unlimited scans',
      '20,000+ JEE questions',
      'Physics, Chemistry, Math',
      'JEE Main & Advanced patterns',
      'Complex problem solver AI',
      'Formula quick reference',
      'IIT-level problem sets',
      'Priority support',
    ],
    cta: 'Crack JEE',
    highlighted: false,
    color: 'from-purple-600 to-pink-600',
  },
  {
    name: 'Ultimate Scholar',
    priceMonthly: '₹699',
    priceYearly: '₹6,990',
    description: 'Master all competitive exams - Best value!',
    features: [
      'Everything in all plans',
      '50,000+ questions across exams',
      'KCET + NEET + JEE coverage',
      'All subjects included',
      'Cross-exam pattern analysis',
      'Personalized study planner',
      'Premium priority support',
      '1-on-1 doubt resolution',
    ],
    cta: 'Get Ultimate',
    highlighted: false,
    badge: 'Best Value',
    color: 'from-orange-600 to-red-600',
  },
  {
    name: 'For Schools',
    priceMonthly: 'Custom',
    priceYearly: 'Custom',
    description: 'For schools and institutions',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom training',
      'API access',
      'White-label options',
    ],
    cta: 'Contact Sales',
    highlighted: false,
    color: 'from-purple-600 to-pink-600',
  },
];

export default function PricingSection({ onGetStarted }: PricingSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple,{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Transparent Pricing
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose your exam package and start your preparation journey. No hidden fees, cancel anytime.
          </p>
        </motion.div>

        {/* Billing Period Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center mb-12"
        >
          <div className="inline-flex rounded-lg border-2 border-slate-300 p-1 bg-white shadow-md">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-8 py-3 rounded-md text-base font-bold transition-all duration-200 ${
                billingPeriod === 'monthly'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-8 py-3 rounded-md text-base font-bold transition-all duration-200 ${
                billingPeriod === 'yearly'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full font-bold">Save 17%</span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative ${plan.highlighted ? 'lg:scale-105 z-10' : ''}`}
            >
              {/* Badge for highlighted plan */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-block px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-full shadow-lg">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div
                className={`h-full p-8 bg-white rounded-2xl shadow-lg ${
                  plan.highlighted
                    ? 'border-2 border-blue-500 shadow-2xl'
                    : 'border border-gray-200'
                } transition-all duration-300 hover:shadow-2xl`}
              >
                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-4">
                  <span className={`text-5xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                    {billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly}
                  </span>
                  <span className="text-gray-500 text-lg">
                    {billingPeriod === 'monthly' ? '/month' : '/year'}
                  </span>
                  {billingPeriod === 'yearly' && (
                    <div className="text-sm text-green-600 font-semibold mt-1">Save 17% - 2 months free!</div>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-6">{plan.description}</p>

                {/* CTA Button */}
                <button
                  onClick={onGetStarted}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 mb-8 ${
                    plan.highlighted
                      ? `bg-gradient-to-r ${plan.color} text-white hover:shadow-lg hover:scale-105`
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </button>

                {/* Features List */}
                <ul className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <svg
                        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          plan.highlighted ? 'text-blue-600' : 'text-gray-400'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Money-back guarantee */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-md">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-700 font-medium">
              30-day money-back guarantee on all paid plans
            </span>
          </div>
        </motion.div>

        {/* FAQ Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 text-center"
        >
          <button
            onClick={() => {
              document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
          >
            Have questions? Check our FAQ
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
