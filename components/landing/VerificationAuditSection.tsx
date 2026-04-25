import { motion } from 'framer-motion';

export default function VerificationAuditSection() {
  const subjects = [
    { name: 'Biology', accuracy: '53.3%', color: 'from-green-500 to-green-600', hits: 'Verbatim Hits on Saheli & Eli Lilly' },
    { name: 'Physics', accuracy: '46.7%', color: 'from-blue-500 to-blue-600', hits: 'Perfect Gaussian Flux Predictions' },
    { name: 'Chemistry', accuracy: '38.3%', color: 'from-purple-500 to-purple-600', hits: 'Organic Mechanism Mastery' },
    { name: 'Mathematics', accuracy: '23.3%', color: 'from-orange-500 to-orange-600', hits: 'Calculus Physical-Narratives' },
  ];

  return (
    <section className="py-24 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-end justify-between mb-24 gap-8 text-center lg:text-left">
          <div className="max-w-2xl">
              <h2 className="text-4xl sm:text-6xl font-black text-slate-900 mb-8 leading-[1.1]">
                2026 Board Exam <span className="text-blue-600">Verbatim Analysis</span>
              </h2>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed font-medium">
                We believe in physical proof. Our <span className="text-blue-600 font-bold">REI Engine v18</span> provides mapped question-by-question evidence, matching predicted flagship sets against official board papers.
              </p>
          </div>
          <div className="px-8 py-6 bg-white border border-slate-200 rounded-[2rem] shadow-xl">
             <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Overall Prediction Score</div>
             <div className="text-5xl font-black text-blue-700">40.4%</div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mb-24 bg-white rounded-[3rem] border border-slate-200 shadow-[0_30px_60px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col lg:flex-row"
        >
           <div className="lg:w-2/3 p-4 bg-slate-50">
              <img src="/images/analytics_dashboard.png" alt="Prediction Analytics Dashboard" className="rounded-2xl shadow-lg border border-white" />
           </div>
           <div className="lg:w-1/3 p-12 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 mb-6 text-blue-600 font-bold uppercase tracking-tighter text-sm">
                 <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                 </div>
                 Verification Protocol Alpha
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-6 leading-tight">Live Prediction <br />Pattern Tracking</h3>
              <p className="text-slate-500 font-medium mb-8">
                 Experience the power of the REI v18 oracle. Our dashboard provides verbatim mapping of official board intent, allowing institutions to verify every "Hit" in real-time.
              </p>
              <button className="text-blue-600 font-black flex items-center gap-2 hover:translate-x-2 transition-transform">
                 View Full Prediction Analysis
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
              </button>
           </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {subjects.map((sub, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className={`w-12 h-1.5 rounded-full bg-gradient-to-r ${sub.color} mb-6`} />
              <h3 className="text-xl font-bold text-slate-900 mb-2">{sub.name}</h3>
              <div className="text-3xl font-black text-blue-600 mb-4">{sub.accuracy}</div>
              <p className="text-sm text-slate-500 font-medium leading-snug">
                {sub.hits}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Institutional Trust Banner */}
        <div className="mt-16 bg-blue-700 rounded-[2.5rem] p-10 lg:p-16 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="max-w-xl">
              <h3 className="text-3xl font-bold mb-6">Trusted by 12+ Premium Coaching Institutes</h3>
              <p className="text-blue-100 text-lg leading-relaxed">
                Plus2AI helps institutions skyrocket their rank results by focusing faculty energy on predicted board signatures. Partner with India's #1 Prediction Authority.
              </p>
            </div>
            <button className="px-12 py-5 bg-yellow-400 text-blue-900 font-bold rounded-2xl shadow-xl hover:bg-yellow-500 transition-all transform hover:scale-105">
                 Request Demo for Institute
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
