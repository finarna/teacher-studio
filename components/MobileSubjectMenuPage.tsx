import React, { useState, useEffect } from 'react';
import {
    Calendar,
    BookOpen,
    Zap,
    ChevronLeft,
    ArrowRight,
    TrendingUp,
    Target,
    Play,
    Calculator,
    Atom,
    FlaskConical,
    Leaf,
    Brain,
    History,
    Layout,
    Menu
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Subject, ExamContext } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { supabase } from '../lib/supabase';
import { useLearningJourney } from '../contexts/LearningJourneyContext';

interface SubjectMenuPageProps {
    subject: Subject;
    examContext: ExamContext;
    onSelectOption: (option: 'past_exams' | 'topicwise' | 'mock_builder') => void;
    onBack: () => void;
}

const MobileSubjectMenuPage: React.FC<SubjectMenuPageProps> = ({
    subject,
    examContext,
    onSelectOption,
    onBack
}) => {
    const [stats, setStats] = useState({
        totalTopics: 0,
        masteredTopics: 0,
        totalPapers: 0,
        customTestsTaken: 0
    });

    const { subjectProgress } = useLearningJourney();
    const subProg = subjectProgress[subject];
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const [
                    { count: totalTopicsCount },
                    { data: scansData },
                    { count: mCount },
                    { data: testsData }
                ] = await Promise.all([
                    supabase.from('topics').select('*', { count: 'exact', head: true }).eq('subject', subject),
                    supabase.from('scans').select('id').eq('subject', subject).eq('exam_context', examContext).not('year', 'is', null),
                    supabase.from('topic_resources').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('subject', subject).gte('mastery_level', 85),
                    supabase.from('test_attempts').select('id').eq('user_id', user.id).eq('subject', subject).eq('test_type', 'full_mock').eq('status', 'completed')
                ]);

                setStats({
                    totalTopics: totalTopicsCount || 0,
                    masteredTopics: mCount || 0,
                    totalPapers: scansData?.length || 0,
                    customTestsTaken: testsData?.length || 0
                });
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [subject, examContext]);

    const config = SUBJECT_CONFIGS[subject];
    const Icon = config.icon === 'Calculator' ? Calculator :
        config.icon === 'Atom' ? Atom :
            config.icon === 'FlaskConical' ? FlaskConical : Leaf;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24">
            {/* Header */}
            <div className="bg-slate-900 pt-12 pb-10 px-4 rounded-b-[2rem] shadow-xl relative overflow-hidden">
                <div
                    className="absolute top-0 right-0 w-64 h-64 opacity-10 blur-[80px]"
                    style={{ backgroundColor: config.color }}
                />

                {/* Top bar: [☰][←] | subject + exam | icon */}
                <div className="relative z-10 flex items-center justify-between mb-6">
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
                            <ChevronLeft size={16} />
                        </button>
                    </div>
                    <div className="text-center">
                        <h1 className="text-sm font-black text-white tracking-wide font-outfit">{subject}</h1>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{examContext}</p>
                    </div>
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0"
                        style={{ background: `linear-gradient(135deg, ${config.color}, ${config.colorDark})` }}
                    >
                        <Icon size={18} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-6 mt-4 relative z-20 space-y-6">
                {/* Status Dashboard */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mastery Score</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900 font-outfit">{Math.round(subProg?.overallMastery || 0)}%</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Accuracy Score</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900 font-outfit">{Math.round(subProg?.overallAccuracy || 0)}%</span>
                        </div>
                    </div>
                </div>

                {/* AI Insight Bubble */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-primary-600 rounded-[2rem] p-5 shadow-xl flex gap-4 text-white relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                        <Brain size={24} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">AI Recommendation</p>
                        <p className="text-sm font-bold leading-snug italic">
                            {(subProg?.overallMastery || 0) < 40
                                ? `"Focus on building core ${subject} fundamentals through Topic Mastery Hub before attempting mocks."`
                                : (subProg?.overallMastery || 0) < 75
                                    ? `"Your fundamentals are stable. Shift to Solved Paper Vault to test your application speed."`
                                    : `"Elite performance detected. Build a session in the Exam Prediction and Simulation Test Engine with Hard difficulty to push the boundaries."`}
                        </p>
                    </div>
                </motion.div>

                {/* Action Menu */}
                <div className="space-y-4">
                    <button
                        onClick={() => onSelectOption('topicwise')}
                        className="w-full bg-white rounded-[2rem] p-6 flex items-center justify-between border border-slate-100 shadow-sm active:scale-[0.98] transition-all group overflow-hidden relative"
                    >
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <BookOpen size={28} />
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-black text-slate-900 font-outfit uppercase italic leading-none mb-1">Topic Mastery Hub</h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">AI-Driven Pattern Mastery</p>
                            </div>
                        </div>
                        <div className="relative z-10 text-right">
                            <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 border border-slate-100">
                                {stats.totalTopics} TOPICS
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-indigo-500/0 group-active:bg-indigo-500/5 transition-colors" />
                    </button>

                    <button
                        onClick={() => onSelectOption('past_exams')}
                        className="w-full bg-white rounded-[2rem] p-6 flex items-center justify-between border border-slate-100 shadow-sm active:scale-[0.98] transition-all group overflow-hidden relative"
                    >
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <History size={28} />
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-black text-slate-900 font-outfit uppercase italic leading-none mb-1">Solved Paper Vault</h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Historical Exam Logic</p>
                            </div>
                        </div>
                        <div className="relative z-10 text-right">
                            <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 border border-slate-100">
                                {stats.totalPapers} PAPERS
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-amber-500/0 group-active:bg-amber-500/5 transition-colors" />
                    </button>

                    <button
                        onClick={() => onSelectOption('mock_builder')}
                        className="w-full bg-white rounded-[2rem] p-6 flex items-center justify-between border border-slate-100 shadow-sm active:scale-[0.98] transition-all group overflow-hidden relative"
                    >
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
                                <Zap size={28} />
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-black text-slate-900 font-outfit uppercase italic leading-none mb-1 text-wrap pr-10">Exam Prediction and Simulation Engine</h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Adaptive Hybrid • Pattern Prediction</p>
                            </div>
                        </div>
                        <div className="relative z-10 text-right">
                            <div className="bg-primary-50 px-3 py-1 rounded-full text-[10px] font-black text-primary-600 border border-primary-100">
                                AI PREDICTED
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-primary-500/0 group-active:bg-primary-500/5 transition-colors" />
                    </button>
                </div>

                {/* Recent Performance Chart (Simplified) */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Growth Index</h3>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                            <TrendingUp size={12} />
                            +12% TREND
                        </div>
                    </div>
                    <div className="flex items-end justify-between h-20 gap-2">
                        {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                            <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                className={`flex-1 rounded-t-lg ${i === 6 ? 'bg-primary-500' : 'bg-slate-100'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileSubjectMenuPage;
