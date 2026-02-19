import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
  Play,
  Target,
  Clock,
  FileQuestion,
  Sparkles,
  TrendingDown,
  X,
  History,
  Trophy,
  TrendingUp,
  BarChart2,
  CheckCircle,
  XCircle,
  MinusCircle
} from 'lucide-react';
import type { Subject, ExamContext, TopicResource, TestAttempt, AnalyzedQuestion } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { getApiUrl } from '../lib/api';

interface MockTestBuilderPageProps {
  subject: Subject;
  examContext: ExamContext;
  topics: TopicResource[];
  onBack: () => void;
  onStartTest: (attempt: TestAttempt, questions: AnalyzedQuestion[]) => void;
  userId: string;
}

interface WeakTopic {
  topicId: string;
  topicName: string;
  masteryLevel: number;
  practiceAccuracy: number;
  weaknessScore: number;
  reason: string;
}

interface TestTemplate {
  id: string;
  templateName: string;
  topicIds: string[];
  difficultyMix: { easy: number; moderate: number; hard: number };
  questionCount: number;
  durationMinutes: number;
  lastUsed: string;
}

interface TopicAnalysisEntry {
  topicId: string;
  topicName: string;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  percentage: number;
}

interface PastTestAttempt {
  id: string;
  testName: string;
  subject: string;
  examContext: string;
  percentage: number | null;
  rawScore: number | null;
  marksObtained: number | null;
  marksTotal: number | null;
  totalQuestions: number;
  questionsAttempted: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  durationMinutes: number;
  totalDuration: number | null;
  topicAnalysis: TopicAnalysisEntry[] | null;
  timeAnalysis: Record<string, number> | null;
}

const MockTestBuilderPage: React.FC<MockTestBuilderPageProps> = ({
  subject,
  examContext,
  topics,
  onBack,
  onStartTest,
  userId
}) => {
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<PastTestAttempt[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Test configuration state
  const [testName, setTestName] = useState('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(25);
  const [difficultyMix, setDifficultyMix] = useState({ easy: 30, moderate: 50, hard: 20 });
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [availableQuestionCount, setAvailableQuestionCount] = useState(0);

  const subjectConfig = SUBJECT_CONFIGS[subject];

  useEffect(() => {
    fetchWeakTopics();
    fetchTemplates();
    fetchTestHistory();
  }, [subject, examContext, userId]);

  useEffect(() => {
    // Calculate available questions when topics or difficulty changes
    if (selectedTopicIds.length > 0) {
      calculateAvailableQuestions();
    } else {
      setAvailableQuestionCount(0);
    }
  }, [selectedTopicIds, difficultyMix]);

  const fetchWeakTopics = async () => {
    setIsLoadingRecommendations(true);
    try {
      const url = getApiUrl(`/api/learning-journey/weak-topics?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(subject)}&examContext=${encodeURIComponent(examContext)}`);
      const response = await fetch(url);

      if (response.ok) {
        const result = await response.json();
        setWeakTopics(result.data?.weakTopics || []);
      } else {
        console.error('Failed to fetch weak topics');
        setWeakTopics([]);
      }
    } catch (error) {
      console.error('Error fetching weak topics:', error);
      setWeakTopics([]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const url = getApiUrl(`/api/learning-journey/test-templates?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(subject)}&examContext=${encodeURIComponent(examContext)}`);
      const response = await fetch(url);

      if (response.ok) {
        const result = await response.json();
        setTemplates(result.data?.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchTestHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const url = getApiUrl(`/api/learning-journey/mock-history?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(subject)}&examContext=${encodeURIComponent(examContext)}&limit=5`);
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setTestHistory(result.data?.attempts || []);
      }
    } catch (error) {
      console.error('Error fetching test history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const calculateAvailableQuestions = async () => {
    try {
      const url = getApiUrl('/api/learning-journey/count-available-questions');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject,
          examContext,
          topicIds: selectedTopicIds,
          difficultyMix
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAvailableQuestionCount(result.data?.total || 0);
      } else {
        // Fallback to estimation if API fails
        const estimatedPerTopic = 20;
        setAvailableQuestionCount(selectedTopicIds.length * estimatedPerTopic);
      }
    } catch (error) {
      console.error('Error counting available questions:', error);
      // Fallback to estimation
      const estimatedPerTopic = 20;
      setAvailableQuestionCount(selectedTopicIds.length * estimatedPerTopic);
    }
  };

  const applyRecommendations = () => {
    if (weakTopics.length > 0) {
      const recommendedTopicIds = weakTopics.slice(0, 5).map(wt => wt.topicId);
      setSelectedTopicIds(recommendedTopicIds);
      setShowRecommendations(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const selectAllTopics = () => {
    setSelectedTopicIds(topics.map(t => t.topicId));
  };

  const clearTopics = () => {
    setSelectedTopicIds([]);
  };

  const loadTemplate = (template: TestTemplate) => {
    setTestName(template.templateName);
    setSelectedTopicIds(template.topicIds);
    setDifficultyMix(template.difficultyMix);
    setQuestionCount(template.questionCount);
    setDurationMinutes(template.durationMinutes);
  };

  const handleDifficultyChange = (level: 'easy' | 'moderate' | 'hard', value: number) => {
    setDifficultyMix(prev => ({ ...prev, [level]: value }));
  };

  const difficultyTotal = difficultyMix.easy + difficultyMix.moderate + difficultyMix.hard;
  const isDifficultyValid = difficultyTotal === 100;

  const canCreateTest =
    testName.trim() !== '' &&
    selectedTopicIds.length > 0 &&
    isDifficultyValid &&
    availableQuestionCount >= questionCount;

  const handleCreateTest = async () => {
    if (!canCreateTest) return;

    setIsCreatingTest(true);
    setError(null);
    try {
      const url = getApiUrl('/api/learning-journey/create-custom-test');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          testName,
          subject,
          examContext,
          topicIds: selectedTopicIds,
          questionCount,
          difficultyMix,
          durationMinutes,
          saveAsTemplate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create test');
      }

      const result = await response.json();
      const { attempt, questions } = result.data;

      // Navigate to test
      onStartTest(attempt, questions);
    } catch (error) {
      console.error('Error creating test:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create test. Please try again.';
      setError(errorMessage);
    } finally {
      setIsCreatingTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
              aria-label="Go back"
            >
              <ChevronLeft size={24} className="text-slate-600 group-hover:text-slate-900" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Zap size={24} className="text-white" />
              </div>
              <div>
                <h1 className="font-black text-xl text-slate-900 font-outfit">
                  Custom Mock Test Builder
                </h1>
                <p className="text-sm text-slate-600 font-instrument">
                  {subject} • {examContext}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-5xl mx-auto px-6 pt-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm text-red-900 mb-1">Error Creating Test</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              aria-label="Dismiss error"
            >
              <X size={16} className="text-red-600" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* AI Recommendations Card */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div className="text-left">
                <h2 className="font-black text-lg text-slate-900 font-outfit">
                  AI Recommendations
                </h2>
                <p className="text-sm text-slate-600 font-instrument">
                  Based on your progress and weak areas
                </p>
              </div>
            </div>
            {showRecommendations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showRecommendations && (
            <div className="px-6 pb-6 border-t border-slate-100">
              {isLoadingRecommendations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={32} className="text-purple-600 animate-spin" />
                </div>
              ) : weakTopics.length > 0 ? (
                <>
                  <div className="mt-4 space-y-3">
                    {weakTopics.slice(0, 5).map((wt) => (
                      <div
                        key={wt.topicId}
                        className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100"
                      >
                        <TrendingDown size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 font-instrument">
                            {wt.topicName}
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            {wt.reason}
                          </div>
                          <div className="flex gap-4 mt-2 text-xs text-slate-500">
                            <span>Mastery: {wt.masteryLevel}%</span>
                            <span>Accuracy: {wt.practiceAccuracy}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={applyRecommendations}
                    className="mt-4 w-full px-6 py-3 bg-purple-600 text-white rounded-xl font-black hover:bg-purple-700 transition-colors"
                  >
                    Apply Recommendations
                  </button>
                </>
              ) : (
                <div className="py-8 text-center text-slate-600">
                  <p className="font-instrument">
                    No specific recommendations yet. Start practicing to get personalized suggestions!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test History & Analytics */}
        {(isLoadingHistory || testHistory.length > 0) && (() => {
          const completed = testHistory.filter(a => a.status === 'completed' && a.percentage != null);
          const avgScore = completed.length > 0
            ? Math.round(completed.reduce((s, a) => s + (a.percentage ?? 0), 0) / completed.length)
            : null;
          const bestScore = completed.length > 0
            ? Math.max(...completed.map(a => a.percentage ?? 0))
            : null;
          const trend = completed.length >= 2
            ? (completed[0].percentage ?? 0) - (completed[completed.length - 1].percentage ?? 0)
            : null;

          // Aggregate topic performance across all completed attempts
          const topicMap: Record<string, { name: string; total: number; correct: number }> = {};
          completed.forEach(a => {
            const topics = Array.isArray(a.topicAnalysis) ? a.topicAnalysis : [];
            topics.forEach(t => {
              if (!topicMap[t.topicId]) topicMap[t.topicId] = { name: t.topicName, total: 0, correct: 0 };
              topicMap[t.topicId].total += t.total;
              topicMap[t.topicId].correct += t.correct;
            });
          });
          const aggregatedTopics = Object.entries(topicMap)
            .map(([id, v]) => ({ id, name: v.name, pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0 }))
            .sort((a, b) => a.pct - b.pct);

          // Bar chart data (last 8 tests, oldest→newest)
          const chartData = [...completed].reverse().slice(-8);

          return (
            <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                    <BarChart2 size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-black text-lg text-slate-900 font-outfit">Mock Test Analytics</h2>
                    <p className="text-sm text-slate-500 font-instrument">
                      {testHistory.length} test{testHistory.length !== 1 ? 's' : ''} • {completed.length} completed
                    </p>
                  </div>
                </div>
                {trend !== null && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black ${
                    trend > 0 ? 'bg-emerald-50 text-emerald-700' : trend < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {trend > 0 ? '+' : ''}{trend}% trend
                  </div>
                )}
              </div>

              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={28} className="text-blue-500 animate-spin" />
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Summary Stats */}
                  {completed.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="text-2xl font-black text-blue-700">{avgScore}%</div>
                        <div className="text-xs font-bold text-blue-600 mt-1">Avg Score</div>
                      </div>
                      <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="text-2xl font-black text-emerald-700">{bestScore}%</div>
                        <div className="text-xs font-bold text-emerald-600 mt-1">Best Score</div>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-2xl font-black text-slate-700">{completed.length}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">Completed</div>
                      </div>
                    </div>
                  )}

                  {/* Score Trend Chart */}
                  {chartData.length >= 2 && (
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Score Trend</div>
                      <div className="flex items-end gap-2 h-24 px-1">
                        {chartData.map((a, i) => {
                          const pct = a.percentage ?? 0;
                          const barH = Math.max(8, Math.round((pct / 100) * 88));
                          const barColor = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
                          return (
                            <div key={a.id} className="flex-1 flex flex-col items-center gap-1">
                              <div className="text-[10px] font-bold text-slate-600">{pct}%</div>
                              <div
                                className={`w-full rounded-t-md transition-all ${barColor}`}
                                style={{ height: `${barH}px` }}
                                title={`${a.testName}: ${pct}%`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
                        <span>Oldest</span>
                        <span>Latest</span>
                      </div>
                    </div>
                  )}

                  {/* Topic Heatmap */}
                  {aggregatedTopics.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Topic Performance (All Tests)</div>
                      <div className="space-y-2">
                        {aggregatedTopics.slice(0, 8).map(t => (
                          <div key={t.id} className="flex items-center gap-3">
                            <div className="w-28 text-xs font-medium text-slate-700 truncate shrink-0">{t.name}</div>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  t.pct >= 75 ? 'bg-emerald-500' : t.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${t.pct}%` }}
                              />
                            </div>
                            <div className={`text-xs font-black w-9 text-right ${
                              t.pct >= 75 ? 'text-emerald-600' : t.pct >= 50 ? 'text-amber-600' : 'text-red-600'
                            }`}>{t.pct}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Individual Attempts */}
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Attempts</div>
                    <div className="space-y-3">
                      {testHistory.map((attempt) => {
                        const pct = attempt.percentage;
                        const isExpanded = expandedHistoryId === attempt.id;
                        const taList = Array.isArray(attempt.topicAnalysis) ? attempt.topicAnalysis : [];
                        const correct = taList.reduce((s, t) => s + t.correct, 0);
                        const incorrect = taList.reduce((s, t) => s + t.incorrect, 0);
                        const skipped = attempt.totalQuestions - (attempt.questionsAttempted);
                        const timeTaken = attempt.totalDuration
                          ? `${Math.floor(attempt.totalDuration / 60)}m ${attempt.totalDuration % 60}s`
                          : null;
                        const scoreColor = pct == null ? 'text-slate-500'
                          : pct >= 75 ? 'text-emerald-600'
                          : pct >= 50 ? 'text-amber-600'
                          : 'text-red-600';
                        const scoreBg = pct == null ? 'bg-slate-100'
                          : pct >= 75 ? 'bg-emerald-50 border border-emerald-200'
                          : pct >= 50 ? 'bg-amber-50 border border-amber-200'
                          : 'bg-red-50 border border-red-200';

                        return (
                          <div key={attempt.id} className="border border-slate-200 rounded-xl overflow-hidden">
                            <button
                              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                              onClick={() => setExpandedHistoryId(isExpanded ? null : attempt.id)}
                            >
                              {/* Score badge */}
                              <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${scoreBg}`}>
                                {pct != null ? (
                                  <div className="text-center">
                                    <div className={`text-base font-black leading-none ${scoreColor}`}>{Math.round(pct)}%</div>
                                    <Trophy size={10} className={`mx-auto mt-0.5 ${scoreColor}`} />
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-slate-400">N/A</span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-black text-sm text-slate-900 font-instrument truncate">{attempt.testName}</div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                                  {attempt.completedAt && (
                                    <span>{new Date(attempt.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                                  )}
                                  <span>{attempt.totalQuestions}Q • {attempt.durationMinutes}min</span>
                                  {timeTaken && <span>Took {timeTaken}</span>}
                                </div>
                              </div>

                              {/* Quick stats */}
                              {attempt.status === 'completed' && (
                                <div className="hidden sm:flex items-center gap-3 text-xs mr-3">
                                  <div className="flex items-center gap-1 text-emerald-600">
                                    <CheckCircle size={12} />
                                    <span className="font-bold">{correct}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-red-500">
                                    <XCircle size={12} />
                                    <span className="font-bold">{incorrect}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-slate-400">
                                    <MinusCircle size={12} />
                                    <span className="font-bold">{skipped}</span>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                  attempt.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {attempt.status === 'completed' ? 'Done' : 'Incomplete'}
                                </span>
                                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                              </div>
                            </button>

                            {/* Expanded detail panel */}
                            {isExpanded && attempt.status === 'completed' && (
                              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 space-y-4">
                                {/* Score breakdown row */}
                                <div className="grid grid-cols-4 gap-3 text-center">
                                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                                    <div className="text-lg font-black text-slate-900">{pct != null ? Math.round(pct) : 'N/A'}%</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Score</div>
                                  </div>
                                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                    <div className="text-lg font-black text-emerald-700">{correct}</div>
                                    <div className="text-[10px] font-bold text-emerald-600 uppercase">Correct</div>
                                  </div>
                                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                    <div className="text-lg font-black text-red-700">{incorrect}</div>
                                    <div className="text-[10px] font-bold text-red-600 uppercase">Wrong</div>
                                  </div>
                                  <div className="bg-slate-100 rounded-lg p-3 border border-slate-200">
                                    <div className="text-lg font-black text-slate-600">{skipped}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Skipped</div>
                                  </div>
                                </div>

                                {/* Topic breakdown */}
                                {taList.length > 0 && (
                                  <div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Topic Breakdown</div>
                                    <div className="space-y-2">
                                      {[...taList]
                                        .sort((a, b) => a.percentage - b.percentage)
                                        .map(t => (
                                          <div key={t.topicId} className="flex items-center gap-3">
                                            <div className="w-28 text-xs font-medium text-slate-700 truncate shrink-0">{t.topicName}</div>
                                            <div className="flex-1 h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
                                              <div
                                                className={`h-full rounded-full ${
                                                  t.percentage >= 75 ? 'bg-emerald-500' : t.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${t.percentage}%` }}
                                              />
                                            </div>
                                            <div className={`text-xs font-black w-16 text-right ${
                                              t.percentage >= 75 ? 'text-emerald-600' : t.percentage >= 50 ? 'text-amber-600' : 'text-red-600'
                                            }`}>{t.correct}/{t.total} ({t.percentage}%)</div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}

                                {/* Marks */}
                                {attempt.marksObtained != null && (
                                  <div className="text-xs text-slate-500 font-medium">
                                    Marks: <span className="font-black text-slate-700">{attempt.marksObtained}/{attempt.marksTotal}</span>
                                    {timeTaken && <span className="ml-3">Time taken: <span className="font-black text-slate-700">{timeTaken}</span></span>}
                                  </div>
                                )}
                              </div>
                            )}

                            {isExpanded && attempt.status !== 'completed' && (
                              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 text-sm text-slate-500 italic">
                                This test was not completed.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Test Configuration */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 space-y-6">
          <h2 className="font-black text-lg text-slate-900 font-outfit">
            Test Configuration
          </h2>

          {/* Test Name */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Test Name
            </label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., Weekly Math Practice"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 font-instrument focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Topic Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-700">
                Select Topics ({selectedTopicIds.length} selected)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllTopics}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Select All
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={clearTopics}
                  className="text-sm font-bold text-slate-600 hover:text-slate-700 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {templates.length > 0 && (
              <div className="mb-3">
                <select
                  onChange={(e) => {
                    const template = templates.find(t => t.id === e.target.value);
                    if (template) loadTemplate(template);
                  }}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="">Load Template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.templateName}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-4">
              {topics.map((topic) => (
                <label
                  key={topic.topicId}
                  className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTopicIds.includes(topic.topicId)}
                    onChange={() => toggleTopic(topic.topicId)}
                    className="w-4 h-4 accent-amber-600"
                  />
                  <span className="text-sm font-medium text-slate-900 font-instrument">
                    {topic.topicName}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Question Count: {questionCount}
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="w-full accent-amber-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10</span>
              <span>100</span>
            </div>
          </div>

          {/* Difficulty Mix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-700">
                Difficulty Mix
              </label>
              <div className={`text-sm font-black ${isDifficultyValid ? 'text-green-600' : 'text-red-600'}`}>
                Total: {difficultyTotal}% {isDifficultyValid ? '✓' : '(must be 100%)'}
              </div>
            </div>

            <div className="space-y-4">
              {(['easy', 'moderate', 'hard'] as const).map((level) => (
                <div key={level}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 capitalize">
                      {level}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {difficultyMix[level]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={difficultyMix[level]}
                    onChange={(e) => handleDifficultyChange(level, parseInt(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Time Limit */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Time Limit: {durationMinutes} minutes
            </label>
            <input
              type="range"
              min="10"
              max="180"
              step="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
              className="w-full accent-amber-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10 min</span>
              <span>180 min</span>
            </div>
          </div>

          {/* Save as Template */}
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="w-5 h-5 accent-amber-600"
            />
            <div>
              <div className="font-bold text-slate-900 font-instrument">
                Save this configuration as a template
              </div>
              <div className="text-sm text-slate-600">
                Reuse this setup for future tests
              </div>
            </div>
          </label>

          {/* Question Pool Info */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <FileQuestion size={20} className="text-blue-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-slate-900 font-instrument">
                Question Pool: {availableQuestionCount} available
              </div>
              <div className="text-sm text-slate-600">
                {availableQuestionCount >= questionCount
                  ? `Sufficient questions for ${questionCount} question test ✓`
                  : `Not enough questions available (need ${questionCount})`
                }
              </div>
            </div>
          </div>

          {/* Create Test Button */}
          <button
            onClick={handleCreateTest}
            disabled={!canCreateTest || isCreatingTest}
            className={`w-full py-4 rounded-xl font-black text-white transition-all flex items-center justify-center gap-2 ${
              canCreateTest && !isCreatingTest
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {isCreatingTest ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creating Test...
              </>
            ) : (
              <>
                <Play size={20} />
                Create Test & Start
              </>
            )}
          </button>

          {!canCreateTest && (
            <div className="text-sm text-red-600 text-center font-medium">
              {testName.trim() === '' && '• Enter a test name'}
              {selectedTopicIds.length === 0 && ' • Select at least one topic'}
              {!isDifficultyValid && ' • Difficulty mix must total 100%'}
              {availableQuestionCount < questionCount && ' • Not enough questions available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockTestBuilderPage;
