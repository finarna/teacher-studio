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
  Award,
  BarChart3,
  Sprout,
  PawPrint,
  Flower2,
  Leaf
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
  onViewGlobalPerformance?: () => void;
  onSelectOption?: (subject: Subject, option: 'past_exams' | 'topicwise' | 'mock_builder') => void;
}

const SUBJECT_ICONS: Record<Subject, React.ElementType> = {
  'Math': Calculator,
  'Physics': Atom,
  'Chemistry': FlaskConical,
  'Biology': Leaf,
  'Botany': Sprout || Leaf,
  'Zoology': PawPrint || Flower2
};

const getPotentialGain = (m: number, a: number) => {
  if (m >= 98) return 1;
  const base = a > 70 ? 12 : a > 40 ? 8 : 4;
  const multiplier = (100 - m) / 100;
  return Math.max(2, Math.round(base * multiplier + (a / 25)));
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
  subjectProgress,
  onViewGlobalPerformance,
  onSelectOption
}) => {
  // Memoize available subjects to prevent reference changes on every render
  const availableSubjects = useMemo(() => {
    let subjects = (Object.keys(SUBJECT_CONFIGS) as Subject[]).filter(
      subject => SUBJECT_CONFIGS[subject].supportedExams.includes(examContext)
    );

    // NEET Pivot: Show ONLY sub-disciplines for Biology (Botany/Zoology)
    if (examContext === 'NEET') {
      subjects = subjects.filter(s => s !== 'Biology');
    }

    return subjects;
  }, [examContext]);

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
    let title = "AI Is Learning Your Style";
    let description = "Start practising to let AI figure out your strengths and where you need the most help.";
    let focusArea = "General";
    let trend: 'improving' | 'stable' | 'attention' = 'stable';
    let tags = ["Calibration"];

    if (totalVolume === 0) {
      title = "Let's Get Started!";
      description = `AI is ready to personalise your ${exam} prep — it just needs your first few answers to figure out where you stand. Pick any subject and start practising!`;
      tags = ["Ready to Go", "First Steps"];
    }
    else if (totalVolume < 50 || avgMastery < 3) {
      title = "AI Is Learning Your Style";
      const masteryValue = Math.round(avgMastery);
      description = `You're off to a good start! ${masteryValue === 0 && avgAccuracy > 0 ? "Your accuracy looks promising — keep going and AI will start giving you personalised tips." : `Do ${25} more questions and AI will unlock a personalised study plan just for you.`}`;
      tags = ["Getting Started", "Almost There"];
    }
    else if (masteryGap > 40 && avgMastery > 20) {
      title = "One Subject Needs Attention";
      description = `You're doing well in ${strongest.name}, but ${weakest.name} (${weakest.mastery}% mastery) is holding back your overall ${exam} score. Focus there for the next few days and AI will guide you through it.`;
      focusArea = weakest.name;
      trend = 'attention';
      tags = ["Focus Here", "Quick Win"];
    }
    else if (avgAccuracy < 50 && totalVolume > 50) {
      title = "Slow Down to Speed Up";
      description = `You've practised a lot (${totalVolume} questions!), but accuracy is at ${Math.round(avgAccuracy)}%. AI suggests slowing down on ${weakest.name} — understanding each answer properly will boost your score faster.`;
      focusArea = weakest.name;
      trend = 'attention';
      tags = ["Build Accuracy", "Focus Mode"];
    }
    else if (avgMastery > 70) {
      title = "You're in Top Form!";
      description = `Your syllabus coverage is excellent. AI recommends shifting to timed mock tests and tricky edge-case questions to push your score even higher before exam day.`;
      trend = 'improving';
      tags = ["Top Form", "Final Push"];
    }
    else if (avgMastery > 20 && totalVolume > 80) {
      title = "Great Progress — Keep Going!";
      description = `Your ${exam} prep is on the right track. ${weakest.name} is your next big opportunity — a few focused sessions there and AI predicts a solid jump in your score.`;
      focusArea = weakest.name;
      trend = 'improving';
      tags = ["On Track", "High Yield"];
    }
    else {
      title = "Building Your Foundation";
      description = `You're making steady progress! Average accuracy is ${Math.round(avgAccuracy)}%. Keep practising daily and finish ${activeSubjects.length * 2} more topics — AI will show you exactly which ones matter most.`;
      tags = ["Stay Consistent", "Keep Going"];
    }

    return { title, description, focusArea, trend, tags };
  }, []);

  const fetchComprehensiveStats = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoadingStats(true);
    try {
      // Phase 1: Scans (no analysis_data) + topics in parallel
      const [{ data: publishedScans }, { data: allTopics }] = await Promise.all([
        supabase
          .from('scans')
          .select('id, subject')
          .eq('is_system_scan', true)
          .eq('exam_context', examContext),
        supabase.from('topics').select('id, subject, domain'),
      ]);

      if (!publishedScans) {
        if (isInitial) setIsLoadingStats(false);
        return;
      }

      const scanIds = publishedScans.map(s => s.id);

      // Phase 2: All count queries in parallel (all need scanIds from Phase 1)
      const empty = Promise.resolve({ data: [] as any[] });
      const sketchPromise = scanIds.length > 0
        ? supabase.from('topic_sketches').select('scan_id').in('scan_id', scanIds)
        : empty;
      const flashcardPromise = scanIds.length > 0
        ? supabase.from('flashcards').select('scan_id, data').in('scan_id', scanIds)
        : empty;

      const subjectCountPromises = availableSubjects.map(async (subject) => {
        const isNeetSub = examContext === 'NEET' && (subject === 'Botany' || subject === 'Zoology');
        const { count: directCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('subject', subject)
          .in('scan_id', scanIds);
        let qCount = directCount || 0;
        if (qCount === 0 && isNeetSub) {
          const { count: biologyTotal } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('subject', 'Biology')
            .in('scan_id', scanIds);
          qCount = Math.floor((biologyTotal || 0) / 2);
        }
        return [subject, qCount] as [Subject, number];
      });

      const [sketchResult, flashcardResult, ...subjectCountResults] = await Promise.all([
        sketchPromise,
        flashcardPromise,
        ...subjectCountPromises,
      ]);

      // Build O(1) lookup maps from results
      const sketchCountByScan: Record<string, number> = {};
      (sketchResult.data || []).forEach((r: any) => {
        sketchCountByScan[r.scan_id] = (sketchCountByScan[r.scan_id] || 0) + 1;
      });
      const flashcardRecords: { scan_id: string; data: any[] }[] = flashcardResult.data || [];

      const subjectStatsResults = (subjectCountResults as [Subject, number][]).map(([subject, qCount]) => {
        const isNeetSub = examContext === 'NEET' && (subject === 'Botany' || subject === 'Zoology');
        const isNeetMain = examContext === 'NEET' && (subject === 'Physics' || subject === 'Chemistry');
        const subjectScanIds = publishedScans.filter(s =>
          s.subject === subject ||
          (examContext === 'NEET' && s.subject === 'Combined' && (isNeetSub || isNeetMain)) ||
          (examContext === 'NEET' && s.subject === 'Biology' && isNeetSub)
        ).map(s => s.id);

        const subjectSketches = subjectScanIds.reduce((sum, sid) => sum + (sketchCountByScan[sid] || 0), 0);
        const subjectFlashcards = flashcardRecords
          .filter(f => subjectScanIds.includes(f.scan_id))
          .reduce((sum, f) => sum + (Array.isArray(f.data) ? f.data.length : 0), 0);
        const subjectTopics = allTopics?.filter(t => t.subject === subject).length || 0;

        return [subject, { questions: qCount, sketches: subjectSketches, flashcards: subjectFlashcards, topics: subjectTopics }] as [Subject, any];
      });

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
    <div className="relative h-screen w-full bg-[#fcfdfe] flex flex-col font-outfit overflow-hidden">

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

      <main className="flex-1 overflow-hidden p-3 md:p-4 lg:p-6 flex flex-col">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 space-y-3 md:space-y-4">

          {/* 3. HERO AI COACH MESSAGE - COMPACT */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-slate-900 rounded-2xl p-3 md:p-4 overflow-hidden shadow-xl border border-white/5 shrink-0"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/10 rounded-full blur-[60px] -mr-24 -mt-24" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-3 md:gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center text-slate-900 shadow-xl shrink-0 animate-pulse">
                <Brain size={24} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-1.5 mb-1">
                  <span className="px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded text-[9px] font-bold tracking-wide border border-primary-500/30">Active Coach</span>
                  <div className="flex gap-1 overflow-hidden">
                    {aiInsights?.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[8px] font-bold text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 whitespace-nowrap">{tag}</span>
                    ))}
                  </div>
                </div>
                <h2 className="text-base md:text-xl font-extrabold text-white tracking-tight mb-1">
                  {aiInsights ? aiInsights.title : "Calibrating Performance Matrix"}
                </h2>
                <p className="text-slate-400 font-medium text-xs md:text-sm leading-snug max-w-2xl line-clamp-2">
                  {aiInsights ? aiInsights.description : "Reviewing your latest test responses to generate strategic blueprints."}
                </p>
              </div>
              <div className="shrink-0 flex gap-2">
                <div className="text-center px-3 md:px-4 py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
                  <div className="text-xl md:text-2xl font-bold text-white leading-none mb-0.5">{Math.round(averageMastery)}%</div>
                  <div className="text-[9px] font-bold text-slate-500">Avg Mastery</div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* 4. THE SUBJECT GRID - COMPACT */}
          <section className="space-y-2 md:space-y-3 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between px-1 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-slate-900 rounded-full" />
                <h2 className="text-xs md:text-sm font-bold text-slate-900 tracking-wide">Your Subjects</h2>
              </div>
              <div className="text-[9px] font-bold text-slate-400 tracking-wide">
                {availableSubjects.length} Subjects Active
              </div>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar pb-6"
            >
              {availableSubjects.map((subject) => {
                const config = SUBJECT_CONFIGS[subject];
                const progress = subjectProgress?.[subject];
                const mastery = progress?.overallMastery || 0;
                const accuracy = progress?.overallAccuracy ?? 0;
                const volume = progress?.totalQuestionsAttempted || 0;
                const stats = comprehensiveStats.subjectStats[subject] || { questions: 0, sketches: 0, flashcards: 0, topics: 0 };
                const Icon = SUBJECT_ICONS[subject] || BookOpen;

                // Dynamic Coach Tip per card - Multidimensional
                const getCoachTip = (s: Subject, m: number, a: number, v: number) => {
                  if (m === 0 || v === 0) return `Baseline missing. Complete 5 questions in ${s} to activate AI coaching.`;
                  if (v < 15) return `Data syncing. Complete more questions in ${s} to generate a specialized strategy.`;
                  if (a < 40) return `Critical accuracy gap detected. Move from practice to "Theory Review" immediately.`;
                  if (m < 20 && a > 75) return `Good accuracy — now pick up the pace. Try more topics to build your score.`;
                  if (m > 60 && a < 60) return `You've covered a lot, but accuracy needs work. Redo your weakest topics to lock in the concepts.`;
                  if (m > 80 && a > 80) return `Excellent! You're well prepared — switch to past year papers to sharpen exam skills.`;
                  return `Steady progress! Push ${s} mastery up by 10% and you'll see a real score improvement.`;
                };

                return (
                  <motion.div
                    key={subject}
                    variants={cardVariants}
                    onClick={() => onSelectSubject(subject)}
                    className="group relative bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm hover:shadow-xl hover:border-primary-200 transition-all duration-300 text-left flex flex-col gap-3 overflow-hidden cursor-pointer"
                  >
                    {/* Visual Highlights */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100" />
                    <div
                      className="absolute top-0 left-0 h-1.5 transition-all duration-700 ease-out"
                      style={{ width: `${mastery}%`, backgroundColor: config.color }}
                    />

                    <div className="relative z-10 flex flex-col gap-3 w-full">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-all group-hover:scale-105 duration-300 shrink-0"
                            style={{ background: `linear-gradient(135deg, ${config.color}, ${config.colorDark})` }}
                          >
                            <Icon size={20} strokeWidth={2.5} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[9px] font-bold text-slate-400">Subject</span>
                            </div>
                            <h4 className="text-lg md:text-xl font-extrabold text-slate-900 font-outfit leading-none tracking-tight truncate">
                              {config.displayName}
                            </h4>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end shrink-0">
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-2xl font-bold text-slate-900 font-outfit leading-none tracking-tighter">{Math.round(mastery)}%</span>
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 mt-0.5 whitespace-nowrap">Global Mastery</div>
                        </div>
                      </div>

                      {/* AI COACH MICRO-TIP - COMPACT */}
                      <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-all">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Sparkles size={10} className="text-primary-500 shrink-0" />
                          <span className="text-[8px] font-bold text-primary-600 tracking-wide">AI Coach</span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-600 leading-snug line-clamp-2">
                          "{getCoachTip(subject, mastery, accuracy, stats.questions || volume)}"
                        </p>
                      </div>

                      {/* INTEGRATED STATS (Pills) - COMPACT */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { l: 'Topics', v: stats.topics, c: config.color, i: BookOpen },
                          { l: 'Qns', v: stats.questions, c: '#8B5CF6', i: FileQuestion },
                          { l: 'Notes', v: stats.sketches, c: '#F59E0B', i: Palette },
                          { l: 'Recall', v: stats.flashcards, c: '#D946EF', i: Zap }
                        ].map((s, idx) => {
                          const StatIcon = s.i;
                          return (
                            <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-1.5 md:p-2 flex flex-col items-center shadow-sm group-hover:bg-white group-hover:border-slate-200 transition-all">
                              <div className="mb-0.5" style={{ color: s.c }}>
                                <StatIcon size={14} strokeWidth={2.5} />
                              </div>
                              <div className="text-sm md:text-base font-bold text-slate-900 leading-none mb-0.5">{s.v || 0}</div>
                              <div className="text-[8px] font-bold text-slate-500 leading-none">{s.l}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* PERFORMANCE - COMPACT */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 mt-auto">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          <span>Accuracy</span>
                          <span className="text-slate-900">{Math.round(accuracy)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${accuracy}%` }}
                            className="h-full bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.4)]"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-emerald-500 italic font-bold uppercase text-[8px] tracking-wide">
                            <TrendingUp size={10} />
                            +{getPotentialGain(mastery, accuracy)}%
                          </div>
                        </div>

                        {/* ACTIONS - COMPACT */}
                        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectOption?.(subject, 'topicwise');
                              }}
                              className="flex items-center justify-center gap-1 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-bold hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                            >
                              <BookOpen size={12} /> <span className="hidden md:inline">Topics</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectOption?.(subject, 'past_exams');
                              }}
                              className="flex items-center justify-center gap-1 py-2 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-bold hover:bg-amber-600 hover:text-white transition-all border border-amber-100"
                            >
                              <Target size={12} /> <span className="hidden md:inline">Papers</span>
                            </button>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectOption?.(subject, 'mock_builder');
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-bold hover:bg-primary-600 transition-all shadow-md"
                          >
                            <Zap size={12} /> Mock Test
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        </div>
      </main>

      {/* 5. RESPONSIVE AI STRATEGY DRAWER */}
      <AnimatePresence>
        {
          isAiDrawerOpen && aiInsights && (
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
                        <div className="text-xl font-bold text-emerald-400 font-outfit">
                          +{(() => {
                            const focusSubject = aiInsights.focusArea as Subject;
                            const m = subjectProgress?.[focusSubject]?.overallMastery || 0;
                            const a = subjectProgress?.[focusSubject]?.overallAccuracy || 0;
                            return getPotentialGain(m, a);
                          })()}%
                        </div>
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

                  <div className="mt-auto px-6 pb-12 space-y-4">
                    <button
                      onClick={() => {
                        onViewGlobalPerformance?.();
                        setIsAiDrawerOpen(false);
                      }}
                      className="w-full py-4 rounded-xl bg-slate-800 text-white font-bold text-xs border border-white/10 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <BarChart3 size={16} /> OPEN FULL DASHBOARD
                    </button>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest justify-center">
                      <Zap size={14} className="text-amber-500" />
                      Strategy recalibrates after every session
                    </div>
                  </div>
                </div>
              </motion.aside>
            </>
          )
        }
      </AnimatePresence >

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div >
  );
};

export default SubjectSelectionPage;
