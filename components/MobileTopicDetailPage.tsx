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
    Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TopicResource, Subject, ExamContext, AnalyzedQuestion } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';
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

                // Fetch Quizzes
                setLoadingQuizzes(true);
                const { data: qData } = await supabase
                    .from('quiz_attempts')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('topic_resource_id', topicResource.id)
                    .eq('exam_context', examContext)
                    .order('created_at', { ascending: false });

                if (qData) setPastQuizzes(qData);
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
        { id: 'quiz' as TabType, label: 'Test', icon: Target },
        { id: 'flashcards' as TabType, label: 'Recall', icon: Brain },
        { id: 'progress' as TabType, label: 'Stats', icon: BarChart3 }
    ];

    const subjectConfig = SUBJECT_CONFIGS[subject];

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
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* FIXED Bottom Navigation Bar - Premium Style */}
            <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pt-2 pb-6 px-4">
                <div className="max-w-md mx-auto flex items-center justify-between gap-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-2xl transition-all duration-300 relative ${isActive
                                    ? 'text-slate-900 group'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <div className={`w-12 h-8 flex items-center justify-center rounded-2xl transition-all duration-300 ${isActive ? 'bg-slate-900 text-white translate-y-[-2px]' : ''}`}>
                                    <Icon size={isActive ? 22 : 20} />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-[0.05em] transition-all duration-300 ${isActive ? 'opacity-100 translate-y-[-1px]' : 'opacity-60'}`}>
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
