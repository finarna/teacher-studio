
import React, { useState, useEffect } from 'react';
import {
    Brain,
    Zap,
    Target,
    TrendingUp,
    AlertTriangle,
    ShieldCheck,
    ChevronRight,
    Database,
    Search,
    Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStrategicBriefing } from '../lib/reiEvolutionEngine';
import type { Subject, ExamContext } from '../types';

interface StrategicBriefingProps {
    exam: ExamContext;
    subject: Subject;
}

const StrategicBriefing: React.FC<StrategicBriefingProps> = ({ exam, subject }) => {
    const [briefing, setBriefing] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadBriefing() {
            setLoading(true);
            const data = await getStrategicBriefing(exam, subject);
            setBriefing(data);
            setLoading(false);
        }
        loadBriefing();
    }, [exam, subject]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Brain className="animate-pulse mb-4 text-blue-500" size={32} />
                <p className="text-xs font-black uppercase tracking-widest font-outfit">Sycning with PyqChain...</p>
            </div>
        );
    }

    if (!briefing) {
        return (
            <div className="p-8 border-2 border-dashed border-slate-800 rounded-3xl text-center text-slate-500">
                <AlertTriangle className="mx-auto mb-3 text-amber-500/50" size={32} />
                <p className="text-sm font-bold">No Forecast Intelligence found for {exam} {subject}.</p>
                <p className="text-[10px] mt-1">Run a 2026 Forecast script to generate the Strategic Briefing.</p>
            </div>
        );
    }

    const traps = briefing.directives.filter((d: string) =>
        d.toLowerCase().includes('trap') ||
        d.toLowerCase().includes('shift') ||
        d.toLowerCase().includes('logic') ||
        d.toLowerCase().includes('seam')
    );

    const coreDirectives = briefing.directives.filter((d: string) => !traps.includes(d));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Board Signature Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/30 transition-all group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                            <ShieldCheck size={18} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Board Signature</h4>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-lg font-black text-white font-outfit italic tracking-tighter">{briefing.boardSignature}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-black">Persona Accuracy: 92%</span>
                    </div>
                </div>

                {/* Rigor Velocity Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                            <TrendingUp size={18} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rigor Velocity</h4>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-lg font-black text-white font-outfit italic tracking-tighter">{(briefing.rigorVelocity * 100).toFixed(0)}% Baseline</span>
                        <span className="text-[9px] text-slate-500 uppercase font-black">Forecast: {briefing.targetYear} Drifting +{(briefing.rigorVelocity > 1 ? (briefing.rigorVelocity - 1) * 100 : 0).toFixed(0)}%</span>
                    </div>
                </div>

                {/* Target Year Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-purple-500/30 transition-all group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:scale-110 transition-transform">
                            <Target size={18} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Oracle Target</h4>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-lg font-black text-white font-outfit italic tracking-tighter">March {briefing.targetYear}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-black">Prediction Status: Locked</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Strategic Traps */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={80} className="text-amber-500" />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 mb-6 flex items-center gap-2">
                        <AlertTriangle size={14} />
                        2026 Strategic Traps
                    </h4>
                    <div className="space-y-4">
                        {traps.map((trap: string, i: number) => (
                            <div key={i} className="flex gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-amber-500/20 transition-all">
                                <span className="text-amber-500/50 font-black text-xs font-outfit mt-0.5">0{i + 1}</span>
                                <p className="text-xs text-slate-300 leading-relaxed font-medium">{trap}</p>
                            </div>
                        ))}
                        {traps.length === 0 && <p className="text-slate-500 text-xs italic">No specific traps detected for this gradient.</p>}
                    </div>
                </div>

                {/* Forecast Directives */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Brain size={80} className="text-blue-500" />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 mb-6 flex items-center gap-2">
                        <Database size={14} />
                        Evolutionary Directives
                    </h4>
                    <div className="space-y-4">
                        {coreDirectives.map((dir: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-blue-500/20 transition-all">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <p className="text-xs text-slate-300 leading-tight font-medium">{dir}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Lock className="text-blue-400" size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">ADMIN STRATEGIC OVERRIDE ENABLED</span>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                    Edit Evolution Data <ChevronRight size={12} />
                </button>
            </div>
        </div>
    );
};

export default StrategicBriefing;
