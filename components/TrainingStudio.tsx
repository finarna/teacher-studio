import React, { useState } from 'react';
import {
    X,
    Sparkles,
    BookOpen,
    FileText,
    Zap,
    Target,
    ArrowRight,
    Loader2,
    Cpu,
    ChevronRight,
    BrainCircuit,
    PieChart,
    Lightbulb,
    AlertTriangle,
    PenTool,
    Maximize2,
    Printer,
    Download,
    CheckCircle2,
    SearchCode,
    GraduationCap,
    Presentation
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProfessorTrainingContract, Subject, Grade, Scan, TrainingModuleType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useSubjectTheme } from '../hooks/useSubjectTheme';

interface TrainingStudioProps {
    onClose: () => void;
    onTrainingCreated: (training: ProfessorTrainingContract) => void;
    selectedScan?: Scan | null;
}

interface TrainingStatus {
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'completed' | 'error';
    icon: any;
}

const TrainingStudio: React.FC<TrainingStudioProps> = ({ onClose, onTrainingCreated, selectedScan }) => {
    const { activeSubject, subjectConfig, examConfig } = useAppContext();
    const theme = useSubjectTheme();

    const [topic, setTopic] = useState(selectedScan?.analysisData?.questions[0]?.topic || '');
    const [grade, setGrade] = useState<Grade>(selectedScan?.grade as Grade || 'Class 12');
    const [syllabus, setSyllabus] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use activeSubject from context instead of local state
    const subject = activeSubject;

    const [statuses, setStatuses] = useState<TrainingStatus[]>([
        { id: 'strategy', label: 'Pedagogical Strategy', status: 'pending', icon: Presentation },
        { id: 'diagnostics', label: 'Error Recognition', status: 'pending', icon: SearchCode },
        { id: 'engineering', label: 'Question Engineering', status: 'pending', icon: BrainCircuit },
        { id: 'advanced', label: 'Advanced Insights', status: 'pending', icon: GraduationCap }
    ]);

    const updateStatus = (id: string, status: 'loading' | 'completed' | 'error') => {
        setStatuses(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    };

    const cleanAndParseJSON = (raw: string): any => {
        try {
            const firstBrace = raw.indexOf('{');
            const lastBrace = raw.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1) return null;
            const cleaned = raw.substring(firstBrace, lastBrace + 1);
            return JSON.parse(cleaned);
        } catch (e) {
            console.error("JSON Parse Error", e);
            return null;
        }
    };

    const generateTraining = async () => {
        if (!topic.trim()) return setError("Please enter a training focus topic.");
        setIsGenerating(true);
        setError(null);
        setStatuses(prev => prev.map(s => ({ ...s, status: 'pending' })));

        try {
            // Get model from Settings
            const selectedModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';

            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: selectedModel,
                generationConfig: { responseMimeType: "application/json" }
            });

            const scanContext = selectedScan ? `
        BOARD PAPER CONTEXT:
        Paper: ${selectedScan.name}. Trends: ${selectedScan.analysisData?.trends.map(t => t.description).join(', ')}.
        Predicted: ${selectedScan.analysisData?.predictiveTopics.map(p => p.topic).join(', ')}.
        Sample Questions: ${selectedScan.analysisData?.questions.slice(0, 3).map(q => q.text).join(' | ')}
      ` : 'NATIONAL CURRICULUM CONTEXT: CBSE 2024-25 standards.';

            const syllabusContext = syllabus ? `REFERENCE SYLLABUS: ${syllabus}` : 'Standard board-level depth.';

            // PHASE 1: STRATEGY & DIAGNOSTICS
            updateStatus('strategy', 'loading');
            const phase1Prompt = `
              As Chief Pedagogy Architect, generate Part 1 of Professor Training for "${topic}" (${grade} ${subject}).
              ${scanContext} ${syllabusContext}
              {
                "title": "Professor Training: ${topic}",
                "learningObjectives": ["string"],
                "pedagogicalDeepDive": {
                  "hook": "Sophisticated narrative hook",
                  "commonMisconceptions": [ { "issue": "string", "resolution": "string" } ],
                  "transitionPoints": ["shift 1"],
                  "boardIntelligence": "Analysis"
                },
                "strategyModule": {
                  "id": "ped-1", "type": "PEDAGOGICAL_STRATEGY", "title": "Instructional Design",
                  "content": { "strategy": "Detailed strategy", "blackboardPlan": ["Section 1"] }
                }
              }
              REQUIREMENTS: Use LaTeX for math. RETURN RAW JSON.
            `;
            const res1 = await model.generateContent(phase1Prompt);
            const data1 = cleanAndParseJSON(res1.response.text());
            if (!data1) throw new Error("Phase 1 failed.");
            updateStatus('strategy', 'completed');

            // PHASE 2: DIAGNOSTICS & ILLUSTRATION
            updateStatus('diagnostics', 'loading');
            const phase2Prompt = `
              Generate Part 2 (Diagnostics & Illustration) for "${topic}".
              {
                "diagnosticModule": {
                  "id": "diag-1", "type": "DIAGNOSTIC_FRAMEWORK", "title": "Error Pattern Recognition",
                  "content": { "checkpoints": [{ "question": "Q", "targetError": "Error" }] }
                },
                "illustrationModule": {
                  "id": "illus-1", "type": "ILLUSTRATION_GUIDE", "title": "Technical Visualization",
                  "content": { "concept": "Visual", "svgPrompt": "Description", "annotations": ["Label"] }
                }
              }
            `;
            const res2 = await model.generateContent(phase2Prompt);
            const data2 = cleanAndParseJSON(res2.response.text());
            updateStatus('diagnostics', 'completed');

            // PHASE 3: QUESTION ENGINEERING
            updateStatus('engineering', 'loading');
            const phase3Prompt = `
              Generate Part 3 (Question Engineering) for "${topic}".
              {
                "engineeringModule": {
                  "id": "q-eng-1", "type": "QUESTION_ENGINEERING", "title": "High-Yield Assessments",
                  "content": { 
                    "assertionReasoning": [ { "assertion": "...", "reason": "...", "answer": "...", "explanation": "..." } ],
                    "caseStudy": { "scenario": "Case", "questions": ["Q1"] }
                  }
                }
              }
            `;
            const res3 = await model.generateContent(phase3Prompt);
            const data3 = cleanAndParseJSON(res3.response.text());
            updateStatus('engineering', 'completed');

            // PHASE 4: ADVANCED INSIGHTS
            updateStatus('advanced', 'loading');
            const phase4Prompt = `
               Generate Part 4 (Advanced Insights) for "${topic}".
               {
                 "analyticalModule": {
                   "id": "analyt-1", "type": "ANALYTICAL_DEPTH", "title": "Advanced Insights",
                   "content": { "derivationNuance": "Trick", "applicationEdge": "Modern tech" }
                 }
               }
            `;
            const res4 = await model.generateContent(phase4Prompt);
            const data4 = cleanAndParseJSON(res4.response.text());
            updateStatus('advanced', 'completed');

            const finalContract: ProfessorTrainingContract = {
                id: data1.id || `T-${Date.now()}`,
                title: data1.title,
                subject: subject,
                grade: grade,
                learningObjectives: data1.learningObjectives,
                pedagogicalDeepDive: data1.pedagogicalDeepDive,
                modules: [
                    data1.strategyModule,
                    data2?.diagnosticModule,
                    data2?.illustrationModule,
                    data3?.engineeringModule,
                    data4?.analyticalModule
                ].filter(Boolean)
            };

            onTrainingCreated(finalContract);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "The Analytical Engine failed to converge. Please simplify your focus topic.");
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 font-instrument selection:bg-primary-500 selection:text-white">
            <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[750px] animate-in fade-in zoom-in-95 duration-500">

                {/* Left Panel: Context & Tracking */}
                <div
                    className="hidden lg:flex lg:w-4/12 relative overflow-hidden flex-col justify-between p-10"
                    style={{ backgroundColor: theme.color }}
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-500/50 to-transparent"></div>

                    <div className="relative z-10 flex-1">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center mb-8 shadow-2xl">
                            <Cpu className="text-white" size={28} />
                        </div>
                        <h2 className="text-4xl font-black text-white leading-[0.9] mb-8 tracking-tighter font-outfit uppercase italic">Instructional<br /><span className="text-primary-200">Engineer</span></h2>

                        <div className="space-y-6">
                            {statuses.map((s) => (
                                <div key={s.id} className="flex items-center gap-5 group">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${s.status === 'completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                                            s.status === 'loading' ? 'bg-white text-primary-600 animate-bounce' :
                                                s.status === 'error' ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/30'
                                        }`}>
                                        {s.status === 'completed' ? <CheckCircle2 size={18} /> : <s.icon size={18} />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${s.status === 'completed' ? 'text-white' :
                                                s.status === 'loading' ? 'text-white' : 'text-white/30'
                                            }`}>{s.label}</span>
                                        <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest leading-none mt-1">
                                            {s.status === 'loading' ? 'Synthesizing Intelligence...' : s.status === 'completed' ? 'Protocol Verified' : 'Awaiting Sequence'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 pt-8 border-t border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Neural Link Active</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Input Area */}
                <div className="flex-1 p-10 md:p-14 flex flex-col relative overflow-y-auto scroller-hide bg-slate-900">
                    <button onClick={onClose} className="absolute top-10 right-10 p-2 bg-slate-800/50 rounded-full text-slate-500 hover:text-white transition-all hover:rotate-90">
                        <X size={20} />
                    </button>

                    <div className="flex-1">
                        <header className="mb-12">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="bg-primary-500/10 text-primary-400 border border-primary-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Pedagogy v2.0</span>
                                <div className="h-px flex-1 bg-slate-800"></div>
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight leading-none uppercase font-outfit">
                                Architect <span className="text-primary-500">Training Logic</span>
                            </h1>
                            <p className="text-slate-500 mt-2.5 text-sm font-medium italic opacity-60">Generate professor-grade instructional frameworks for boards.</p>
                        </header>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Curriculum Core Topic</label>
                                    <div className="relative">
                                        <PenTool className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            placeholder="e.g. Huygens Principal"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all placeholder:text-slate-800 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Discipline DNA</label>
                                    <div
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold text-sm flex items-center gap-3"
                                        style={{ borderColor: `${theme.color}40` }}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                            style={{ backgroundColor: theme.colorLight, color: theme.colorDark }}
                                        >
                                            {subjectConfig.iconEmoji}
                                        </div>
                                        <div>
                                            <div className="font-black">{subjectConfig.displayName}</div>
                                            <div className="text-[10px] text-slate-500">{examConfig.fullName}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Syllabus Grounding (Optional)</label>
                                    <span className="text-[8px] text-primary-500 font-black tracking-widest uppercase py-1 px-2.5 bg-primary-500/5 rounded-full border border-primary-500/10">Anchor Mode</span>
                                </div>
                                <textarea
                                    placeholder="Anchor the AI with specific NCERT excerpts or previous year paper patterns..."
                                    value={syllabus}
                                    onChange={(e) => setSyllabus(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-6 text-slate-300 font-medium h-48 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all placeholder:text-slate-800 scrollbar-hide text-sm leading-relaxed"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="mt-8 p-6 bg-rose-500/5 border border-rose-500/20 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
                                <AlertTriangle className="text-rose-500 shrink-0 mt-1" size={20} />
                                <div>
                                    <h4 className="text-rose-500 font-black text-[10px] uppercase tracking-widest mb-1">Architectural Fault</h4>
                                    <p className="text-slate-500 text-xs font-medium leading-relaxed">{error}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-12 pt-10 border-t border-slate-800 flex items-center justify-between">
                        <div className="hidden sm:flex items-center gap-4">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map(i => <div key={i} className="w-10 h-10 border-4 border-slate-900 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 shadow-xl transition-transform hover:scale-110"><Zap size={14} fill="currentColor" /></div>)}
                            </div>
                            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest leading-none">High Fidelity Protocols</p>
                        </div>

                        <button
                            onClick={generateTraining}
                            disabled={isGenerating}
                            className={`px-12 py-5 rounded-2xl font-black text-base transition-all flex items-center gap-4 shadow-2xl active:scale-95 uppercase tracking-[0.2em] relative overflow-hidden ${isGenerating ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' : 'bg-white text-slate-950 hover:bg-primary-600 hover:text-white hover:-translate-y-1'}`}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span className="text-sm">Synthesizing...</span>
                                </>
                            ) : (
                                <>
                                    <BrainCircuit size={20} />
                                    <span className="text-sm">Launch Training AI</span>
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrainingStudio;
