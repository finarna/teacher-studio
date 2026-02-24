import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  BookOpen,
  Target,
  AlertCircle,
  Trophy,
  Zap,
  Brain,
  Palette,
  FileQuestion,
  Sparkles,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Subject, ExamContext, SubjectProgress } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { supabase } from '../lib/supabase';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';

interface SubjectSelectionPageProps {
  examContext: ExamContext;
  onSelectSubject: (subject: Subject) => void;
  onBack: () => void;
  subjectProgress?: Record<Subject, SubjectProgress>;
}

const SUBJECT_ICONS: Record<Subject, React.ElementType> = {
  'Math': Calculator,
  'Physics': Atom,
  'Chemistry': FlaskConical,
  'Biology': Dna
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const cardVariants: { [key: string]: any } = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const SubjectSelectionPage: React.FC<SubjectSelectionPageProps> = ({
  examContext,
  onSelectSubject,
  onBack,
  subjectProgress
}) => {
  // Memoize available subjects to prevent reference changes on every render
  const availableSubjects = useMemo(() =>
    (Object.keys(SUBJECT_CONFIGS) as Subject[]).filter(
      subject => SUBJECT_CONFIGS[subject].supportedExams.includes(examContext)
    ), [examContext]);

  // Comprehensive stats state
  const [comprehensiveStats, setComprehensiveStats] = useState({
    totalQuestions: 0,
    totalSketches: 0,
    totalFlashcards: 0,
    totalTopics: 0,
    subjectStats: {} as Record<Subject, {
      questions: number;
      sketches: number;
      flashcards: number;
      topics: number;
    }>
  });

  const [aiInsights, setAiInsights] = useState<{
    title: string;
    description: string;
    focusArea: string;
    trend: 'improving' | 'stable' | 'attention';
    tags: string[];
  } | null>(null);

  // Loading state
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // LOGIC ENGINE: Dynamic Strategy Generation
  const generateIntelligentStrategy = useCallback((
    stats: typeof comprehensiveStats,
    progress: Record<Subject, SubjectProgress> | undefined,
    exam: ExamContext
  ) => {
    const subjects = Object.keys(SUBJECT_CONFIGS) as Subject[];
    const activeSubjects = subjects.filter(s => SUBJECT_CONFIGS[s].supportedExams.includes(exam));

    // 1. Calculate Core Metrics
    const subjectMetrics = activeSubjects.map(s => ({
      name: s,
      mastery: progress?.[s]?.overallMastery || 0,
      accuracy: progress?.[s]?.overallAccuracy ?? 0,
      volume: progress?.[s]?.totalQuestionsAttempted || 0,
      topics: stats.subjectStats[s]?.topics || 0
    }));

    const avgMastery = subjectMetrics.reduce((sum, s) => sum + s.mastery, 0) / activeSubjects.length;
    const avgAccuracy = subjectMetrics.reduce((sum, s) => sum + s.accuracy, 0) / activeSubjects.length;
    const totalVolume = subjectMetrics.reduce((sum, s) => sum + s.volume, 0);

    // 2. Identify Imbalances (System Awareness)
    const sortedByMastery = [...subjectMetrics].sort((a, b) => a.mastery - b.mastery);
    const weakest = sortedByMastery[0];
    const strongest = sortedByMastery[subjectMetrics.length - 1];
    const masteryGap = strongest.mastery - weakest.mastery;

    // 3. Determine Global Strategy State
    let title = "Syncing Neural Map";
    let description = "Begin your practice sessions to allow the AI Analyst to map your cognitive strengths and weaknesses.";
    let focusArea = "General";
    let trend: 'improving' | 'stable' | 'attention' = 'stable';
    let tags = ["Calibration"];

    if (totalVolume === 0) {
      title = "Initialization Phase";
      description = `Your ${exam} roadmap reached standby. The AI is waiting for your first 10 questions to map your cognitive footprint. Start with any subject to activate analysis.`;
      tags = ["Ready to Launch", "Baseline"];
    }
    else if (totalVolume < 50 || avgMastery < 3) {
      title = "Syncing Neural Map";
      const masteryValue = Math.round(avgMastery);
      description = `Data acquisition in progress. Mastery is currently at ${masteryValue}%. ${masteryValue === 0 && avgAccuracy > 0 ? "Initial accuracy is promising, but we need more volume to confirm your cognitive stability." : `Complete 25 more questions across your active arenas to unlock the "Strategy Pivot" mode.`}`;
      tags = ["Calibration", "Data Sync"];
    }
    else if (masteryGap > 40 && avgMastery > 20) {
      // SUBJECT NEGLECT PATTERN
      title = "Structural Imbalance Detected";
      description = `Your performance in ${strongest.name} is excellent, but ${weakest.name} (${weakest.mastery}%) is currently a bottleneck for your global ${exam} rank. A "Subject Pivot" strategy is recommended for the next 48 hours.`;
      focusArea = weakest.name;
      trend = 'attention';
      tags = ["Subject Pivot", "Rank Protection"];
    }
    else if (avgAccuracy < 50 && totalVolume > 50) {
      // RIGOR/ACCURACY PATTERN
      title = "Accuracy Recovery Required";
      description = `Your practice volume is high (${totalVolume} Qs), but your accuracy is hovering at ${Math.round(avgAccuracy)}%. You are likely rushing. We recommend "Slow-Mode Study" for ${weakest.name} to stabilize fundamentals.`;
      focusArea = weakest.name;
      trend = 'attention';
      tags = ["Rigor Check", "Conceptual Gaps"];
    }
    else if (avgMastery > 70) {
      // PEAK PERFORMANCE PATTERN
      title = "Elite Refinement Strategy";
      description = `You have achieved critical mass in the core syllabus. Your trajectory indicates a top-tier percentile potential. Shifting focus to "Edge Cases" and "Timed Mock Simulation" to optimize performance.`;
      trend = 'improving';
      tags = ["Elite Track", "Speed Optimization"];
    }
    else if (avgMastery > 20 && totalVolume > 80) {
      // STEADY PROGRESS
      title = "Cognitive Momentum Active";
      description = `Your overall ${exam} command is growing steadily. ${weakest.name} is currently your high-yield focus area. Mastering just a few more topics here will push your matrix into the next proficiency tier.`;
      focusArea = weakest.name;
      trend = 'improving';
      tags = ["Growth Hub", "High Yield"];
    }
    else {
      // DEFAULT FALLBACK FOR ACTIVE BUT MODERATE PROGRESS
      title = "Baseline Established";
      description = `Your initial profile is mapped. Current average accuracy is ${Math.round(avgAccuracy)}%. To see a "Momentum" shift, increase your daily practice volume and clear ${activeSubjects.length * 2} more high-weightage topics.`;
      tags = ["Active Learning", "Phase 1"];
    }

    return { title, description, focusArea, trend, tags };
  }, []);

  const fetchComprehensiveStats = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoadingStats(true);
    try {
      const { data: publishedScans } = await supabase
        .from('scans')
        .select('id, subject, analysis_data')
        .eq('is_system_scan', true);

      if (!publishedScans) {
        if (isInitial) setIsLoadingStats(false);
        return;
      }

      const scanIds = publishedScans.map(s => s.id);
      const { data: flashcardRecords } = await supabase.from('flashcards').select('scan_id, data').in('scan_id', scanIds);
      const { data: allTopics } = await supabase.from('topics').select('id, subject, domain');

      const subjectPromises = availableSubjects.map(async (subject) => {
        const subjectScanIds = publishedScans.filter(s => s.subject === subject).map(s => s.id);
        let qCount = 0;
        if (subjectScanIds.length > 0) {
          const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true }).in('scan_id', subjectScanIds);
          qCount = count || 0;
        }

        const subjectFlashcards = flashcardRecords?.filter(f => subjectScanIds.includes(f.scan_id)).reduce((sum, f) => sum + (Array.isArray(f.data) ? f.data.length : 0), 0) || 0;
        const subjectSketches = publishedScans.filter(s => s.subject === subject && s.analysis_data?.topicBasedSketches).reduce((sum, s) => sum + Object.keys(s.analysis_data.topicBasedSketches).length, 0);
        const subjectTopics = allTopics?.filter(t => t.subject === subject).length || 0;

        return [subject, { questions: qCount, sketches: subjectSketches, flashcards: subjectFlashcards, topics: subjectTopics }] as [Subject, any];
      });

      const subjectStatsResults = await Promise.all(subjectPromises);
      const subjectStatsDict = Object.fromEntries(subjectStatsResults) as Record<Subject, any>;

      const totalQuestions = Object.values(subjectStatsDict).reduce((sum, s: any) => sum + s.questions, 0);
      const totalSketches = Object.values(subjectStatsDict).reduce((sum, s: any) => sum + s.sketches, 0);
      const totalFlashcards = Object.values(subjectStatsDict).reduce((sum, s: any) => sum + s.flashcards, 0);
      const totalTopics = Object.values(subjectStatsDict).reduce((sum, s: any) => sum + s.topics, 0);

      const newStats = {
        totalQuestions,
        totalSketches,
        totalFlashcards,
        totalTopics,
        subjectStats: subjectStatsDict
      };

      setComprehensiveStats(newStats);

      // 🧠 Generate Strategic AI Insights based on WHOLE profile
      const strategy = generateIntelligentStrategy(newStats, subjectProgress, examContext);
      setAiInsights(strategy);

    } catch (error) {
      console.error('Error fetching comprehensive stats:', error);
    } finally {
      if (isInitial) setIsLoadingStats(false);
    }
  }, [availableSubjects, subjectProgress, examContext, generateIntelligentStrategy]);

  useEffect(() => {
    // Only show skeleton loaders (true) if we don't have stats yet
    const isInitial = comprehensiveStats.totalTopics === 0;
    fetchComprehensiveStats(isInitial);
  }, [availableSubjects, subjectProgress, examContext, fetchComprehensiveStats]);

  const totalSubjects = availableSubjects.length;
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  const averageMastery = availableSubjects.length > 0
    ? availableSubjects.reduce(
      (sum, s) => sum + (subjectProgress?.[s]?.overallMastery || 0),
      0
    ) / totalSubjects
    : 0;

  const averageAccuracy = availableSubjects.length > 0
    ? availableSubjects.reduce(
      (sum, s) => sum + (subjectProgress?.[s]?.overallAccuracy || 0),
      0
    ) / totalSubjects
    : 0;

  return (
    <div className="relative h-screen min-h-screen w-full bg-[#fcfdfe] flex flex-col font-outfit overflow-hidden">

      {/* 1. AMBIENT MESH BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-blue-50/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-50/20 rounded-full blur-[120px]" />
      </div>

      {/* 2. REFINED UNIVERSAL HEADER */}
      <LearningJourneyHeader
        showBack
        onBack={onBack}
        title="Subject Hub"
        subtitle={`Preparing for ${(examContext as any)?.name || examContext}`}
        trajectory={examContext}
        mastery={averageMastery}
        accuracy={averageAccuracy}
        actions={
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAiDrawerOpen(true)}
            className="relative w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-primary-400 shadow-xl overflow-hidden group"
          >
            <div className="absolute inset-0 bg-primary-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Sparkles size={18} />
            {aiInsights && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            )}
          </motion.button>
        }
      />

      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-10">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* 3. HERO AI COACH MESSAGE */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-slate-900 rounded-[2rem] p-6 md:p-8 overflow-hidden shadow-2xl border border-white/5"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center text-slate-900 shadow-2xl shrink-0 animate-pulse">
                <Brain size={40} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-[10px] font-black uppercase tracking-widest border border-primary-500/30">Active Coach</span>
                  <div className="flex gap-1.5 overflow-hidden">
                    {aiInsights?.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5 whitespace-nowrap">{tag}</span>
                    ))}
                  </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tight mb-2">
                  {aiInsights ? aiInsights.title : "Calibrating Performance Matrix"}
                </h2>
                <p className="text-slate-400 font-instrument text-lg leading-snug max-w-2xl">
                  {aiInsights ? aiInsights.description : "Reviewing your latest test responses to generate strategic blueprints."}
                </p>
              </div>
              <div className="shrink-0 flex gap-4">
                <div className="text-center px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                  <div className="text-3xl font-black text-white leading-none mb-1">{Math.round(averageMastery)}%</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Mastery</div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* 4. THE SUBJECT GRID (Levelled Up & Clean) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em]">Arena Selection</h2>
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {availableSubjects.length} Subjects Active
              </div>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pb-12"
            >
              {availableSubjects.map((subject) => {
                const config = SUBJECT_CONFIGS[subject];
                const progress = subjectProgress?.[subject];
                const mastery = progress?.overallMastery || 0;
                const accuracy = progress?.overallAccuracy ?? 0;
                const volume = progress?.totalQuestionsAttempted || 0;
                const stats = comprehensiveStats.subjectStats[subject] || { questions: 0, sketches: 0, flashcards: 0, topics: 0 };
                const Icon = SUBJECT_ICONS[subject];

                // Dynamic Coach Tip per card - Multidimensional
                const getCoachTip = (s: Subject, m: number, a: number, v: number) => {
                  if (m === 0 || v === 0) return `Baseline missing. Complete 5 questions in ${s} to activate AI coaching.`;
                  if (v < 15) return `Data syncing. Complete more questions in ${s} to generate a specialized strategy.`;
                  if (a < 40) return `Critical accuracy gap detected. Move from practice to "Theory Review" immediately.`;
                  if (m < 20 && a > 75) return `Strong fundamentals but low volume. Acceleration towards mock tests required.`;
                  if (m > 60 && a < 60) return `High coverage but low retention. Re-practice "Weakest Topics" for stability.`;
                  if (m > 80 && a > 80) return `Elite level achievement. Switch to "Peer Benchmarking" & "Advanced PYQs".`;
                  return `Steady progress. Target +10% mastery to reach the next proficiency tier in ${s}.`;
                };

                return (
                  <motion.button
                    key={subject}
                    variants={cardVariants}
                    whileHover={{ y: -8, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onSelectSubject(subject)}
                    className="group relative bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-200 shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] hover:border-primary-200 transition-all duration-500 text-left flex flex-col gap-8 overflow-hidden"
                  >
                    {/* Visual Highlights */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-slate-100" />
                    <div
                      className="absolute top-0 left-0 h-2 transition-all duration-700 ease-out"
                      style={{ width: `${mastery}%`, backgroundColor: config.color }}
                    />

                    <div className="relative z-10 flex flex-col gap-8 w-full">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-6">
                          <div
                            className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl transition-all group-hover:rotate-6 group-hover:scale-110 duration-500"
                            style={{ background: `linear-gradient(135deg, ${config.color}, ${config.colorDark})` }}
                          >
                            <Icon size={32} strokeWidth={2.5} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</span>
                              <div className="w-1 h-3 bg-slate-200 rounded-full" />
                            </div>
                            <h4 className="text-3xl font-black text-slate-900 uppercase italic font-outfit leading-none tracking-tight">
                              {config.displayName}
                            </h4>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-slate-900 font-outfit leading-none tracking-tighter">{Math.round(mastery)}%</span>
                          </div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Global Mastery</div>
                        </div>
                      </div>

                      {/* AI COACH MICRO-TIP */}
                      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-all">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Sparkles size={12} className="text-primary-500" />
                          <span className="text-[9px] font-black text-primary-600 uppercase tracking-[0.15em]">AI Coach Recommendation</span>
                        </div>
                        <p className="text-xs font-bold text-slate-600 italic leading-relaxed">
                          "{getCoachTip(subject, mastery, accuracy, stats.questions || volume)}"
                        </p>
                      </div>

                      {/* INTEGRATED STATS (Pills) */}
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { l: 'Topics', v: stats.topics, c: config.color, i: BookOpen },
                          { l: 'Qns', v: stats.questions, c: '#8B5CF6', i: FileQuestion },
                          { l: 'Notes', v: stats.sketches, c: '#F59E0B', i: Palette },
                          { l: 'Recall', v: stats.flashcards, c: '#D946EF', i: Zap }
                        ].map((s, idx) => {
                          const StatIcon = s.i;
                          return (
                            <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center shadow-sm group-hover:border-slate-200 transition-all">
                              <div className="mb-2" style={{ color: s.c }}>
                                <StatIcon size={18} strokeWidth={2} />
                              </div>
                              <div className="text-xl font-black text-slate-900 leading-none mb-1">{s.v || 0}</div>
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{s.l}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* PERFORMANCE PERFORMANCE PERFORMANCE */}
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Accuracy Benchmarking</span>
                          <span className="text-slate-900">{Math.round(accuracy)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${accuracy}%` }}
                            className="h-full bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                          />
                        </div>

                        <div className="flex items-center justify-between mt-6">
                          <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">
                            Launch Subject
                            <ArrowRight size={14} />
                          </div>
                          <div className="flex items-center gap-2 italic">
                            <TrendingUp size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Potential +12%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </section>
        </div>
      </main>

      {/* 5. RESPONSIVE AI STRATEGY DRAWER */}
      <AnimatePresence>
        {isAiDrawerOpen && aiInsights && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[100]"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: '100%', y: 0 }} // Desktop default
              animate={{ x: 0, y: 0 }}
              exit={{ x: '100%', y: 0 }}
              variants={{
                mobile: { y: '100%', x: 0 },
                desktop: { x: '100%', y: 0 }
              }}
              // Responsive logic via custom motion variants can be tricky, using standard media-query based initial/animate in actual render
              className="fixed right-0 md:top-0 bottom-0 top-[10%] md:w-[420px] w-full bg-[#0f172a] shadow-[-20px_0_50px_rgba(0,0,0,0.3)] z-[101] flex flex-col border-l border-white/10 md:rounded-l-[2rem] rounded-t-[2.5rem] overflow-hidden"
              style={{
                // Explicitly overriding desktop/mobile diffs for Framer
                transform: typeof window !== 'undefined' && window.innerWidth < 768 ? 'translateY(0)' : 'translateX(0)'
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Drawer Handle (Mobile) */}
              <div className="md:hidden w-12 h-1 bg-slate-700/50 rounded-full mx-auto mt-3 mb-1" />

              <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white uppercase tracking-tight italic">AI Analyst</h2>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Intelligence</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAiDrawerOpen(false)}
                    className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">Current Strategy</span>
                    <h3 className="text-2xl font-bold text-white tracking-tight italic uppercase font-outfit leading-tight">
                      {aiInsights.title}
                    </h3>
                    <p className="text-sm text-slate-300 font-medium font-instrument leading-relaxed opacity-90">
                      {aiInsights.description.split(aiInsights.focusArea).map((part, i, arr) => (
                        <React.Fragment key={i}>
                          {part}
                          {i < arr.length - 1 && <span className="text-white font-bold underline decoration-primary-500/50 decoration-2 underline-offset-4">{aiInsights.focusArea}</span>}
                        </React.Fragment>
                      ))}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Priority Subject</div>
                      <div className="text-lg font-bold text-white uppercase italic">{aiInsights.focusArea}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Est. Impact</div>
                      <div className="text-xl font-bold text-emerald-400 font-outfit">+18%</div>
                    </div>
                  </div>

                  <div className="">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectSubject(aiInsights.focusArea as Subject);
                        setIsAiDrawerOpen(false);
                      }}
                      className="w-full py-4 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-xl flex items-center justify-center gap-3 transition-shadow hover:shadow-2xl"
                    >
                      BOOST THIS SUBJECT
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Syllabus Status</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {availableSubjects.map((s) => {
                      const m = subjectProgress?.[s]?.overallMastery || 0;
                      const isPriority = s === aiInsights.focusArea;
                      let status = "Stable";
                      let color = "text-slate-400";
                      let bgColor = "bg-white/5";

                      if (m < 40) { status = "Critical"; color = "text-rose-400"; bgColor = "bg-rose-500/10 border-rose-500/20"; }
                      else if (m > 80) { status = "Excelling"; color = "text-emerald-400"; bgColor = "bg-emerald-500/10 border-emerald-500/20"; }
                      else if (m > 60) { status = "Optimal"; color = "text-blue-400"; bgColor = "bg-blue-500/10 border-blue-500/20"; }

                      return (
                        <div
                          key={s}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isPriority ? 'bg-primary-500/10 border-primary-500/30' : 'bg-white/5 border-white/5'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${color.replace('text', 'bg')}`} />
                            <span className={`text-xs font-bold uppercase italic tracking-tight ${isPriority ? 'text-primary-400' : 'text-slate-300'}`}>{s}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${bgColor} ${color} border`}>{status}</span>
                            <span className="text-xs font-bold text-white w-8 text-right">{Math.round(m)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-auto pt-10 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Zap size={14} className="text-amber-500" />
                    Strategy recalibrates after every session
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
};

export default SubjectSelectionPage;
