import React, { useMemo } from 'react';
import {
    TrendingUp,
    Target,
    Zap,
    Brain,
    Activity,
    Clock,
    Award,
    ChevronRight,
    ArrowLeft,
    Sparkles,
    BarChart3,
    Radar,
    PieChart as PieChartIcon,
    Search,
    Filter,
    Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    Radar as ReRadar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    LineChart,
    Line
} from 'recharts';
import type { Subject, ExamContext, SubjectProgress } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';

interface PerformanceDashboardPageProps {
    examContext: ExamContext;
    subjectProgress?: Record<Subject, SubjectProgress>;
    onBack: () => void;
    onSelectSubject: (subject: Subject) => void;
}

const PerformanceDashboardPage: React.FC<PerformanceDashboardPageProps> = ({
    examContext,
    subjectProgress,
    onBack,
    onSelectSubject
}) => {
    const availableSubjects = useMemo(() =>
        (Object.keys(SUBJECT_CONFIGS) as Subject[]).filter(
            subject => SUBJECT_CONFIGS[subject].supportedExams.includes(examContext)
        ), [examContext]);

    // DERIVED DATA
    const globalMetrics = useMemo(() => {
        if (!subjectProgress) return { mastery: 0, accuracy: 0, volume: 0, time: 0 };

        let totalMastery = 0;
        let totalAccuracy = 0;
        let totalVolume = 0;
        let count = 0;

        availableSubjects.forEach(s => {
            const p = subjectProgress[s];
            if (p) {
                totalMastery += p.overallMastery || 0;
                totalAccuracy += p.overallAccuracy || 0;
                totalVolume += p.totalQuestionsAttempted || 0;
                count++;
            }
        });

        return {
            mastery: count > 0 ? totalMastery / count : 0,
            accuracy: count > 0 ? totalAccuracy / count : 0,
            volume: totalVolume,
            scoreEstimate: Math.round((totalMastery / (count || 1)) * 3.6), // Mock conversion for score
            percentileEstimate: 75 + (totalMastery / 10) // Mock percentile
        };
    }, [availableSubjects, subjectProgress]);

    const radarData = useMemo(() => {
        return availableSubjects.map(s => ({
            subject: s,
            mastery: subjectProgress?.[s]?.overallMastery || 10,
            accuracy: subjectProgress?.[s]?.overallAccuracy || 10,
            fullMark: 100
        }));
    }, [availableSubjects, subjectProgress]);

    const subjectPerformanceData = useMemo(() => {
        return availableSubjects.map(s => {
            const config = SUBJECT_CONFIGS[s];
            return {
                name: s,
                mastery: subjectProgress?.[s]?.overallMastery || 0,
                accuracy: subjectProgress?.[s]?.overallAccuracy || 0,
                color: config.color,
                topics: subjectProgress?.[s]?.topicsTotal || 0
            };
        }).sort((a, b) => b.mastery - a.mastery);
    }, [availableSubjects, subjectProgress]);

    const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

    return (
        <div className="min-h-screen bg-slate-50 font-instrument text-slate-900 selection:bg-primary-500 selection:text-white pb-20">
            {/* 1. Header & Quick Actions */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="h-6 w-px bg-slate-200" />
                        <h1 className="text-lg font-black text-slate-900 font-outfit uppercase tracking-tight italic">
                            Portfolio <span className="text-primary-600">Intelligence</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{examContext} Portfolio</span>
                        </div>
                        <button className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20 hover:scale-105 transition-transform">
                            <Sparkles size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 md:py-12">
                {/* 2. Hero Statistics */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
                    {/* Main Scorecard */}
                    <div className="lg:col-span-8 bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden flex flex-col justify-between min-h-[400px]">
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary-600/20 to-transparent pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary-500/10 rounded-full blur-[100px]" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest">
                                    Predicted {examContext} Score
                                </div>
                                <div className="flex items-center gap-1.5 text-emerald-400">
                                    <TrendingUp size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">+4% this week</span>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-8 mb-12">
                                <div className="text-7xl md:text-9xl font-black font-outfit tracking-tightest leading-none">
                                    {globalMetrics.scoreEstimate}<span className="text-primary-500">/</span>360
                                </div>
                                <div className="pb-2">
                                    <div className="text-xl md:text-2xl font-black text-white/50 font-outfit uppercase tracking-widest italic">{globalMetrics.percentileEstimate.toFixed(1)}th Percentile</div>
                                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Estimated Global Standing</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Global Mastery</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black tabular-nums">{Math.round(globalMetrics.mastery)}%</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Global Accuracy</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black tabular-nums text-emerald-400">{Math.round(globalMetrics.accuracy)}%</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active nodes</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black tabular-nums">{globalMetrics.volume}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Syllabus Status</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black tabular-nums text-primary-400">Stable</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex flex-col md:flex-row items-center gap-4 relative z-10">
                            <button className="w-full md:w-auto px-8 py-4 bg-white text-slate-900 font-black text-xs rounded-2xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">
                                Download Full Transcript
                            </button>
                            <button className="w-full md:w-auto px-8 py-4 bg-white/10 border border-white/20 text-white font-black text-xs rounded-2xl uppercase tracking-widest hover:bg-white/20 transition-all">
                                Compare with Toppers
                            </button>
                        </div>
                    </div>

                    {/* AI Strategy Spotlight */}
                    <div className="lg:col-span-4 bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600">
                                    <Brain size={24} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight font-outfit italic">AI Strategy</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Macro Analysis</p>
                                </div>
                            </div>
                            <div className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase tracking-widest">Optimized</div>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Weakest Pillar</p>
                                <div className="text-2xl font-black text-slate-900 uppercase italic font-outfit">
                                    {subjectPerformanceData[subjectPerformanceData.length - 1]?.name || 'N/A'}
                                </div>
                                <p className="text-xs font-medium text-slate-600 italic leading-relaxed">
                                    "Your syllabus command is structurally imbalanced. Accelerating revision in this subject will yield the highest rank displacement."
                                </p>
                            </div>

                            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap size={14} className="text-indigo-600" />
                                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Next Critical Node</span>
                                </div>
                                <div className="text-sm font-bold text-slate-800 mb-2">Organic Chemistry: Oxygen Compounds</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Yield Potential</span>
                                    <span className="text-sm font-black text-indigo-600">+14 Marks</span>
                                </div>
                            </div>
                        </div>

                        <button className="mt-8 w-full py-4 bg-indigo-600 text-white font-black text-xs rounded-2xl uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                            Launch Mission <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                {/* 3. Visual Deep Dives */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Radar Chart: Subject Balance */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 font-outfit uppercase italic tracking-tight mb-1">Subject Equilibrium</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery vs Accuracy Balance</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <Radar size={20} />
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="#e2e8f0" strokeWidth={1} />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fill: '#64748b', fontSize: 10 }}
                                    />
                                    <PolarRadiusAxis
                                        angle={30}
                                        domain={[0, 100]}
                                        tick={false}
                                        axisLine={false}
                                    />
                                    <ReRadar
                                        name="Mastery"
                                        dataKey="mastery"
                                        stroke="#6366f1"
                                        fill="#6366f1"
                                        fillOpacity={0.3}
                                        strokeWidth={3}
                                    />
                                    <ReRadar
                                        name="Accuracy"
                                        dataKey="accuracy"
                                        stroke="#10b981"
                                        fill="#10b981"
                                        fillOpacity={0.15}
                                        strokeWidth={2}
                                        strokeDasharray="4 4"
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex justify-center gap-6 mt-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mastery</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Accuracy</span>
                            </div>
                        </div>
                    </div>

                    {/* Bar Chart: Comparative Performance */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-800 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black text-white font-outfit uppercase italic tracking-tight mb-1">Portfolio Comparison</h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Performance across active arenas</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500">
                                <BarChart3 size={20} />
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={subjectPerformanceData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff10" />
                                    <XAxis type="number" hide domain={[0, 100]} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '12px',
                                            color: 'white'
                                        }}
                                    />
                                    <Bar dataKey="mastery" radius={[0, 12, 12, 0]} barSize={32}>
                                        {subjectPerformanceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex items-center justify-between mt-6 text-white/40">
                            <span className="text-[10px] font-black uppercase tracking-widest">Relatively Weak</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Excelling</span>
                        </div>
                    </div>
                </div>

                {/* 4. Detailed Syllabus Matrix */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <h3 className="text-2xl font-black text-slate-900 font-outfit uppercase italic tracking-tight">Arena Breakdown</h3>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <Filter size={14} /> Filter
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <Users size={14} /> Peer Benchmarking
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {subjectPerformanceData.map((s, idx) => {
                            const config = SUBJECT_CONFIGS[s.name as Subject];
                            return (
                                <motion.div
                                    key={idx}
                                    whileHover={{ scale: 1.02 }}
                                    className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden relative group"
                                    onClick={() => onSelectSubject(s.name as Subject)}
                                >
                                    <div
                                        className="absolute top-0 left-0 w-1.5 h-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ backgroundColor: config.color }}
                                    />

                                    <div className="flex items-center justify-between mb-8">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                                            style={{ background: `linear-gradient(135deg, ${config.color}, ${config.colorDark})` }}
                                        >
                                            <span className="text-xl font-bold">{config.iconEmoji}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-slate-900 font-outfit tracking-tight">{Math.round(s.mastery)}%</div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mastery</div>
                                        </div>
                                    </div>

                                    <h4 className="text-xl font-black text-slate-900 font-outfit uppercase italic tracking-tight mb-4">{config.displayName}</h4>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Nodes</span>
                                            <span className="text-sm font-bold text-slate-700">{s.topics}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accuracy</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-emerald-600">{Math.round(s.accuracy)}%</span>
                                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${s.accuracy}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Rank Tier: Scholar</span>
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* 5. Mobile Tab Bar Spacer */}
            <div className="h-16 md:hidden" />
        </div>
    );
};

export default PerformanceDashboardPage;
