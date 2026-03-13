import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Calculator,
    Atom,
    FlaskConical,
    Dna,
    ArrowRight,
    Sparkles,
    Zap,
    TrendingUp,
    Brain,
    ChevronRight,
    BookOpen,
    FileQuestion,
    X,
    TrendingDown,
    Activity,
    Target,
    BarChart3,
    History as HistoryIcon,
    Sprout,
    PawPrint,
    Flower2,
    Leaf,
    Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Subject, ExamContext, SubjectProgress } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { supabase } from '../lib/supabase';

interface SubjectSelectionPageProps {
    examContext: ExamContext;
    onSelectSubject: (subject: Subject) => void;
    onBack: () => void;
    subjectProgress?: Record<Subject, SubjectProgress>;
    onViewGlobalPerformance?: () => void;
    onSelectOption?: (subject: Subject, option: 'past_exams' | 'topicwise' | 'mock_builder') => void;
}

const SUBJECT_ICONS: Record<Subject, React.ElementType> = {
    'Math': Calculator,
    'Physics': Atom,
    'Chemistry': FlaskConical,
    'Biology': Leaf,
    'Botany': Sprout || Leaf,
    'Zoology': PawPrint || Flower2
};

const getPotentialGain = (m: number, a: number) => {
    if (m >= 98) return 1;
    const base = a > 70 ? 12 : a > 40 ? 8 : 4;
    const multiplier = (100 - m) / 100;
    return Math.max(2, Math.round(base * multiplier + (a / 25)));
};

const MobileSubjectSelectionPage: React.FC<SubjectSelectionPageProps> = ({
    examContext,
    onSelectSubject,
    onBack,
    subjectProgress,
    onViewGlobalPerformance,
    onSelectOption
}) => {
    const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
    const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
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

    const [aiInsights, setAiInsights] = useState<{
        title: string;
        description: string;
        focusArea: string;
        trend: 'improving' | 'stable' | 'attention';
        tags: string[];
    } | null>(null);

    const availableSubjects = useMemo(() => {
        let subjects = (Object.keys(SUBJECT_CONFIGS) as Subject[]).filter(
            subject => SUBJECT_CONFIGS[subject].supportedExams.includes(examContext)
        );

        // NEET Pivot: Show ONLY sub-disciplines for Biology (Botany/Zoology)
        if (examContext === 'NEET') {
            subjects = subjects.filter(s => s !== 'Biology');
        }

        return subjects;
    }, [examContext]);


    // LOGIC ENGINE: Dynamic Strategy Generation (Synced with Desktop)
    const generateIntelligentStrategy = useCallback((
        stats: typeof comprehensiveStats,
        progress: Record<Subject, SubjectProgress> | undefined,
        exam: ExamContext
    ) => {
        const subjects = Object.keys(SUBJECT_CONFIGS) as Subject[];
        const activeSubjects = subjects.filter(s => SUBJECT_CONFIGS[s].supportedExams.includes(exam));

        const subjectMetrics = activeSubjects.map(s => ({
            name: s,
            mastery: progress?.[s]?.overallMastery || 0,
            accuracy: progress?.[s]?.overallAccuracy ?? 0,
            volume: progress?.[s]?.totalQuestionsAttempted || 0,
            topics: stats.subjectStats[s]?.topics || 0
        }));

        const avgMastery = subjectMetrics.reduce((sum, s) => sum + s.mastery, 0) / activeSubjects.length;
        const avgAccuracy = subjectMetrics.reduce((sum, s) => sum + s.accuracy, 0) / activeSubjects.length;
        const totalVolume = subjectMetrics.reduce((sum, s) => sum + s.volume, 0);

        const sortedByMastery = [...subjectMetrics].sort((a, b) => a.mastery - b.mastery);
        const weakest = sortedByMastery[0];
        const strongest = sortedByMastery[subjectMetrics.length - 1];
        const masteryGap = strongest.mastery - weakest.mastery;

        let title = "AI Is Learning Your Style";
        let description = "Start practising to let AI figure out your strengths and where you need the most help.";
        let focusArea = "General";
        let trend: 'improving' | 'stable' | 'attention' = 'stable';
        let tags = ["Calibration"];

        if (totalVolume === 0) {
            title = "Let's Get Started!";
            description = `AI is ready to personalise your ${exam} prep — it just needs your first few answers to figure out where you stand. Pick any subject and start practising!`;
            tags = ["Ready to Go", "First Steps"];
        }
        else if (totalVolume < 50 || avgMastery < 3) {
            title = "AI Is Learning Your Style";
            const masteryValue = Math.round(avgMastery);
            description = `You're off to a good start! ${masteryValue === 0 && avgAccuracy > 0 ? "Your accuracy looks promising — keep going and AI will start giving you personalised tips." : `Do ${25} more questions and AI will unlock a personalised study plan just for you.`}`;
            tags = ["Getting Started", "Almost There"];
        }
        else if (masteryGap > 40 && avgMastery > 20) {
            title = "One Subject Needs Attention";
            description = `You're doing well in ${strongest.name}, but ${weakest.name} (${weakest.mastery}% mastery) is holding back your overall ${exam} score. Focus there for the next few days and AI will guide you through it.`;
            focusArea = weakest.name;
            trend = 'attention';
            tags = ["Focus Here", "Quick Win"];
        }
        else if (avgAccuracy < 50 && totalVolume > 50) {
            title = "Slow Down to Speed Up";
            description = `You've practised a lot (${totalVolume} questions!), but accuracy is at ${Math.round(avgAccuracy)}%. AI suggests slowing down on ${weakest.name} — understanding each answer properly will boost your score faster.`;
            focusArea = weakest.name;
            trend = 'attention';
            tags = ["Build Accuracy", "Focus Mode"];
        }
        else if (avgMastery > 70) {
            title = "You're in Top Form!";
            description = `Your syllabus coverage is excellent. AI recommends shifting to timed mock tests and tricky edge-case questions to push your score even higher before exam day.`;
            trend = 'improving';
            tags = ["Top Form", "Final Push"];
        }
        else if (avgMastery > 20 && totalVolume > 80) {
            title = "Great Progress — Keep Going!";
            description = `Your ${exam} prep is on the right track. ${weakest.name} is your next big opportunity — a few focused sessions there and AI predicts a solid jump in your score.`;
            focusArea = weakest.name;
            trend = 'improving';
            tags = ["On Track", "High Yield"];
        }
        else {
            title = "Building Your Foundation";
            description = `You're making steady progress! Average accuracy is ${Math.round(avgAccuracy)}%. Keep practising daily and finish ${activeSubjects.length * 2} more topics — AI will show you exactly which ones matter most.`;
            tags = ["Stay Consistent", "Keep Going"];
        }

        return { title, description, focusArea, trend, tags };
    }, []);

    const fetchComprehensiveStats = useCallback(async () => {
        try {
            // Phase 1: Scans (no analysis_data) + topics in parallel
            const [{ data: publishedScans }, { data: allTopics }] = await Promise.all([
                supabase
                    .from('scans')
                    .select('id, subject')
                    .eq('is_system_scan', true)
                    .eq('exam_context', examContext),
                supabase.from('topics').select('id, subject, domain'),
            ]);

            if (!publishedScans) return;

            const scanIds = publishedScans.map(s => s.id);

            // Phase 2: All count queries in parallel (need scanIds from Phase 1)
            const empty = Promise.resolve({ data: [] as any[] });
            const sketchPromise = scanIds.length > 0
                ? supabase.from('topic_sketches').select('scan_id').in('scan_id', scanIds)
                : empty;
            const flashcardPromise = scanIds.length > 0
                ? supabase.from('flashcards').select('scan_id, data').in('scan_id', scanIds)
                : empty;

            const subjectCountPromises = availableSubjects.map(async (subject) => {
                const isNeetSub = examContext === 'NEET' && (subject === 'Botany' || subject === 'Zoology');
                const { count: directCount } = await supabase
                    .from('questions')
                    .select('*', { count: 'exact', head: true })
                    .eq('subject', subject)
                    .in('scan_id', scanIds);
                let qCount = directCount || 0;
                if (qCount === 0 && isNeetSub) {
                    const { count: biologyTotal } = await supabase
                        .from('questions')
                        .select('*', { count: 'exact', head: true })
                        .eq('subject', 'Biology')
                        .in('scan_id', scanIds);
                    qCount = Math.floor((biologyTotal || 0) / 2);
                }
                return [subject, qCount] as [Subject, number];
            });

            const [sketchResult, flashcardResult, ...subjectCountResults] = await Promise.all([
                sketchPromise,
                flashcardPromise,
                ...subjectCountPromises,
            ]);

            const sketchCountByScan: Record<string, number> = {};
            (sketchResult.data || []).forEach((r: any) => {
                sketchCountByScan[r.scan_id] = (sketchCountByScan[r.scan_id] || 0) + 1;
            });
            const flashcardRecords: { scan_id: string; data: any[] }[] = flashcardResult.data || [];

            const subjectPromises = (subjectCountResults as [Subject, number][]).map(([subject, qCount]) => {
                const isNeetSub = examContext === 'NEET' && (subject === 'Botany' || subject === 'Zoology');
                const isNeetMain = examContext === 'NEET' && (subject === 'Physics' || subject === 'Chemistry');
                const subjectScanIds = publishedScans.filter(s =>
                    s.subject === subject ||
                    (examContext === 'NEET' && s.subject === 'Combined' && (isNeetSub || isNeetMain)) ||
                    (examContext === 'NEET' && s.subject === 'Biology' && isNeetSub)
                ).map(s => s.id);

                const subjectSketches = subjectScanIds.reduce((sum, sid) => sum + (sketchCountByScan[sid] || 0), 0);
                const subjectFlashcards = flashcardRecords
                    .filter(f => subjectScanIds.includes(f.scan_id))
                    .reduce((sum, f) => sum + (Array.isArray(f.data) ? f.data.length : 0), 0);
                const subjectTopics = allTopics?.filter(t => t.subject === subject).length || 0;

                return [subject, { questions: qCount, sketches: subjectSketches, flashcards: subjectFlashcards, topics: subjectTopics }] as [Subject, any];
            });

            const subjectStatsDict = Object.fromEntries(subjectPromises) as Record<Subject, any>;

            const totalQuestions = Object.values(subjectStatsDict).reduce((sum, s: any) => sum + s.questions, 0);
            const totalSketches = Object.values(subjectStatsDict).reduce((sum, s: any) => sum + s.sketches, 0);
            const totalFlashcards = Object.values(subjectStatsDict).reduce((sum, s: any) => sum + s.flashcards, 0);
            const totalTopics = Object.values(subjectStatsDict).reduce((sum, s: any) => sum + s.topics, 0);

            const newStats = {
                totalQuestions,
                totalSketches,
                totalFlashcards,
                totalTopics,
                subjectStats: subjectStatsDict
            };

            setComprehensiveStats(newStats);
            const strategy = generateIntelligentStrategy(newStats, subjectProgress, examContext);
            setAiInsights(strategy);

        } catch (error) {
            console.error('Error fetching comprehensive stats:', error);
        }
    }, [availableSubjects, subjectProgress, examContext, generateIntelligentStrategy]);

    useEffect(() => {
        fetchComprehensiveStats();
    }, [fetchComprehensiveStats]);

    const averageMastery = availableSubjects.length > 0
        ? availableSubjects.reduce((sum, s) => sum + (subjectProgress?.[s]?.overallMastery || 0), 0) / availableSubjects.length
        : 0;

    const averageAccuracy = availableSubjects.length > 0
        ? availableSubjects.reduce((sum, s) => sum + (subjectProgress?.[s]?.overallAccuracy || 0), 0) / availableSubjects.length
        : 0;

    return (
        <div className="h-screen bg-[#F8FAFC] flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 pt-12 pb-6 px-4 rounded-b-[2rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary-500/10 rounded-full blur-[80px]" />
                <div className="relative z-10">
                    {/* Top bar: [☰][←] | title | [✨] */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('openMobileMenu'))}
                                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 border border-white/10 active:bg-white/20 transition-all"
                                aria-label="Open menu"
                            >
                                <Menu size={16} />
                            </button>
                            <button
                                onClick={onBack}
                                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 border border-white/10 active:bg-white/20 transition-all"
                                aria-label="Go back"
                            >
                                <ChevronRight className="rotate-180" size={16} />
                            </button>
                        </div>
                        <div className="text-center">
                            <h1 className="text-sm font-black text-white tracking-wide font-outfit">Your Subjects</h1>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{examContext}</p>
                        </div>
                        <button
                            onClick={() => setIsAiDrawerOpen(true)}
                            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-primary-400 border border-white/10 relative active:bg-white/20 transition-all"
                        >
                            <Sparkles size={16} />
                            {aiInsights && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-slate-900" />
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                            <p className="text-[9px] font-bold text-white/40 tracking-wide mb-1">Global Mastery</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-white">{Math.round(averageMastery)}%</span>
                                <span className="text-[10px] font-bold text-primary-400">SYNCED</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                            <p className="text-[9px] font-bold text-white/40 tracking-wide mb-1">Global Accuracy</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-white">{Math.round(averageAccuracy)}%</span>
                                <span className="text-[10px] font-bold text-indigo-400">LIVE</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 -mt-6 relative z-20 flex-1 overflow-y-auto pb-24 custom-scrollbar">
                {/* NEURAL HUB: ACTIVE INTELLIGENCE (HIGHER PROMINENCE) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full relative mb-12"
                >
                    <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full" />
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsAiDrawerOpen(true)}
                        className="w-full relative bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border border-white/5 flex flex-col gap-6 overflow-hidden group"
                    >
                        {/* Decorative background neural lines */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-[60px] -ml-16 -mb-16" />

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary-500/20 border border-primary-500/20 flex items-center justify-center text-primary-400 shadow-inner">
                                    <Brain size={24} className="fill-current animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-primary-400 tracking-wide">Active Intelligence</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-500 tracking-wide leading-none mt-1">Real-time Strategy Pivot</p>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 border border-white/5">
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-xl font-extrabold text-white tracking-tight mb-2 font-outfit">
                                {aiInsights ? aiInsights.title : "AI is getting ready..."}
                            </h3>
                            <p className="text-sm font-medium text-slate-400 leading-relaxed font-instrument">
                                "{aiInsights ? aiInsights.description : "Start practising and AI will show you exactly what to work on next."}"
                            </p>
                        </div>

                        {aiInsights && (
                            <div className="flex gap-2 relative z-10">
                                {aiInsights.tags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[8px] font-bold text-slate-500 tracking-wide">{tag}</span>
                                ))}
                            </div>
                        )}
                    </motion.button>
                </motion.div>

                {/* Subject Cards */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    {availableSubjects.map((subject, index) => {
                        const config = SUBJECT_CONFIGS[subject];
                        const mastery = subjectProgress?.[subject]?.overallMastery || 0;
                        const accuracy = subjectProgress?.[subject]?.overallAccuracy || 0;
                        const stats = comprehensiveStats.subjectStats[subject] || { questions: 0, sketches: 0, flashcards: 0, topics: 0 };
                        const Icon = SUBJECT_ICONS[subject] || BookOpen;

                        const isExpanded = expandedSubjectId === subject;

                        return (
                            <motion.div
                                key={subject}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={`w-full bg-white rounded-3xl overflow-hidden border transition-all ${isExpanded ? 'shadow-xl border-slate-200 ring-2 ring-slate-900/5 col-span-2' : 'border-slate-100 shadow-sm'}`}
                            >
                                <button
                                    onClick={() => setExpandedSubjectId(isExpanded ? null : subject)}
                                    className="w-full p-4 text-left active:scale-[0.98] transition-all relative"
                                >
                                    <div className="flex flex-col items-center text-center gap-2 mb-3">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                                            style={{ background: `linear-gradient(135deg, ${config.color}, ${config.colorDark})` }}
                                        >
                                            <Icon size={24} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-extrabold text-slate-900 font-outfit tracking-tight">
                                                {config.displayName}
                                            </h3>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span className={`text-[8px] font-bold tracking-wide ${isExpanded ? 'text-primary-600' : 'text-slate-400'}`}>
                                                    {isExpanded ? 'Active Arena' : 'Core Path'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        <span className="text-xl font-extrabold text-slate-900 font-outfit">{Math.round(mastery)}%</span>
                                        <p className="text-[8px] font-bold text-slate-400">Mastery</p>
                                    </div>

                                    {/* DYNAMIC CALCULATION FOR POTENTIAL */}
                                    {(() => {
                                        const potential = getPotentialGain(mastery, accuracy);

                                        return (
                                            <div className="flex items-center justify-center">
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-primary-600 tracking-wide">
                                                    <TrendingUp size={12} />
                                                    +{potential}%
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="bg-slate-50 border-t border-slate-100 p-4 space-y-4"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-1 h-3 bg-slate-900 rounded-full" />
                                                <span className="text-[9px] font-bold text-slate-400 tracking-wide">Quick Start</span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2">
                                                <button
                                                    onClick={() => onSelectOption?.(subject, 'topicwise')}
                                                    className="w-full bg-white rounded-xl p-3 flex items-center justify-between border border-slate-200 shadow-sm active:bg-indigo-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                                            <BookOpen size={16} />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-xs font-bold text-slate-900">Topic Mastery</div>
                                                            <div className="text-[8px] font-bold text-slate-400 tracking-wide">AI tracks what you know</div>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={12} className="text-slate-300" />
                                                </button>

                                                <button
                                                    onClick={() => onSelectOption?.(subject, 'past_exams')}
                                                    className="w-full bg-white rounded-xl p-3 flex items-center justify-between border border-slate-200 shadow-sm active:bg-amber-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                                            <HistoryIcon size={16} />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-xs font-bold text-slate-900">Past Year Papers</div>
                                                            <div className="text-[8px] font-bold text-slate-400 tracking-wide">AI explains every answer</div>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={12} className="text-slate-300" />
                                                </button>

                                                <button
                                                    onClick={() => onSelectOption?.(subject, 'mock_builder')}
                                                    className="w-full bg-white rounded-xl p-3 flex items-center justify-between border border-slate-200 shadow-sm active:bg-primary-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                                                            <Zap size={16} />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-xs font-bold text-slate-900">AI Practice Test</div>
                                                            <div className="text-[8px] font-bold text-slate-400 tracking-wide">AI builds your test for you</div>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={12} className="text-slate-300" />
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => onSelectSubject(subject)}
                                                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold tracking-wide active:scale-[0.98] transition-all"
                                            >
                                                Full subject dashboard
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* AI ANALYST DRAWER (MOBILE OPTIMIZED) */}
            <AnimatePresence>
                {isAiDrawerOpen && aiInsights && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAiDrawerOpen(false)}
                            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100]"
                        />

                        {/* Drawer */}
                        <motion.aside
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-x-0 bottom-0 top-[10%] bg-[#0f172a] shadow-[-20px_0_50px_rgba(0,0,0,0.3)] z-[101] flex flex-col border-t border-white/10 rounded-t-[2.5rem] overflow-hidden"
                        >
                            {/* Drawer Handle */}
                            <div className="w-12 h-1 bg-slate-700/50 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                            <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-8 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
                                            <Sparkles size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">AI Analyst</h2>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Intelligence Dashboard</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsAiDrawerOpen(false)}
                                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* Strategy Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-[9px] font-black uppercase tracking-widest border border-primary-500/30">Current Strategy</div>
                                            {aiInsights.tags.map(tag => (
                                                <span key={tag} className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{tag}</span>
                                            ))}
                                        </div>
                                        <h3 className="text-3xl font-black text-white tracking-tight italic uppercase font-outfit leading-tight">
                                            {aiInsights.title}
                                        </h3>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                            <p className="text-base text-slate-300 font-medium font-instrument leading-relaxed">
                                                {aiInsights.description.split(aiInsights.focusArea).map((part, i, arr) => (
                                                    <React.Fragment key={i}>
                                                        {part}
                                                        {i < arr.length - 1 && <span className="text-white font-bold underline decoration-primary-500/50 decoration-2 underline-offset-4">{aiInsights.focusArea}</span>}
                                                    </React.Fragment>
                                                ))}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Impact Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Activity size={12} /> Priority Area
                                            </div>
                                            <div className="text-xl font-black text-white uppercase italic">{aiInsights.focusArea}</div>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <TrendingUp size={12} className="text-emerald-400" /> Est. Impact
                                            </div>
                                            <div className="text-2xl font-black text-emerald-400 font-outfit">
                                                +{(() => {
                                                    const focusSubject = aiInsights.focusArea as Subject;
                                                    const m = subjectProgress?.[focusSubject]?.overallMastery || 0;
                                                    const a = subjectProgress?.[focusSubject]?.overallAccuracy || 0;
                                                    return getPotentialGain(m, a);
                                                })()}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Full Syllabus Matrix */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Overall Exam Matrix</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-primary-400 uppercase tracking-widest">Real-time</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {availableSubjects.map((s) => {
                                                const m = subjectProgress?.[s]?.overallMastery || 0;
                                                const isPriority = s === aiInsights.focusArea;
                                                let status = "Stable";
                                                let colorClass = "text-slate-400";
                                                let borderClass = "border-white/5";
                                                let progressColor = "bg-slate-400";

                                                if (m < 40) { status = "Critical"; colorClass = "text-rose-400"; borderClass = "border-rose-500/20"; progressColor = "bg-rose-500"; }
                                                else if (m > 80) { status = "Excelling"; colorClass = "text-emerald-400"; borderClass = "border-emerald-500/20"; progressColor = "bg-emerald-500"; }
                                                else if (m > 60) { status = "Optimal"; colorClass = "text-blue-400"; borderClass = "border-blue-500/20"; progressColor = "bg-blue-500"; }

                                                return (
                                                    <div
                                                        key={s}
                                                        className={`p-4 rounded-2xl border transition-all ${isPriority ? 'bg-primary-500/10 border-primary-500/30' : 'bg-white/5 ' + borderClass}`}
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full ${progressColor}`} />
                                                                <span className={`text-sm font-black uppercase italic tracking-tight ${isPriority ? 'text-primary-400' : 'text-slate-200'}`}>{s}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-white/5 border border-white/10 ${colorClass}`}>{status}</span>
                                                                <span className="text-sm font-black text-white w-10 text-right">{Math.round(m)}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${m}%` }}
                                                                className={`h-full rounded-full ${progressColor}`}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Bottom Call to Action */}
                                    <div className="py-4">
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                if (aiInsights.focusArea !== 'General') {
                                                    onSelectSubject(aiInsights.focusArea as Subject);
                                                }
                                                setIsAiDrawerOpen(false);
                                            }}
                                            className="w-full py-5 rounded-2xl bg-white text-slate-900 font-black text-sm shadow-2xl flex items-center justify-center gap-3 active:bg-slate-100 transition-colors"
                                        >
                                            BOOST {aiInsights.focusArea.toUpperCase()} PERFORMANCE
                                            <ArrowRight size={18} strokeWidth={3} />
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto p-6 pt-0 space-y-4 border-t border-white/5 bg-[#0f172a]">
                                <button
                                    onClick={() => {
                                        onViewGlobalPerformance?.();
                                        setIsAiDrawerOpen(false);
                                    }}
                                    className="w-full py-4 rounded-xl bg-slate-800 text-white font-bold text-xs border border-white/10 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <BarChart3 size={16} /> OPEN FULL DASHBOARD
                                </button>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest justify-center pb-4">
                                    <Zap size={14} className="text-amber-500" />
                                    Strategy recalibrates after every session
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )
                }
            </AnimatePresence >

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
            `}</style>
        </div >
    );
};

export default MobileSubjectSelectionPage;
