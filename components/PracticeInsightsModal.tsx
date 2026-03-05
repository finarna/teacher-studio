import React from 'react';
import { X, Lightbulb, BookOpen, Clock, TrendingUp, BarChart3, AlertCircle, CheckCircle, XCircle, Sparkles, Brain, Loader2, Zap } from 'lucide-react';
import type { AnalyzedQuestion } from '../types';
import { RenderWithMath } from './MathRenderer';
import { motion, AnimatePresence } from 'framer-motion';

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
  const hasContent = !!(
    question.aiReasoning ||
    (question.keyConcepts && question.keyConcepts.length > 0) ||
    (question.commonMistakes && question.commonMistakes.length > 0) ||
    question.studyTip ||
    (question.thingsToRemember && question.thingsToRemember.length > 0) ||
    question.whyItMatters ||
    question.visualConcept ||
    question.historicalPattern ||
    question.predictiveInsight
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[9999] flex items-center justify-center p-0 md:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white md:rounded-[3rem] w-full max-w-5xl h-full md:h-auto md:max-h-[92vh] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] flex flex-col border border-white/20"
      >
        {/* Deep Intelligence Header - Premium Purple */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white px-8 py-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-2xl border border-white/20 transform -rotate-3 transition-transform hover:rotate-0">
                <Brain size={24} className="text-purple-300" />
              </div>
              <div>
                <h2 className="text-2xl font-black font-outfit tracking-tight">AI Analysis Engine</h2>
                <div className="flex items-center gap-3 mt-1 underline-offset-4 decoration-purple-500/50">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-300 font-outfit">Deep Pattern Synthesis</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] font-outfit">{question.domain || question.topic}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group border border-white/5"
            >
              <X size={20} className="group-hover:rotate-90 transition-transform opacity-70 group-hover:opacity-100" />
            </button>
          </div>
        </div>

        {/* Intelligence Feed */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 scroller-hide">
          {hasContent ? (
            <div className="px-3 py-4 md:p-12 space-y-4 md:space-y-10 max-w-4xl mx-auto">

              {/* 1. Unlocked Mastery Protocol (The Secret Sauce) */}
              {question.studyTip && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900 text-white rounded-xl md:rounded-[2.5rem] p-4 md:p-12 relative overflow-hidden shadow-xl border border-white/5 group"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000"><Brain size={180} /></div>
                  <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px]" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-8">
                      <div className="w-8 h-8 md:w-12 md:h-12 bg-white/5 rounded-lg md:rounded-2xl flex items-center justify-center border border-white/10 shadow-inner group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all">
                        <Sparkles size={16} className="text-amber-300 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-[7px] md:text-[10px] font-black uppercase tracking-[0.4em] text-purple-400 mb-0.5">MASTERY_LOCKED</h4>
                        <div className="text-[9px] md:text-sm font-black text-white uppercase tracking-widest opacity-90 font-outfit">Premium Shortcuts</div>
                      </div>
                    </div>
                    <div className="text-sm md:text-3xl font-bold leading-relaxed serif italic text-purple-50 tracking-tight pl-2 md:pl-4 border-l-2 border-purple-500/20">
                      <RenderWithMath text={question.studyTip} serif={true} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 2. Technical Mindset & Trends */}
              {(question.aiReasoning || question.historicalPattern || question.predictiveInsight) && (
                <div className="bg-white border border-slate-100 rounded-xl md:rounded-[2.5rem] p-4 md:p-10 shadow-sm transition-shadow">
                  {question.aiReasoning && (
                    <div className="mb-4 md:mb-10">
                      <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-8">
                        <div className="w-7 h-7 md:w-10 md:h-10 bg-purple-50 text-purple-600 rounded-lg md:rounded-xl flex items-center justify-center border border-purple-100 shadow-sm">
                          <Brain size={14} />
                        </div>
                        <h3 className="text-[8px] md:text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] font-mono flex-1">TECHNICAL_MINDSET</h3>
                      </div>
                      <div className="text-sm md:text-2xl font-bold text-slate-900 leading-relaxed tracking-tight font-outfit">
                        <RenderWithMath text={question.aiReasoning} />
                      </div>
                    </div>
                  )}

                  {/* Trends Grid */}
                  {(question.historicalPattern || question.predictiveInsight) && (
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 ${question.aiReasoning ? 'mt-4 md:mt-12 pt-4 md:pt-10 border-t border-slate-50' : ''}`}>
                      {question.historicalPattern && (
                        <div className="flex items-start gap-3 p-3 md:p-5 rounded-xl md:rounded-3xl hover:bg-slate-50 transition-colors border border-slate-50 md:border-transparent">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-500 shadow-sm shrink-0"><Clock size={14} /></div>
                          <div>
                            <div className="text-[8px] md:text-[11px] font-black text-slate-300 uppercase tracking-widest font-outfit mb-0.5 md:mb-2 text-[10px]">FREQ_ANALYSIS</div>
                            <div className="text-xs md:text-base font-bold text-slate-800 leading-snug">
                              <RenderWithMath text={question.historicalPattern} />
                            </div>
                          </div>
                        </div>
                      )}
                      {question.predictiveInsight && (
                        <div className="flex items-start gap-3 p-3 md:p-5 rounded-xl md:rounded-3xl bg-emerald-50/20 border border-emerald-50/50">
                          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shadow-sm shrink-0"><TrendingUp size={14} /></div>
                          <div>
                            <div className="text-[8px] md:text-[11px] font-black text-emerald-700/40 uppercase tracking-widest font-outfit mb-0.5 md:mb-2 text-[10px]">PREDICTOR_2025</div>
                            <div className="text-xs md:text-base font-bold text-emerald-700 leading-snug">
                              <RenderWithMath text={question.predictiveInsight} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Engineering & Real-World Impact */}
              {question.whyItMatters && (
                <div className="p-4 md:p-10 bg-indigo-50/20 border border-indigo-100/30 rounded-xl md:rounded-[2.5rem] relative overflow-hidden group">
                  <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-6">
                    <div className="w-7 h-7 md:w-10 md:h-10 bg-indigo-600 text-white rounded-lg md:rounded-xl flex items-center justify-center transform -rotate-3">
                      <Zap size={14} />
                    </div>
                    <div>
                      <h4 className="text-[8px] md:text-[11px] font-black text-indigo-700 uppercase tracking-[0.2em]">Engineering Context</h4>
                    </div>
                  </div>
                  <div className="text-sm md:text-xl font-medium text-slate-700 leading-relaxed pl-1 md:pl-2">
                    <RenderWithMath text={question.whyItMatters} />
                  </div>
                </div>
              )}

              {/* 4. Conceptual Foundations Grid */}
              {question.keyConcepts && question.keyConcepts.length > 0 && (
                <div className="space-y-3 md:space-y-6">
                  <div className="flex items-center gap-2 md:gap-4 px-1 md:px-4">
                    <div className="w-1 md:w-1.5 h-3 md:h-6 bg-purple-500 rounded-full" />
                    <h3 className="text-[8px] md:text-xs font-black text-slate-400 uppercase tracking-[0.3em] font-outfit">CORE_ARCHITECTURE</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                    {question.keyConcepts.map((concept, idx) => {
                      const isObject = typeof concept === 'object' && concept !== null;
                      const conceptName = isObject && 'name' in concept ? concept.name : '';
                      const conceptExplanation = isObject && 'explanation' in concept ? concept.explanation : (typeof concept === 'string' ? concept : '');

                      return (
                        <motion.div
                          key={idx}
                          className="bg-white border border-slate-100 rounded-xl md:rounded-3xl p-4 md:p-8 shadow-sm transition-all group"
                        >
                          {conceptName && (
                            <div className="flex items-center gap-2 mb-2 md:mb-4">
                              <div className="w-4 h-4 bg-purple-50 text-purple-600 rounded-md flex items-center justify-center shadow-sm">
                                <CheckCircle size={10} />
                              </div>
                              <h4 className="text-[8px] md:text-xs font-black text-slate-950 uppercase tracking-tight font-outfit">{conceptName}</h4>
                            </div>
                          )}
                          <div className="text-[13px] md:text-lg font-medium text-slate-600 leading-relaxed">
                            <RenderWithMath text={conceptExplanation} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. Pitfall Prevention Center */}
              {question.commonMistakes && question.commonMistakes.length > 0 && (
                <div className="space-y-4 md:space-y-8 pb-6 md:pb-10">
                  <div className="flex items-center gap-2 md:gap-4 px-1 md:px-4">
                    <div className="w-1 md:w-1.5 h-3 md:h-6 bg-rose-500 rounded-full" />
                    <h3 className="text-[8px] md:text-xs font-black text-rose-500 uppercase tracking-[0.3em] font-outfit">TRAP_PREVENTION</h3>
                  </div>
                  <div className="space-y-3 md:space-y-6">
                    {question.commonMistakes.map((mistake, idx) => {
                      const isObject = typeof mistake === 'object' && mistake !== null;
                      const mistakeText = isObject && 'mistake' in mistake ? mistake.mistake : (typeof mistake === 'string' ? mistake : '');
                      const whyText = isObject && 'why' in mistake ? mistake.why : '';
                      const howToAvoidText = isObject && 'howToAvoid' in mistake ? mistake.howToAvoid : '';

                      return (
                        <div key={idx} className="bg-white border border-rose-100/50 rounded-xl md:rounded-[3rem] p-0.5 shadow-sm overflow-hidden group/trap">
                          <div className="bg-rose-50/30 p-4 md:p-10 rounded-lg md:rounded-[2.8rem]">
                            <div className="flex items-start gap-3 md:gap-5 mb-3 md:mb-8">
                              <div className="w-8 h-8 md:w-14 md:h-14 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                                <AlertCircle size={20} />
                              </div>
                              <h4 className="text-sm md:text-3xl font-black text-rose-950 leading-tight tracking-tight pt-1">
                                <RenderWithMath text={mistakeText} />
                              </h4>
                            </div>

                            {whyText && (
                              <div className="mb-4 md:mb-10 pl-2.5 md:pl-20 relative text-xs md:text-lg text-slate-700 font-medium leading-relaxed">
                                <div className="absolute left-0 md:left-14 top-2 bottom-2 w-0.5 md:w-1 bg-rose-200 rounded-full" />
                                <span className="text-rose-700 font-black uppercase text-[7px] md:text-[10px] tracking-[0.1em] block mb-0.5 md:mb-2 text-[8px]">THE_COGNITIVE_TRAP</span>
                                <RenderWithMath text={whyText} serif={true} />
                              </div>
                            )}

                            {howToAvoidText && (
                              <div className="bg-white rounded-lg md:rounded-[2.5rem] p-4 md:p-10 ml-0 md:ml-12 border border-emerald-100/50 shadow-sm">
                                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                                  <div className="w-5 h-5 bg-emerald-500 text-white rounded-md flex items-center justify-center"><CheckCircle size={10} /></div>
                                  <span className="text-[8px] md:text-[11px] font-black text-emerald-700 uppercase tracking-[0.2em]">REMEDY</span>
                                </div>
                                <div className="text-[13px] md:text-2xl font-black text-emerald-900 leading-relaxed tracking-tight">
                                  <RenderWithMath text={howToAvoidText} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-32 flex flex-col items-center">
              <div className="w-32 h-32 bg-slate-100 rounded-[2.5rem] flex items-center justify-center mb-10 animate-pulse border border-slate-200 shadow-inner">
                <Lightbulb size={56} className="text-slate-300" />
              </div>
              <h3 className="font-black text-3xl text-slate-900 mb-4 tracking-tight">Synthesizing Logic...</h3>
              <p className="text-slate-400 max-w-sm mx-auto mb-12 font-medium leading-relaxed">
                Our analysis engine is scanning 10,000+ similar PYQ patterns to build specific insights for you.
              </p>
              <button
                onClick={onRefine}
                disabled={isRefining}
                className="px-14 py-5 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-purple-700 transition-all shadow-[0_25px_50px_-12px_rgba(147,51,234,0.4)] flex items-center gap-4 disabled:opacity-50 active:scale-95"
              >
                {isRefining ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} className="text-amber-300" />}
                {isRefining ? 'ENGINE_RUNNING...' : 'SYNC_INTELLIGENCE'}
              </button>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-4 md:px-10 py-3 md:py-6 bg-white border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="hidden md:flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 shadow-sm overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?u=${i + 20}`} alt="Student" className="w-full h-full object-cover grayscale opacity-50" />
                </div>
              ))}
            </div>
            <div>
              <div className="text-[12px] md:text-[14px] font-black text-slate-900 leading-none mb-1">1,248+ SYNCED</div>
              <div className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest font-outfit">Students analyzed today</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full md:w-auto px-10 py-3 md:px-16 md:py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl md:rounded-[1.5rem] font-black text-[10px] md:text-xs uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 font-outfit"
          >
            Insights Internalized
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PracticeInsightsModal;
