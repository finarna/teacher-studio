import React, { useState, useEffect } from 'react';
import {
  Calendar,
  BookOpen,
  FlaskConical,
  ArrowRight,
  TrendingUp,
  Target,
  Zap,
  Calculator,
  Atom,
  Leaf
} from 'lucide-react';
import type { Subject, ExamContext } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { supabase } from '../lib/supabase';
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
  const [isLoading, setIsLoading] = useState(true);

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
      // Fetch topic count
      const { data: topicsData } = await supabase
        .from('topics')
        .select('id, name')
        .eq('subject', subject);

      const totalTopics = topicsData?.length || 0;

      // Fetch past year questions from scans (only those with year field)
      // Get all scans for this subject and exam context
      const { data: scansData, error: scansError } = await supabase
        .from('scans')
        .select('id, year, analysis_data')
        .eq('subject', subject)
        .eq('exam_context', examContext)
        .not('year', 'is', null);

      console.log(`📅 [SUBJECT MENU] Found ${scansData?.length || 0} scans with year field`);
      if (scansError) {
        console.error('❌ [SUBJECT MENU] Scans query error:', scansError.message);
      }

      let pastYearQuestionsCount = 0;
      let availableYears: string[] = [];
      const totalPapers = scansData?.length || 0;

      if (scansData && scansData.length > 0) {
        // Count questions from analysis_data and extract years
        scansData.forEach((scan: any) => {
          const questions = scan.analysis_data?.questions || [];
          pastYearQuestionsCount += questions.length;
          if (scan.year) {
            availableYears.push(scan.year);
          }
        });

        // Remove duplicates and sort years descending
        availableYears = [...new Set(availableYears)].sort((a, b) => parseInt(b) - parseInt(a));
      }

      setStats({
        totalTopics,
        masteredTopics: 0, // TODO: Calculate from user progress
        pastYearQuestionsCount,
        availableYears,
        totalPapers,
        customTestsTaken: 0, // TODO: Query test_attempts with type='custom_mock'
        avgMockScore: 0 // TODO: Calculate average score
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
      title: 'Past Year Exams',
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
      title: 'Topicwise Preparation',
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
      title: 'Custom Mock Tests',
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

            {/* Subject Color Tint Overlay - More Prominent */}
            <div className={`absolute inset-0 ${subjectTheme.bgClass} opacity-20 group-hover:opacity-25 transition-opacity mix-blend-multiply`} />

            {/* Light Overlay for Better Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
          </div>
        );

      case 'study-desk':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none group-hover:scale-105 transition-transform duration-500">
            {/* Desk surface with subject color */}
            <div className={`absolute inset-0 ${subjectTheme.bgClass} opacity-20 group-hover:opacity-30 transition-opacity`} />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 opacity-20" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_48%,rgba(147,51,234,0.05)_50%,transparent_52%)] bg-[length:30px_30px]" />

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

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(51,65,85)_1px,transparent_0)] bg-[length:24px_24px]" />
        </div>

        {/* Unified Header */}
        <LearningJourneyHeader
          showBack
          onBack={onBack}
          icon={<IconComponent size={24} className="text-white" />}
          title={`${subject} Learning Options`}
          subtitle={`${examContext} Preparation`}
          description="Choose how you want to study and track your progress"
          subject={subject}
          trajectory={examContext}
          actions={
            <span className="text-3xl">{subjectConfig.emoji}</span>
          }
        />

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome message with enhanced styling */}
        <div className="mb-8 text-center relative">
          <div className="inline-block mb-3">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-amber-400 rounded-lg blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
            <h2 className="relative font-black text-3xl text-slate-900 font-outfit">
              Choose Your Learning Path
            </h2>
          </div>
          <p className="text-slate-700 font-instrument text-lg font-medium">
            Select how you want to study <span className="font-black text-slate-900">{subject}</span> for <span className="font-black text-slate-900">{examContext}</span>
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-600 font-semibold">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Real-time progress tracking</span>
            </div>
            <span className="text-slate-400">•</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
              <span>AI-powered insights</span>
            </div>
          </div>
        </div>

        {/* Option cards grid with staggered entrance */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {optionCards.map((card, index) => {
            const CardIcon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => onSelectOption(card.id)}
                className="group relative bg-white rounded-2xl border-2 border-slate-200 p-6 text-left transition-all duration-300 hover:border-slate-300 hover:shadow-2xl hover:-translate-y-2 overflow-hidden active:scale-98 focus:outline-none focus:ring-4 focus:ring-slate-200/50 animate-fadeInUp"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Illustration Background */}
                {renderIllustration(card.illustration)}

                {/* Badge */}
                {card.badge && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-black rounded-full shadow-sm border border-green-200">
                      {card.badge}
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`relative z-10 w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <CardIcon size={28} className="text-white" />
                </div>

                {/* Title */}
                <h3 className="relative z-10 font-black text-xl text-slate-900 font-outfit mb-3 leading-tight">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="relative z-10 text-sm text-slate-700 font-instrument font-medium mb-4 leading-relaxed">
                  {card.description}
                </p>

                {/* Stats */}
                <div className="relative z-10 flex items-center justify-between mt-auto">
                  <div className="px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200">
                    <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      ) : (
                        card.stats
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    size={22}
                    className="text-slate-500 group-hover:text-slate-900 group-hover:translate-x-1 transition-all duration-300"
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
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border-2 border-slate-200 p-4 text-center hover:border-slate-300 transition-colors">
              <div className="text-3xl font-black text-slate-900 font-outfit mb-1">
                {stats.totalTopics}
              </div>
              <div className="text-xs text-slate-600 uppercase tracking-wider font-black">
                Topics
              </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-4 text-center hover:border-slate-300 transition-colors">
              <div className="text-3xl font-black text-blue-600 font-outfit mb-1">
                {stats.totalPapers}
              </div>
              <div className="text-xs text-slate-600 uppercase tracking-wider font-black">
                Papers
              </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-4 text-center hover:border-slate-300 transition-colors">
              <div className="text-3xl font-black text-slate-900 font-outfit mb-1">
                {stats.availableYears.length}
              </div>
              <div className="text-xs text-slate-600 uppercase tracking-wider font-black">
                Years
              </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-4 text-center hover:border-slate-300 transition-colors">
              <div className="text-3xl font-black text-slate-900 font-outfit mb-1">
                {stats.pastYearQuestionsCount}
              </div>
              <div className="text-xs text-slate-600 uppercase tracking-wider font-black">
                Questions
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default SubjectMenuPage;
