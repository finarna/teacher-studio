import React from 'react';
import { X, PenTool, Lightbulb, Sparkles, BookOpen, Zap, Loader2 } from 'lucide-react';
import { RenderWithMath } from './MathRenderer';
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
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[9999] flex items-center justify-center p-0 md:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-50 md:rounded-[2.5rem] w-full max-w-5xl h-full md:h-auto md:max-h-[92vh] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] flex flex-col border border-white/20"
      >
        {/* Elegant Minimal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg transform rotate-3">
              <PenTool size={16} className="text-white" />
            </div>
            <h2 className="text-sm font-black font-outfit uppercase tracking-[0.3em] opacity-80">Solution_Analysis</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all group border border-white/10"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scroller-hide bg-slate-50/50">
          <div className="px-3 py-4 md:p-12 space-y-4 md:space-y-10">

            {/* 1. Problem Statement - Educomp Style */}
            <div className="relative group">
              <div className="absolute -left-1 md:-left-6 top-2 bottom-2 w-1 md:w-1.5 bg-emerald-500 rounded-r-full shadow-lg" />
              <div className="bg-white rounded-xl md:rounded-3xl p-4 md:p-10 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.01] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                  <PenTool size={120} />
                </div>
                <div className="flex items-center gap-2 mb-2 md:mb-6">
                  <h3 className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] font-mono">PROBLEM_STATEMENT</h3>
                </div>
                <div className="text-base md:text-3xl font-bold text-slate-900 leading-snug tracking-tight font-outfit">
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
                    <RenderWithMath text={question.text} className="leading-relaxed" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Key Formulas Header (Amber Section) */}
            {question.keyFormulas && question.keyFormulas.length > 0 && (
              <div className="bg-amber-50/30 border border-amber-100 rounded-xl md:rounded-[2rem] p-4 md:p-10">
                <div className="flex items-center gap-2 mb-3 md:mb-8">
                  <div className="w-5 h-5 md:w-8 md:h-8 bg-amber-500 text-white rounded-md md:rounded-xl flex items-center justify-center">
                    <Zap size={12} />
                  </div>
                  <h4 className="text-[8px] md:text-[11px] font-black text-amber-700 uppercase tracking-[0.3em] font-outfit">KEY FORMULAS</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                  {question.keyFormulas.map((formula, idx) => (
                    <motion.div
                      key={idx}
                      className="bg-white px-3 md:px-6 py-3 md:py-5 rounded-lg md:rounded-2xl border border-amber-50 shadow-sm text-sm md:text-lg font-bold text-slate-900"
                    >
                      <RenderWithMath text={formula} className="text-center" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Steps Track - Refined Vertically */}
            {(question.markingScheme && question.markingScheme.length > 0) || (question.solutionSteps && question.solutionSteps.length > 0) ? (
              <div className="space-y-4 md:space-y-12 relative pt-1">
                {/* Vertical Line Connector */}
                <div className="absolute left-[14px] md:left-[24px] top-4 bottom-4 w-0.5 md:w-1 bg-slate-100 rounded-full" />

                {(question.markingScheme && question.markingScheme.length > 0
                  ? (question.markingScheme as any[]).map((m, i) => ({ ...m, title: `Step ${i + 1}` }))
                  : question.solutionSteps?.map((step, idx) => {
                    const [title, content] = step.includes(':::') ? step.split(':::') : [null, step];
                    return { step: content.trim(), mark: '1', title: title?.trim() };
                  }) || []
                ).map((item: any, idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  const stepTitle = item.title || `Step ${idx + 1}`;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative flex gap-3 md:gap-8 items-start group/step"
                    >
                      {/* Step Number Badge */}
                      <div className={`flex-shrink-0 w-7 md:w-12 h-7 md:h-12 rounded-lg md:rounded-2xl flex items-center justify-center z-10 shadow-sm relative mt-0.5 border ${isLast ? 'bg-emerald-600 border-emerald-400 text-white scale-105' : 'bg-white border-slate-100 text-slate-900'
                        }`}>
                        <span className="text-[10px] md:text-sm font-black font-outfit">{idx + 1}</span>
                      </div>

                      {/* Step Content Card */}
                      <div className={`flex-1 rounded-xl md:rounded-[2rem] overflow-hidden ${isLast
                        ? 'bg-white border-2 border-emerald-500 shadow-md'
                        : 'bg-white border border-slate-200 shadow-sm'
                        }`}>
                        <div className={`px-4 md:px-8 py-2 md:py-4 border-b flex items-center justify-between ${isLast ? 'bg-emerald-50/80 border-emerald-100' : 'bg-slate-50 border-slate-100'
                          }`}>
                          <h4 className={`text-[7px] md:text-[10px] uppercase tracking-[0.3em] font-black font-outfit ${isLast ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {isLast ? '🎯 RESULT' : stepTitle}
                          </h4>
                          {isLast && (
                            <div className="px-1.5 py-0.5 bg-emerald-500 text-white text-[6px] md:text-[9px] font-black rounded-full shadow-sm">SYNC</div>
                          )}
                        </div>
                        <div className="p-4 md:p-10">
                          <div className={`text-sm md:text-2xl leading-[1.6] text-slate-800 tracking-tight serif ${isLast ? 'font-black text-slate-900' : 'font-medium opacity-90'}`}>
                            <RenderWithMath text={item.step} serif={true} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 md:py-24 bg-white rounded-xl md:rounded-[3rem] border border-dashed border-slate-200">
                <div className="w-12 h-12 md:w-24 md:h-24 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <PenTool size={24} className="text-slate-300" />
                </div>
                <h3 className="font-black text-base md:text-2xl text-slate-900 mb-1 tracking-tight">Synthesizing...</h3>
                <p className="text-slate-500 max-w-[180px] md:max-w-xs mx-auto mb-6 text-[10px] md:text-sm leading-relaxed font-medium">
                  Building deep derivation for this pattern.
                </p>
                <button
                  onClick={onRefine}
                  disabled={isRefining}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg font-black text-[9px] uppercase tracking-[0.2em] active:scale-95"
                >
                  {isRefining ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-amber-400" />}
                  {isRefining ? 'ENG...' : 'GENERATE'}
                </button>
              </div>
            )}

            {/* 4. Bottom Formula Bank (Educomp style clean footer block) */}
            {question.keyFormulas && question.keyFormulas.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-xl md:rounded-[2.5rem] p-4 md:p-10 relative overflow-hidden mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                    <Zap size={12} className="text-emerald-400" />
                  </div>
                  <h4 className="text-[9px] md:text-[12px] font-black text-slate-300 uppercase tracking-[0.4em] font-mono">FORMULA_BANK</h4>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-4">
                  {question.keyFormulas.map((formula, idx) => (
                    <div key={idx} className="bg-slate-50/30 px-3 md:px-6 py-2 md:py-4 rounded-lg border border-slate-50 text-sm md:text-xl font-bold text-slate-900 serif border-l-2 border-l-emerald-500">
                      <RenderWithMath text={formula} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-4 md:px-10 py-3 md:py-6 bg-white border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <Lightbulb size={16} className="text-amber-500" />
            </div>
            <div>
              <div className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono mb-0.5">STRATEGIC_PROTOCOL</div>
              <div className="text-[11px] md:text-[13px] font-bold text-slate-900 uppercase tracking-widest">Mastery Build Synced.</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full md:w-auto px-10 py-3 md:px-14 md:py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 font-outfit"
          >
            Got it, Mastered
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PracticeSolutionModal;
