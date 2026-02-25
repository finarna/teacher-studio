import React, { useState, useEffect } from 'react';
import {
  Calendar,
  BookOpen,
  FlaskConical,
  ArrowRight,
  ChevronLeft,
  TrendingUp,
  Target,
  Zap,
  Play,
  Calculator,
  Atom,
  Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Subject, ExamContext } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { supabase } from '../lib/supabase';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';

interface SubjectMenuPageProps {
  subject: Subject;
  examContext: ExamContext;
  onSelectOption: (option: 'past_exams' | 'topicwise' | 'mock_builder') => void;
  onBack: () => void;
}

interface SubjectMenuStats {
  totalTopics: number;
  masteredTopics: number;
  pastYearQuestionsCount: number;
  availableYears: string[];
  totalPapers: number; // Total number of past year papers
  customTestsTaken: number;
  avgMockScore: number;
}

const SubjectMenuPage: React.FC<SubjectMenuPageProps> = ({
  subject,
  examContext,
  onSelectOption,
  onBack
}) => {
  const [stats, setStats] = useState<SubjectMenuStats>({
    totalTopics: 0,
    masteredTopics: 0,
    pastYearQuestionsCount: 0,
    availableYears: [],
    totalPapers: 0,
    customTestsTaken: 0,
    avgMockScore: 0
  });
  const [globalStats, setGlobalStats] = useState({ averageMastery: 0, averageAccuracy: 0 });
  const { refreshData, subjectProgress } = useLearningJourney();
  const subProg = subjectProgress[subject];
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<{ id: string, name: string, type: 'topic' | 'exam' } | null>(null);

  // Get subject config
  const subjectConfig = SUBJECT_CONFIGS[subject];

  // Map string icon names to actual Lucide components
  const iconMap: Record<string, React.ComponentType<any>> = {
    Calculator,
    Atom,
    FlaskConical,
    Leaf
  };

  const IconComponent = iconMap[subjectConfig.icon] || Calculator;

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, [subject, examContext]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Parallelize independent data fetches for the dashboard cards
      const [
        { count: totalTopicsCount },
        { data: scansData },
        { count: mCount },
        { data: testsData },
        { data: recentTopic }
      ] = await Promise.all([
        // 1. Topic Count
        supabase
          .from('topics')
          .select('*', { count: 'exact', head: true })
          .eq('subject', subject),

        // 2. Scans for Past Year Questions
        supabase
          .from('scans')
          .select('id, year, analysis_data')
          .eq('subject', subject)
          .eq('exam_context', examContext)
          .not('year', 'is', null),

        // 3. Mastered Topics Count
        supabase
          .from('topic_resources')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('subject', subject)
          .eq('exam_context', examContext)
          .gte('mastery_level', 85),

        // 4. Mock Tests Data
        supabase
          .from('test_attempts')
          .select('percentage')
          .eq('user_id', user.id)
          .eq('subject', subject)
          .eq('exam_context', examContext)
          .eq('test_type', 'full_mock')
          .eq('status', 'completed'),

        // 5. Last Active Topic
        supabase
          .from('topic_resources')
          .select('id, topic_id, topics(name)')
          .eq('user_id', user.id)
          .eq('subject', subject)
          .order('updated_at', { ascending: false })
          .limit(1)
      ]);

      // We no longer calculate global currentSubjectStats here manually to ensure total consistency
      // Instead, we rely on the LearningJourneyContext which is the source of truth for all sub-pages

      // Handle Last Activity
      if (recentTopic && recentTopic.length > 0) {
        const lastTr = recentTopic[0] as any;
        setLastActivity({ id: lastTr.id, name: lastTr.topics?.name || 'Recent Topic', type: 'topic' });
      }

      let pastYearQuestionsCount = 0;
      let availableYears: string[] = [];
      const totalPapers = scansData?.length || 0;

      if (scansData && scansData.length > 0) {
        scansData.forEach((scan: any) => {
          const questions = scan.analysis_data?.questions || [];
          pastYearQuestionsCount += questions.length;
          if (scan.year) availableYears.push(scan.year);
        });
        availableYears = [...new Set(availableYears)].sort((a, b) => parseInt(b) - parseInt(a));
      }

      const customTestsTaken = testsData?.length || 0;
      let avgMockScore = 0;
      if (customTestsTaken > 0) {
        const totalScore = testsData!.reduce((sum, t) => sum + (t.percentage || 0), 0);
        avgMockScore = Math.round(totalScore / customTestsTaken);
      }

      setStats({
        totalTopics: totalTopicsCount || 0,
        masteredTopics: mCount || 0,
        pastYearQuestionsCount,
        availableYears,
        totalPapers,
        customTestsTaken,
        avgMockScore
      });
    } catch (error) {
      console.error('Error fetching subject menu stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const optionCards = [
    {
      id: 'past_exams' as const,
      icon: Calendar,
      title: 'Exam Vault',
      description: 'Browse and solve previous exam papers with detailed explanations',
      gradient: 'from-blue-500 to-blue-600',
      stats: stats.totalPapers > 0
        ? `${stats.totalPapers} ${stats.totalPapers === 1 ? 'paper' : 'papers'} • ${stats.availableYears.length} ${stats.availableYears.length === 1 ? 'year' : 'years'} • ${stats.pastYearQuestionsCount} questions`
        : 'Loading...',
      badge: stats.availableYears.length > 0 ? `${stats.availableYears.length} Years` : null,
      illustration: 'blackboard' // Blackboard with years, formulas, graphs
    },
    {
      id: 'topicwise' as const,
      icon: BookOpen,
      title: 'Node Syllabus',
      description: 'Master topics systematically with Learn, Practice, Quiz, Flashcards',
      gradient: 'from-purple-500 to-purple-600',
      stats: stats.totalTopics > 0
        ? `${stats.totalTopics} topics available`
        : 'Loading...',
      badge: stats.masteredTopics > 0 ? `${stats.masteredTopics} Mastered` : null,
      illustration: 'study-desk' // Study desk with books, flashcards, notes
    },
    {
      id: 'mock_builder' as const,
      icon: Zap,
      title: 'Mock Missions',
      description: 'Create personalized practice tests tailored to your weak areas',
      gradient: 'from-amber-500 to-amber-600',
      stats: 'AI-powered recommendations',
      badge: stats.customTestsTaken > 0 ? `${stats.customTestsTaken} Tests Taken` : 'New!',
      illustration: 'ai-brain' // AI brain analyzing performance graphs
    }
  ];

  // Get subject-specific theme configuration with custom sketch images
  const getSubjectTheme = () => {
    const subjectLower = subject.toLowerCase();
    return {
      blackboardImage: `/assets/blackboards/${subjectLower}-blackboard-sketch.jpg`,
      bgClass: subject === 'Physics' ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
        : subject === 'Chemistry' ? 'bg-gradient-to-br from-green-500 to-emerald-500'
          : subject === 'Math' ? 'bg-gradient-to-br from-purple-500 to-violet-500'
            : subject === 'Biology' ? 'bg-gradient-to-br from-lime-500 to-green-500'
              : 'bg-gradient-to-br from-slate-500 to-slate-600',
      symbols: subject === 'Physics' ? ['⚡', '🔋', '🧲', '⚛️']
        : subject === 'Chemistry' ? ['⚗️', '🧪', '⚛️', '🔬']
          : subject === 'Math' ? ['∑', '∫', '√', '∞']
            : subject === 'Biology' ? ['🧬', '🦠', '🌱', '🔬']
              : ['∑', '⚛️', '🧪', '🧬']
    };
  };

  const subjectTheme = getSubjectTheme();

  // Subject-specific illustration backgrounds
  const renderIllustration = (type: string) => {

    switch (type) {
      case 'blackboard':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none group-hover:scale-105 transition-transform duration-500">
            {/* Custom Hand-Drawn Sketch Image */}
            <img
              src={subjectTheme.blackboardImage}
              alt={`${subject} sketch`}
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-all duration-500"
              style={{ objectPosition: 'center', objectFit: 'cover' }}
            />

            {/* ROLLING YEARS MARQUEE - Infinite Time Machine Effect */}
            <div className="absolute inset-0 flex justify-around opacity-10 group-hover:opacity-20 transition-opacity">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -600] }}
                  transition={{
                    duration: 15 + (i * 5),
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * -2
                  }}
                  className="flex flex-col gap-12 font-black text-6xl tracking-tighter"
                >
                  {[2019, 2020, 2021, 2022, 2023, 2024, 2025].map(year => (
                    <span key={year}>{year}</span>
                  ))}
                  {[2019, 2020, 2021, 2022, 2023, 2024, 2025].map(year => (
                    <span key={`dup-${year}`}>{year}</span>
                  ))}
                </motion.div>
              ))}
            </div>

            {/* Subject Color Tint Overlay */}
            <div className={`absolute inset-0 ${subjectTheme.bgClass} opacity-20 group-hover:opacity-25 transition-opacity mix-blend-multiply`} />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
          </div>
        );

      case 'study-desk':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none group-hover:scale-105 transition-transform duration-500">
            {/* Desk surface with subject color */}
            <div className={`absolute inset-0 ${subjectTheme.bgClass} opacity-20 group-hover:opacity-30 transition-opacity`} />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 opacity-20" />

            {/* FLOATING SUBJECT SYMBOLS - Mapping Logic */}
            <div className="absolute inset-0">
              {subjectTheme.symbols.map((symbol, idx) => (
                <motion.div
                  key={idx}
                  initial={{
                    x: Math.random() * 200,
                    y: Math.random() * 200,
                    rotate: 0,
                    opacity: 0.1
                  }}
                  animate={{
                    x: [Math.random() * 200, Math.random() * 200],
                    y: [Math.random() * 200, Math.random() * 200],
                    rotate: [0, 360],
                    opacity: [0.1, 0.2, 0.1]
                  }}
                  transition={{
                    duration: 10 + idx * 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute text-5xl font-bold text-slate-900"
                >
                  {symbol}
                </motion.div>
              ))}
            </div>

            {/* Open book - larger and more detailed */}
            <div className="absolute top-6 left-6 w-32 h-20 bg-white/60 rounded-sm transform -rotate-12 shadow-lg opacity-80 group-hover:opacity-90 transition-opacity">
              <div className="absolute inset-3 border-l-2 border-purple-300" />
              {/* Book pages with text lines */}
              <div className="absolute top-4 left-5 space-y-1">
                <div className="w-10 h-0.5 bg-purple-400/60" />
                <div className="w-8 h-0.5 bg-purple-400/50" />
                <div className="w-9 h-0.5 bg-purple-400/50" />
                <div className="w-7 h-0.5 bg-purple-400/40" />
              </div>
              <div className="absolute top-4 right-5 space-y-1">
                <div className="w-9 h-0.5 bg-purple-400/60" />
                <div className="w-10 h-0.5 bg-purple-400/50" />
                <div className="w-8 h-0.5 bg-purple-400/50" />
              </div>
            </div>

            {/* Flashcards stack - more prominent */}
            <div className="absolute top-10 right-8 space-y-1 opacity-70 group-hover:opacity-85 transition-all duration-300 group-hover:-translate-y-1">
              <div className="w-20 h-12 bg-purple-200/80 rounded shadow-md transform rotate-3 border border-purple-300/30">
                <div className="absolute top-2 left-2 right-2 h-0.5 bg-purple-400/40" />
                <div className="absolute top-4 left-2 right-2 h-0.5 bg-purple-400/30" />
              </div>
              <div className="w-20 h-12 bg-purple-200/70 rounded shadow-md transform -rotate-2 border border-purple-300/30" />
              <div className="w-20 h-12 bg-purple-200/60 rounded shadow-md transform rotate-1 border border-purple-300/30" />
            </div>

            {/* Pencil with detail */}
            <div className="absolute bottom-10 left-20 transform rotate-45 opacity-60 group-hover:opacity-75 transition-opacity">
              <div className="w-24 h-2 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-full" />
              <div className="absolute -left-2 top-0.5 w-3 h-1 bg-pink-300 rounded-full" />
            </div>

            {/* Sticky notes */}
            <div className="absolute bottom-8 right-10 w-16 h-16 bg-yellow-200/60 shadow-md transform rotate-6 opacity-70">
              <div className="absolute top-2 left-2 right-2 space-y-1">
                <div className="h-0.5 bg-yellow-600/40" />
                <div className="h-0.5 bg-yellow-600/30 w-3/4" />
                <div className="h-0.5 bg-yellow-600/30 w-4/5" />
              </div>
            </div>

            {/* Subject symbols */}
            <div className="absolute top-1/2 left-1/3 opacity-20 text-3xl">{subjectTheme.symbols[0]}</div>
            <div className="absolute bottom-1/4 right-1/3 opacity-15 text-2xl">{subjectTheme.symbols[1]}</div>
          </div>
        );

      case 'ai-brain':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none group-hover:scale-105 transition-transform duration-500">
            {/* Tech grid background with subject color */}
            <div className={`absolute inset-0 ${subjectTheme.bgClass} opacity-25 group-hover:opacity-35 transition-opacity`} />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 opacity-20" />

            {/* DIANOSTIC SONAR SCAN - Moving Logic Bar */}
            <motion.div
              animate={{ y: [-50, 300] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" as any }}
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(251,191,36,0.5)] z-0"
            />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(251,191,36,0.12),transparent_60%)]" />

            {/* Circuit pattern - more visible */}
            <svg className="absolute inset-0 w-full h-full opacity-25 group-hover:opacity-35 transition-opacity" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="circuit" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="1.5" fill="currentColor" className="text-amber-500" />
                  <line x1="10" y1="10" x2="30" y2="10" stroke="currentColor" strokeWidth="1" className="text-amber-400" />
                  <line x1="10" y1="10" x2="10" y2="30" stroke="currentColor" strokeWidth="1" className="text-amber-400" />
                  <circle cx="30" cy="10" r="0.8" fill="currentColor" className="text-amber-500" />
                  <circle cx="10" cy="30" r="0.8" fill="currentColor" className="text-amber-500" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#circuit)" />
            </svg>

            {/* AI Brain shape - larger and more detailed */}
            <div className="absolute top-6 right-6 w-32 h-32 opacity-70 group-hover:opacity-85 transition-opacity">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Brain outline */}
                <path d="M50,20 C30,20 20,35 20,50 C20,65 30,80 50,80 C70,80 80,65 80,50 C80,35 70,20 50,20"
                  fill="url(#brainGradient)" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" />
                <defs>
                  <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(251,191,36,0.3)" />
                    <stop offset="100%" stopColor="rgba(245,158,11,0.2)" />
                  </linearGradient>
                </defs>
                {/* Neural connections */}
                <circle cx="35" cy="40" r="3" fill="rgba(245,158,11,0.6)" />
                <circle cx="50" cy="30" r="3" fill="rgba(245,158,11,0.6)" />
                <circle cx="65" cy="40" r="3" fill="rgba(245,158,11,0.6)" />
                <circle cx="50" cy="55" r="3" fill="rgba(245,158,11,0.6)" />
                <circle cx="42" cy="45" r="2" fill="rgba(245,158,11,0.5)" />
                <circle cx="58" cy="45" r="2" fill="rgba(245,158,11,0.5)" />
                {/* Connection lines */}
                <line x1="35" y1="40" x2="50" y2="30" stroke="rgba(245,158,11,0.3)" strokeWidth="1.5" />
                <line x1="50" y1="30" x2="65" y2="40" stroke="rgba(245,158,11,0.3)" strokeWidth="1.5" />
                <line x1="35" y1="40" x2="50" y2="55" stroke="rgba(245,158,11,0.3)" strokeWidth="1.5" />
                <line x1="65" y1="40" x2="50" y2="55" stroke="rgba(245,158,11,0.3)" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Performance graphs - animated bars */}
            <svg className="absolute bottom-6 left-6 w-40 h-24 opacity-60 group-hover:opacity-75 transition-opacity" viewBox="0 0 100 60">
              {/* Axes */}
              <line x1="10" y1="55" x2="90" y2="55" stroke="rgba(245,158,11,0.4)" strokeWidth="1" />
              <line x1="10" y1="5" x2="10" y2="55" stroke="rgba(245,158,11,0.4)" strokeWidth="1" />
              {/* Rising bars */}
              <rect x="15" y="42" width="10" height="13" fill="rgba(251,191,36,0.5)" rx="1" />
              <rect x="30" y="35" width="10" height="20" fill="rgba(251,191,36,0.6)" rx="1" />
              <rect x="45" y="25" width="10" height="30" fill="rgba(251,191,36,0.7)" rx="1" />
              <rect x="60" y="18" width="10" height="37" fill="rgba(245,158,11,0.8)" rx="1" />
              <rect x="75" y="10" width="10" height="45" fill="rgba(245,158,11,0.9)" rx="1" />
              {/* Trend line */}
              <path d="M 20 48 L 35 42 L 50 32 L 65 24 L 80 12" stroke="rgba(234,88,12,0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>

            {/* AI sparkles and subject symbols */}
            <div className="absolute top-1/3 left-1/4 text-amber-500 opacity-30 font-bold text-2xl group-hover:opacity-40 transition-opacity">✨</div>
            <div className="absolute top-1/2 left-1/4 opacity-25 font-bold text-2xl">{subjectTheme.symbols[0]}</div>
            <div className="absolute top-2/3 right-1/3 opacity-25 font-bold text-xl">{subjectTheme.symbols[1]}</div>
            <div className="absolute bottom-1/3 right-1/4 text-amber-500 opacity-30 font-bold text-lg">⚡</div>

            {/* Target accuracy icon */}
            <div className="absolute bottom-1/4 right-1/4 opacity-30 group-hover:opacity-40 transition-opacity">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(245,158,11,0.5)" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="10" fill="none" stroke="rgba(245,158,11,0.6)" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="6" fill="none" stroke="rgba(245,158,11,0.7)" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="2" fill="rgba(245,158,11,0.8)" />
              </svg>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      <div className="min-h-screen bg-[#F8FAFC] relative font-outfit">
        {/* 1. AMBIENT MESH BACKGROUND */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-blue-50/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-50/20 rounded-full blur-[120px]" />
        </div>

        {/* 2. REFINED UNIVERSAL HEADER */}
        <LearningJourneyHeader
          showBack
          onBack={onBack}
          title={`${subject} Mission Center`}
          subtitle={`Systematic preparation for ${(examContext as any)?.name || examContext}`}
          subject={subject}
          trajectory={examContext}
          mastery={subProg?.overallMastery}
          accuracy={subProg?.overallAccuracy}
        />

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-6 overflow-y-auto custom-scrollbar">

          {/* 3. HERO DASHBOARD SECTION */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 relative bg-white rounded-[1.5rem] border border-slate-200/60 p-6 md:p-8 shadow-sm overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <IconComponent size={140} />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 border border-primary-100">
                  <Target size={12} />
                  <span>Current Mission</span>
                </div>
                <h2 className="text-4xl font-bold text-slate-900 tracking-tighter leading-tight mb-4 max-w-md">
                  Choose Your Next <span className="text-primary-600">Learning Milestone.</span>
                </h2>
                <p className="text-slate-500 font-instrument text-lg mb-6 max-w-md leading-relaxed">
                  Systematic preparation for <span className="text-slate-900 font-bold">{examContext}</span>. Track every topic and paper in real-time.
                </p>

                {lastActivity && (
                  <motion.button
                    whileHover={{ x: 5 }}
                    className="flex items-center gap-3 p-2 pr-4 bg-slate-900 text-white rounded-xl shadow-xl group transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <Play size={16} fill="white" />
                    </div>
                    <div className="text-left">
                      <div className="text-[9px] font-bold text-primary-400 uppercase tracking-widest leading-none mb-1">Resume Session</div>
                      <div className="text-sm font-bold leading-none">{lastActivity.name}</div>
                    </div>
                    <ArrowRight size={16} className="ml-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                )}
              </div>
            </div>

            {/* AI DIAGNOSTIC PANEL */}
            <div className="bg-slate-900 rounded-[1.5rem] p-6 text-white relative overflow-hidden flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary-400 border border-white/10">
                    <Zap size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary-400 uppercase tracking-widest leading-none mb-1">AI Diagnostic</div>
                    <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Subject Level Advice</div>
                  </div>
                </div>

                <div className="space-y-4 mb-6 flex-1">
                  <p className="text-sm text-slate-300 font-instrument font-medium leading-relaxed italic">
                    {(() => {
                      const mastery = subProg?.overallMastery || 0;
                      const accuracy = subProg?.overallAccuracy || 0;
                      const volume = stats.pastYearQuestionsCount + (stats.masteredTopics * 5); // Rough estimate of activity

                      if (mastery === 0) {
                        return (
                          <>
                            "The <span className="text-white font-bold">{subject} Mission Center</span> is initialized. Since you haven't started yet, I recommend beginning with <span className="text-white font-bold">Node Syllabus</span> to establish your baseline concepts."
                          </>
                        );
                      }

                      if (mastery < 30) {
                        return (
                          <>
                            "You are in the <span className="text-white font-bold">Foundation Building</span> phase. Focus on high-weightage topics in <span className="text-white font-bold">Node Syllabus</span> to quickly boost your Command metric before moving to papers."
                          </>
                        );
                      }

                      if (accuracy < 60 && mastery > 20) {
                        return (
                          <>
                            "Your coverage is growing, but your <span className="text-white font-bold">Accuracy</span> is under 60%. I recommend <span className="text-white font-bold">Mock Missions</span> focused on your recently practiced topics to stabilize your fundamentals."
                          </>
                        );
                      }

                      if (mastery > 70) {
                        return (
                          <>
                            "Your <span className="text-white font-bold">Concept Density</span> in high-yield topics is excellent. I recommend pivoting to <span className="text-white font-bold">Exam Vault</span> to improve your session stamina for the upcoming {examContext} cycle."
                          </>
                        );
                      }

                      return (
                        <>
                          "Your progress is steady. To accelerate towards mastery, try mixing <span className="text-white font-bold">Topicwise Quiz</span> with a few <span className="text-white font-bold">Past Year Questions</span> to see how theory applies in real exams."
                        </>
                      );
                    })()}
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject Health</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${(subProg?.overallMastery || 0) < 30 ? 'text-rose-400' :
                      (subProg?.overallMastery || 0) > 75 ? 'text-blue-400' : 'text-emerald-400'
                      }`}>
                      {(subProg?.overallMastery || 0) < 30 ? 'Requires Boost' :
                        (subProg?.overallMastery || 0) > 75 ? 'Optimal' : 'Stable'}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subProg?.overallMastery || 0}%` }}
                      className={`h-full ${(subProg?.overallMastery || 0) < 30 ? 'bg-rose-500' :
                        (subProg?.overallMastery || 0) > 75 ? 'bg-blue-500' : 'bg-emerald-500'
                        }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Option cards flex container for mobile horizontal scroll, grid for desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-6">
            {optionCards.map((card, index) => {
              const CardIcon = card.icon;
              return (
                <button
                  key={card.id}
                  onClick={() => onSelectOption(card.id)}
                  className="group relative bg-white rounded-[1.5rem] border border-slate-200/60 p-6 text-left transition-all duration-300 hover:border-primary-200 hover:shadow-xl hover:-translate-y-1 overflow-hidden animate-fadeInUp flex flex-col"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Illustration Background */}
                  {renderIllustration(card.illustration)}

                  {/* Badge */}
                  {card.badge && (
                    <div className="absolute top-4 right-4 z-10">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-emerald-100">
                        {card.badge}
                      </span>
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <CardIcon size={24} className="text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="relative z-10 font-bold text-xl text-slate-900 tracking-tight mb-2 leading-none">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="relative z-10 text-sm text-slate-700 font-instrument font-medium mb-4 leading-relaxed">
                    {card.description}
                  </p>

                  {/* Stats */}
                  <div className="relative z-10 flex items-center justify-between mt-auto">
                    <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-100 shadow-sm">
                      <div className="text-[10px] font-bold text-slate-900 uppercase tracking-widest leading-none">
                        {isLoading ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-slate-400 animate-pulse" />
                            <span className="text-[9px] text-slate-400">Syncing...</span>
                          </div>
                        ) : (
                          card.stats
                        )}
                      </div>
                    </div>
                    <ArrowRight
                      size={18}
                      className="text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-300"
                    />
                  </div>

                  {/* Hover gradient overlay with shimmer effect */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none z-0`} />

                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                    <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick stats summary */}
          {!isLoading && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {[
                { label: 'Topics', value: stats.totalTopics, color: 'text-slate-900' },
                { label: 'Papers', value: stats.totalPapers, color: 'text-primary-600' },
                { label: 'Years', value: stats.availableYears.length, color: 'text-slate-900' },
                { label: 'Questions', value: stats.pastYearQuestionsCount, color: 'text-slate-900' }
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-4 text-center hover:border-primary-200 hover:shadow-sm transition-all">
                  <div className={`text-2xl font-bold ${stat.color} font-outfit mb-1`}>
                    {stat.value}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SubjectMenuPage;
