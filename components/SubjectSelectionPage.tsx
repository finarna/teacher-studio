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
  } | null>(null);

  // Loading state
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchComprehensiveStats = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoadingStats(true);
    try {
      // 1. Fetch available scans once
      const { data: publishedScans } = await supabase
        .from('scans')
        .select('id, subject, analysis_data')
        .eq('is_system_scan', true);

      if (!publishedScans) {
        if (isInitial) setIsLoadingStats(false);
        return;
      }

      const scanIds = publishedScans.map(s => s.id);

      // 2. Fetch all flashcards count once
      const { data: flashcardRecords } = await supabase
        .from('flashcards')
        .select('scan_id, data')
        .in('scan_id', scanIds);

      // 3. Fetch all topics count once
      const { data: allTopics } = await supabase
        .from('topics')
        .select('id, subject, domain');

      // 4. Fetch question counts per scan_id
      // Since Supabase doesn't easily do grouped counts on related tables in one go without a RPC,
      // we'll fetch them in parallel for each subject.

      const subjectPromises = availableSubjects.map(async (subject) => {
        const subjectScanIds = publishedScans.filter(s => s.subject === subject).map(s => s.id);

        let qCount = 0;
        if (subjectScanIds.length > 0) {
          const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .in('scan_id', subjectScanIds);
          qCount = count || 0;
        }

        const subjectFlashcards = flashcardRecords
          ?.filter(f => subjectScanIds.includes(f.scan_id))
          .reduce((sum, f) => sum + (Array.isArray(f.data) ? f.data.length : 0), 0) || 0;

        const subjectSketches = publishedScans
          .filter(s => s.subject === subject && s.analysis_data?.topicBasedSketches)
          .reduce((sum, s) => sum + Object.keys(s.analysis_data.topicBasedSketches).length, 0);

        const subjectTopics = allTopics?.filter(t => t.subject === subject).length || 0;

        return [subject, {
          questions: qCount,
          sketches: subjectSketches,
          flashcards: subjectFlashcards,
          topics: subjectTopics
        }] as [Subject, any];
      });

      const subjectStatsResults = await Promise.all(subjectPromises);
      const subjectStats = Object.fromEntries(subjectStatsResults) as Record<Subject, any>;

      const totalQuestions = Object.values(subjectStats).reduce((sum, s: any) => sum + s.questions, 0);
      const totalSketches = Object.values(subjectStats).reduce((sum, s: any) => sum + s.sketches, 0);
      const totalFlashcards = Object.values(subjectStats).reduce((sum, s: any) => sum + s.flashcards, 0);
      const totalTopics = Object.values(subjectStats).reduce((sum, s: any) => sum + s.topics, 0);

      setComprehensiveStats({
        totalQuestions,
        totalSketches,
        totalFlashcards,
        totalTopics,
        subjectStats
      });

      // Generate AI Insights
      const masteredSubjects = availableSubjects.filter(s => (subjectProgress?.[s]?.overallMastery || 0) > 80);
      const attentionSubjects = availableSubjects.filter(s => (subjectProgress?.[s]?.overallMastery || 0) < 40);

      setAiInsights({
        title: attentionSubjects.length > 0 ? "Strategic Focus Required" : masteredSubjects.length > 0 ? "Mastery Acceleration" : "Learning Engine Active",
        description: attentionSubjects.length > 0
          ? `You've demonstrated strong potential, but ${attentionSubjects[0]} requires immediate attention to balance your overall score. Focusing on high-yield topics here could boost your accuracy by ~15%.`
          : masteredSubjects.length > 0
            ? `Excellent progress in ${masteredSubjects[0]}! Your conceptual depth is significantly above average. You should now pivot to "Speed Drills" to optimize your time-per-question.`
            : `All subjects are currently in the calibration phase. Based on your current trajectory, completing 20 more questions in any subject will unlock detailed predictive insights.`,
        focusArea: attentionSubjects.length > 0 ? attentionSubjects[0] : masteredSubjects.length > 0 ? masteredSubjects[0] : "General",
        trend: attentionSubjects.length > 0 ? 'attention' : masteredSubjects.length > 0 ? 'improving' : 'stable'
      });
    } catch (error) {
      console.error('Error fetching comprehensive stats:', error);
    } finally {
      if (isInitial) setIsLoadingStats(false);
    }
  }, [availableSubjects, subjectProgress, examContext]);

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

      <main className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* THE SUBJECT GRID (Levelled Up & Clean) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-0.5 h-4 bg-slate-900 rounded-full" />
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Your Subjects</h2>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-6"
            >
              {availableSubjects.map((subject) => {
                const config = SUBJECT_CONFIGS[subject];
                const mastery = subjectProgress?.[subject]?.overallMastery || 0;
                const stats = comprehensiveStats.subjectStats[subject] || { questions: 0, sketches: 0, flashcards: 0, topics: 0 };
                const Icon = SUBJECT_ICONS[subject];

                return (
                  <motion.button
                    key={subject}
                    variants={cardVariants}
                    whileHover={{ y: -4, scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onSelectSubject(subject)}
                    className="group relative bg-white rounded-[1.5rem] p-5 md:p-6 border border-slate-200/60 hover:border-primary-200 transition-all duration-300 shadow-sm hover:shadow-xl text-left flex flex-col gap-6 overflow-hidden"
                  >
                    {/* Subtle Internal Glow Hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col gap-8 w-full">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-5">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-transform group-hover:rotate-6 duration-500"
                            style={{ background: `linear-gradient(135deg, ${config.color}, ${config.colorDark})` }}
                          >
                            <Icon size={28} strokeWidth={2} />
                          </div>
                          <div>
                            <h4 className="text-2xl font-bold text-slate-900 uppercase italic font-outfit leading-none">
                              {config.displayName}
                            </h4>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-slate-900 font-outfit leading-none">{Math.round(mastery)}%</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mastery</div>
                        </div>
                      </div>

                      {/* INTEGRATED STATS - CLEAN PROFESSIONAL LOOK */}
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { l: 'Topics', v: stats.topics, c: config.color, i: BookOpen },
                          { l: 'Qns', v: stats.questions, c: '#8B5CF6', i: FileQuestion },
                          { l: 'Notes', v: stats.sketches, c: '#F59E0B', i: Palette },
                          { l: 'Recall', v: stats.flashcards, c: '#D946EF', i: Zap }
                        ].map((s, idx) => {
                          const StatIcon = s.i;
                          return (
                            <div key={idx} className="relative bg-slate-50/40 backdrop-blur-sm border border-slate-100 rounded-xl p-3 flex flex-col items-center group-hover:bg-white group-hover:border-slate-200 transition-all duration-300">
                              <div className="mb-2 opacity-80 group-hover:opacity-100" style={{ color: s.c }}>
                                <StatIcon size={18} strokeWidth={1.5} />
                              </div>
                              <div className="text-xl font-bold text-slate-900 leading-none mb-1">{s.v || 0}</div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.l}</div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100/60">
                        <div className="flex items-center gap-2 text-primary-500 font-bold text-[10px] tracking-widest uppercase">
                          <span className="group-hover:translate-x-1 transition-transform">Launch Hub</span>
                          <ArrowRight size={14} />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${mastery}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full bg-slate-900 rounded-full"
                              style={{ backgroundColor: config.color }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-900">{Math.round(mastery)}%</span>
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
