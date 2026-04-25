import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const features = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'AI-Powered Scanning',
    description: 'Upload exam papers and let our advanced AI extract questions, answers, and context with 95%+ accuracy.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: 'Smart Question Bank',
    description: 'Automatically organize questions by topic, difficulty, and learning objectives. Search and filter with ease.',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Instant Training Materials',
    description: 'Generate customized worksheets, practice tests, and study guides in seconds. Export to PDF or print.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Precision Discovery Engine',
    description: 'The REI v17 engine analyzed over 100,000 historical KCET patterns to predict the 2026 paper with high verbatim precision.',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: 'Multi-Subject Support',
    description: 'Built for Math, Physics, Chemistry, and Biology. Specialized OCR for formulas, equations, and diagrams.',
    color: 'from-green-500 to-green-600',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Performance Tracking',
    description: 'Monitor student progress over time. Track accuracy rates, completion times, and improvement trends.',
    color: 'from-orange-500 to-orange-600',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 relative"
        >
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
          
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
            The Infrastructure of{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Rank Engineering
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Leading the charge for India's premier Coaching Centers and Aspirants. Plus2AI provides the elite forensic data needed to convert preparation into guaranteed ranks.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          ref={ref}
          variants={container}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={item}
              className="group relative flex flex-col items-center text-center"
            >
              <div className="relative mb-8 w-full max-w-[280px] aspect-square flex items-center justify-center">
                 {/* Illustration Backdrop */}
                 <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-5 rounded-[3rem] group-hover:opacity-10 transition-opacity duration-500`} />
                 
                 {/* The Illustration */}
                 <motion.img 
                   whileHover={{ y: -15, rotate: index % 2 === 0 ? 5 : -5 }}
                   src={index === 1 ? "/images/question_bank.png" : index === 3 ? "/images/rank_analytics.png" : ""} 
                   alt={feature.title}
                   className={`relative z-10 w-full h-auto drop-shadow-2xl ${feature.title === 'Smart Question Bank' || feature.title === 'Precision Forensic Oracle' ? 'block' : 'hidden'}`}
                 />

                 {/* Fallback for others */}
                 {!(feature.title === 'Smart Question Bank' || feature.title === 'Precision Forensic Oracle') && (
                    <div className={`relative z-10 p-8 rounded-3xl bg-gradient-to-br ${feature.color} text-white shadow-2xl group-hover:scale-110 transition-transform`}>
                       {feature.icon}
                    </div>
                 )}
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-4 px-4 leading-tight">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed px-6 font-medium">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { value: '53.3%', label: 'Biology Pattern Hit' },
            { value: '72%', label: 'High-Difficulty Hits' },
            { value: '100%', label: 'Audited Fidelity' },
            { value: '240', label: 'Verbatim Verifications' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
