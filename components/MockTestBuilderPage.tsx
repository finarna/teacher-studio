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
      const url = getApiUrl(`/api/learning-journey/mock-history?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(subject)}&examContext=${encodeURIComponent(examContext)}&limit=50`);
      console.log('📋 Fetching test history:', { subject, examContext, url });
      const response = await fetch(url);
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
        const estimatedPerTopic = 20;
        setAvailableQuestionCount(selectedTopicIds.length * estimatedPerTopic);
      }
    } catch (error) {
      console.error('Error counting available questions:', error);
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
    setProgressMessage('Initializing AI test generation...');
    setProgressPercentage(5);

    let pollInterval: NodeJS.Timeout | null = null;

    try {
      const url = getApiUrl('/api/learning-journey/create-custom-test');

      // Start the test creation (this will take time)
      const createPromise = fetch(url, {
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

      // Poll for progress updates
      const pollProgress = async (progressId: string) => {
        try {
          const progressUrl = getApiUrl(`/api/learning-journey/generation-progress/${progressId}`);
          const progressRes = await fetch(progressUrl, { credentials: 'include' });

          if (progressRes.ok) {
            const progressData = await progressRes.json();
            setProgressMessage(progressData.message || 'Generating questions...');
            setProgressPercentage(progressData.percentage || 0);
          }
        } catch (err) {
          // Silently fail - progress is nice-to-have
          console.warn('Progress poll failed:', err);
        }
      };

      // Wait for the creation response
      const response = await createPromise;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create test');
      }

      const result = await response.json();
      const { attempt, questions, progressId } = result.data;

      // If we got a progressId, start polling (for any future slow operations)
      if (progressId) {
        pollInterval = setInterval(() => pollProgress(progressId), 1000);
      }

      // Test is ready!
      setProgressMessage('✅ Test ready! Redirecting...');
      setProgressPercentage(100);

      // Small delay so user sees completion
      setTimeout(() => {
        onStartTest(attempt, questions);
      }, 500);

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
      {/* Ultra Compact Header */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 hover:bg-slate-100 rounded" aria-label="Go back">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 leading-none">Custom Mock Test Builder</h1>
              <p className="text-[10px] text-slate-500">{subject} • {examContext}</p>
            </div>
          </div>

          {/* Quick Stats in Header */}
          {avgScore !== null && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">{avgScore}% Avg</div>
                <div className="text-[10px] text-slate-500">{completed.length} completed</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-emerald-600">{bestScore}% Best</div>
                <div className="text-[10px] text-slate-500">{testHistory.length} total</div>
              </div>
            </div>
          )}
        </div>
      </div>

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

      {/* Two Column Layout */}
      <div className="max-w-[1400px] mx-auto px-3 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3">

          {/* LEFT SIDEBAR - Analytics & Recommendations */}
          <div className="space-y-2">

            {/* AI Recommendations - Collapsed */}
            <div className="bg-white rounded border border-slate-200">
              <button
                onClick={() => setShowRecommendations(!showRecommendations)}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-600" />
                  <span className="text-xs font-bold text-slate-900">AI Tips</span>
                  {weakTopics.length > 0 && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">
                      {weakTopics.length}
                    </span>
                  )}
                </div>
                {showRecommendations ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showRecommendations && (
                <div className="border-t border-slate-100 p-2 space-y-1.5">
                  {isLoadingRecommendations ? (
                    <div className="py-4 flex justify-center">
                      <Loader2 size={16} className="animate-spin text-purple-600" />
                    </div>
                  ) : weakTopics.length > 0 ? (
                    <>
                      {weakTopics.slice(0, 3).map((wt) => (
                        <div key={wt.topicId} className="p-1.5 bg-purple-50 rounded text-xs">
                          <div className="font-bold text-slate-900">{wt.topicName}</div>
                          <div className="text-[10px] text-slate-600 mt-0.5">{wt.masteryLevel}% mastery</div>
                        </div>
                      ))}
                      <button
                        onClick={applyRecommendations}
                        className="w-full mt-1 px-2 py-1.5 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700"
                      >
                        Apply
                      </button>
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-500 py-2 text-center">No recommendations yet</p>
                  )}
                </div>
              )}
            </div>

            {/* Recent Tests - Compact List */}
            <div className="bg-white rounded border border-slate-200 p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <History size={14} className="text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-900">Recent Tests</h3>
                </div>
                {testHistory.length > 3 && (
                  <button
                    onClick={() => setShowAllTests(!showAllTests)}
                    className="text-[9px] font-bold text-blue-600 hover:text-blue-700"
                  >
                    {showAllTests ? 'Show Less' : `View All (${testHistory.length})`}
                  </button>
                )}
              </div>

              {isLoadingHistory ? (
                <div className="py-4 flex justify-center">
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                </div>
              ) : testHistory.length > 0 ? (
                <div className={`space-y-1 ${showAllTests ? 'max-h-96 overflow-y-auto' : ''}`}>
                  {(showAllTests ? testHistory : testHistory.slice(0, 3)).map((attempt) => {
                    const pct = attempt.percentage ?? 0;
                    const color = pct >= 75 ? 'emerald' : pct >= 50 ? 'amber' : 'red';
                    return (
                      <button
                        key={attempt.id}
                        onClick={() => onViewTestResults(attempt.id)}
                        className="w-full flex items-center gap-2 p-1.5 bg-slate-50 rounded hover:bg-slate-100 transition cursor-pointer"
                      >
                        <div className={`w-8 h-8 rounded bg-${color}-50 border border-${color}-200 flex items-center justify-center flex-shrink-0`}>
                          <span className={`text-xs font-black text-${color}-700`}>{Math.round(pct)}%</span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-xs font-medium text-slate-900 truncate">{attempt.testName}</div>
                          <div className="text-[10px] text-slate-500">
                            {attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Incomplete'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 py-2 text-center">No tests yet</p>
              )}
            </div>
          </div>

          {/* RIGHT MAIN AREA - Test Builder Form */}
          <div className="bg-white rounded border border-slate-200 p-3">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Build Your Test</h2>

            <div className="space-y-3">
              {/* Test Name + Template Loader in one row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Test Name</label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="My Practice Test"
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                {templates.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Load Template</label>
                    <select
                      onChange={(e) => {
                        const template = templates.find(t => t.id === e.target.value);
                        if (template) loadTemplate(template);
                      }}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Select...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.templateName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Topics - Compact Grid */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-700">Topics ({selectedTopicIds.length})</label>
                  <div className="flex gap-2">
                    <button onClick={selectAllTopics} className="text-[9px] font-bold text-blue-600">All</button>
                    <button onClick={clearTopics} className="text-[9px] font-bold text-slate-600">Clear</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded p-2">
                  {topics.map((topic) => (
                    <label
                      key={topic.topicId}
                      className="flex items-center gap-1 p-1 bg-slate-50 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTopicIds.includes(topic.topicId)}
                        onChange={() => toggleTopic(topic.topicId)}
                        className="w-3 h-3 accent-amber-600"
                      />
                      <span className="text-[10px] font-medium text-slate-900 truncate">
                        {topic.topicName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Settings in 2x2 Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    Questions: {questionCount}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full accent-amber-600 h-1"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    Duration: {durationMinutes}m
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="180"
                    step="5"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                    className="w-full accent-amber-600 h-1"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    Easy: {difficultyMix.easy}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={difficultyMix.easy}
                    onChange={(e) => handleDifficultyChange('easy', parseInt(e.target.value))}
                    className="w-full accent-green-500 h-1"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    Moderate: {difficultyMix.moderate}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={difficultyMix.moderate}
                    onChange={(e) => handleDifficultyChange('moderate', parseInt(e.target.value))}
                    className="w-full accent-amber-500 h-1"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    Hard: {difficultyMix.hard}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={difficultyMix.hard}
                    onChange={(e) => handleDifficultyChange('hard', parseInt(e.target.value))}
                    className="w-full accent-red-500 h-1"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <div className={`text-xs font-bold ${isDifficultyValid ? 'text-green-600' : 'text-red-600'}`}>
                    Total: {difficultyTotal}%
                  </div>
                  {isDifficultyValid && <CheckCircle2 size={14} className="text-green-600" />}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 flex-1 p-2 bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="w-3 h-3 accent-amber-600"
                  />
                  <span className="text-[10px] font-medium text-slate-900">Save template</span>
                </label>

                <div className="flex items-center gap-1 px-2 py-2 bg-blue-50 rounded border border-blue-100">
                  <FileQuestion size={12} className="text-blue-600" />
                  <span className="text-[10px] font-bold text-blue-900">{availableQuestionCount} Q's</span>
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateTest}
                disabled={!canCreateTest || isCreatingTest}
                className={`w-full py-2 rounded font-bold text-xs text-white transition flex flex-col items-center justify-center gap-1 ${
                  canCreateTest && !isCreatingTest
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {isCreatingTest ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" />
                      <span>{progressMessage}</span>
                    </div>
                    {progressPercentage > 0 && (
                      <div className="w-full bg-white/20 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-white h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Play size={14} />
                    <span>Create Test & Start</span>
                  </div>
                )}
              </button>

              {!canCreateTest && (
                <div className="text-[10px] text-red-600 text-center font-medium -mt-1.5">
                  {testName.trim() === '' && '• Enter name'}
                  {selectedTopicIds.length === 0 && ' • Select topics'}
                  {!isDifficultyValid && ' • Difficulty must = 100%'}
                  {availableQuestionCount < questionCount && ' • Not enough questions'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockTestBuilderPage;
