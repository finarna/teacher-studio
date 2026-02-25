import React from 'react';
import {
    GraduationCap,
    FlaskConical,
    Atom,
    BookMarked,
    ArrowRight,
    Sparkles,
    Zap,
    Target,
    Trophy,
    ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { ExamContext } from '../types';

interface TrajectorySelectionPageProps {
    onSelectTrajectory: (trajectory: ExamContext) => void;
    userProgress?: Record<ExamContext, {
        overallMastery: number;
        subjectsCompleted: number;
        totalSubjects: number;
    }>;
}

const TRAJECTORIES = [
    {
        id: 'KCET' as ExamContext,
        name: 'KCET',
        fullName: 'Karnataka Common Entrance',
        icon: GraduationCap,
        gradient: 'from-orange-500 to-amber-600',
        stat: 'State Focus',
        color: '#F59E0B'
    },
    {
        id: 'NEET' as ExamContext,
        name: 'NEET',
        fullName: 'Medical Entrance',
        icon: FlaskConical,
        gradient: 'from-emerald-500 to-teal-600',
        stat: 'Biology Track',
        color: '#10B981'
    },
    {
        id: 'JEE' as ExamContext,
        name: 'JEE MAIN',
        fullName: 'Engineering Entrance',
        icon: Atom,
        gradient: 'from-blue-500 to-indigo-600',
        stat: 'Physics & Math',
        color: '#3B82F6'
    },
    {
        id: 'CBSE' as ExamContext,
        name: 'BOARDS',
        fullName: 'Central Board',
        icon: BookMarked,
        gradient: 'from-pink-500 to-rose-600',
        stat: 'Foundation',
        color: '#EC4899'
    }
];

const MobileTrajectorySelectionPage: React.FC<TrajectorySelectionPageProps> = ({
    onSelectTrajectory,
    userProgress
}) => {
    return (
        <div className="h-screen bg-[#F8FAFC] flex flex-col overflow-hidden">
            {/* 1. FIXED HEADER SECTION */}
            <div className="relative shrink-0 z-20">
                {/* Background Accents (Fixed) */}
                <div className="absolute top-0 inset-x-0 h-[280px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-b-[3rem] z-0 shadow-2xl overflow-hidden">
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary-500/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px]" />
                </div>

                <div className="relative z-10 px-6 pt-10 pb-2">
                    {/* Header */}
                    <div className="mb-10">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 mb-4"
                        >
                            <Sparkles size={12} className="text-amber-400" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Mission Protocol</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl font-black text-white font-outfit uppercase tracking-tight leading-tight italic"
                        >
                            Choose Your <br />
                            <span className="text-primary-400 non-italic">Trajectory</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-slate-400 font-medium text-sm mt-2 max-w-[280px]"
                        >
                            Select a learning path tailored to your exam target and goals.
                        </motion.p>
                    </div>

                    {/* Global Progress Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-3xl p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between mb-8"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
                                <Trophy size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Mastery</p>
                                <h3 className="text-xl font-black text-slate-900 font-outfit italic">EXCELLENCE LEVEL</h3>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-black text-primary-600 font-outfit">
                                {(() => {
                                    if (!userProgress) return 0;
                                    const values = Object.values(userProgress).map(p => p.overallMastery);
                                    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
                                })()}%
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* 2. SCROLLABLE CONTENT SECTION */}
                <div className="flex-1 overflow-y-auto px-6 pt-6 pb-32 custom-scrollbar relative z-10">

                    {/* Trajectory Grid/List */}
                    <div className="space-y-4">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Available Paths</p>
                        {TRAJECTORIES.map((trajectory, index) => {
                            const Icon = trajectory.icon;
                            const progress = userProgress?.[trajectory.id]?.overallMastery || 0;

                            return (
                                <motion.button
                                    key={trajectory.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + (index * 0.1) }}
                                    onClick={() => onSelectTrajectory(trajectory.id)}
                                    className="w-full bg-white rounded-3xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm active:scale-[0.97] transition-all relative overflow-hidden group"
                                >
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${trajectory.gradient} flex items-center justify-center text-white shadow-lg shrink-0`}>
                                        <Icon size={28} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest leading-none">
                                                {trajectory.stat}
                                            </span>
                                            <div className="w-1 h-2.5 bg-primary-100 rounded-full" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 font-outfit tracking-tighter uppercase italic leading-none mb-1">
                                            {trajectory.name}
                                        </h3>
                                        <p className="text-[11px] font-bold text-slate-400 truncate">
                                            {trajectory.fullName}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {progress > 0 ? (
                                            <div className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-full border border-emerald-100">
                                                {progress}%
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-active:translate-x-1 transition-transform">
                                                <ChevronRight size={18} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Subtle Progress Bar */}
                                    {progress > 0 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-50 overflow-hidden">
                                            <div
                                                className={`h-full bg-gradient-to-r ${trajectory.gradient}`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* AI Insight Pill Mobile */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-10 p-5 bg-primary-50 rounded-[2rem] border border-primary-100/50 flex gap-4"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary-600 shadow-sm shrink-0">
                            <Zap size={20} className="fill-primary-600" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-primary-400 uppercase tracking-widest mb-1">Daily Brief</p>
                            <p className="text-[13px] font-bold text-slate-700 leading-snug italic">
                                Exam peaks are appearing in <span className="text-primary-600">Calculus</span>. Start your Math trajectory to lock in these marks.
                            </p>
                        </div>
                    </motion.div>
                </div>

            </div>
        </div>
    );
};

export default MobileTrajectorySelectionPage;
