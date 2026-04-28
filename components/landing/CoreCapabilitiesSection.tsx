import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Scan, LayoutDashboard, Palette, Route, Target, Bot, Layers, TrendingUp } from 'lucide-react';

const coreFeatures = [
    {
       title: "AI Paper Scanning",
       description: "Industry-first technology. Extract questions from any exam paper with 95%+ accuracy and auto-tag by subject, topic, and difficulty. Digitize 10 years of papers in days.",
       icon: <Scan className="w-6 h-6 text-indigo-400" />,
       colSpan: "md:col-span-2",
       rowSpan: "md:row-span-1",
       gradient: "from-indigo-500/10 to-purple-500/5",
       badge: "Unique Feature"
    },
    {
       title: "Admin Dashboard",
       description: "Track precise topic-wise accuracy metrics globally. Generate performance reports and identify struggling students in one click.",
       icon: <LayoutDashboard className="w-6 h-6 text-emerald-400" />,
       colSpan: "md:col-span-1",
       rowSpan: "md:row-span-1",
       gradient: "from-emerald-500/10 to-teal-500/5"
    },
    {
       title: "Adaptive Learning",
       description: "Never study what you already know. The AI organically maps weak areas to build personalized mastery paths.",
       icon: <Route className="w-6 h-6 text-blue-400" />,
       colSpan: "md:col-span-1",
       rowSpan: "md:row-span-1",
       gradient: "from-blue-500/10 to-cyan-500/5"
    },
    {
       title: "SketchAI Visuals",
       description: "Proprietary generated diagrams for physics circuits, chemistry structures, and math graphs. Understand complex formulas 3x faster.",
       icon: <Palette className="w-6 h-6 text-orange-400" />,
       colSpan: "md:col-span-1",
       rowSpan: "md:row-span-1",
       gradient: "from-orange-500/10 to-rose-500/5"
    },
    {
       title: "Custom Mock Builder",
       description: "Unlimited, dynamically generated practice tests targeting the exact difficulty distribution of real board exams.",
       icon: <Target className="w-6 h-6 text-rose-400" />,
       colSpan: "md:col-span-1",
       rowSpan: "md:row-span-1",
       gradient: "from-rose-500/10 to-pink-500/5"
    },
    {
       title: "Rapid Recall",
       description: "AI-driven interactive flashcards explicitly engineered for maximum retention of high-yield exam patterns.",
       icon: <Layers className="w-6 h-6 text-fuchsia-400" />,
       colSpan: "md:col-span-1",
       rowSpan: "md:row-span-1",
       gradient: "from-fuchsia-500/10 to-purple-500/5"
    },
    {
       title: "Vidya AI Tutor",
       description: "Immediate 24/7 hyper-precise doubt resolution. Complete step-by-step logic flows for unbreakable concepts.",
       icon: <Bot className="w-6 h-6 text-cyan-400" />,
       colSpan: "md:col-span-1 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]",
       rowSpan: "md:row-span-1",
       gradient: "from-cyan-500/15 to-blue-500/5",
       badge: "Game Changer ✨"
    },
    {
       title: "Predictive Practice Tests",
       description: "High accuracy proven results for the 2026 examination cycle. Mathematically isolates exactly what you will see on test day.",
       icon: <TrendingUp className="w-6 h-6 text-yellow-400" />,
       colSpan: "md:col-span-1 border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]",
       rowSpan: "md:row-span-1",
       gradient: "from-yellow-500/15 to-amber-500/5",
       badge: "Top Rated 📈"
    },
];

export default function CoreCapabilitiesSection() {
   const ref = useRef(null);
   const isInView = useInView(ref, { once: true, margin: "-100px" });

   return (
      <section className="py-24 bg-[#05070A] relative overflow-hidden">
         {/* Background glow lines */}
         <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
         
         <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
               <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6">
                 Complete AI Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Ecosystem</span>
               </h2>
               <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
                 We didn't just build another test prep platform. We engineered a proprietary AI intelligence grid. Explore the core capabilities of Plus2AI.
               </p>
            </div>

            <motion.div 
               ref={ref}
               initial={{ opacity: 0, y: 30 }}
               animate={isInView ? { opacity: 1, y: 0 } : {}}
               transition={{ duration: 0.8, staggerChildren: 0.1 }}
               className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
               {coreFeatures.map((feat, idx) => (
                  <motion.div 
                     key={idx}
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={isInView ? { opacity: 1, scale: 1 } : {}}
                     transition={{ duration: 0.5, delay: idx * 0.1 }}
                     className={`rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-8 relative group overflow-hidden ${feat.colSpan} ${feat.rowSpan}`}
                  >
                     <div className={`absolute inset-0 bg-gradient-to-br ${feat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                     <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                           <div className="flex justify-between items-start mb-6">
                             <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center border border-slate-700/50 group-hover:scale-110 transition-transform duration-500">
                               {feat.icon}
                             </div>
                             {feat.badge && (
                               <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-indigo-500/30">
                                 {feat.badge}
                               </span>
                             )}
                           </div>
                           <h3 className="text-2xl font-bold text-white mb-3">{feat.title}</h3>
                           <p className="text-slate-400 font-medium leading-relaxed">
                             {feat.description}
                           </p>
                        </div>
                     </div>
                  </motion.div>
               ))}
            </motion.div>
         </div>
      </section>
   );
}
