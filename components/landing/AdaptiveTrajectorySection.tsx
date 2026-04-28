import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Activity, TrendingUp, Brain, Target } from 'lucide-react';

const features = [
  {
    id: 1,
    badge: 'PERSONALIZED GROWTH',
    title: 'Adaptive Trajectory',
    description: 'Visual mastery maps and adaptive learning paths that evolve with your performance.',
    icon: Activity,
    mockupContent: (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        {/* Student Header */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-800">Aspirant Profile: REI v18 Track</h3>
          <p className="text-sm text-slate-500">Target: KCET / NEET 2027</p>
        </div>

        {/* Learning Path Trajectory Chart */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Predicted Rank Trajectory</h4>
          <div className="relative h-40">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-slate-400 font-bold">
              <span>Top 1k</span>
              <span>10k</span>
              <span>25k</span>
              <span>50k</span>
              <span>100k</span>
              <span>200k</span>
            </div>

            {/* Chart area */}
            <div className="ml-12 h-full relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border-t border-slate-200" />
                ))}
              </div>

              {/* Growth line */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
                <path
                  d="M 0 140 Q 50 130 80 110 T 160 70 T 240 40 T 320 15 T 400 5"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M 0 140 Q 50 130 80 110 T 160 70 T 240 40 T 320 15 T 400 5 L 400 160 L 0 160 Z"
                  fill="url(#gradient)"
                  opacity="0.2"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Milestone points */}
              <div className="absolute inset-0">
                {[
                  { x: '12%', y: '85%', label: 'Physics\nMechanics', month: 'Aug' },
                  { x: '30%', y: '65%', label: 'Chemistry\nOrganics', month: 'Nov' },
                  { x: '48%', y: '42%', label: 'Math\nCalculus', month: 'Jan' },
                  { x: '68%', y: '23%', label: 'Biology\nGenetics', month: 'Mar' },
                  { x: '88%', y: '8%', label: 'REI v18\nMock Test', month: 'May' },
                ].map((point, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{ left: point.x, top: point.y, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow" />
                    <div className="absolute top-full mt-1 text-[8px] font-bold text-slate-600 whitespace-pre-line text-center" style={{ transform: 'translateX(-50%)', left: '50%' }}>
                      {point.label}
                    </div>
                    <div className="absolute top-full mt-6 text-[7px] font-bold uppercase text-slate-400" style={{ transform: 'translateX(-50%)', left: '50%' }}>
                      {point.month}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Time Spent by Subject */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Subject Mastery Distribution</h4>
            <div className="space-y-1.5">
              {[
                { subject: 'Physics', percent: 85, color: 'bg-blue-500' },
                { subject: 'Chemistry', percent: 92, color: 'bg-purple-500' },
                { subject: 'Biology', percent: 78, color: 'bg-emerald-500' },
                { subject: 'Math', percent: 88, color: 'bg-orange-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-600 w-14">{item.subject}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 w-6">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Mastery Matrix */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Readiness Matrix (T1-T3)</h4>
            <div className="space-y-1.5 mt-2">
              <div className="flex gap-1 text-[8px] font-bold uppercase text-slate-400 mb-1">
                <span className="w-10"></span>
                <span className="flex-1 text-center">T3</span>
                <span className="flex-1 text-center">T2</span>
                <span className="flex-1 text-center">T1</span>
              </div>
              {['PHY', 'CHE', 'BIO', 'MAT'].map((subject, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <span className="text-[9px] font-bold text-slate-600 w-10">{subject}</span>
                  <div className="flex-1 h-3 bg-slate-200 rounded" />
                  <div className="flex-1 h-3 bg-blue-300 rounded" />
                  <div className="flex-1 h-3 bg-blue-600 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    badge: 'DATA-DRIVEN PREDICTION',
    title: 'Plus2AI Predictor Engine',
    description: 'Our proprietary REI v18 engine isolates recurring concepts across 15 years of board papers to predict exactly what appears in your exam.',
    icon: TrendingUp,
    mockupContent: (
      <div className="w-full h-full bg-slate-900 overflow-hidden relative group">
        <img src="/landing/predictor_engine_pcmb.png" alt="Predictive Analytics" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
      </div>
    ),
  },
  {
    id: 3,
    badge: 'MARKING SCHEME DECODER',
    title: "Decoding the Examiner's Intent",
    description: 'Reverse-engineer the official grading logic. We break down complex answers into step-by-step logic flows and precise examiner intent annotations.',
    icon: Brain,
    mockupContent: (
      <div className="w-full h-full bg-slate-900 overflow-hidden relative group">
        <img src="/landing/knowledge_mapping_pcmb.png" alt="Knowledge Mapping" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
      </div>
    ),
  },
  {
    id: 4,
    badge: 'CONCEPT VISUALIZATION',
    title: 'Atomic Level Mastery',
    description: 'Master high-yield formulas and reactions through dynamic 3D visual flashcards. Engineered for maximum retention.',
    icon: Target,
    mockupContent: (
      <div className="w-full h-full bg-slate-900 overflow-hidden relative group">
        <img src="/landing/concept_flashcards_pcmb.png" alt="Milestone System" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
      </div>
    ),
  },
];

export default function AdaptiveTrajectorySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeFeature, setActiveFeature] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 1;
        if (next >= 100) return 100;
        return next;
      });
    }, 45); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setActiveFeature(idx => (idx + 1) % features.length);
      setProgress(0);
    }
  }, [progress]);

  const currentFeature = features[activeFeature];
  const Icon = currentFeature.icon;

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
          className="space-y-12"
        >
          {/* Device Mockup */}
          <div className="relative max-w-4xl mx-auto">
            {/* iPad/Tablet Frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              {/* Device outer frame with rounded corners and border */}
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-3 shadow-2xl">
                {/* Screen bezel */}
                <div className="bg-black rounded-[2rem] p-2">
                  {/* Screen content area */}
                  <div className="relative bg-white rounded-[1.5rem] overflow-hidden aspect-[4/3]">
                    {/* Progress Bar Indicator */}
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-100 z-50">
                       <div 
                         className="h-full bg-indigo-500 transition-all duration-75 ease-linear"
                         style={{ width: `${progress}%` }}
                       />
                    </div>

                    {/* Mockup content */}
                    <motion.div
                      key={activeFeature}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="w-full h-full"
                    >
                      {currentFeature.mockupContent}
                    </motion.div>

                    {/* Bottom banner overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-400 tracking-widest">
                            {currentFeature.badge}
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold text-white">
                          {currentFeature.title}
                        </h3>
                      </div>
                      <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center">
                        <Icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Camera notch */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-700 rounded-full" />
              </div>
            </motion.div>
          </div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center max-w-3xl mx-auto"
          >
            <p className="text-2xl text-slate-600 italic font-light leading-relaxed">
              "{currentFeature.description}"
            </p>
          </motion.div>

          {/* Carousel Dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex items-center justify-center gap-2"
          >
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                   setActiveFeature(index);
                   setProgress(0);
                }}
                className={`transition-all duration-300 rounded-full ${
                  index === activeFeature
                    ? 'w-8 h-2 bg-indigo-600'
                    : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`View feature ${index + 1}`}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
