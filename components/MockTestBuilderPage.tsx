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
  X
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
