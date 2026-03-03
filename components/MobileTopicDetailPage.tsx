import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    BookOpen,
    Zap,
    Target,
    Brain,
    BarChart3,
    Trophy,
    FileQuestion,
    Info,
    Clock,
    ChevronRight,
    ChevronLeft as ChevronLeftIcon,
    Menu,
    Activity,
    TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TopicResource, Subject, ExamContext, AnalyzedQuestion } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';
import { RenderWithMath } from './MathRenderer';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { useLearningJourney } from '../contexts/LearningJourneyContext';

import { MobilePracticeTab, MobileLearnTab, MobileQuizTab, MobileFlashcardsTab, MobileProgressTab } from './MobileTopicComponents';

interface TopicDetailPageProps {
    topicResource: TopicResource;
    subject: Subject;
    examContext: ExamContext;
    onBack: () => void;
    onStartQuiz: (topicId: string, totalQuestions?: number) => void;
    onRefreshData?: (silent?: boolean) => void;
}

type TabType = 'learn' | 'practice' | 'quiz' | 'flashcards' | 'progress';

const MobileTopicDetailPage: React.FC<TopicDetailPageProps> = ({
    topicResource,
    subject,
    examContext,
    onBack,
    onStartQuiz,
    onRefreshData
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('learn');
    const [totalQuestionsIncludingAI, setTotalQuestionsIncludingAI] = useState(topicResource.totalQuestions);
    const { user } = useAuth();
    const { refreshData, subjectProgress } = useLearningJourney();
    const subProg = subjectProgress?.[subject];
    const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

    const [localStats, setLocalStats] = useState({
        masteryLevel: topicResource.masteryLevel || 0,
        averageAccuracy: topicResource.averageAccuracy || 0,
        quizzesTaken: topicResource.quizzesTaken || 0,
        studyStage: topicResource.studyStage || 'not_started',
        notesCompleted: topicResource.notesCompleted || false
    });

    const [sharedQuestions, setSharedQuestions] = useState<AnalyzedQuestion[]>([]);
    const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
    const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);

    const [pastQuizzes, setPastQuizzes] = useState<any[]>([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(false);
    const [reviewQuiz, setReviewQuiz] = useState<any>(null);

    useEffect(() => {
        const fetchLatestStats = async () => {
            if (!user) return;
            try {
                // Fetch Stats
                const { data } = await supabase
                    .from('topic_resources')
                    .select('mastery_level, average_accuracy, quizzes_taken, study_stage, notes_completed')
                    .eq('user_id', user.id)
                    .eq('topic_id', topicResource.topicId)
                    .eq('exam_context', examContext)
                    .maybeSingle();

                if (data) {
                    setLocalStats({
                        masteryLevel: data.mastery_level || 0,
                        averageAccuracy: data.average_accuracy || 0,
                        quizzesTaken: data.quizzes_taken || 0,
                        studyStage: data.study_stage || 'not_started',
                        notesCompleted: data.notes_completed || false
                    });
                }

                // Fetch Quizzes from BOTH quiz_attempts AND test_attempts
                setLoadingQuizzes(true);

                try {
                    // Helper to fetch test_responses for a test_attempt
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

                            if (error) return null;

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
                            return null;
                        }
                    };

                    const [quizAttemptsResult, testAttemptsResult] = await Promise.all([
                        // 1. Quiz attempts (desktop inline quizzes)
                        supabase
                            .from('quiz_attempts')
                            .select('*')
                            .eq('user_id', user.id)
                            .eq('topic_name', topicResource.topicName)
                            .eq('exam_context', examContext)
                            .order('created_at', { ascending: false })
                            .limit(10),

                        // 2. Test attempts (API-based quizzes)
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
                            id: q.id,
                            created_at: q.created_at,
                            accuracy_percentage: q.accuracy_percentage,
                            correct_count: q.correct_count,
                            question_count: q.question_count,
                            time_spent_seconds: q.time_spent_seconds,
                            status: 'completed',
                            questionsData: q.questions_data,
                            questions_data: q.questions_data,
                            source: 'quiz_attempts'
                        }));
                        allQuizzes.push(...mapped);
                    }

                    // Process test_attempts - FETCH QUESTIONS TOO
                    if (testAttemptsResult.data && testAttemptsResult.data.length > 0) {
                        const testAttemptsWithQuestions = await Promise.all(
                            testAttemptsResult.data.map(async (q) => {
                                const questionsData = await fetchTestResponses(q.id);
                                return {
                                    id: q.id,
                                    created_at: q.created_at,
                                    accuracy_percentage: q.percentage || 0,
                                    correct_count: q.raw_score || 0,
                                    question_count: q.total_questions || 0,
                                    time_spent_seconds: (q.duration_minutes || 0) * 60,
                                    status: q.status,
                                    source: 'test_attempts',
                                    questionsData: questionsData,
                                    questions_data: questionsData
                                };
                            })
                        );
                        allQuizzes.push(...testAttemptsWithQuestions);
                    }

                    // Sort by date (most recent first)
                    allQuizzes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                    console.log(`📱 [Mobile] History loaded: ${allQuizzes.length} quizzes (${quizAttemptsResult.data?.length || 0} from quiz_attempts, ${testAttemptsResult.data?.length || 0} from test_attempts)`);

                    setPastQuizzes(allQuizzes.slice(0, 10));
                } catch (err) {
                    console.error('Error fetching past quizzes:', err);
                    setPastQuizzes([]);
                }
                setLoadingQuizzes(false);

            } catch (err) { }
        };
        fetchLatestStats();
    }, [user, activeTab, topicResource.topicId, examContext, statsRefreshTrigger]);

    const refreshStats = (silent: boolean = true) => {
        setStatsRefreshTrigger(prev => prev + 1);
        onRefreshData?.(silent);
        refreshData(silent);
    };

    const tabs = [
        { id: 'learn' as TabType, label: 'Learn', icon: BookOpen },
        { id: 'practice' as TabType, label: 'Solve', icon: Zap },
        { id: 'quiz' as TabType, label: 'Mastery', icon: Target },
        { id: 'flashcards' as TabType, label: 'Recall', icon: Brain },
        { id: 'progress' as TabType, label: 'History', icon: BarChart3 }
    ];

    React.useEffect(() => {
        console.log('📱 [MobileTopicDetailPage] Active tab:', activeTab, '| Past quizzes:', pastQuizzes.length);
    }, [activeTab, pastQuizzes.length]);

    const subjectConfig = SUBJECT_CONFIGS[subject];

    // Mobile optimized Retroactive Analysis view
    const renderRetroactiveAnalysis = () => {
        if (!reviewQuiz) return null;
        const rawQData = reviewQuiz.questionsData || reviewQuiz.questions_data || [];
        const qData = typeof rawQData === 'string' ? JSON.parse(rawQData) : rawQData;

        console.log('📱 [Mobile Review] Quiz data:', { rawQData: typeof rawQData, qDataLength: qData?.length, reviewQuiz });

        return (
            <motion.div
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                className="fixed inset-0 z-[200] bg-white flex flex-col"
            >
                <div className="bg-slate-900 px-6 py-8 text-white relative flex flex-col gap-4">
                    <button
                        onClick={() => setReviewQuiz(null)}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center absolute left-4 top-4"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="mt-6">
                        <h3 className="text-xl font-black font-outfit uppercase italic tracking-tighter">Retroactive Analysis</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                {new Date(reviewQuiz.createdAt || reviewQuiz.created_at).toLocaleDateString()}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">
                                {reviewQuiz.accuracyPercentage || reviewQuiz.accuracy_percentage || 0}% Mastery
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-2">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
                            <span className="text-2xl font-black font-mono leading-none">
                                {reviewQuiz.correctCount || reviewQuiz.correct_count || 0}/{reviewQuiz.questionCount || reviewQuiz.question_count || 0}
                            </span>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Correct Units</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
                            <span className="text-2xl font-black font-mono leading-none">
                                {Math.floor((reviewQuiz.timeSpentSeconds || reviewQuiz.time_spent_seconds || 0) / 60)}m
                            </span>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Duration</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scroller-hide bg-slate-50 pb-20">
                    <div className="p-4 space-y-4">
                        {qData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                    <Brain size={32} className="text-slate-300" />
                                </div>
                                <p className="text-sm font-black text-slate-900 uppercase">No Question Data</p>
                                <p className="text-xs text-slate-400 max-w-[200px]">Question details are not available for this quiz.</p>
                            </div>
                        ) : qData.map((q: any, idx: number) => (
                            <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[9px] font-black uppercase tracking-widest">Q{idx + 1}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${q.difficulty === 'Hard' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                            q.difficulty === 'Moderate' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            }`}>
                                            {q.difficulty}
                                        </span>
                                    </div>
                                    {q.isCorrect ? (
                                        <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                            Correct
                                        </span>
                                    ) : (
                                        <span className="text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                            Missed
                                        </span>
                                    )}
                                </div>

                                <div className="text-lg font-bold text-slate-800 leading-snug quiz-question-text">
                                    <RenderWithMath text={q.question} />
                                </div>

                                <div className="space-y-2">
                                    {q.options.map((opt: string, optIdx: number) => {
                                        const isCorrect = optIdx === q.correctIndex;
                                        const isUserAnswer = optIdx === q.userAnswer;
                                        return (
                                            <div
                                                key={optIdx}
                                                className={`p-4 rounded-2xl border-2 flex items-center gap-3 ${isCorrect ? 'bg-emerald-50 border-emerald-300' :
                                                    isUserAnswer && !isCorrect ? 'bg-rose-50 border-rose-300' :
                                                        'bg-white border-slate-100'
                                                    }`}
                                            >
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${isCorrect ? 'bg-emerald-600 text-white' :
                                                    isUserAnswer && !isCorrect ? 'bg-rose-600 text-white' :
                                                        'bg-slate-100 text-slate-400'
                                                    }`}>
                                                    {String.fromCharCode(65 + optIdx)}
                                                </div>
                                                <div className={`text-base font-semibold leading-relaxed ${isCorrect ? 'text-emerald-900' : isUserAnswer ? 'text-rose-900' : 'text-slate-500'}`} style={{ fontSize: '1rem' }}>
                                                    <div className="quiz-option-math">
                                                        <RenderWithMath text={opt} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-4 border-t border-slate-50 space-y-3">
                                    <div className="flex items-center gap-2 text-blue-600">
                                        <Brain size={16} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Protocol Insight</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-5">
                                        {q.solutionSteps && (
                                            <div className="space-y-3">
                                                {q.solutionSteps.map((step: string, sIdx: number) => (
                                                    <div key={sIdx} className="flex gap-3 items-start">
                                                        <span className="w-5 h-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{sIdx + 1}</span>
                                                        <div className="text-sm font-semibold text-slate-700 leading-relaxed quiz-solution-step">
                                                            <RenderWithMath text={step} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {q.examTip && (
                                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200 shadow-md">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                                                        <Zap size={16} className="text-white" />
                                                    </div>
                                                    <span className="text-xs font-black text-amber-700 uppercase tracking-wider">Strategy</span>
                                                    <div className="h-0.5 flex-1 bg-amber-200 rounded-full"></div>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-900 leading-relaxed pl-1">"{q.examTip}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-100">
                    <button
                        onClick={() => setReviewQuiz(null)}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl"
                    >
                        Exit Analysis
                    </button>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-full bg-[#F8FAFC] flex flex-col">
            <LearningJourneyHeader
                showBack
                onBack={onBack}
                title={topicResource.topicName}
                subtitle={`${subject} • ${activeTab === 'practice' ? 'SOLVE QUEST' : activeTab === 'quiz' ? 'SIMULATION' : 'MISSION MODE'}`}
                subject={subject}
                trajectory={examContext}
                mastery={localStats.masteryLevel}
                accuracy={localStats.averageAccuracy}
            />

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto scroller-hide pb-24">
                <div className="px-6 py-4">
                    {/* Quick Metrics Bar Mobile */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                            <p className="text-[20px] font-black text-slate-900 leading-none">{localStats.averageAccuracy.toFixed(0)}%</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Accuracy</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                            <p className="text-[20px] font-black text-slate-900 leading-none">{totalQuestionsIncludingAI}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Pool</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                            <p className="text-[20px] font-black text-slate-900 leading-none">{localStats.quizzesTaken}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Tests</p>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.15 }}
                            className="min-h-full"
                        >
                            {activeTab === 'learn' && (
                                <MobileLearnTab
                                    topicResource={topicResource}
                                    subject={subject}
                                    examContext={examContext}
                                    onProgressUpdate={refreshStats}
                                    poolCount={totalQuestionsIncludingAI}
                                />
                            )}
                            {activeTab === 'practice' && (
                                <MobilePracticeTab
                                    topicResource={topicResource}
                                    subject={subject}
                                    examContext={examContext}
                                    onQuestionCountChange={setTotalQuestionsIncludingAI}
                                    sharedQuestions={sharedQuestions}
                                    setSharedQuestions={setSharedQuestions}
                                    onProgressUpdate={refreshStats}
                                />
                            )}
                            {activeTab === 'quiz' && (
                                <MobileQuizTab
                                    topicResource={topicResource}
                                    subject={subject}
                                    examContext={examContext}
                                    onStartQuiz={onStartQuiz}
                                    sharedQuestions={sharedQuestions}
                                    setSharedQuestions={setSharedQuestions}
                                    onProgressUpdate={refreshStats}
                                    setReviewQuiz={setReviewQuiz}
                                />
                            )}
                            {activeTab === 'flashcards' && (
                                <MobileFlashcardsTab
                                    topicResource={topicResource}
                                    sharedQuestions={sharedQuestions}
                                />
                            )}
                            {activeTab === 'progress' && (
                                <MobileProgressTab
                                    topicResource={{ ...topicResource, ...localStats }}
                                    pastQuizzes={pastQuizzes}
                                    isLoadingQuizzes={loadingQuizzes}
                                    setReviewQuiz={setReviewQuiz}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <AnimatePresence>
                {reviewQuiz && renderRetroactiveAnalysis()}
            </AnimatePresence>

            {/* FIXED Bottom Navigation Bar - Premium Style */}
            <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pt-2 pb-6 px-2">
                <div className="max-w-md mx-auto flex items-center justify-between gap-0.5">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-0.5 rounded-2xl transition-all duration-300 relative ${isActive
                                    ? 'text-slate-900 group'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <div className={`w-10 h-8 flex items-center justify-center rounded-2xl transition-all duration-300 ${isActive ? 'bg-slate-900 text-white translate-y-[-2px]' : ''}`}>
                                    <Icon size={isActive ? 20 : 18} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-[0.02em] transition-all duration-300 whitespace-nowrap ${isActive ? 'opacity-100 translate-y-[-1px]' : 'opacity-60'}`}>
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        className="absolute -top-2 w-1.5 h-1.5 bg-slate-900 rounded-full"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MobileTopicDetailPage;
