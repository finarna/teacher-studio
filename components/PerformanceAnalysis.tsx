import React from 'react';
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
  ArrowRight,
  Sparkles,
  BarChart3,
  Activity
} from 'lucide-react';
import type { TestAttempt, TestResponse, AnalyzedQuestion } from '../types';

interface PerformanceAnalysisProps {
  attempt: TestAttempt;
  responses: TestResponse[];
  questions: AnalyzedQuestion[];
  onReviewQuestions: () => void;
  onRetakeTest: () => void;
  onBackToDashboard: () => void;
}

const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({
  attempt,
  responses,
  questions,
  onReviewQuestions,
  onRetakeTest,
  onBackToDashboard
}) => {
  // Calculate metrics
  const totalQuestions = questions.length;
  const correctAnswers = responses.filter(r => r.isCorrect).length;
  const incorrectAnswers = responses.filter(r => !r.isCorrect && r.selectedOption !== undefined).length;
  const skippedAnswers = responses.filter(r => r.selectedOption === undefined).length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  // Time analysis
  const totalTime = responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
  const avgTimePerQuestion = Math.round(totalTime / totalQuestions);
  const fastestTime = Math.min(...responses.map(r => r.timeSpent || 0));
  const slowestTime = Math.max(...responses.map(r => r.timeSpent || 0));

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
    difficultyStats[diff].total++;
    if (r.isCorrect) difficultyStats[diff].correct++;
  });

  // Performance category
  const getPerformanceCategory = (): { label: string; color: string; message: string } => {
    if (percentage >= 90) return {
      label: 'Excellent',
      color: 'emerald',
      message: 'Outstanding performance! You have mastered this topic.'
    };
    if (percentage >= 75) return {
      label: 'Good',
      color: 'lime',
      message: 'Great work! A few more practice sessions will perfect your understanding.'
    };
    if (percentage >= 60) return {
      label: 'Average',
      color: 'yellow',
      message: 'You\'re on the right track. Focus on weak areas to improve.'
    };
    if (percentage >= 40) return {
      label: 'Below Average',
      color: 'orange',
      message: 'More practice needed. Review concepts and try again.'
    };
    return {
      label: 'Needs Improvement',
      color: 'red',
      message: 'Don\'t worry! Review the study materials and practice more questions.'
    };
  };

  const performance = getPerformanceCategory();

  // Time management analysis
  const getTimeManagementInsight = (): string => {
    if (avgTimePerQuestion < 60) return 'You answered questions very quickly. Make sure you\'re reading carefully.';
    if (avgTimePerQuestion < 90) return 'Good time management! You maintained a steady pace.';
    if (avgTimePerQuestion < 120) return 'You took your time to think through questions. Consider practicing speed.';
    return 'You spent significant time on questions. Try to manage time better for full tests.';
  };

  // Weak topics
  const weakTopics = Array.from(topicStats.entries())
    .map(([topic, stats]) => ({
      topic,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      correct: stats.correct,
      total: stats.total
    }))
    .filter(t => t.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  // Strong topics
  const strongTopics = Array.from(topicStats.entries())
    .map(([topic, stats]) => ({
      topic,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      correct: stats.correct,
      total: stats.total
    }))
    .filter(t => t.accuracy >= 80)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-slate-50/50 font-instrument text-slate-900 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="font-black text-3xl tracking-tight text-slate-900 mb-2">
            Test <span className="text-primary-600">Performance Analysis</span>
          </h1>
          <p className="text-slate-600 text-sm font-medium">
            {attempt.testName} • {attempt.subject} • {new Date(attempt.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Score Card */}
        <div className={`bg-gradient-to-br from-${performance.color}-500 to-${performance.color}-600 rounded-2xl p-8 text-white mb-8 relative overflow-hidden`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Score */}
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 mb-3">
                <Trophy size={32} />
                <span className="text-sm font-black uppercase tracking-wider opacity-90">Your Score</span>
              </div>
              <div className="text-7xl font-black mb-2">{percentage}%</div>
              <div className="text-lg font-medium opacity-90">{correctAnswers}/{totalQuestions} correct</div>
            </div>

            {/* Performance Category */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-3">
                  <div className="text-5xl font-black">{performance.label[0]}</div>
                </div>
                <div className="text-xl font-black mb-1">{performance.label}</div>
                <div className="text-sm opacity-90">{performance.message}</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                <span className="text-sm font-medium">Correct</span>
                <span className="text-xl font-black">{correctAnswers}</span>
              </div>
              <div className="flex items-center justify-between bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                <span className="text-sm font-medium">Incorrect</span>
                <span className="text-xl font-black">{incorrectAnswers}</span>
              </div>
              <div className="flex items-center justify-between bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                <span className="text-sm font-medium">Skipped</span>
                <span className="text-xl font-black">{skippedAnswers}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Topic Breakdown */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={20} className="text-slate-600" />
                <h2 className="font-black text-lg text-slate-900">Topic-wise Performance</h2>
              </div>

              <div className="space-y-4">
                {Array.from(topicStats.entries()).map(([topic, stats]) => {
                  const accuracy = Math.round((stats.correct / stats.total) * 100);
                  return (
                    <div key={topic}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-black text-slate-900">{topic}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-600">
                            {stats.correct}/{stats.total}
                          </span>
                          <span className="text-sm font-black text-slate-900">{accuracy}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            accuracy >= 80 ? 'bg-emerald-500' :
                            accuracy >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Difficulty Analysis */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Target size={20} className="text-slate-600" />
                <h2 className="font-black text-lg text-slate-900">Difficulty Analysis</h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {Object.entries(difficultyStats).map(([difficulty, stats]) => {
                  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                  return (
                    <div key={difficulty} className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                        {difficulty}
                      </div>
                      <div className="text-3xl font-black text-slate-900 mb-1">{accuracy}%</div>
                      <div className="text-xs text-slate-600">{stats.correct}/{stats.total}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time Analysis */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Clock size={20} className="text-slate-600" />
                <h2 className="font-black text-lg text-slate-900">Time Management</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs font-black text-blue-600 uppercase tracking-wider mb-1">
                    Total Time
                  </div>
                  <div className="text-2xl font-black text-blue-900">{formatTime(totalTime)}</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-xs font-black text-purple-600 uppercase tracking-wider mb-1">
                    Avg per Question
                  </div>
                  <div className="text-2xl font-black text-purple-900">{avgTimePerQuestion}s</div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start gap-3">
                  <Activity size={20} className="text-slate-500 mt-1" />
                  <div>
                    <div className="font-black text-sm text-slate-900 mb-1">Analysis</div>
                    <div className="text-sm text-slate-700">{getTimeManagementInsight()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Insights */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={20} />
                <h3 className="font-black text-lg">AI Insights</h3>
              </div>
              <div className="space-y-3 text-sm font-medium opacity-90">
                <p>
                  {percentage >= 75
                    ? 'You demonstrated strong understanding of the core concepts. Keep up the excellent work!'
                    : 'Focus on reviewing the fundamental concepts. Practice more questions to build confidence.'}
                </p>
                <p>
                  {weakTopics.length > 0
                    ? `Pay special attention to ${weakTopics[0].topic} - your weakest area.`
                    : 'Your performance was consistent across all topics.'}
                </p>
              </div>
            </div>

            {/* Weak Areas */}
            {weakTopics.length > 0 && (
              <div className="bg-white border-2 border-orange-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle size={20} className="text-orange-500" />
                  <h3 className="font-black text-sm text-orange-700 uppercase tracking-wider">
                    Needs Improvement
                  </h3>
                </div>
                <div className="space-y-3">
                  {weakTopics.map(topic => (
                    <div key={topic.topic} className="p-3 bg-orange-50 rounded-lg">
                      <div className="font-black text-sm text-orange-900 mb-1">{topic.topic}</div>
                      <div className="flex items-center justify-between text-xs text-orange-700">
                        <span>{topic.correct}/{topic.total} correct</span>
                        <span className="font-black">{topic.accuracy}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strong Areas */}
            {strongTopics.length > 0 && (
              <div className="bg-white border-2 border-emerald-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={20} className="text-emerald-500" />
                  <h3 className="font-black text-sm text-emerald-700 uppercase tracking-wider">
                    Strengths
                  </h3>
                </div>
                <div className="space-y-3">
                  {strongTopics.map(topic => (
                    <div key={topic.topic} className="p-3 bg-emerald-50 rounded-lg">
                      <div className="font-black text-sm text-emerald-900 mb-1">{topic.topic}</div>
                      <div className="flex items-center justify-between text-xs text-emerald-700">
                        <span>{topic.correct}/{topic.total} correct</span>
                        <span className="font-black">{topic.accuracy}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={onReviewQuestions}
                className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg text-sm font-black hover:bg-slate-800 transition-all"
              >
                <Brain size={16} className="inline mr-2" />
                Review Questions
              </button>
              <button
                onClick={onRetakeTest}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-lg text-sm font-black hover:border-slate-300 transition-all"
              >
                <Zap size={16} className="inline mr-2" />
                Retake Test
              </button>
              <button
                onClick={onBackToDashboard}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-lg text-sm font-black hover:border-slate-300 transition-all"
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
