import { motion } from 'framer-motion';

const subjectScores = {
  Chemistry: [65, 40, 85, 70, 88, 82, 90, 86, 92, 72, 68, 45, 88, 75, 70, 84, 50, 48, 72, 94, 68, 90, 88, 65, 86, 74, 66, 88, 92, 90, 76, 92, 86, 88, 94, 90, 88, 68, 92, 70, 90, 92, 94, 72, 90, 92, 92, 70, 94, 90, 92, 94, 92, 90, 72, 92, 88, 90, 88, 94],
  Physics: [82, 85, 83, 92, 80, 94, 65, 62, 68, 86, 70, 64, 78, 82, 88, 85, 80, 81, 68, 72, 66, 82, 74, 70, 84, 86, 55, 80, 87, 84, 72, 90, 82, 88, 85, 70, 58, 68, 75, 65, 72, 70, 68, 70, 84, 72, 74, 66, 56, 70, 64, 82, 85, 83, 68, 80, 70, 82, 84, 86],
  Biology: [85, 35, 40, 82, 80, 88, 45, 83, 38, 42, 98, 86, 40, 35, 84, 92, 38, 40, 65, 35, 87, 68, 70, 89, 72, 48, 85, 81, 65, 45, 90, 70, 42, 75, 35, 40, 38, 40, 35, 38, 32, 35, 60, 45, 40, 68, 65, 42, 38, 62, 40, 42, 60, 35, 38, 40, 35, 65, 20, 38],
  Mathematics: [15, 45, 50, 65, 20, 25, 20, 70, 45, 35, 40, 85, 70, 50, 80, 45, 40, 35, 45, 40, 40, 45, 75, 60, 45, 60, 75, 50, 65, 45, 40, 45, 60, 40, 65, 85, 40, 40, 45, 40, 50, 45, 60, 50, 90, 35, 50, 85, 70, 92, 88, 40, 70, 75, 65, 45, 40, 20, 50, 45]
};

const getColor = (score: number) => {
  if (score >= 98) return 'bg-emerald-500'; // Tier 1: Masterpiece
  if (score >= 80) return 'bg-blue-600';    // Tier 2: Strategic
  if (score >= 60) return 'bg-violet-500';  // Tier 3: Tactical
  if (score >= 30) return 'bg-slate-400';   // Tier 4: Concept Related
  return 'bg-slate-200';                    // Tier 5: Non-Hit
};

export default function VerificationAuditSection() {
  const subjects = [
    { name: 'Chemistry', accuracy: '65.0%', elite: '39/60', color: 'from-purple-500 to-purple-600', hits: '65.0% Elite Prediction Hub' },
    { name: 'Physics', accuracy: '51.7%', elite: '31/60', color: 'from-blue-500 to-blue-600', hits: '51.7% Conceptual Verbatim Accuracy' },
    { name: 'Biology', accuracy: '23.3%', elite: '14/60', color: 'from-green-500 to-green-600', hits: '23.3% Verbatim Genetic Logic Hits' },
    { name: 'Mathematics', accuracy: '21.7%', elite: '13/60', color: 'from-orange-500 to-orange-600', hits: '21.7% Advanced Theorem Predictions' },
  ];

  return (
    <section className="py-24 bg-white border-y border-slate-100" id="forensic-audit">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-end justify-between mb-12 gap-8 text-center lg:text-left">
          <div className="max-w-2xl">
            <h2 className="text-4xl sm:text-7xl font-black text-slate-900 mb-8 tracking-tighter leading-[0.9]">
              Comprehensive <br /><span className="text-blue-600">Performance Audit</span>
            </h2>
            <p className="text-lg text-slate-500 mb-0 leading-relaxed font-semibold">
              Verbatim 1:1 question mapping against official KCET 2026 examination papers. <br />
              Institutional proof of <span className="text-blue-600 font-black italic">REI-v17 Predictive Intelligence</span>.
            </p>
          </div>
          <div className="px-10 py-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl -mr-16 -mt-16" />
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Global Success Rate (97/240)</div>
            <div className="text-6xl font-black text-white">40.4%</div>
          </div>
        </div>

        {/* High-Density Cockpit Heatmap */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mb-16 bg-slate-50 rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden"
        >
          <div className="p-8 lg:p-12 pb-0 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Verbatim Success Heatmap</h3>
              <p className="text-slate-500 font-bold text-sm">Sequential 1-to-1 Mapping Metrics (240 Questions Total)</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: 'T1: Masterpiece', range: '98-100%', color: 'bg-emerald-500' },
                { label: 'T2: Strategic', range: '80-97%', color: 'bg-blue-600' },
                { label: 'T3: Tactical', range: '60-79%', color: 'bg-violet-500' },
                { label: 'T4: Concept', range: '30-59%', color: 'bg-slate-400' },
                { label: 'T5: Missed', range: '<30%', color: 'bg-slate-200' },
              ].map((legend, i) => (
                <div key={i} className="flex flex-col items-center gap-1 min-w-[100px] bg-white p-3 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-blue-500/30">
                  <div className={`w-full h-1.5 rounded-full ${legend.color}`} />
                  <div className="text-[10px] font-black text-slate-900 uppercase mt-1">{legend.label}</div>
                  <div className="text-[9px] font-bold text-slate-400">{legend.range} Success</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 lg:p-10 space-y-4">
            {Object.entries(subjectScores).map(([subject, scores]) => (
              <div key={subject} className="bg-white p-4 lg:p-6 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col lg:flex-row items-center gap-6">
                <div className="w-[140px] text-left shrink-0">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{subject} Audit</div>
                  <div className="text-lg font-black text-slate-900 leading-tight">60 Questions</div>
                </div>

                <div className="flex-1 w-full overflow-hidden">
                  <div className="grid grid-cols-20 sm:grid-cols-30 gap-1 lg:gap-1.5">
                    {scores.map((score, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-[2px] lg:rounded-[4px] ${getColor(score)} transition-all duration-300 hover:scale-125 cursor-crosshair hover:z-10 relative group border border-black/5`}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50 shadow-xl border border-white/10">
                          {subject} Q{i + 1}: <span className={score >= 80 ? 'text-emerald-400' : 'text-slate-300'}>{score}% Match</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden xl:flex flex-col items-end gap-1 shrink-0 w-32 border-l border-slate-100 pl-6">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Section Health</div>
                  <div className={`text-xl font-black ${subject === 'Chemistry' ? 'text-purple-600' : subject === 'Physics' ? 'text-blue-600' : subject === 'Biology' ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {subject === 'Chemistry' ? '81.4' : subject === 'Physics' ? '76.2' : subject === 'Biology' ? '55.7' : '51.9'}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-12 py-8 bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-800">
            <div className="flex flex-wrap justify-center items-center gap-6 text-xs font-black uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Protocol:</span>
                <span className="text-yellow-400">KCET_MASTER_REI_V17</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Coverage:</span>
                <span className="text-blue-400">97.5% Conceptual Useful</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <div className="flex items-center gap-2 text-emerald-400">
                Verified Prediction Evidence
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-bold max-w-[300px] text-center md:text-right leading-tight">
              * BASED ON 28,800 INDIVIDUAL PAIRWISE COMPARISONS AGAINST OFFICIAL BOARD PAPERS.
            </div>
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
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-black text-blue-600">{sub.accuracy}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Elite Hit</span>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-snug">
                {sub.hits}
              </p>
              <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400">
                <span>QUEST_VOL: 60</span>
                <span className="text-blue-600">{sub.elite} Hits</span>
              </div>
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
