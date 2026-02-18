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

  // Get status badge info based on mastery level and trend
  const getStatusInfo = (topic: TopicResource): { label: string; icon: string; color: string } => {
    const mastery = topic.masteryLevel;

    if (mastery === 0) return { label: 'NOT STARTED', icon: '—', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    if (mastery < 30) return { label: 'CRITICAL', icon: '↓', color: 'bg-red-100 text-red-700 border-red-300' };
    if (mastery < 50) return { label: 'DECLINING', icon: '↓', color: 'bg-orange-100 text-orange-700 border-orange-300' };
    if (mastery < 70) return { label: 'IMPROVING', icon: '↗', color: 'bg-blue-100 text-blue-700 border-blue-300' };
    if (mastery < 85) return { label: 'STABLE', icon: '—', color: 'bg-amber-100 text-amber-700 border-amber-300' };
    return { label: 'MASTERED', icon: '✓', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
  };

  // Calculate 4-step completion progress
  const getStepProgress = (topic: TopicResource): number => {
    const steps = {
      'not_started': 0,
      'studying_notes': 1,
      'practicing': 2,
      'taking_quiz': 3,
      'mastered': 4
    };
    return steps[topic.studyStage] || 0;
  };

  // Get completion percentage (0-100)
  const getCompletionPercentage = (topic: TopicResource): number => {
    const steps = getStepProgress(topic);
    return Math.round((steps / 4) * 100);
  };

  const filteredTopics = selectedDomain === 'all'
    ? topics
    : topicsByDomain[selectedDomain] || [];

  return (
    <div className="bg-slate-50/50 font-instrument text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-2">
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

          {/* Compact Premium Stats Grid */}
          <div className="grid grid-cols-4 gap-2">
            {/* Mastered */}
            <div className="group relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-lg p-2.5 overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer">
              <div className="absolute -bottom-1 -right-1 opacity-10">
                <Trophy size={40} className="text-white" />
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center">
                    <Trophy size={14} className="text-white" />
                  </div>
                  <span className="text-[7px] font-black text-white uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20">Elite</span>
                </div>
                <div className="text-2xl font-black text-white leading-none">{masteredTopics}</div>
                <div className="text-[9px] font-bold text-emerald-100 uppercase tracking-wide mt-0.5">Mastered</div>
              </div>
            </div>

            {/* In Progress */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg p-2.5 overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer">
              <div className="absolute -bottom-1 -right-1 opacity-10">
                <TrendingUp size={40} className="text-white" />
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center">
                    <TrendingUp size={14} className="text-white" />
                  </div>
                  <span className="text-[7px] font-black text-white uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20">Active</span>
                </div>
                <div className="text-2xl font-black text-white leading-none">{inProgressTopics}</div>
                <div className="text-[9px] font-bold text-blue-100 uppercase tracking-wide mt-0.5">In Progress</div>
              </div>
            </div>

            {/* Not Started */}
            <div className="group relative bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-lg p-2.5 overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer">
              <div className="absolute -bottom-1 -right-1 opacity-10">
                <Circle size={40} className="text-white" />
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center">
                    <Circle size={14} className="text-white" />
                  </div>
                  <span className="text-[7px] font-black text-white uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20">Queue</span>
                </div>
                <div className="text-2xl font-black text-white leading-none">{notStartedTopics}</div>
                <div className="text-[9px] font-bold text-slate-300 uppercase tracking-wide mt-0.5">Not Started</div>
              </div>
            </div>

            {/* Average Mastery */}
            <div className="group relative bg-white rounded-lg p-2.5 border-2 border-slate-200 overflow-hidden hover:shadow-lg hover:scale-[1.01] hover:border-purple-300 transition-all cursor-pointer">
              <div className="absolute -bottom-1 -right-1 opacity-5">
                <Target size={40} className="text-purple-600" />
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-7 h-7 rounded-md bg-purple-100 flex items-center justify-center group-hover:bg-purple-200">
                    <Target size={14} className="text-purple-600" />
                  </div>
                  <span className="text-[7px] font-black text-slate-600 uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 group-hover:text-purple-700 group-hover:bg-purple-100">Overall</span>
                </div>
                <div className="text-2xl font-black text-slate-900 leading-none group-hover:text-purple-700">
                  <span>{averageMastery}</span><span className="text-lg">%</span>
                </div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mt-0.5 group-hover:text-purple-600">Avg Mastery</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-3">

        {/* AI Recommendations & Insights */}
        {(aiRecommendation || topics.filter(t => t.masteryLevel > 0 && t.masteryLevel < 40).length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {/* AI Recommendation */}
            {aiRecommendation && (
              <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl p-6 text-white overflow-hidden shadow-lg group hover:shadow-xl transition-shadow">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                  }}></div>
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={20} className="animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      AI Recommendation
                    </span>
                  </div>
                  <h3 className="font-black text-xl mb-2">{aiRecommendation.topicName}</h3>
                  <p className="text-sm font-medium opacity-95 mb-4 leading-relaxed">
                    {aiRecommendation.reason}
                  </p>
                  <button
                    onClick={() => onSelectTopic(aiRecommendation.topicId)}
                    className="w-full px-4 py-3 bg-white text-primary-600 rounded-xl text-sm font-black hover:bg-primary-50 transition-all shadow-sm hover:shadow-md transform hover:scale-[1.02]"
                  >
                    Start Learning Now →
                  </button>
                </div>
              </div>
            )}

            {/* Weak Areas Alert */}
            {topics.filter(t => t.masteryLevel > 0 && t.masteryLevel < 40).length > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle size={20} className="text-orange-600" />
                  <span className="text-sm font-black uppercase tracking-wider text-orange-800">
                    Needs Your Attention
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
                        className="w-full text-left px-4 py-3 bg-white border-2 border-orange-200 rounded-xl hover:bg-orange-50 hover:border-orange-400 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-black text-sm text-orange-900">{topic.topicName}</div>
                            <div className="text-xs text-orange-700 font-medium mt-0.5">
                              <span>{topic.masteryLevel}</span><span className="text-[10px]">%</span> mastery
                            </div>
                          </div>
                          <div className="text-orange-400 group-hover:text-orange-600 transition-colors">
                            <TrendingUp size={18} />
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div>
          {/* Domain Filter (for list view) */}
            {viewMode === 'list' && (
              <div className="mb-3">
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

            {/* Premium Card Grid - World-Class UX */}
            {viewMode === 'heatmap' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {topics.map(topic => {
                  const statusInfo = getStatusInfo(topic);
                  const mastery = topic.masteryLevel;

                  // Premium gradient based on mastery
                  const getGradient = (m: number) => {
                    if (m === 0) return 'from-slate-50 to-slate-100/50';
                    if (m < 30) return 'from-red-50 to-red-100/50';
                    if (m < 50) return 'from-orange-50 to-orange-100/50';
                    if (m < 70) return 'from-blue-50 to-blue-100/50';
                    if (m < 85) return 'from-amber-50 to-amber-100/50';
                    return 'from-emerald-50 to-emerald-100/50';
                  };

                  const getBorderColor = (m: number) => {
                    if (m === 0) return 'border-slate-200/80';
                    if (m < 30) return 'border-red-200/80';
                    if (m < 50) return 'border-orange-200/80';
                    if (m < 70) return 'border-blue-200/80';
                    if (m < 85) return 'border-amber-200/80';
                    return 'border-emerald-200/80';
                  };

                  const getAccentColor = (m: number) => {
                    if (m === 0) return 'bg-slate-500';
                    if (m < 30) return 'bg-gradient-to-r from-red-500 to-red-600';
                    if (m < 50) return 'bg-gradient-to-r from-orange-500 to-orange-600';
                    if (m < 70) return 'bg-gradient-to-r from-blue-500 to-indigo-600';
                    if (m < 85) return 'bg-gradient-to-r from-amber-500 to-amber-600';
                    return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
                  };

                  return (
                    <button
                      key={topic.id}
                      onClick={() => onSelectTopic(topic.topicId)}
                      className={`group relative bg-gradient-to-br ${getGradient(mastery)} border-2 ${getBorderColor(mastery)} rounded-lg p-3 hover:shadow-lg hover:scale-[1.005] transition-all text-left overflow-hidden`}
                    >
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>

                      <div className="relative">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-white/80 backdrop-blur-sm flex items-center justify-center text-xl shadow border border-white/50 flex-shrink-0">
                              {subjectConfig.iconEmoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-black text-sm text-slate-900 leading-tight line-clamp-1">
                                {topic.topicName}
                              </h3>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border backdrop-blur-sm mt-1 ${statusInfo.color}`}>
                                <span className="text-[9px]">{statusInfo.icon}</span>
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>

                          {/* Mastery Badge - Compact */}
                          <div className="relative flex-shrink-0">
                            <div className="w-14 h-14 rounded-lg bg-white/90 backdrop-blur-sm shadow border border-white/50 flex flex-col items-center justify-center">
                              <div className={`text-xl font-black leading-none ${mastery === 0 ? 'text-slate-400' : mastery < 30 ? 'text-red-600' : mastery < 50 ? 'text-orange-600' : mastery < 70 ? 'text-blue-600' : mastery < 85 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {mastery}
                              </div>
                              <div className="text-[8px] font-bold text-slate-500 uppercase">%</div>
                            </div>
                            <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[7px] font-black uppercase tracking-wider">
                              Mastery
                            </div>
                          </div>
                        </div>

                        {/* Compact Progress Bar */}
                        <div className="relative">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Progress</span>
                            <span className="text-[9px] font-black text-slate-900">{mastery}%</span>
                          </div>
                          <div className="h-1.5 bg-white/60 backdrop-blur-sm rounded-full overflow-hidden border border-white/50">
                            <div
                              className={`h-full ${getAccentColor(mastery)} rounded-full transition-all duration-500`}
                              style={{ width: `${mastery}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Premium List View */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {filteredTopics.map(topic => {
                  const statusInfo = getStatusInfo(topic);
                  const mastery = topic.masteryLevel;

                  const getGradient = (m: number) => {
                    if (m === 0) return 'from-slate-50 to-slate-100/50';
                    if (m < 30) return 'from-red-50 to-red-100/50';
                    if (m < 50) return 'from-orange-50 to-orange-100/50';
                    if (m < 70) return 'from-blue-50 to-blue-100/50';
                    if (m < 85) return 'from-amber-50 to-amber-100/50';
                    return 'from-emerald-50 to-emerald-100/50';
                  };

                  const getBorderColor = (m: number) => {
                    if (m === 0) return 'border-slate-200/80';
                    if (m < 30) return 'border-red-200/80';
                    if (m < 50) return 'border-orange-200/80';
                    if (m < 70) return 'border-blue-200/80';
                    if (m < 85) return 'border-amber-200/80';
                    return 'border-emerald-200/80';
                  };

                  const getAccentColor = (m: number) => {
                    if (m === 0) return 'bg-slate-500';
                    if (m < 30) return 'bg-gradient-to-r from-red-500 to-red-600';
                    if (m < 50) return 'bg-gradient-to-r from-orange-500 to-orange-600';
                    if (m < 70) return 'bg-gradient-to-r from-blue-500 to-indigo-600';
                    if (m < 85) return 'bg-gradient-to-r from-amber-500 to-amber-600';
                    return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
                  };

                  return (
                    <button
                      key={topic.id}
                      onClick={() => onSelectTopic(topic.topicId)}
                      className={`group relative w-full bg-gradient-to-br ${getGradient(mastery)} border-2 ${getBorderColor(mastery)} rounded-lg p-3 hover:shadow-lg hover:scale-[1.002] transition-all text-left overflow-hidden`}
                    >
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>

                      <div className="relative flex items-center gap-3">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-lg bg-white/80 backdrop-blur-sm flex items-center justify-center text-xl shadow border border-white/50 flex-shrink-0">
                          {subjectConfig.iconEmoji}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-black text-sm text-slate-900 leading-tight line-clamp-1 mb-1">
                                {topic.topicName}
                              </h3>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border backdrop-blur-sm ${statusInfo.color}`}>
                                <span className="text-[9px]">{statusInfo.icon}</span>
                                {statusInfo.label}
                              </span>
                            </div>

                            {/* Mastery Badge - Compact */}
                            <div className="relative flex-shrink-0">
                              <div className="w-14 h-14 rounded-lg bg-white/90 backdrop-blur-sm shadow border border-white/50 flex flex-col items-center justify-center">
                                <div className={`text-xl font-black leading-none ${mastery === 0 ? 'text-slate-400' : mastery < 30 ? 'text-red-600' : mastery < 50 ? 'text-orange-600' : mastery < 70 ? 'text-blue-600' : mastery < 85 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {mastery}
                                </div>
                                <div className="text-[8px] font-bold text-slate-500 uppercase">%</div>
                              </div>
                              <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[7px] font-black uppercase tracking-wider">
                                Mastery
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TopicDashboardPage;
