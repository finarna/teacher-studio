import React, { useState, useEffect } from 'react';
import {
    Signal,
    Sparkles,
    Settings,
    Monitor,
    Info,
    ChevronRight,
    Database,
    History,
    Cpu,
    ShieldCheck,
    Dna,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComplexityMatrixProps {
    easy: number;
    moderate: number;
    hard: number;
    isAuto: boolean;
    locked?: boolean;
    onAdjust: (easy: number, moderate: number, hard: number) => void;
    onToggleAuto: (auto: boolean) => void;
    stats: {
        learning: number; // 0-100 (notes, concept coverage)
        solve: number;    // 0-100 (practice accuracy)
        master: number;   // 0-100 (quiz performance)
        recall: number;   // 0-100 (flashcard mastery)
    };
}

const ComplexityMatrix: React.FC<ComplexityMatrixProps> = ({
    easy,
    moderate,
    hard,
    isAuto,
    locked,
    onAdjust,
    onToggleAuto,
    stats
}) => {
    const getReasonNote = () => {
        if (locked) return "Simulation Fidelity Priority: Board blueprints override personal metrics.";
        if (stats.master > 80 && stats.solve > 80) return "Mastery Detect: Advanced focus for Rank optimization.";
        if (stats.solve < 40) return "Foundation Focus: Reinforcing core mechanics due to accuracy gap.";
        if (stats.learning < 50) return "Structural Alert: Prioritizing Foundation nodes for stability.";
        return "Balanced Calibration: Optimizing across all engagement vectors.";
    };

    const handleSliderChange = (type: 'easy' | 'moderate' | 'hard', value: number) => {
        if (isAuto) return;
        let newEasy = easy, newModerate = moderate, newHard = hard;
        if (type === 'easy') {
            newEasy = value;
            const remaining = 100 - newEasy;
            const ratio = newModerate / (newModerate + newHard || 1);
            newModerate = Math.round(remaining * ratio);
            newHard = 100 - newEasy - newModerate;
        } else if (type === 'moderate') {
            newModerate = value;
            const remaining = 100 - newModerate;
            const ratio = newEasy / (newEasy + newHard || 1);
            newEasy = Math.round(remaining * ratio);
            newHard = 100 - newEasy - newModerate;
        } else {
            newHard = value;
            const remaining = 100 - newHard;
            const ratio = newEasy / (newEasy + newModerate || 1);
            newEasy = Math.round(remaining * ratio);
            newModerate = 100 - newEasy - newHard;
        }
        onAdjust(newEasy, newModerate, newHard);
    };

    return (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-900/5 shadow-sm p-6 md:p-8 relative overflow-hidden group">
            <div className="relative z-10">
                {/* Clean Professional Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <Signal size={22} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1 block">Efficiency Level</span>
                            <h3 className="text-xl font-black text-slate-900 font-outfit leading-none flex items-center gap-3">
                                Difficulty & Distribution
                                {locked && (
                                    <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-wider">
                                        <ShieldCheck size={10} />
                                        Locked: Simulation Fidelity
                                    </span>
                                )}
                            </h3>
                        </div>
                    </div>

                    {!locked && (
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                onClick={() => onToggleAuto(true)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isAuto ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                AI Pilot
                            </button>
                            <button
                                onClick={() => onToggleAuto(false)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isAuto ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Manual
                            </button>
                        </div>
                    )}
                </div>

                {/* Refined Sliders Grid - Matches MockTest style */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                        { id: 'easy', label: 'Foundation', val: easy, color: '#10b981', light: '#ecfdf5' },
                        { id: 'moderate', label: 'Standard', val: moderate, color: '#f59e0b', light: '#fffbeb' },
                        { id: 'hard', label: 'Advanced', val: hard, color: '#6366f1', light: '#f5f3ff' }
                    ].map(item => (
                        <div key={item.id} className="space-y-3">
                            <div className="flex justify-between items-end px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{item.label}</label>
                                <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">{item.val}%</span>
                            </div>
                            <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.val}%` }}
                                    transition={{ duration: 1, ease: "circOut" }}
                                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 shadow-sm`}
                                    style={{ backgroundColor: item.color }}
                                />
                                <input
                                    type="range" min="0" max="100" value={item.val}
                                    disabled={isAuto || locked}
                                    onChange={(e) => handleSliderChange(item.id as any, Number(e.target.value))}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Calibration Logic Footer - Integrated Style */}
                <div className="pt-6 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex-1 flex gap-4 items-center bg-slate-50/80 p-4 rounded-[1.5rem] border border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                            <Sparkles size={18} />
                        </div>
                        <div className="flex-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Calibration Insight</span>
                            <p className="text-xs font-bold text-slate-900 leading-tight">"{getReasonNote()}"</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {Object.entries(stats).map(([key, val]) => {
                            const colors: Record<string, string> = {
                                learning: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                                solve: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                master: 'bg-amber-50 text-amber-600 border-amber-100',
                                recall: 'bg-rose-50 text-rose-600 border-rose-100'
                            };
                            return (
                                <div key={key} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${colors[key] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{key}</span>
                                    <span className="text-sm font-black font-mono leading-none">{val}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplexityMatrix;
