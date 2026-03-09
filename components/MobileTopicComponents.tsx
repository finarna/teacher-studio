import React, { useState, useEffect } from 'react';
import {
    Brain,
    Zap,
    Target,
    Trophy,
    FileQuestion,
    Lightbulb,
    CheckCircle,
    Clock,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    ArrowRight,
    Bookmark,
    History,
    Info,
    Play,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    BookOpen,
    ArrowLeft,
    TrendingUp,
    Eye,
    BarChart3,
    Calendar,
    X,
    Loader2
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion, AnimatePresence } from 'framer-motion';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
import { AI_CONFIG } from '../config/aiConfigs';
import { EXAM_CONFIGS } from '../config/exams';
import ComplexityMatrix from './ComplexityMatrix';
import type { TopicResource, Subject, ExamContext, AnalyzedQuestion } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';
import { RenderWithMath } from './MathRenderer';

interface MobilePracticeTabProps {
    topicResource: TopicResource;
    subject: Subject;
    examContext: ExamContext;
    onQuestionCountChange?: (count: number) => void;
    sharedQuestions: AnalyzedQuestion[];
    setSharedQuestions: React.Dispatch<React.SetStateAction<AnalyzedQuestion[]>>;
    onProgressUpdate?: (silent?: boolean) => void;
}

export const MobilePracticeTab: React.FC<MobilePracticeTabProps> = ({
    topicResource,
    subject,
    examContext,
    onQuestionCountChange,
    sharedQuestions,
    setSharedQuestions,
    onProgressUpdate
}) => {
    // Sync state with shared questions
    const [questions, setQuestions] = useState<AnalyzedQuestion[]>(sharedQuestions.length > 0 ? sharedQuestions : (topicResource.questions || []));

    // EFFECT: Sync local questions when sharedQuestions update from parent
    useEffect(() => {
        if (sharedQuestions.length > 0) {
            setQuestions(sharedQuestions);
        }
    }, [sharedQuestions]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showSolution, setShowSolution] = useState(false);
    const [showInsights, setShowInsights] = useState(false);
    const [showQuestNavigator, setShowQuestNavigator] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const { user } = useAuth();

    const {
        savedAnswers,
        validatedAnswers,
        bookmarkedIds,
        saveAnswer,
        toggleBookmark,
        startQuestionTimer,
        stopQuestionTimer,
        isLoading: sessionLoading
    } = usePracticeSession({
        topicResourceId: topicResource.id,
        topicId: topicResource.topicId,
        topicName: topicResource.topicName,
        subject,
        examContext,
        questions: questions,
        onProgressUpdate
    });

    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const currentQuestion = questions[currentIndex];

    useEffect(() => {
        if (currentQuestion && !savedAnswers.has(currentQuestion.id)) {
            startQuestionTimer(currentQuestion.id);
        }
        if (currentQuestion && savedAnswers.has(currentQuestion.id)) {
            setSelectedOption(savedAnswers.get(currentQuestion.id) ?? null);
        } else {
            setSelectedOption(null);
        }
        setShowSolution(false);
        setShowInsights(false);
    }, [currentIndex, currentQuestion, savedAnswers]);

    const handleOptionSelect = (index: number) => {
        if (validatedAnswers.has(currentQuestion.id)) return;
        setSelectedOption(index);
    };

    const handleValidate = async () => {
        if (selectedOption === null || !currentQuestion) return;
        const isCorrect = selectedOption === currentQuestion.correctOptionIndex;
        await saveAnswer(currentQuestion.id, selectedOption, isCorrect);
        stopQuestionTimer(currentQuestion.id);
        setShowInsights(true);
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const prevQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    if (sessionLoading || !currentQuestion) {
        return <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse font-outfit">Predicting Question Path...</div>;
    }

    const isValidated = validatedAnswers.has(currentQuestion.id);
    const isCorrect = isValidated && savedAnswers.get(currentQuestion.id) === currentQuestion.correctOptionIndex;

    const insights = {
        aiReasoning: currentQuestion.aiReasoning || currentQuestion.masteryMaterial?.aiReasoning,
        historicalPattern: currentQuestion.historicalPattern || currentQuestion.masteryMaterial?.historicalPattern,
        predictiveInsight: currentQuestion.predictiveInsight || currentQuestion.masteryMaterial?.predictiveInsight,
        whyItMatters: currentQuestion.whyItMatters || currentQuestion.masteryMaterial?.whyItMatters,
        studyTip: currentQuestion.studyTip || currentQuestion.examTip
    };

    return (
        <div className="flex flex-col h-full space-y-2.5 pb-24">
            {/* COMPACT Progress Bar */}
            <button
                onClick={() => setShowQuestNavigator(true)}
                className="w-full flex items-center justify-between bg-white py-1.5 px-4 rounded-xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all"
            >
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider font-outfit">Node {currentIndex + 1}/{questions.length}</span>
                </div>
                <div className="flex items-center gap-1">
                    {questions.slice(0, 10).map((q, i) => (
                        <div
                            key={q.id}
                            className={`w-1 h-1 rounded-full transition-all ${i === currentIndex ? 'bg-slate-900 w-2' :
                                validatedAnswers.has(q.id) ? (savedAnswers.get(q.id) === q.correctOptionIndex ? 'bg-emerald-400' : 'bg-rose-400') :
                                    'bg-slate-100'
                                }`}
                        />
                    ))}
                </div>
                <ChevronDown size={10} className="text-slate-200" />
            </button>

            {/* Premium Quest Card - COMPACT */}
            <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-50 flex flex-col relative overflow-hidden"
            >
                {/* ID & Metadata Tags - Redesigned */}
                <div className="flex items-center justify-between mb-3.5">
                    <div className="flex flex-wrap gap-1">
                        <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded-[0.4rem] text-[7px] font-black uppercase tracking-tighter">{currentQuestion.year || '24 Prediction'}</span>
                        <span className={`px-1.5 py-0.5 rounded-[0.4rem] text-[7px] font-black uppercase tracking-tighter ${currentQuestion.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600' : currentQuestion.difficulty === 'Hard' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                            {currentQuestion.difficulty}
                        </span>
                        {currentQuestion.marks && <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-[0.4rem] text-[7px] font-black uppercase tracking-tighter border border-indigo-100">{currentQuestion.marks}M</span>}
                    </div>
                    <button
                        onClick={() => toggleBookmark(currentQuestion.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${Array.isArray(bookmarkedIds) && bookmarkedIds.includes(currentQuestion.id) ? 'bg-amber-50 text-amber-500' : 'text-slate-300'}`}
                    >
                        <Bookmark size={12} fill={(Array.isArray(bookmarkedIds) && bookmarkedIds.includes(currentQuestion.id)) ? 'currentColor' : 'none'} />
                    </button>
                </div>

                {/* Problem Statement Block */}
                <div className="relative pl-3 border-l-2 border-emerald-500 mb-4">
                    <div className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-0.5 font-mono">PROBLEM_STATEMENT</div>
                    <div className="text-base font-bold text-slate-900 leading-snug font-outfit">
                        <RenderWithMath text={currentQuestion.text} />
                    </div>
                </div>

                {/* Options Grid - High Contrast */}
                <div className="space-y-1.5">
                    {(currentQuestion.options || []).map((option, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrectOption = isValidated && idx === Number(currentQuestion.correctOptionIndex);
                        const isWrongSelection = isValidated && isSelected && !isCorrect;

                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionSelect(idx)}
                                disabled={isValidated}
                                className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${isCorrectOption ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm' :
                                    isWrongSelection ? 'bg-rose-50 border-rose-500 text-rose-900' :
                                        isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-md' :
                                            'bg-white border-slate-50 text-slate-600 active:bg-slate-50'
                                    }`}
                            >
                                <div className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 font-black text-[9px] transition-colors ${isSelected || isCorrectOption || isWrongSelection ? 'border-transparent bg-white/20' : 'border-slate-100 text-slate-300'}`}>
                                    {String.fromCharCode(64 + (idx + 1))}
                                </div>
                                <div className="flex-1 font-bold text-[0.8rem] leading-snug">
                                    <RenderWithMath text={option.replace(/^\s*([A-D1-4][\.\)]|\([A-D1-4]\))\s*/i, '')} />
                                </div>
                                {isCorrectOption && <CheckCircle size={14} className="text-emerald-500" />}
                                {isWrongSelection && <AlertTriangle size={14} className="text-rose-500" />}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Post-Validation AI Strategy Pill */}
            <AnimatePresence>
                {isValidated && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-3"
                    >
                        <div className={`p-5 rounded-[2rem] border-t-4 shadow-xl relative overflow-hidden ${isCorrect ? 'bg-white border-emerald-500' : 'bg-white border-rose-500'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {isCorrect ? <Sparkles size={18} /> : <Brain size={18} />}
                                </div>
                                <div>
                                    <h3 className="text-[13px] font-black text-slate-900 font-outfit uppercase tracking-tighter leading-none italic">
                                        {isCorrect ? 'Elegantly Executed' : 'Strategic Diagnostic'}
                                    </h3>
                                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mt-0.5">AI_PREDICTIVE_PATTERN_SYNC</div>
                                </div>
                            </div>

                            <p className="text-xs font-bold text-slate-700 leading-relaxed italic mb-5 pr-4 line-clamp-3">
                                <RenderWithMath text={insights.studyTip || insights.aiReasoning || "Conceptual mastery required for this node. View solution for protocol analysis."} />
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setShowSolution(!showSolution)}
                                    className="h-11 bg-slate-50 rounded-[1rem] text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 border border-slate-100"
                                >
                                    <HelpCircle size={14} />
                                    {showSolution ? 'Hide Protocol' : 'View Protocol'}
                                </button>
                                <button
                                    onClick={() => setShowInsights(!showInsights)}
                                    className="h-11 bg-slate-900 rounded-[1rem] text-[9px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                                >
                                    <Sparkles size={14} className="text-amber-300" />
                                    AI Prediction
                                </button>
                            </div>
                        </div>

                        {/* Expandable Protocol Solution - COMPACT */}
                        {showSolution && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-lg overflow-hidden"
                            >
                                <div className="space-y-5">
                                    {/* Key Formulas - Amber Block */}
                                    {currentQuestion.keyFormulas && currentQuestion.keyFormulas.length > 0 && (
                                        <div className="bg-amber-50 rounded-[1.25rem] p-4 border border-amber-100">
                                            <div className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                                <Zap size={10} fill="currentColor" /> AI Logic Core
                                            </div>
                                            <div className="space-y-1.5">
                                                {currentQuestion.keyFormulas.map((formula, idx) => (
                                                    <div key={idx} className="text-xs font-bold text-slate-800 bg-white/50 rounded-lg p-2">
                                                        <RenderWithMath text={formula} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Steps - Minimal Vertical Line */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                <TrendingUp size={12} className="text-slate-400" />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Advanced Solving Protocol</span>
                                        </div>
                                        <div className="relative ml-2 border-l border-slate-100 pl-5 space-y-5">
                                            {currentQuestion.solutionSteps?.map((step: string, idx: number) => (
                                                <div key={idx} className="relative">
                                                    <div className="absolute top-1.5 left-[-25.5px] w-3 h-3 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                                                        <div className="w-1 h-1 rounded-full bg-slate-900" />
                                                    </div>
                                                    <div className="text-[12px] font-bold text-slate-700 leading-relaxed font-instrument">
                                                        <RenderWithMath text={step} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Expandable Deep Pattern Insights */}
                        {showInsights && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="bg-slate-900 rounded-[2rem] p-5 shadow-2xl overflow-hidden border border-white/10"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                            <Sparkles size={14} className="text-blue-400" />
                                        </div>
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Deep Pattern Analysis & Prediction</h4>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {insights.historicalPattern && (
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Historical Trend</p>
                                                <p className="text-[11px] font-medium text-slate-300 leading-relaxed">{insights.historicalPattern}</p>
                                            </div>
                                        )}
                                        {insights.predictiveInsight && (
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1.5">Oracle Prediction</p>
                                                <p className="text-[11px] font-medium text-slate-300 leading-relaxed">{insights.predictiveInsight}</p>
                                            </div>
                                        )}
                                        {insights.whyItMatters && (
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Strategic Value</p>
                                                <p className="text-[11px] font-medium text-slate-300 leading-relaxed">{insights.whyItMatters}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PERSISTENT ACTION FOOTER */}
            <div className="fixed bottom-[88px] left-0 right-0 px-5 z-40">
                <div className="max-w-[360px] mx-auto flex items-center justify-center gap-2">
                    <button
                        onClick={prevQuestion}
                        disabled={currentIndex === 0}
                        className="w-12 h-12 rounded-[1.25rem] bg-white shadow-xl border border-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-all disabled:opacity-20 shrink-0"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <button
                        onClick={!isValidated ? handleValidate : nextQuestion}
                        disabled={!isValidated && selectedOption === null}
                        className={`flex-1 h-12 rounded-full shadow-2xl flex items-center justify-center gap-3 active:scale-[0.96] transition-all px-4 ${!isValidated ? 'bg-slate-900 text-white' :
                            (isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white')
                            }`}
                    >
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] whitespace-nowrap">
                            {!isValidated
                                ? (selectedOption !== null ? 'Secure Resolution' : 'Locked Input')
                                : (currentIndex === questions.length - 1 ? 'Quest Finalized' : 'Advance to Next Node')
                            }
                        </span>
                    </button>

                    <button
                        onClick={nextQuestion}
                        disabled={currentIndex === questions.length - 1}
                        className="w-12 h-12 rounded-[1.25rem] bg-white shadow-xl border border-slate-50 flex items-center justify-center text-slate-300 active:scale-90 transition-all disabled:opacity-20 shrink-0"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Quest Navigator Modal */}
            <AnimatePresence>
                {showQuestNavigator && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end justify-center p-6 bg-slate-900/40 backdrop-blur-md"
                        onClick={() => setShowQuestNavigator(false)}
                    >
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="w-full max-w-[360px] bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border border-white/10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Quest Sequence</h3>
                                <button onClick={() => setShowQuestNavigator(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40"><ChevronDown size={18} /></button>
                            </div>
                            <div className="grid grid-cols-5 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {questions.map((q, i) => {
                                    const isCurrent = i === currentIndex;
                                    const solved = validatedAnswers.has(q.id);
                                    const correct = solved && savedAnswers.get(q.id) === q.correctOptionIndex;
                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => { setCurrentIndex(i); setShowQuestNavigator(false); }}
                                            className={`aspect-square rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${isCurrent ? 'bg-white text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.2)]' :
                                                solved ? (correct ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-white/5 text-white/30 border border-white/10'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const MobileLearnTab: React.FC<{
    topicResource: TopicResource;
    subject: Subject;
    examContext: ExamContext;
    onProgressUpdate?: (silent?: boolean) => void;
    visualSketches: any[];
    loadingSketches: boolean;
}> = ({ topicResource, subject, examContext, onProgressUpdate, visualSketches, loadingSketches }) => {
    const { user } = useAuth();
    const [viewingSketchIndex, setViewingSketchIndex] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const saveNotesProgress = async (completed: boolean) => {
        if (!user) return;
        setIsSaving(true);
        try {
            await supabase
                .from('topic_resources')
                .upsert({
                    user_id: user.id,
                    topic_id: topicResource.topicId,
                    subject: subject,
                    exam_context: examContext,
                    study_stage: completed ? 'practicing' : 'studying_notes',
                    notes_completed: completed,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,topic_id,exam_context' });

            onProgressUpdate?.(true);
        } catch (e) {
            console.error('Failed to sync notes progress:', e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4 pb-20">
            <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Brain size={20} className="text-primary-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black font-outfit uppercase italic tracking-tighter">AI Strategic Core</h3>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Historical Pattern Analysis</p>
                        </div>
                    </div>
                    {topicResource.notesCompleted ? (
                        <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center gap-2">
                            <CheckCircle size={10} className="text-emerald-400" />
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Mastered</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => saveNotesProgress(true)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-primary-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all shadow-lg"
                        >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} className="fill-white" />}
                            Mark Complete
                        </button>
                    )}
                </div>
                <p className="text-sm text-white/70 italic leading-relaxed">
                    Visual schemas and strategic conceptual breakdowns for <span className="text-primary-400 font-bold">{topicResource.topicName}</span>.
                </p>
            </div>

            {loadingSketches ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="text-slate-300 animate-spin" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analysing Historical Trends...</span>
                </div>
            ) : visualSketches.length > 0 ? (
                <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">AI Analytic Visuals</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {visualSketches.map((sketch, idx) => (
                            <button
                                key={idx}
                                onClick={() => setViewingSketchIndex(idx)}
                                className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm aspect-[4/5] flex flex-col active:scale-95 transition-all text-left group"
                            >
                                <div className="flex-1 bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-instrument transition-all">
                                    {sketch.sketchSvg ? (
                                        <img src={sketch.sketchSvg} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform" />
                                    ) : (
                                        <div className="text-slate-300 flex items-center justify-center">
                                            <BookOpen size={32} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/0 active:bg-slate-900/10 transition-colors" />
                                </div>
                                <div className="p-4 bg-white">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Schema {idx + 1}</span>
                                    <span className="text-xs font-bold text-slate-900 truncate block">{sketch.questionText}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {topicResource.chapterInsights?.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Core Insights</h3>
                    {topicResource.chapterInsights.map((insight, idx) => (
                        <div key={idx} className="bg-white rounded-[1.75rem] p-5 border border-slate-100 shadow-sm relative overflow-hidden group active:bg-slate-50 transition-colors">
                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-active:bg-primary-500 transition-colors" />
                            <h4 className="text-base font-black text-slate-900 font-outfit uppercase mb-2 tracking-tight flex items-center justify-between">
                                {insight.topic}
                                <ChevronRight size={16} className="text-slate-300" />
                            </h4>
                            <p className="text-sm text-slate-500 leading-relaxed mb-4">{insight.description}</p>
                            <div className="flex flex-wrap gap-2">
                                {insight.keyConcepts?.map((c, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-50 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">{c}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {viewingSketchIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <button
                                onClick={() => setViewingSketchIndex(null)}
                                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white"
                            >
                                <X size={24} />
                            </button>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Schema {viewingSketchIndex + 1}</p>
                                <p className="text-lg font-black text-white font-outfit uppercase tracking-tighter italic">{visualSketches[viewingSketchIndex].questionText}</p>
                            </div>
                            <div className="w-12" />
                        </div>

                        <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-2xl relative min-h-[350px] flex flex-col">
                            <div className="flex-1 flex items-center justify-center p-2 bg-slate-50/50">
                                {visualSketches[viewingSketchIndex].sketchSvg ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <img
                                            src={visualSketches[viewingSketchIndex].sketchSvg}
                                            className="w-full h-full object-contain"
                                            style={{ minHeight: '300px' }}
                                        />
                                    </div>
                                ) : (
                                    <div className="text-slate-200">
                                        <BookOpen size={64} />
                                    </div>
                                )}
                            </div>
                            <div className="bg-slate-900/5 px-4 py-2 flex items-center justify-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pinch to Focus // High Fidelity Schema</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                            </div>
                        </div>

                        <div className="mt-8 space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6">
                                <h4 className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-3">Concept Breakdown</h4>
                                <p className="text-sm font-medium text-white/80 leading-relaxed italic">
                                    This visual schema represents the core structural logic of the concept. Study the relationships between components for deep recall.
                                </p>
                            </div>
                            <button
                                onClick={() => setViewingSketchIndex(null)}
                                className="w-full h-16 bg-white text-slate-900 rounded-[2rem] font-black uppercase tracking-widest text-xs"
                            >
                                Finish Review
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Enhanced Mobile Quiz Tab
interface MobileQuizTabProps {
    topicResource: TopicResource;
    subject: Subject;
    examContext: ExamContext;
    onStartQuiz?: (topicId: string, totalQuestions?: number) => void;
    sharedQuestions: AnalyzedQuestion[];
    setSharedQuestions: React.Dispatch<React.SetStateAction<AnalyzedQuestion[]>>;
    onProgressUpdate?: (silent?: boolean) => void;
    setReviewQuiz?: (quiz: any) => void;
}

export const MobileQuizTab: React.FC<MobileQuizTabProps> = ({
    topicResource,
    subject,
    examContext,
    onStartQuiz,
    sharedQuestions,
    setSharedQuestions,
    onProgressUpdate,
    setReviewQuiz
}) => {
    const [questionCount, setQuestionCount] = useState(10);
    const { isLoading } = useLearningJourney();
    const { user } = useAuth();
    const [strategy, setStrategy] = useState<'adaptive' | 'simulation'>('adaptive');

    const steps = ['Analysing Historical Papers...', 'Tailoring to Your Progress...', 'Applying Predictive AI...', 'Finalizing Your Blueprint...'];
    const [stepIndex, setStepIndex] = useState(0);

    // Difficulty Distribution State
    const [easy, setEasy] = useState(70);
    const [moderate, setModerate] = useState(25);
    const [hard, setHard] = useState(5);
    const [isAutoComplexity, setIsAutoComplexity] = useState(true);

    // Past quizzes
    const [pastQuizzes, setPastQuizzes] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Fetch forecast for simulation mode
    const [topicForecast, setTopicForecast] = useState<any>(null);
    React.useEffect(() => {
        if (strategy === 'simulation') {
            const config = EXAM_CONFIGS[examContext];
            if (config) {
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
    const matrixStats = React.useMemo(() => {
        const learning = topicResource.notesCompleted ? 100 : 20;
        const solve = topicResource.averageAccuracy || 0;
        const master = topicResource.masteryLevel || 0;
        const recall = Math.min(100, (topicResource.quizzesTaken * 20) + (master * 0.5));
        return { learning, solve, master, recall };
    }, [topicResource]);

    // Auto-adjust complexity based on stats
    React.useEffect(() => {
        if (isAutoComplexity) {
            const mastery = topicResource.masteryLevel || 0;
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

    // Fetch past quizzes from quiz_attempts on mount
    React.useEffect(() => {
        if (!user || !topicResource.topicName) return;
        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const { data, error } = await supabase
                    .from('quiz_attempts')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('topic_name', topicResource.topicName)
                    .eq('exam_context', examContext)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (error) {
                    console.warn('quiz_attempts fetch error (mobile):', error.message);
                    // Fallback to topic_resource_id if topic_name fails
                    const { data: fallbackData } = await supabase
                        .from('quiz_attempts')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('topic_resource_id', topicResource.id)
                        .order('created_at', { ascending: false })
                        .limit(5);
                    if (fallbackData) {
                        setPastQuizzes(fallbackData.map(q => mapQuizRow(q)));
                    }
                    return;
                }

                if (data) {
                    setPastQuizzes(data.map(q => mapQuizRow(q)));
                }
            } catch (err: any) {
                console.warn('quiz_attempts history unavailable:', err?.message || err);
                setPastQuizzes([]);
            } finally {
                setLoadingHistory(false);
            }
        };

        const mapQuizRow = (q: any) => {
            const rawQData = q.questions_data || [];
            const qData = typeof rawQData === 'string' ? JSON.parse(rawQData) : rawQData;
            return {
                ...q,
                id: q.id,
                createdAt: q.created_at,
                percentage: q.accuracy_percentage ?? q.percentage ?? 0,
                accuracyPercentage: q.accuracy_percentage ?? 0,
                score: q.correct_count ?? q.score ?? 0,
                correctCount: q.correct_count ?? 0,
                wrongCount: q.wrong_count ?? 0,
                totalQuestions: q.question_count ?? q.total_questions ?? 0,
                questionCount: q.question_count ?? 0,
                durationMinutes: Math.floor((q.time_spent_seconds ?? 0) / 60),
                timeSpentSeconds: q.time_spent_seconds ?? 0,
                questionsData: qData
            };
        };

        fetchHistory();
    }, [user, topicResource.topicName, topicResource.id, examContext]);


    // Cycle through generation steps while loading
    React.useEffect(() => {
        if (!isLoading) { setStepIndex(0); return; }
        const interval = setInterval(() => {
            setStepIndex(prev => (prev + 1) % steps.length);
        }, 1800);
        return () => clearInterval(interval);
    }, [isLoading]);

    return (
        <div className="flex flex-col space-y-6 py-2 px-1">
            {/* Strategy Selector - Compact for mobile */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setStrategy('adaptive')}
                    className={`p-4 rounded-3xl border-2 transition-all text-left flex flex-col gap-2 relative overflow-hidden ${strategy === 'adaptive' ? 'bg-white border-primary-600 shadow-lg' : 'bg-slate-50 border-slate-100'}`}
                >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${strategy === 'adaptive' ? 'bg-primary-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                        <Brain size={16} />
                    </div>
                    <div>
                        <span className={`text-[8px] font-black uppercase tracking-widest block ${strategy === 'adaptive' ? 'text-primary-600' : 'text-slate-400'}`}>Learning</span>
                        <span className={`text-xs font-black block leading-tight font-outfit ${strategy === 'adaptive' ? 'text-slate-900' : 'text-slate-600'}`}>Adaptive</span>
                    </div>
                </button>

                <button
                    onClick={() => setStrategy('simulation')}
                    className={`p-4 rounded-3xl border-2 transition-all text-left flex flex-col gap-2 relative overflow-hidden ${strategy === 'simulation' ? 'bg-slate-900 border-slate-900 shadow-lg text-white' : 'bg-slate-50 border-slate-100'}`}
                >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${strategy === 'simulation' ? 'bg-white text-slate-900' : 'bg-white text-slate-400 border border-slate-100'}`}>
                        <Target size={16} />
                    </div>
                    <div>
                        <span className={`text-[8px] font-black uppercase tracking-widest block ${strategy === 'simulation' ? 'text-primary-400' : 'text-slate-400'}`}>Official</span>
                        <span className={`text-xs font-black block leading-tight font-outfit ${strategy === 'simulation' ? 'text-white' : 'text-slate-600'}`}>Simulation</span>
                    </div>
                </button>
            </div>

            <AnimatePresence mode="wait">
                {strategy === 'simulation' ? (
                    <motion.div
                        key="simulation"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden text-white relative p-6"
                    >
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-600/10 rounded-full blur-[60px] -mr-24 -mt-24" />
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-primary-400">Smart Mentor active</span>
                                    </div>
                                    <h3 className="text-lg font-black font-outfit uppercase italic tracking-tighter">Exam Protocol</h3>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Rigor Velocity</span>
                                    <span className="text-xs font-black text-white">{topicForecast?.rigor}x</span>
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                                AI-proctored simulation module. No instant validation. Full-spectrum {examContext} analysis.
                            </p>

                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3">
                                {[
                                    { label: 'Easy', val: topicForecast?.distribution?.easy, color: 'bg-emerald-400' },
                                    { label: 'Med', val: topicForecast?.distribution?.moderate, color: 'bg-amber-400' },
                                    { label: 'Hard', val: topicForecast?.distribution?.hard, color: 'bg-rose-400' }
                                ].map(item => (
                                    <div key={item.label} className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between px-0.5">
                                            <span className="text-[7px] font-black uppercase text-slate-400">{item.label}</span>
                                            <span className="text-[8px] font-black text-white">{item.val}%</span>
                                        </div>
                                        <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => !isLoading && onStartQuiz?.(topicResource.topicId)}
                                disabled={isLoading}
                                className="w-full h-14 bg-white text-slate-900 rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                                {isLoading ? 'Preparing...' : 'Start Simulation'}
                            </button>

                            <div className="pt-2 flex items-center justify-between border-t border-white/5">
                                <div className="flex gap-4">
                                    {[
                                        { label: 'Lrn', val: matrixStats.learning, color: 'text-indigo-400' },
                                        { label: 'Slv', val: matrixStats.solve, color: 'text-emerald-400' },
                                        { label: 'Mst', val: matrixStats.master, color: 'text-amber-400' }
                                    ].map(stat => (
                                        <div key={stat.label} className="flex flex-col">
                                            <span className="text-[6px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
                                            <span className={`text-[9px] font-black font-mono ${stat.color}`}>{Math.round(stat.val)}%</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                                    <Sparkles size={10} className="text-blue-400" />
                                    <span className="text-[7px] font-bold text-blue-100 uppercase tracking-tighter">Personalized For You</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="adaptive"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm p-6 space-y-6"
                    >
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Adaptive Mode</span>
                                    <h3 className="text-lg font-black text-slate-900 font-outfit uppercase tracking-tighter">Growth Session</h3>
                                </div>
                                <div className="bg-primary-50 px-3 py-1.5 rounded-2xl border border-primary-100 flex items-center gap-2">
                                    <Brain size={14} className="text-primary-600" />
                                    <span className="text-sm font-black text-primary-900">{questionCount} Qs</span>
                                </div>
                            </div>

                            <input
                                type="range"
                                min="5"
                                max="20"
                                step="5"
                                value={questionCount}
                                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />

                            <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span>5 Units</span>
                                <span>10 Units</span>
                                <span>15 Units</span>
                                <span>20 Units</span>
                            </div>

                            <button
                                onClick={() => !isLoading && onStartQuiz?.(topicResource.topicId, questionCount)}
                                disabled={isLoading}
                                className="w-full h-14 bg-slate-900 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                {isLoading ? 'Preparing...' : 'Start Session'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Complexity Matrix on Mobile - Only shown in Adaptive mode */}
            {strategy === 'adaptive' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
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
                </div>
            )}

            {/* Compact Past Quiz Preview */}
            {!loadingHistory && pastQuizzes.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <History size={14} className="text-slate-900" />
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">History</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">{pastQuizzes.length} Sessions</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {pastQuizzes.map((quiz) => {
                            const pct = quiz.percentage ?? 0;
                            const scoreColor = pct >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : pct >= 60 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100';
                            return (
                                <button
                                    key={quiz.id}
                                    onClick={() => (quiz.questionsData || quiz.questions_data) && setReviewQuiz?.(quiz)}
                                    className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-3 shadow-xs active:scale-[0.98] transition-all text-left"
                                >
                                    <div className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center shrink-0 ${scoreColor}`}>
                                        <span className="text-[12px] font-black font-mono leading-none">{pct}%</span>
                                        <span className="text-[6px] uppercase font-black tracking-tighter mt-0.5">Acc</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black text-slate-900 truncate">
                                                {quiz.score}/{quiz.totalQuestions} Correct
                                            </span>
                                            <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400">
                                                <Clock size={8} />
                                                <span>{quiz.durationMinutes}m</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[9px] font-bold text-slate-300">
                                                {new Date(quiz.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.05em]">Analyze →</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// Enhanced Mobile Flashcards Tab
export const MobileFlashcardsTab: React.FC<{
    topicResource: TopicResource;
    sharedQuestions: AnalyzedQuestion[];
}> = ({ topicResource, sharedQuestions }) => {
    const { user } = useAuth();
    const [currentCard, setCurrentCard] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [cards, setCards] = useState<any[]>(topicResource.flashcards || []);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const hasCards = cards.length > 0;

    // Swipe detection - minimum swipe distance
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            // Swipe left - next card
            setIsFlipped(false);
            setCurrentCard(prev => (prev + 1) % cards.length);
        } else if (isRightSwipe) {
            // Swipe right - previous card
            setIsFlipped(false);
            setCurrentCard(prev => (prev - 1 + cards.length) % cards.length);
        }
    };

    // Load saved flashcards from database on mount
    useEffect(() => {
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

    const generateFlashcards = async () => {
        if (!user) return;
        setIsGenerating(true);
        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.7,
                    maxOutputTokens: 8000
                }
            });

            const examCtx = topicResource.examContext;
            const subjectName = topicResource.subject;
            const prompt = `You are an elite ${examCtx} exam coach. Create 12-15 HIGH-YIELD FLASHCARDS for ${topicResource.topicName} in ${subjectName}.

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
    "context": "⚠️ **COMMON MISTAKE:** What students mess up\\n\\n🎯 **MEMORY TRICK:** Simple mnemonic\\n\\n📝 **EXAM TIP:** How it appears in ${examCtx}"
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

            // Log for debugging
            console.log('Raw AI Response:', text.substring(0, 200) + '...');

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
                // First attempt: direct parsing
                parsed = JSON.parse(text);
            } catch (firstError) {
                console.log('First parse failed, attempting sanitization...');

                // Robust sanitization strategy
                let sanitized = text
                    // Remove any BOM or invisible characters
                    .replace(/^\uFEFF/, '')
                    // Remove markdown backticks if they are still there
                    .replace(/^```json\s*/, '').replace(/```$/, '')
                    // Fix unescaped control characters in string values (like raw newlines)
                    .replace(/:\s*"([\s\S]*?)"(?=\s*[,\]\}])/g, (match, p1) => {
                        // In each string value, replace raw newlines with \n and escape unescaped backslashes
                        const cleaned = p1
                            .replace(/\n/g, '\\n')
                            .replace(/\r/g, '\\r')
                            // Escape backslashes that aren't already part of a valid escape sequence
                            .replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
                        return `: "${cleaned}"`;
                    });

                console.log('Sanitized text:', sanitized.substring(0, 200) + '...');

                try {
                    parsed = JSON.parse(sanitized);
                } catch (secondError) {
                    // One final attempt: try to find the first [ and last ]
                    try {
                        const start = sanitized.indexOf('[');
                        const end = sanitized.lastIndexOf(']');
                        if (start !== -1 && end !== -1) {
                            parsed = JSON.parse(sanitized.substring(start, end + 1));
                        } else {
                            throw secondError;
                        }
                    } catch (thirdError) {
                        console.error('JSON Parse Error Details:', {
                            originalError: firstError,
                            sanitizedError: secondError,
                            finalError: thirdError,
                            rawText: text.substring(0, 500)
                        });
                        throw new Error('Failed to parse AI response as JSON. Please try again.');
                    }
                }
            }

            if (Array.isArray(parsed) && parsed.length > 0) {
                setCards(parsed);
                setCurrentCard(0);
                setIsFlipped(false);

                // Save to flashcards table (single source of truth)
                // Use cache_key for topic-based flashcards (not scan_id)
                const cacheKey = `topic_${topicResource.topicId}_${topicResource.examContext}`;

                // Format cards with topic for consistency with scan-based flashcards
                const formattedCards = parsed.map(card => ({
                    term: card.term,
                    def: card.definition,
                    extra: card.context,
                    topic: topicResource.topicName
                }));

                try {
                    const { error: saveError } = await supabase
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

                    if (saveError) {
                        console.error('❌ Failed to save flashcards to DB:', saveError);
                        console.log('Flashcards generated but not saved. You can still use them this session.');
                    } else {
                        console.log('✅ Successfully generated and saved', parsed.length, 'flashcards');
                    }
                } catch (saveErr) {
                    console.error('Error saving flashcards:', saveErr);
                }
            } else {
                throw new Error('Invalid flashcard data structure');
            }
        } catch (e) {
            console.error('Flashcard Generation Error:', e);
            alert(e instanceof Error ? e.message : 'Failed to generate flashcards. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!hasCards) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-8">
                <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-amber-200/20 blur-2xl animate-pulse" />
                    <Brain size={48} className="text-amber-500 relative z-10" />
                </div>
                <div className="space-y-3">
                    <h3 className="text-2xl font-black text-slate-900 font-outfit uppercase tracking-tighter italic leading-none">Neural Nodes Latent</h3>
                    <p className="text-sm text-slate-500 font-bold max-w-xs mx-auto leading-relaxed">
                        Space-repetition nodes are not yet synthesized for this topic. Initialize the AI synapse to begin.
                    </p>
                </div>
                <button
                    onClick={generateFlashcards}
                    disabled={isGenerating}
                    className="w-full h-16 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isGenerating ? 'Synthesizing...' : 'Initialize Synapse'}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24">
            {/* Header */}
            <div className="bg-slate-900 rounded-[2.5rem] p-5 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Zap size={20} className="text-amber-400 fill-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-black font-outfit uppercase italic tracking-tighter">Recall Engine</h3>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">{cards.length} Active Nodes</p>
                        </div>
                    </div>
                    <button
                        onClick={generateFlashcards}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-[10px] font-black text-white flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={12} className="animate-spin" />
                                <span className="hidden sm:inline">GENERATING...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={12} />
                                <span className="hidden sm:inline">GENERATE</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 3D Flip Card */}
            {hasCards ? (
                <div className="space-y-6 pb-32">
                    <div
                        className="perspective-1000 relative w-full h-[480px]"
                        onClick={() => setIsFlipped(!isFlipped)}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        <motion.div
                            className="w-full h-full relative transform-style-3d"
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 20
                            }}
                        >
                            {/* Front Side */}
                            <div
                                className="absolute inset-0 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl flex flex-col items-center justify-center text-center"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden'
                                }}
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-slate-900"><Zap size={140} /></div>

                                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 mb-6 font-outfit">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Active Node {currentCard + 1}</span>
                                </div>

                                <div className="text-xl md:text-2xl font-black text-slate-900 leading-tight tracking-tight px-4 break-words font-outfit">
                                    <RenderWithMath text={cards[currentCard].term} />
                                </div>

                                <div className="mt-12 flex items-center gap-2 text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                                    <Eye size={12} />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] font-outfit">Tap to reveal Synthesis</span>
                                </div>
                            </div>

                            {/* Back Side */}
                            <div
                                className="absolute inset-0 bg-[#0A0F1D] rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl flex flex-col"
                                style={{
                                    transform: 'rotateY(180deg)',
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden'
                                }}
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-[0.05] text-white"><Brain size={120} /></div>

                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 font-outfit">
                                        <Sparkles size={10} className="text-emerald-400" />
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Intelligence Synopsis</span>
                                    </div>
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest font-mono">RapidRecall v3.0</span>
                                </div>

                                <div className="flex-1 overflow-y-auto scroller-hide space-y-4 pr-2">
                                    {/* Main Explanation */}
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Brain size={12} className="text-blue-400" />
                                            <span className="text-[10px] font-black text-blue-300 uppercase tracking-wider">Formula & Steps</span>
                                        </div>
                                        <div className="text-[14px] font-medium text-slate-50 leading-[1.8] whitespace-pre-line">
                                            <RenderWithMath text={cards[currentCard].definition} />
                                        </div>
                                    </div>

                                    {/* Exam Strategy */}
                                    {cards[currentCard].context && (
                                        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Trophy size={12} className="text-amber-400" />
                                                <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">Exam Tips</span>
                                            </div>
                                            <div className="text-[13px] font-medium text-amber-50 leading-[1.8] whitespace-pre-line">
                                                <RenderWithMath text={cards[currentCard].context} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsFlipped(false);
                                setCurrentCard(prev => (prev - 1 + cards.length) % cards.length);
                            }}
                            className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 shadow-lg flex items-center justify-center text-slate-600 active:scale-90 active:bg-slate-50 transition-all"
                        >
                            <ChevronLeft size={24} strokeWidth={3} />
                        </button>

                        <div className="text-center font-outfit px-4">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Card</p>
                            <p className="text-2xl font-black text-slate-900">
                                {currentCard + 1}
                                <span className="text-slate-300 text-lg"> / {cards.length}</span>
                            </p>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsFlipped(false);
                                setCurrentCard(prev => (prev + 1) % cards.length);
                            }}
                            className="w-14 h-14 rounded-2xl bg-slate-900 shadow-xl flex items-center justify-center text-white active:scale-90 active:bg-slate-800 transition-all"
                        >
                            <ChevronRight size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div >
            ) : (
                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 text-center space-y-6 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-200">
                        <Zap size={40} />
                    </div>
                    <div className="space-y-2 font-outfit">
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Recall Engine Offline</h4>
                        <p className="text-xs text-slate-400 font-bold leading-relaxed px-4">
                            The Neural Recall System requires conceptual seeds to initialize mapping. Synthesize intelligence from this topic to begin.
                        </p>
                    </div>
                    <button
                        onClick={generateFlashcards}
                        disabled={isGenerating}
                        className="w-full h-14 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg disabled:opacity-50 font-outfit"
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {isGenerating ? 'Synthesizing Knowledge...' : 'Generate Recall Nodes'}
                    </button>
                </div>
            )}
        </div >
    );
};

// Enhanced Mobile Progress Tab
export const MobileProgressTab: React.FC<{
    topicResource: TopicResource,
    pastQuizzes?: any[],
    isLoadingQuizzes?: boolean,
    setReviewQuiz?: (quiz: any) => void
}> = ({ topicResource, pastQuizzes = [], isLoadingQuizzes = false, setReviewQuiz }) => {
    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <BarChart3 size={20} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black font-outfit uppercase italic tracking-tighter">Helix Metrics</h3>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Performance Intelligence</p>
                    </div>
                </div>
            </div>

            {/* Global Mastery Ring */}
            <div className="bg-white border border-slate-100 rounded-[3rem] p-8 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Mastery Quotient</h3>

                <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="70" strokeWidth="10" stroke="currentColor" fill="transparent" className="text-slate-50" />
                        <motion.circle
                            cx="80" cy="80" r="70" strokeWidth="10"
                            strokeDasharray={440}
                            initial={{ strokeDashoffset: 440 }}
                            animate={{ strokeDashoffset: 440 - (440 * topicResource.masteryLevel) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            strokeLinecap="round" stroke="currentColor" fill="transparent" className="text-indigo-600"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{topicResource.masteryLevel}%</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase mt-1">Syllabus Command</span>
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

            {/* Strategic Intelligence Cards */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label: 'Precision', val: `${topicResource.averageAccuracy.toFixed(0)}%`, icon: Target, color: 'text-rose-500', bg: 'bg-rose-50' },
                    { label: 'Latency', val: 'Low', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Consistency', val: 'High', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Last Sync', val: topicResource.lastPracticed ? new Date(topicResource.lastPracticed).toLocaleDateString() : 'Never', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' }
                ].map((insight, i) => (
                    <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className={`w-10 h-10 ${insight.bg} rounded-xl flex items-center justify-center`}>
                            <insight.icon size={18} className={insight.color} />
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{insight.label}</div>
                            <div className="text-base font-black text-slate-900">{insight.val}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Simulation History */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <History size={16} className="text-slate-400" />
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Simulation Log</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{pastQuizzes.length} Sessions</span>
                </div>

                {isLoadingQuizzes ? (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 flex items-center justify-center">
                        <Loader2 size={24} className="text-slate-300 animate-spin" />
                    </div>
                ) : pastQuizzes.length > 0 ? (
                    <div className="space-y-3">
                        {pastQuizzes.slice(0, 5).map((quiz, idx) => {
                            const accuracy = Math.round(quiz.accuracy_percentage ?? quiz.percentage ?? 0);
                            const correct = quiz.correct_count ?? quiz.raw_score ?? 0;
                            const total = quiz.question_count ?? quiz.total_questions ?? 0;
                            const timeSeconds = quiz.time_spent_seconds ?? 0;

                            console.log('[MobileProgressTab] Rendering quiz:', { idx, accuracy, correct, total, timeSeconds, quiz });

                            return (
                                <div
                                    key={quiz.id || idx}
                                    className="bg-white border border-slate-100 rounded-3xl p-4 flex items-center justify-between shadow-sm hover:border-blue-200 hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                                    onClick={() => setReviewQuiz?.(quiz)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${accuracy >= 80 ? 'bg-emerald-50 text-emerald-600' :
                                            accuracy >= 50 ? 'bg-amber-50 text-amber-600' :
                                                'bg-rose-50 text-rose-600'
                                            }`}>
                                            {accuracy}%
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                                {correct} / {total} Correct
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400">
                                                {new Date(quiz.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {Math.floor(timeSeconds / 60)}m {timeSeconds % 60}s
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:text-blue-500 transition-colors">
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            );
                        })}
                        {pastQuizzes.length > 5 && (
                            <button className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all">
                                Load Full Archive
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 text-center space-y-3">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                            <History size={20} className="text-slate-200" />
                        </div>
                        <p className="text-[11px] font-bold text-slate-400">No simulation data salvaged yet.</p>
                    </div>
                )}
            </div>

            {/* Agentic Recommendation */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles size={14} /> Agentic Recommendation
                </h3>
                <p className="text-white text-sm font-medium leading-relaxed mb-6 italic">
                    {topicResource.masteryLevel < 50
                        ? `System detects fundamental gaps in ${topicResource.topicName}. PRIORITY: Review primary conceptual schemas and complete Foundational Node Practice.`
                        : topicResource.masteryLevel < 85
                            ? `Current mastery is stable but optimization is required. PRIORITY: Initiate "Adaptive Quiz" mode to target moderate-to-hard latent concepts.`
                            : `Elite stage reached. PRIORITY: Maintenance sync every 72 hours to sustain 90%+ percentile performance.`}
                </p>
                <div className="flex flex-col gap-2">
                    <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase active:bg-white/10 transition-all text-center">Deep Dive Analysis</button>
                    <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase active:bg-white/10 transition-all text-center">Curated Weak Areas</button>
                </div>
            </div>
        </div>
    );
};
