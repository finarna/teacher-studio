import React, { useState, useEffect } from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Zap,
  Brain,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  BarChart3,
  Activity,
  Loader2,
  ArrowRight,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import type { TestAttempt, TestResponse, AnalyzedQuestion } from '../types';
import { RenderWithMath } from './MathRenderer';
import { getApiUrl } from '../lib/api';

interface PerformanceAnalysisProps {
  attempt: TestAttempt;
  responses: TestResponse[];
  questions: AnalyzedQuestion[];
  onReviewQuestions: () => void;
  onRetakeTest: () => void;
  onBackToDashboard: () => void;
}

interface AISummary {
  verdict: string;
  strengths: { title: string; detail: string }[];
  weaknesses: { title: string; detail: string }[];
  studyPlan: string;
}

const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({
  attempt,
  responses,
  questions,
  onReviewQuestions,
  onRetakeTest,
  onBackToDashboard
}) => {
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  const [aiError, setAiError] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // Calculate metrics
  const totalQuestions = questions.length;
  const correctAnswers = responses.filter(r => r.isCorrect).length;
  const incorrectAnswers = responses.filter(r => !r.isCorrect && r.selectedOption !== undefined).length;
  const skippedAnswers = responses.filter(r => r.selectedOption === undefined).length;
  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  // Time analysis
  const totalTime = responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
  const avgTimePerQuestion = totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0;

  // Topic breakdown
  const topicStats = new Map<string, { correct: number; total: number }>();
  responses.forEach(r => {
    const stats = topicStats.get(r.topic) || { correct: 0, total: 0 };
    stats.total++;
    if (r.isCorrect) stats.correct++;
    topicStats.set(r.topic, stats);
  });

  // Difficulty breakdown
  const difficultyStats = {
    Easy: { correct: 0, total: 0 },
    Moderate: { correct: 0, total: 0 },
    Hard: { correct: 0, total: 0 }
  };
  responses.forEach(r => {
    const diff = r.difficulty as 'Easy' | 'Moderate' | 'Hard';
    if (difficultyStats[diff]) {
      difficultyStats[diff].total++;
      if (r.isCorrect) difficultyStats[diff].correct++;
    }
  });

  // Weak/strong topics
  const topicArray = Array.from(topicStats.entries()).map(([topic, stats]) => ({
    topic,
    accuracy: Math.round((stats.correct / stats.total) * 100),
    correct: stats.correct,
    total: stats.total
  }));
  const weakTopics = topicArray.filter(t => t.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  const strongTopics = topicArray.filter(t => t.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);

  // Performance label
  const getPerformance = () => {
    if (percentage >= 90) return { label: 'Excellent', color: 'emerald', bg: 'from-emerald-500 to-emerald-600' };
    if (percentage >= 75) return { label: 'Good', color: 'lime', bg: 'from-lime-500 to-lime-600' };
    if (percentage >= 60) return { label: 'Average', color: 'yellow', bg: 'from-yellow-500 to-yellow-600' };
    if (percentage >= 40) return { label: 'Below Avg', color: 'orange', bg: 'from-orange-500 to-orange-600' };
    return { label: 'Needs Work', color: 'red', bg: 'from-red-500 to-red-600' };
  };
  const performance = getPerformance();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const fetchAISummary = async () => {
    setIsLoadingAI(true);
    setAiError(false);
    setAiSummary(null);
    try {
      const topicStatsObj: Record<string, { correct: number; total: number; accuracy: number }> = {};
      topicStats.forEach((stats, topic) => {
        topicStatsObj[topic] = {
          ...stats,
          accuracy: Math.round((stats.correct / stats.total) * 100)
        };
      });

      const diffStatsObj: Record<string, { correct: number; total: number }> = {};
      Object.entries(difficultyStats).forEach(([d, s]) => {
        diffStatsObj[d] = s;
      });

      const url = getApiUrl('/api/learning-journey/ai-summary');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: attempt.subject,
          examContext: attempt.examContext,
          testName: attempt.testName,
          percentage,
          correctAnswers,
          incorrectAnswers,
          skippedAnswers,
          totalQuestions,
          topicStats: topicStatsObj,
          difficultyStats: diffStatsObj,
          avgTimePerQuestion,
          totalTimeSeconds: totalTime
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setAiSummary(result.data);
        } else {
          setAiError(true);
        }
      } else {
        setAiError(true);
      }
    } catch {
      setAiError(true);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Fetch AI summary on mount
  useEffect(() => {
    fetchAISummary();
  }, []);

  return (
    <div className="bg-slate-50 font-instrument text-slate-900 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-black text-2xl tracking-tight text-slate-900 font-outfit">
              Test Results
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">
              {attempt.testName} · {attempt.subject} · {new Date(attempt.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRetakeTest}
              className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-700 rounded-lg text-sm font-black hover:border-slate-300 transition-all"
            >
              <Zap size={14} className="inline mr-1.5" />
              Retake
            </button>
            <button
              onClick={onBackToDashboard}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-black hover:bg-slate-800 transition-all"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── Score Hero ── */}
        <div className={`bg-gradient-to-br ${performance.bg} rounded-2xl p-7 text-white relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Big score */}
            <div className="text-center flex-shrink-0">
              <div className="text-8xl font-black leading-none mb-1">{percentage}%</div>
              <div className="text-white/80 text-sm font-bold uppercase tracking-widest">{performance.label}</div>
            </div>

            <div className="w-px h-20 bg-white/20 hidden md:block" />

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4 flex-1 w-full">
              {[
                { label: 'Correct', value: correctAnswers, icon: CheckCircle2 },
                { label: 'Incorrect', value: incorrectAnswers, icon: XCircle },
                { label: 'Skipped', value: skippedAnswers, icon: Target },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-4 text-center">
                  <Icon size={18} className="mx-auto mb-1 opacity-80" />
                  <div className="text-3xl font-black">{value}</div>
                  <div className="text-xs font-bold uppercase tracking-wider opacity-80 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="w-px h-20 bg-white/20 hidden md:block" />

            {/* Time */}
            <div className="text-center flex-shrink-0">
              <Clock size={20} className="mx-auto mb-2 opacity-70" />
              <div className="text-2xl font-black">{formatTime(totalTime)}</div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-80 mt-0.5">Total Time</div>
              <div className="text-sm opacity-70 mt-1">{avgTimePerQuestion}s avg/q</div>
            </div>
          </div>
        </div>

        {/* ── AI Strength & Weakness Summary ── */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-black text-slate-900 font-outfit">AI Performance Analysis</h2>
              <p className="text-xs text-slate-500 font-medium">Powered by Gemini · personalised to your results</p>
            </div>
            <button
              onClick={fetchAISummary}
              disabled={isLoadingAI}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-violet-700 bg-violet-100 hover:bg-violet-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Regenerate AI analysis"
            >
              {isLoadingAI
                ? <Loader2 size={13} className="animate-spin" />
                : <Sparkles size={13} />
              }
              {isLoadingAI ? 'Generating…' : 'Regenerate'}
            </button>
          </div>

          {isLoadingAI ? (
            <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center">
                <Sparkles size={22} className="text-violet-500 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-slate-600">Gemini is analysing your performance…</p>
              <p className="text-xs text-slate-400">Generating personalised insights</p>
            </div>
          ) : aiError ? (
            <div className="px-6 py-8 text-center text-slate-500 text-sm space-y-3">
              <AlertCircle size={20} className="mx-auto text-slate-400" />
              <p>AI summary unavailable. Check your answers in the breakdown below.</p>
              <button
                onClick={fetchAISummary}
                className="mx-auto flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-black hover:bg-violet-700 transition-colors"
              >
                <Sparkles size={14} />
                Try Again
              </button>
            </div>
          ) : aiSummary && (
            <div className="p-6 space-y-5">
              {/* Verdict */}
              <div className="bg-slate-900 text-white rounded-xl px-5 py-4">
                <div className="flex items-start gap-3">
                  <Brain size={18} className="text-violet-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium leading-relaxed">{aiSummary.verdict}</p>
                </div>
              </div>

              {/* Strengths + Weaknesses side by side */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={16} className="text-emerald-600" />
                    <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Strengths</span>
                  </div>
                  <div className="space-y-3">
                    {aiSummary.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 size={11} className="text-white" />
                        </div>
                        <div>
                          <div className="font-black text-sm text-emerald-900">{s.title}</div>
                          <div className="text-xs text-emerald-700 mt-0.5 leading-relaxed">{s.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown size={16} className="text-red-600" />
                    <span className="text-xs font-black text-red-700 uppercase tracking-wider">Areas to Fix</span>
                  </div>
                  <div className="space-y-3">
                    {aiSummary.weaknesses.map((w, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <XCircle size={11} className="text-white" />
                        </div>
                        <div>
                          <div className="font-black text-sm text-red-900">{w.title}</div>
                          <div className="text-xs text-red-700 mt-0.5 leading-relaxed">{w.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 7-Day Study Plan */}
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={16} className="text-violet-600" />
                  <span className="text-xs font-black text-violet-700 uppercase tracking-wider">7-Day Action Plan</span>
                </div>
                <p className="text-sm text-violet-900 leading-relaxed font-medium">{aiSummary.studyPlan}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Two-column analytics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: detailed breakdown */}
          <div className="lg:col-span-2 space-y-6">

            {/* Topic-wise performance */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 size={18} className="text-slate-500" />
                <h2 className="font-black text-slate-900 font-outfit">Topic-wise Performance</h2>
              </div>
              <div className="space-y-4">
                {topicArray.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No topic data available.</p>
                ) : (
                  topicArray
                    .sort((a, b) => a.accuracy - b.accuracy)
                    .map(({ topic, accuracy, correct, total }) => (
                      <div key={topic}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-black text-slate-800">{topic}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">{correct}/{total}</span>
                            <span className={`text-sm font-black ${
                              accuracy >= 80 ? 'text-emerald-600' :
                              accuracy >= 60 ? 'text-amber-600' : 'text-red-600'
                            }`}>{accuracy}%</span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              accuracy >= 80 ? 'bg-emerald-500' :
                              accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${accuracy}%` }}
                          />
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Difficulty breakdown */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Target size={18} className="text-slate-500" />
                <h2 className="font-black text-slate-900 font-outfit">Difficulty Breakdown</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(difficultyStats).map(([diff, stats]) => {
                  const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                  const colors = {
                    Easy: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' },
                    Moderate: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500' },
                    Hard: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', bar: 'bg-red-500' }
                  }[diff] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', bar: 'bg-slate-500' };
                  return (
                    <div key={diff} className={`${colors.bg} border-2 ${colors.border} rounded-xl p-4 text-center`}>
                      <div className={`text-xs font-black uppercase tracking-wider mb-2 ${colors.text}`}>{diff}</div>
                      <div className="text-3xl font-black text-slate-900 mb-1">{acc}%</div>
                      <div className="text-xs text-slate-500 mb-3">{stats.correct}/{stats.total}</div>
                      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className={`h-full ${colors.bar} rounded-full`} style={{ width: `${acc}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question review toggle */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowReview(!showReview)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-slate-500" />
                  <span className="font-black text-slate-900 font-outfit">Review All Answers</span>
                  <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-full text-xs font-black text-slate-600">{questions.length} questions</span>
                </div>
                <ArrowRight size={16} className={`text-slate-400 transition-transform ${showReview ? 'rotate-90' : ''}`} />
              </button>

              {showReview && (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {questions.map((q, idx) => {
                    const resp = responses.find(r => r.questionId === q.id);
                    const isCorrect = resp?.isCorrect;
                    const isSkipped = resp?.selectedOption === undefined;
                    return (
                      <div key={q.id} className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSkipped ? 'bg-slate-100' :
                            isCorrect ? 'bg-emerald-100' : 'bg-red-100'
                          }`}>
                            {isSkipped
                              ? <span className="text-xs font-black text-slate-500">{idx + 1}</span>
                              : isCorrect
                                ? <CheckCircle2 size={14} className="text-emerald-600" />
                                : <XCircle size={14} className="text-red-600" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800 leading-relaxed line-clamp-2">
                              <RenderWithMath text={q.text} showOptions={false} />
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                q.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                                q.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>{q.difficulty}</span>
                              <span className="text-xs text-slate-500">{q.topic}</span>
                              {!isSkipped && resp?.selectedOption !== undefined && (
                                <span className={`text-xs font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {isCorrect ? `✓ Correct (${String.fromCharCode(65 + resp.selectedOption)})` : `✗ Wrong (chose ${String.fromCharCode(65 + resp.selectedOption)}, ans: ${String.fromCharCode(65 + (q.correctOptionIndex ?? 0))})`}
                                </span>
                              )}
                              {isSkipped && <span className="text-xs text-slate-400">Skipped</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Time stats */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-slate-500" />
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider font-outfit">Time Analysis</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total time</span>
                  <span className="font-black text-slate-900">{formatTime(totalTime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Avg per question</span>
                  <span className="font-black text-slate-900">{avgTimePerQuestion}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Allotted</span>
                  <span className="font-black text-slate-900">{attempt.durationMinutes} min</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, (totalTime / (attempt.durationMinutes * 60)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {Math.round((totalTime / (attempt.durationMinutes * 60)) * 100)}% of time used
                </p>
              </div>
            </div>

            {/* Strong areas */}
            {strongTopics.length > 0 && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-emerald-600" />
                  <h3 className="font-black text-xs text-emerald-700 uppercase tracking-wider">Strong Areas</h3>
                </div>
                <div className="space-y-2">
                  {strongTopics.map(t => (
                    <div key={t.topic} className="flex items-center justify-between p-2.5 bg-white/70 rounded-lg">
                      <span className="text-sm font-bold text-emerald-900 truncate">{t.topic}</span>
                      <span className="text-sm font-black text-emerald-700 ml-2">{t.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weak areas */}
            {weakTopics.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle size={16} className="text-red-600" />
                  <h3 className="font-black text-xs text-red-700 uppercase tracking-wider">Priority Topics</h3>
                </div>
                <div className="space-y-2">
                  {weakTopics.map(t => (
                    <div key={t.topic} className="flex items-center justify-between p-2.5 bg-white/70 rounded-lg">
                      <span className="text-sm font-bold text-red-900 truncate">{t.topic}</span>
                      <span className="text-sm font-black text-red-700 ml-2">{t.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={onRetakeTest}
                className="w-full px-4 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-sm font-black hover:from-amber-600 hover:to-amber-700 transition-all shadow-sm"
              >
                <Zap size={15} className="inline mr-2" />
                Retake Test
              </button>
              <button
                onClick={onBackToDashboard}
                className="w-full px-4 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-slate-800 transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalysis;
