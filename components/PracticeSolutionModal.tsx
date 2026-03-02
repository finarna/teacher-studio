import React from 'react';
import { X, PenTool, Lightbulb } from 'lucide-react';
import { RenderWithMath } from './MathRenderer';
import type { AnalyzedQuestion } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface PracticeSolutionModalProps {
  question: AnalyzedQuestion;
  onClose: () => void;
}

const PracticeSolutionModal: React.FC<PracticeSolutionModalProps> = ({ question, onClose }) => {
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
            <div className="mb-8 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-4 font-outfit">The Challenge</h3>
              <div className="text-xl md:text-4xl font-bold text-slate-900 leading-tight tracking-tight">
                <RenderWithMath text={question.text} showOptions={false} />
              </div>
            </div>

            {/* Key Formulas Section (if available) */}
            {question.keyFormulas && question.keyFormulas.length > 0 && (
              <div className="mb-8 p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm">
                <h3 className="text-xs font-black text-amber-700 uppercase tracking-[0.25em] mb-4 flex items-center gap-2 font-outfit">
                  <span className="text-lg">⚡</span> Key Formulas
                </h3>
                <div className="space-y-3">
                  {question.keyFormulas.map((formula, idx) => (
                    <div key={idx} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
                      <div className="text-lg font-bold text-slate-900">
                        <RenderWithMath text={formula} showOptions={false} />
                      </div>
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
                  ? question.markingScheme
                  : question.solutionSteps?.map((step, idx) => {
                    const [title, content] = step.includes(':::') ? step.split(':::') : [`Step ${idx + 1}`, step];
                    return { step: content.trim(), mark: '1' };
                  }) || []
                ).map((item, idx, arr) => {
                  const stepText = item.step;
                  let stepTitle = `Conceptual Step ${idx + 1}`;
                  let stepContent = stepText;

                  if (stepText.includes(':::')) {
                    const [titlePart, contentPart] = stepText.split(':::');
                    stepTitle = titlePart.trim();
                    stepContent = contentPart.trim();
                  } else {
                    const colonIndex = stepText.indexOf(':');
                    if (colonIndex !== -1 && colonIndex < 100) {
                      const potentialTitle = stepText.substring(0, colonIndex);
                      if (potentialTitle.toLowerCase().startsWith('step ')) {
                        stepTitle = potentialTitle.trim();
                        stepContent = stepText.substring(colonIndex + 1).trim();
                      }
                    }
                  }

                  const isLast = idx === arr.length - 1;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative flex gap-6"
                    >
                      {/* Step Number Dot */}
                      <div className="hidden md:flex flex-shrink-0 w-12 h-12 bg-white border-4 border-slate-50 rounded-full items-center justify-center z-10 shadow-sm outline outline-1 outline-slate-200">
                        <span className="text-lg font-black text-slate-900">{idx + 1}</span>
                      </div>

                      {/* Step Card */}
                      <div className={`flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md ${isLast ? 'ring-2 ring-emerald-500/20 border-emerald-200' : ''}`}>
                        <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${isLast ? 'bg-emerald-50/50' : 'bg-slate-50/30'}`}>
                          <h4 className={`text-xs uppercase tracking-[0.2em] font-bold ${isLast ? 'text-emerald-700' : 'text-slate-500'} font-outfit`}>
                            {isLast ? 'Final Outcome' : stepTitle}
                          </h4>
                        </div>
                        <div className="p-8">
                          <div className={`text-lg md:text-2xl leading-[1.8] text-slate-900 ${isLast ? 'font-black' : 'font-medium'} tracking-normal`}>
                            <RenderWithMath text={stepContent} showOptions={false} serif={true} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Common Mistakes Section (if available) */}
                {question.commonMistakes && question.commonMistakes.length > 0 && (
                  <div className="mt-8 bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 rounded-3xl p-8 shadow-sm">
                    <h3 className="text-xs font-black text-rose-700 uppercase tracking-[0.25em] mb-6 flex items-center gap-2 font-outfit">
                      <span className="text-lg">⚠️</span> Common Mistakes to Avoid
                    </h3>
                    <div className="space-y-4">
                      {question.commonMistakes.map((mistake, idx) => (
                        <div key={idx} className="bg-white border border-rose-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                          <div className="text-base font-black text-rose-700 mb-3">{mistake.mistake}</div>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-black text-slate-500 uppercase mt-1">Why:</span>
                              <p className="text-sm text-slate-700 flex-1">{mistake.why}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-black text-emerald-600 uppercase mt-1">How to Avoid:</span>
                              <p className="text-sm text-emerald-700 flex-1 font-medium">{mistake.howToAvoid}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Our AI is currently synthesizing the perfect step-by-step breakdown for this problem.
                </p>
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
