import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Zap,
  Brain,
  CreditCard,
  TrendingUp,
  Target,
  Clock,
  CheckCircle2,
  Play,
  FileQuestion,
  Sparkles,
  BarChart3,
  Calendar,
  BookmarkPlus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Lightbulb,
  RefreshCw,
  Loader2,
  Award,
  Trophy,
  History,
  X,
  Info,
  PlayCircle,
  Activity,
  Signal,
  Settings,
  Monitor
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanJsonResponse } from '../lib/aiParserUtils';
import { safeAiParse } from '../utils/aiParser';
import type { TopicResource, Subject, ExamContext, AnalyzedQuestion } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from './AuthProvider';
import { RenderWithMath } from './MathRenderer';
import PracticeSolutionModal from './PracticeSolutionModal';
import PracticeInsightsModal from './PracticeInsightsModal';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { synthesizeQuestionIntelligence } from '../lib/intelligenceSynthesis';
import { motion, AnimatePresence } from 'framer-motion';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';
import { supabase } from '../lib/supabase';
import { cache } from '../utils/cache';
import { useLearningJourney } from '../contexts/LearningJourneyContext';

import ComplexityMatrix from './ComplexityMatrix';
import { AI_CONFIG } from '../config/aiConfigs';
import { EXAM_CONFIGS } from '../config/exams';

interface TopicDetailPageProps {
  topicResource: TopicResource;
  subject: Subject;
  examContext: ExamContext;
  onBack: () => void;
  onStartQuiz: (topicId: string, totalQuestions?: number) => void;
  onRefreshData?: (silent?: boolean) => void;
}

type TabType = 'learn' | 'practice' | 'quiz' | 'flashcards' | 'progress';

/**
 * CORE DATA MAPPING: Normalizes question data from various sources (DB columns, JSONB meta, old schemas)
 */
const formatAnalyzedQuestion = (q: any): AnalyzedQuestion => {
  const meta = q.mastery_material || q.masteryMaterial || {};

  const formatted: AnalyzedQuestion = {
    ...q,
    id: q.id || q.question_id || q.questionId,
    text: q.text || q.question_text || '',
    options: q.options || [],
    difficulty: (q.difficulty || q.diff || 'Moderate') as 'Easy' | 'Moderate' | 'Hard',
    correctOptionIndex: q.correctOptionIndex ?? q.correct_option_index ?? (q.correctIndex !== undefined ? q.correctIndex : 0),

    // Intelligence Retrieval (Column-first, Meta fallback)
    aiReasoning: q.ai_reasoning || q.aiReasoning || meta.aiReasoning || meta.ai_reasoning || '',
    historicalPattern: q.historical_pattern || q.historicalPattern || meta.historicalPattern || meta.historical_pattern || '',
    predictiveInsight: q.predictive_insight || q.predictiveInsight || meta.predictiveInsight || meta.predictive_insight || '',
    whyItMatters: q.why_it_matters || q.whyItMatters || meta.whyItMatters || meta.why_it_matters || '',
    studyTip: q.study_tip || q.studyTip || q.exam_tip || q.examTip || meta.studyTip || meta.examTip || '',

    // Structural Data
    marks: q.marks ?? meta.marks ?? 1,
    year: q.year ? String(q.year) : (q.exam_year || meta.year || ''),
    solutionSteps: (q.solution_steps || q.solutionSteps || meta.solutionSteps || meta.solution_steps || (q.explanation ? [q.explanation] : [])),
    markingScheme: (q.marking_scheme || q.marking_steps || q.markingScheme || meta.markingSteps || meta.marking_steps || []),
    keyConcepts: (q.key_concepts || q.keyConcepts || meta.keyConcepts || []),
    commonMistakes: (q.pitfalls || q.common_mistakes || q.commonMistakes || meta.commonMistakes || []),
    keyFormulas: (q.key_formulas || q.keyFormulas || meta.keyFormulas || []),

    // Visuals
    visualConcept: q.visual_concept || q.visualConcept || meta.visualConcept || '',
    diagramUrl: q.diagram_url || q.diagramUrl || meta.diagramUrl || '',
    extractedImages: q.extractedImages || q.extracted_images || (q.diagram_url ? [q.diagram_url] : (meta.diagramUrl ? [meta.diagramUrl] : []))
  };

  return formatted;
};

const TopicDetailPage: React.FC<TopicDetailPageProps> = ({
  topicResource,
  subject,
  examContext,
  onBack,
  onStartQuiz,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('learn');
  const [totalQuestionsIncludingAI, setTotalQuestionsIncludingAI] = useState(topicResource.totalQuestions);
  const subjectConfig = SUBJECT_CONFIGS[subject];
  const { user } = useAuth();
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);
  const { refreshData, subjectProgress } = useLearningJourney();
  const subProg = subjectProgress?.[subject];
  const [isRefreshing, setIsRefreshing] = useState(false); // Added state for refreshing

  const handleRefresh = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      await refreshData(silent);
    } catch (error) {
      // Handle error if necessary
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  const refreshStats = (silent: boolean = true) => {
    // Only increment local trigger to fetch stats without triggering a full parent re-render
    // through onRefreshData if it's a silent update (like an answer save)
    setStatsRefreshTrigger(prev => prev + 1);

    // If not silent, we do a full refresh
    if (!silent) {
      onRefreshData?.(false);
      handleRefresh(false);
    }
  };

  const [localStats, setLocalStats] = useState({
    masteryLevel: topicResource.masteryLevel || 0,
    averageAccuracy: topicResource.averageAccuracy || 0,
    quizzesTaken: topicResource.quizzesTaken || 0,
    studyStage: topicResource.studyStage || 'not_started',
    notesCompleted: topicResource.notesCompleted || false
  });

  // Sync questions count when prop updates (e.g. after refreshData)
  useEffect(() => {
    setTotalQuestionsIncludingAI(topicResource.totalQuestions);
  }, [topicResource.totalQuestions]);

  const [sharedQuestions, setSharedQuestions] = useState<AnalyzedQuestion[]>((topicResource.questions || []).map(formatAnalyzedQuestion));
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Past quizzes state (moved up from QuizTab for visibility in Progress tab)
  const [pastQuizzes, setPastQuizzes] = useState<any[]>([]);
  const [loadingPastQuizzes, setLoadingPastQuizzes] = useState(false);
  const [reviewQuiz, setReviewQuiz] = useState<any | null>(null);

  // Helper function to fetch test_responses for a test_attempt
  const fetchTestResponses = async (attemptId: string) => {
    try {
      const { data: responses, error } = await supabase
        .from('test_responses')
        .select(`
          *,
          questions (
            id,
            text,
            options,
            correct_option_index,
            difficulty,
            solution_steps,
            exam_tip,
            study_tip
          )
        `)
        .eq('attempt_id', attemptId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch test_responses:', error);
        return null;
      }

      // Transform to match quiz_attempts format
      return responses?.map((r: any) => {
        const q = r.questions;
        return {
          question: q?.text || '',
          options: q?.options || [],
          correctIndex: q?.correct_option_index ?? 0,
          userAnswer: r.selected_option,
          isCorrect: r.is_correct,
          difficulty: q?.difficulty || 'Moderate',
          solutionSteps: q?.solution_steps || [],
          examTip: q?.study_tip || q?.exam_tip || ''
        };
      });
    } catch (err) {
      console.error('Error fetching test responses:', err);
      return null;
    }
  };

  const loadPastQuizzes = useCallback(async () => {
    if (!user) return;
    setLoadingPastQuizzes(true);
    try {
      // Fetch from BOTH quiz_attempts AND test_attempts, then merge
      const [quizAttemptsResult, testAttemptsResult] = await Promise.all([
        // 1. Query quiz_attempts table (desktop inline quizzes)
        supabase
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('topic_name', topicResource.topicName)
          .eq('exam_context', examContext)
          .order('created_at', { ascending: false })
          .limit(10),

        // 2. Query test_attempts table (API-based quizzes from mobile/TestInterface)
        supabase
          .from('test_attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('test_type', 'topic_quiz')
          .eq('topic_id', topicResource.topicId)
          .eq('exam_context', examContext)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const allQuizzes: any[] = [];

      // Process quiz_attempts
      if (quizAttemptsResult.data) {
        const mapped = quizAttemptsResult.data.map(q => ({
          ...q,
          id: q.id,
          createdAt: q.created_at,
          accuracyPercentage: q.accuracy_percentage,
          correctCount: q.correct_count,
          wrongCount: q.wrong_count,
          questionCount: q.question_count,
          timeSpentSeconds: q.time_spent_seconds,
          percentage: q.accuracy_percentage,
          score: q.correct_count,
          totalQuestions: q.question_count,
          durationMinutes: Math.floor(q.time_spent_seconds / 60),
          status: 'completed',
          questionsData: typeof q.questions_data === 'string' ? JSON.parse(q.questions_data) : q.questions_data,
          source: 'quiz_attempts'
        }));
        allQuizzes.push(...mapped);
      }

      // Process test_attempts - FETCH QUESTIONS TOO
      if (testAttemptsResult.data && testAttemptsResult.data.length > 0) {
        // Fetch test_responses for each test_attempt to get questions
        const testAttemptsWithQuestions = await Promise.all(
          testAttemptsResult.data.map(async (q) => {
            const questionsData = await fetchTestResponses(q.id);
            return {
              ...q,
              id: q.id,
              createdAt: q.created_at,
              percentage: q.percentage || 0,
              accuracyPercentage: q.percentage || 0,
              score: q.raw_score || 0,
              correctCount: q.raw_score || 0,
              totalQuestions: q.total_questions || 0,
              questionCount: q.total_questions || 0,
              durationMinutes: q.duration_minutes || 0,
              timeSpentSeconds: (q.duration_minutes || 0) * 60,
              status: q.status,
              source: 'test_attempts',
              questionsData: questionsData,
              questions_data: questionsData
            };
          })
        );
        allQuizzes.push(...testAttemptsWithQuestions);
      }

      // Sort all quizzes by creation date (most recent first)
      allQuizzes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log(`📊 [TopicDetailPage] History loaded: ${allQuizzes.length} attempts (${quizAttemptsResult.data?.length || 0} from quiz_attempts, ${testAttemptsResult.data?.length || 0} from test_attempts)`);

      setPastQuizzes(allQuizzes.slice(0, 10)); // Limit to 10 total
    } catch (err) {
      console.error('❌ [TopicDetailPage] Failed to load history:', err);
      setPastQuizzes([]);
    } finally {
      setLoadingPastQuizzes(false);
    }
  }, [user?.id, topicResource.topicName, topicResource.topicId, examContext]);

  // Load history on mount or topic change
  useEffect(() => {
    if (user) {
      loadPastQuizzes();
    }
  }, [user?.id, topicResource.topicId, loadPastQuizzes]);

  // Unified question loading in parent to ensure availability across all tabs
  useEffect(() => {
    const loadQuestionsFromDB = async () => {
      if (!user?.id || !topicResource.topicName) return;
      setIsLoadingQuestions(true);
      try {
        console.log(`🔍 [TopicDetailPage] Syncing questions for: ${topicResource.topicName}`);

        // Robust fetch: Get questions via TWO paths simultaneously
        // 1. Explicit ID mapping (new standard)
        // 2. Name-based match (legacy/AI generated fallback)
        const [mappingRes, nameRes] = await Promise.all([
          supabase
            .from('topic_question_mapping')
            .select('questions!inner (*)')
            .eq('topic_id', topicResource.topicId),
          supabase
            .from('questions')
            .select('*')
            .eq('subject', subject)
            .eq('exam_context', examContext)
            .eq('topic', topicResource.topicName)
        ]);

        const allQuestionsMap = new Map<string, any>();

        // Add from mappings
        if (mappingRes.data) {
          mappingRes.data.forEach((m: any) => {
            if (m.questions) allQuestionsMap.set(m.questions.id, m.questions);
          });
        }

        // Add from name-based search (fill gaps)
        if (nameRes.data) {
          nameRes.data.forEach((q: any) => {
            allQuestionsMap.set(q.id, q);
          });
        }

        const finalQuestionsArray = Array.from(allQuestionsMap.values());

        if (finalQuestionsArray.length > 0) {
          console.log(`✅ [TopicDetailPage] Synced ${finalQuestionsArray.length} total questions (Merged Mapped + Named)`);
          const formattedQuestions: AnalyzedQuestion[] = finalQuestionsArray.map(formatAnalyzedQuestion);
          setSharedQuestions(formattedQuestions);
          setTotalQuestionsIncludingAI(formattedQuestions.length);
        }
      } catch (err) {
        console.error('❌ [TopicDetailPage] Failed to sync questions:', err);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestionsFromDB();
  }, [user?.id, topicResource.topicName, subject, examContext]);

  // Sync stats when activeTab or refresh trigger changes
  useEffect(() => {
    const fetchLatestStats = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('topic_resources')
          .select('mastery_level, average_accuracy, quizzes_taken, study_stage, notes_completed')
          .eq('user_id', user.id)
          .eq('topic_id', topicResource.topicId)
          .eq('exam_context', examContext)
          .maybeSingle();

        if (data && !error) {
          setLocalStats({
            masteryLevel: data.mastery_level || 0,
            averageAccuracy: data.average_accuracy || 0,
            quizzesTaken: data.quizzes_taken || 0,
            studyStage: data.study_stage || 'not_started',
            notesCompleted: data.notes_completed || false
          });
        }
      } catch (err) {
        console.error('Stats fetch error:', err);
      }
    };
    fetchLatestStats();
  }, [user, activeTab, topicResource.topicId, examContext, statsRefreshTrigger]);

  const tabs = [
    { id: 'learn' as TabType, label: 'Learn', icon: BookOpen, accent: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'practice' as TabType, label: 'Solve', icon: Zap, accent: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'quiz' as TabType, label: 'Mastery', icon: Target, accent: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'flashcards' as TabType, label: 'Recall', icon: Brain, accent: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'progress' as TabType, label: 'History', icon: BarChart3, accent: 'text-indigo-500', bg: 'bg-indigo-50' }
  ];

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipe = swipePower(offset.x, velocity.x);
    const currentIndex = tabs.findIndex(t => t.id === activeTab);

    if (swipe < -swipeConfidenceThreshold || offset.x < -100) {
      if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1].id);
    } else if (swipe > swipeConfidenceThreshold || offset.x > 100) {
      if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/50">
      <LearningJourneyHeader
        showBack
        onBack={onBack}
        icon={subjectConfig.iconEmoji}
        title={topicResource.topicName}
        subtitle={`${subject} • Domain Intelligence`}
        subject={subject}
        additionalContext={localStats.studyStage.replace('_', ' ')}
        mastery={subProg?.overallMastery}
        accuracy={subProg?.overallAccuracy ?? 0}
        actions={null}
      >
        {/* UNIFIED SINGLE BAR: Tabs + Metrics */}
        <div className="flex flex-col items-start w-full bg-white backdrop-blur-md rounded-[1.5rem] p-3 md:p-4 border border-slate-200/60 shadow-sm gap-3 md:gap-4 mt-2 md:mt-4">

          {/* Top: Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-[1.25rem] border border-slate-200/50 w-full overflow-x-auto scroller-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 md:flex-none flex items-center justify-center shrink-0 snap-center px-2 md:px-4 py-2 rounded-lg transition-all duration-300 ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-900 group'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 bg-slate-900 rounded-lg shadow-sm"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-2.5">
                    <Icon size={18} className={isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
                    <span className="text-xs font-bold uppercase tracking-wider hidden md:inline font-outfit">{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom: Compact Metrics */}
          <div className="flex items-center justify-between w-full overflow-x-auto scroller-hide gap-4 md:gap-8 px-1 md:px-2">
            {[
              {
                label: 'Mastery',
                val: `${localStats.masteryLevel}%`,
                icon: Trophy,
                color: 'text-emerald-600',
                tooltip: `Mastery requires covering at least 50% of the topic's question pool (minimum 15 questions) for accuracy to have full weight. New AI generations will correctly dilute this score until practiced.`
              },
              { label: 'Accuracy', val: `${localStats.averageAccuracy.toFixed(0)}%`, icon: Target, color: 'text-primary-600' },
              { label: 'Questions', val: totalQuestionsIncludingAI, icon: FileQuestion, color: 'text-purple-600' },
              { label: 'Quizzes', val: localStats.quizzesTaken, icon: Brain, color: 'text-amber-600' }
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 md:gap-3 shrink-0">
                <div className="flex flex-col">
                  <span className="text-lg md:text-xl font-black text-slate-900 font-outfit leading-none mb-0.5 md:mb-1">{s.val}</span>
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <s.icon size={12} className={s.color} />
                    <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] md:tracking-widest">{s.label}</span>
                    {i < 3 && <div className="h-4 w-px bg-slate-100 ml-2 md:hidden" />}
                  </div>
                </div>
                {i < 3 && <div className="h-8 w-px bg-slate-200 ml-4 md:ml-6 hidden md:block" />}
              </div>
            ))}
          </div>
        </div>
      </LearningJourneyHeader >

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "tween", ease: "anticipate" as const, duration: 0.3 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="touch-pan-y"
          >
            {activeTab === 'learn' && (
              <LearnTab
                topicResource={{ ...topicResource, ...localStats }}
                subject={subject}
                examContext={examContext}
                onProgressUpdate={refreshStats}
                poolCount={totalQuestionsIncludingAI}
              />
            )}
            {activeTab === 'practice' && (
              <PracticeTab
                topicResource={{ ...topicResource, ...localStats }}
                subject={subject}
                examContext={examContext}
                onQuestionCountChange={setTotalQuestionsIncludingAI}
                sharedQuestions={sharedQuestions}
                setSharedQuestions={setSharedQuestions}
                focusedQuestionId={focusedQuestionId}
                setFocusedQuestionId={setFocusedQuestionId}
                isNavigatorOpen={isNavigatorOpen}
                setIsNavigatorOpen={setIsNavigatorOpen}
                onProgressUpdate={refreshStats}
              />
            )}
            {activeTab === 'quiz' && (
              <QuizTab
                topicResource={{ ...topicResource, ...localStats }}
                subject={subject}
                examContext={examContext}
                sharedQuestions={sharedQuestions}
                setSharedQuestions={setSharedQuestions}
                onProgressUpdate={refreshStats}
                poolCount={totalQuestionsIncludingAI}
                onStartQuiz={onStartQuiz}
                pastQuizzes={pastQuizzes}
                loadingPastQuizzes={loadingPastQuizzes}
                refreshHistory={loadPastQuizzes}
              />
            )}
            {activeTab === 'flashcards' && (
              <FlashcardsTab
                topicResource={{ ...topicResource, ...localStats }}
                sharedQuestions={sharedQuestions}
              />
            )}
            {activeTab === 'progress' && (
              <ProgressTab
                topicResource={{ ...topicResource, ...localStats }}
                pastQuizzes={pastQuizzes}
                isLoading={loadingPastQuizzes}
                setReviewQuiz={setReviewQuiz}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div >
  );
};

// ========== TAB 1: LEARN ==========
const LearnTab: React.FC<{
  topicResource: TopicResource;
  subject: Subject;
  examContext: ExamContext;
  onProgressUpdate?: (silent?: boolean) => void;
  poolCount: number;
}> = ({ topicResource, subject, examContext, onProgressUpdate, poolCount }) => {
  const { user } = useAuth();
  const [visualSketches, setVisualSketches] = useState<Array<{ questionId: string; sketchSvg: string; questionText: string; }>>([]);
  const [loadingSketches, setLoadingSketches] = useState(true);

  // Sketch viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentSketchIndex, setCurrentSketchIndex] = useState(0);
  const [completedSketches, setCompletedSketches] = useState<Set<string>>(new Set());
  const [sketchStartTime, setSketchStartTime] = useState<number | null>(null);
  const [totalDurations, setTotalDurations] = useState<Map<string, number>>(new Map());


  // Load visual sketch notes for this topic from user's scans
  useEffect(() => {
    const loadVisualSketches = async () => {
      if (!user) {
        setLoadingSketches(false);
        return;
      }

      try {
        console.log('🔍 [LearnTab] Loading visuals for:', { topic: topicResource.topicName, subject, examContext, userId: user.id });

        // 1. Get IDs of all relevant scans (user scans + published system scans)
        const { data: scanRecords, error: scansError } = await supabase
          .from('scans')
          .select('id, analysis_data')
          .or(`user_id.eq.${user.id},is_system_scan.eq.true`)
          .eq('subject', subject)
          .eq('exam_context', examContext);

        if (scansError) throw scansError;

        const scanIds = scanRecords?.map(s => s.id) || [];
        console.log(`📊 [LearnTab] Found ${scanIds.length} relevant scans:`, scanIds);

        if (scanIds.length === 0) {
          console.log('⚠️ [LearnTab] No relevant scans found for this topic/subject/context');
          setLoadingSketches(false);
          return;
        }

        const sketches: Array<{ questionId: string; sketchSvg: string; questionText: string }> = [];

        // 2. Fetch MODERN Topic Sketches (Flip-books from topic_sketches table)
        if (scanIds.length > 0) {
          console.log(`🧬 [LearnTab] Fetching ALL topic_sketches for ${scanIds.length} scans...`);
          const { data: allDbSketches, error: dbError } = await supabase
            .from('topic_sketches')
            .select('*')
            .in('scan_id', scanIds);

          if (dbError) console.error('❌ [LearnTab] DB Topic Sketches Error:', dbError);

          if (allDbSketches) {
            const topicNameLower = topicResource.topicName.toLowerCase();
            const matchingSketches = allDbSketches.filter(s => {
              const sTopicLower = (s.topic || '').toLowerCase();
              return sTopicLower.includes(topicNameLower) || topicNameLower.includes(sTopicLower);
            });

            console.log(`✅ [LearnTab] Found ${matchingSketches.length} matching sketches out of ${allDbSketches.length} total`);

            matchingSketches.forEach(s => {
              const pages = (s.pages || []) as any[];
              pages.forEach((page, idx) => {
                const imageData = page.imageData || page.imageUrl;
                if (imageData) {
                  sketches.push({
                    questionId: `${s.scan_id}-topic-db-${s.topic}-p${idx}`,
                    sketchSvg: imageData,
                    questionText: page.title || `${s.topic} - Page ${idx + 1}`
                  });
                }
              });
            });
          }

          // 3. Fetch Question-Level Sketches (from questions table)
          console.log(`🔍 [LearnTab] Fetching Question sketches for ${scanIds.length} scans...`);
          const { data: allQuestionSketches } = await supabase
            .from('questions')
            .select('id, topic, text, sketch_svg_url, diagram_url')
            .in('scan_id', scanIds)
            .or('sketch_svg_url.not.is.null,diagram_url.not.is.null');

          if (allQuestionSketches) {
            const topicNameLower = topicResource.topicName.toLowerCase();
            const matchingQs = allQuestionSketches.filter(q => {
              const qTopicLower = (q.topic || '').toLowerCase();
              return qTopicLower.includes(topicNameLower) || topicNameLower.includes(qTopicLower);
            });

            console.log(`✅ [LearnTab] Found ${matchingQs.length} matching question sketches out of ${allQuestionSketches.length} total`);

            matchingQs.forEach(q => {
              const sketchData = q.sketch_svg_url || q.diagram_url;
              if (sketchData) {
                sketches.push({
                  questionId: q.id,
                  sketchSvg: sketchData,
                  questionText: q.text?.substring(0, 100) || 'Question Concept'
                });
              }
            });
          }
        }

        // 4. LEGACY: Check scans.analysis_data (Fallback for old data)
        for (const scan of (scanRecords || [])) {
          if (scan.analysis_data?.topicBasedSketches) {
            const topicBasedSketches = scan.analysis_data.topicBasedSketches;
            for (const [topicKey, topicSketch] of Object.entries(topicBasedSketches)) {
              const matches = topicKey.toLowerCase().includes(topicResource.topicName.toLowerCase()) ||
                topicResource.topicName.toLowerCase().includes(topicKey.toLowerCase());

              if (matches && topicSketch && typeof topicSketch === 'object' && 'pages' in topicSketch) {
                const pages = (topicSketch as any).pages || [];
                pages.forEach((page: any, idx: number) => {
                  const imageData = page.imageData || page.imageUrl;
                  // Avoid duplicates
                  const qId = `${scan.id}-topic-${topicKey}-page-${idx}`;
                  if (imageData && !sketches.some(s => s.questionId === qId)) {
                    sketches.push({
                      questionId: qId,
                      sketchSvg: imageData,
                      questionText: page.title || `${topicKey} - Page ${idx + 1}`
                    });
                  }
                });
              }
            }
          }
        }

        setVisualSketches(sketches);
      } catch (err) {
        console.error('❌ Error loading visual sketches:', err);
      } finally {
        setLoadingSketches(false);
      }
    };

    loadVisualSketches();
  }, [user, subject, examContext, topicResource.topicName]);

  // Track time spent on current sketch
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (viewerOpen && sketchStartTime && visualSketches[currentSketchIndex]) {
      interval = setInterval(() => {
        const currentSketch = visualSketches[currentSketchIndex];
        setTotalDurations(prev => {
          const newMap = new Map(prev);
          const existingDuration = newMap.get(currentSketch.questionId) || 0;
          newMap.set(currentSketch.questionId, existingDuration + 1);
          return newMap;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [viewerOpen, sketchStartTime, currentSketchIndex, visualSketches]);

  // Load saved progress from database with LocalStorage fallback
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (!user || visualSketches.length === 0) return;

      let dbData: any[] = [];
      try {
        const sketchIds = visualSketches.map(s => s.questionId);
        const { data, error } = await supabase
          .from('sketch_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('topic_name', topicResource.topicName)
          .eq('subject', subject)
          .eq('exam_context', examContext)
          .in('sketch_id', sketchIds);

        if (!error && data) {
          dbData = data;
        }
      } catch (err) {
        console.warn('⚠️ [LearnTab] Could not load from Supabase, using LocalStorage fallback');
      }

      // Merge with LocalStorage data
      const localKey = `sketch_prog_${user.id}_${topicResource.topicId}`;
      const localRaw = localStorage.getItem(localKey);
      const localData = localRaw ? JSON.parse(localRaw) : {};

      const completed = new Set<string>();
      const durations = new Map<string, number>();

      // Apply DB data
      dbData.forEach(record => {
        if (record.completed) completed.add(record.sketch_id);
        durations.set(record.sketch_id, record.duration_seconds || 0);
      });

      // Layer Local Data (takes precedence for recent session stuff if DB failed)
      Object.entries(localData).forEach(([sketchId, data]: [string, any]) => {
        if (data.completed) completed.add(sketchId);
        if (data.duration > (durations.get(sketchId) || 0)) {
          durations.set(sketchId, data.duration);
        }
      });

      setCompletedSketches(completed);
      setTotalDurations(durations);
    };
    loadSavedProgress();
  }, [user, visualSketches, topicResource.topicName, subject, examContext]);

  const openViewer = (index: number) => {
    setCurrentSketchIndex(index);
    setViewerOpen(true);
    setSketchStartTime(Date.now());
  };

  const closeViewer = async () => {
    if (sketchStartTime && visualSketches[currentSketchIndex]) {
      await saveSketchProgress();
    }
    setViewerOpen(false);
    setSketchStartTime(null);
  };

  const goToNextSketch = async () => {
    if (currentSketchIndex < visualSketches.length - 1) {
      await saveSketchProgress();
      setCurrentSketchIndex(currentSketchIndex + 1);
      setSketchStartTime(Date.now());
    }
  };

  const goToPrevSketch = async () => {
    if (currentSketchIndex > 0) {
      await saveSketchProgress();
      setCurrentSketchIndex(currentSketchIndex - 1);
      setSketchStartTime(Date.now());
    }
  };

  const markAsCompleted = async () => {
    const currentSketch = visualSketches[currentSketchIndex];
    const newCompleted = new Set(completedSketches);
    newCompleted.add(currentSketch.questionId);
    setCompletedSketches(newCompleted);

    // Check if THIS was the last one
    const isAllDone = newCompleted.size === visualSketches.length && visualSketches.length > 0;
    await saveSketchProgress(true, isAllDone);
  };

  const saveSketchProgress = async (markCompleted = false, allNotesDone = false) => {
    if (!user || !visualSketches[currentSketchIndex]) return;
    const currentSketch = visualSketches[currentSketchIndex];
    const duration = totalDurations.get(currentSketch.questionId) || 0;
    const isCompleted = markCompleted || completedSketches.has(currentSketch.questionId);

    // If we're not explicitly told all are done, check our state
    const isActuallyAllDone = allNotesDone || (completedSketches.size === visualSketches.length && visualSketches.length > 0);

    // 1. Sync to LocalStorage (Fallback)
    try {
      const localKey = `sketch_prog_${user.id}_${topicResource.topicId}`;
      const localRaw = localStorage.getItem(localKey);
      const localData = localRaw ? JSON.parse(localRaw) : {};
      localData[currentSketch.questionId] = {
        completed: isCompleted,
        duration: duration,
        ts: Date.now()
      };
      localStorage.setItem(localKey, JSON.stringify(localData));
    } catch (e) { }

    // 2. Sync to Supabase (Sketch Progress)
    try {
      await supabase
        .from('sketch_progress')
        .upsert({
          user_id: user.id,
          sketch_id: currentSketch.questionId,
          topic_name: topicResource.topicName,
          subject: subject,
          exam_context: examContext,
          duration_seconds: duration,
          completed: isCompleted,
          last_viewed_at: new Date().toISOString()
        }, { onConflict: 'user_id,sketch_id' });
    } catch (err) { }

    // 3. Update Global Topic Status & Mastery with Absolute Truth
    try {
      const { data: current } = await supabase
        .from('topic_resources')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', topicResource.topicId)
        .eq('exam_context', examContext)
        .maybeSingle();

      const { data: allAnswers } = await supabase
        .from('practice_answers')
        .select('is_correct')
        .eq('topic_resource_id', topicResource.id);

      const currentStage = current?.study_stage || 'not_started';
      const quizzesTaken = current?.quizzes_taken || 0;
      const totalAttempted = allAnswers?.length || 0;
      const totalCorrect = allAnswers?.filter((a: any) => a.is_correct).length || 0;
      const accuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

      // Determine next stage
      let nextStage = currentStage;
      if (currentStage === 'not_started') nextStage = 'studying_notes';
      if (isActuallyAllDone && (currentStage === 'studying_notes' || currentStage === 'not_started')) {
        nextStage = 'practicing';
      }

      // Standard Mastery Formula Recalculation
      // NEW DYNAMIC COVERAGE: Saturation target is 50% of the currently known question pool (min 15).
      const saturationTarget = Math.min(poolCount, Math.max(15, Math.floor(poolCount * 0.5)));
      const coverageWeight = Math.min(1, totalAttempted / Math.max(1, saturationTarget));

      const newMastery = Math.min(100, Math.round(
        (accuracy * 0.60 * coverageWeight) +
        Math.min(20, quizzesTaken * 10) +
        Math.min(10, Math.floor(totalAttempted / 10) * 5) +
        (isActuallyAllDone ? 10 : 0)
      ));

      // Check for Mastered state
      if (newMastery >= 90 && quizzesTaken >= 2) {
        nextStage = 'mastered';
      }

      await supabase
        .from('topic_resources')
        .upsert({
          user_id: user.id,
          topic_id: topicResource.topicId,
          subject: subject,
          exam_context: examContext,
          study_stage: nextStage,
          notes_completed: isActuallyAllDone,
          mastery_level: newMastery,
          questions_attempted: totalAttempted,
          questions_correct: totalCorrect,
          average_accuracy: Math.round(accuracy),
          last_practiced: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,topic_id,exam_context' });

      onProgressUpdate?.(true);
    } catch (e) {
      console.error('❌ [LearnTab] Failed to sync study stage:', e);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 text-white rounded-[1.25rem] px-5 py-4 relative overflow-hidden shadow-lg border border-white/10"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-[40px] -mr-16 -mt-16" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
              <Sparkles size={20} className="text-primary-400" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-400/80 mb-0.5">Active Learning Layer</div>
              <h2 className="text-lg font-black font-outfit tracking-tight leading-tight">Prime Concepts & Strategic Insights</h2>
            </div>
          </div>
          <p className="hidden md:block text-slate-400 font-instrument text-xs max-w-[280px] leading-tight text-right italic">
            AI-synthesized visual schemas and strategic conceptual breakdowns for deep mastery.
          </p>
        </div>
      </motion.div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Visual DNA ({visualSketches.length})</h3>
          <div className="h-px flex-1 bg-slate-200 mx-4" />
        </div>

        {loadingSketches ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-video bg-slate-100 animate-pulse rounded-[1.5rem]" />
            ))}
          </div>
        ) : visualSketches.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen size={32} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No Visual Notes Yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto text-sm">Scan papers to generate AI visual schemas for this topic.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {visualSketches.map((sketch, idx) => (
              <motion.button
                key={sketch.questionId}
                whileHover={{ y: -4 }}
                onClick={() => openViewer(idx)}
                className="group relative bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden hover:shadow-xl transition-all text-left"
              >
                <div className="aspect-video bg-slate-50 p-4 flex items-center justify-center">
                  <div className="w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500">
                    {sketch.sketchSvg.startsWith('data:image') ? (
                      <img src={sketch.sketchSvg} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: sketch.sketchSvg }} className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain" />
                    )}
                  </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Visual Module {idx + 1}</span>
                    {completedSketches.has(sketch.questionId) && <CheckCircle size={12} className="text-emerald-500" />}
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate">{sketch.questionText}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewerOpen && visualSketches.length > 0 && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeViewer}
              className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl aspect-[16/10] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
                    <Eye size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 font-outfit">{visualSketches[currentSketchIndex].questionText}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sketch {currentSketchIndex + 1} of {visualSketches.length}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-200" />
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500">
                        <Clock size={12} />
                        {Math.floor((totalDurations.get(visualSketches[currentSketchIndex].questionId) || 0) / 60)}:
                        {String((totalDurations.get(visualSketches[currentSketchIndex].questionId) || 0) % 60).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={markAsCompleted}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${completedSketches.has(visualSketches[currentSketchIndex].questionId) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                  >
                    {completedSketches.has(visualSketches[currentSketchIndex].questionId) ? 'Mastered' : 'Mark as Mastered'}
                  </button>
                  <button onClick={closeViewer} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-50 relative flex items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                <motion.div
                  key={currentSketchIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full flex items-center justify-center relative z-10"
                >
                  {visualSketches[currentSketchIndex].sketchSvg.startsWith('data:image') ? (
                    <img src={visualSketches[currentSketchIndex].sketchSvg} alt="" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl bg-white" />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: visualSketches[currentSketchIndex].sketchSvg }} className="max-w-full max-h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain bg-white rounded-2xl shadow-2xl" />
                  )}
                </motion.div>

                <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                  <button onClick={goToPrevSketch} disabled={currentSketchIndex === 0} className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-slate-900 disabled:opacity-30 hover:scale-110 active:scale-95 transition-all">
                    <ChevronLeft size={24} />
                  </button>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <button onClick={goToNextSketch} disabled={currentSketchIndex === visualSketches.length - 1} className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-slate-900 disabled:opacity-30 hover:scale-110 active:scale-95 transition-all">
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center gap-1">
                {visualSketches.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i === currentSketchIndex ? 'bg-primary-500' : i < currentSketchIndex ? 'bg-slate-300' : 'bg-slate-100'}`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ========== TAB 2: PRACTICE ==========
const PracticeTab: React.FC<{
  topicResource: TopicResource;
  subject: Subject;
  examContext: ExamContext;
  onQuestionCountChange?: (count: number) => void;
  sharedQuestions: AnalyzedQuestion[];
  setSharedQuestions: React.Dispatch<React.SetStateAction<AnalyzedQuestion[]>>;
  focusedQuestionId: string | null;
  setFocusedQuestionId: (id: string | null) => void;
  isNavigatorOpen: boolean;
  setIsNavigatorOpen: (open: boolean) => void;
  onProgressUpdate?: (silent?: boolean) => void;
}> = ({
  topicResource,
  subject,
  examContext,
  onQuestionCountChange,
  sharedQuestions,
  setSharedQuestions,
  focusedQuestionId,
  setFocusedQuestionId,
  isNavigatorOpen,
  setIsNavigatorOpen,
  onProgressUpdate
}) => {
    // Use shared questions state that persists across tab switches
    // We keep a local state 'questions' for PracticeTab UI to allow immediate updates,
    // but we initialize it from sharedQuestions and sync back via setSharedQuestions.
    const questions = sharedQuestions;
    const setQuestions = setSharedQuestions;
    // Persistent practice session hook
    const {
      savedAnswers,
      validatedAnswers,
      bookmarkedIds,
      saveAnswer,
      toggleBookmark,
      startQuestionTimer,
      stopQuestionTimer,
      getSessionStats,
      clearProgress,
      reload: reloadPracticeSession,
      isLoading: sessionLoading
    } = usePracticeSession({
      topicResourceId: topicResource.id,
      topicId: topicResource.topicId,
      topicName: topicResource.topicName,
      subject,
      examContext,
      questions: questions,  // Use shared questions
      onProgressUpdate
    });

    // Local UI state (for immediate feedback before DB save)
    const [userAnswers, setUserAnswers] = useState<Map<string, number>>(new Map());
    const [trashedIds, setTrashedIds] = useState<Set<string>>(new Set());
    const [showStats, setShowStats] = useState(false);

    // Modal state
    const [solutionModalQuestion, setSolutionModalQuestion] = useState<AnalyzedQuestion | null>(null);
    const [insightsModalQuestion, setInsightsModalQuestion] = useState<AnalyzedQuestion | null>(null);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateCount, setGenerateCount] = useState(5);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

    // DEBUG PERSISTENCE
    useEffect(() => {
      if (questions.length > 0) {
        console.log(`🧪 [PracticeTab] Topic: ${topicResource.topicName}, Questions: ${questions.length}, SavedAnswers: ${savedAnswers.size}, Validated: ${validatedAnswers.size}`);
      }
    }, [questions.length, savedAnswers.size, validatedAnswers.size, topicResource.topicName]);

    // Get authenticated user from AuthProvider
    const { user } = useAuth();

    // Load saved answers into local state whenever they update or session finishes loading
    useEffect(() => {
      if (!sessionLoading && savedAnswers.size > 0) {
        // Merge with local answers but give priority to local ones if they were just clicked
        setUserAnswers(prev => {
          const merged = new Map(savedAnswers);
          // If the user already interacted in this session, keep their selections
          prev.forEach((val, key) => merged.set(key, val));
          return merged;
        });
      }
    }, [sessionLoading, savedAnswers]);

    const handleAnswerSelect = (questionId: string, optionIndex: number) => {
      // Update local state for immediate UI feedback
      setUserAnswers(prev => {
        const next = new Map(prev);
        next.set(questionId, optionIndex);
        return next;
      });

      // Start timer when user first interacts with question
      if (!savedAnswers.has(questionId)) {
        startQuestionTimer(questionId);
      }
    };

    const handleValidateAnswer = async (questionId: string, correctOptionIndex: number) => {
      const selectedAnswer = userAnswers.get(questionId);
      if (selectedAnswer === undefined) return;

      const isCorrect = selectedAnswer === correctOptionIndex;

      // Save to database (persists across sessions)
      await saveAnswer(questionId, selectedAnswer, isCorrect);

      // Stop timer for this question
      stopQuestionTimer(questionId);
    };

    const handleSave = async (id: string) => {
      await toggleBookmark(id);
    };

    const handleTrash = (id: string) => {
      setTrashedIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    };

    const handleGenerateQuestions = async () => {
      if (!user) {
        setGenerateError('Please sign in to generate questions');
        return;
      }

      // Clear previous messages
      setGenerateError(null);
      setGenerateSuccess(null);
      setIsGenerating(true);

      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;
        if (!apiKey) {
          setGenerateError("API Key Missing. Please check your environment configuration.");
          setIsGenerating(false);
          return;
        }

        // Use stable @google/generative-ai library
        const genAI = new GoogleGenerativeAI(apiKey);

        // Get model from Settings or force gemini-1.5-flash
        const selectedModel = AI_CONFIG.defaultModel;
        const model = genAI.getGenerativeModel({
          model: selectedModel,
          generationConfig: { responseMimeType: "application/json" }
        });

        // Topic-specific context
        const topicContext = `Focus EXCLUSIVELY on topic: "${topicResource.topicName}" for ${subject} ${examContext} exam.`;

        // HIGH-RIGOR PROMPT
        const prompt = `Generate ${generateCount} HIGH-RIGOR ${subject} MCQ questions for ${examContext} syllabus on "${topicResource.topicName}".
        
        CRITICAL: Each question MUST include a detailed step-by-step solution and deep intelligence fields.
        
        Return ONLY valid JSON with a "questions" array containing items with these exact keys:
        - id: string
        - text: the question text (use $ $ for math)
        - options: array of 4 strings (use $ $ for math)
        - correctOptionIndex: 0-3
        - solutionSteps: array of 3-5 strings explaining the step-by-step solution (Format: "Title ::: Reasoning")
        - markingScheme: array of {step, mark}
        - topic: "${topicResource.topicName}"
        - difficulty: "Easy", "Moderate", or "Hard"
        - aiReasoning: Explain the TECHNICAL mindset and trap analysis for THIS specific problem.
        - historicalPattern: Historical context or syllabus shift frequency.
        - predictiveInsight: Prediction of future question variants for this concept.
        - whyItMatters: Practical/Engineering application for this specific concept.
        - studyTip: A strategic mastery shortcut, mnemonic, or visualization ritual.
        - keyConcepts: array of {name, explanation}
        - commonMistakes: array of {mistake, why, howToAvoid}
        
        CRITICAL RULES:
        1. Use $ for inline math and $$ for display math.
        2. In JSON, use double backslashes for all LaTeX commands: "\\\\frac{1}{2}" or "\\\\log".
        3. Generic advice like "Check calculations" is strictly FORBIDDEN.
        4. Focus exclusively on "${topicResource.topicName}" syllabus for ${examContext}.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const data = safeAiParse<any>(text, { questions: [] }, true);

        if (!data.questions || data.questions.length === 0) {
          setGenerateError('Failed to generate questions. Please try again.');
          setIsGenerating(false);
          return;
        }

        console.log('✅ Generated', data.questions.length, 'questions');

        // Normalize difficulty value to match database constraint
        const normalizeDifficulty = (diff: string): 'Easy' | 'Moderate' | 'Hard' => {
          const normalized = (diff || 'Moderate').toLowerCase().trim();
          if (normalized.includes('easy') || normalized.includes('simple') || normalized.includes('basic')) {
            return 'Easy';
          } else if (normalized.includes('hard') || normalized.includes('difficult') || normalized.includes('challenging') || normalized.includes('advanced')) {
            return 'Hard';
          } else {
            // Medium, Moderate, Intermediate, etc. all map to Moderate
            return 'Moderate';
          }
        };

        // Format questions with proper structure
        const formatted: AnalyzedQuestion[] = data.questions.map((q: any) => {
          const normalizedDifficulty = normalizeDifficulty(q.diff || q.difficulty || 'Moderate');

          return {
            ...q,
            id: crypto.randomUUID(), // Proper UUID
            options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
            correctOptionIndex: q.correctOptionIndex ?? 0,
            bloomsTaxonomy: q.bloomsTaxonomy || 'Understand',
            pedagogy: q.pedagogy || 'Conceptual',
            relevanceScore: q.relevanceScore || 70,
            whyItMatters: q.whyItMatters || 'This question tests core concepts frequently appearing in exams.',
            keyConcepts: q.keyConcepts || [{
              name: q.topic || topicResource.topicName,
              explanation: 'This concept is fundamental to understanding the subject.'
            }],
            commonMistakes: q.commonMistakes || [{
              mistake: 'Calculation errors',
              why: 'Students rush through calculations.',
              howToAvoid: 'Always verify calculations step-by-step.'
            }],
            studyTip: q.studyTip || 'Break down the problem into smaller steps. Understand the theory first, then practice problems.',
            thingsToRemember: q.thingsToRemember || ['Key formula or principle'],
            aiReasoning: q.aiReasoning || `This ${q.topic || topicResource.topicName} question aligns with exam patterns.`,
            historicalPattern: q.historicalPattern || `This concept appears consistently in ${examContext} exams.`,
            predictiveInsight: q.predictiveInsight || 'High probability to appear in upcoming exams.',
            marks: q.marks || '1',
            difficulty: normalizedDifficulty,
            diff: normalizedDifficulty,
            blooms: q.bloomsTaxonomy || 'Understand',
            topic: q.topic || topicResource.topicName,
            domain: q.domain || topicResource.topicName,
            year: q.year || '2025 Prediction',
            markingSteps: q.markingScheme || q.solutionSteps || [],
            extractedImages: q.extractedImages || [],
            hasVisualElement: q.hasVisualElement || false
          };
        });

        // ========== STEP 1: SAVE TO SUPABASE DATABASE ==========
        console.log('💾 Saving to Supabase...');

        // Step 1a: Create or get placeholder scan for AI-generated questions
        // Questions table requires scan_id (NOT NULL), so we create a system scan
        const placeholderScanName = `AI Practice - ${topicResource.topicName}`;

        let scanId: string;

        // Check if placeholder scan exists (RLS ensures user_id isolation)
        const { data: existingScans } = await supabase
          .from('scans')
          .select('id, metadata')
          .eq('user_id', user.id)
          .eq('name', placeholderScanName)
          .eq('subject', subject)
          .eq('status', 'Complete')
          .filter('metadata->>is_ai_practice_placeholder', 'eq', 'true')
          .limit(1);

        if (existingScans && existingScans.length > 0) {
          scanId = existingScans[0].id;
          console.log('Using existing placeholder scan:', scanId);
        } else {
          // Create placeholder scan (hidden from main scans list)
          // NOTE: This is a system scan used ONLY to satisfy questions.scan_id foreign key
          // RLS ensures user_id isolation - each user only sees their own placeholder scans
          const { data: newScan, error: scanError } = await supabase
            .from('scans')
            .insert({
              user_id: user.id,
              name: placeholderScanName,
              grade: '12', // Default grade
              subject: subject,
              status: 'Complete',
              summary: `AI-generated practice questions for ${topicResource.topicName}`,
              exam_context: examContext,
              metadata: {
                is_ai_practice_placeholder: true, // FILTER THIS OUT in scans list queries
                type: 'ai_generated',
                topic_resource_id: topicResource.id,
                topic_name: topicResource.topicName,
                hidden_from_scans_list: true // Explicit flag for filtering
              }
            })
            .select('id')
            .single();

          if (scanError || !newScan) {
            console.error('❌ Failed to create placeholder scan:', scanError);
            setGenerateError(`Failed to create placeholder scan: ${scanError?.message || 'Unknown error'}`);
            setIsGenerating(false);
            return;
          }

          scanId = newScan.id;
          console.log('Created new placeholder scan:', scanId);
        }

        // Map to actual database columns (from migrations/001_initial_schema.sql and 009_add_question_metadata.sql)
        const questionsToInsert = formatted.map(q => {
          // Parse year to integer (handle cases like "2025 Prediction" -> 2025)
          let yearValue = null;
          if (q.year) {
            const yearMatch = String(q.year).match(/(\d{4})/);
            yearValue = yearMatch ? parseInt(yearMatch[1]) : null;
          }

          return {
            id: q.id,
            scan_id: scanId, // Reference to placeholder scan (required field)
            // NOTE: questions table does NOT have user_id column - user ownership tracked via scan_id -> scans.user_id
            text: q.text,  // Column is 'text', not 'question_text'
            options: q.options,
            correct_option_index: q.correctOptionIndex,
            marks: typeof q.marks === 'number' ? q.marks : parseInt(q.marks as string) || 1,
            difficulty: q.difficulty,
            topic: q.topic,
            blooms: q.bloomsTaxonomy, // Column is 'blooms', not 'blooms_taxonomy'
            domain: q.domain,
            year: yearValue,
            subject: subject,
            exam_context: examContext,
            pedagogy: q.pedagogy,
            // Map AI fields to existing and new columns
            solution_steps: q.solutionSteps,
            study_tip: q.studyTip,
            exam_tip: q.studyTip, // Maintain backward compatibility
            ai_reasoning: q.aiReasoning,
            historical_pattern: q.historicalPattern,
            predictive_insight: q.predictiveInsight,
            why_it_matters: q.whyItMatters,
            visual_concept: q.visualConcept,
            key_formulas: Array.isArray(q.keyFormulas) ? q.keyFormulas : (q.thingsToRemember || []),
            pitfalls: q.commonMistakes?.map((m: any) => ({
              mistake: m.mistake || m.pitfall || '',
              why: m.why || '',
              howToAvoid: m.howToAvoid || ''
            })) || [],
            // Store remaining AI data in mastery_material JSONB column for backward compatibility
            mastery_material: {
              ...((q as any).mastery_material || q.masteryMaterial || {}),
              keyConcepts: q.keyConcepts,
              aiReasoning: q.aiReasoning,
              historicalPattern: q.historicalPattern,
              predictiveInsight: q.predictiveInsight,
              whyItMatters: q.whyItMatters,
              markingSteps: q.markingSteps
            }
          };
        });

        const { error: dbError } = await supabase
          .from('questions')
          .insert(questionsToInsert);

        if (dbError) {
          console.error('❌ Supabase error:', dbError);
          // Set error in state instead of throwing
          setGenerateError(`Failed to save to database: ${dbError.message}`);
          setIsGenerating(false);
          return; // Don't throw, just return
        }

        console.log('✅ Saved to Supabase');

        // --- NEW: Add question-topic mappings so it shows up in dashboards ---
        const mappingsToInsert = questionsToInsert.map(q => ({
          question_id: q.id,
          topic_id: topicResource.topicId,
          confidence: 1.0,
          mapped_by: 'ai'
        }));

        const { error: mappingError } = await supabase
          .from('topic_question_mapping')
          .insert(mappingsToInsert);

        if (mappingError) {
          console.warn('⚠️  Could not save topic mappings:', mappingError);
          // Don't fail the whole process if mapping fails, just log it
        } else {
          console.log('✅ Topic mappings saved');
          // Refresh global data to update dashboard Q counts immediately
          onProgressUpdate?.(true);
        }

        // ========== STEP 2: SAVE TO REDIS/API ==========
        const newQuestions = [...formatted, ...questions];
        const cacheKey = `qbank_${topicResource.topicName}_${subject}_${examContext}`;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          await fetch('/api/questionbank', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ key: cacheKey, questions: newQuestions })
          });
          console.log('✅ Saved to Redis/API');
        } catch (err) {
          console.warn('⚠️ Redis save failed (non-critical):', err);
        }

        // ========== STEP 3: UPDATE LOCAL STATE ==========
        setQuestions(newQuestions);
        console.log('✅ Updated local state');

        // Update parent component's question count
        if (onQuestionCountChange) {
          onQuestionCountChange(newQuestions.length);
        }

        // ========== STEP 4: RELOAD PRACTICE SESSION ==========
        // This will re-fetch saved answers for new questions
        await reloadPracticeSession();
        console.log('✅ Reloaded practice session');

        // ========== STEP 5: SUCCESS NOTIFICATION ==========
        setGenerateSuccess(`Successfully generated ${formatted.length} new practice questions! They're ready for you to solve.`);
        setIsGenerating(false);

        // Auto-close modal after 2 seconds
        setTimeout(() => {
          setShowGenerateModal(false);
          setGenerateSuccess(null);
        }, 2000);

      } catch (error: any) {
        console.error('❌ Generation error:', error);
        setGenerateError(`Failed to generate questions: ${error.message || 'Unknown error'}. Please try again.`);
        setIsGenerating(false);
      }
    };

    const [isRefining, setIsRefining] = useState<string | null>(null);

    const handleRefineIntelligence = async (question: AnalyzedQuestion) => {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("API Key missing. Please check your environment.");
        return;
      }

      setIsRefining(question.id);
      try {
        const refined = await synthesizeQuestionIntelligence(
          question,
          topicResource.topicName,
          subject,
          examContext,
          supabase,
          apiKey
        );
        if (refined) {
          const formattedRefined = formatAnalyzedQuestion(refined);
          setQuestions(prev => prev.map(q => q.id === question.id ? formattedRefined : q));
          // If modal is open, update it
          if (solutionModalQuestion?.id === question.id) setSolutionModalQuestion(formattedRefined);
          if (insightsModalQuestion?.id === question.id) setInsightsModalQuestion(formattedRefined);
        }
      } catch (err) {
        console.error('Refinement failed', err);
        alert("Failed to synthesize intelligence. Please try again.");
      } finally {
        setIsRefining(null);
      }
    };

    const getPedagogyColor = (pedagogy?: string) => {
      switch (pedagogy) {
        case 'Conceptual': return 'bg-gradient-to-br from-blue-50 to-blue-100/80 text-blue-700 border-blue-200/50';
        case 'Analytical': return 'bg-gradient-to-br from-purple-50 to-purple-100/80 text-purple-700 border-purple-200/50';
        case 'Problem-Solving': return 'bg-gradient-to-br from-orange-50 to-orange-100/80 text-orange-700 border-orange-200/50';
        case 'Application': return 'bg-gradient-to-br from-green-50 to-green-100/80 text-green-700 border-green-200/50';
        case 'Critical-Thinking': return 'bg-gradient-to-br from-pink-50 to-pink-100/80 text-pink-700 border-pink-200/50';
        default: return 'bg-gradient-to-br from-slate-50 to-slate-100/80 text-slate-700 border-slate-200/50';
      }
    };

    const getBloomsColor = (level?: string) => {
      switch (level) {
        case 'Remember':
        case 'Remembering': return 'bg-gradient-to-br from-slate-50 to-slate-100/80 text-slate-700 border border-slate-200/50';
        case 'Understand':
        case 'Understanding': return 'bg-gradient-to-br from-blue-50 to-blue-100/80 text-blue-700 border border-blue-200/50';
        case 'Apply':
        case 'Application': return 'bg-gradient-to-br from-green-50 to-green-100/80 text-green-700 border border-green-200/50';
        case 'Analyze':
        case 'Analyzing': return 'bg-gradient-to-br from-yellow-50 to-yellow-100/80 text-yellow-700 border border-yellow-200/50';
        case 'Evaluate':
        case 'Evaluating': return 'bg-gradient-to-br from-orange-50 to-orange-100/80 text-orange-700 border border-orange-200/50';
        case 'Create':
        case 'Creating': return 'bg-gradient-to-br from-purple-50 to-purple-100/80 text-purple-700 border border-purple-200/50';
        default: return 'bg-gradient-to-br from-slate-50 to-slate-100/80 text-slate-700 border border-slate-200/50';
      }
    };

    const filteredQuestions = questions?.filter(q => !trashedIds.has(q.id)) || [];

    // Get real-time session statistics
    const sessionStats = getSessionStats();

    // Track analytics visibility
    const [showAnalytics, setShowAnalytics] = useState(false);

    // Load saved answers into local state ONCE when session is loaded
    useEffect(() => {
      if (!sessionLoading && savedAnswers.size > 0 && userAnswers.size === 0) {
        setUserAnswers(new Map(savedAnswers));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionLoading]);

    // Calculate comprehensive analytics
    const calculateAnalytics = () => {
      // Topic breakdown
      const topicStats = new Map<string, { correct: number; total: number; timeSpent: number }>();
      filteredQuestions.forEach(q => {
        if (validatedAnswers.has(q.id)) {
          const stats = topicStats.get(q.topic) || { correct: 0, total: 0, timeSpent: 0 };
          stats.total++;
          if (validatedAnswers.get(q.id)) stats.correct++;
          topicStats.set(q.topic, stats);
        }
      });

      // Difficulty breakdown
      const difficultyStats = {
        Easy: { correct: 0, total: 0 },
        Moderate: { correct: 0, total: 0 },
        Hard: { correct: 0, total: 0 }
      };
      filteredQuestions.forEach(q => {
        if (validatedAnswers.has(q.id)) {
          const diff = (q.difficulty || q.diff || 'Moderate') as 'Easy' | 'Moderate' | 'Hard';
          if (difficultyStats[diff]) {
            difficultyStats[diff].total++;
            if (validatedAnswers.get(q.id)) difficultyStats[diff].correct++;
          }
        }
      });

      // Weak topics (accuracy < 60%)
      const weakTopics = Array.from(topicStats.entries())
        .map(([topic, stats]) => ({
          topic,
          accuracy: Math.round((stats.correct / stats.total) * 100),
          correct: stats.correct,
          total: stats.total
        }))
        .filter(t => t.accuracy < 60)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3);

      // Strong topics (accuracy >= 80%)
      const strongTopics = Array.from(topicStats.entries())
        .map(([topic, stats]) => ({
          topic,
          accuracy: Math.round((stats.correct / stats.total) * 100),
          correct: stats.correct,
          total: stats.total
        }))
        .filter(t => t.accuracy >= 80)
        .sort((a, b) => b.accuracy - a.accuracy)
        .slice(0, 3);

      return { topicStats, difficultyStats, weakTopics, strongTopics };
    };

    const analytics = calculateAnalytics();

    // DEBUG: Log first question metadata to verify data flow (only once)
    // Questions loaded - debug logs removed

    // Show loading state while fetching saved data
    if (sessionLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-slate-600 font-medium">Loading your practice session...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Dedicated Practice Actions Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-2 md:p-3 rounded-[1.25rem] md:rounded-[1.5rem] border border-slate-200 shadow-sm w-full">
            <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
              <div className={`w-full md:w-auto px-4 py-2.5 md:py-2 rounded-xl border flex items-center justify-center md:justify-start gap-2 shadow-inner ${sessionStats.accuracy >= 80 ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' : 'bg-amber-50/50 border-amber-100 text-amber-700'}`}>
                <Zap size={14} className="shrink-0" />
                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest font-outfit truncate flex items-center gap-1.5">
                  {filteredQuestions.length} Problems
                  <span className="opacity-30">•</span>
                  <span className="flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded shadow-sm">{filteredQuestions.filter(q => q.source?.toLowerCase().includes('ai')).length} <Sparkles size={8} /></span>
                  <span className="opacity-30">•</span>
                  {sessionStats.accuracy}% Sync
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto overflow-x-auto scroller-hide">
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setFocusedQuestionId(focusedQuestionId ? null : (filteredQuestions[0]?.id || null))}
                  className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-[11px] font-black flex items-center gap-1.5 md:gap-2 transition-all border font-outfit uppercase tracking-wider ${focusedQuestionId ? 'bg-purple-600 text-white border-purple-700 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                    }`}
                >
                  <Target size={14} />
                  {focusedQuestionId ? 'Exit Focus' : 'Focus Mode'}
                </button>

                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="px-3 md:px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-[10px] md:text-[11px] font-black text-white flex items-center gap-1.5 md:gap-2 transition-all shadow-md font-outfit uppercase tracking-wider"
                >
                  <Sparkles size={14} className="text-purple-300" />
                  AI Generate
                </button>
              </div>

              <div className="hidden md:block w-px h-6 bg-slate-200 mx-1 shrink-0" />

              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className={`p-1.5 md:p-2 rounded-lg transition-all ${showStats ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'}`}
                  title="Toggle Full Stats"
                >
                  <BarChart3 size={14} className="md:w-4 md:h-4" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm('⚠️ Reset progress?')) {
                      await clearProgress();
                      setUserAnswers(new Map());
                      setTrashedIds(new Set());
                    }
                  }}
                  className="p-1.5 md:p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  title="Reset Progress"
                >
                  <RefreshCw size={14} className="md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Expanded Stats */}
        <AnimatePresence>
          {showStats && sessionStats.attempted > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2">
                {[
                  { label: 'Precision', val: `${sessionStats.accuracy}%`, detail: `${sessionStats.correct}/${sessionStats.attempted}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Progress', val: `${((sessionStats.attempted / filteredQuestions.length) * 100).toFixed(0)}%`, detail: `${sessionStats.attempted}/${filteredQuestions.length}`, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Vault', val: sessionStats.bookmarked, detail: 'Reviews', color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Latency', val: sessionStats.avgTime > 0 ? `${Math.floor(sessionStats.avgTime)}s` : '—', detail: 'Per Problem', color: 'text-amber-600', bg: 'bg-amber-50' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
                    <div className={`text-xl font-black ${stat.color}`}>{stat.val}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{stat.detail}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Floating Progress Dock - Innovative Navigation */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] md:right-28 md:left-auto md:translate-x-0">
          <motion.div
            initial={false}
            animate={{
              width: isNavigatorOpen ? (typeof window !== 'undefined' && window.innerWidth < 768 ? '90vw' : '400px') : '160px',
              height: isNavigatorOpen ? 'auto' : '48px',
              borderRadius: isNavigatorOpen ? '24px' : '999px'
            }}
            className="bg-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Dock Header / Toggle */}
            <button
              onClick={() => setIsNavigatorOpen(!isNavigatorOpen)}
              className="h-12 flex items-center justify-between px-5 gap-3 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-white font-bold text-[11px] uppercase tracking-widest leading-none mt-0.5">
                  {isNavigatorOpen ? 'Quest Progress' : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-outfit text-[13px] font-black tracking-tight">{validatedAnswers.size}/{filteredQuestions.length || 0}</span>
                      <span className="opacity-80">SOLVED</span>
                    </div>
                  )}
                </span>
              </div>
              {isNavigatorOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
              {isNavigatorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="p-5 pt-0 border-t border-white/5"
                >
                  <div className="grid grid-cols-6 gap-2 mt-4">
                    {filteredQuestions.map((q, idx) => {
                      const hasValidated = validatedAnswers.has(q.id);
                      const isCorrect = validatedAnswers.get(q.id) ?? false;
                      const isSelected = userAnswers.has(q.id);
                      const isFocused = focusedQuestionId === q.id;

                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            setFocusedQuestionId(q.id);
                            document.getElementById(`question-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className={`group relative h-9 rounded-xl flex items-center justify-center text-[11px] font-black transition-all border-2 ${hasValidated
                            ? (isCorrect ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.2)]')
                            : isFocused
                              ? 'bg-white text-slate-900 border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                              : isSelected
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30'
                            }`}
                        >
                          {idx + 1}
                          {isFocused && (
                            <motion.div
                              layoutId="nav-focus-ring"
                              className="absolute -inset-1 rounded-2xl border-2 border-white/20 animate-pulse"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="space-y-1">
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Accuracy</div>
                      <div className="text-sm font-black text-white">
                        {validatedAnswers.size > 0
                          ? Math.round((Array.from(validatedAnswers.values()).filter(v => v).length / validatedAnswers.size) * 100)
                          : 0}%
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Remaining</div>
                      <div className="text-sm font-black text-white">
                        {filteredQuestions.length - validatedAnswers.size}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Questions List */}
        {
          filteredQuestions.length > 0 ? (
            <div className="space-y-4 md:space-y-6">
              {filteredQuestions.map((q) => {
                const selectedAnswer = userAnswers.get(q.id) ?? savedAnswers.get(q.id);
                const hasValidated = validatedAnswers.has(q.id);
                const isCorrect = validatedAnswers.get(q.id) ?? false;
                const validatedAnswer = savedAnswers.get(q.id);
                const isFocused = focusedQuestionId === q.id;

                return (
                  <motion.div
                    key={q.id}
                    id={`question-${q.id}`}
                    initial={false}
                    animate={{
                      scale: isFocused ? 1.01 : 1,
                      opacity: focusedQuestionId && !isFocused ? 0.25 : 1,
                      boxShadow: isFocused ? '0 30px 60px -15px rgba(0,0,0,0.15)' : '0 10px 15px -3px rgba(0,0,0,0.04)'
                    }}
                    onClick={() => setFocusedQuestionId(q.id)}
                    className={`bg-white border transition-all duration-500 rounded-[1.75rem] overflow-hidden group/card relative ${isFocused ? 'border-purple-300' : 'border-slate-200'
                      }`}
                  >
                    {/* Glassy Status Indicator */}
                    {hasValidated && (
                      <div className={`absolute top-0 left-0 w-full h-1 z-20 ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    )}

                    {/* Card Header - Ultra Premium */}
                    <div className={`px-3 md:px-5 py-3 flex items-start justify-between gap-3 border-b ${isFocused ? 'bg-purple-50/40' : 'bg-slate-50/40'} border-slate-100 relative`}>
                      <div className="flex items-start md:items-center gap-3 md:gap-4 flex-1 min-w-0 pr-8">
                        {/* Number Box */}
                        <div className={`w-9 h-9 md:w-11 md:h-11 shrink-0 rounded-[10px] md:rounded-xl flex items-center justify-center transition-all shadow-sm ${hasValidated
                          ? (isCorrect ? 'bg-emerald-500 rotate-0 ring-4 ring-emerald-50' : 'bg-rose-500 rotate-0 ring-4 ring-rose-50')
                          : 'bg-slate-900 -rotate-2 group-hover/card:rotate-0'
                          }`}>
                          <div className="text-center">
                            <div className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] leading-none ${hasValidated ? 'text-white/90' : 'text-slate-400'}`}>
                              {q.source?.toLowerCase().includes('ai') ? 'AI' : 'PBM'}
                            </div>
                            <div className="text-lg md:text-xl font-bold text-white leading-none font-outfit mt-0.5 flex items-center justify-center gap-1">
                              {q.source?.toLowerCase().includes('ai') && <Sparkles size={8} className="text-amber-300" />}
                              {(() => {
                                const qNumMatch = q.id?.match(/Q(\d+)/i) || q.id?.match(/(\d+)/);
                                if (q.source?.toLowerCase().includes('ai')) {
                                  return filteredQuestions.indexOf(q) + 1;
                                }
                                return qNumMatch ? qNumMatch[1] : filteredQuestions.indexOf(q) + 1;
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Metadata & Tags */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1.5 md:mb-1">
                            <h3 className="text-[13px] md:text-base font-black text-slate-900 tracking-tight font-outfit uppercase line-clamp-1 leading-snug">
                              {q.topic || 'General Practice'}
                            </h3>
                            {hasValidated && (
                              <span className="inline-flex items-center justify-center px-1.5 md:px-2 py-0.5 bg-white border border-slate-200 text-slate-500 text-[9px] md:text-[10px] font-black rounded-md md:rounded-lg tracking-widest font-outfit shadow-[0_2px_4px_rgba(0,0,0,0.02)] whitespace-nowrap w-max mt-0.5 sm:mt-0">
                                {Math.floor(sessionStats.avgTime || 0)}s <span className="text-slate-400 uppercase ml-1">Lat</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 items-center">
                            {/* Difficulty Tag */}
                            <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] px-1.5 md:px-2 py-0.5 rounded-md border ${q.difficulty === 'Hard' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              q.difficulty === 'Moderate' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                              } font-outfit shadow-sm whitespace-nowrap`}>
                              {q.difficulty}
                            </span>

                            {/* Year Tag */}
                            {q.year && (
                              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] px-1.5 md:px-2 py-0.5 rounded-md border bg-slate-100 text-slate-600 border-slate-200 font-outfit shadow-sm whitespace-nowrap">
                                {String(q.year).includes('Prediction') ? q.year : `PYQ ${q.year}`}
                              </span>
                            )}

                            {/* Marks Tag */}
                            {q.marks && (
                              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] px-1.5 md:px-2 py-0.5 rounded-md border bg-blue-50 text-blue-600 border-blue-100 font-outfit shadow-sm whitespace-nowrap">
                                {q.marks} {Number(q.marks) === 1 ? 'Mark' : 'Marks'}
                              </span>
                            )}

                            {/* Exam Context Tag */}
                            {(q.exam_context || examContext) && (
                              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] px-1.5 md:px-2 py-0.5 rounded-md border bg-indigo-50 text-indigo-600 border-indigo-100 font-outfit shadow-sm whitespace-nowrap">
                                {q.exam_context || examContext}
                              </span>
                            )}

                            <div className="hidden md:flex items-center gap-1.5">
                              {q.blooms && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-widest font-outfit whitespace-nowrap">Blooms: {q.blooms}</span>
                                </>
                              )}
                              {q.pedagogy && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50/80 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-widest font-outfit whitespace-nowrap">{q.pedagogy}</span>
                                </>
                              )}
                            </div>

                            {/* Mobile Only compressed tags layout */}
                            <div className="md:hidden flex items-center flex-wrap gap-1">
                              {q.blooms && (
                                <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded shrink-0 uppercase tracking-widest font-outfit">B: {q.blooms.slice(0, 3)}</span>
                              )}
                              {q.pedagogy && (
                                <span className="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded shrink-0 uppercase tracking-widest font-outfit">{q.pedagogy.slice(0, 3)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bookmark absolutely positioned on mobile for cleaner top right */}
                      <div className="absolute top-3 right-3 md:relative md:top-auto md:right-auto md:shrink-0 flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleSave(q.id); }} className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all border shadow-sm bg-white hover:scale-105 active:scale-95 ${bookmarkedIds.has(q.id) ? 'text-blue-600 border-blue-200 bg-blue-50/50' : 'text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                          <BookmarkPlus size={16} className="md:w-[18px] md:h-[18px]" fill={bookmarkedIds.has(q.id) ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="p-5 md:p-8">
                      <div className="text-lg md:text-2xl font-bold text-slate-900 leading-snug mb-6 font-outfit">
                        <RenderWithMath text={q.text} showOptions={false} />
                      </div>

                      {q.hasVisualElement && q.extractedImages && q.extractedImages.length > 0 && (
                        <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
                          <img src={q.extractedImages[0]} alt="Conceptual aid" className="max-h-32 w-auto rounded-lg mix-blend-multiply" />
                        </div>
                      )}

                      {/* Innovative MCQ Grid */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options.map((option, idx) => {
                            const isSelected = selectedAnswer === idx;
                            const hasCorrectAnswer = q.correctOptionIndex !== undefined && q.correctOptionIndex !== null;
                            const isCorrectChoice = hasCorrectAnswer && Number(q.correctOptionIndex) === idx;
                            const isWrongChoice = hasValidated && isSelected && !isCorrectChoice;
                            const isCorrectReveal = hasValidated && isCorrectChoice;

                            return (
                              <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); !hasValidated && handleAnswerSelect(q.id, idx); }}
                                disabled={hasValidated}
                                className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left ${isSelected && !hasValidated ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10' :
                                  isCorrectReveal ? 'border-emerald-500 bg-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' :
                                    isWrongChoice ? 'border-rose-500 bg-rose-50 shadow-[0_0_20px_rgba(244,63,94,0.1)]' :
                                      'border-slate-100 bg-white hover:border-slate-300 hover:shadow-md hover:bg-slate-50/50'
                                  }`}
                              >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all text-sm ${isSelected && !hasValidated ? 'bg-blue-500 text-white shadow-lg' :
                                  isCorrectReveal ? 'bg-emerald-500 text-white shadow-lg' :
                                    isWrongChoice ? 'bg-rose-500 text-white shadow-lg' :
                                      'bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white group-active:scale-95 font-outfit border border-slate-200'
                                  }`}>
                                  {String.fromCharCode(65 + idx)}
                                </div>
                                <div className="flex-1 text-base md:text-lg font-semibold text-slate-800 tracking-tight leading-relaxed">
                                  <RenderWithMath text={option} showOptions={false} />
                                </div>
                                {isCorrectReveal && <CheckCircle size={20} className="text-emerald-500 shrink-0" />}
                                {isWrongChoice && <XCircle size={20} className="text-rose-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
                        {!hasValidated ? (
                          <div className="w-full md:w-auto">
                            {selectedAnswer !== undefined ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleValidateAnswer(q.id, q.correctOptionIndex!); }}
                                className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3 font-outfit"
                              >
                                <Award size={18} />
                                Evaluate Accuracy
                              </button>
                            ) : (
                              <div className="flex items-center gap-3 text-slate-400 text-[11px] font-bold uppercase tracking-widest font-outfit px-2">
                                <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
                                Awaiting Selection...
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSolutionModalQuestion(q); }}
                              className="w-full sm:flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.25rem] font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 font-outfit shadow-lg hover:shadow-xl"
                            >
                              <Eye size={18} /> View Detailed Solution
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setInsightsModalQuestion(q); }}
                              className="w-full sm:flex-1 py-4 bg-white border border-slate-200 text-slate-900 rounded-[1.25rem] font-bold text-[11px] uppercase tracking-widest hover:border-slate-900 transition-all flex items-center justify-center gap-3 font-outfit shadow-sm hover:shadow-md"
                            >
                              <Sparkles size={18} className="text-amber-500" /> AI Deep Insights
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRefineIntelligence(q); }}
                              disabled={isRefining === q.id}
                              title="Synthesize AI Solution/Insights"
                              className="w-12 h-12 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-[1.25rem] flex items-center justify-center transition-all hover:border-blue-200 shadow-sm disabled:opacity-50"
                            >
                              <RefreshCw size={18} className={isRefining === q.id ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tactile Feedback Banner */}
                    <AnimatePresence>
                      {hasValidated && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          className={`px-6 py-4 flex items-center gap-3 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCorrect ? 'bg-white/20' : 'bg-rose-500/20'}`}>
                            {isCorrect ? <Trophy size={16} /> : <AlertCircle size={16} className="text-rose-400" />}
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-80">
                              {isCorrect ? 'Elite Mastery' : 'Growth Opportunity'}
                            </div>
                            <div className="text-sm font-bold">
                              {isCorrect ? 'Precision Achieved! Your conceptual sync is high.' : 'Not quite. Use solution to debug your logic.'}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-dashed border-slate-300 rounded-2xl p-16 text-center">
              <div className="max-w-md mx-auto">
                {/* Animated Icon */}
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto">
                    <FileQuestion size={48} className="text-primary-600" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-purple-500/20 rounded-full blur-xl -z-10 animate-pulse"></div>
                </div>

                <h3 className="font-black text-2xl text-slate-900 mb-3">Ready to Start Practicing?</h3>
                <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed">
                  No questions available yet for this topic. Generate AI-powered practice questions tailored to your exam pattern, or scan past papers to build your question bank.
                </p>

                {/* Action Button */}
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-purple-800 transition-all"
                >
                  <Sparkles size={20} className="transition-transform group-hover:rotate-12 group-hover:scale-110" />
                  <span className="uppercase tracking-wide">Generate Practice Questions</span>
                </button>

                {/* Help Text */}
                <p className="text-xs text-slate-500 mt-4">
                  ✨ AI will create exam-style questions with detailed solutions and insights
                </p>
              </div>
            </div>
          )
        }

        {/* Modals */}
        {
          solutionModalQuestion && (
            <PracticeSolutionModal
              question={solutionModalQuestion}
              onClose={() => setSolutionModalQuestion(null)}
              onRefine={() => handleRefineIntelligence(solutionModalQuestion)}
              isRefining={isRefining === solutionModalQuestion.id}
            />
          )
        }

        {
          insightsModalQuestion && (
            <PracticeInsightsModal
              question={insightsModalQuestion}
              onClose={() => setInsightsModalQuestion(null)}
              onRefine={() => handleRefineIntelligence(insightsModalQuestion)}
              isRefining={isRefining === insightsModalQuestion.id}
            />
          )
        }

        {/* Generate Questions Modal */}
        {
          showGenerateModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <h3 className="text-xl font-black text-slate-900 mb-4">Generate Practice Questions</h3>
                <p className="text-sm text-slate-600 mb-6">
                  AI will generate new MCQ questions for <span className="font-bold text-primary-600">{topicResource.topicName}</span>
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Number of Questions</label>
                  <select
                    value={generateCount}
                    onChange={(e) => setGenerateCount(parseInt(e.target.value))}
                    disabled={isGenerating}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-medium focus:border-primary-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                  </select>
                </div>

                {/* Error Message */}
                {generateError && (
                  <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-900 mb-1">Generation Failed</p>
                      <p className="text-xs text-red-700">{generateError}</p>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {generateSuccess && (
                  <div className="mb-4 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-start gap-3 animate-fadeIn">
                    <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-emerald-900 mb-1">Success!</p>
                      <p className="text-xs text-emerald-700">{generateSuccess}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={isGenerating}
                    className="group flex-1 px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold disabled:opacity-50 hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span className="uppercase tracking-wide">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} className="transition-transform group-hover:rotate-12 group-hover:scale-110" />
                        <span className="uppercase tracking-wide">Generate</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    disabled={isGenerating}
                    className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        }
      </div>
    );
  };

// ========== TAB 3: QUIZ (AI-POWERED) ==========
const QuizTab: React.FC<{
  topicResource: TopicResource;
  subject: Subject;
  examContext: ExamContext;
  sharedQuestions: any[];
  setSharedQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  onProgressUpdate?: (silent?: boolean) => void;
  poolCount: number;
  onStartQuiz: (topicId: string, totalQuestions?: number) => void;
  pastQuizzes: any[];
  loadingPastQuizzes: boolean;
  refreshHistory: () => void;
}> = ({
  topicResource,
  subject,
  examContext,
  sharedQuestions,
  setSharedQuestions,
  onProgressUpdate,
  poolCount,
  onStartQuiz,
  pastQuizzes,
  loadingPastQuizzes,
  refreshHistory
}) => {
    const { user } = useAuth();
    const { isLoading: isTestGenerating } = useLearningJourney();
    const [isGenerating, setIsGenerating] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [strategy, setStrategy] = useState<'adaptive' | 'simulation'>('adaptive');

    // Quiz state
    const [isQuizActive, setIsQuizActive] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<Map<number, number>>(new Map());
    const [showResults, setShowResults] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
    const [quizSaved, setQuizSaved] = useState(false);
    const [reviewQuiz, setReviewQuiz] = useState<any | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Reset question index when opening a new review
    useEffect(() => {
      setCurrentQuestionIndex(0);
    }, [reviewQuiz]);

    // Difficulty Distribution State
    const [easy, setEasy] = useState(70);
    const [moderate, setModerate] = useState(25);
    const [hard, setHard] = useState(5);
    const [isAutoComplexity, setIsAutoComplexity] = useState(true);

    const [showPastQuizzes, setShowPastQuizzes] = useState(false);

    // Fetch forecast for simulation mode
    const [topicForecast, setTopicForecast] = useState<any>(null);
    useEffect(() => {
      if (strategy === 'simulation') {
        const config = EXAM_CONFIGS[examContext];
        if (config) {
          // Topic specific drift calculation
          const drift = 1 + (topicResource.masteryLevel / 100) * 0.2;
          setTopicForecast({
            name: 'REI Oracle v3',
            rigor: (drift).toFixed(2),
            distribution: {
              easy: Math.max(0, config.difficultyProfile.easy - 10),
              moderate: config.difficultyProfile.moderate,
              hard: config.difficultyProfile.hard + 10
            }
          });
        }
      }
    }, [strategy, examContext, topicResource.masteryLevel]);

    // Derived Stats for Complexity Matrix
    const matrixStats = useMemo(() => {
      // 1. Learning: Based on notes completed and visual engagements
      const learning = topicResource.notesCompleted ? 100 : 20;

      // 2. Solve: Practice accuracy
      const solve = topicResource.averageAccuracy || 0;

      // 3. Master: Topic mastery level
      const master = topicResource.masteryLevel || 0;

      // 4. Recall: Flashcard performance (approximated if not direct)
      const recall = Math.min(100, (topicResource.quizzesTaken * 20) + (master * 0.5));

      return { learning, solve, master, recall };
    }, [topicResource]);

    // Auto-adjust complexity based on stats
    useEffect(() => {
      if (isAutoComplexity) {
        const mastery = topicResource.masteryLevel || 0;
        const accuracy = topicResource.averageAccuracy || 0;

        if (mastery < 30) {
          setEasy(70); setModerate(25); setHard(5);
        } else if (mastery < 60) {
          setEasy(40); setModerate(40); setHard(20);
        } else if (mastery < 85) {
          setEasy(20); setModerate(40); setHard(40);
        } else {
          setEasy(10); setModerate(30); setHard(60);
        }
      }
    }, [isAutoComplexity, topicResource.masteryLevel]);

    // Timer for active quiz
    useEffect(() => {
      let interval: NodeJS.Timeout;
      if (isQuizActive && quizStartTime && !showResults) {
        interval = setInterval(() => {
          setTimeElapsed(Math.floor((Date.now() - quizStartTime) / 1000));
        }, 1000);
      }
      return () => clearInterval(interval);
    }, [isQuizActive, quizStartTime, showResults]);

    // Parse JSON helper
    const parseGeminiJSON = (responseText: string) => {
      try {
        // responseMimeType: 'application/json' guarantees valid JSON from Gemini.
        // cleanJsonResponse doubles backslashes on already-valid JSON, breaking LaTeX.
        return JSON.parse(responseText);
      } catch (error) {
        console.error('Failed to parse JSON:', error);
        throw new Error('Invalid JSON response from AI');
      }
    };

    const generateQuiz = async () => {
      if (!user) {
        alert('Please log in to generate quiz');
        return;
      }
      setIsGenerating(true);
      try {
        const topicQuestions = sharedQuestions || [];
        const masteryLevel = topicResource.masteryLevel || 0;
        const averageScore = topicResource.averageQuizScore || 0;

        let difficultyDistribution = `${easy}% Foundation, ${moderate}% Standard, ${hard}% Advanced`;

        const weakConcepts = topicQuestions
          .filter(q => q.userAttempted && q.userCorrect === false)
          .slice(0, 3)
          .map(q => q.concept || q.topic)
          .filter(Boolean);

        const selectedModel = localStorage.getItem('gemini_model') || AI_CONFIG.defaultModel;
        const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: selectedModel,
          generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `You are a World-Class Entrance Exam Architect for ${examContext}. 
        Create an ADAPTIVE MCQ quiz for "${topicResource.topicName}" focus on ${subject}.
        
        DIFFICULTY TARGET: ${difficultyDistribution}.
        
        TECHNICAL RULES:
        1. Use PROPER LaTeX for ALL math expressions ($...$ for inline, $$...$$ for block).
        2. MANDATORY: Double all backslashes in LaTeX inside JSON strings (e.g., \\\\frac, \\\\theta).
        3. NO "Definition" questions. Use "Twists" and "Scenarios" aligned with current ${examContext} trends.
        4. Return ONLY a valid JSON array of ${questionCount} objects:
        {
          "id": "q1",
          "question": "The question text with $math$",
          "options": ["...", "...", "...", "..."],
          "correctIndex": 0,
          "solutionSteps": ["Step-wise logic with $math$ and insights"],
          "examTip": "A property/shortcut or trap warning",
          "keyFormulas": ["$formula$"],
          "pitfalls": ["Common student error"],
          "concept": "Sub-concept name",
          "topic": "${topicResource.topicName}",
          "difficulty": "Easy|Moderate|Hard"
        }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textToParse = response.text() || "[]";

        console.log('🔮 Raw AI Response:', textToParse);

        // Use the robust safeAiParse which handles normalization and repairs
        const data = safeAiParse<any>(textToParse, { questions: [] }, true);
        const parsed = data.questions || [];

        if (Array.isArray(parsed) && parsed.length > 0) {
          // Mix with some existing questions from Solve tab for reinforcement (if any)
          let finalPool = [...parsed];
          if (sharedQuestions && sharedQuestions.length > 0) {
            // Take up to 20% from existing questions for reinforcement
            const existingCount = Math.floor(questionCount * 0.2);
            if (existingCount > 0) {
              const shuffled = [...sharedQuestions].sort(() => 0.5 - Math.random());
              const reinforcement = shuffled.slice(0, existingCount).map(q => ({
                id: `reinforce-${q.id}`,
                question: q.text,
                options: q.options || [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean),
                correctIndex: q.correctOptionIndex,
                explanation: q.explanation || q.studyTip,
                concept: q.concept || q.topic,
                topic: q.topic,
                difficulty: q.difficulty
              }));
              finalPool = [...finalPool.slice(0, questionCount - reinforcement.length), ...reinforcement];
              // Final Shuffle
              finalPool.sort(() => 0.5 - Math.random());
            }
          }

          setQuizQuestions(finalPool);

          // AUTO-START THE QUIZ!
          setIsQuizActive(true);
          setCurrentQuestion(0);
          setSelectedAnswer(null);
          setAnsweredQuestions(new Map());
          setShowResults(false);
          setQuizStartTime(Date.now());
          setTimeElapsed(0);

          console.log(`✅ Quiz generated and started with ${finalPool.length} questions`);
        } else {
          throw new Error('No valid questions generated');
        }
      } catch (error) {
        console.error('Quiz generation error:', error);
        // Fallback or alert
        if (sharedQuestions && sharedQuestions.length > 0) {
          const fallback = sharedQuestions.slice(0, questionCount);
          setQuizQuestions(fallback);
          setIsQuizActive(true);
          setCurrentQuestion(0);
          setSelectedAnswer(null);
          setAnsweredQuestions(new Map());
          setShowResults(false);
          setQuizStartTime(Date.now());
          setTimeElapsed(0);
          console.log('⚠️ Fallback to practice questions successful');
        } else {
          alert('Failed to generate quiz and no practice questions available.');
        }
      } finally {
        setIsGenerating(false);
      }
    };

    const startQuiz = () => {
      if (quizQuestions.length === 0) return;
      setIsQuizActive(true);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setAnsweredQuestions(new Map());
      setShowResults(false);
      setQuizStartTime(Date.now());
      setTimeElapsed(0);
    };

    const handleAnswerSelect = (optionIndex: number) => {
      if (!isQuizActive || showResults) return;
      setSelectedAnswer(optionIndex);
    };

    const submitAnswer = () => {
      if (selectedAnswer === null) return;

      const newAnswers = new Map(answeredQuestions);
      newAnswers.set(currentQuestion, selectedAnswer);
      setAnsweredQuestions(newAnswers);
      // User must manually click "Next Question" button to continue
    };

    const exitQuiz = () => {
      setIsQuizActive(false);
      setShowResults(false);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setAnsweredQuestions(new Map());
    };

    const retakeQuiz = () => {
      startQuiz();
      setQuizSaved(false);
    };

    // Calculate results (moved up for scope)
    const correctCount = Array.from(answeredQuestions.entries()).filter(
      ([idx, answer]) => (quizQuestions[idx]?.correctIndex === answer || quizQuestions[idx]?.correctOptionIndex === answer)
    ).length;

    const accuracy = answeredQuestions.size > 0
      ? Math.round((correctCount / answeredQuestions.size) * 100)
      : 0;

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Save quiz attempt to database
    const saveQuizAttempt = async () => {
      if (!user || quizSaved) return;
      try {
        const wrongCount = answeredQuestions.size - correctCount;
        const questionsData = quizQuestions.map((q, idx) => ({
          question: q.question || q.text,
          options: q.options,
          correctIndex: q.correctIndex ?? q.correctOptionIndex,
          userAnswer: answeredQuestions.get(idx),
          isCorrect: answeredQuestions.get(idx) === (q.correctIndex ?? q.correctOptionIndex),
          difficulty: q.difficulty,
          topic: q.topic,
          explanation: q.explanation || '',
          solutionSteps: q.solutionSteps || (q.explanation ? [q.explanation] : []),
          examTip: q.examTip || '',
          keyFormulas: q.keyFormulas || [],
          pitfalls: q.pitfalls || []
        }));

        const { error: insertError } = await supabase.from('quiz_attempts').insert({
          user_id: user.id,
          topic_resource_id: topicResource.id,
          subject,
          exam_context: examContext,
          topic_name: topicResource.topicName,
          question_count: quizQuestions.length,
          questions_data: questionsData,
          correct_count: correctCount,
          wrong_count: wrongCount,
          accuracy_percentage: accuracy,
          time_spent_seconds: timeElapsed
        });

        if (insertError) {
          console.error('❌ [saveQuizAttempt] Failed to save quiz attempt:', insertError.message, insertError.code, insertError.details);
          // Don't return — still update stats even if save fails
        } else {
          console.log('✅ [saveQuizAttempt] Quiz attempt saved successfully');
        }

        // Update topic_resources stats overall
        const { data: currentStats } = await supabase
          .from('topic_resources')
          .select('*')
          .eq('user_id', user.id)
          .eq('topic_id', topicResource.topicId)
          .eq('exam_context', examContext)
          .single();

        // Fetch absolute truth for questions attempted/correct from practice_answers
        const { data: allAnswers } = await supabase
          .from('practice_answers')
          .select('id, is_correct')
          .eq('user_id', user.id)
          .eq('topic_resource_id', topicResource.id);

        // Include current quiz questions in the calculation if they aren't in practice_answers yet
        // (Though usually they are saved during the quiz)
        const totalAttempted = allAnswers?.length || 0;
        const totalCorrect = allAnswers?.filter((a: any) => a.is_correct).length || 0;
        const newAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : accuracy; // Fallback to current quiz accuracy if no history

        const newQuizzesTaken = (currentStats?.quizzes_taken || 0) + 1;
        const oldAvgQuizScore = currentStats?.average_quiz_score || 0;
        const newAvgQuizScore = Math.round(((oldAvgQuizScore * (newQuizzesTaken - 1)) + accuracy) / newQuizzesTaken);

        const isNotesDone = currentStats?.notes_completed || false;
        // NEW DYNAMIC COVERAGE: Saturation target is 50% of the currently known question pool (min 15).
        const saturationTarget = Math.min(poolCount, Math.max(15, Math.floor(poolCount * 0.5)));
        const coverageWeight = Math.min(1, totalAttempted / Math.max(1, saturationTarget));

        const newMasteryLevel = Math.min(100, Math.round(
          (newAccuracy * 0.60 * coverageWeight) +
          Math.min(20, newQuizzesTaken * 10) +
          Math.min(10, Math.floor(totalAttempted / 10) * 5) +
          (isNotesDone ? 10 : 0)
        ));

        // Refined Shifting Logic: Mastered requires 90% Mastery AND 2+ Quizzes
        let nextStage = currentStats?.study_stage || 'practicing';
        if (newMasteryLevel >= 90 && newQuizzesTaken >= 2) {
          nextStage = 'mastered';
        } else if (nextStage !== 'mastered') {
          nextStage = 'taking_quiz';
        }

        console.log(`📊 [QuizMasteryCalc] Topic: ${topicResource.topicId}, Accuracy: ${newAccuracy}%, Mastery: ${newMasteryLevel}%, Stage: ${nextStage}`);

        const statsData = {
          user_id: user.id,
          topic_id: topicResource.topicId,
          subject: subject,
          exam_context: examContext,
          questions_attempted: totalAttempted,
          questions_correct: totalCorrect,
          average_accuracy: newAccuracy,
          quizzes_taken: newQuizzesTaken,
          average_quiz_score: newAvgQuizScore,
          mastery_level: newMasteryLevel,
          study_stage: nextStage,
          last_practiced: new Date().toISOString()
        };

        const { error: upsertErr } = await supabase
          .from('topic_resources')
          .upsert(statsData, {
            onConflict: 'user_id,topic_id,exam_context'
          });

        if (upsertErr) console.error('Error upserting topic_resources:', upsertErr);
        else onProgressUpdate?.(true);

        setQuizSaved(true);
      } catch (err) {
        console.error('Error saving quiz:', err);
      }
    };



    // Save quiz when results are shown
    useEffect(() => {
      if (showResults && isQuizActive && !quizSaved) {
        saveQuizAttempt();
      }
    }, [showResults, isQuizActive, quizSaved]);

    // ========== REVIEW MODE SCREEN ==========
    if (reviewQuiz) {
      const rawQData = reviewQuiz.questionsData || reviewQuiz.questions_data || [];
      const qData = typeof rawQData === 'string' ? JSON.parse(rawQData) : rawQData;

      console.log('📊 [Desktop Review] Quiz data:', { rawQData: typeof rawQData, qDataLength: qData?.length, reviewQuiz });

      const sessionCorrect = reviewQuiz.correctCount ?? reviewQuiz.correct_count ?? (qData.filter((q: any) => q.isCorrect).length) ?? 0;
      const sessionTotal = reviewQuiz.questionCount ?? reviewQuiz.question_count ?? qData.length ?? 0;
      const sessionTime = reviewQuiz.timeSpentSeconds ?? reviewQuiz.time_spent_seconds ?? 0;
      const sessionAccuracy = reviewQuiz.accuracyPercentage ?? reviewQuiz.accuracy_percentage ?? (sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0);

      const currentQ = qData[currentQuestionIndex];

      return (
        <div className="min-h-[600px] bg-white rounded-[2.5rem] border-2 border-slate-900/5 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="bg-slate-900 p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setReviewQuiz(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <h3 className="text-xl font-black font-outfit uppercase italic tracking-tighter">Retroactive Analysis</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                  Session: {new Date(reviewQuiz.createdAt || reviewQuiz.created_at).toLocaleDateString()} • {reviewQuiz.accuracyPercentage || reviewQuiz.accuracy_percentage || 0}% Mastery
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black font-mono leading-none">{sessionCorrect}/{sessionTotal}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Accuracy</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black font-mono leading-none">{formatTime(sessionTime)}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Duration</span>
              </div>
              <button
                onClick={() => setReviewQuiz(null)}
                className="px-6 py-3 bg-white text-slate-900 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg"
              >
                Close Review
              </button>
            </div>
          </div>

          {/* Question Navigator Grid */}
          {qData.length > 0 && (
            <div className="px-8 pt-6 pb-4 bg-white border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Question Navigator</h4>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-slate-600">Correct</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-rose-500" /><span className="text-slate-600">Incorrect</span></div>
                </div>
              </div>
              <div className="grid grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-2">
                {qData.map((q: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`aspect-square rounded-lg font-black text-xs transition-all ${currentQuestionIndex === idx
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                      : q.isCorrect
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Grid */}
          <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-50/50">
            {/* Current Question Display */}
            <div className="lg:col-span-8 space-y-6">
              {currentQ && (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest font-outfit">Question {currentQuestionIndex + 1}</span>
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest font-outfit border ${currentQ.difficulty === 'Hard' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            currentQ.difficulty === 'Moderate' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                            {currentQ.difficulty}
                          </span>
                          {currentQ.isCorrect ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                              <CheckCircle2 size={12} /> Correct
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                              <XCircle size={12} /> Missed
                            </span>
                          )}
                        </div>
                        <div className="text-lg md:text-2xl font-bold text-slate-800 leading-snug font-outfit quiz-question-text">
                          <RenderWithMath text={currentQ.question} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentQ.options.map((opt: string, optIdx: number) => {
                        const isCorrect = optIdx === currentQ.correctIndex;
                        const isUserAnswer = optIdx === currentQ.userAnswer;
                        return (
                          <div
                            key={optIdx}
                            className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${isCorrect ? 'bg-emerald-50 border-emerald-500 shadow-sm' :
                              isUserAnswer && !isCorrect ? 'bg-rose-50 border-rose-500 shadow-sm' :
                                'bg-white border-slate-100 opacity-60'
                              }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${isCorrect ? 'bg-emerald-600 text-white' :
                              isUserAnswer && !isCorrect ? 'bg-rose-600 text-white' :
                                'bg-slate-100 text-slate-400'
                              }`}>
                              {String.fromCharCode(65 + optIdx)}
                            </div>
                            <div className={`text-base md:text-lg font-semibold tracking-tight leading-relaxed ${isCorrect ? 'text-emerald-900' : isUserAnswer ? 'text-rose-900' : 'text-slate-500'}`} style={{ fontSize: '1.125rem' }}>
                              <div className="quiz-option-math">
                                <RenderWithMath text={opt} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Integrated Solution Section */}
                    {(!currentQ.isCorrect || true) && (
                      <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                          <Brain size={18} />
                          <span className="text-xs font-black uppercase tracking-[0.2em] font-outfit">Engine Insights</span>
                        </div>
                        <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 space-y-4">
                          {currentQ.solutionSteps && (
                            <div className="space-y-3">
                              <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={14} /> Solution Protocol
                              </span>
                              <div className="space-y-3">
                                {currentQ.solutionSteps.map((step: string, sIdx: number) => (
                                  <div key={sIdx} className="flex gap-3 items-start group/step">
                                    <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 mt-1">{sIdx + 1}</span>
                                    <div className="text-base md:text-lg font-semibold text-slate-700 leading-relaxed quiz-solution-step">
                                      <RenderWithMath text={step} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {currentQ.examTip && (
                            <div className="flex gap-4 bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-200 shadow-md">
                              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                                <Zap size={22} className="text-white" />
                              </div>
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-amber-700 uppercase tracking-widest">Simulation Strategy</span>
                                  <div className="h-1 flex-1 bg-amber-200 rounded-full"></div>
                                </div>
                                <p className="text-base md:text-lg font-semibold text-slate-900 leading-relaxed">"{currentQ.examTip}"</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!currentQ && (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                    <Brain size={32} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase mb-2">No Question Data</p>
                    <p className="text-xs text-slate-400 max-w-[300px]">Question details are not available for this quiz attempt.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Sidebar for Overall Analysis */}
            <div className="lg:col-span-4 space-y-6">
              <div className="sticky top-24 space-y-6">
                <div className="bg-white rounded-[2rem] border-2 border-slate-900/5 p-8 shadow-sm space-y-6">
                  <h4 className="text-sm font-black font-outfit uppercase tracking-widest text-[#0B1528] flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-600" />
                    Topic Pulse
                  </h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Correct Calibration</span>
                      <span className="text-sm font-black text-emerald-600">{sessionCorrect} QS</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Gaps Detected</span>
                      <span className="text-sm font-black text-rose-600">{sessionTotal - sessionCorrect} QS</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Average Velocity</span>
                      <span className="text-sm font-black text-blue-600">{sessionTotal > 0 ? Math.round(sessionTime / sessionTotal) : 0} s/q</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setReviewQuiz(null)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all font-outfit"
                  >
                    Exit Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Results Screen - Expert Side-by-Side Design
    if (showResults && isQuizActive) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-4">
          <div className="max-w-[1400px] mx-auto px-4">
            {/* Minimal Header Score Bar */}
            <div className="flex items-center justify-between mb-4 bg-white rounded-xl px-6 py-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${accuracy >= 80 ? 'bg-emerald-100' : accuracy >= 60 ? 'bg-amber-100' : 'bg-red-100'
                    }`}>
                    <Trophy size={28} className={
                      accuracy >= 80 ? 'text-emerald-600' : accuracy >= 60 ? 'text-amber-600' : 'text-red-600'
                    } />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-slate-900">{accuracy}%</div>
                    <div className="text-xs text-slate-500 font-medium">Score</div>
                  </div>
                </div>

                <div className="h-12 w-px bg-slate-200"></div>

                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-2xl font-black text-emerald-600">{correctCount}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Correct</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-red-600">{answeredQuestions.size - correctCount}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Wrong</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black font-mono text-blue-600">{formatTime(timeElapsed)}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Time</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={retakeQuiz}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all flex items-center gap-2 text-sm"
                >
                  <RefreshCw size={14} />
                  Retake
                </button>
                <button
                  onClick={exitQuiz}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-bold transition-all text-sm"
                >
                  Exit
                </button>
              </div>
            </div>

            {/* Questions - TRUE Side-by-Side Layout */}
            <div className="space-y-4">
              {quizQuestions.map((q, idx) => {
                const userAnswer = answeredQuestions.get(idx);
                const correctIdx = q.correctIndex !== undefined ? q.correctIndex : q.correctOptionIndex;
                const isCorrect = userAnswer === correctIdx;

                return (
                  <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Minimal Question Number Header */}
                    <div className={`px-4 py-2 border-b flex items-center gap-3 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                      }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                        {idx + 1}
                      </div>
                      <div className={`text-xs font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </div>
                    </div>

                    {/* TRUE 50/50 Split - No Stacking */}
                    <div className="grid grid-cols-2 divide-x divide-slate-200">
                      {/* LEFT PANEL: Question + Options */}
                      <div className="p-6 bg-white">
                        <div className="text-sm font-bold text-slate-900 mb-4 leading-relaxed">
                          <RenderWithMath text={q.question} showOptions={false} serif={false} />
                        </div>

                        <div className="space-y-2">
                          {q.options.map((option: string, optIdx: number) => {
                            const isUserSelection = userAnswer === optIdx;
                            const correctIdx = q.correctIndex !== undefined ? q.correctIndex : q.correctOptionIndex;
                            const isCorrectOpt = correctIdx === optIdx;

                            return (
                              <div
                                key={optIdx}
                                className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${isCorrectOpt
                                  ? 'border-emerald-400 bg-emerald-50'
                                  : isUserSelection && !isCorrect
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-slate-200 bg-slate-50'
                                  }`}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${isCorrectOpt
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : isUserSelection && !isCorrect
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'bg-white text-slate-700 border-2 border-slate-300'
                                  }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </div>
                                <div className="flex-1 text-sm font-medium text-slate-800 pt-0.5">
                                  <RenderWithMath text={option} showOptions={false} serif={false} />
                                </div>
                                {isCorrectOpt && (
                                  <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" strokeWidth={2.5} />
                                )}
                                {isUserSelection && !isCorrect && (
                                  <XCircle size={20} className="text-red-600 flex-shrink-0" strokeWidth={2.5} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* RIGHT PANEL: Solution + Explanation */}
                      <div className="p-6 bg-gradient-to-br from-slate-50 to-white">
                        {/* Correct Answer Section */}
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center">
                              <CheckCircle2 size={14} className="text-white" strokeWidth={3} />
                            </div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Correct Answer</h4>
                          </div>
                          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg px-4 py-3">
                            <div className="text-base font-black text-emerald-700">
                              {(() => {
                                const cIdx = q.correctIndex !== undefined ? q.correctIndex : (q.correctOptionIndex ?? 0);
                                return String.fromCharCode(65 + Number(cIdx));
                              })()}
                            </div>
                            <div className="text-sm font-medium text-emerald-800 mt-1">
                              <RenderWithMath
                                text={q.options[q.correctIndex !== undefined ? q.correctIndex : (q.correctOptionIndex ?? 0)] || 'Solution loading...'}
                                showOptions={false}
                                serif={false}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Solution Steps */}
                        {q.solutionSteps && q.solutionSteps.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Brain size={16} className="text-indigo-600" />
                              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Solution Steps</h4>
                            </div>
                            <div className="space-y-3">
                              {q.solutionSteps.map((step: any, sIdx: number) => (
                                <div key={sIdx} className="flex gap-3">
                                  <div className="flex-shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {sIdx + 1}
                                  </div>
                                  <div className="text-sm text-slate-700 leading-relaxed py-0.5">
                                    <RenderWithMath text={step.content || step} showOptions={false} serif={false} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Legacy Explanation fallback */}
                        {!q.solutionSteps && q.explanation && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Lightbulb size={16} className="text-blue-600" />
                              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Explanation</h4>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 leading-relaxed">
                              <RenderWithMath text={q.explanation} showOptions={false} serif={false} />
                            </div>
                          </div>
                        )}

                        {/* Exam Tip */}
                        {q.examTip && (
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap size={14} className="text-amber-600" />
                              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Exam Tip</span>
                            </div>
                            <div className="text-xs text-amber-900 leading-relaxed font-medium">
                              <RenderWithMath text={q.examTip} showOptions={false} serif={false} />
                            </div>
                          </div>
                        )}

                        {/* Key Formulas */}
                        {q.keyFormulas && q.keyFormulas.length > 0 && (
                          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Target size={14} className="text-indigo-600" />
                              <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider">Key Formulas</span>
                            </div>
                            <div className="space-y-1">
                              {q.keyFormulas.map((f: string, fIdx: number) => (
                                <div key={fIdx} className="text-xs text-indigo-900 font-mono">
                                  <RenderWithMath text={f} showOptions={false} serif={false} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Your Wrong Answer */}
                        {(!isCorrect && userAnswer !== undefined) && (
                          <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle size={14} className="text-amber-600" />
                              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Your Answer</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center font-black text-xs text-white">
                                {String.fromCharCode(65 + Number(userAnswer))}
                              </div>
                              <div className="text-xs font-medium text-amber-800">
                                <RenderWithMath text={q.options[userAnswer] || 'Answer recorded'} showOptions={false} serif={false} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Active Quiz Screen
    if (isQuizActive && !showResults && quizQuestions.length > 0) {
      const currentQ = quizQuestions[currentQuestion];
      const isAnswered = answeredQuestions.has(currentQuestion);
      const userAnswer = answeredQuestions.get(currentQuestion);
      const isCorrect = userAnswer === currentQ?.correctIndex;

      // Difficulty badge color
      const getDifficultyColor = (diff: string) => {
        switch (diff?.toLowerCase()) {
          case 'easy': return 'bg-green-100 text-green-700';
          case 'medium': return 'bg-yellow-100 text-yellow-700';
          case 'hard': return 'bg-red-100 text-red-700';
          default: return 'bg-slate-100 text-slate-700';
        }
      };

      return (
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Ultra-Compact Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg px-3 py-1.5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                <div className="text-white font-black text-xs">{currentQuestion + 1}</div>
              </div>
              <span className="text-[11px] font-black text-white">
                {currentQuestion + 1}/{quizQuestions.length}
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getDifficultyColor(currentQ?.difficulty)}`}>
                {currentQ?.difficulty || 'Med'}
              </span>
              <div className="flex-1 mx-2">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/90 transition-all duration-500 rounded-full"
                    style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] font-bold text-white">
                <Clock size={10} />
                {formatTime(timeElapsed)}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-white">
                {correctCount}/{answeredQuestions.size}
              </div>
              <button
                onClick={exitQuiz}
                className="ml-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] font-bold text-white transition-all"
              >
                Exit
              </button>
            </div>
          </div>

          {/* Compact Question Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <div className="text-sm font-bold text-slate-900 mb-3 leading-snug">
              <RenderWithMath text={currentQ?.question || ''} showOptions={false} serif={false} />
            </div>

            {/* 2x2 Grid Layout for Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              {currentQ?.options.map((option: string, idx: number) => {
                let buttonClass = "text-left p-2 rounded-lg border transition-all duration-200 flex items-center gap-2 ";

                if (isAnswered) {
                  if (idx === currentQ.correctIndex) {
                    buttonClass += "border-green-400 bg-green-50 text-green-900";
                  } else if (idx === userAnswer) {
                    buttonClass += "border-red-400 bg-red-50 text-red-900";
                  } else {
                    buttonClass += "border-slate-200 bg-slate-50 text-slate-400";
                  }
                } else {
                  if (idx === selectedAnswer) {
                    buttonClass += "border-purple-400 bg-purple-50 text-purple-900 shadow-sm";
                  } else {
                    buttonClass += "border-slate-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(idx)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] flex-shrink-0 ${isAnswered
                      ? idx === currentQ.correctIndex
                        ? 'bg-green-500 text-white'
                        : idx === userAnswer
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                      : idx === selectedAnswer
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                      }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className="text-xs font-medium flex-1">
                      <RenderWithMath text={option} showOptions={false} serif={false} />
                    </div>
                    {isAnswered && idx === currentQ.correctIndex && (
                      <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                    )}
                    {isAnswered && idx === userAnswer && idx !== currentQ.correctIndex && (
                      <XCircle size={14} className="text-red-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Compact Explanation */}
            {isAnswered && currentQ?.explanation && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-black text-[10px] text-blue-900 mb-1 flex items-center gap-1">
                  <Lightbulb size={10} />
                  Explanation
                </h4>
                <div className="text-[11px] text-blue-800 leading-snug">
                  <RenderWithMath text={currentQ.explanation} showOptions={false} serif={false} />
                </div>
              </div>
            )}

            {/* Inline Action Button */}
            {!isAnswered ? (
              <button
                onClick={submitAnswer}
                disabled={selectedAnswer === null}
                className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-bold hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-sm text-xs"
              >
                <CheckCircle2 size={14} />
                Submit Answer
              </button>
            ) : (
              <button
                onClick={() => {
                  if (currentQuestion < quizQuestions.length - 1) {
                    setCurrentQuestion(currentQuestion + 1);
                    setSelectedAnswer(null);
                  } else {
                    setShowResults(true);
                  }
                }}
                className="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-1 shadow-sm text-xs"
              >
                {currentQuestion < quizQuestions.length - 1 ? (
                  <>
                    Next Question
                    <ChevronRight size={14} />
                  </>
                ) : (
                  <>
                    <Trophy size={14} />
                    View Results
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      );
    }

    // ========== MAIN SETUP SCREEN ==========
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setStrategy('adaptive')}
            className={`p-6 rounded-[2rem] border-2 transition-all text-left flex gap-4 group relative overflow-hidden ${strategy === 'adaptive' ? 'bg-white border-blue-600 shadow-xl shadow-blue-500/10' : 'bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-white'}`}
          >
            {strategy === 'adaptive' && <div className="absolute top-0 right-0 p-3 opacity-5 text-blue-600"><Zap size={80} /></div>}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${strategy === 'adaptive' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
              <Brain size={24} />
            </div>
            <div className="space-y-0.5 relative z-10">
              <div className="flex flex-col">
                <span className={`text-[9px] font-black uppercase tracking-[0.15em] mb-0.5 ${strategy === 'adaptive' ? 'text-blue-600' : 'text-slate-400'}`}>Engine Mode</span>
                <span className={`text-lg font-black block leading-none font-outfit tracking-tight ${strategy === 'adaptive' ? 'text-slate-900' : 'text-slate-600'}`}>Adaptive Growth</span>
              </div>
              <p className="text-[12px] font-medium text-slate-400 leading-tight max-w-[180px]">AI calibration for gap-filling & mastery.</p>
              {strategy === 'adaptive' && (
                <div className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 w-fit">
                  <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Active Intelligence</span>
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => setStrategy('simulation')}
            className={`p-6 rounded-[2rem] border-2 transition-all text-left flex gap-4 group relative overflow-hidden ${strategy === 'simulation' ? 'bg-slate-900 border-slate-900 shadow-xl shadow-slate-900/30 text-white' : 'bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-white'}`}
          >
            {strategy === 'simulation' && <div className="absolute top-0 right-0 p-3 opacity-5 text-white"><Target size={80} /></div>}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${strategy === 'simulation' ? 'bg-white text-slate-900' : 'bg-white text-slate-400 border border-slate-100'}`}>
              <Monitor size={24} />
            </div>
            <div className="space-y-0.5 relative z-10">
              <div className="flex flex-col">
                <span className={`text-[9px] font-black uppercase tracking-[0.15em] mb-0.5 ${strategy === 'simulation' ? 'text-blue-400' : 'text-slate-400'}`}>Protocol Mode</span>
                <span className={`text-lg font-black block leading-none font-outfit tracking-tight ${strategy === 'simulation' ? 'text-white' : 'text-slate-600'}`}>Exam Protocol</span>
              </div>
              <p className={`text-[12px] font-medium leading-tight max-w-[180px] ${strategy === 'simulation' ? 'text-slate-400' : 'text-slate-400'}`}>Official test replication & scoring.</p>
              {strategy === 'simulation' && (
                <div className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 text-white rounded-full border border-white/10 w-fit">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Oracle Enabled</span>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Dynamic Controls based on Strategy */}
        <AnimatePresence mode="wait">
          {strategy === 'adaptive' ? (
            <motion.div
              key="adaptive"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/40 overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
                  <div className="flex-1 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Session Intensity</label>
                        <h4 className="text-lg font-black text-slate-900 font-outfit tracking-tight leading-none">Questions Configuration</h4>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl font-black text-blue-600 font-mono italic tracking-tighter">{questionCount}</span>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1.5">Units</span>
                      </div>
                    </div>
                    <div className="relative py-2">
                      <input
                        type="range"
                        min="5"
                        max="20"
                        step="5"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full h-2.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between mt-3 px-1">
                        {[5, 10, 15, 20].map(v => (
                          <div key={v} className="flex flex-col items-center gap-1">
                            <div className={`w-1 h-1 rounded-full ${questionCount >= v ? 'bg-blue-600' : 'bg-slate-200'}`} />
                            <span className={`text-[9px] font-black tracking-tight ${questionCount === v ? 'text-blue-600' : 'text-slate-300'}`}>{v} Units</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={generateQuiz}
                    disabled={isGenerating}
                    className="px-12 py-6 bg-slate-900 text-white rounded-[1.5rem] font-black hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl hover:shadow-blue-500/20 text-[11px] uppercase tracking-[0.22em] font-outfit shrink-0 group active:scale-[0.98]"
                  >
                    {isGenerating ? (
                      <><div className="w-5 h-5 relative flex items-center justify-center"><div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" /><Brain size={18} className="text-blue-400 animate-pulse relative z-10" /></div><span>Connecting the Dots...</span></>
                    ) : (
                      <><Zap size={20} className="group-hover:fill-yellow-400 transition-all" /><span>Start Practice</span></>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="simulation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden text-white relative"
            >
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />

              <div className="p-8 md:p-10 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                <div className="flex-1 space-y-6">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                      <div className="flex items-center gap-2 px-2.5 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-300">REI Oracle active</span>
                      </div>
                      <div className="flex items-center gap-2 ml-1 sm:ml-0 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-400">Rigor: {topicForecast?.rigor}x</span>
                      </div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black font-outfit uppercase italic tracking-tighter leading-none">Simulation Fidelity</h3>
                    <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed max-w-lg">
                      Official {examContext} challenge setup for <span className="text-white font-bold border-b border-blue-600/50">{topicResource.topicName}</span>.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                    {[
                      { label: 'Foundation', val: topicForecast?.distribution?.easy, color: 'bg-emerald-400' },
                      { label: 'Standard', val: topicForecast?.distribution?.moderate, color: 'bg-amber-400' },
                      { label: 'Advanced', val: topicForecast?.distribution?.hard, color: 'bg-rose-400' }
                    ].map(item => (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{item.label}</span>
                          <span className="text-xs font-black text-white">{item.val}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.val}%` }}
                            className={`h-full ${item.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center gap-3">
                  <button
                    onClick={() => !isTestGenerating && onStartQuiz?.(topicResource.topicId)}
                    disabled={isTestGenerating}
                    className="px-12 py-7 bg-white text-slate-900 rounded-[2rem] font-black hover:bg-slate-50 transition-all shadow-2xl flex flex-col items-center justify-center gap-1.5 font-outfit group active:scale-[0.96]"
                  >
                    {isTestGenerating ? (
                      <><div className="w-6 h-6 relative flex items-center justify-center mb-1"><div className="absolute inset-0 bg-blue-600/10 rounded-full animate-ping" /><Zap size={20} className="text-blue-600 animate-pulse relative z-10" /></div><span className="text-[10px] uppercase tracking-widest">Preparing Your Challenge...</span></>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <Target size={24} className="group-hover:scale-110 transition-all text-blue-600" />
                          <span className="text-base uppercase tracking-wider">Begin Session</span>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60">Ready to go</span>
                      </>
                    )}
                  </button>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Official Duration Apply</span>
                </div>
              </div>

              <div className="bg-white/[0.03] border-t border-white/10 px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
                <div className="flex gap-10">
                  {[
                    { label: 'Learning', val: matrixStats.learning, color: 'text-indigo-400' },
                    { label: 'Solve', val: matrixStats.solve, color: 'text-emerald-400' },
                    { label: 'Master', val: matrixStats.master, color: 'text-amber-400' },
                    { label: 'Recall', val: matrixStats.recall, color: 'text-rose-400' }
                  ].map(stat => (
                    <div key={stat.label} className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{stat.label}</span>
                      <span className={`text-base font-black font-mono tracking-tighter ${stat.color}`}>{Math.round(stat.val)}%</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl max-w-sm">
                  <Sparkles size={16} className="text-blue-400 shrink-0" />
                  <p className="text-[10px] font-bold text-blue-100/90 leading-tight">
                    Questions are synthesized to target your performance gaps while maintaining strict blueprint fidelity.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Complexity Matrix - Strategic Distribution Control - Only shown in Adaptive mode */}
        {strategy === 'adaptive' && (
          <ComplexityMatrix
            easy={easy}
            moderate={moderate}
            hard={hard}
            isAuto={isAutoComplexity}
            locked={false}
            onAdjust={(e, m, h) => {
              setEasy(e);
              setModerate(m);
              setHard(h);
            }}
            onToggleAuto={setIsAutoComplexity}
            stats={matrixStats}
          />
        )}


        {/* Past Quizzes Section */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/30 overflow-hidden">
          <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <History size={18} className="text-slate-900" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-black text-slate-900 font-outfit tracking-tight">Session History</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Analytical performance timeline</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowPastQuizzes(!showPastQuizzes);
                if (!showPastQuizzes && pastQuizzes.length === 0) {
                  refreshHistory();
                }
              }}
              className={`px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${showPastQuizzes ? 'bg-slate-200 text-slate-900' : 'bg-slate-900 text-white shadow-lg'}`}
            >
              {showPastQuizzes ? 'Collapse' : 'Explore History'}
            </button>
          </div>

          <AnimatePresence>
            {showPastQuizzes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8">
                  {loadingPastQuizzes ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-8 h-8 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Logs...</span>
                    </div>
                  ) : pastQuizzes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pastQuizzes.map((quiz) => {
                        const scorePct = quiz.percentage ?? 0;
                        const scoreTheme = scorePct >= 80 ? 'emerald' : scorePct >= 60 ? 'amber' : 'rose';
                        return (
                          <div
                            key={quiz.id}
                            onClick={() => setReviewQuiz(quiz)}
                            className="group p-4 bg-white border border-slate-100 rounded-[1.5rem] hover:border-blue-200 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-4 relative z-10">
                              <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 ${scorePct >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : scorePct >= 60 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                <span className="text-lg font-mono leading-none">{scorePct}%</span>
                                <span className="text-[7px] uppercase tracking-widest mt-1">Acc</span>
                              </div>

                              <div className="flex-1 space-y-0.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[13px] font-black text-slate-900 font-outfit">{quiz.score}/{quiz.totalQuestions} Correct</h4>
                                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                                    <Clock size={10} />
                                    <span>{quiz.durationMinutes}M</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between pt-0.5 border-t border-slate-50 mt-1">
                                  <span className="text-[10px] font-bold text-slate-300">
                                    {new Date(quiz.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-tight group-hover:translate-x-1 transition-transform">Analyze →</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <History size={32} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Timeline empty</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

// ========== TAB 4: FLASHCARDS ==========
const FlashcardsTab: React.FC<{
  topicResource: TopicResource;
  sharedQuestions: AnalyzedQuestion[];
}> = ({ topicResource, sharedQuestions }) => {
  const { user } = useAuth();
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState(topicResource.flashcards || []);

  const hasCards = cards.length > 0;

  // Load saved flashcards from database on mount (single source of truth)
  React.useEffect(() => {
    const loadSavedFlashcards = async () => {
      if (!user || cards.length > 0) return; // Skip if already have cards from topicResource

      setIsLoading(true);
      try {
        const cacheKey = `topic_${topicResource.topicId}_${topicResource.examContext}`;
        const { data, error } = await supabase
          .from('flashcards')
          .select('data')
          .eq('cache_key', cacheKey)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data?.data) {
          // Transform back to display format
          const loadedCards = data.data.map((card: any) => ({
            term: card.term,
            definition: card.def,
            context: card.extra
          }));
          setCards(loadedCards);
          console.log('✅ Loaded', loadedCards.length, 'saved flashcards');
        }
      } catch (err) {
        console.error('Error loading saved flashcards:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedFlashcards();
  }, [user, topicResource.topicId, topicResource.examContext]);

  const handleNext = () => {
    setIsFlipped(false);
    if (cards.length === 0) return;
    setCurrentCard((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (cards.length === 0) return;
    setCurrentCard((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const generateFlashcards = async () => {
    if (!user) { alert('Please log in.'); return; }
    setIsGenerating(true);
    try {
      const selectedModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 8000
        }
      });
      const prompt = `You are an elite ${topicResource.examContext} exam coach. Create 12-15 HIGH-YIELD FLASHCARDS for ${topicResource.topicName} in ${topicResource.subject}.

🎯 FLASHCARD FORMAT (NOT theory notes):
- SHORT, punchy explanations
- Bullet points for steps
- Quick recall triggers
- One clear example

Return ONLY valid JSON array:
[
  {
    "term": "Concept/Formula (use $ $ for math)",
    "definition": "**FORMULA:** $formula$ where $x$ = variable\\n\\n**WHEN TO USE:** One sentence\\n\\n**QUICK EXAMPLE:** $input$ → $output$ (1 line)\\n\\n**KEY STEPS:**\\n• Step 1\\n• Step 2\\n• Step 3",
    "context": "⚠️ **COMMON MISTAKE:** What students mess up\\n\\n🎯 **MEMORY TRICK:** Simple mnemonic\\n\\n📝 **EXAM TIP:** How it appears in ${topicResource.examContext}"
  }
]

EXAMPLE:

{
  "term": "Domain of $f(x) = \\\\frac{1}{x-2}$",
  "definition": "**FORMULA:** Domain = all real numbers except where denominator = 0\\n\\n**WHEN TO USE:** For rational functions, find where bottom ≠ 0\\n\\n**QUICK EXAMPLE:** $x - 2 = 0$ → $x = 2$ → Domain: $\\\\mathbb{R} - \\\\{2\\\\}$\\n\\n**KEY STEPS:**\\n• Set denominator ≠ 0\\n• Solve for x\\n• Exclude those values",
  "context": "⚠️ **COMMON MISTAKE:** Forgetting denominator can't be zero\\n\\n🎯 **MEMORY TRICK:** 'Bottom can't be ZERO' → B.C.B.Z\\n\\n📝 **EXAM TIP:** Quick 1-mark questions - always check denominators!"
}

CRITICAL RULES:
- Use \\n\\n for line breaks between sections
- Use $...$ for math (NOT $$...$$)
- Escape backslashes: \\\\frac not \\frac
- Keep definition to 4-5 bullet points MAX
- Context: 3 short points with emojis
- NO long paragraphs - this is a FLASHCARD not notes
- Return ONLY the JSON array`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      // Extract JSON from markdown code blocks if present
      if (text.includes('```json')) {
        const match = text.match(/```json\s*\n([\s\S]*?)\n```/);
        text = match?.[1]?.trim() || text;
      } else if (text.includes('```')) {
        const match = text.match(/```\s*\n([\s\S]*?)\n```/);
        text = match?.[1]?.trim() || text;
      }

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (firstError) {
        // Sanitization fallback
        let sanitized = text
          .replace(/^\uFEFF/, '')
          .replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
        parsed = JSON.parse(sanitized);
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        setCards(parsed);
        setCurrentCard(0);
        setIsFlipped(false);

        // Save to flashcards table (single source of truth)
        const cacheKey = `topic_${topicResource.topicId}_${topicResource.examContext}`;
        const formattedCards = parsed.map(card => ({
          term: card.term,
          def: card.definition,
          extra: card.context,
          topic: topicResource.topicName
        }));

        try {
          await supabase
            .from('flashcards')
            .upsert({
              user_id: user.id,
              cache_key: cacheKey,
              data: formattedCards,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              last_accessed: new Date().toISOString(),
              access_count: 1
            }, {
              onConflict: 'cache_key'
            });
          console.log('✅ Successfully generated and saved', parsed.length, 'flashcards');
        } catch (saveErr) {
          console.error('Error saving flashcards:', saveErr);
        }
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate flashcards.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Neural Header */}
      <div className="bg-slate-900 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] -mr-16 -mt-16" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-purple-500/20">
            <Brain size={20} className="text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-0.5">Rapid Recall Sync</div>
            <div className="text-base font-black text-white">{cards.length} AI Synthesized Nodes</div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          {hasCards && (
            <div className="hidden lg:flex items-center gap-2 mr-4 px-3 py-1 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase">Retention Mode</div>
              <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          )}
          <button
            onClick={generateFlashcards}
            disabled={isGenerating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-black text-white flex items-center gap-2 transition-all shadow-lg shadow-purple-900/40"
          >
            <Sparkles size={14} />
            {isGenerating ? 'SYNTHESIZING...' : 'GENERATE AI NODES'}
          </button>
        </div>
      </div>

      {hasCards ? (
        <div className="max-w-5xl mx-auto">
          {/* Immersive 3D Stage */}
          <div className="perspective-2000 py-4">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className={`relative w-full h-[320px] transition-all duration-700 transform-style-3d cursor-pointer preserve-3d group ${isFlipped ? 'rotate-y-180' : ''}`}
            >
              {/* Card Front - Clean, Premium Typography */}
              <div className="absolute inset-0 backface-hidden bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center border-2 border-slate-100 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
                <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-8 bg-purple-50 px-4 py-1.5 rounded-full border border-purple-100 shadow-sm font-outfit">CONCEPT NODE {currentCard + 1}</div>
                <div className="text-2xl md:text-3xl font-black text-slate-900 leading-tight text-center">
                  <RenderWithMath text={cards[currentCard].term} showOptions={false} />
                </div>
                <div className="mt-auto text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Eye size={12} className="text-purple-400" /> Click to reveal truth
                </div>
              </div>

              {/* Card Back - Comprehensive Breakdown */}
              <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col border-2 border-slate-700 overflow-hidden rotate-y-180">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-cyan-400" />
                <div className="flex-1 overflow-y-auto px-4 scroller-hide space-y-4 pt-4">
                  {/* Core Concept Section */}
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain size={16} className="text-blue-400" />
                      <span className="text-[11px] font-black text-blue-300 uppercase tracking-wider">Formula & Steps</span>
                    </div>
                    <div className="text-base font-medium text-slate-100 leading-[1.8] text-left whitespace-pre-line">
                      <RenderWithMath text={cards[currentCard].definition} showOptions={false} />
                    </div>
                  </div>

                  {/* Exam Strategy Section */}
                  {cards[currentCard].context && (
                    <div className="bg-amber-500/10 rounded-2xl p-5 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-4">
                        <Trophy size={16} className="text-amber-400" />
                        <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">Exam Tips</span>
                      </div>
                      <div className="text-sm font-medium text-amber-50 leading-[1.8] text-left whitespace-pre-line">
                        <RenderWithMath text={cards[currentCard].context} showOptions={false} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 text-center">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">RapidRecall System v3.0 • {topicResource.subject}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Precision Controls */}
          <div className="flex items-center justify-between mt-8 px-4">
            <button onClick={handlePrev} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-200 text-slate-400 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm hover:shadow-md">
              <ChevronLeft size={24} />
            </button>

            <div className="flex flex-col items-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Index</div>
              <div className="text-lg font-black text-slate-900">{currentCard + 1} <span className="text-slate-300">/ {cards.length}</span></div>
            </div>

            <button onClick={handleNext} className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Brain size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Neural Nodes Latent</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 font-medium">Activate the AI Synapse to generate comprehensive memory nodes for {topicResource.topicName}.</p>
          <button onClick={generateFlashcards} className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-purple-900/20">Initialize Synapse</button>
        </div>
      )}
    </div>
  );
};

// ========== TAB 5: PROGRESS ==========
const ProgressTab: React.FC<{
  topicResource: TopicResource;
  pastQuizzes?: any[];
  isLoading?: boolean;
  setReviewQuiz?: (quiz: any) => void;
}> = ({ topicResource, pastQuizzes = [], isLoading = false, setReviewQuiz }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {[
          { label: 'Learning', val: topicResource.notesCompleted ? 100 : 25, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50', status: topicResource.notesCompleted ? 'SYNCED' : 'ACTIVE' },
          { label: 'Solving', val: topicResource.averageAccuracy || 0, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', status: topicResource.averageAccuracy > 70 ? 'STABLE' : 'CALIBRATING' },
          { label: 'Mastering', val: topicResource.averageQuizScore || 0, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50', status: topicResource.quizzesTaken > 2 ? 'VERIFIED' : 'INITIAL' },
          { label: 'Recall', val: Math.min(100, (topicResource.quizzesTaken * 20) + (topicResource.masteryLevel * 0.3)), icon: Brain, color: 'text-purple-500', bg: 'bg-purple-50', status: 'SYNAPTIC' }
        ].map((mod, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full ${mod.bg.replace('bg-', 'bg-opacity-50 bg-')}`} />
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${mod.bg} ${mod.color} flex items-center justify-center`}>
                <mod.icon size={20} />
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-slate-900">{mod.val.toFixed(0)}%</div>
                <div className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${mod.color.replace('text-', 'border-').replace('-500', '-200')} ${mod.bg}`}>
                  {mod.status}
                </div>
              </div>
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{mod.label} Integrity</div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${mod.val}%` }}
                className={`h-full ${mod.color.replace('text-', 'bg-')}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Global Mastery Ring */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Mastery Quotient</h3>

          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="88" strokeWidth="12" stroke="currentColor" fill="transparent" className="text-slate-100" />
              <circle cx="96" cy="96" r="88" strokeWidth="12" strokeDasharray={553} strokeDashoffset={553 - (553 * topicResource.masteryLevel) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" className="text-indigo-600 transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">{topicResource.masteryLevel}%</span>
              <span className="text-[10px] font-black text-slate-400 uppercase mt-1">Topic Mastery</span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 w-full">
            <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
              <div className="text-lg font-black text-slate-900">{topicResource.questionsAttempted}</div>
              <div className="text-[9px] font-black text-slate-400 uppercase">Attempted</div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
              <div className="text-lg font-black text-emerald-600">{topicResource.questionsCorrect}</div>
              <div className="text-[9px] font-black text-slate-400 uppercase">Correct</div>
            </div>
          </div>
        </div>

        {/* Middle/Right: History & Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detailed History List */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <History size={14} className="text-slate-900" />
                Mission History
              </h3>
              <div className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Latest 10 Attempts
              </div>
            </div>

            <div className="flex-1 space-y-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-4 animate-in fade-in duration-700">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg border border-white/5 relative">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-xl animate-ping" />
                    <History size={20} className="text-blue-400 animate-pulse relative z-10" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse italic">Looking at Your Progress...</p>
                </div>
              ) : pastQuizzes.length > 0 ? (
                <div className="overflow-y-auto max-h-[400px] pr-2 scroller-hide space-y-2">
                  {pastQuizzes.map((quiz, idx) => (
                    <div
                      key={quiz.id || idx}
                      className="group p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-200 rounded-2xl transition-all duration-300 flex items-center justify-between shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98]"
                      onClick={() => setReviewQuiz?.(quiz)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black transition-colors ${quiz.percentage >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          quiz.percentage >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                          <span className="text-sm">{quiz.percentage}%</span>
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 flex items-center gap-2 mb-1">
                            {quiz.score}/{quiz.totalQuestions} Questions Correct
                            {quiz.percentage >= 80 && <Trophy size={10} className="text-amber-500 fill-amber-500" />}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(quiz.createdAt).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock size={10} /> {quiz.durationMinutes || 0} min</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-23xl flex items-center justify-center">
                    <History size={32} className="text-slate-200" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-900 uppercase italic">Empty Sector</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px]">Complete your first simulation to initialize your progress log.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] -mr-16 -mt-16" />
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles size={14} /> Agentic Recommendation
            </h3>
            <p className="text-white text-sm font-medium leading-relaxed mb-6">
              {topicResource.masteryLevel < 50
                ? `System detects fundamental gaps in ${topicResource.topicName}. PRIORITY: Review syllabus documentation and complete 5 foundational practice sets.`
                : topicResource.masteryLevel < 85
                  ? `Current mastery is stable but optimization is required. PRIORITY: Initiate "Adaptive Quiz" mode to target moderate-to-hard latent concepts.`
                  : `Elite stage reached. PRIORITY: Maintenance sync every 72 hours and challenge peer-level advanced questions to sustain 90%+ percentile.`}
            </p>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-white uppercase group cursor-pointer hover:bg-white/10 transition-all">Deep Dive Analysis</div>
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-white uppercase group cursor-pointer hover:bg-white/10 transition-all">Curated Weak areas</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicDetailPage;
