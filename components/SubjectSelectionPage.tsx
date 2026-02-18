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
  Sparkles
} from 'lucide-react';
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

  // Loading state to prevent layout shifts
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchComprehensiveStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      // Single optimized query: Get counts grouped by subject in one go
      const { data: publishedScans } = await supabase
        .from('scans')
        .select('id, subject')
        .eq('is_system_scan', true);

      if (!publishedScans || publishedScans.length === 0) {
        setIsLoadingStats(false);
        return;
      }

      const scanIds = publishedScans.map(s => s.id);

      // Run all count queries in parallel (not sequential!)
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

      // Count sketches and flashcards from fetched data
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

      // Get per-subject counts in parallel
      const subjectStatsPromises = availableSubjects.map(async (subject) => {
        const subjectScanIds = publishedScans.filter(s => s.subject === subject).map(s => s.id);

        if (subjectScanIds.length === 0) {
          return [subject, { questions: 0, sketches: 0, flashcards: 0, topics: 0 }];
        }

        const [{ count: q }, { count: t }] = await Promise.all([
          supabase.from('questions').select('*', { count: 'exact', head: true }).in('scan_id', subjectScanIds),
          supabase.from('topics').select('*', { count: 'exact', head: true }).eq('subject', subject)
        ]);

        // Count sketches and flashcards for this subject from already-fetched data
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
  }, [availableSubjects]); // Add dependency

  // Fetch comprehensive stats AFTER initial render (non-blocking)
  useEffect(() => {
    // Defer stats loading to allow instant UI render
    const timer = setTimeout(() => {
      fetchComprehensiveStats();
    }, 100); // 100ms delay for smooth initial render

    return () => clearTimeout(timer);
  }, [fetchComprehensiveStats]);

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
      {/* Unified Header */}
      <LearningJourneyHeader
        showBack
        onBack={onBack}
        icon={<Palette size={24} className="text-white" />}
        title="Select Subject"
        description="Choose a subject to explore topics, practice questions, and track your mastery"
        trajectory={examContext}
        actions={
          <>
            {/* Mastery Constellation - Compact Header Version */}
            <div className="relative bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 rounded-lg px-3 py-2 overflow-hidden hidden md:block">
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
          </>
        }
      />

      {/* Stats Overview - Premium Compact Cards with Animations */}
      <div className="max-w-7xl mx-auto px-6 py-1">
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
          {/* Overall Progress */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-1.5 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1 right-1 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <Trophy size={36} className="text-blue-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-3.5 h-3.5 rounded-md bg-blue-100 flex items-center justify-center transition-all duration-300 group-hover:bg-blue-200">
                  <Trophy size={9} className="text-blue-600" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 truncate">
                  Progress
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 leading-none mb-0.5 transition-colors duration-300 group-hover:text-blue-600">
                {Math.round(averageMastery)}%
              </div>
              <div className="text-[9px] text-slate-500 font-medium truncate">
                {completedSubjects}/{totalSubjects} done
              </div>
            </div>
          </div>

          {/* Questions Attempted */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-1.5 overflow-hidden hover:border-indigo-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1 right-1 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <BookOpen size={36} className="text-indigo-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-3.5 h-3.5 rounded-md bg-indigo-100 flex items-center justify-center transition-all duration-300 group-hover:bg-indigo-200 group-hover:scale-110 group-hover:rotate-6">
                  <BookOpen size={9} className="text-indigo-600 transition-all duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 truncate">
                  Questions
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 leading-none mb-0.5 transition-colors duration-300 group-hover:text-indigo-600">
                {availableSubjects.reduce((sum, s) => sum + (subjectProgress?.[s]?.totalQuestionsAttempted || 0), 0)}
              </div>
              <div className="text-[9px] text-slate-500 font-medium truncate">Attempted</div>
            </div>
          </div>

          {/* Average Accuracy */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-1.5 overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1 right-1 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <Target size={36} className="text-emerald-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-3.5 h-3.5 rounded-md bg-emerald-100 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-200 group-hover:scale-110 group-hover:rotate-6">
                  <Target size={9} className="text-emerald-600 transition-all duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 truncate">
                  Accuracy
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 leading-none mb-0.5 transition-colors duration-300 group-hover:text-emerald-600">
                {Math.round(
                  availableSubjects.reduce((sum, s) => sum + (subjectProgress?.[s]?.overallAccuracy || 0), 0) / totalSubjects
                )}%
              </div>
              <div className="text-[9px] text-slate-500 font-medium truncate">Average</div>
            </div>
          </div>

          {/* Total Questions (from published scans) */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-1.5 overflow-hidden hover:border-violet-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1 right-1 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <FileQuestion size={36} className="text-violet-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-3.5 h-3.5 rounded-md bg-violet-100 flex items-center justify-center transition-all duration-300 group-hover:bg-violet-200 group-hover:scale-110 group-hover:rotate-6">
                  <FileQuestion size={9} className="text-violet-600 transition-all duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 truncate">
                  Questions
                </span>
              </div>
              <div className="text-xl font-black leading-none mb-0.5 transition-colors duration-300">
                {isLoadingStats ? (
                  <span className="text-slate-300 animate-pulse">—</span>
                ) : (
                  <span className="text-slate-900 group-hover:text-violet-600">{comprehensiveStats.totalQuestions}</span>
                )}
              </div>
              <div className="text-[9px] text-slate-500 font-medium truncate">Total Bank</div>
            </div>
          </div>

          {/* Sketch Notes */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-1.5 overflow-hidden hover:border-amber-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1 right-1 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <Palette size={36} className="text-amber-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-3.5 h-3.5 rounded-md bg-amber-100 flex items-center justify-center transition-all duration-300 group-hover:bg-amber-200 group-hover:scale-110 group-hover:rotate-6">
                  <Palette size={9} className="text-amber-600 transition-all duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 truncate">
                  Sketches
                </span>
              </div>
              <div className="text-xl font-black leading-none mb-0.5 transition-colors duration-300">
                {isLoadingStats ? (
                  <span className="text-slate-300 animate-pulse">—</span>
                ) : (
                  <span className="text-slate-900 group-hover:text-amber-600">{comprehensiveStats.totalSketches}</span>
                )}
              </div>
              <div className="text-[9px] text-slate-500 font-medium truncate">Visual Notes</div>
            </div>
          </div>

          {/* Rapid Recall (Flashcards) */}
          <div className="group relative bg-white rounded-xl border border-slate-200 p-1.5 overflow-hidden hover:border-purple-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute top-1 right-1 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <Brain size={36} className="text-purple-600" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-3.5 h-3.5 rounded-md bg-purple-100 flex items-center justify-center transition-all duration-300 group-hover:bg-purple-200 group-hover:scale-110 group-hover:rotate-6">
                  <Brain size={9} className="text-purple-600 transition-all duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 truncate">
                  Flashcards
                </span>
              </div>
              <div className="text-xl font-black leading-none mb-0.5 transition-colors duration-300">
                {isLoadingStats ? (
                  <span className="text-slate-300 animate-pulse">—</span>
                ) : (
                  <span className="text-slate-900 group-hover:text-purple-600">{comprehensiveStats.totalFlashcards}</span>
                )}
              </div>
              <div className="text-[9px] text-slate-500 font-medium truncate">Rapid Recall</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Cards - Professional Design */}
      <div className="max-w-7xl mx-auto px-6 py-1.5 pb-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                className="group relative bg-white rounded-xl border border-slate-200/60 hover:border-purple-300 transition-all duration-300 text-left shadow-sm hover:shadow-lg overflow-hidden flex flex-col"
              >
                {/* Hover Arrow Indicator - Top Right */}
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5">
                  <ArrowRight size={14} className="text-purple-600" strokeWidth={2.5} />
                </div>

                {/* Card Content */}
                <div className="p-3 flex flex-col flex-1">
                  {/* Icon Badge - Professional Size */}
                  <div className="mb-2 flex items-center justify-between">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-105 group-hover:rotate-3"
                      style={{
                        background: `linear-gradient(135deg, ${config.color} 0%, ${config.colorDark} 100%)`
                      }}
                    >
                      <Icon size={22} className="text-white" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Subject Name - Balanced */}
                  <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight transition-colors duration-300 group-hover:text-purple-600 leading-tight">
                    {config.displayName}
                  </h3>

                  {/* Description - Readable Size */}
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 leading-tight">
                    {config.domains.length} Domains • {progress ? `${progress.topicsTotal} Topics` : 'Expert Track'}
                  </p>

                  {/* Progress Info (if has progress) - Readable */}
                  <div className="mb-2 pb-2 border-b border-slate-100">
                    {progress ? (
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                            Mastery
                          </span>
                          <span className="text-[11px] font-black text-slate-900">
                            {masteryLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                          <div>
                            <div className="text-sm font-black text-slate-900 leading-none">{Math.round(mastery)}%</div>
                            <div className="text-[8px] font-semibold text-slate-400 uppercase mt-0.5">Overall</div>
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900 leading-none">{progress.topicsMastered}</div>
                            <div className="text-[8px] font-semibold text-slate-400 uppercase mt-0.5">Topics</div>
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900 leading-none">{progress.overallAccuracy.toFixed(0)}%</div>
                            <div className="text-[8px] font-semibold text-slate-400 uppercase mt-0.5">Accuracy</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${mastery}%`,
                              background: `linear-gradient(90deg, ${config.color} 0%, ${config.colorDark} 100%)`
                            }}
                          />
                        </div>
                      </>
                    ) : null}
                  </div>

                  {/* Subject Content Stats - Readable */}
                  <div className="mb-2 pb-2 border-b border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Content</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="text-center">
                        {isLoadingStats ? (
                          <div className="text-lg font-black text-slate-300 animate-pulse">—</div>
                        ) : (
                          <div className="text-lg font-black text-violet-600">{stats.topics}</div>
                        )}
                        <div className="text-[9px] font-semibold text-slate-500 mt-0.5">Topics</div>
                      </div>
                      <div className="text-center">
                        {isLoadingStats ? (
                          <div className="text-lg font-black text-slate-300 animate-pulse">—</div>
                        ) : (
                          <div className="text-lg font-black text-indigo-600">{stats.questions}</div>
                        )}
                        <div className="text-[9px] font-semibold text-slate-500 mt-0.5">Qs</div>
                      </div>
                      <div className="text-center">
                        {isLoadingStats ? (
                          <div className="text-lg font-black text-slate-300 animate-pulse">—</div>
                        ) : (
                          <div className="text-lg font-black text-amber-600">{stats.sketches}</div>
                        )}
                        <div className="text-[9px] font-semibold text-slate-500 mt-0.5">Notes</div>
                      </div>
                      <div className="text-center">
                        {isLoadingStats ? (
                          <div className="text-lg font-black text-slate-300 animate-pulse">—</div>
                        ) : (
                          <div className="text-lg font-black text-purple-600">{stats.flashcards}</div>
                        )}
                        <div className="text-[9px] font-semibold text-slate-500 mt-0.5">Cards</div>
                      </div>
                    </div>
                  </div>

                  {/* Key Domains - Readable Pills */}
                  <div className="flex flex-col mt-auto">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Domains</div>
                    <div className="flex flex-wrap gap-1">
                      {config.domains.slice(0, 3).map((domain) => (
                        <span key={domain} className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-[11px] font-semibold border border-slate-200 transition-colors duration-200 group-hover:bg-purple-100 group-hover:text-purple-700 group-hover:border-purple-200">
                          {domain}
                        </span>
                      ))}
                      {config.domains.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-[11px] font-semibold border border-slate-200 transition-colors duration-200 group-hover:bg-purple-100 group-hover:text-purple-600 group-hover:border-purple-200">
                          +{config.domains.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
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
