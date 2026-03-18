
import React, { useState, useMemo } from 'react';
import { Question, SubjectType } from '../types';
import FileUpload from './FileUpload';
import LoadingOverlay from './LoadingOverlay';
import { parseExamFile, generateFullAssetPackage, processInParallel } from '../utils/aiParser';
import { 
  Database, Trash2, CheckCircle2, FileStack, 
  Image as ImageIcon, Brain, Lightbulb, 
  Layers, Activity, Target, Zap, 
  Server, CloudUpload, Search, Cpu, CheckSquare,
  ChevronDown, Menu, X, Filter, RefreshCcw, Plus,
  LayoutGrid, ArrowUpRight, BarChart3, Info,
  Split, Eye, Settings2, Globe, Sparkles,
  Maximize2, ZoomIn, ZoomOut, Download,
  ClipboardList, CheckCircle, Loader2
} from 'lucide-react';
import MathRenderer from './MathRenderer';

interface AdminPortalProps {
  onPushToHub: (questions: Question[]) => void;
  currentHubSize: number;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ onPushToHub, currentHubSize }) => {
  const [stagedQuestions, setStagedQuestions] = useState<Question[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStep, setParsingStep] = useState('');
  const [parsingProgress, setParsingProgress] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('Mathematics');
  const [auditMode, setAuditMode] = useState<'grid' | 'split'>('grid');
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsParsing(true);
    setStagedQuestions([]); 
    setParsingProgress(0);
    
    try {
      setParsingStep(`High-Speed Scanning: ${file.name}`);
      const initialQuestions = await parseExamFile(file, selectedSubject, (current, total, found) => {
        setParsingStep(`Neural Scan: ${current}/${total} Pages`);
        setParsingProgress((current / total) * 50); 
      });

      if (initialQuestions.length === 0) {
        setParsingStep("No questions detected.");
        setTimeout(() => setIsParsing(false), 2000);
        return;
      }

      // Show base questions immediately for UI responsiveness
      setStagedQuestions(initialQuestions);
      setParsingStep(`Synthesizing Logic Hub for ${initialQuestions.length} items...`);
      setParsingProgress(50);

      // Parallel Enrichment
      const concurrency = 8; // Increased concurrency for faster synthesis
      const questionsWithAssets = await processInParallel(
        initialQuestions,
        async (q, idx) => {
          setParsingStep(`Logic Synthesis: ${idx + 1}/${initialQuestions.length} Questions`);
          const updated = await generateFullAssetPackage(q);
          // Progressive UI update
          setStagedQuestions(prev => prev.map(item => item.id === q.id ? updated : item));
          setParsingProgress(50 + ((idx + 1) / initialQuestions.length) * 50);
          return updated;
        },
        concurrency
      );

      setStagedQuestions(questionsWithAssets);
    } catch (e: any) {
      alert("Forge Error: " + (e.message || "Failed to process file"));
    } finally {
      setIsParsing(false);
    }
  };

  const handleFinalPush = () => {
    if (stagedQuestions.length === 0) return;
    onPushToHub(stagedQuestions);
    setStagedQuestions([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 -m-4 md:-m-6 flex flex-col font-sans">
      <LoadingOverlay isLoading={isParsing} step={parsingStep} progress={parsingProgress} />
      
      {/* DIAGRAM LIGHTBOX */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300"
          onClick={() => setZoomImage(null)}
        >
          <div className="absolute top-8 right-8 flex gap-3">
             <button className="p-4 bg-white/10 hover:bg-rose-500 rounded-2xl text-white transition-all shadow-2xl">
                <X className="w-6 h-6" />
             </button>
          </div>
          <div className="max-w-6xl w-full h-full flex flex-col items-center justify-center gap-8" onClick={e => e.stopPropagation()}>
             <div className="bg-white p-4 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden">
                <img 
                  src={zoomImage} 
                  alt="Precision Audit" 
                  className="max-h-[70vh] w-auto object-contain rounded-2xl"
                />
             </div>
             <div className="flex items-center gap-4 bg-white/5 backdrop-blur px-6 py-3 rounded-full border border-white/10">
                <span className="text-white font-black uppercase text-[10px] tracking-[0.4em]">Precision Audit Mode</span>
                <div className="h-4 w-px bg-white/10" />
                <button onClick={() => setZoomImage(null)} className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Close</button>
             </div>
          </div>
        </div>
      )}

      {/* TOP PRO-BAR */}
      <header className="h-14 bg-slate-950 text-white flex items-center justify-between px-6 shrink-0 z-[100] border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Forge v7.0</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry Sync: {currentHubSize} Assets</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {stagedQuestions.length > 0 && (
            <button 
              onClick={handleFinalPush}
              className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 border border-indigo-500"
            >
              Push Batch to Registry <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* COMMAND RAIL */}
        <nav className="w-80 bg-white border-r border-slate-200 p-8 flex flex-col gap-10 shrink-0 hidden lg:flex">
          <section className="space-y-6">
             <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                   <Target className="w-3.5 h-3.5" /> Context Filter
                </label>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
             </div>
             <div className="grid grid-cols-1 gap-1.5">
                {(['Mathematics', 'Physics', 'Chemistry', 'Biology'] as SubjectType[]).map(subj => (
                  <button
                    key={subj}
                    onClick={() => setSelectedSubject(subj)}
                    className={`text-left px-5 py-3 rounded-2xl text-[11px] font-bold transition-all border-2 ${
                      selectedSubject === subj 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-200' 
                        : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-100'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
             </div>
          </section>

          <section className="space-y-6">
             <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                   <CloudUpload className="w-3.5 h-3.5" /> Paper Ingest
                </label>
                <span className="text-[8px] font-black text-slate-300 uppercase">Secure Link</span>
             </div>
             <FileUpload onFileUpload={handleUpload} isLoading={isParsing} />
          </section>

          <div className="mt-auto p-6 bg-slate-950 rounded-[2rem] border border-white/5 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[80px] rounded-full" />
             <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-tight">AI Engine v3.0 Pro</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  Parallel synthesis enabled. Assets are generated in high-throughput streams for peak performance.
                </p>
             </div>
          </div>
        </nav>

        {/* WORKSPACE AREA */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          {stagedQuestions.length > 0 ? (
            <div className="p-8 lg:p-14 space-y-12 max-w-7xl mx-auto pb-60">
              <div className="flex items-end justify-between border-b-2 border-slate-200 pb-10">
                <div>
                   <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Batch Pipeline</h1>
                   <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-lg shadow-lg shadow-indigo-600/10">
                         <ClipboardList className="w-3 h-3" /> {stagedQuestions.length} Digitized
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Registry Confirmation</p>
                   </div>
                </div>
                <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200">
                   <button 
                     onClick={() => setAuditMode('grid')}
                     className={`px-6 py-2.5 rounded-xl transition-all flex items-center gap-3 ${auditMode === 'grid' ? 'bg-white shadow-xl text-slate-900 border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     <LayoutGrid className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Audit Grid</span>
                   </button>
                   <button 
                     onClick={() => setAuditMode('split')}
                     className={`px-6 py-2.5 rounded-xl transition-all flex items-center gap-3 ${auditMode === 'split' ? 'bg-white shadow-xl text-slate-900 border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     <Split className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Deep Logic</span>
                   </button>
                </div>
              </div>

              <div className={auditMode === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-10" : "space-y-20"}>
                {stagedQuestions.map((q, idx) => {
                  const hasLogic = !!q.solutionData;
                  return (
                    <div key={q.id} className="group relative bg-white rounded-[3rem] border border-slate-200 shadow-sm hover:border-indigo-400/50 transition-all overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-indigo-500/10">
                      <div className="px-10 py-6 flex items-center justify-between bg-slate-50/50 border-b border-slate-200/50">
                         <div className="flex items-center gap-5">
                            <span className="w-10 h-10 bg-slate-950 text-white rounded-2xl flex items-center justify-center text-sm font-black shadow-xl shadow-black/10">
                               {idx + 1}
                            </span>
                            <div>
                              <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em]">{q.metadata?.topic || 'Core Science'}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                 {hasLogic ? <CheckCircle className="w-2.5 h-2.5 text-emerald-500" /> : <Loader2 className="w-2.5 h-2.5 text-indigo-400 animate-spin" />}
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{hasLogic ? 'Audit Ready' : 'Synthesizing Assets...'}</p>
                              </div>
                            </div>
                         </div>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => setStagedQuestions(prev => prev.filter(sq => sq.id !== q.id))}
                             className="p-3 bg-white text-slate-300 hover:text-rose-500 transition-colors rounded-xl border border-slate-100 shadow-sm"
                           >
                             <Trash2 className="w-4.5 h-4.5" />
                           </button>
                         </div>
                      </div>

                      <div className="p-10 flex-1 flex flex-col gap-10">
                         <div className="text-slate-800 font-bold text-xl leading-relaxed">
                            <MathRenderer text={q.text} />
                            {q.imageUrl && (
                              <div 
                                className="mt-8 relative group/img cursor-zoom-in rounded-[2rem] overflow-hidden border-2 border-slate-100 bg-slate-50 p-3 shadow-inner"
                                onClick={() => setZoomImage(q.imageUrl || null)}
                              >
                                 <img 
                                   src={q.imageUrl} 
                                   className="w-full max-h-72 object-contain rounded-2xl transition-transform duration-700 group-hover/img:scale-[1.03]" 
                                   alt="Logic Diagram"
                                 />
                                 <div className="absolute inset-0 bg-slate-900/0 group-hover/img:bg-slate-900/10 flex items-center justify-center transition-all">
                                    <div className="p-4 bg-white rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.1)] opacity-0 group-hover/img:opacity-100 transition-all transform translate-y-6 group-hover/img:translate-y-0">
                                       <ZoomIn className="w-6 h-6 text-indigo-600" />
                                    </div>
                                 </div>
                                 <div className="absolute bottom-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur rounded-full border border-slate-200 shadow-xl">
                                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Precision Diagram</span>
                                 </div>
                              </div>
                            )}
                         </div>

                         <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Selection Logic</label>
                               <span className="text-[9px] font-bold text-emerald-500 uppercase">Target Verified</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {q.options.map(opt => (
                                <div key={opt.id} className={`p-5 rounded-3xl border-2 flex items-center gap-5 transition-all ${opt.isCorrect ? 'bg-emerald-50/50 border-emerald-500 shadow-lg shadow-emerald-500/5' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                   <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black ${opt.isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}>
                                      {opt.id}
                                   </span>
                                   <span className={`text-[15px] font-bold ${opt.isCorrect ? 'text-emerald-900' : 'text-slate-700'}`}><MathRenderer text={opt.text} /></span>
                                   {opt.isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
                                </div>
                              ))}
                            </div>
                         </div>
                      </div>

                      <div className="p-10 bg-slate-950 text-white/90 border-t border-white/5 animate-in slide-in-from-bottom-2 min-h-[120px]">
                         {hasLogic ? (
                           <>
                             <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3 text-indigo-400">
                                   <Brain className="w-6 h-6" />
                                   <span className="text-[11px] font-black uppercase tracking-[0.3em]">AI Logic Synthesis</span>
                                </div>
                                <div className="px-4 py-1.5 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
                                   <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                                   <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Optimized Logic</span>
                                </div>
                             </div>
                             <div className="space-y-5 pl-8 border-l-2 border-white/10">
                                {q.solutionData?.steps.map((step, i) => (
                                   <div key={i} className="text-[14px] font-medium leading-relaxed opacity-70 flex gap-5 group/step">
                                      <span className="text-slate-600 shrink-0 font-black text-[12px] group-hover/step:text-indigo-400 transition-colors">{i+1}</span>
                                      <MathRenderer text={step.text} />
                                   </div>
                                ))}
                             </div>
                             <div className="mt-10 flex items-start gap-6 p-7 bg-white/5 rounded-[2rem] border border-white/10 group-hover:bg-white/10 transition-colors">
                                <div className="p-3 bg-amber-500/10 rounded-2xl shrink-0 shadow-inner">
                                   <Lightbulb className="w-6 h-6 text-amber-400" />
                                 </div>
                                <div className="space-y-1">
                                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Mentor Strategic Hook</p>
                                   <p className="text-[14px] font-bold text-slate-200 italic leading-relaxed">"{q.strategicHook || q.solutionData?.finalTip}"</p>
                                </div>
                             </div>
                           </>
                         ) : (
                           <div className="flex flex-col items-center justify-center h-full py-10 gap-4">
                              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">Deep Reasoning Phase</p>
                           </div>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-24 text-center animate-in fade-in duration-1000">
               <div className="w-48 h-48 bg-white rounded-[4rem] shadow-2xl flex items-center justify-center mb-12 border-2 border-slate-100 shadow-slate-200/50">
                  <Database className="w-20 h-20 text-slate-200" />
               </div>
               <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Forge Pipeline Idle</h2>
               <p className="text-slate-400 text-[13px] font-bold uppercase tracking-[0.5em] max-w-sm leading-relaxed mt-6">
                  Commit Competitive Entrance papers to begin parallel logic synthesis.
               </p>
               <div className="mt-16 flex flex-col items-center gap-8">
                  <button 
                    onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-16 py-6 rounded-3xl font-black uppercase text-[12px] tracking-[0.4em] shadow-[0_25px_50px_rgba(79,70,229,0.25)] transition-all active:scale-95 border-b-4 border-indigo-800"
                  >
                    Launch High-Speed Scan
                  </button>
                  <p className="text-[10px] font-black uppercase text-slate-300 flex items-center gap-3">
                    <Globe className="w-4 h-4" /> Secure Hub: ASIA-SOUTH-1
                  </p>
               </div>
            </div>
          )}
        </main>
      </div>

      {/* MOBILE ACTION HUB */}
      <footer className="h-24 bg-white border-t border-slate-200 lg:hidden flex items-center justify-around px-10 pb-safe shadow-[0_-12px_40px_rgba(0,0,0,0.06)]">
         <button onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()} className="flex flex-col items-center gap-2 text-slate-400 active:text-indigo-600 transition-colors">
            <CloudUpload className="w-7 h-7" />
            <span className="text-[10px] font-black uppercase tracking-widest">Ingest</span>
         </button>
         <div className="w-px h-10 bg-slate-100" />
         <button onClick={handleFinalPush} disabled={stagedQuestions.length === 0} className={`flex flex-col items-center gap-2 transition-all ${stagedQuestions.length > 0 ? 'text-emerald-600 scale-110' : 'text-slate-200'}`}>
            <Database className="w-7 h-7" />
            <span className="text-[10px] font-black uppercase tracking-widest">Publish</span>
         </button>
      </footer>
    </div>
  );
};

export default AdminPortal;
