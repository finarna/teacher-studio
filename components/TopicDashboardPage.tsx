import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  Grid3x3,
  List,
  TrendingUp,
  Clock,
  BookOpen,
  Zap,
  Brain,
  Target,
  CheckCircle2,
  Circle,
  PlayCircle,
  FileQuestion,
  Sparkles,
  AlertCircle,
  Trophy,
  Flame,
  RefreshCw
} from 'lucide-react';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
import type { Subject, ExamContext, TopicResource } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';

interface TopicDashboardPageProps {
  subject: Subject;
  examContext: ExamContext;
  topics: TopicResource[];
  onSelectTopic: (topicId: string) => void;
  onBack: () => void;
  aiRecommendation?: {
    topicId: string;
    topicName: string;
    reason: string;
    urgency: 'high' | 'medium' | 'low';
  };
  studyStreak?: number;
}

type ViewMode = 'heatmap' | 'list';

const TopicDashboardPage: React.FC<TopicDashboardPageProps> = ({
  subject,
  examContext,
  topics,
  onSelectTopic,
  onBack,
  aiRecommendation,
  studyStreak = 0
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refreshData } = useLearningJourney();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      console.log('✅ [TopicDashboard] Data refreshed successfully');
    } catch (error) {
      console.error('❌ [TopicDashboard] Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const subjectConfig = SUBJECT_CONFIGS[subject];

  // Group topics by domain
  const topicsByDomain = useMemo(() => {
    const grouped: Record<string, TopicResource[]> = {};
    topics.forEach(topic => {
      const domain = topic.topicName.split(' - ')[0] || 'Other'; // Simple domain extraction
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      grouped[domain].push(topic);
    });
    return grouped;
  }, [topics]);

  const domains = Object.keys(topicsByDomain);

  // Calculate stats
  const totalTopics = topics.length;
  const masteredTopics = topics.filter(t => t.masteryLevel >= 85).length;
  const inProgressTopics = topics.filter(t => t.masteryLevel > 0 && t.masteryLevel < 85).length;
  const notStartedTopics = topics.filter(t => t.masteryLevel === 0).length;
  const averageMastery = Math.round(
    topics.reduce((sum, t) => sum + t.masteryLevel, 0) / (totalTopics || 1)
  );

  // Get mastery color
  const getMasteryColor = (mastery: number): string => {
    if (mastery === 0) return 'bg-slate-100 text-slate-400 border-slate-200';
    if (mastery < 30) return 'bg-red-100 text-red-700 border-red-300';
    if (mastery < 50) return 'bg-orange-100 text-orange-700 border-orange-300';
    if (mastery < 70) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (mastery < 85) return 'bg-lime-100 text-lime-700 border-lime-300';
    return 'bg-emerald-100 text-emerald-700 border-emerald-300';
  };

  const getMasteryBgColor = (mastery: number): string => {
    if (mastery === 0) return 'bg-slate-100';
    if (mastery < 30) return 'bg-red-100';
    if (mastery < 50) return 'bg-orange-100';
    if (mastery < 70) return 'bg-yellow-100';
    if (mastery < 85) return 'bg-lime-100';
    return 'bg-emerald-100';
  };

  const getMasteryLabel = (mastery: number): string => {
    if (mastery === 0) return 'Not Started';
    if (mastery < 30) return 'Beginner';
    if (mastery < 50) return 'Learning';
    if (mastery < 70) return 'Progressing';
    if (mastery < 85) return 'Good';
    return 'Mastered';
  };

  const filteredTopics = selectedDomain === 'all'
    ? topics
    : topicsByDomain[selectedDomain] || [];

  return (
    <div className="bg-slate-50/50 font-instrument text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft size={20} />
                <span className="text-sm font-black uppercase tracking-wider">Back</span>
              </button>

              <div className="h-6 w-px bg-slate-200" />

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{ background: `linear-gradient(135deg, ${subjectConfig.color} 0%, ${subjectConfig.colorDark} 100%)` }}
                >
                  <span className="text-xl">{subjectConfig.iconEmoji}</span>
                </div>
                <div>
                  <h1 className="font-black text-xl tracking-tight text-slate-900">
                    {subjectConfig.displayName}
                  </h1>
                  <p className="text-xs font-medium text-slate-500">{examContext} • {totalTopics} topics</p>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Refresh topics from latest scans"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'heatmap'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid3x3 size={14} className="inline mr-1.5" />
                Heatmap
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List size={14} className="inline mr-1.5" />
                List
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Overall Mastery
                </span>
                <span className="text-xs font-black text-slate-900">{averageMastery}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${averageMastery}%`,
                    background: `linear-gradient(90deg, ${subjectConfig.color} 0%, ${subjectConfig.colorDark} 100%)`
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="font-black text-slate-900">{masteredTopics}</span>
                <span className="font-medium text-slate-500">mastered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PlayCircle size={14} className="text-blue-500" />
                <span className="font-black text-slate-900">{inProgressTopics}</span>
                <span className="font-medium text-slate-500">in progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Circle size={14} className="text-slate-400" />
                <span className="font-black text-slate-900">{notStartedTopics}</span>
                <span className="font-medium text-slate-500">not started</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={18} className="text-amber-500" />
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Achievement
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">{masteredTopics}/{totalTopics}</div>
                <div className="text-xs font-medium text-slate-600">Topics Mastered</div>
              </div>

              <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={18} className="text-blue-500" />
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Accuracy
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {Math.round(topics.reduce((sum, t) => sum + t.averageAccuracy, 0) / (totalTopics || 1))}%
                </div>
                <div className="text-xs font-medium text-slate-600">Average Score</div>
              </div>

              <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={18} className="text-orange-500" />
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Streak
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">{studyStreak}</div>
                <div className="text-xs font-medium text-slate-600">Day Streak</div>
              </div>
            </div>

            {/* Domain Filter (for list view) */}
            {viewMode === 'list' && (
              <div className="mb-6">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedDomain('all')}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                      selectedDomain === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    All Topics ({totalTopics})
                  </button>
                  {domains.map(domain => (
                    <button
                      key={domain}
                      onClick={() => setSelectedDomain(domain)}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        selectedDomain === domain
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {domain} ({topicsByDomain[domain].length})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Heatmap View */}
            {viewMode === 'heatmap' && (
              <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="font-black text-lg text-slate-900 uppercase tracking-tight">Topic Mastery Heatmap</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400 uppercase">Mastery:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded"></div>
                      <span className="text-[10px] text-slate-400 font-medium">0%</span>
                      <div className="w-px h-3 bg-slate-200 mx-1"></div>
                      <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                      <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
                      <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                      <div className="w-3 h-3 bg-lime-100 border border-lime-200 rounded"></div>
                      <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div>
                      <span className="text-[10px] text-slate-400 font-medium ml-1">100%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4">
                  {topics.map(topic => {
                    const bgColor = topic.masteryLevel === 0 ? 'bg-slate-50/50' :
                                    topic.masteryLevel < 30 ? 'bg-red-50/50' :
                                    topic.masteryLevel < 50 ? 'bg-orange-50/50' :
                                    topic.masteryLevel < 70 ? 'bg-yellow-50/50' :
                                    topic.masteryLevel < 85 ? 'bg-lime-50/50' : 'bg-emerald-50/50';

                    const borderColor = topic.masteryLevel === 0 ? 'border-slate-200' :
                                      topic.masteryLevel < 30 ? 'border-red-200' :
                                      topic.masteryLevel < 50 ? 'border-orange-200' :
                                      topic.masteryLevel < 70 ? 'border-yellow-200' :
                                      topic.masteryLevel < 85 ? 'border-lime-200' : 'border-emerald-200';

                    const textColor = topic.masteryLevel === 0 ? 'text-slate-400' :
                                      topic.masteryLevel < 30 ? 'text-red-600' :
                                      topic.masteryLevel < 50 ? 'text-orange-600' :
                                      topic.masteryLevel < 70 ? 'text-yellow-700' :
                                      topic.masteryLevel < 85 ? 'text-lime-700' : 'text-emerald-700';

                    return (
                      <button
                        key={topic.id}
                        onClick={() => onSelectTopic(topic.topicId)}
                        className={`relative rounded-xl ${bgColor} border ${borderColor} hover:shadow-lg transition-all p-4 flex flex-col items-center justify-center text-center min-h-[180px]`}
                      >
                        <div className={`text-sm font-bold ${textColor} leading-tight mb-4 line-clamp-2`}>
                          {topic.topicName}
                        </div>
                        <div className={`text-5xl font-black ${textColor} mb-3`}>
                          {topic.masteryLevel}%
                        </div>
                        <div className={`text-xs font-bold uppercase tracking-wider ${textColor} opacity-70`}>
                          {getMasteryLabel(topic.masteryLevel)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="font-black text-lg text-slate-900 uppercase tracking-tight">Topic Distribution</h2>
                    <p className="text-xs text-slate-400 font-medium">Top {filteredTopics.length} most covered topics</p>
                  </div>
                  <div className="flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-lg">
                    <span className="text-2xl font-black text-primary-600">{filteredTopics.length}</span>
                    <span className="text-xs text-slate-500 font-medium">Top Topics</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredTopics.map((topic, idx) => {
                    // Vibrant color palette rotation
                    const colors = [
                      { badge: 'bg-blue-500', bar: 'bg-blue-500', text: 'text-blue-600' },
                      { badge: 'bg-purple-500', bar: 'bg-purple-500', text: 'text-purple-600' },
                      { badge: 'bg-indigo-500', bar: 'bg-indigo-500', text: 'text-indigo-600' },
                      { badge: 'bg-violet-500', bar: 'bg-violet-500', text: 'text-violet-600' },
                      { badge: 'bg-pink-500', bar: 'bg-pink-500', text: 'text-pink-600' },
                      { badge: 'bg-rose-500', bar: 'bg-rose-500', text: 'text-rose-600' },
                      { badge: 'bg-orange-500', bar: 'bg-orange-500', text: 'text-orange-600' },
                      { badge: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-amber-600' },
                      { badge: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-600' },
                      { badge: 'bg-teal-500', bar: 'bg-teal-500', text: 'text-teal-600' },
                    ];
                    const colorSet = colors[idx % colors.length];

                    // Calculate coverage percentage (based on mastery level)
                    const coverage = topic.masteryLevel;

                    return (
                      <button
                        key={topic.id}
                        onClick={() => onSelectTopic(topic.topicId)}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-4 hover:shadow-lg hover:border-slate-300 transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          {/* Numbered Badge */}
                          <div className={`${colorSet.badge} w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-sm`}>
                            {topic.totalQuestions}
                          </div>

                          {/* Progress Bar Section */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-black text-base text-slate-900 mb-0.5 line-clamp-1">
                                  {topic.topicName}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                  {topic.totalQuestions} {topic.totalQuestions === 1 ? 'question' : 'questions'}
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                  Coverage
                                </div>
                                <div className={`text-3xl font-black ${colorSet.text}`}>
                                  {coverage}%
                                </div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${colorSet.bar} rounded-full transition-all duration-500`}
                                style={{ width: `${coverage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AI Insights Sidebar */}
          <div className="space-y-4">
            {/* AI Recommendation */}
            {aiRecommendation && (
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">
                    AI Recommendation
                  </span>
                </div>
                <h3 className="font-black text-lg mb-2">{aiRecommendation.topicName}</h3>
                <p className="text-sm font-medium opacity-90 mb-4">
                  {aiRecommendation.reason}
                </p>
                <button
                  onClick={() => onSelectTopic(aiRecommendation.topicId)}
                  className="w-full px-4 py-2.5 bg-white text-primary-600 rounded-lg text-sm font-black hover:bg-primary-50 transition-all"
                >
                  Start Now
                </button>
              </div>
            )}

            {/* Weak Areas Alert */}
            {topics.filter(t => t.masteryLevel > 0 && t.masteryLevel < 40).length > 0 && (
              <div className="bg-white border-2 border-orange-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={18} className="text-orange-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-orange-700">
                    Needs Attention
                  </span>
                </div>
                <div className="space-y-2">
                  {topics
                    .filter(t => t.masteryLevel > 0 && t.masteryLevel < 40)
                    .slice(0, 3)
                    .map(topic => (
                      <button
                        key={topic.id}
                        onClick={() => onSelectTopic(topic.topicId)}
                        className="w-full text-left px-3 py-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all"
                      >
                        <div className="font-black text-sm text-orange-900">{topic.topicName}</div>
                        <div className="text-xs text-orange-700">{topic.masteryLevel}% mastery</div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Study Streak */}
            {studyStreak > 0 && (
              <div className="bg-white border-2 border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Flame size={18} className="text-orange-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Study Streak
                  </span>
                </div>
                <div className="text-4xl font-black text-slate-900 mb-1">{studyStreak}</div>
                <div className="text-sm font-medium text-slate-600 mb-4">
                  {studyStreak === 1 ? 'day' : 'days'} in a row
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Keep it up! Study today to maintain your streak.
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-5">
              <h3 className="font-black text-sm text-slate-900 mb-3 uppercase tracking-wider">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">Total Questions</span>
                  <span className="text-sm font-black text-slate-900">
                    {topics.reduce((sum, t) => sum + t.totalQuestions, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">Attempted</span>
                  <span className="text-sm font-black text-slate-900">
                    {topics.reduce((sum, t) => sum + t.questionsAttempted, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">Quizzes Taken</span>
                  <span className="text-sm font-black text-slate-900">
                    {topics.reduce((sum, t) => sum + t.quizzesTaken, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicDashboardPage;
