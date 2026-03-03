import React from 'react';
import { X, ShieldCheck, TrendingUp, Cpu, Info, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExplainForecastModalProps {
    onClose: () => void;
    examContext?: string;
}

const ExplainForecastModal: React.FC<ExplainForecastModalProps> = ({ onClose, examContext = 'KCET' }) => (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.3)] flex flex-col"
        >
            <div className="bg-slate-900 text-white p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                            <Cpu size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black font-outfit uppercase italic tracking-tighter">REI-v3 Oracle Logic</h2>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Neural Forecasting & Rigor Calibration</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
                </div>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] scroller-hide">
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-indigo-600" />
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Why the 19% / 18% / 63% Drift?</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        While base {examContext} blueprints start at <span className="text-slate-900 font-black">20% Advanced</span>, the REI-v3 Oracle has detected a <span className="text-indigo-600 font-black">1.1x Rigor Velocity (Rigor Acceleration)</span>.
                    </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-900 font-black text-[10px]">01</div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rigor Velocity</h4>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                            Calculated by benchmarking latest paper <span className="font-bold text-slate-900">Trap Density</span> vs historical means. 1.1x indicates an upward trend in complexity.
                        </p>
                    </div>

                    <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-[10px]">02</div>
                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-outfit">Strategic Insurance</h4>
                        </div>
                        <p className="text-[11px] text-indigo-900/60 leading-relaxed">
                            The engine shifts distribution to favor Advanced questions (63%) to <span className="font-bold underline text-indigo-700">insure you</span> against a potential Rigor Spike in the actual exam.
                        </p>
                    </div>
                </div>

                <section className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex gap-4">
                    <AlertTriangle size={20} className="text-rose-500 shrink-0" />
                    <div className="space-y-1">
                        <h4 className="text-xs font-black text-rose-900 uppercase italic">Drift Logic: Pressure Hardening</h4>
                        <p className="text-[11px] text-rose-700/70 leading-relaxed">
                            Easy (19%) and Moderate (18%) segments are compressed to force higher cognitive load. If you can solve this 63% Hard Mock, the actual exam will feel like a walk in the park.
                        </p>
                    </div>
                </section>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Detected Signatures</h4>
                    <div className="grid grid-cols-3 gap-3">
                        {['Multi-variable Logic', 'Synthesis Traps', 'Time-Pressure Drifts'].map((s, i) => (
                            <div key={i} className="py-3 px-2 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                <span className="text-[8px] font-black text-slate-900 uppercase block leading-tight">{s}</span>
                                <span className="text-[11px] font-black text-indigo-600 mt-1 block">ACTIVE</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button
                    onClick={onClose}
                    className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] active:scale-[0.98] transition-all shadow-xl"
                >
                    Acknowledge & Sync Blueprint
                </button>
            </div>
        </motion.div>
    </div>
);

export default ExplainForecastModal;
