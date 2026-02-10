import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';

const faqs = [
  {
    question: 'How does AI scanning work?',
    answer: 'Our advanced AI uses computer vision and natural language processing to analyze exam papers. Simply upload a photo or scan of the paper, and our system extracts questions, answers, marks, and topic classifications with 95%+ accuracy. The AI is trained on millions of exam papers and supports Math, Physics, Chemistry, and Biology.',
  },
  {
    question: 'Which exam boards are supported?',
    answer: 'EduJourney supports all major Indian exam boards including CBSE, ICSE, State Boards (Maharashtra, Karnataka, Tamil Nadu, etc.), and international curricula like IGCSE and IB. Our AI adapts to different question formats and marking schemes automatically.',
  },
  {
    question: 'Which exam packages do you offer?',
    answer: 'We offer specialized packages for KCET+PUC (₹299/month), NEET Achiever (₹499/month), JEE Champion (₹499/month), and Ultimate Scholar (₹699/month - all exams). Each plan includes unlimited scans, exam-specific question banks, mock tests, and performance analytics. Yearly plans available with 17% savings.',
  },
  {
    question: 'How accurate is the AI?',
    answer: 'Our AI maintains 95%+ accuracy for text extraction and 90%+ for mathematical equations and chemical formulas. We continuously improve through machine learning. If you notice any errors, you can easily correct them in our editor, and the AI learns from your corrections.',
  },
  {
    question: 'Can I export materials?',
    answer: 'Yes! You can export training materials in multiple formats including PDF, Word (DOCX), Excel (for question banks), and plain text. Pro users can also customize templates and branding for their exports.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use bank-level encryption (AES-256) for all data in transit and at rest. Your exam papers and student data are stored securely in India-based servers. We are GDPR compliant and never share your data with third parties. You can delete your data anytime.',
  },
  {
    question: 'Do you offer team pricing?',
    answer: 'Yes! Our Enterprise plan is designed for schools and institutions. It includes unlimited team members, centralized billing, custom integrations, dedicated support, and volume discounts. Contact our sales team for a customized quote based on your needs.',
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept all major credit/debit cards (Visa, Mastercard, Amex, RuPay), UPI, Net Banking, and popular digital wallets through RazorPay. All payments are processed securely with SSL encryption. We offer monthly and annual billing (save 2 months with annual).',
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
            Everything you need to know about EduJourney
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
              href="mailto:support@edujourney.com"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Support
            </a>
            <a
              href="#"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Live Chat
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
