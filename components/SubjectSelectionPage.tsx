import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  ArrowRight,
  ChevronLeft,
  TrendingUp,
  BookOpen,
  Target,
  AlertCircle,
  Trophy,
  Zap,
  Brain,
  Palette,
  FileQuestion,
  Sparkles
} from 'lucide-react';
import type { Subject, ExamContext, SubjectProgress } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { supabase } from '../lib/supabase';

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

  // Fetch comprehensive stats on mount
  useEffect(() => {
    fetchComprehensiveStats();
  }, [examContext]);

  const fetchComprehensiveStats = async () => {
    try {
      // Get all published scans
      const { data: publishedScans } = await supabase
        .from('scans')
        .select('id, subject, exam_context')
        .eq('is_system_scan', true);

      if (!publishedScans || publishedScans.length === 0) {
        return;
      }

      const scanIds = publishedScans.map(s => s.id);

      // Total questions
      const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .in('scan_id', scanIds);

      // Total sketches (count from scans.analysis_data only - avoids 404 errors)
      const { data: scansWithAnalysis } = await supabase
        .from('scans')
        .select('analysis_data')
        .in('id', scanIds);

      let totalSketches = 0;
      scansWithAnalysis?.forEach(scan => {
        if (scan.analysis_data?.topicBasedSketches) {
          totalSketches += Object.keys(scan.analysis_data.topicBasedSketches).length;
        }
      });

      // Total flashcards (from flashcards table)
      // Flashcards are stored as JSONB arrays, need to sum up array lengths
      const { data: flashcardRecords } = await supabase
        .from('flashcards')
        .select('data')
        .in('scan_id', scanIds);

      let totalFlashcards = 0;
      flashcardRecords?.forEach(record => {
        if (record.data && Array.isArray(record.data)) {
          totalFlashcards += record.data.length;
        }
      });

      // Total topics across all subjects
      const { count: totalTopics } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true });

      // Per-subject stats
      const subjectStats: Record<Subject, any> = {} as any;

      for (const subject of availableSubjects) {
        const subjectScans = publishedScans.filter(s => s.subject === subject);
        const subjectScanIds = subjectScans.map(s => s.id);

        if (subjectScanIds.length > 0) {
          const { count: q } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .in('scan_id', subjectScanIds);

          // Sketches (from scans.analysis_data only - avoids 404 errors)
          const { data: subjectScansWithAnalysis } = await supabase
            .from('scans')
            .select('analysis_data')
            .in('id', subjectScanIds);

          let s = 0;
          subjectScansWithAnalysis?.forEach(scan => {
            if (scan.analysis_data?.topicBasedSketches) {
              s += Object.keys(scan.analysis_data.topicBasedSketches).length;
            }
          });

          // Flashcards (from flashcards table)
          // Count actual cards in JSONB arrays
          const { data: subjectFlashcardRecords } = await supabase
            .from('flashcards')
            .select('data')
            .in('scan_id', subjectScanIds);

          let f = 0;
          subjectFlashcardRecords?.forEach(record => {
            if (record.data && Array.isArray(record.data)) {
              f += record.data.length;
            }
          });

          const { count: t } = await supabase
            .from('topics')
            .select('*', { count: 'exact', head: true })
            .eq('subject', subject);

          subjectStats[subject] = {
            questions: q || 0,
            sketches: s || 0,
            flashcards: f || 0,
            topics: t || 0
          };
        } else {
          subjectStats[subject] = {
            questions: 0,
            sketches: 0,
            flashcards: 0,
            topics: 0
          };
        }
      }

      setComprehensiveStats({
        totalQuestions: totalQuestions || 0,
        totalSketches: totalSketches || 0,
        totalFlashcards: totalFlashcards || 0,
        totalTopics: totalTopics || 0,
        subjectStats
      });
    } catch (error) {
      console.error('Error fetching comprehensive stats:', error);
    }
  };

  // Calculate overall stats
  const totalSubjects = availableSubjects.length;
  const completedSubjects = availableSubjects.filter(
    s => (subjectProgress?.[s]?.overallMastery || 0) >= 85
  ).length;
  const averageMastery = availableSubjects.reduce(
    (sum, s) => sum + (subjectProgress?.[s]?.overallMastery || 0),
    0
  ) / totalSubjects;

  // Find weakest and strongest subjects
  const weakestSubject = availableSubjects.reduce((weakest, subject) => {
    const mastery = subjectProgress?.[subject]?.overallMastery || 0;
    const weakestMastery = subjectProgress?.[weakest]?.overallMastery || 0;
    return mastery < weakestMastery ? subject : weakest;
  }, availableSubjects[0]);

  const strongestSubject = availableSubjects.reduce((strongest, subject) => {
    const mastery = subjectProgress?.[subject]?.overallMastery || 0;
    const strongestMastery = subjectProgress?.[strongest]?.overallMastery || 0;
    return mastery > strongestMastery ? subject : strongest;
  }, availableSubjects[0]);

  const weakestMastery = subjectProgress?.[weakestSubject]?.overallMastery || 0;
  const strongestMastery = subjectProgress?.[strongestSubject]?.overallMastery || 0;

  const getMasteryColor = (mastery: number): string => {
    if (mastery >= 85) return 'emerald';
    if (mastery >= 70) return 'green';
    if (mastery >= 50) return 'yellow';
    if (mastery >= 30) return 'orange';
    return 'red';
  };

  const getMasteryLabel = (mastery: number): string => {
    if (mastery >= 85) return 'Mastered';
    if (mastery >= 70) return 'Good';
    if (mastery >= 50) return 'Progressing';
    if (mastery >= 30) return 'Beginner';
    return 'Not Started';
  };

  return (
    <div className="bg-slate-50/50 font-instrument text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft size={18} />
              <span className="text-xs font-black uppercase tracking-wider">Back</span>
            </button>

            <div className="flex items-center gap-3">
              {/* Mastery Constellation - Compact Header Version */}
              <div className="relative bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 rounded-lg px-3 py-2 overflow-hidden">
                {/* Sparkle background */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-1 left-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse" />
                  <div className="absolute top-3 right-2 w-0.5 h-0.5 bg-yellow-200 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute bottom-1 left-3 w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                {/* Subject Stars - horizontal layout */}
                <div className="relative flex items-center gap-2">
                  {availableSubjects.map((subject, idx) => {
                    const mastery = subjectProgress?.[subject]?.overallMastery || 0;
                    const config = SUBJECT_CONFIGS[subject];
                    const size = 6 + (mastery / 100) * 6; // Smaller: 6px to 12px
                    const glow = mastery > 0 ? mastery / 100 : 0.1;

                    return (
                      <div key={subject} className="relative group">
                        {/* Glow effect */}
                        <div
                          className="absolute inset-0 rounded-full blur-sm transition-all duration-700"
                          style={{
                            width: size * 1.8,
                            height: size * 1.8,
                            background: config.color,
                            opacity: glow * 0.5,
                            transform: 'translate(-20%, -20%)'
                          }}
                        />

                        {/* Star */}
                        <div
                          className="relative rounded-full flex items-center justify-center text-white font-black transition-all duration-700"
                          style={{
                            width: size,
                            height: size,
                            background: `linear-gradient(135deg, ${config.color}, ${config.colorDark})`,
                            fontSize: size * 0.4,
                            boxShadow: `0 0 ${mastery * 0.15}px ${config.color}`
                          }}
                        >
                          {mastery >= 50 ? config.iconEmoji : ''}
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {config.displayName.split(' ')[0]}: {Math.round(mastery)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-2.5 py-1 bg-slate-100 rounded-lg">
                <span className="font-black text-[10px] text-slate-500 uppercase tracking-wider mr-1.5">
                  Trajectory
                </span>
                <span className="font-black text-slate-900 text-xs">{examContext}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-black text-xl tracking-tight text-slate-900 font-outfit">
              Select <span className="text-primary-600">Subject</span>
            </h1>
          </div>
          <p className="text-slate-600 text-xs font-medium">
            Choose a subject to explore topics, practice questions, and track your mastery.
          </p>
        </div>
      </div>

      {/* PREMIUM DESIGN ACTIVE Banner */}
      <div className="max-w-7xl mx-auto px-6 py-2">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-3 rounded-2xl mb-2 flex items-center justify-center gap-3 shadow-xl animate-pulse">
          <Zap size={24} className="animate-bounce" />
          <span className="text-sm font-black uppercase tracking-wider">⚡ Premium UX Applied - DNA Icon + Animated Stats!</span>
          <Zap size={24} className="animate-bounce" />
        </div>
      </div>

      {/* Stats Overview - Premium Compact Cards with Animations */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Overall Progress */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-3 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1.5 right-1.5 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <Trophy size={60} className="text-blue-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center transition-all duration-300 group-hover:bg-blue-200 group-hover:scale-110 group-hover:rotate-6">
                  <Trophy size={12} className="text-blue-600 transition-all duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Progress
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 leading-none mb-1 transition-colors duration-300 group-hover:text-blue-600">
                {Math.round(averageMastery)}%
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {completedSubjects}/{totalSubjects} mastered
              </div>
            </div>
          </div>

          {/* Questions Attempted */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-3 overflow-hidden hover:border-indigo-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1.5 right-1.5 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <BookOpen size={60} className="text-indigo-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center transition-all duration-300 group-hover:bg-indigo-200 group-hover:scale-110 group-hover:rotate-6">
                  <BookOpen size={12} className="text-indigo-600 transition-all duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Questions
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 leading-none mb-1 transition-colors duration-300 group-hover:text-indigo-600">
                {availableSubjects.reduce((sum, s) => sum + (subjectProgress?.[s]?.totalQuestionsAttempted || 0), 0)}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Attempted</div>
            </div>
          </div>

          {/* Average Accuracy */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-3 overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1.5 right-1.5 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <Target size={60} className="text-emerald-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-200 group-hover:scale-110 group-hover:rotate-6">
                  <Target size={12} className="text-emerald-600 transition-all duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Accuracy
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 leading-none mb-1 transition-colors duration-300 group-hover:text-emerald-600">
                {Math.round(
                  availableSubjects.reduce((sum, s) => sum + (subjectProgress?.[s]?.overallAccuracy || 0), 0) / totalSubjects
                )}%
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Average</div>
            </div>
          </div>

          {/* Total Questions (from published scans) */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-3 overflow-hidden hover:border-violet-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1.5 right-1.5 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <FileQuestion size={60} className="text-violet-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center transition-all duration-300 group-hover:bg-violet-200 group-hover:scale-110 group-hover:rotate-6">
                  <FileQuestion size={12} className="text-violet-600 transition-all duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Questions
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 leading-none mb-1 transition-colors duration-300 group-hover:text-violet-600">
                {comprehensiveStats.totalQuestions}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Total Bank</div>
            </div>
          </div>

          {/* Sketch Notes */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-3 overflow-hidden hover:border-amber-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1.5 right-1.5 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <Palette size={60} className="text-amber-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center transition-all duration-300 group-hover:bg-amber-200 group-hover:scale-110 group-hover:rotate-6">
                  <Palette size={12} className="text-amber-600 transition-all duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Sketches
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 leading-none mb-1 transition-colors duration-300 group-hover:text-amber-600">
                {comprehensiveStats.totalSketches}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Visual Notes</div>
            </div>
          </div>

          {/* Rapid Recall (Flashcards) */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-3 overflow-hidden hover:border-purple-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1.5 right-1.5 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <Brain size={60} className="text-purple-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center transition-all duration-300 group-hover:bg-purple-200 group-hover:scale-110 group-hover:rotate-6">
                  <Brain size={12} className="text-purple-600 transition-all duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Flashcards
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 leading-none mb-1 transition-colors duration-300 group-hover:text-purple-600">
                {comprehensiveStats.totalFlashcards}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Rapid Recall</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Cards - Premium Clean Design */}
      <div className="max-w-7xl mx-auto px-6 py-3 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableSubjects.map((subject) => {
            const config = SUBJECT_CONFIGS[subject];
            const progress = subjectProgress?.[subject];
            const Icon = SUBJECT_ICONS[subject];
            const mastery = progress?.overallMastery || 0;
            const masteryColor = getMasteryColor(mastery);
            const masteryLabel = getMasteryLabel(mastery);
            const stats = comprehensiveStats.subjectStats[subject] || { questions: 0, sketches: 0, flashcards: 0, topics: 0 };

            return (
              <button
                key={subject}
                onClick={() => onSelectSubject(subject)}
                className="group relative bg-white rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all duration-300 text-left shadow-sm hover:shadow-xl overflow-hidden"
              >
                {/* Card Content */}
                <div className="p-5">
                  {/* Large Gradient Icon Badge with Hover Animation */}
                  <div className="mb-4">
                    <div
                      className="inline-flex w-16 h-16 rounded-xl items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${config.color} 0%, ${config.colorDark} 100%)`
                      }}
                    >
                      <Icon size={32} className="text-white transition-all duration-500 group-hover:scale-110" strokeWidth={2.5} />
                    </div>
                    {/* Glow effect on hover */}
                    <div
                      className="absolute top-5 left-5 w-16 h-16 rounded-xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500"
                      style={{
                        background: `linear-gradient(135deg, ${config.color} 0%, ${config.colorDark} 100%)`
                      }}
                    />
                  </div>

                  {/* Subject Name - Bold & Black with Hover Effect */}
                  <h3 className="text-2xl font-black text-slate-900 mb-1.5 tracking-tight transition-colors duration-300 group-hover:text-purple-600">
                    {config.displayName}
                  </h3>

                  {/* Description - Uppercase Gray with Hover Effect */}
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 leading-relaxed transition-colors duration-300 group-hover:text-purple-500">
                    {config.domains.length} Learning Domains • {progress ? `${progress.topicsTotal} Topics` : 'Expert Mastery Track'}
                  </p>

                  {/* Progress Info (if has progress) with Hover Effects */}
                  {progress ? (
                    <div className="mb-4 pb-4 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          Mastery Level
                        </span>
                        <span className="text-xs font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">
                          {masteryLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="transition-all duration-300 group-hover:scale-105">
                          <div className="text-lg font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">{Math.round(mastery)}%</div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Overall</div>
                        </div>
                        <div className="transition-all duration-300 group-hover:scale-105">
                          <div className="text-lg font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">{progress.topicsMastered}</div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Topics</div>
                        </div>
                        <div className="transition-all duration-300 group-hover:scale-105">
                          <div className="text-lg font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">{progress.overallAccuracy.toFixed(0)}%</div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Accuracy</div>
                        </div>
                      </div>

                      {/* Progress Bar with Hover Animation */}
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden group-hover:h-2 transition-all duration-300">
                        <div
                          className="h-full rounded-full transition-all duration-500 group-hover:shadow-lg"
                          style={{
                            width: `${mastery}%`,
                            background: `linear-gradient(90deg, ${config.color} 0%, ${config.colorDark} 100%)`
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 pb-4 border-b border-slate-100">
                      <p className="text-xs text-slate-600 font-medium">
                        Begin your journey in {config.displayName}
                      </p>
                    </div>
                  )}

                  {/* Subject Content Stats */}
                  <div className="mb-4 pb-4 border-b border-slate-100">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Content Available</div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center">
                        <div className="text-sm font-black text-violet-600">{stats.topics}</div>
                        <div className="text-[8px] font-bold text-slate-500">Topics</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-black text-indigo-600">{stats.questions}</div>
                        <div className="text-[8px] font-bold text-slate-500">Questions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-black text-amber-600">{stats.sketches}</div>
                        <div className="text-[8px] font-bold text-slate-500">Sketches</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-black text-purple-600">{stats.flashcards}</div>
                        <div className="text-[8px] font-bold text-slate-500">Flashcards</div>
                      </div>
                    </div>
                  </div>

                  {/* Key Domains with Hover Effects */}
                  <div className="mb-4">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Key Domains</div>
                    <div className="flex flex-wrap gap-1.5">
                      {config.domains.slice(0, 3).map((domain) => (
                        <div key={domain} className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 transition-all duration-300 group-hover:bg-purple-50 group-hover:border-purple-200 group-hover:scale-105">
                          <span className="text-[11px] font-bold text-slate-700 transition-colors duration-300 group-hover:text-purple-700">{domain}</span>
                        </div>
                      ))}
                      {config.domains.length > 3 && (
                        <div className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 transition-all duration-300 group-hover:bg-purple-50 group-hover:border-purple-200 group-hover:scale-105">
                          <span className="text-[11px] font-bold text-slate-500 transition-colors duration-300 group-hover:text-purple-600">+{config.domains.length - 3}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Purple Action Button - Premium Style */}
                  <button className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl text-white group-hover:shadow-2xl group-hover:from-purple-700 group-hover:to-purple-800 transition-all">
                    <span className="text-xs font-black tracking-tight uppercase">
                      {progress ? 'Continue Learning' : 'Enter Learning Track'}
                    </span>
                    <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubjectSelectionPage;
