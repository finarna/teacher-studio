import React, { useState, useEffect } from 'react';
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
  PlayCircle
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { safeAiParse } from '../utils/aiParser';
import type { TopicResource, Subject, ExamContext, AnalyzedQuestion } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from './AuthProvider';
import { RenderWithMath } from './MathRenderer';
import PracticeSolutionModal from './PracticeSolutionModal';
import PracticeInsightsModal from './PracticeInsightsModal';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { motion, AnimatePresence } from 'framer-motion';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';
import { supabase } from '../lib/supabase';
import { cache } from '../utils/cache';
import { useLearningJourney } from '../contexts/LearningJourneyContext';

interface TopicDetailPageProps {
  topicResource: TopicResource;
  subject: Subject;
  examContext: ExamContext;
  onBack: () => void;
  onStartQuiz: (topicId: string, totalQuestions?: number) => void;
  onRefreshData?: (silent?: boolean) => void;
}

type TabType = 'learn' | 'practice' | 'quiz' | 'flashcards' | 'progress';

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
    setStatsRefreshTrigger(prev => prev + 1);
    onRefreshData?.(silent);
    handleRefresh(silent); // Trigger refresh of subject progress as well
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
          console.log('📡 [HeaderStats] Fetched latest:', data);
          setLocalStats({
            masteryLevel: data.mastery_level || 0,
            averageAccuracy: data.average_accuracy || 0,
            quizzesTaken: data.quizzes_taken || 0,
            studyStage: data.study_stage || 'not_started',
            notesCompleted: data.notes_completed || false
          });
        }
      } catch (err) { }
    };
    fetchLatestStats();
  }, [user, activeTab, topicResource.topicId, examContext, statsRefreshTrigger]);

  // Shared questions state that persists across tab switches
  const [sharedQuestions, setSharedQuestions] = useState<AnalyzedQuestion[]>(topicResource.questions || []);
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Unified question loading in parent to ensure availability across all tabs
  useEffect(() => {
    const loadQuestionsFromDB = async () => {
      if (!user?.id || !topicResource.topicName) return;
      setIsLoadingQuestions(true);
      try {
        console.log(`🔍 [TopicDetailPage] Loading questions for topic: ${topicResource.topicName}`);

        // Step 1: Find placeholder scans for AI practice
        const { data: scans, error: scansError } = await supabase
          .from('scans')
          .select('id')
          .eq('user_id', user.id)
          .filter('metadata->>is_ai_practice_placeholder', 'eq', 'true')
          .eq('subject', subject);

        if (scansError) throw scansError;
        const scanIds = scans?.map(s => s.id) || [];

        // Step 2: Fetch questions belonging to these scans and this topic
        let allLoadedQuestions = [...(topicResource.questions || [])];

        if (scanIds.length > 0) {
          const { data: aiQuestions, error } = await supabase
            .from('questions')
            .select('*')
            .eq('subject', subject)
            .eq('exam_context', examContext)
            .eq('topic', topicResource.topicName)
            .in('scan_id', scanIds);

          if (error) throw error;

          if (aiQuestions && aiQuestions.length > 0) {
            const formattedAIQuestions: AnalyzedQuestion[] = aiQuestions.map(q => ({
              ...q,
              id: q.id,
              text: q.text,
              difficulty: q.difficulty as 'Easy' | 'Moderate' | 'Hard',
              correctOptionIndex: q.correct_option_index,
              bloomsTaxonomy: q.blooms,
              studyTip: q.exam_tip,
              keyConcepts: q.mastery_material?.keyConcepts || [],
              commonMistakes: q.mastery_material?.commonMistakes || [],
              keyFormulas: q.key_formulas || [],
              thingsToRemember: q.key_formulas || [],
              aiReasoning: q.mastery_material?.aiReasoning || '',
              historicalPattern: q.mastery_material?.historicalPattern || '',
              predictiveInsight: q.mastery_material?.predictiveInsight || '',
              whyItMatters: q.mastery_material?.whyItMatters || '',
              relevanceScore: q.mastery_material?.relevanceScore || 70,
              markingSteps: q.mastery_material?.markingSteps || []
            }));

            // Merge with existing
            const existingIds = new Set(allLoadedQuestions.map(q => q.id));
            const uniqueNew = formattedAIQuestions.filter(q => !existingIds.has(q.id));
            allLoadedQuestions = [...allLoadedQuestions, ...uniqueNew];
          }
        }

        setSharedQuestions(allLoadedQuestions);
        setTotalQuestionsIncludingAI(allLoadedQuestions.length);
      } catch (err) {
        console.error('❌ [TopicDetailPage] Failed to load questions:', err);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestionsFromDB();
  }, [user?.id, topicResource.topicId, topicResource.topicName, subject, examContext]);

  const tabs = [
    { id: 'learn' as TabType, label: 'Learn', icon: BookOpen, accent: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'practice' as TabType, label: 'Solve', icon: Zap, accent: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'quiz' as TabType, label: 'Mastery', icon: Target, accent: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'flashcards' as TabType, label: 'Recall', icon: Brain, accent: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'progress' as TabType, label: 'Stats', icon: BarChart3, accent: 'text-indigo-500', bg: 'bg-indigo-50' }
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
        <div className="flex flex-col items-start w-full bg-white backdrop-blur-md rounded-[1.5rem] p-4 border border-slate-200/60 shadow-sm gap-4 mt-4">

          {/* Top: Tab Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/50 w-full overflow-x-auto scroller-hide">
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
          <div className="flex items-center justify-between w-full overflow-x-auto scroller-hide gap-6 md:gap-8 px-2">
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
              <div key={i} className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col">
                  <span className="text-xl font-black text-slate-900 font-outfit leading-none mb-1">{s.val}</span>
                  <div className="flex items-center gap-1.5">
                    <s.icon size={14} className={s.color} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                    {s.tooltip && (
                      <div className="group relative">
                        <Info size={12} className="text-slate-300 hover:text-slate-500 transition-colors cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[100] shadow-2xl border border-white/10 backdrop-blur-xl">
                          <div className="relative z-10">
                            {s.tooltip}
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {i < 3 && <div className="h-8 w-px bg-slate-200 ml-4 md:ml-6 hidden sm:block" />}
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
                topicResource={topicResource}
                subject={subject}
                examContext={examContext}
                onProgressUpdate={refreshStats}
                poolCount={totalQuestionsIncludingAI}
              />
            )}
            {activeTab === 'practice' && (
              <PracticeTab
                topicResource={topicResource}
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
                topicResource={topicResource}
                subject={subject}
                examContext={examContext}
                sharedQuestions={sharedQuestions}
                setSharedQuestions={setSharedQuestions}
                onProgressUpdate={refreshStats}
                poolCount={totalQuestionsIncludingAI}
                onStartQuiz={onStartQuiz}
              />
            )}
            {activeTab === 'flashcards' && (
              <FlashcardsTab
                topicResource={topicResource}
                sharedQuestions={sharedQuestions}
              />
            )}
            {activeTab === 'progress' && <ProgressTab topicResource={topicResource} />}
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
        const selectedModel = 'gemini-3-flash-preview';
        const model = genAI.getGenerativeModel({
          model: selectedModel,
          generationConfig: { responseMimeType: "application/json" }
        });

        // Topic-specific context
        const topicContext = `Focus EXCLUSIVELY on topic: "${topicResource.topicName}" for ${subject} ${examContext} exam.`;

        // EXACT PROMPT from VisualQuestionBank (adapted for topic)
        const prompt = `Generate ${generateCount} ${subject} MCQ questions for ${examContext} syllabus on "${topicResource.topicName}".
        Return ONLY valid JSON with a "questions" array containing id, text, options, correctOptionIndex, explanation, topic, domain, difficulty.`;

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
            solutionSteps: (q.solutionSteps || q.markingScheme)?.map((s: any) => `${s.step}`) || [],
            markingSteps: q.solutionSteps || q.markingScheme || [],
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
        const questionsToInsert = formatted.map(q => ({
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
          year: q.year,
          subject: subject,
          exam_context: examContext,
          pedagogy: q.pedagogy,
          // Map AI fields to existing columns
          solution_steps: q.solutionSteps,
          exam_tip: q.studyTip,
          visual_concept: q.visualConcept,
          key_formulas: q.thingsToRemember,
          pitfalls: q.commonMistakes,
          has_visual_element: q.hasVisualElement || false,
          visual_element_description: q.visualElementDescription,
          // Store remaining AI data in mastery_material JSONB column
          mastery_material: {
            keyConcepts: q.keyConcepts,
            aiReasoning: q.aiReasoning,
            historicalPattern: q.historicalPattern,
            predictiveInsight: q.predictiveInsight,
            whyItMatters: q.whyItMatters,
            relevanceScore: q.relevanceScore,
            markingSteps: q.markingSteps // Keep original steps in JSONB just in case
          }
        }));

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
                            {q.diff && (
                              <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] px-1.5 md:px-2 py-0.5 rounded-md border ${q.diff === 'Hard' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                q.diff === 'Moderate' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                  'bg-emerald-50 text-emerald-600 border-emerald-100'
                                } font-outfit shadow-sm whitespace-nowrap`}>{q.diff}</span>
                            )}
                            <div className="hidden md:flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-outfit px-1 whitespace-nowrap">Sync</span>
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
                            const hasCorrectAnswer = q.correctOptionIndex !== undefined;
                            const isCorrectChoice = hasCorrectAnswer && q.correctOptionIndex === idx;
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
            />
          )
        }

        {
          insightsModalQuestion && (
            <PracticeInsightsModal
              question={insightsModalQuestion}
              onClose={() => setInsightsModalQuestion(null)}
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
}> = ({
  topicResource,
  subject,
  examContext,
  sharedQuestions,
  setSharedQuestions,
  onProgressUpdate,
  poolCount,
  onStartQuiz
}) => {
    const { user } = useAuth();
    const { isLoading: isTestGenerating } = useLearningJourney();
    const [isGenerating, setIsGenerating] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [questionCount, setQuestionCount] = useState<number>(10);

    // Quiz state
    const [isQuizActive, setIsQuizActive] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<Map<number, number>>(new Map());
    const [showResults, setShowResults] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
    const [quizSaved, setQuizSaved] = useState(false);

    // Past quizzes
    const [pastQuizzes, setPastQuizzes] = useState<any[]>([]);
    const [showPastQuizzes, setShowPastQuizzes] = useState(false);
    const [loadingPastQuizzes, setLoadingPastQuizzes] = useState(false);

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
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '');
        }
        return JSON.parse(jsonText.trim());
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

        let difficultyDistribution = masteryLevel < 30 ? "70% Easy, 25% Medium, 5% Hard" :
          masteryLevel < 60 ? "30% Easy, 50% Medium, 20% Hard" :
            "10% Easy, 40% Medium, 50% Hard";

        const weakConcepts = topicQuestions
          .filter(q => q.userAttempted && q.userCorrect === false)
          .slice(0, 3)
          .map(q => q.concept || q.topic)
          .filter(Boolean);

        const selectedModel = localStorage.getItem('gemini_model') || 'gemini-3-flash-preview';
        const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: selectedModel,
          generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `You are an expert ${subject} teacher creating an ADAPTIVE MCQ quiz for ${examContext} students on "${topicResource.topicName}".
            The quiz should strictly follow the ${examContext} syllabus and overall topic guidelines.
            
            CONTEXT FROM EXISTING PRACTICE QUESTIONS:
            ${topicQuestions.slice(0, 5).map(q => `- ${q.text}`).join('\n')}
            
            Generate ${questionCount} high-quality MCQ questions with this difficulty distribution: ${difficultyDistribution}.
            - Ensure questions are distinct but complementary to the practice questions listed above.
            - Cover latent concepts within the syllabus of ${topicResource.topicName} that might be missing in basic practice.
            - Return ONLY valid JSON array with id, question, options, correctIndex, explanation, concept, topic, domain, difficulty.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const parsed = parseGeminiJSON(response.text() || "[]");

        if (Array.isArray(parsed)) {
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
        }
      } catch (error) {
        console.error('Quiz generation error:', error);
        alert('Failed to generate quiz. Fallback: using practice questions.');
        if (sharedQuestions && sharedQuestions.length > 0) {
          setQuizQuestions(sharedQuestions.slice(0, questionCount));
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
          explanation: q.explanation || ''
        }));

        await supabase.from('quiz_attempts').insert({
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

    const loadPastQuizzes = async () => {
      if (!user) return;
      setLoadingPastQuizzes(true);
      try {
        // New quiz flow saves to test_attempts (not the old quiz_attempts table)
        const { data, error } = await supabase
          .from('test_attempts')
          .select('id, created_at, percentage, raw_score, total_questions, duration_minutes, status, topic_id, subject, exam_context')
          .eq('user_id', user.id)
          .eq('topic_id', topicResource.topicId)
          .eq('test_type', 'topic_quiz')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        // Map snake_case → camelCase for UI consistency
        setPastQuizzes((data || []).map(q => ({
          id: q.id,
          createdAt: q.created_at,
          percentage: q.percentage,
          score: q.raw_score,
          totalQuestions: q.total_questions,
          durationMinutes: q.duration_minutes,
          status: q.status,
        })));
      } catch (err) {
        console.error('Error loading quizzes:', err);
      } finally {
        setLoadingPastQuizzes(false);
      }
    };

    // Save quiz when results are shown
    useEffect(() => {
      if (showResults && isQuizActive && !quizSaved) {
        saveQuizAttempt();
      }
    }, [showResults, isQuizActive, quizSaved]);

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
                const isCorrect = userAnswer === q.correctIndex;

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
                            const isCorrectOpt = q.correctIndex === optIdx;

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
                              {String.fromCharCode(65 + q.correctIndex)}
                            </div>
                            <div className="text-sm font-medium text-emerald-800 mt-1">
                              <RenderWithMath text={q.options[q.correctIndex]} showOptions={false} serif={false} />
                            </div>
                          </div>
                        </div>

                        {/* Explanation Section */}
                        {q.explanation && (
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

                        {/* Your Wrong Answer */}
                        {!isCorrect && (
                          <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle size={14} className="text-amber-600" />
                              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Your Answer</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center font-black text-xs text-white">
                                {String.fromCharCode(65 + userAnswer!)}
                              </div>
                              <div className="text-xs font-medium text-amber-800">
                                <RenderWithMath text={q.options[userAnswer!]} showOptions={false} serif={false} />
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

    // Main Quiz Setup Screen
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Inline Quiz Stats - Single Line */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl px-6 py-4 shadow-sm gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Brain size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black text-blue-900 uppercase tracking-tight font-outfit">Adaptive Quiz</span>
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">Focus Mode</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider font-outfit shadow-sm">
              {topicResource.masteryLevel}% mastery
            </span>
            <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider font-outfit shadow-sm">✓ {topicResource.masteryLevel < 30 ? '70% Easy' : topicResource.masteryLevel < 60 ? '50% Med' : '50% Hard'}</span>
            <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider font-outfit shadow-sm">✓ Weak areas</span>
            <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider font-outfit shadow-sm hidden md:inline-flex">✓ Tips</span>
          </div>
        </div>

        {/* Compact Quiz Controls */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm p-2 md:p-2.5 md:pl-8 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4 md:gap-6 xl:gap-8">
            {/* Label */}
            <div className="text-sm font-black text-[#0B1528] whitespace-nowrap font-outfit self-start md:self-auto px-2 md:px-0 pt-2 md:pt-0 shrink-0">
              Questions: <span className="text-blue-600">{questionCount}</span>
            </div>

            {/* Slider Track */}
            <div className="flex-1 flex items-center gap-4 md:gap-6 w-full md:w-auto pr-2 md:pr-0">
              <input
                type="range"
                min="5"
                max="20"
                step="5"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="flex-1 accent-[#0B1528] h-[5px] bg-slate-200 rounded-lg cursor-pointer appearance-auto"
              />
              <div className="flex gap-2 md:gap-3 text-[10px] text-slate-400 font-bold whitespace-nowrap tracking-wider hidden sm:flex shrink-0">
                <span>5</span>
                <span className="text-slate-200">•</span>
                <span>10</span>
                <span className="text-slate-200">•</span>
                <span>15</span>
                <span className="text-slate-200">•</span>
                <span>20</span>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateQuiz}
              disabled={isGenerating}
              className="px-6 py-2.5 bg-[#0B1528] text-white rounded-[2rem] font-black hover:bg-[#15233D] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md text-xs uppercase tracking-wider font-outfit shrink-0 w-full md:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Zap size={16} className="fill-transparent" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Start Quiz Card - Compact */}
        {quizQuestions.length > 0 && (
          <div className="bg-[#0B1528] rounded-[2.5rem] p-4 md:p-4 md:pl-6 flex flex-col md:flex-row items-center justify-between shadow-2xl gap-4 border border-white/10 ring-4 ring-slate-900/5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0 shadow-inner">
                <Play size={20} className="text-emerald-400 fill-emerald-400 ml-1" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="text-lg font-black text-white font-outfit uppercase tracking-wider leading-tight mb-0.5">
                  {quizQuestions.length} Questions Ready
                </div>
                <div className="text-xs text-white/40 font-black uppercase tracking-widest leading-none">
                  ADAPTIVE SYNAPSE ACTIVE
                </div>
              </div>
            </div>
            <button
              onClick={startQuiz}
              className="px-10 py-4 bg-emerald-500 text-white rounded-full font-black hover:bg-emerald-600 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20 text-xs uppercase tracking-widest font-outfit w-full md:w-auto shrink-0 md:mr-2"
            >
              <Zap size={14} className="fill-white" />
              <span>Launch Session</span>
            </button>
          </div>
        )}

        {/* Exam Protocol Simulation Mode (Matching Mobile) */}
        <div className="bg-white border-2 border-slate-900/5 rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-slate-900 rounded-xl">
                <Target size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 font-outfit uppercase italic tracking-tighter">Exam Protocol</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Standard Simulation Mode</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 font-bold max-w-md leading-relaxed">
              Full-spectrum simulation proctored for performance calibration. Fixed duration, no hints, absolute evaluation.
            </p>
          </div>
          <button
            onClick={() => !isTestGenerating && onStartQuiz?.(topicResource.topicId)}
            disabled={isTestGenerating}
            className={`px-10 py-5 rounded-full font-black uppercase tracking-[0.15em] text-[10px] transition-all flex items-center justify-center gap-3 shadow-2xl shrink-0 w-full md:w-auto ${isTestGenerating
              ? 'bg-primary-600 text-white cursor-not-allowed opacity-80 scale-[0.98]'
              : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
              }`}
          >
            {isTestGenerating ? (
              <><Loader2 size={18} className="animate-spin" /> AI Generating…</>
            ) : (
              <><PlayCircle size={20} /> Initialize Simulation</>
            )}
          </button>
        </div>


        {/* Past Quizzes Section */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm p-4 md:p-5 md:px-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm text-[#0B1528] flex items-center gap-2 font-outfit tracking-wide">
              <History size={16} />
              Past Quizzes
            </h3>
            <button
              onClick={() => {
                setShowPastQuizzes(!showPastQuizzes);
                if (!showPastQuizzes && pastQuizzes.length === 0) {
                  loadPastQuizzes();
                }
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200 px-6 py-2.5 rounded-full transition-colors uppercase tracking-wider font-outfit"
            >
              {showPastQuizzes ? 'Hide' : 'View All'}
            </button>
          </div>

          {showPastQuizzes && (
            <>
              {loadingPastQuizzes ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                </div>
              ) : pastQuizzes.length > 0 ? (
                <div className="space-y-1.5">
                  {pastQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded flex items-center justify-center font-black text-xs ${(quiz.percentage ?? 0) >= 80
                            ? 'bg-green-100 text-green-700'
                            : (quiz.percentage ?? 0) >= 60
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                            }`}>
                            {quiz.percentage ?? 0}%
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-900">
                              {quiz.score ?? '?'}/{quiz.totalQuestions ?? '?'} correct
                            </div>
                            <div className="text-[9px] text-slate-500">
                              {new Date(quiz.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock size={10} />
                          {quiz.durationMinutes ?? '?'} min
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-[11px] text-slate-500">
                  No past quizzes yet. Complete a quiz to see your history here.
                </div>
              )}
            </>
          )}
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
  const [cards, setCards] = useState(topicResource.flashcards || []);

  const hasCards = cards.length > 0;

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
      const model = genAI.getGenerativeModel({ model: selectedModel });
      const prompt = `Create 12-15 comprehensive flashcards for ${topicResource.topicName} (${topicResource.subject}). Return JSON array with term, definition, context. Use $ $ for math.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();
      if (text.startsWith('```json')) text = text.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        setCards(parsed);
        setCurrentCard(0);
        setIsFlipped(false);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate.');
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

              {/* Card Back - Dark, Tech-Focused Analysis */}
              <div className="absolute inset-0 backface-hidden bg-slate-900 rounded-3xl p-8 shadow-2xl flex flex-col border-2 border-slate-700 overflow-hidden rotate-y-180">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-cyan-400" />
                <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto px-4 scroller-hide">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-6 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 shadow-sm font-outfit">INTELLIGENCE SYNOPSIS</div>
                  <div className="text-sm md:text-base font-bold text-slate-100 leading-relaxed text-center">
                    <RenderWithMath text={cards[currentCard].definition} showOptions={false} dark={true} />
                  </div>
                  {cards[currentCard].context && (
                    <div className="mt-6 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Context: <span className="text-emerald-400">{cards[currentCard].context}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-center">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">RapidRecall System v2.0</div>
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
const ProgressTab: React.FC<{ topicResource: TopicResource }> = ({ topicResource }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* High-Intelligence Status Header */}
      <div className="bg-slate-900 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] -mr-16 -mt-16" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-indigo-500/20">
            <BarChart3 size={20} className="text-indigo-400" />
          </div>
          <div>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Performance Intelligence</div>
            <div className="text-base font-black text-white">Advanced Learning Analytics</div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="px-4 py-1.5 bg-white/5 rounded-xl border border-white/10 text-center">
            <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Current Standing</div>
            <div className="text-sm font-black text-indigo-400">{topicResource.masteryLevel >= 80 ? 'Master' : topicResource.masteryLevel >= 50 ? 'Proficient' : 'Novice'} Stage</div>
          </div>
        </div>
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

        {/* Middle/Right: Deep Insights & Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Strategic Intelligence</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Precision Rating', val: `${topicResource.averageAccuracy.toFixed(0)}%`, icon: Target, color: 'text-rose-500', bg: 'bg-rose-50', desc: 'Accuracy on first attempts across all papers' },
                { label: 'Latency Score', val: 'Low', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Average response time per intelligence node' },
                { label: 'Consistency', val: 'High', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Sustained performance over previous 5 sessions' },
                { label: 'Last Sync', val: topicResource.lastPracticed ? new Date(topicResource.lastPracticed).toLocaleDateString() : 'Never', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Time elapsed since last syllabus interaction' }
              ].map((insight, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
                  <div className={`w-12 h-12 ${insight.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <insight.icon size={20} className={insight.color} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{insight.label}</div>
                    <div className="text-lg font-black text-slate-900 mb-1">{insight.val}</div>
                    <div className="text-[9px] text-slate-500 font-medium leading-tight">{insight.desc}</div>
                  </div>
                </div>
              ))}
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
