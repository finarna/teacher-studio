import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Check, Target, Flame } from 'lucide-react';

const masteryData = [
  {
    subject: 'Chemistry',
    t1t2: '65.0%',
    t1t2Hits: '39/60',
    t3Expanded: '93.3%',
    t3Hits: '56/60',
    slogan: 'Unrivaled Chemical Precision.',
    description: 'Transforming Physical Chemistry numericals and Organic mechanisms into predictable, solvable logic frameworks.',
    gradient: 'from-[#a855f7] to-[#ec4899]',
  },
  {
    subject: 'Physics',
    t1t2: '51.7%',
    t1t2Hits: '31/60',
    t3Expanded: '95.0%',
    t3Hits: '57/60',
    slogan: 'Mastering Universal Laws.',
    description: 'Pinpoint accuracy across Electromagnetism and Modern Physics. We extract surgical theorem patterns straight from the blueprint.',
    gradient: 'from-[#3b82f6] to-[#06b6d4]',
  },
  {
    subject: 'Biology',
    t1t2: '23.3%',
    t1t2Hits: '14/60',
    t3Expanded: '45.0%',
    t3Hits: '27/60',
    slogan: 'Precision for Medics.',
    description: 'Direct hits on high-yield genetics, taxonomy, and biotechnology logic. Aligning perfectly with structural anatomy patterns.',
    gradient: 'from-[#10b981] to-[#14b8a6]',
  },
  {
    subject: 'Mathematics',
    t1t2: '21.7%',
    t1t2Hits: '13/60',
    t3Expanded: '21.7%',
    t3Hits: '13/60',
    slogan: 'Calculated Rankings.',
    description: 'Strategic T1 and T2 alignment on LPP, Probability, and Differential equations. Focusing relentlessly on the defining rank deciders.',
    gradient: 'from-[#f97316] to-[#f43f5e]',
  },
];

export default function SubjectMasterySection() {
  const [activeTab, setActiveTab] = useState(0);
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
      setActiveTab(idx => (idx + 1) % masteryData.length);
      setProgress(0);
    }
  }, [progress]);

  return (
    <section className="py-24 bg-[#07090E] relative overflow-hidden flex flex-col items-center w-full">
       
       {/* Background Glow */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

       {/* Top Badge */}
       <div className="mb-6 z-10">
         <div className="px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] shadow-lg backdrop-blur-sm">
           Subject-Level Performance Analysis
         </div>
       </div>

       {/* Mobile-Chassis Style Interactive Widget (Applied Globally) */}
       <div className="relative w-full max-w-[380px] sm:max-w-[420px] bg-gradient-to-br from-[#121622] to-[#0A0D14] rounded-[3rem] overflow-hidden shadow-[0_40px_100px_-15px_rgba(0,0,0,0.8)] border-[3px] border-[#1e2333] z-10 z-10">
          
          {/* Progress Loading Line */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#1a1e2d] z-30">
                <div 
                  className={`h-full bg-gradient-to-r ${masteryData[activeTab].gradient} transition-all duration-75 ease-linear`}
                  style={{ width: `${progress}%` }}
                />
          </div>

          <div className="relative h-[650px] w-full px-6 pt-12 pb-24 overflow-hidden">
             <AnimatePresence mode="wait">
                <motion.div
                   key={activeTab}
                   initial={{ opacity: 0, scale: 0.96 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 1.04 }}
                   transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                   className="absolute inset-0 w-full h-full p-6 pt-12 flex flex-col items-center"
                >
                   {/* Massive Subject Heading */}
                   <div className="text-center mb-8 shrink-0 flex flex-col items-center w-full">
                      <h2 className="text-[2.75rem] font-black text-white leading-[0.95] tracking-tight text-center">
                         {masteryData[activeTab].subject.split('').map((char, i) => (
                             <span key={i} className="inline-block">{char}</span>
                         ))}
                         <br/>
                         <span className={`text-transparent bg-clip-text bg-gradient-to-r ${masteryData[activeTab].gradient}`}>
                            Dominance
                         </span>
                      </h2>
                   </div>

                   {/* Sleek Central Data Card (Matches the "Strengths/Weakness" card style from ref) */}
                   <div className="bg-[#fcfdfd] rounded-[1.75rem] p-5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] mb-8 w-full border border-white/80 shrink-0">
                     <div className="grid grid-cols-2 gap-4 relative">
                       {/* Center Divider */}
                       <div className="absolute left-1/2 top-1 bottom-1 w-px bg-slate-200 -translate-x-1/2" />
                       
                       {/* Column 1: T1+T2 Direct Hits */}
                       <div className="flex flex-col pr-1">
                         <div className="flex items-center gap-1.5 mb-2.5">
                            <div className="w-[20px] h-[20px] rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                               <Check className="w-[12px] h-[12px] text-emerald-600" strokeWidth={3.5} />
                            </div>
                            <span className="text-[9px] font-black uppercase text-emerald-600 tracking-[0.1em] whitespace-nowrap">
                               T1+T2 Hits
                            </span>
                         </div>
                         <div>
                            <div className="text-[12px] font-black text-slate-800 leading-tight mb-1">Elite Alignment</div>
                            <p className="text-[9px] text-slate-500 leading-[1.3] font-medium min-h-[38px]">
                               {masteryData[activeTab].t1t2Hits} formula-driven verbatim hits.
                            </p>
                            <div className="mt-2 pt-2 border-t border-slate-100/80">
                               <span className="text-[2rem] font-black text-slate-900 tracking-tighter leading-none block">
                                  {masteryData[activeTab].t1t2}
                               </span>
                            </div>
                         </div>
                       </div>
                       
                       {/* Column 2: T3 Expanded Coverage */}
                       <div className="flex flex-col pl-3">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <div className="w-[20px] h-[20px] rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                               <Target className="w-[12px] h-[12px] text-blue-600" strokeWidth={3.5} />
                            </div>
                            <span className="text-[9px] font-black uppercase text-blue-600 tracking-[0.1em] whitespace-nowrap">
                               T3 Coverage
                            </span>
                         </div>
                         <div>
                            <div className="text-[12px] font-black text-slate-800 leading-tight mb-1">Conceptual Field</div>
                            <p className="text-[9px] text-slate-500 leading-[1.3] font-medium min-h-[38px]">
                               {masteryData[activeTab].t3Hits} questions structural matched.
                            </p>
                            <div className="mt-2 pt-2 border-t border-slate-100/80">
                               <span className="text-[2rem] font-black text-slate-900 tracking-tighter leading-none block">
                                  {masteryData[activeTab].t3Expanded}
                               </span>
                            </div>
                         </div>
                       </div>

                     </div>
                   </div>

                   {/* Post-card Descriptors */}
                   <div className="text-center px-2 flex flex-col items-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5 mb-4 backdrop-blur-sm">
                         <Flame className="w-3 h-3 text-orange-400" />
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{masteryData[activeTab].slogan}</span>
                      </div>
                      <p className="text-[#94a3b8] text-[13px] leading-relaxed font-medium">
                        {masteryData[activeTab].description}
                      </p>
                   </div>
                </motion.div>
             </AnimatePresence>
          </div>

          {/* Floating Navigation Dots (Pill) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 bg-[#000000a0] backdrop-blur-xl px-5 py-3 rounded-full border border-white/10 shadow-2xl">
              {masteryData.map((_, idx) => (
                  <button
                      key={idx}
                      onClick={() => { setActiveTab(idx); setProgress(0); }}
                      className={`rounded-full transition-all duration-300 ease-out ${
                          activeTab === idx 
                               ? 'w-2.5 h-2.5 bg-white shadow-[0_0_12px_rgba(255,255,255,1)] scale-[1.2]' 
                               : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40'
                      }`}
                      aria-label={`View Subject ${idx + 1}`}
                  />
              ))}
          </div>

       </div>
    </section>
  );
}
