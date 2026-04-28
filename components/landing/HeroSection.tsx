import { motion } from 'framer-motion';

interface HeroSectionProps {
  onGetStarted: () => void;
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center bg-white overflow-hidden pt-6">
      {/* Subtle Pattern Background */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" 
           style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row items-center gap-8">
        <div className="flex-1 text-center lg:text-left">
          {/* Platform Badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-4"
          >
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              🇮🇳 India's #1 AI based KCET/NEET/JEE exam prep Platform
            </span>
          </motion.div>

          {/* Clean Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight mb-4"
          >
            Predict Your Success. <br />
            <span className="text-blue-600">Ensure Your Rank.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg sm:text-xl text-slate-600 mb-6 max-w-4xl mx-auto lg:mx-0 leading-relaxed font-medium"
          >
            India’s leading <span className="text-blue-600 font-bold">AI prediction platform</span> for KCET, NEET, and JEE. Successfully matched the KCET 2026 exam: <span className="text-blue-700 font-black">65.0% Chemistry</span>, <span className="text-blue-700 font-black">51.7% Physics</span>, <span className="text-blue-700 font-black">23.3% Biology</span>, and <span className="text-blue-700 font-black">21.7% Math</span>.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
          >
            <button 
              onClick={onGetStarted}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-black text-base shadow-[0_15px_30px_rgba(37,99,235,0.2)] hover:scale-105 transition-transform"
            >
              Get Prediction Access
            </button>
            <a 
              href="/KCET_2026/analysis_reports/forensic_audit/index.html"
              className="px-8 py-4 bg-yellow-400 text-blue-900 rounded-xl font-black text-base shadow-[0_15px_30px_rgba(250,204,21,0.1)] hover:scale-105 transition-transform text-center"
            >
              2026 Prediction Results ↗
            </a>
          </motion.div>

          {/* Achievement Strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-4 flex flex-wrap justify-center lg:justify-start gap-6"
          >
            <div className="text-center lg:text-left">
              <div className="text-2xl font-black text-slate-900">1,000+</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rank-Aspirants</div>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />
            <div className="text-center lg:text-left">
              <div className="text-2xl font-black text-slate-900">12+</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Elite PU Colleges</div>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />
            <div className="text-center lg:text-left">
              <div className="text-2xl font-black text-slate-900">100%</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paper Fidelity</div>
            </div>
          </motion.div>
        </div>

        {/* Student Image */}
        <div className="flex-1 relative mt-6 lg:mt-0">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10"
          >
            <img 
              src="/images/kcet_2026_hero.png" 
              alt="Plus2AI KCET 2026 Verified Audit Results" 
              className="w-full h-auto drop-shadow-[0_15px_40px_rgba(37,99,235,0.15)] rounded-2xl scale-95"
            />
            
            {/* Animated Subject Badges */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-6 -left-4 md:-left-8 p-2 md:p-3 bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-slate-50 z-20"
            >
               <span className="text-xs md:text-sm font-black text-green-600 block">23.3% Biology</span>
               <span className="text-[8px] text-slate-400 font-bold uppercase">Conceptual Match</span>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              className="absolute top-20 -right-4 md:-right-6 p-2 md:p-3 bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-slate-50 z-20"
            >
               <span className="text-xs md:text-sm font-black text-purple-600 block">65.0% Chemistry</span>
               <span className="text-[8px] text-slate-400 font-bold uppercase">Verbatim Hit</span>
            </motion.div>

            <motion.div 
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
              className="absolute bottom-24 -left-6 md:-left-10 p-2 md:p-3 bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-slate-50 z-20"
            >
               <span className="text-xs md:text-sm font-black text-orange-600 block">21.7% Math</span>
               <span className="text-[8px] text-slate-400 font-bold uppercase">Syllabus Alignment</span>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-10 -right-4 md:-right-6 p-2 md:p-3 bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-slate-50 z-20"
            >
               <span className="text-xs md:text-sm font-black text-blue-600 block">51.7% Physics</span>
               <span className="text-[8px] text-slate-400 font-bold uppercase">Logic Prediction</span>
            </motion.div>
          </motion.div>
          
          {/* Decorative Blooms */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-50 rounded-full blur-[100px] -z-10 opacity-60" />
        </div>
      </div>
    </section>
  );
}
