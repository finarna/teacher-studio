import React, { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  ArrowRight,
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
  // Get subjects for this exam context
  const availableSubjects = (Object.keys(SUBJECT_CONFIGS) as Subject[]).filter(
    subject => SUBJECT_CONFIGS[subject].supportedExams.includes(examContext)
  );

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

  // Loading state
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchComprehensiveStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const { data: publishedScans } = await supabase
        .from('scans')
        .select('id, subject')
        .eq('is_system_scan', true);

      if (!publishedScans || publishedScans.length === 0) {
        setIsLoadingStats(false);
        return;
      }

      const scanIds = publishedScans.map(s => s.id);

      const [
        { count: totalQuestions },
        { count: totalTopics },
        { data: scansWithAnalysis },
        { data: flashcardRecords }
      ] = await Promise.all([
        supabase.from('questions').select('*', { count: 'exact', head: true }).in('scan_id', scanIds),
        supabase.from('topics').select('*', { count: 'exact', head: true }),
        supabase.from('scans').select('analysis_data').in('id', scanIds),
        supabase.from('flashcards').select('data').in('scan_id', scanIds)
      ]);

      let totalSketches = 0;
      scansWithAnalysis?.forEach(scan => {
        if (scan.analysis_data?.topicBasedSketches) {
          totalSketches += Object.keys(scan.analysis_data.topicBasedSketches).length;
        }
      });

      let totalFlashcards = 0;
      flashcardRecords?.forEach(record => {
        if (record.data && Array.isArray(record.data)) {
          totalFlashcards += record.data.length;
        }
      });

      const subjectStatsPromises = availableSubjects.map(async (subject) => {
        const subjectScanIds = publishedScans.filter(s => s.subject === subject).map(s => s.id);

        if (subjectScanIds.length === 0) {
          return [subject, { questions: 0, sketches: 0, flashcards: 0, topics: 0 }];
        }

        const [{ count: q }, { count: t }] = await Promise.all([
          supabase.from('questions').select('*', { count: 'exact', head: true }).in('scan_id', subjectScanIds),
          supabase.from('topics').select('*', { count: 'exact', head: true }).eq('subject', subject)
        ]);

        let s = 0;
        scansWithAnalysis?.forEach(scan => {
          const scanId = publishedScans.find(ps => ps.subject === subject)?.id;
          if (scan.analysis_data?.topicBasedSketches && subjectScanIds.includes(scanId)) {
            s += Object.keys(scan.analysis_data.topicBasedSketches).length;
          }
        });

        let f = 0;
        flashcardRecords?.forEach(record => {
          if (record.data && Array.isArray(record.data)) {
            f += record.data.length;
          }
        });

        return [subject, { questions: q || 0, sketches: s, flashcards: f, topics: t || 0 }];
      });

      const subjectStatsResults = await Promise.all(subjectStatsPromises);
      const subjectStats = Object.fromEntries(subjectStatsResults) as Record<Subject, any>;

      setComprehensiveStats({
        totalQuestions: totalQuestions || 0,
        totalSketches: totalSketches || 0,
        totalFlashcards: totalFlashcards || 0,
        totalTopics: totalTopics || 0,
        subjectStats
      });
    } catch (error) {
      console.error('Error fetching comprehensive stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [availableSubjects]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchComprehensiveStats();
    }, 100);
    return () => clearTimeout(timer);
  }, [fetchComprehensiveStats]);

  const totalSubjects = availableSubjects.length;
  const averageMastery = availableSubjects.reduce(
    (sum, s) => sum + (subjectProgress?.[s]?.overallMastery || 0),
    0
  ) / totalSubjects;

  return (
    <div className="min-h-full bg-slate-50/50">
      <LearningJourneyHeader
        showBack
        onBack={onBack}
        icon={<Award size={24} />}
        title="Subject Hub"
        subtitle="Manage your academic domain mastery"
        trajectory={examContext}
      >
        <div className="flex flex-col md:flex-row items-center gap-6 py-2">
          {/* Circular Progress & Info */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="transparent"
                  className="text-slate-100"
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={175.8}
                  initial={{ strokeDashoffset: 175.8 }}
                  animate={{ strokeDashoffset: 175.8 - (175.8 * averageMastery) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="text-primary-600"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-base font-black text-slate-900">{Math.round(averageMastery)}%</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 font-outfit leading-none mb-1">Command Matrix</h3>
              <p className="text-xs text-slate-500 font-medium max-w-[200px] leading-tight">Aggregated performance across all domains.</p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            {[
              { label: 'Questions', val: comprehensiveStats.totalQuestions, color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Sketches', val: comprehensiveStats.totalSketches, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Recall', val: comprehensiveStats.totalFlashcards, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Accuracy', val: `${Math.round(averageMastery)}%`, color: 'text-emerald-600', bg: 'bg-emerald-50' }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-white border border-slate-100 min-w-[80px]">
                <div className={`text-base font-black ${stat.color}`}>{isLoadingStats ? '..' : stat.val}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </LearningJourneyHeader>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">

        {/* Subjects Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {availableSubjects.map((subject) => {
            const config = SUBJECT_CONFIGS[subject];
            const progress = subjectProgress?.[subject];
            const Icon = SUBJECT_ICONS[subject];
            const mastery = progress?.overallMastery || 0;
            const stats = comprehensiveStats.subjectStats[subject] || { questions: 0, sketches: 0, flashcards: 0, topics: 0 };

            return (
              <motion.button
                key={subject}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectSubject(subject)}
                className="group relative bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 text-left overflow-hidden flex flex-col"
              >
                <div className="p-5 flex flex-col relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transform group-hover:rotate-6 transition-transform text-white"
                        style={{ background: `linear-gradient(135deg, ${config.color}, ${config.colorDark})` }}
                      >
                        <Icon size={24} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 font-outfit leading-tight group-hover:text-primary-600 transition-colors">
                          {config.displayName}
                        </h3>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{config.domains.length} Domains • {progress ? `${progress.topicsTotal} Topics` : 'Academic Path'}</div>
                      </div>
                    </div>
                    {progress && (
                      <div className="text-right">
                        <div className="text-xl font-black text-slate-900 leading-none">{Math.round(mastery)}%</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery</div>
                      </div>
                    )}
                  </div>

                  {/* Context Stats Row */}
                  <div className="flex items-center justify-between gap-2 mb-4 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                    {[
                      { l: 'Topics', v: stats.topics, c: 'text-slate-900' },
                      { l: 'Questions', v: stats.questions, c: 'text-violet-600' },
                      { l: 'Notes', v: stats.sketches, c: 'text-amber-600' },
                      { l: 'Recall', v: stats.flashcards, c: 'text-purple-600' }
                    ].map((s, idx) => (
                      <div key={idx} className="flex-1 text-center">
                        <div className={`text-sm font-black ${s.c}`}>{isLoadingStats ? '..' : s.v}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Domains Bar */}
                  <div className="flex flex-wrap gap-1 mb-4 h-6 overflow-hidden">
                    {config.domains.slice(0, 3).map((domain) => (
                      <span key={domain} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-500 truncate max-w-[100px]">
                        {domain}
                      </span>
                    ))}
                    {config.domains.length > 3 && (
                      <span className="text-xs font-black text-slate-400 flex items-center">+{config.domains.length - 3}</span>
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-widest group/btn">
                      Explore Hub
                      <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </div>
                    {progress && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <div
                            key={star}
                            className={`w-1 h-1 rounded-full ${mastery >= star * 20 ? 'bg-primary-500' : 'bg-slate-200'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Micro Progress Bar */}
                {progress && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${mastery}%` }}
                      className="h-full"
                      style={{ backgroundColor: config.color }}
                    />
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

export default SubjectSelectionPage;

