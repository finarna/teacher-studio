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
  MinusCircle,
  BookOpen,
  Signal,
  Check,
  ArrowRight
} from 'lucide-react';
import type { Subject, ExamContext, TopicResource, TestAttempt, AnalyzedQuestion } from '../types';
import { supabase } from '../lib/supabase';
import { cache } from '../utils/cache';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { getApiUrl } from '../lib/api';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';

interface MockTestBuilderPageProps {
  subject: Subject;
  examContext: ExamContext;
  topics: TopicResource[];
  onBack: () => void;
  onStartTest: (attempt: TestAttempt, questions: AnalyzedQuestion[]) => void;
  onViewTestResults: (attemptId: string) => Promise<void>;
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
  onViewTestResults,
  userId
}) => {
  const { subjectProgress } = useLearningJourney();
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('Creating test...');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<PastTestAttempt[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showAllTests, setShowAllTests] = useState(false);

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
    if (selectedTopicIds.length > 0) {
      calculateAvailableQuestions();
    } else {
      setAvailableQuestionCount(0);
    }
  }, [selectedTopicIds, difficultyMix]);

  const fetchWeakTopics = async () => {
    setIsLoadingRecommendations(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl(`/api/learning-journey/weak-topics?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(subject)}&examContext=${encodeURIComponent(examContext)}`);
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl(`/api/learning-journey/test-templates?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(subject)}&examContext=${encodeURIComponent(examContext)}`);
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl(`/api/learning-journey/mock-history?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(subject)}&examContext=${encodeURIComponent(examContext)}&limit=50`);
      console.log('📋 Fetching test history:', { subject, examContext, url });
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Received test history:', result.data?.attempts?.length || 0, 'tests');
        setTestHistory(result.data?.attempts || []);
      } else {
        console.error('❌ Failed to fetch test history:', response.status);
      }
    } catch (error) {
      console.error('Error fetching test history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const calculateAvailableQuestions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl('/api/learning-journey/count-available-questions');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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
        // When AI generation is available, the server returns a large virtual count.
        // Always ensure at least 1 so canCreateTest is not blocked by a stale 0.
        const serverTotal = result.data?.total || 0;
        setAvailableQuestionCount(serverTotal > 0 ? serverTotal : selectedTopicIds.length * 300);
      } else {
        // API error — assume AI can generate, estimate 300 per topic
        setAvailableQuestionCount(selectedTopicIds.length * 300);
      }
    } catch (error) {
      console.error('Error counting available questions:', error);
      // Network error — assume AI can generate
      setAvailableQuestionCount(selectedTopicIds.length * 300);
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
    isDifficultyValid;
  // NOTE: We deliberately do NOT check availableQuestionCount >= questionCount here
  // because the AI can always generate questions on-demand. The pool count display
  // is informational only. The server will throw an error if generation truly fails.

  const handleCreateTest = async () => {
    if (!canCreateTest) return;

    setIsCreatingTest(true);
    setError(null);
    setProgressMessage('Initializing AI test generation...');
    setProgressPercentage(5);

    let pollInterval: NodeJS.Timeout | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl('/api/learning-journey/create-custom-test');

      // POST responds immediately with a progressId — no 504 timeout
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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
        const errorData = await response.json().catch(() => ({ error: 'Failed to create test' }));
        throw new Error(errorData.error || 'Failed to create test');
      }

      const result = await response.json();
      const { progressId } = result.data;

      if (!progressId) {
        throw new Error('No progress ID returned from server');
      }

      // Poll the progress endpoint until generation is complete
      await new Promise<void>((resolve, reject) => {
        // Safety timeout: 5 minutes
        const safetyTimer = setTimeout(() => {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          reject(new Error('Test generation timed out. Please try again.'));
        }, 5 * 60 * 1000);

        pollInterval = setInterval(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const progressUrl = getApiUrl(`/api/learning-journey/generation-progress/${progressId}`);
            const progressRes = await fetch(progressUrl, {
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              credentials: 'include'
            });

            if (!progressRes.ok) return; // transient error, keep polling

            const progressData = await progressRes.json();
            setProgressMessage(progressData.message || 'Generating questions...');
            setProgressPercentage(progressData.percentage || 0);

            if (progressData.step === 'complete' && progressData.result) {
              clearTimeout(safetyTimer);
              clearInterval(pollInterval!);
              pollInterval = null;
              setProgressMessage('✅ Test ready! Redirecting...');
              setProgressPercentage(100);
              setTimeout(() => {
                onStartTest(progressData.result.attempt, progressData.result.questions);
              }, 500);
              resolve();
            } else if (progressData.step === 'error') {
              clearTimeout(safetyTimer);
              clearInterval(pollInterval!);
              pollInterval = null;
              reject(new Error(progressData.message || 'Test generation failed'));
            }
          } catch (err) {
            // Transient poll failure — keep going
            console.warn('Progress poll failed:', err);
          }
        }, 1500);
      });

    } catch (error) {
      console.error('Error creating test:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create test. Please try again.';
      setError(errorMessage);
    } finally {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      setTimeout(() => {
        setIsCreatingTest(false);
        setProgressPercentage(0);
      }, 600);
    }
  };

  // Calculate stats
  const completed = testHistory.filter(a => a.status === 'completed' && a.percentage != null);
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, a) => s + (a.percentage ?? 0), 0) / completed.length)
    : null;
  const bestScore = completed.length > 0
    ? Math.max(...completed.map(a => a.percentage ?? 0))
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 2. REFINED PROFESSIONAL HEADER */}
      <LearningJourneyHeader
        showBack
        onBack={onBack}
        icon={<Zap size={24} className="text-white" />}
        title="Mock Missions"
        subtitle={`${subject} • Custom Evaluation`}
        subject={subject}
        trajectory={examContext}
        mastery={subjectProgress?.[subject]?.overallMastery}
        accuracy={subjectProgress?.[subject]?.overallAccuracy ?? 0}
        actions={
          avgScore !== null && (
            <div className="flex items-center gap-6 pr-4 border-l border-slate-200 pl-4">
              <div className="hidden lg:flex flex-col items-end mr-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Builder</span>
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none">Stats</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-slate-900 font-outfit leading-none">{avgScore}%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg Score</div>
              </div>
              <div className="h-8 w-[1px] bg-slate-200" />
              <div className="text-right">
                <div className="text-xl font-bold text-emerald-600 font-outfit leading-none">{bestScore}%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Best Score</div>
              </div>
            </div>
          )
        }
      />

      {/* Error Banner */}
      {error && (
        <div className="max-w-[1400px] mx-auto px-3 pt-2">
          <div className="bg-red-50 border border-red-200 rounded p-2 flex items-center gap-2 text-xs">
            <AlertCircle size={14} className="text-red-600" />
            <span className="flex-1 text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="text-red-600">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Premium Compact Builder Layout */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:gap-10 items-start min-h-[calc(100vh-220px)]">

          {/* LEFT COLUMN: History & Intelligence */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            {/* AI Diagnostics Box */}
            <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-2xl relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 blur-3xl rounded-full -mr-10 -mt-10" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-primary-400 mb-3">
                  <Sparkles size={16} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">AI Diagnostics</span>
                </div>

                {isLoadingRecommendations ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 size={24} className="animate-spin text-primary-500" />
                  </div>
                ) : weakTopics.length > 0 ? (
                  <>
                    <h3 className="text-white font-outfit font-bold text-lg leading-tight mb-4">
                      Strategic Focus Recommended
                    </h3>
                    <div className="space-y-2 mb-4">
                      {weakTopics.slice(0, 3).map((wt) => (
                        <div key={wt.topicId} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-white">
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="text-xs font-bold truncate">{wt.topicName}</div>
                            <div className="text-[9px] text-slate-400 truncate mt-0.5">{wt.reason}</div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end">
                            <span className="text-xs font-black text-red-400">{wt.masteryLevel}%</span>
                            <span className="text-[8px] uppercase tracking-widest text-slate-500">Mastery</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={applyRecommendations}
                      className="w-full py-2.5 bg-primary-500 hover:bg-primary-400 text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                    >
                      Autofill AI Mix
                    </button>
                  </>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-sm font-medium">
                    No critical weaknesses detected yet.
                  </div>
                )}
              </div>
            </div>

            {/* Test History */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col flex-1 min-h-[400px]">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-slate-400" />
                  <h3 className="text-sm font-black text-slate-900 font-outfit tracking-tight">Past Exams</h3>
                </div>
                {testHistory.length > 5 && (
                  <button
                    onClick={() => setShowAllTests(!showAllTests)}
                    className="text-[10px] font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full"
                  >
                    {showAllTests ? 'Show Less' : `View All (${testHistory.length})`}
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 pr-1 space-y-2 custom-scrollbar">
                {isLoadingHistory ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 size={24} className="animate-spin text-slate-300" />
                  </div>
                ) : testHistory.length > 0 ? (
                  (showAllTests ? testHistory : testHistory.slice(0, 5)).map((attempt) => {
                    const pct = attempt.percentage ?? 0;
                    const isCompleted = attempt.status === 'completed';
                    const scoreColor = !isCompleted ? 'slate' : pct >= 80 ? 'emerald' : pct >= 50 ? 'amber' : 'red';

                    return (
                      <button
                        key={attempt.id}
                        onClick={() => isCompleted && onViewTestResults(attempt.id)}
                        disabled={!isCompleted}
                        className={`w-full flex items-center p-3 rounded-2xl border transition-all text-left ${isCompleted ? 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md cursor-pointer group' : 'bg-slate-50 border-transparent opacity-60 cursor-not-allowed'}`}
                      >
                        <div className={`w-11 h-11 rounded-full bg-${scoreColor}-50 flex items-center justify-center shrink-0`}>
                          {isCompleted ? (
                            <span className={`text-sm font-black text-${scoreColor}-600 tracking-tighter`}>{Math.round(pct)}%</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">—</span>
                          )}
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${isCompleted ? 'text-slate-900 group-hover:text-primary-600 transition-colors' : 'text-slate-500'}`}>
                            {attempt.testName}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-medium text-slate-400">
                              {attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Draft'}
                            </span>
                            {isCompleted && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-medium text-slate-400">{attempt.questionsAttempted}/{attempt.totalQuestions} Qs</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <Target size={20} className="text-slate-300" />
                    </div>
                    <p className="text-xs font-medium text-slate-500">No mock tests taken yet</p>
                    <p className="text-[10px] text-slate-400 mt-1">Build your first test to track performance</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Studio Builder */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl flex flex-col relative">

            {/* Header / Name */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 shrink-0 z-10 relative">
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Test Signature</label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="E.g., Weekend Challenge 01"
                  className="w-full text-2xl font-black text-slate-900 border-none bg-transparent p-0 placeholder:text-slate-300 focus:ring-0"
                />
              </div>

              {templates.length > 0 && (
                <div className="shrink-0 w-full md:w-48">
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        const template = templates.find(t => t.id === e.target.value);
                        if (template) loadTemplate(template);
                      }}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer"
                    >
                      <option value="">Load Template...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.templateName}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Content Display Area */}
            <div className="flex-1 pr-2 space-y-8 relative z-10 pb-6">

              {/* Syllabus Selection */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-black text-slate-900 font-outfit flex items-center gap-2">
                    <BookOpen size={16} className="text-slate-400" />
                    Syllabus Coverage
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                      {selectedTopicIds.length} Selected
                    </span>
                    <button onClick={selectAllTopics} className="text-[10px] font-black uppercase text-primary-600 hover:text-primary-700 transition">Select All</button>
                    <button onClick={clearTopics} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition">Clear</button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => {
                    const isSelected = selectedTopicIds.includes(topic.topicId);
                    return (
                      <button
                        key={topic.topicId}
                        onClick={() => toggleTopic(topic.topicId)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border ${isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        {topic.topicName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders Area */}
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

                  {/* Test Scale Controls */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
                      <Target size={12} /> Test Scale
                    </h4>

                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="text-xs font-bold text-slate-700">Questions</label>
                        <span className="text-lg font-black font-outfit text-slate-900 leading-none">{questionCount}</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                      />
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] font-medium text-slate-400">10 Qs</span>
                        <span className="text-[9px] font-medium text-slate-400">100 Qs</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="text-xs font-bold text-slate-700">Duration</label>
                        <span className="text-lg font-black font-outfit text-slate-900 leading-none">{durationMinutes}m</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="180"
                        step="5"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                      />
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] font-medium text-slate-400">10m</span>
                        <span className="text-[9px] font-medium text-slate-400">180m</span>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Controls */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Signal size={12} /> Complexity Matrix
                      </h4>
                      <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${isDifficultyValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        Total: {difficultyTotal}%
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-emerald-600">Foundation</span>
                        <span className="text-xs font-bold text-emerald-600">{difficultyMix.easy}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100" step="5"
                        value={difficultyMix.easy}
                        onChange={(e) => handleDifficultyChange('easy', parseInt(e.target.value))}
                        className="w-full h-1 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-amber-600">Standard</span>
                        <span className="text-xs font-bold text-amber-600">{difficultyMix.moderate}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100" step="5"
                        value={difficultyMix.moderate}
                        onChange={(e) => handleDifficultyChange('moderate', parseInt(e.target.value))}
                        className="w-full h-1 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-red-600">Advanced</span>
                        <span className="text-xs font-bold text-red-600">{difficultyMix.hard}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100" step="5"
                        value={difficultyMix.hard}
                        onChange={(e) => handleDifficultyChange('hard', parseInt(e.target.value))}
                        className="w-full h-1 bg-red-100 rounded-lg appearance-none cursor-pointer accent-red-500"
                      />
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Bottom Floating Action Bar */}
            <div className="pt-4 border-t border-slate-100 mt-auto shrink-0 bg-white z-20">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                <div className="flex items-center gap-4 w-full md:w-auto">
                  {/* Availability Badge */}
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 min-w-[120px]">
                    <FileQuestion size={14} className="text-slate-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Pool Size</span>
                      <span className="text-sm font-bold text-slate-900 leading-none mt-0.5">{availableQuestionCount} Qs</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${saveAsTemplate ? 'bg-primary-500 border-primary-500' : 'bg-white border-slate-300 group-hover:border-primary-400'}`}>
                      {saveAsTemplate && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">Save as Template</span>
                  </label>
                </div>

                <div className="w-full md:w-auto flex-1 flex flex-col items-end">
                  {!canCreateTest && (
                    <div className="text-[10px] text-red-500 font-bold mb-1.5 flex gap-2">
                      {testName.trim() === '' && <span>• Name required</span>}
                      {selectedTopicIds.length === 0 && <span>• Select topics</span>}
                      {!isDifficultyValid && <span>• Fix difficulty mix (must total 100%)</span>}
                    </div>
                  )}

                  <button
                    onClick={handleCreateTest}
                    disabled={!canCreateTest || isCreatingTest}
                    className={`w-full md:w-auto px-8 py-3.5 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${canCreateTest && !isCreatingTest
                      ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-slate-900/20 active:scale-95'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                      }`}
                  >
                    {isCreatingTest ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>{progressMessage}</span>
                        {progressPercentage > 0 && <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{progressPercentage}%</span>}
                      </>
                    ) : (
                      <>
                        <span>Generate & Start Mission</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default MockTestBuilderPage;
