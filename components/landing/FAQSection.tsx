import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';

const faqs = [
  {
    question: 'What makes Plus2AI different from traditional coaching?',
    answer: 'Unlike generic video lectures, Plus2AI uses an adaptive intelligence algorithm to dynamically map your exact weaknesses. It generates personalized learning trajectories, focusing your time strictly on high-yield exam patterns and rank-deciding concepts you haven\'t mastered yet.',
  },
  {
    question: 'How accurate are the Predictive Practice Tests?',
    answer: 'Our proprietary AI engine has analyzed 15 years of previous board exam grading sequences to isolate recurring concepts. This data-driven approach mathematically predicts pattern signatures you are highly likely to encounter on test day for the 2026 cycle.',
  },
  {
    question: 'How does the Vidya AI Tutor work?',
    answer: 'Vidya is your 24/7 interactive study companion. When you get stuck on a complex problem, Vidya breaks down the solution into hyper-precise, step-by-step logic flows rather than just giving you the final answer, ensuring you deeply understand the mechanics.',
  },
  {
    question: 'Does the system support JEE and NEET preparation?',
    answer: 'Yes. Plus2AI is rigorously calibrated for KCET, JEE Main/Advanced, and NEET. The system automatically shifts its difficulty distribution and pattern recognition parameters based on the specific exam you are preparing for.',
  },
  {
    question: 'What is the SketchAI Visuals module?',
    answer: 'SketchAI transforms abstract formulas into interactive visual diagrams. Whether it\'s a complex physics circuit or an organic chemistry reaction, visually experiencing the concept is proven to accelerate comprehension and retention by up to 3x.',
  },
  {
    question: 'Can parents track the student\'s progress?',
    answer: 'Absolutely. Every Plus2AI account features a comprehensive, real-time performance dashboard. It tracks precise topic-wise mastery, test scores, and learning velocity, making it easy to identify struggle areas instantly.',
  },
  {
    question: 'Is my personal data secure?',
    answer: 'Yes. We use bank-level encryption (AES-256) for all data in transit and at rest. Your learning data and progress metrics are stored securely on India-based servers, ensuring total privacy and compliance.',
  },
  {
    question: 'How does the pricing compare to traditional coaching?',
    answer: 'Unlike competitors that charge ₹30,000 to ₹80,000 annually with recurring subscriptions, Plus2AI offers a clear, one-time payment of ₹3,999 (KCET) or ₹5,999 (JEE/NEET). This single payment grants you unlimited access to the entire ecosystem until your exam is completed—no monthly expiry stress.',
  },
  {
    question: 'Why choose Vidya AI over regular photo-solving apps?',
    answer: 'Generic apps give generic answers. Vidya is a highly Context-Aware AI Tutor—she knows your exact learning history, your weakest topics, and your current exam target. This means you do not just get a random textbook copy-paste; you get guidance that is hyper-personalized to your exact situation.',
  },
  {
    question: 'Do you offer a tier for Coaching Institutes?',
    answer: 'Yes! Plus2AI provides a full Dual-Purpose platform. Coaching institutes get a complete Admin Dashboard and our unique AI Paper Scanning technology that digitizes 10 years of past papers with 95%+ accuracy in days, saving faculty hours of data entry each week.',
  },
];

export default function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-gradient-to-br from-slate-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about plus2AI
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <div ref={ref} className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors duration-200"
              >
                <span className="text-lg font-semibold text-gray-900 pr-8">
                  {faq.question}
                </span>
                <motion.svg
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-6 h-6 text-gray-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </motion.svg>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 mb-4">
            Still have questions? We're here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@finarna.com"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Support
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
