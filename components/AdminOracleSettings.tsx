import React, { useState, useEffect } from 'react';
import { getForecastedCalibration, saveForecastedCalibration } from '../lib/reiEvolutionEngine';
import { Settings, Shield, Zap, Target, Save, Check, AlertCircle } from 'lucide-react';

const AdminOracleSettings = () => {
    const subjects = [
        { name: 'Mathematics', exam: 'KCET' },
        { name: 'Physics', exam: 'KCET' },
        { name: 'Chemistry', exam: 'KCET' },
        { name: 'Biology', exam: 'KCET' },
        { name: 'Physics', exam: 'NEET' },
        { name: 'Chemistry', exam: 'NEET' },
        { name: 'Biology', exam: 'NEET' }
    ];

    const [calibrations, setCalibrations] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        const data: any = {};
        for (const sub of subjects) {
            const forecast = await getForecastedCalibration(sub.exam as any, sub.name as any);
            data[`${sub.exam}-${sub.name}`] = forecast;
        }
        setCalibrations(data);
        setLoading(false);
    };

    const handleUpdate = (key: string, field: string, value: any) => {
        setCalibrations((prev: any) => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }));
    };

    const handleSave = async (key: string) => {
        setSaving(key);
        try {
            await saveForecastedCalibration(calibrations[key]);
            setTimeout(() => setSaving(null), 2000);
        } catch (err) {
            console.error('Save failed', err);
            setSaving(null);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
            <div className="animate-pulse text-blue-400 font-mono">INITIALIZING ANALYTICAL BRAIN...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 font-sans selection:bg-blue-500/30">
            {/* Header */}
            <header className="max-w-7xl mx-auto mb-12 flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-mono mb-2 uppercase tracking-widest">
                        <Shield size={14} /> SECURITY CLEARANCE: LEVEL 5 (ADMIN)
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">Oracle Calibration Hub</h1>
                    <p className="text-white/50 mt-2">Adjust the 2026 Predictive Logic Parameters (REI v16.0 Standard)</p>
                </div>
                <div className="text-right font-mono text-xs opacity-40">
                    REAL-TIME SYNC: ACTIVE<br />
                    RWC_ENGINE_VERSION: 16.0.4
                </div>
            </header>

            {/* Main Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((sub) => {
                    const key = `${sub.exam}-${sub.name}`;
                    const data = calibrations[key];
                    if (!data) return null;

                    return (
                        <div key={key} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 transition-all group backdrop-blur-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                <Target size={80} />
                            </div>

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sub.exam === 'KCET' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                                        {sub.exam}
                                    </span>
                                    <h3 className="text-xl font-bold mt-1">{sub.name}</h3>
                                </div>
                                <button
                                    onClick={() => handleSave(key)}
                                    disabled={saving === key}
                                    className={`p-2 rounded-lg transition-all ${saving === key ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-blue-600 text-white/50 hover:text-white'}`}
                                >
                                    {saving === key ? <Check size={18} /> : <Save size={18} />}
                                </button>
                            </div>

                            {/* Sliders Area */}
                            <div className="space-y-6">
                                {/* IDS Score */}
                                <div>
                                    <div className="flex justify-between text-xs font-mono mb-2">
                                        <span className="text-white/60 uppercase">IDS Target (Prediction Fidelity)</span>
                                        <span className="text-blue-400 font-bold">{data.idsTarget.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.01"
                                        value={data.idsTarget}
                                        onChange={(e) => handleUpdate(key, 'idsTarget', parseFloat(e.target.value))}
                                        className="w-full accent-blue-500"
                                    />
                                </div>

                                {/* Rigor Velocity */}
                                <div>
                                    <div className="flex justify-between text-xs font-mono mb-2">
                                        <span className="text-white/60 uppercase">Rigor Velocity (Difficulty Accel)</span>
                                        <span className="text-purple-400 font-bold">{data.rigorVelocity.toFixed(1)}x</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="2" step="0.1"
                                        value={data.rigorVelocity}
                                        onChange={(e) => handleUpdate(key, 'rigorVelocity', parseFloat(e.target.value))}
                                        className="w-full accent-purple-500"
                                    />
                                </div>

                                {/* Intent Signature */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="text-[9px] text-white/40 uppercase mb-1">Synthesis</div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold">{(data.intentSignature.synthesis * 100).toFixed(0)}%</span>
                                            <input
                                                type="range" min="0" max="1" step="0.05"
                                                value={data.intentSignature.synthesis}
                                                onChange={(e) => handleUpdate(key, 'intentSignature', { ...data.intentSignature, synthesis: parseFloat(e.target.value) })}
                                                className="w-16 h-1 accent-orange-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="text-[9px] text-white/40 uppercase mb-1">Trap Density</div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold">{(data.intentSignature.trapDensity * 100).toFixed(0)}%</span>
                                            <input
                                                type="range" min="0" max="1" step="0.05"
                                                value={data.intentSignature.trapDensity}
                                                onChange={(e) => handleUpdate(key, 'intentSignature', { ...data.intentSignature, trapDensity: parseFloat(e.target.value) })}
                                                className="w-16 h-1 accent-red-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Stats */}
                            <div className="mt-6 pt-4 border-t border-white/5 flex gap-4 opacity-40 text-[10px] uppercase font-mono">
                                <span>Target: 2026</span>
                                <span>CHR Base: 81.7%</span>
                                <span>DNA: V16</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Warning Message */}
            <div className="max-w-7xl mx-auto mt-12 flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-100 text-sm">
                <AlertCircle size={18} />
                <span><strong>CRITICAL NOTICE:</strong> Adjusting these parameters will instantly change the difficulty and logic of all Mock Tests generated in "Oracle Mode" for students globally.</span>
            </div>
        </div>
    );
};

export default AdminOracleSettings;
