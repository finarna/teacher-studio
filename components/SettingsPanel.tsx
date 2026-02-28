import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Zap, Brain, Box, Calculator, Info } from 'lucide-react';
import { useSubjectTheme } from '../hooks/useSubjectTheme';
import { useAuth } from './AuthProvider';
import { AdminUsersPanel } from './AdminUsersPanel';

interface SettingsPanelProps {
  onBack: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onBack }) => {
  const theme = useSubjectTheme();
  const { userProfile } = useAuth();

  // AI Model Settings
  const [geminiModel, setGeminiModel] = useState(() => {
    return localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
  });

  const [temperature, setTemperature] = useState(() => {
    return parseFloat(localStorage.getItem('ai_temperature') || '0.7');
  });

  const aiModels = [
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      description: 'Fastest - Best for quick question generation',
      icon: Zap,
      color: '#3B82F6'
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: 'Fast - Good balance of speed and quality',
      icon: Sparkles,
      color: '#8B5CF6'
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      description: 'Most accurate - Best for complex analysis',
      icon: Brain,
      color: '#10B981'
    },
  ];

  const handleModelChange = (modelId: string) => {
    setGeminiModel(modelId);
    localStorage.setItem('gemini_model', modelId);
  };

  const handleTemperatureChange = (value: number) => {
    setTemperature(value);
    localStorage.setItem('ai_temperature', value.toString());
  };

  return (
    <div className="flex h-full bg-slate-50/50 font-instrument text-slate-900 overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="h-auto border-b border-slate-200 bg-white px-8 py-5 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 font-outfit tracking-tight">
                Settings
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Configure AI models and application preferences
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 scroller-hide">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* AI Model Selection */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Brain size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    AI Model Selection
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Choose the AI model for question generation and analysis
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {aiModels.map((model) => {
                  const Icon = model.icon;
                  const isSelected = geminiModel === model.id;

                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${isSelected
                        ? 'border-slate-900 bg-slate-50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: model.color + '20' }}
                      >
                        <Icon size={24} style={{ color: model.color }} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-slate-900">
                            {model.name}
                          </h3>
                          {isSelected && (
                            <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {model.description}
                        </p>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Temperature Setting */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    AI Creativity
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Control randomness in AI responses (Temperature: {temperature.toFixed(1)})
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${theme.color} 0%, ${theme.color} ${temperature * 100}%, #e2e8f0 ${temperature * 100}%, #e2e8f0 100%)`
                  }}
                />
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>More Consistent</span>
                  <span>More Creative</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <button
                    onClick={() => handleTemperatureChange(0.3)}
                    className={`px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all ${temperature <= 0.3
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    Focused (0.3)
                  </button>
                  <button
                    onClick={() => handleTemperatureChange(0.7)}
                    className={`px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all ${temperature > 0.3 && temperature <= 0.8
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    Balanced (0.7)
                  </button>
                  <button
                    onClick={() => handleTemperatureChange(1.0)}
                    className={`px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all ${temperature > 0.8
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    Creative (1.0)
                  </button>
                </div>
              </div>
            </div>


            {/* Pedagogical Algorithms */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-[50px] -mr-16 -mt-16 group-hover:bg-primary-500/20 transition-all duration-700" />
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white ring-1 ring-white/20">
                  <Calculator size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight font-outfit italic">
                    Pedagogical Algorithms
                  </h2>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mt-1">
                    System Intelligence & Performance Logic
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Accuracy */}
                <div className="p-6 bg-white/5 border border-white/10 rounded-[1.5rem] group/item hover:bg-white/[0.08] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      <h3 className="text-xs font-black text-white uppercase tracking-widest">Accuracy Truth</h3>
                    </div>
                    <Info size={14} className="text-white/20 group-hover/item:text-white/40 transition-colors" />
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 font-mono text-[11px] text-emerald-400 border border-white/5 flex items-center justify-center">
                    Accuracy = (Σ Correct / Σ Attempted) × 100
                  </div>
                  <p className="text-[10px] text-white/40 font-medium mt-3 italic">
                    The absolute benchmark of correctness across all practice nodes and mock simulations.
                  </p>
                </div>

                {/* Control/Command */}
                <div className="p-6 bg-white/5 border border-white/10 rounded-[1.5rem] group/item hover:bg-white/[0.08] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                      <h3 className="text-xs font-black text-white uppercase tracking-widest">Syllabus Control (Command)</h3>
                    </div>
                    <Info size={14} className="text-white/20 group-hover/item:text-white/40 transition-colors" />
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 font-mono text-[11px] text-primary-400 border border-white/5 flex flex-col items-center gap-2">
                    <span className="text-center">Control = Min(1, UniqueSolved / SaturationPoint) × 100</span>
                    <span className="text-[9px] text-white/30">SaturationPoint = Min(TotalPool, Max(15, Pool × 0.5))</span>
                  </div>
                  <p className="text-[10px] text-white/40 font-medium mt-3 italic">
                    Eliminates inflation from repeat answers. Mastery requires exploring a critical cross-section of the syllabus.
                  </p>
                </div>

                {/* Mastery */}
                <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 rounded-[1.5rem] group/item hover:bg-white/[0.08] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                      <h3 className="text-xs font-black text-white uppercase tracking-widest">Mastery Synthesis</h3>
                    </div>
                    <Info size={14} className="text-white/20 group-hover/item:text-white/40 transition-colors" />
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 font-mono text-[11px] text-amber-400 border border-white/5 flex flex-col items-center gap-1 leading-relaxed">
                    <div className="text-center">Mastery = (Accuracy × 0.60 × Control)</div>
                    <div className="text-center text-[10px] text-amber-400/70">+ Max(20, Quizzes × 10) + Max(10, (Vol/10) × 5) + (Notes ? 10 : 0)</div>
                  </div>
                  <p className="text-[10px] text-white/40 font-medium mt-3 italic">
                    The global indicator of proficiency. Synthesizes rigor, consistency, and syllabus depth into a single numeric trajectory.
                  </p>
                </div>
              </div>
            </div>

            {/* Storage Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Box size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    Storage & Data
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Manage local storage and cached data
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Cached Questions</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Locally stored AI-generated questions
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('qbank_cache');
                      alert('Question cache cleared!');
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Clear Cache
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">User Preferences</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Subject, exam, and UI preferences
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('edujourney_preferences');
                      alert('Preferences reset! Page will reload.');
                      window.location.reload();
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Landing Page</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Reset to see the landing page again
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('edujourney_landing_seen');
                      alert('Landing page reset! You will see it after logging out.');
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Users Panel */}
            {userProfile?.role === 'admin' && (
              <AdminUsersPanel />
            )}

          </div>
        </div>
      </div>

    </div>
  );
};

export default SettingsPanel;
