import React from 'react';
import { X, PenTool, Lightbulb, Sparkles, BookOpen, Zap } from 'lucide-react';
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-0 md:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white md:rounded-3xl w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Premium Header */}
        <div className="bg-slate-900 text-white px-5 py-3 relative overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          </div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] rotate-3">
                <PenTool size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black font-outfit tracking-tight">Step-by-Step Solution</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 font-outfit">Verified Intelligence</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-outfit">{question.topic}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all group"
            >
              <X size={16} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="p-6 md:p-10">
            {/* Solution Header Info */}
            <div className="mb-8 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm border-l-8 border-l-emerald-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <PenTool size={120} />
              </div>
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 font-mono">PROBLEM_STATEMENT</h3>
              <div className="text-lg md:text-2xl font-bold text-slate-900 leading-snug tracking-tight">
                <RenderWithMath text={question.text} showOptions={false} />
              </div>
            </div>

            {/* Formula Bank */}
            {question.keyFormulas && question.keyFormulas.length > 0 && (
              <div className="mb-10 p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><BookOpen size={64} /></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                    <Zap size={16} />
                  </div>
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono">FORMULA_BANK</h4>
                </div>
                <div className="flex flex-wrap gap-4">
                  {question.keyFormulas.map((formula, idx) => (
                    <div key={idx} className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 shadow-sm text-lg font-bold text-slate-900 serif border-l-4 border-l-emerald-500 transition-shadow">
                      <RenderWithMath text={formula} showOptions={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Steps Track */}
            {(question.markingScheme && question.markingScheme.length > 0) || (question.solutionSteps && question.solutionSteps.length > 0) ? (
              <div className="space-y-8 relative">
                {/* Vertical Line Connector */}
                <div className="absolute left-[22px] top-4 bottom-4 w-0.5 bg-slate-200 hidden md:block" />

                {(question.markingScheme && question.markingScheme.length > 0
                  ? (question.markingScheme as any[]).map((m, i) => ({ ...m, title: `Marking Step ${i + 1}` }))
                  : question.solutionSteps?.map((step, idx) => {
                    const [title, content] = step.includes(':::') ? step.split(':::') : [null, step];
                    return { step: content.trim(), mark: '1', title: title?.trim() };
                  }) || []
                ).map((item: any, idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  const stepTitle = item.title || `Conceptual Step ${idx + 1}`;
                  const stepContent = item.step;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative flex gap-8 items-start"
                    >
                      {/* Step Number Dot */}
                      <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center z-10 shadow-sm relative mt-1 transition-transform group-hover:scale-110">
                        <span className="text-sm font-black text-slate-900 font-outfit">{idx + 1}</span>
                      </div>

                      {/* Step Card */}
                      <div className={`flex-1 transition-all hover:shadow-xl ${isLast ? 'bg-emerald-50/50 border-2 border-emerald-500 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)]' : 'bg-white border border-slate-200 rounded-3xl shadow-sm'}`}>
                        <div className={`px-8 py-5 border-b rounded-t-[2.5rem] ${isLast ? 'border-emerald-200 bg-emerald-100/30' : 'border-slate-50 bg-slate-50/30'} flex items-center justify-between`}>
                          <h4 className={`text-[10px] uppercase tracking-[0.3em] font-black ${isLast ? 'text-emerald-700' : 'text-slate-400'} font-outfit`}>
                            {isLast ? '🎯 FINAL OUTCOME' : stepTitle}
                          </h4>
                          {isLast && (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-full shadow-lg shadow-emerald-500/20">VERIFIED LOGIC</span>
                            </div>
                          )}
                        </div>
                        <div className="p-7 md:p-8">
                          <div className={`text-base md:text-xl leading-relaxed text-slate-800 ${isLast ? 'font-black text-slate-900 tracking-tight' : 'font-medium tracking-tight'} serif`}>
                            <RenderWithMath text={stepContent} showOptions={false} serif={true} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Diagrams Section */}
                {question.extractedImages && question.extractedImages.length > 0 && (
                  <div className="mt-12 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Visual Framework</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {question.extractedImages.map((imgData, idx) => (
                        <div key={idx} className="group relative rounded-2xl border border-slate-100 p-2 bg-slate-50/50 overflow-hidden">
                          <img
                            src={imgData}
                            alt="Visual aid"
                            className="w-full h-auto object-contain max-h-[400px] rounded-xl mix-blend-multiply transition-transform group-hover:scale-[1.02]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PenTool size={32} className="text-slate-300" />
                </div>
                <h3 className="font-black text-xl text-slate-900 mb-2">Thinking in Progress...</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
                  Our AI is currently synthesizing the perfect step-by-step breakdown for this problem.
                </p>
                <button
                  onClick={onRefine}
                  disabled={isRefining}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  {isRefining ? <span className="animate-spin text-lg">⚙️</span> : <Sparkles size={16} />}
                  {isRefining ? 'Synthesizing...' : 'Trigger AI Synthesis'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-600 font-outfit">
            <Lightbulb size={16} className="text-amber-500" />
            <span className="text-[11px] font-black uppercase tracking-widest">Pro Tip: Build conceptual sync carefully.</span>
          </div>
          <button
            onClick={onClose}
            className="w-full md:w-auto px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] hover:bg-slate-800 transition-all shadow-xl active:scale-95 font-outfit"
          >
            Got it, Mastered
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PracticeSolutionModal;
