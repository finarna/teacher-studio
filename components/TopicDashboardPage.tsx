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
  RefreshCw,
  LayoutGrid,
  Activity,
  Award,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
import type { Subject, ExamContext, TopicResource } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" as any }
  },
  hover: {
    y: -8,
    scale: 1.01,
    transition: { duration: 0.2, ease: "easeOut" as any }
  }
};

const STAGE_ORDER = ['not_started', 'studying_notes', 'practicing', 'taking_quiz', 'mastered'];

const getStageConfig = (stage: string) => {
  switch (stage) {
    case 'not_started': return { label: 'Start', color: 'slate', icon: Circle, index: 0 };
    case 'studying_notes': return { label: 'Learning', color: 'blue', icon: BookOpen, index: 1 };
    case 'practicing': return { label: 'Practicing', color: 'amber', icon: Zap, index: 2 };
    case 'taking_quiz': return { label: 'Testing', color: 'purple', icon: FileQuestion, index: 3 };
    case 'mastered': return { label: 'Mastered', color: 'emerald', icon: Award, index: 4 };
    default: return { label: stage, color: 'slate', icon: Circle, index: 0 };
  }
};

const getTopicVisual = (topicName: string) => {
  const name = topicName.toLowerCase();

  // Math
  if (name.includes('differential equation')) return 'dy/dx';
  if (name.includes('integrals') || name.includes('integration') || name.includes('area under')) return '∫';
  if (name.includes('continuity') || name.includes('limit')) return 'lim';
  if (name.includes('relation') || name.includes('function') || name.includes('inverse trig')) return 'f(x)';
  if (name.includes('determinant')) return '|A|';
  if (name.includes('matrix') || name.includes('matrices')) return '[M]';
  if (name.includes('linear programming') || name.includes('lpp')) return 'Max Z';
  if (name.includes('vector')) return 'v⃗';
  if (name.includes('3d') || name.includes('three dimensional')) return 'x,y,z';
  if (name.includes('probability')) return 'P(E)';
  if (name.includes('trigonometr')) return 'sin θ';
  if (name.includes('derivative') || name.includes('differentiation')) return "f'(x)";
  if (name.includes('application of derivative')) return 'df/dt';

  // Physics
  if (name.includes('electrostatic') || name.includes('charge')) return 'q';
  if (name.includes('current') || name.includes('electricity')) return 'V=IR';
  if (name.includes('magnet')) return 'B';
  if (name.includes('optics') || name.includes('wave')) return 'λ';
  if (name.includes('thermodynamics')) return 'ΔT';
  if (name.includes('kinematics') || name.includes('motion')) return 'v, a';
  if (name.includes('nuclei') || name.includes('atom')) return '⚛';
  if (name.includes('semiconductor')) return 'p-n';
  if (name.includes('alternating current') || name.includes('ac ')) return 'I_rms';

  // Chem
  if (name.includes('organic') || name.includes('carbon') || name.includes('haloalkane') || name.includes('alcohol') || name.includes('aldehyde') || name.includes('amine')) return 'C-C';
  if (name.includes('kinetics')) return 'k[A]';
  if (name.includes('electrochemistry')) return 'E°';
  if (name.includes('solution')) return 'M';
  if (name.includes('solid state')) return 'BCC';
  if (name.includes('equilibrium')) return '⇌';
  if (name.includes('coordination')) return '[ML]';
  if (name.includes('p-block') || name.includes('d-block') || name.includes('f-block')) return 'p,d,f';

  // Bio
  if (name.includes('genetics') || name.includes('dna') || name.includes('inheritance') || name.includes('molecular')) return 'DNA';
  if (name.includes('cell')) return '⬡';
  if (name.includes('plant') || name.includes('photosynthesis')) return '🌿';
  if (name.includes('human physiology') || name.includes('reproduction')) return '♥';
  if (name.includes('ecology') || name.includes('environment')) return '🌱';
  if (name.includes('evolution')) return '🐒';
  if (name.includes('biotech')) return '✂️';

  // Generic fallback
  const firstWord = topicName.split(' ')[0] || '';
  if (firstWord.length > 3) return firstWord.substring(0, 3).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

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
  const { refreshData, subjectProgress } = useLearningJourney();
  const subProg = subjectProgress[subject];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
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
      const domain = topic.topicName.split(' - ')[0] || 'Other';
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
  const averageMastery = Math.round(
    topics.reduce((sum, t) => sum + t.masteryLevel, 0) / (totalTopics || 1)
  );

  const getStatusInfo = (topic: TopicResource) => {
    const m = topic.masteryLevel;
    if (m === 0 && topic.studyStage === 'not_started') return { label: 'START', color: 'bg-slate-100 text-slate-600', icon: PlayCircle };
    if (m < 40) return { label: 'CRITICAL', color: 'bg-red-50 text-red-600', icon: AlertCircle };
    if (m < 85) return { label: 'ACTIVE', color: 'bg-blue-50 text-blue-600', icon: Activity };
    return { label: 'MASTERED', color: 'bg-emerald-50 text-emerald-600', icon: Trophy };
  };

  const filteredTopics = selectedDomain === 'all'
    ? topics
    : topicsByDomain[selectedDomain] || [];

  return (
    <div className="min-h-full bg-slate-50/50">
      <LearningJourneyHeader
        showBack
        onBack={onBack}
        icon={subjectConfig.iconEmoji}
        title={`${subjectConfig.displayName} Engine`}
        subtitle={`Domain-level mastery analysis for ${examContext}`}
        subject={subject}
        trajectory={examContext}
        mastery={subProg?.overallMastery}
        accuracy={subProg?.overallAccuracy}
        actions={
          <div className="flex items-center gap-4">
            {/* Local Stats: Engine Index */}
            <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
              <div className="hidden lg:flex flex-col items-end mr-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Engine</span>
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none">Index</span>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-slate-400 uppercase tracking-wide font-black leading-none mb-1">
                  Mastered
                </div>
                <div className="text-lg font-black text-slate-900 font-outfit leading-none">
                  {masteredTopics}/{totalTopics}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setViewMode('heatmap')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'heatmap' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <List size={18} />
                </button>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

        {/* Recommendation Engine Area */}
        <AnimatePresence mode="wait">
          {aiRecommendation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-10 text-white rounded-3xl overflow-hidden shadow-2xl relative group cursor-pointer"
              style={{ background: `linear-gradient(135deg, ${subjectConfig.color}, ${subjectConfig.colorDark})` }}
              onClick={() => onSelectTopic(aiRecommendation.topicId)}
            >
              {/* Animated background elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse" />

              <div className="p-8 relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles size={40} className="animate-pulse" />
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 backdrop-blur-md">
                    <Zap size={10} fill="currentColor" />
                    AI Strategic Target
                  </div>
                  <h3 className="text-3xl font-black font-outfit tracking-tight mb-2">Focus Point: {aiRecommendation.topicName}</h3>
                  <p className="text-white/80 font-instrument text-base max-w-2xl">{aiRecommendation.reason}</p>
                </div>

                <div className="shrink-0 flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 min-w-[140px]">
                  <div className="text-3xl font-black">Now</div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Ideal Start</div>
                  <ArrowRight size={24} className="mt-2 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Progress Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Topics', val: totalTopics, icon: BookOpen, color: 'text-slate-600', bg: 'bg-slate-100' },
            { label: 'Mastered', val: masteredTopics, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Avg Mastery', val: `${averageMastery}%`, icon: Target, color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: 'Study Streak', val: `${studyStreak}d`, icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' }
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
                <s.icon size={24} />
              </div>
              <div>
                <div className="text-base font-black text-slate-900 leading-none">{s.val}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Domain Filtering (Only in List View) */}

        {/* Master Content Area */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={viewMode === 'heatmap' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'flex flex-col gap-3'}
        >
          {filteredTopics.map((topic) => {
            const m = topic.masteryLevel;
            const status = getStatusInfo(topic);
            const ProgressIcon = status.icon;
            const stageConfig = getStageConfig(topic.studyStage);
            const stageIndex = STAGE_ORDER.indexOf(topic.studyStage);

            return (
              <motion.button
                key={topic.id}
                variants={cardVariants}
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectTopic(topic.topicId)}
                className={`group relative bg-white border rounded-[2rem] overflow-hidden transition-all duration-500 text-left ${viewMode === 'list' ? 'flex items-center p-5' : 'flex flex-col h-full'} ${m >= 85 ? 'border-emerald-200' : 'border-slate-200 hover:border-primary-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]'}`}
              >
                {/* Visual Accent for Active Topics */}
                {topic.studyStage !== 'not_started' && topic.studyStage !== 'mastered' && (
                  <div className="absolute top-0 right-0 p-4">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                  </div>
                )}

                {/* Heatmap Layout */}
                {viewMode === 'heatmap' && (
                  <>
                    <div className="p-7 flex flex-col h-full relative z-10">
                      <div className="flex items-start justify-between mb-6">
                        <div className="relative">
                          {/* Mastery Circle Background */}
                          <svg className="w-14 h-14 transform -rotate-90">
                            <circle
                              cx="28" cy="28" r="24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-slate-50"
                            />
                            <motion.circle
                              cx="28" cy="28" r="24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              strokeDasharray="150"
                              initial={{ strokeDashoffset: 150 }}
                              animate={{ strokeDashoffset: 150 - (150 * m) / 100 }}
                              className={m >= 85 ? 'text-emerald-500' : m >= 40 ? 'text-blue-500' : 'text-red-500'}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                          </svg>
                          <div className={`absolute inset-0 flex items-center justify-center w-14 h-14 rounded-full ${status.color} transform group-hover:scale-90 transition-transform`}>
                            <span className="font-black text-[15px] tracking-tight text-center mt-0.5" style={{ fontFamily: 'var(--font-outfit)' }}>
                              {getTopicVisual(topic.topicName)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-black font-outfit tracking-tighter ${m >= 85 ? 'text-emerald-600' : 'text-slate-900'}`}>{m}%</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery</div>
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-slate-800 font-outfit tracking-tight mb-4 flex-1 group-hover:text-primary-600 transition-colors leading-tight">
                        {topic.topicName}
                      </h3>

                      {/* Progress Journey Track */}
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Knowledge Depth</div>
                          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${stageConfig.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : stageConfig.color === 'slate' ? 'bg-slate-50 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                            {stageConfig.label}
                          </div>
                        </div>

                        <div className="relative flex justify-between items-center px-1">
                          {/* Background Track */}
                          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 rounded-full" />
                          {/* Progress Track */}
                          <motion.div
                            className={`absolute top-1/2 left-0 h-0.5 -translate-y-1/2 rounded-full ${m >= 85 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(stageIndex / (STAGE_ORDER.length - 1)) * 100}%` }}
                          />

                          {STAGE_ORDER.map((s, idx) => {
                            const config = getStageConfig(s);
                            const isActive = idx <= stageIndex;
                            const isCurrent = idx === stageIndex;
                            const Icon = config.icon;

                            return (
                              <div key={s} className="relative z-10 flex flex-col items-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 ${isCurrent ? 'scale-125 shadow-lg' : ''} ${isActive ? (m >= 85 ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white') : 'bg-white border-2 border-slate-100 text-slate-300'}`}>
                                  <Icon size={10} strokeWidth={3} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-5 border-t border-slate-50">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                          <FileQuestion size={14} className="text-slate-400" />
                          <span className="text-xs font-black text-slate-600">
                            {topic.totalQuestions || 0} Qs
                          </span>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border border-black/5 ${status.color}`}>
                          {status.label}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* List Layout */}
                {viewMode === 'list' && (
                  <div className="flex items-center w-full gap-6 p-1">
                    <div className="relative shrink-0">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-50" />
                        <motion.circle
                          cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="125"
                          initial={{ strokeDashoffset: 125 }}
                          animate={{ strokeDashoffset: 125 - (125 * m) / 100 }}
                          className={m >= 85 ? 'text-emerald-500' : m >= 40 ? 'text-blue-500' : 'text-red-500'}
                        />
                      </svg>
                      <div className={`absolute inset-0 flex items-center justify-center w-12 h-12 rounded-full ${status.color} bg-transparent`}>
                        <span className="font-black text-[13px] tracking-tight text-center mt-0.5" style={{ fontFamily: 'var(--font-outfit)' }}>
                          {getTopicVisual(topic.topicName)}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-800 font-outfit tracking-tight text-lg mb-1 truncate">{topic.topicName}</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-lg border border-slate-100">
                          <stageConfig.icon size={10} className={stageConfig.color === 'emerald' ? 'text-emerald-500' : 'text-blue-500'} strokeWidth={3} />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stageConfig.label}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <div className="flex items-center gap-1">
                          <FileQuestion size={10} className="text-slate-400" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{topic.totalQuestions || 0} Questions</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 px-4 border-l border-slate-100">
                      <div className="text-2xl font-black text-slate-900 leading-none tracking-tighter">{m}%</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Mastery</div>
                    </div>

                    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-black/5 flex items-center gap-2 ${status.color}`}>
                      <status.icon size={12} />
                      {status.label}
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default TopicDashboardPage;

