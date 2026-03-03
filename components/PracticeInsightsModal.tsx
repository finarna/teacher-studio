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

  React.useEffect(() => {
    console.log('🧠 [PracticeInsightsModal] RENDERING:', {
      questionId: question.id,
      hasContent,
      aiReasoning: question.aiReasoning ? `(len: ${question.aiReasoning.length})` : 'MISSING',
      historicalPattern: question.historicalPattern ? 'YES' : 'MISSING',
      predictiveInsight: question.predictiveInsight ? 'YES' : 'MISSING',
      whyItMatters: question.whyItMatters ? 'YES' : 'MISSING',
      studyTip: question.studyTip ? 'YES' : 'MISSING',
      keyConcepts: question.keyConcepts?.length || 0,
      commonMistakes: question.commonMistakes?.length || 0
    });

    if (!hasContent) {
      console.warn('⚠️ [PracticeInsightsModal] No content fields detected in question object:', question);
    }
  }, [question.id, hasContent]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-0 md:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white md:rounded-3xl w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Deep Intelligence Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white px-5 py-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-xl border border-white/30">
                <Brain size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black font-outfit tracking-tight">Deep Intelligence</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-200 font-outfit">AI Contextual Analysis</span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest font-outfit">{question.domain}</span>
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

        {/* Intelligence Feed */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-10">
          {hasContent ? (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* 1. Premium Mastery Shortcuts/Rituals (Study Tip) */}
              {question.studyTip && (
                <div className="bg-slate-900 text-white rounded-[2rem] p-6 md:p-10 relative overflow-hidden shadow-2xl border border-white/10 group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700"><Brain size={160} /></div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-[80px]" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
                        <Sparkles size={24} className="text-amber-300 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-purple-300 mb-0.5">UNLOCKED_MASTERY_PROTOCOL</h4>
                        <div className="text-xs font-black text-white uppercase tracking-widest">Premium Mastery Shortcuts</div>
                      </div>
                    </div>
                    <div className="text-lg md:text-xl font-bold leading-relaxed serif italic text-purple-50 tracking-tight">
                      <RenderWithMath text={question.studyTip} showOptions={false} serif={true} />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Technical Mindset & Trap Analysis (AI Reasoning / Trends) */}
              {(question.aiReasoning || question.historicalPattern || question.predictiveInsight) && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                  {question.aiReasoning && (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center border border-purple-100">
                          <Brain size={18} />
                        </div>
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono border-b border-slate-100 pb-2 flex-1">TECHNICAL_MINDSET_TRAP_ANALYSIS</h3>
                      </div>
                      <div className="text-lg md:text-xl font-bold text-slate-900 leading-relaxed tracking-tight font-outfit">
                        <RenderWithMath text={question.aiReasoning} showOptions={false} />
                      </div>
                    </>
                  )}

                  {/* Trends Grid: Historical & Predictive */}
                  {(question.historicalPattern || question.predictiveInsight) && (
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${question.aiReasoning ? 'mt-8 pt-6 border-t border-slate-100' : ''}`}>
                      {question.historicalPattern && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors"><Clock size={16} className="text-slate-500" /></div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-outfit mb-0.5">Syllabus Frequency</div>
                            <div className="text-base font-bold text-slate-800 leading-tight">
                              <RenderWithMath text={question.historicalPattern} showOptions={false} />
                            </div>
                          </div>
                        </div>
                      )}
                      {question.predictiveInsight && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors"><TrendingUp size={16} className="text-emerald-500" /></div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-outfit mb-0.5">Exam Predictor</div>
                            <div className="text-base font-bold text-emerald-600 leading-tight">
                              <RenderWithMath text={question.predictiveInsight} showOptions={false} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Practical and Engineering Applications (Why It Matters) */}
              {question.whyItMatters && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-md">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Engineering & Medical Applications</h4>
                    </div>
                  </div>
                  <div className="text-base font-medium text-slate-700 leading-relaxed">
                    <RenderWithMath text={question.whyItMatters} showOptions={false} />
                  </div>
                </div>
              )}

              {/* Concept Section */}
              {question.keyConcepts && question.keyConcepts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-2 border-l-4 border-purple-500 py-1">
                    <BookOpen size={20} className="text-purple-500" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-outfit">Conceptual Foundations</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {question.keyConcepts.map((concept, idx) => {
                      const isObject = typeof concept === 'object' && concept !== null;
                      const conceptName = isObject && 'name' in concept ? concept.name : '';
                      const conceptExplanation = isObject && 'explanation' in concept ? concept.explanation : (typeof concept === 'string' ? concept : '');

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-purple-200 transition-all group"
                        >
                          {conceptName && (
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 bg-purple-50 text-purple-600 rounded flex items-center justify-center">
                                <CheckCircle size={12} />
                              </div>
                              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{conceptName}</h4>
                            </div>
                          )}
                          <div className="text-base md:text-lg font-medium text-slate-700 leading-relaxed">
                            <RenderWithMath text={conceptExplanation} showOptions={false} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pitfall Prevention */}
              {question.commonMistakes && question.commonMistakes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-2 border-l-4 border-rose-500 py-1">
                    <AlertCircle size={20} className="text-rose-500" />
                    <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest font-outfit">Pitfall Prevention</h3>
                  </div>
                  <div className="space-y-4">
                    {question.commonMistakes.map((mistake, idx) => {
                      const isObject = typeof mistake === 'object' && mistake !== null;
                      const mistakeText = isObject && 'mistake' in mistake ? mistake.mistake : (typeof mistake === 'string' ? mistake : '');
                      const whyText = isObject && 'why' in mistake ? mistake.why : '';
                      const howToAvoidText = isObject && 'howToAvoid' in mistake ? mistake.howToAvoid : '';

                      return (
                        <div key={idx} className="bg-rose-50/30 border border-rose-100 rounded-3xl p-6 md:p-8">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                              <XCircle size={18} />
                            </div>
                            <h4 className="text-lg md:text-xl font-black text-rose-900 leading-tight">
                              <RenderWithMath text={mistakeText} showOptions={false} />
                            </h4>
                          </div>
                          {whyText && (
                            <div className="mb-6 pl-12 text-base text-slate-700 font-medium leading-relaxed">
                              <span className="text-rose-700 font-black uppercase text-xs tracking-wider">The Trap: </span>
                              <RenderWithMath text={whyText} showOptions={false} serif={true} />
                            </div>
                          )}
                          {howToAvoidText && (
                            <div className="bg-white/80 border border-emerald-100 rounded-2xl p-5 ml-0 md:ml-12 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="p-1 bg-emerald-500 text-white rounded-md"><CheckCircle size={12} /></div>
                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Strategy to Win</span>
                              </div>
                              <div className="text-base md:text-lg font-bold text-emerald-900 leading-relaxed">
                                <RenderWithMath text={howToAvoidText} showOptions={false} serif={true} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <Lightbulb size={48} className="text-slate-300" />
              </div>
              <h3 className="font-black text-2xl text-slate-900 mb-2">Intelligence is coming...</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8">
                We are synthesizing deep patterns and strategy context for this specific syllabus point.
              </p>
              <button
                onClick={onRefine}
                disabled={isRefining}
                className="px-10 py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-purple-700 transition-all shadow-xl flex items-center gap-3 mx-auto disabled:opacity-50"
              >
                {isRefining ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {isRefining ? 'Synthesizing...' : 'Synthesize Insights'}
              </button>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1">
              {[1, 2, 3].map(i => <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-200 shadow-sm" />)}
            </div>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-outfit">1.2k students refined this today</span>
          </div>
          <button
            onClick={onClose}
            className="w-full md:w-auto px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] hover:bg-slate-800 transition-all shadow-xl active:scale-95 font-outfit"
          >
            Concept Synchronized
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PracticeInsightsModal;
