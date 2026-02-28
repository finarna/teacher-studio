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
  BookOpen,
  ChevronLeft,
  MinusCircle,
  RefreshCcw,
  Check,
  X,
  Signal
} from 'lucide-react';
import { supabase } from '../lib/supabase';
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

  // Difficulty breakdown — normalize to title case since AI returns lowercase
  const difficultyStats = {
    Easy: { correct: 0, total: 0 },
    Moderate: { correct: 0, total: 0 },
    Hard: { correct: 0, total: 0 }
  };
  responses.forEach(r => {
    // AI questions return 'easy'/'moderate'/'hard', DB questions return 'Easy'/'Moderate'/'Hard'
    const rawDiff = r.difficulty || '';
    const diff = (rawDiff.charAt(0).toUpperCase() + rawDiff.slice(1).toLowerCase()) as 'Easy' | 'Moderate' | 'Hard';
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
    // Check if AI report already exists in attempt
    if (attempt.aiReport && typeof attempt.aiReport === 'object') {
      setAiSummary(attempt.aiReport as AISummary);
      setIsLoadingAI(false);
      return;
    }

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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          attemptId: attempt.id, // Add attemptId for persistence
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
    <div className="min-h-screen bg-slate-50 font-instrument flex flex-col">
      {/* 1. Header Area */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm shrink-0">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBackToDashboard}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h1 className="font-black text-xl tracking-tight text-slate-900 font-outfit leading-none">
                  {attempt.testName || 'Mock Test Results'}
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1.5">
                  {attempt.subject} • {attempt.examContext} • {new Date(attempt.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Premium Results Dashboard */}
      <div className="flex-1 max-w-[1280px] w-full mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:gap-10 items-start min-h-[calc(100vh-140px)]">

          {/* LEFT COLUMN: Hero Score & Actions */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">

            {/* Score & Analytics Engine Box */}
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden shrink-0">
              <div className={`absolute top-0 right-0 w-44 h-44 blur-[80px] rounded-full -mr-16 -mt-16 ${percentage >= 75 ? 'bg-emerald-500/40' : percentage >= 50 ? 'bg-amber-500/30' : 'bg-red-500/30'
                }`} />
              <div className="relative z-10 text-center pb-6 border-b border-white/10">
                <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
                  <Target size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Global Score</span>
                </div>
                <div className="text-7xl font-black text-white font-outfit leading-none tracking-tighter">
                  {percentage}<span className="text-4xl text-white/50">%</span>
                </div>
                <div className={`text-xs font-bold uppercase tracking-widest ${percentage >= 75 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-red-400'
                  } mt-2`}>
                  {performance.label}
                </div>
              </div>

              {/* Condensed Stats Array */}
              <div className="relative z-10 pt-6 grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/10">
                  <CheckCircle2 size={16} className="text-emerald-400 mb-1" />
                  <span className="text-xl font-black text-white">{correctAnswers}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/10">
                  <XCircle size={16} className="text-red-400 mb-1" />
                  <span className="text-xl font-black text-white">{incorrectAnswers}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/10 opacity-70">
                  <MinusCircle size={16} className="text-slate-400 mb-1" />
                  <span className="text-xl font-black text-white">{skippedAnswers}</span>
                </div>
              </div>

              {/* Time Metrics */}
              <div className="relative z-10 mt-4 rounded-xl bg-slate-800/50 p-4 border border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400">
                    <Clock size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Total Time</span>
                    <span className="text-sm font-bold text-white leading-none">{formatTime(totalTime)}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">P/Q</span>
                  <span className="text-sm font-bold text-white leading-none">{avgTimePerQuestion}s</span>
                </div>
              </div>
            </div>

            {/* Quick Action Dock */}
            <div className="flex flex-col gap-2">
              <button
                onClick={onReviewQuestions}
                className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className="text-slate-500 group-hover:text-primary-600 transition-colors" />
                  <span className="text-sm font-black text-slate-900 tracking-tight">Post-Game Review</span>
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
              </button>
              <button
                onClick={onRetakeTest}
                className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 hover:bg-slate-800 rounded-2xl transition-all shadow-md group"
              >
                <div className="flex items-center gap-3">
                  <Zap size={18} className="text-white opacity-80 group-hover:opacity-100" />
                  <span className="text-sm font-black text-white tracking-tight">Re-engage Mission</span>
                </div>
                <ArrowRight size={16} className="text-white opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            {/* Matrix Splits */}
            <div className="flex flex-col gap-4">

              {/* Topic Performance List */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 font-outfit mb-4 flex items-center gap-2">
                  <BookOpen size={16} className="text-slate-400" /> Syllabus Mapping
                </h3>
                <div className="space-y-4">
                  {topicArray.length === 0 ? <span className="text-xs text-slate-400">Empty logic</span> :
                    topicArray.sort((a, b) => a.accuracy - b.accuracy).map(t => (
                      <div key={t.topic}>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-xs font-bold text-slate-700 truncate w-2/3">{t.topic}</span>
                          <span className={`text-xs font-black ${t.accuracy >= 75 ? 'text-emerald-500' : t.accuracy >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{t.accuracy}%</span>
                        </div>
                        <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${t.accuracy >= 75 ? 'bg-emerald-500' : t.accuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'} rounded-full`} style={{ width: `${t.accuracy}%` }} />
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Complexity Split */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 font-outfit mb-4 flex items-center gap-2">
                  <Signal size={16} className="text-slate-400" /> Complexity Distribution
                </h3>
                <div className="flex flex-col gap-3">
                  {Object.entries(difficultyStats).map(([diff, stats]) => {
                    const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                    const colors = {
                      Easy: { ring: 'border-emerald-200 bg-emerald-50/30 text-emerald-700', fill: 'bg-emerald-500' },
                      Moderate: { ring: 'border-amber-200 bg-amber-50/30 text-amber-700', fill: 'bg-amber-500' },
                      Hard: { ring: 'border-red-200 bg-red-50/30 text-red-700', fill: 'bg-red-500' }
                    }[diff] || { ring: 'border-slate-200', fill: 'bg-slate-500' };

                    return (
                      <div key={diff} className={`flex items-center gap-4 p-2.5 rounded-2xl border ${colors.ring}`}>
                        <div className="w-12 text-center shrink-0">
                          <div className="text-xl font-black">{acc}%</div>
                        </div>
                        <div className="flex-1 border-l border-slate-200/50 pl-4 py-0.5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest">{diff}</span>
                            <span className="text-[10px] font-bold opacity-60">{stats.correct}/{stats.total} Vol.</span>
                          </div>
                          <div className="h-1 bg-white rounded-full"><div className={`h-full rounded-full ${colors.fill}`} style={{ width: `${acc}%` }} /></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: Studio Breakdown */}
          <div className="flex flex-col gap-6">

            {/* AI Mastermind Box */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 blur-[100px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center">
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 font-outfit tracking-tight">Personal Coaching & Analysis</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Professor's Insight Report</p>
                    </div>
                  </div>
                  <button
                    onClick={fetchAISummary}
                    disabled={isLoadingAI}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-black text-slate-700 transition"
                  >
                    {isLoadingAI ? <Loader2 size={12} className="animate-spin inline mr-1" /> : <RefreshCcw size={12} className="inline mr-1" />}
                    Recalibrate
                  </button>
                </div>

                {isLoadingAI ? (
                  <div className="py-8 flex flex-col items-center text-center">
                    <Loader2 size={24} className="text-slate-400 animate-spin mb-3" />
                    <span className="text-sm font-bold text-slate-500">Synthesizing neurological insights...</span>
                  </div>
                ) : aiError ? (
                  <div className="py-8 text-center flex flex-col items-center">
                    <AlertCircle size={24} className="text-red-400 mb-2" />
                    <span className="text-sm font-medium text-slate-600">Cognitive analysis unavailable at this time.</span>
                  </div>
                ) : aiSummary && (
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-sm font-medium text-slate-800 leading-relaxed">
                        <strong className="font-black">Coach's Verdict:</strong> <RenderWithMath text={aiSummary.verdict} showOptions={false} serif={false} />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Strengths Board */}
                      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4">
                        <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5 mb-3"><Check size={14} /> Your Strengths</h3>
                        <div className="space-y-3">
                          {aiSummary.strengths.map((s, i) => (
                            <div key={i} className="flex gap-3">
                              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Check size={12} className="font-bold" /></div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">{s.title}</h4>
                                <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                  <RenderWithMath text={s.detail} showOptions={false} serif={false} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Weakness Board */}
                      <div className="bg-red-50/50 border border-red-100/50 rounded-2xl p-4">
                        <h3 className="text-xs font-black text-red-700 uppercase tracking-widest flex items-center gap-1.5 mb-3"><X size={14} /> Areas to Improve & Focus</h3>
                        <div className="space-y-3">
                          {aiSummary.weaknesses.map((w, i) => (
                            <div key={i} className="flex gap-3">
                              <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-600 flex items-center justify-center shrink-0 mt-0.5"><X size={12} className="font-bold" /></div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">{w.title}</h4>
                                <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                  <RenderWithMath text={w.detail} showOptions={false} serif={false} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><Lightbulb size={14} /></div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Your 7-Day Action Plan</h3>
                        <div className="text-sm font-medium leading-relaxed">
                          <RenderWithMath text={aiSummary.studyPlan} showOptions={false} dark={true} serif={false} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>



          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalysis;
