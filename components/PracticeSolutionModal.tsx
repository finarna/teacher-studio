import React from 'react';
import { 
  X, PenTool, Lightbulb, Sparkles, BookOpen, Zap, Loader2,
  CheckCircle2, Compass, ArrowRight, Target, Layout, Shield,
  Layers, AlertTriangle, Info, FileText
} from 'lucide-react';
import { RenderWithMath } from './MathRenderer';
import RichMarkdownRenderer from './RichMarkdownRenderer';
import type { AnalyzedQuestion } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface PracticeSolutionModalProps {
  question: AnalyzedQuestion;
  onClose: () => void;
  onRefine?: () => void;
  isRefining?: boolean;
}

const PracticeSolutionModal: React.FC<PracticeSolutionModalProps> = ({
  question,
  onClose,
  onRefine,
  isRefining
}) => {
  const hasAutoTriggered = React.useRef(false);

  // Auto-trigger refinement if solution missing
  React.useEffect(() => {
    const hasAnySolution = (question.markingScheme && question.markingScheme.length > 0) || 
                          (question.markingSteps && question.markingSteps.length > 0) ||
                          (question.solutionSteps && question.solutionSteps.length > 0);
                          
    if (onRefine && !isRefining && !hasAnySolution && !hasAutoTriggered.current) {
      hasAutoTriggered.current = true;
      onRefine();
    }
  }, [onRefine, isRefining, question]);

  const steps = question.markingScheme && (question.markingScheme as any[]).length > 0
    ? (question.markingScheme as any[]).map((m, i) => ({ ...m, title: `STEP ${i + 1}` }))
    : (question.markingSteps && (question.markingSteps as any[]).length > 0)
      ? (question.markingSteps as any[]).map((m, i) => ({ ...m, title: `STEP ${i + 1}` }))
      : question.solutionSteps?.map((step, idx) => {
        const [title, content] = step.includes(':::') ? step.split(':::') : [null, step];
        return { step: content.trim(), mark: '1', title: title?.trim() || `STEP ${idx + 1}` };
      }) || [];

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-0 md:p-6 lg:p-10 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white md:rounded-[1.5rem] w-full max-w-6xl h-full md:h-auto md:max-h-[95vh] overflow-hidden shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.1)] flex flex-col border border-slate-200"
      >
        {/* Simple Professional Header */}
        <div className="bg-slate-900 text-white px-6 py-4 md:px-8 md:py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <FileText size={20} className="text-white" />
            </div>
            <div>
               <h2 className="text-lg md:text-xl font-black text-white tracking-tight font-outfit uppercase">Detailed Solution</h2>
               <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] font-outfit">Logic Verified</span>
                  <span className="text-[10px] text-white/30 uppercase font-black">•</span>
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] font-outfit">{question.difficulty || 'Moderate'} Mode</span>
               </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all group"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 scroller-hide">
          <div className="p-4 md:p-8 lg:p-10">
            
            {/* Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Solution Execution (7cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Question Text */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Question Context</div>
                   <div className="text-base md:text-lg font-bold text-slate-900 leading-relaxed font-outfit">
                      <RichMarkdownRenderer text={question.text} textSize="text-base md:text-lg" />
                   </div>
                </div>

                {/* Solution Logic */}
                {steps.length > 0 ? (
                  <div className="space-y-4 pt-4 relative">
                    {/* Vertical Timeline Line */}
                    <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-200" />
                    
                    {steps.map((item: any, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative flex gap-6"
                      >
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 shadow-sm border transition-all ${idx === steps.length - 1 ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-900 font-bold'}`}>
                            {idx === steps.length - 1 ? <Target size={18} /> : <span className="text-sm">{idx + 1}</span>}
                         </div>
                         <div className={`flex-1 min-w-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm ${idx === steps.length - 1 ? 'ring-2 ring-emerald-500/20 border-emerald-500/30' : ''}`}>
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                               {item.title || `STEP ${idx + 1}`}
                            </div>
                            <div className={`text-[15px] md:text-[17px] leading-relaxed ${idx === steps.length - 1 ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                               <RichMarkdownRenderer text={item.step} textSize="text-[15px] md:text-[17px]" />
                            </div>
                         </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                     <Loader2 size={32} className="text-slate-300 animate-spin mx-auto mb-4" />
                     <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Generating Solution Map...</h3>
                  </div>
                )}
              </div>

              {/* Right Column: Key Intelligence (5cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. Key Formulas */}
                {question.keyFormulas && question.keyFormulas.length > 0 && (
                   <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center transition-transform hover:rotate-12"><Zap size={16} /></div>
                         <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Key Formulas</h3>
                      </div>
                      <div className="space-y-3">
                         {question.keyFormulas.map((formula, idx) => (
                           <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                              <div className="text-sm md:text-base font-bold text-center text-slate-800">
                                 <RichMarkdownRenderer text={formula} textSize="text-sm md:text-base" />
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                )}

                {/* 2. Expert Strategy Tip */}
                {(question as any).studyTip || (question as any).tip || (question as any).whyItMatters ? (
                   <div className="bg-indigo-900 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Lightbulb size={60} /></div>
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center"><Lightbulb size={16} /></div>
                         <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-200">Memory Tip</h3>
                      </div>
                      <div className="text-[14px] md:text-[16px] font-bold leading-relaxed italic border-l-4 border-indigo-500 pl-4 text-indigo-100">
                         <RichMarkdownRenderer text={(question as any).studyTip || (question as any).tip || (question as any).whyItMatters} textSize="text-[14px] md:text-[16px]" />
                      </div>
                   </div>
                ) : null}

                {/* 3. Common Pitfalls */}
                {question.commonMistakes && question.commonMistakes.length > 0 && (
                   <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 md:p-8 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center"><AlertTriangle size={18} /></div>
                         <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600">Watch Out!</h3>
                      </div>
                      <div className="space-y-4">
                         {question.commonMistakes.slice(0, 3).map((m: any, i) => (
                           <div key={i} className="flex gap-3 items-start bg-white/60 p-3 rounded-xl border border-rose-200/50">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                              <div className="text-[13px] md:text-[14px] font-bold text-rose-900 leading-snug">
                                 <RichMarkdownRenderer text={typeof m === 'object' ? m.mistake || m.pitfall : m} textSize="text-[13px] md:text-[14px]" />
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 md:px-10 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
           <div className="flex items-center gap-3">
              <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mastery Sync Completed</span>
           </div>
           
           <button
             onClick={onClose}
             className="w-full md:w-auto px-12 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
           >
              Internalize Logic
           </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PracticeSolutionModal;
