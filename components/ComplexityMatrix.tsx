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
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-[0_15px_30px_rgba(0,0,0,0.02)] p-5 relative overflow-hidden group">
            <div className="relative z-10">
                {/* Clean Professional Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                            <Signal size={18} />
                        </div>
                        <div>
                            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-none mb-0.5 block">Efficiency Level</span>
                            <h3 className="text-base font-black text-slate-900 font-outfit leading-none flex items-center gap-2">
                                Difficulty & Distribution
                                {locked && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-600 text-white rounded-md text-[7px] font-black uppercase tracking-tight">
                                        REI Sync
                                    </span>
                                )}
                            </h3>
                        </div>
                    </div>

                    {!locked && (
                        <div className="flex items-center p-0.5 bg-slate-50 rounded-lg border border-slate-100">
                            <button
                                onClick={() => onToggleAuto(true)}
                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${isAuto ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                AI Pilot
                            </button>
                            <button
                                onClick={() => onToggleAuto(false)}
                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${!isAuto ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Manual
                            </button>
                        </div>
                    )}
                </div>

                {/* Refined Sliders Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                        { id: 'easy', label: 'Foundation', val: easy, color: '#10b981' },
                        { id: 'moderate', label: 'Standard', val: moderate, color: '#f59e0b' },
                        { id: 'hard', label: 'Advanced', val: hard, color: '#6366f1' }
                    ].map(item => (
                        <div key={item.id} className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                            <div className="flex justify-between items-end">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</label>
                                <span className="text-xs font-black text-slate-900 font-mono">{item.val}%</span>
                            </div>
                            <div className="relative h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.val}%` }}
                                    transition={{ duration: 1, ease: "circOut" }}
                                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500`}
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

                {/* Calibration Logic Footer */}
                <div className="pt-4 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex-1 flex gap-3 items-start bg-indigo-50/30 p-2.5 rounded-xl border border-indigo-100/50">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                            <Sparkles size={14} />
                        </div>
                        <div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600/60 block mb-0.5">Calibration Insight</span>
                            <p className="text-[10px] font-bold text-slate-600 leading-tight line-clamp-2">"{getReasonNote()}"</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {Object.entries(stats).map(([key, val]) => {
                            const colors: Record<string, string> = {
                                learning: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                                solve: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                master: 'bg-amber-50 text-amber-600 border-amber-100',
                                recall: 'bg-rose-50 text-rose-600 border-rose-100'
                            };
                            return (
                                <div key={key} className={`flex flex-col items-center px-2 py-1.5 rounded-lg border ${colors[key] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                    <span className="text-[7px] font-black uppercase tracking-tighter mb-0.5 opacity-70">{key}</span>
                                    <span className="text-[10px] font-black font-mono">{val}%</span>
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
