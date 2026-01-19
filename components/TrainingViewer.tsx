import React, { useState } from 'react';
import {
    ArrowLeft,
    BookOpen,
    Lightbulb,
    Target,
    AlertTriangle,
    PenTool,
    Download,
    Printer,
    Share2,
    ChevronDown,
    ChevronUp,
    Brain,
    Zap,
    CheckCircle2,
    ListRestart,
    HelpCircle,
    FileQuestion,
    Search,
    Sparkles,
    Maximize2
} from 'lucide-react';
import { ProfessorTrainingContract, TrainingModuleType } from '../types';
import { RenderWithMath, DerivationStep } from './MathRenderer';

interface TrainingViewerProps {
    training: ProfessorTrainingContract;
    onBack: () => void;
}

const TrainingViewer: React.FC<TrainingViewerProps> = ({ training, onBack }) => {
    const [activeTab, setActiveTab] = useState<TrainingModuleType>(training.modules[0].type);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const getModuleIcon = (type: TrainingModuleType) => {
        switch (type) {
            case TrainingModuleType.PEDAGOGICAL_STRATEGY: return <BookOpen size={20} />;
            case TrainingModuleType.DIAGNOSTIC_FRAMEWORK: return <Target size={20} />;
            case TrainingModuleType.ILLUSTRATION_GUIDE: return <PenTool size={20} />;
            case TrainingModuleType.QUESTION_ENGINEERING: return <FileQuestion size={20} />;
            case TrainingModuleType.ANALYTICAL_DEPTH: return <Zap size={20} />;
            default: return <BookOpen size={20} />;
        }
    };

    const currentModule = training.modules.find(m => m.type === activeTab);

    return (
        <div className="flex-1 bg-slate-950 font-instrument text-slate-100 flex flex-col h-screen overflow-hidden selection:bg-primary-500 selection:text-white">

            {/* Premium Header */}
            <header className="h-20 border-b border-slate-800 bg-slate-900/30 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">
                            <span>Deep Dive</span> &rsaquo; <span>{training.subject} {training.grade}</span> &rsaquo; <span>Professor Training</span>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight font-outfit uppercase">{training.title}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-[11px] font-bold text-slate-300 hover:bg-slate-700 transition-all uppercase tracking-widest">
                        <Download size={16} /> Export
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 rounded-xl text-[11px] font-bold text-white shadow-xl shadow-primary-900/20 hover:bg-primary-500 transition-all uppercase tracking-widest">
                        <Share2 size={16} /> Share
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">

                {/* Left Sidebar: Topic Exploration */}
                <aside className="w-[320px] border-r border-slate-800 bg-slate-900/20 p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar">

                    {/* Section 1: Pedagogical Deep Dive */}
                    <div>
                        <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-5 flex items-center justify-between px-1">
                            Strategy Core <Brain size={12} />
                        </h3>
                        <div className="bg-primary-600/10 border-l-4 border-primary-500 p-4 rounded-r-xl mb-6">
                            <h4 className="text-primary-400 font-bold text-[10px] uppercase mb-1.5 flex items-center gap-2">
                                <Zap size={11} fill="currentColor" /> Narrative Hook
                            </h4>
                            <p className="text-primary-100 text-[13px] italic leading-relaxed">
                                "{training.pedagogicalDeepDive.hook}"
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-1 mb-2">Misconception Heatmap</span>
                                {training.pedagogicalDeepDive.commonMisconceptions.slice(0, 2).map((m, i) => (
                                    <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex gap-3 items-start group">
                                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" size={16} />
                                        <div>
                                            <p className="text-xs font-bold text-white mb-1">{m.issue}</p>
                                            <p className="text-slate-500 text-[10px] leading-relaxed">{m.resolution}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Board Intelligence */}
                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
                        <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Target size={16} /> Exam Forensics
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-4">
                            {training.pedagogicalDeepDive.boardIntelligence}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {training.learningObjectives.map((obj, i) => (
                                <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-[9px] font-bold rounded-lg whitespace-nowrap">
                                    {obj}
                                </span>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content Area: Scientific Artifacts */}
                <main className="flex-1 overflow-y-auto p-12 bg-slate-950 flex flex-col gap-12 custom-scrollbar">

                    {/* Module Navigation Tabs */}
                    <nav className="flex gap-1.5 p-1.5 bg-slate-900 rounded-xl border border-slate-800 w-fit mx-auto sticky top-0 z-20 shadow-2xl backdrop-blur-3xl">
                        {training.modules.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setActiveTab(m.type)}
                                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-widest ${activeTab === m.type ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                            >
                                {getModuleIcon(m.type)}
                                {m.title}
                            </button>
                        ))}
                    </nav>

                    {/* Module Content */}
                    <div className="max-w-4xl mx-auto w-full">
                        {activeTab === TrainingModuleType.PEDAGOGICAL_STRATEGY && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-12 h-12 bg-primary-600/20 text-primary-400 rounded-xl flex items-center justify-center border border-primary-500/20">
                                        <BookOpen size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-white font-outfit uppercase tracking-tight">Instructional Strategy</h2>
                                </div>

                                <div className="grid gap-8">
                                    <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl">
                                        <h3 className="text-[9px] font-bold text-primary-400 uppercase tracking-widest mb-5 border-b border-primary-500/10 pb-3">Executive Pedagogy Plan</h3>
                                        <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed italic border-l-2 border-slate-700 pl-6">
                                            <RenderWithMath text={currentModule?.content.strategy || ''} serif={false} />
                                        </div>
                                    </section>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                            <h4 className="text-[11px] font-bold text-white mb-5 uppercase tracking-wider">Blackboard Breakdown</h4>
                                            <div className="space-y-3.5">
                                                {currentModule?.content.blackboardPlan.map((step: string, i: number) => (
                                                    <div key={i} className="flex gap-3">
                                                        <div className="w-5 h-5 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold text-primary-500 shrink-0">{i + 1}</div>
                                                        <p className="text-slate-400 text-[13px] font-medium leading-relaxed">{step}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-primary-600/5 p-6 rounded-2xl border border-primary-500/20 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Lightbulb size={48} />
                                            </div>
                                            <h4 className="text-[11px] font-bold text-primary-400 mb-5 uppercase tracking-wider">Transition Pointers</h4>
                                            <div className="space-y-3">
                                                {training.pedagogicalDeepDive.transitionPoints.map((tp, i) => (
                                                    <div key={i} className="flex gap-2 items-center text-slate-300">
                                                        <div className="w-1.5 h-1.5 bg-primary-500 rounded-full shadow-[0_0_8px_rgba(2,132,199,0.8)]"></div>
                                                        <span className="text-xs font-medium">{tp}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === TrainingModuleType.DIAGNOSTIC_FRAMEWORK && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-12 h-12 bg-amber-600/20 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20">
                                        <Target size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-white font-outfit uppercase tracking-tight">Diagnostic Framework</h2>
                                </div>

                                <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                                    <div className="p-8 border-b border-slate-800 bg-slate-950/50">
                                        <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Error Trap Analysis</h3>
                                        <p className="text-slate-300 text-sm font-medium">Spotting subtle misconceptions through targeted diagnostic questioning.</p>
                                    </div>
                                    <div className="p-10 space-y-8">
                                        {currentModule?.content.checkpoints.map((cp: any, i: number) => (
                                            <div key={i} className="flex flex-col md:flex-row gap-8 items-stretch border-b border-slate-800 pb-8 last:border-0 last:pb-0">
                                                <div className="md:w-1/2 p-6 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-center">
                                                    <span className="text-[10px] font-black text-slate-600 uppercase mb-4 block tracking-tighter">Diagnostic Question</span>
                                                    <p className="text-white font-bold leading-tight italic">"{cp.question}"</p>
                                                </div>
                                                <div className="md:w-1/2 p-6 bg-red-900/10 border border-red-500/20 rounded-2xl flex flex-col justify-center">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <AlertTriangle size={14} className="text-red-500" />
                                                        <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Failure Mode</span>
                                                    </div>
                                                    <p className="text-red-100/80 text-sm font-medium">{cp.targetError}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === TrainingModuleType.QUESTION_ENGINEERING && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-12 h-12 bg-purple-600/20 text-purple-400 rounded-xl flex items-center justify-center border border-purple-500/20">
                                        <FileQuestion size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-white font-outfit uppercase tracking-tight">Question Engineering</h2>
                                </div>

                                <div className="space-y-6">
                                    <section className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Case-Based Scenario</h3>
                                            <span className="px-3 py-1 bg-slate-900 text-white text-[8px] font-bold uppercase rounded-lg tracking-widest">Board Prep</span>
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 mb-5 leading-tight tracking-tight uppercase font-outfit">
                                            {currentModule?.content.caseStudy.scenario}
                                        </h4>
                                        <div className="space-y-4 pt-6 border-t border-slate-100">
                                            {currentModule?.content.caseStudy.questions.map((q: string, i: number) => (
                                                <div key={i} className="flex gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">Q{i + 1}</div>
                                                    <p className="text-slate-700 font-bold">{q}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="grid md:grid-cols-2 gap-6">
                                        {currentModule?.content.assertionReasoning.map((ar: any, i: number) => (
                                            <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl group transition-all hover:border-primary-500/50">
                                                <h4 className="text-[9px] font-bold text-primary-400 uppercase tracking-widest mb-5 flex items-center justify-between">
                                                    Assertion & Reasoning <Sparkles size={12} />
                                                </h4>
                                                <div className="space-y-4 mb-8">
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-600 uppercase mb-1 block">Assertion (A)</span>
                                                        <p className="text-white text-sm font-bold leading-relaxed tracking-tight underline decoration-slate-700 decoration-2 underline-offset-4">{ar.assertion}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-600 uppercase mb-1 block">Reason (R)</span>
                                                        <p className="text-white text-sm font-bold leading-relaxed tracking-tight">{ar.reason}</p>
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase mb-2 block tracking-widest">Correct Response</span>
                                                    <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-2">{ar.answer}</p>
                                                    <p className="text-slate-500 text-[10px] leading-relaxed italic border-t border-slate-800 pt-3">{ar.explanation}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                </div>
                            </div>
                        )}

                        {activeTab === TrainingModuleType.ILLUSTRATION_GUIDE && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-12 h-12 bg-emerald-600/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                        <PenTool size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-white font-outfit uppercase tracking-tight">Visualization Library</h2>
                                </div>

                                <section className="bg-white rounded-3xl p-3 shadow-2xl overflow-hidden border border-slate-200">
                                    <div className="aspect-[16/10] bg-[#fffdf5] relative flex items-center justify-center overflow-hidden bg-[linear-gradient(#e5e7eb_1px,transparent_1px),linear-gradient(90deg,#e5e7eb_1px,transparent_1px)] bg-[size:30px_30px]">
                                        <div className="absolute top-8 left-8 p-5 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-xl max-w-sm z-10">
                                            <h3 className="text-base font-black text-slate-900 mb-2 font-outfit uppercase">{currentModule?.content.concept}</h3>
                                            <div className="space-y-1.5">
                                                {currentModule?.content.annotations.map((ann: string, i: number) => (
                                                    <div key={i} className="flex gap-2 text-[11px] font-bold text-slate-500 leading-tight">
                                                        <span className="text-primary-600">•</span> {ann}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="w-full h-full flex items-center justify-center p-20 text-center text-slate-300">
                                            <div>
                                                <PenTool size={120} className="mx-auto mb-6 opacity-10" />
                                                <p className="font-hand text-3xl text-slate-400">"{currentModule?.content.svgPrompt}"</p>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-8 block">AI Designer Rendering Context...</span>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-8 right-8 flex gap-2">
                                            <button className="p-3.5 bg-slate-900 text-white rounded-xl shadow-xl hover:bg-primary-600 transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest">
                                                <RefreshCw size={14} /> Re-Render
                                            </button>
                                            <button className="p-3.5 bg-white border border-slate-200 text-slate-900 rounded-xl shadow-xl hover:bg-slate-50 transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest">
                                                <Maximize2 size={14} /> Lens
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === TrainingModuleType.ANALYTICAL_DEPTH && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-12 h-12 bg-rose-600/20 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
                                        <Zap size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-white font-outfit uppercase tracking-tight">Analytical Depth</h2>
                                </div>

                                <div className="space-y-8">
                                    <DerivationStep
                                        index={1}
                                        title="Nuance & Derivation"
                                        content={currentModule?.content.derivationNuance || ''}
                                    />

                                    <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-5">
                                            <Brain size={64} className="text-primary-500" />
                                        </div>
                                        <h3 className="text-[9px] font-bold text-primary-400 uppercase tracking-widest mb-6 border-b border-primary-500/10 pb-3 flex items-center gap-2">
                                            <Sparkles size={12} /> Modern Application Edge
                                        </h3>
                                        <div className="text-slate-300 font-medium leading-relaxed">
                                            <RenderWithMath text={currentModule?.content.applicationEdge || ''} serif={false} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Performance Tracking Spacer */}
                    <div className="h-32"></div>

                </main>
            </div>

            {/* Action Footer */}
            <footer className="h-16 border-t border-slate-800 bg-slate-900 flex items-center justify-between px-8 z-30">
                <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    <Brain className="text-primary-500" size={16} /> Deep Learning Engine Active
                </div>
                <div className="flex gap-3">
                    <button onClick={onBack} className="px-6 py-2 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700 transition-all text-xs uppercase tracking-widest">Exit</button>
                    <button className="px-6 py-2 bg-white text-slate-950 font-black rounded-lg hover:bg-slate-100 transition-all shadow-xl text-xs uppercase tracking-widest">Complete</button>
                </div>
            </footer>
        </div>
    );
};

const RefreshCw = ({ size }: { size: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>;

export default TrainingViewer;
