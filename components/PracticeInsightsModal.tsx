import React from 'react';
import { X, Lightbulb, BookOpen, Clock, TrendingUp, BarChart3, AlertCircle, CheckCircle, XCircle, Sparkles, Brain } from 'lucide-react';
import type { AnalyzedQuestion } from '../types';
import { RenderWithMath } from './MathRenderer';

interface PracticeInsightsModalProps {
  question: AnalyzedQuestion;
  onClose: () => void;
}

const PracticeInsightsModal: React.FC<PracticeInsightsModalProps> = ({ question, onClose }) => {
  const hasContent = question.aiReasoning ||
                     (question.keyConcepts && question.keyConcepts.length > 0) ||
                     (question.commonMistakes && question.commonMistakes.length > 0) ||
                     question.studyTip ||
                     (question.thingsToRemember && question.thingsToRemember.length > 0) ||
                     question.whyItMatters ||
                     question.visualConcept;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Lightbulb size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black">AI Insights</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {question.topic} • {question.domain}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {hasContent ? (
            <div className="space-y-5">
              {/* AI Reasoning */}
              {question.aiReasoning && (
                <div className="bg-white border-2 border-slate-300 rounded-lg p-5 shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                      <BarChart3 size={18} className="text-slate-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                        Why This Question Matters
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {question.aiReasoning}
                      </p>
                    </div>
                  </div>

                  {/* Historical & Predictive */}
                  {(question.historicalPattern || question.predictiveInsight) && (
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200">
                      {question.historicalPattern && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Clock size={14} className="text-slate-600" />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Historical</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{question.historicalPattern}</p>
                        </div>
                      )}
                      {question.predictiveInsight && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <TrendingUp size={14} className="text-slate-600" />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Predictive</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{question.predictiveInsight}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Why It Matters */}
              {question.whyItMatters && (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/80 border-2 border-blue-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={18} className="text-blue-600" />
                    <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Why This Matters</h4>
                  </div>
                  <p className="text-sm text-blue-900 leading-relaxed font-medium">{question.whyItMatters}</p>
                </div>
              )}

              {/* Key Concepts */}
              {question.keyConcepts && question.keyConcepts.length > 0 && (
                <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={18} className="text-slate-700" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Key Concepts to Master</h4>
                  </div>
                  <div className="space-y-3">
                    {question.keyConcepts.map((concept, idx) => {
                      // Handle both object format {name, explanation} and string format
                      const isObject = typeof concept === 'object' && concept !== null;
                      const conceptName = isObject && 'name' in concept ? concept.name : '';
                      const conceptExplanation = isObject && 'explanation' in concept ? concept.explanation : (typeof concept === 'string' ? concept : '');

                      return (
                        <div key={idx} className="bg-gradient-to-br from-slate-50 to-white rounded-lg p-4 border-l-4 border-slate-400 hover:border-slate-600 transition-all">
                          {conceptName && (
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle size={16} className="text-emerald-600" />
                              <h5 className="text-sm font-black text-slate-900">{conceptName}</h5>
                            </div>
                          )}
                          <div className="text-sm font-medium text-slate-700 leading-relaxed ml-6">
                            <RenderWithMath text={conceptExplanation} showOptions={false} serif={false} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Common Mistakes */}
              {question.commonMistakes && question.commonMistakes.length > 0 && (
                <div className="bg-white border-2 border-amber-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle size={18} className="text-amber-600" />
                    <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wide">Common Mistakes to Avoid</h4>
                  </div>
                  <div className="space-y-4">
                    {question.commonMistakes.map((mistake, idx) => {
                      // Handle both object format {mistake, why, howToAvoid} and string format
                      const isObject = typeof mistake === 'object' && mistake !== null;
                      const mistakeText = isObject && 'mistake' in mistake ? mistake.mistake : (typeof mistake === 'string' ? mistake : '');
                      const whyText = isObject && 'why' in mistake ? mistake.why : '';
                      const howToAvoidText = isObject && 'howToAvoid' in mistake ? mistake.howToAvoid : '';

                      return (
                        <div key={idx} className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-lg p-4 border-l-4 border-amber-500 hover:border-amber-600 transition-all">
                          <div className="flex items-start gap-2 mb-2">
                            <XCircle size={16} className="text-amber-700 mt-0.5 flex-shrink-0" />
                            <h5 className="text-sm font-black text-amber-900">{mistakeText}</h5>
                          </div>
                          {whyText && (
                            <p className="text-xs text-amber-800 mb-3 ml-6 leading-relaxed">
                              <span className="font-bold">Why this happens: </span>
                              <RenderWithMath text={whyText} showOptions={false} />
                            </p>
                          )}
                          {howToAvoidText && (
                            <div className="ml-6 mt-2 p-3 bg-emerald-50 border border-emerald-300 rounded-lg">
                              <div className="flex items-start gap-2">
                                <CheckCircle size={14} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-emerald-900 mb-1">How to avoid:</p>
                                  <p className="text-xs text-emerald-800 leading-relaxed">
                                    <RenderWithMath text={howToAvoidText} showOptions={false} />
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Study Tip */}
              {question.studyTip && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/80 border-2 border-purple-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain size={18} className="text-purple-600" />
                    <h4 className="text-sm font-bold text-purple-900 uppercase tracking-wide">Pro Study Tip</h4>
                  </div>
                  <p className="text-sm text-purple-900 leading-relaxed font-medium whitespace-pre-line">
                    <RenderWithMath text={question.studyTip} showOptions={false} />
                  </p>
                </div>
              )}

              {/* Things to Remember */}
              {question.thingsToRemember && question.thingsToRemember.length > 0 && (
                <div className="bg-white border-2 border-emerald-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle size={18} className="text-emerald-600" />
                    <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-wide">Key Points to Remember</h4>
                  </div>
                  <div className="space-y-2">
                    {question.thingsToRemember.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all">
                        <div className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1 text-sm font-medium text-emerald-900 pt-0.5">
                          <RenderWithMath text={item} showOptions={false} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Concept */}
              {question.visualConcept && (
                <div className="bg-white border-2 border-blue-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Visual Concept</h4>
                  </div>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    <RenderWithMath text={question.visualConcept} showOptions={false} />
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Lightbulb size={48} className="text-slate-300 mx-auto mb-4" />
              <h3 className="font-black text-lg text-slate-900 mb-2">No AI Insights Available</h3>
              <p className="text-sm text-slate-600 mb-4">
                AI insights for this question will be generated soon.
              </p>
              <p className="text-xs text-slate-500">
                Insights include concept explanations, common mistakes, and learning patterns.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeInsightsModal;
