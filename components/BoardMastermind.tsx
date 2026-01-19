import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  ChevronRight,
  BrainCircuit,
  Sparkles,
  RefreshCcw,
  Zap,
  Cpu,
  Terminal,
  Activity,
  Layers,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import { Scan, ExamAnalysisData, AnalyzedQuestion } from '../types';
import { safeAiParse, normalizeData } from '../utils/aiParser';

interface BoardMastermindProps {
  onNavigate: (view: string) => void;
  recentScans: Scan[];
  onAddScan: (scan: Scan) => void;
  onSelectScan: (scan: Scan) => void;
}

const BoardMastermind: React.FC<BoardMastermindProps> = ({ onNavigate, recentScans, onAddScan, onSelectScan }) => {
  const [selectedSubject, setSelectedSubject] = useState('Physics');
  const [selectedGrade, setSelectedGrade] = useState('Class 12');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [pipelineLogs, setPipelineLogs] = useState<{ stage: string; status: 'pending' | 'active' | 'complete' | 'error'; label: string }[]>([
    { stage: 'extraction', status: 'pending', label: 'Intelligence Extraction' },
    { stage: 'analysis', status: 'pending', label: 'Cognitive Meta-Analysis' },
    { stage: 'skeptic', status: 'pending', label: 'Fidelity Lock' }
  ]);

  const updatePipelineStatus = (stage: string, status: 'pending' | 'active' | 'complete' | 'error') => {
    setPipelineLogs(prev => prev.map(log => log.stage === stage ? { ...log, status } : log));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        processHolographicPipeline(files[0]);
      } else {
        processBulkPipeline(Array.from(files));
      }
    }
  };

  const processBulkPipeline = async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    setBulkProgress({ current: 0, total: files.length });
    setPipelineLogs([
      { stage: 'extraction', status: 'pending', label: `Bulk Extraction (${files.length} Files)` },
      { stage: 'analysis', status: 'pending', label: 'Cumulative Meta-Analysis' },
      { stage: 'skeptic', status: 'pending', label: 'Unified Fidelity Lock' }
    ]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey.length < 5) {
        throw new Error("API Key Missing");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 8192
        }
      });

      const allExtractedQuestions: AnalyzedQuestion[] = [];
      updatePipelineStatus('extraction', 'active');

      // Process files one by one for maximum clarity and per-file progress tracking
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setBulkProgress(prev => ({ ...prev, current: i + 1 }));
        setLoadingStage(`Scanning File ${i + 1}/${files.length}: ${file.name}`);

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        const base64Data = await base64Promise;
        const mimeType = file.type || 'application/pdf';

        const extractionPrompt = `Extract ALL questions verbatim from this ${selectedSubject} paper.
        RULES:
        1. Multiple Choice Questions (MCQs) are worth EXACTLY 1 Mark unless explicitly stated otherwise in the text.
        2. Use high fidelity LaTeX for all formulas.
        
        SCHEMA: { "questions": [{ "id": "Q1", "text": "...", "options": ["..."], "marks": 1, "difficulty": "...", "topic": "...", "blooms": "..." }] }`;

        const result = await genModel.generateContent([{ inlineData: { mimeType, data: base64Data } }, extractionPrompt]);
        const data = safeAiParse<any>(result.response.text(), { questions: [] }, true);

        if (data.questions) {
          const filePrefix = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 10);
          const taggedQuestions = data.questions.map((q: any, idx: number) => ({
            ...q,
            id: q.id ? `${filePrefix}-${q.id}` : `${filePrefix}-q-${idx}`,
            source: file.name
          }));
          allExtractedQuestions.push(...taggedQuestions);
        }
      }

      updatePipelineStatus('extraction', 'complete');
      updatePipelineStatus('analysis', 'active');
      setLoadingStage('Synthesizing Cumulative Portfolio Trends...');

      const analysisPrompt = `Perform a CUMULATIVE meta-analysis on these ${allExtractedQuestions.length} questions from ${files.length} different ${selectedSubject} papers.
      Topics & Difficulties provided: ${JSON.stringify(allExtractedQuestions.map(q => ({ topic: q.topic, difficulty: q.difficulty, marks: q.marks, source: q.source })))}
      
      Analyze CROSS-PAPER TRENDS (e.g., repeating topics, shifting difficulty).
      
      SCHEMA: { 
        "summary": "Unified analysis across ${files.length} papers...", 
        "overallDifficulty": "Hard", 
        "difficultyDistribution": [{"name": "Easy", "percentage": 30, "color": "#10b981"}, ...], 
        "bloomsTaxonomy": [{"name": "Remembering", "percentage": 20, "color": "#6366f1"}, ...], 
        "topicWeightage": [{"name": "Topic A", "marks": 45, "color": "#f59e0b"}, ...], 
        "predictiveTopics": [{"topic": "Semiconductors: Logic Gates", "probability": 95, "reason": "Consistent 4-mark yield across all 3 years with shifting Boolean logic constraints."}], 
        "trends": [{"title": "Era of Numerical Shift", "description": "Analysis shows a 20% increase in formula-based application over theory.", "type": "positive"}],
        "strategy": ["Focus on Topic X due to Y..."] 
      }`;

      const analysisRes = await genModel.generateContent(analysisPrompt);
      const cumulativeAnalyticData = safeAiParse<any>(analysisRes.response.text(), {}, false);

      updatePipelineStatus('analysis', 'complete');
      updatePipelineStatus('skeptic', 'active');
      setLoadingStage('Forging Unified Vault...');

      const brainData: ExamAnalysisData = normalizeData({
        ...cumulativeAnalyticData,
        questions: allExtractedQuestions
      });

      const newScan: Scan = {
        id: 'bulk-' + Date.now(),
        name: `Portfolio: ${files.length} ${selectedSubject} Papers [${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]`,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        status: 'Complete',
        grade: selectedGrade || 'Class 12',
        subject: selectedSubject,
        analysisData: brainData
      };

      updatePipelineStatus('skeptic', 'complete');
      onAddScan(newScan);
      onSelectScan(newScan);
      onNavigate('analysis');

    } catch (e: any) {
      console.error("BULK_PIPELINE_ERROR:", e);
      setError(e.message || "Bulk processing failed.");
      pipelineLogs.forEach(log => updatePipelineStatus(log.stage, 'error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const processHolographicPipeline = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setBulkProgress({ current: 1, total: 1 });
    setPipelineLogs([
      { stage: 'extraction', status: 'pending', label: 'Intelligence Extraction' },
      { stage: 'analysis', status: 'pending', label: 'Cognitive Meta-Analysis' },
      { stage: 'skeptic', status: 'pending', label: 'Fidelity Lock' }
    ]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey.length < 5) {
        throw new Error("API Key Missing: Please configure VITE_GEMINI_API_KEY in your environment.");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;
      const mimeType = file.type || 'application/pdf';

      // --- PHASE 1: PARALLEL NEURAL TRACKS ---
      updatePipelineStatus('extraction', 'active');
      updatePipelineStatus('analysis', 'active');
      setLoadingStage(`Analyzing ${file.name}...`);

      const genModel = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 8192
        }
      });

      // Track 1: Verbatim Intelligence Extraction (Questions Only)
      const extractionPrompt = `Extract ALL questions verbatim from this ${selectedSubject} (${selectedGrade}) paper.
      RULES:
      1. Multiple Choice Questions (MCQs) are worth EXACTLY 1 Mark unless explicitly stated otherwise.
      2. Use LaTeX for all formulas.
      SCHEMA: { "questions": [{ "id": "Q1", "text": "...", "options": ["..."], "marks": 1, "difficulty": "...", "topic": "...", "blooms": "..." }] }`;

      // Track 2: Pedagogical Meta-Analysis (Charts/Summary)
      const analysisPrompt = `Synthesize structural analysis for this ${selectedSubject} paper.
      SCHEMA: { 
        "summary": "Full paper meta-analysis...", 
        "overallDifficulty": "Moderate", 
        "difficultyDistribution": [{"name": "Easy", "percentage": 30, "color": "#10b981"}, ...], 
        "bloomsTaxonomy": [{"name": "Remembering", "percentage": 20, "color": "#6366f1"}, ...], 
        "topicWeightage": [{"name": "Optics", "marks": 14, "color": "#f59e0b"}, ...], 
        "predictiveTopics": [{"topic": "Compound Microscope", "probability": 85, "reason": "High-yield derivation frequency in late-stage board cycles."}], 
        "strategy": ["Prioritize derivation A...", "Logic focus on B..."] 
      }`;

      const [extractRes, analysisRes] = await Promise.all([
        genModel.generateContent([{ inlineData: { mimeType, data: base64Data } }, extractionPrompt]),
        genModel.generateContent([{ inlineData: { mimeType, data: base64Data } }, analysisPrompt])
      ]);

      const rawExtract = extractRes.response.text();
      const rawAnalysis = analysisRes.response.text();

      const extractionId = Date.now().toString().slice(-4);
      const extractedData = safeAiParse<any>(rawExtract, { questions: [] }, true);
      const analyticData = safeAiParse<any>(rawAnalysis, {}, false);

      if (extractedData.questions) {
        extractedData.questions = extractedData.questions.map((q: any, idx: number) => ({
          ...q,
          id: q.id ? `${extractionId}-${q.id}` : `${extractionId}-q-${idx}`,
          source: file.name
        }));
      }

      updatePipelineStatus('extraction', 'complete');
      updatePipelineStatus('analysis', 'complete');

      // --- PHASE 2: INTEGRATION & FIDELITY LOCK ---
      updatePipelineStatus('skeptic', 'active');
      setLoadingStage('Finalizing Multimodal Lock...');

      const brainData: ExamAnalysisData = {
        ...analyticData,
        questions: extractedData.questions || []
      };

      const newScan: Scan = {
        id: 'scan-' + Date.now(),
        name: `${file.name.split('.')[0]} [${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]`,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        status: 'Complete',
        grade: selectedGrade || 'Class 12',
        subject: selectedSubject,
        analysisData: brainData
      };

      updatePipelineStatus('skeptic', 'complete');
      onAddScan(newScan);
      onSelectScan(newScan);
      onNavigate('analysis');

    } catch (e: any) {
      console.error("PIPELINE_ERROR:", e);
      setError(e.message);
      pipelineLogs.forEach(log => updatePipelineStatus(log.stage, 'error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col gap-4 font-instrument bg-slate-50/50">

      {/* Dynamic Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tight">Intelligence Hub</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">AI Ops Pipeline: ACTIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            {['Class 10', 'Class 12'].map(g => (
              <button key={g} onClick={() => setSelectedGrade(g)} className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${selectedGrade === g ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                {g}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-accent-500/10 shadow-sm outline-none cursor-pointer hover:border-accent-300 transition-colors">
            <option>Physics</option><option>Math</option><option>Chemistry</option><option>Biology</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">

        {/* Left Panel: Primary Actions */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-6 min-h-0">

          {/* Ingestion Zone */}
          <div className={`bg-white border border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-center relative overflow-hidden group/zone shadow-sm transition-all duration-700 ${isProcessing ? 'p-8 md:p-12 min-h-[450px] border-accent-100 shadow-xl shadow-accent-500/5' : 'p-8 border-dashed'}`}>
            {isProcessing && (
              <div className="absolute inset-x-0 top-0 h-1.5 bg-accent-500/10 overflow-hidden">
                <div className="w-full h-full bg-accent-500/40 animate-pulse-glow" />
              </div>
            )}
            {isProcessing ? (
              <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500 py-4 px-6 max-w-2xl mx-auto">
                {/* Master Header - Compact */}
                <div className="flex items-center gap-6 p-6 bg-slate-900 rounded-3xl relative overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-accent-600/10 animate-pulse" />
                  <div className="relative w-16 h-16 bg-white border-4 border-slate-800 rounded-2xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
                    <Cpu size={28} className="text-slate-900 animate-spin-slow" />
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-accent-500 animate-shimmer" />
                  </div>
                  <div className="text-left space-y-1 relative z-10">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white font-outfit uppercase tracking-tight">Synthesizing <span className="text-accent-400">Logic</span></h3>
                      <div className="w-2 h-2 rounded-full bg-accent-500 animate-ping" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                      AI Ops Pipeline: {bulkProgress.total > 1 ? `Processing Portfolio (${bulkProgress.current}/${bulkProgress.total})` : 'Processing Multimodal Input'}
                    </p>

                    {/* Compact Progress Bar */}
                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-accent-400 uppercase">
                          {bulkProgress.total > 1 ? `Global File Progress: ${bulkProgress.current}/${bulkProgress.total}` : 'Fidelity Health'}
                        </span>
                        <span className="text-[9px] font-black text-white">
                          {bulkProgress.total > 1
                            ? Math.round((bulkProgress.current / bulkProgress.total) * 100)
                            : Math.round((pipelineLogs.filter(p => p.status === 'complete').length / pipelineLogs.length) * 100)}%
                        </span>
                      </div>
                      <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-500 transition-all duration-700"
                          style={{
                            width: `${bulkProgress.total > 1
                              ? (bulkProgress.current / bulkProgress.total) * 100
                              : (pipelineLogs.filter(p => p.status === 'complete').length / pipelineLogs.length) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pipeline Steps - Compact Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {pipelineLogs.map((log, i) => (
                    <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${log.status === 'active'
                      ? 'bg-white border-accent-400 shadow-xl ring-4 ring-accent-500/5 translate-y-[-2px]'
                      : log.status === 'complete'
                        ? 'bg-emerald-50/30 border-emerald-100 opacity-100'
                        : 'bg-white border-slate-100 opacity-50'
                      }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${log.status === 'complete'
                        ? 'bg-emerald-500 text-white'
                        : log.status === 'active'
                          ? 'bg-accent-600 text-white shadow-lg shadow-accent-500/20'
                          : 'bg-slate-50 text-slate-300 border border-slate-100'
                        }`}>
                        {log.status === 'complete' ? <CheckCircle2 size={18} /> :
                          log.status === 'active' ? <Activity size={18} className="animate-pulse" /> :
                            <Clock size={18} />}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={`text-[10px] font-black uppercase tracking-widest truncate ${log.status === 'active' ? 'text-accent-700' : 'text-slate-900'}`}>{log.label}</p>
                        {log.status === 'active' ? (
                          <div className="flex flex-col mt-0.5">
                            <div className="flex items-center gap-2">
                              <span className="flex gap-1">
                                <span className="w-1 h-1 bg-accent-500 rounded-full animate-bounce [animation-delay:0ms]" />
                                <span className="w-1 h-1 bg-accent-500 rounded-full animate-bounce [animation-delay:150ms]" />
                                <span className="w-1 h-1 bg-accent-500 rounded-full animate-bounce [animation-delay:300ms]" />
                              </span>
                              <span className="text-[8px] font-bold text-accent-500 truncate">{loadingStage}</span>
                            </div>
                          </div>
                        ) : log.status === 'complete' ? (
                          <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter">Synchronized</span>
                        ) : (
                          <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Awaiting Sync</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Assurance Footer */}
                <div className="flex items-center justify-center gap-2 border-t border-slate-100 pt-6">
                  <Terminal size={12} className="text-slate-400" />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Holographic Analysis Engine v2.0-Flash</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover/zone:scale-110 group-hover/zone:rotate-3">
                  <Plus size={24} className="text-slate-400 group-hover/zone:text-accent-600 transition-colors" />
                </div>
                <h3 className="text-lg font-black text-slate-900 font-outfit uppercase tracking-tight">New Ingestion</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-6 italic">Verbatim Multi-Modal PDF/Image Processing</p>
                <label className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] cursor-pointer hover:bg-accent-600 transition-all shadow-xl active:scale-95 group-hover/zone:px-12">
                  Trigger Agent
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png" disabled={isProcessing} multiple />
                </label>
              </>
            )}
          </div>

          {/* Data Monitoring (Dense) */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Total Scans', value: recentScans.length, icon: Layers, color: 'text-accent-600' },
              { label: 'Intelligence Depth', value: '4 Layers', icon: BrainCircuit, color: 'text-rose-600' },
              { label: 'Global Frags', value: '4.2k+', icon: Sparkles, color: 'text-amber-600' }
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <stat.icon size={16} className={`${stat.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</span>
                </div>
                <div className="text-xl font-black text-slate-900 font-outfit uppercase italic">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Vault (Scrollable List) */}
        <div className="col-span-12 xl:col-span-4 min-h-0 flex flex-col">
          <div className="bg-white border border-slate-200 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] font-outfit italic">Vault History</h3>
              <Filter size={14} className="text-slate-400" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scroller-hide bg-slate-50/30">
              {recentScans.length > 0 ? [...recentScans].reverse().map(scan => (
                <button key={scan.id} onClick={() => { onSelectScan(scan); onNavigate('analysis'); }}
                  className="w-full text-left p-4 bg-white border border-slate-100 rounded-xl hover:border-primary-300 hover:shadow-lg transition-all group/item flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover/item:bg-primary-600 group-hover/item:text-white transition-colors">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-slate-900 truncate uppercase mb-1 font-outfit">{scan.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{scan.date}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover/item:text-primary-600 transform group-hover/item:translate-x-1 transition-all" />
                </button>
              )) : (
                <div className="flex flex-col items-center justify-center h-full opacity-30 text-center py-20 px-10">
                  <Layers size={48} className="text-slate-300 mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Secure Encryption Active</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-6 py-3 rounded-xl shadow-2xl font-black text-[10px] uppercase tracking-widest animate-in slide-in-from-bottom-5">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default BoardMastermind;