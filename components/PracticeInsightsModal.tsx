import React from 'react';
import { 
  X, Lightbulb, Sparkles, Loader2, Zap, 
  Eye, History, Layers, Network, AlertTriangle, 
  FileSearch, Activity, LayoutDashboard, Target
} from 'lucide-react';
import type { AnalyzedQuestion } from '../types';
import { RenderWithMath } from './MathRenderer';
import { motion } from 'framer-motion';

interface PracticeInsightsModalProps {
  question: AnalyzedQuestion;
  onClose: () => void;
  onRefine?: () => void;
  isRefining?: boolean;
}

const PracticeInsightsModal: React.FC<PracticeInsightsModalProps> = ({
  question,
  onClose,
  onRefine,
  isRefining
}) => {
  // --- ROBUST MAPPING ---
  const q = question as any;
  const aiReasoning = q.aiReasoning || q.ai_reasoning || q.logic_explained || '';
  const historicalPattern = q.historicalPattern || q.historical_pattern || q.exam_history || '';
  const predictiveInsight = q.predictiveInsight || q.predictive_insight || q.forecast || '';
  const studyTip = q.studyTip || q.exam_tip || q.memory_trigger || q.tip || '';
  const commonMistakes = q.commonMistakes || q.pitfalls || q.mistakes || [];
  const whyItMatters = q.whyItMatters || q.why_it_matters || q.application || '';
  const keyConcepts = q.keyConcepts || q.concepts || [];
  
  const hasContent = !!(aiReasoning || historicalPattern || predictiveInsight || studyTip || whyItMatters || keyConcepts.length > 0);

  const hasAutoTriggered = React.useRef(false);

  // Auto-trigger refinement if insights missing
  React.useEffect(() => {
    if (onRefine && !isRefining && !hasContent && !hasAutoTriggered.current) {
      hasAutoTriggered.current = true;
      onRefine();
    }
  }, [onRefine, isRefining, hasContent]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-0 md:p-4 lg:p-8 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white md:rounded-[2rem] w-full max-w-7xl h-full md:h-auto md:max-h-[94vh] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)] flex flex-col border border-white/20"
      >
        {/* Dynamic Header */}
        <div className="bg-slate-900 text-white px-6 py-4 md:px-10 md:py-6 flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-50" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-11 h-11 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                <LayoutDashboard size={22} className="text-white" />
            </div>
            <div>
               <h2 className="text-lg md:text-xl font-black text-white tracking-tight uppercase font-outfit">Expert Insights</h2>
               <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
                  <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] font-outfit">{q.topic || 'Pattern Analysis'}</p>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            {onRefine && (
              <button
                onClick={onRefine}
                disabled={isRefining}
                className="hidden md:flex h-11 px-6 bg-white/10 hover:bg-white/15 text-white rounded-xl items-center gap-3 transition-all border border-white/10 shadow-xl disabled:opacity-50 group active:scale-95"
              >
                {isRefining ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-sky-300 group-hover:rotate-12 transition-transform" />}
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isRefining ? 'Synchronizing Pipeline...' : 'Refine Intelligence'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-11 h-11 bg-white/5 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-all group border border-white/5"
            >
              <X size={22} className="group-hover:rotate-90 transition-transform opacity-70 group-hover:opacity-100" />
            </button>
          </div>
        </div>

        {/* Intelligence Grid */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 md:p-8 lg:p-10 scroller-hide">
          {hasContent ? (
            <div className="max-w-7xl mx-auto space-y-8">
              
              {/* Row 1: Strategy & Mindset */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                 {/* Memory Anchor (Strategy) */}
                 {studyTip && (
                   <div className="md:col-span-4 bg-[#0F172A] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group border border-slate-800 flex flex-col justify-center min-h-[160px]">
                     <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none transition-transform group-hover:scale-110 -rotate-12"><Zap size={120} className="text-sky-400" /></div>
                     <div className="text-[10px] font-black text-sky-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                        <Zap size={12} className="fill-sky-400" /> Memory Tip
                     </div>
                     <div className="text-base md:text-xl font-bold leading-relaxed font-outfit text-white">
                        <RenderWithMath text={studyTip} />
                     </div>
                   </div>
                 )}

                 {/* Examiner Logic */}
                 {aiReasoning && (
                   <div className={`md:col-span-${studyTip ? '8' : '12'} bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 relative`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center border border-sky-100"><Eye size={18} /></div>
                          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Examiner Logic</h3>
                        </div>
                      </div>
                      <div className="text-[15px] md:text-[17px] text-slate-800 font-bold leading-[1.6] font-inter">
                        <RenderWithMath text={aiReasoning} />
                      </div>
                   </div>
                 )}
              </div>

              {/* Row 2: Flow & Traps Panel */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                 
                 {/* Main Content (Left) */}
                 <div className="md:col-span-8 space-y-8">
                    {/* Logic Flow */}
                    {(q.solutionSteps || []).length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 bg-sky-500 h-full opacity-50" />
                        <div className="flex items-center gap-4 mb-8">
                          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg"><Layers size={20} /></div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em]">Step-by-Step Logic</h3>
                          </div>
                        </div>
                        <div className="space-y-6">
                          {q.solutionSteps.map((step: string, idx: number) => (
                            <div key={idx} className="flex gap-6 items-start group">
                              <div className="w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs text-slate-400 shadow-sm transition-all group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900">
                                {idx + 1}
                              </div>
                              <div className="text-[15px] md:text-[16px] text-slate-700 font-bold leading-relaxed pt-1 flex-1">
                                <RenderWithMath text={step} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Concepts Grid - FIXED LAYOUT */}
                    {keyConcepts.length > 0 && (
                      <div className="bg-slate-100/50 rounded-[2rem] p-8 md:p-10 border border-slate-200 shadow-inner">
                         <div className="flex items-center gap-4 mb-8">
                            <div className="w-9 h-9 bg-white text-slate-900 rounded-xl flex items-center justify-center shadow-sm border border-slate-200"><Network size={18} /></div>
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Key Concepts</h3>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
                            {keyConcepts.map((concept: any, idx: number) => (
                              <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group min-w-0">
                                 <div className="flex items-center gap-3 mb-3">
                                   <div className="w-5 h-5 rounded bg-sky-50 text-sky-500 flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                                   <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight truncate w-full group-hover:whitespace-normal">
                                     <RenderWithMath text={typeof concept === 'object' ? concept.name || concept.concept : concept} />
                                   </h4>
                                 </div>
                                 {typeof concept === 'object' && (concept.explanation || concept.details) && (
                                   <p className="text-[12px] text-slate-500 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-3">
                                     {concept.explanation || concept.details}
                                   </p>
                                 )}
                              </div>
                            ))}
                         </div>
                      </div>
                    )}
                 </div>

                 {/* Sidebar (Right) */}
                 <div className="md:col-span-4 space-y-8">
                    {/* Trap Vigilance Panel */}
                    {commonMistakes.length > 0 && (
                      <div className="bg-rose-50/50 border border-rose-100 rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><AlertTriangle size={100} className="text-rose-500" /></div>
                        <div className="flex items-center gap-4 mb-6">
                           <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200"><Target size={20} /></div>
                           <div>
                              <h3 className="text-sm font-black text-rose-600 uppercase tracking-[0.3em]">Watch Out!</h3>
                              <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-0.5">Common Mistakes</p>
                           </div>
                        </div>
                        <div className="space-y-4 relative z-10">
                           {commonMistakes.map((m: any, idx: number) => (
                             <div key={idx} className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm transition-transform hover:-translate-y-1">
                                <div className="text-[13px] font-black text-rose-950 mb-2 leading-tight uppercase tracking-tight">
                                   <RenderWithMath text={typeof m === 'object' ? m.mistake || m.pitfall : m} />
                                </div>
                                {typeof m === 'object' && (m.why || m.explanation) && (
                                   <div className="text-[11px] text-rose-500 font-medium leading-relaxed italic bg-rose-50 px-3 py-2 rounded-lg">
                                      <RenderWithMath text={`"${m.why || m.explanation}"`} />
                                   </div>
                                )}
                             </div>
                           ))}
                        </div>
                      </div>
                    )}

                    {/* Chrono Timeline & Predictions */}
                    <div className="space-y-4">
                       {historicalPattern && (
                         <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all border-l-4 border-l-indigo-500 group">
                           <div className="flex items-center gap-3 mb-4">
                              <History size={16} className="text-indigo-400 group-hover:rotate-[-45deg] transition-transform" />
                              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Syllabus History</h3>
                           </div>
                           <div className="text-[13px] text-slate-600 font-bold italic leading-relaxed">
                              <RenderWithMath text={historicalPattern} />
                           </div>
                         </div>
                       )}

                       {predictiveInsight && (
                         <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:shadow-lg transition-all border-l-4 border-l-emerald-500 group">
                           <div className="flex items-center gap-3 mb-4">
                              <Activity size={16} className="text-emerald-400 animate-pulse" />
                              <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Cycle Prediction</h3>
                           </div>
                           <div className="text-[13px] text-white font-bold italic leading-relaxed">
                              <RenderWithMath text={predictiveInsight} />
                           </div>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          ) : (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
               <div className="bg-white border border-slate-100 rounded-[3rem] p-16 shadow-2xl text-center max-w-sm w-full relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-indigo-500" />
                  <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:scale-110 transition-all duration-700">
                     <Network size={40} className="text-sky-400 animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2 font-outfit uppercase">AI Analysis</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Preparing Expert Insights...</p>
                  <button onClick={onRefine} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50">
                     Synchronize Insights
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* Console Footer */}
        <div className="bg-white border-t border-slate-100 px-6 py-4 md:px-12 md:py-6 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${aiReasoning ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]' : 'bg-slate-200'}`} />
                <div className={`w-2 h-2 rounded-full ${historicalPattern ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-200'}`} />
                <div className={`w-2 h-2 rounded-full ${commonMistakes.length ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-slate-200'}`} />
             </div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-outfit">Analysis Matrix Synced</span>
          </div>
          
          <button 
            onClick={onClose} 
            className="w-full md:w-auto px-16 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-800 transition-all active:scale-95 hover:shadow-sky-500/10"
          >
             Internalize Map
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PracticeInsightsModal;
