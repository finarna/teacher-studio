import React, { useState, useMemo, useEffect } from 'react';
import {
  Filter,
  Download,
  Sparkles,
  Image as ImageIcon,
  Eye,
  ArrowLeft,
  PenTool,
  Lightbulb,
  Sigma,
  AlertTriangle,
  X,
  Maximize2,
  Share2,
  Printer,
  ChevronRight,
  Loader2,
  RotateCw,
  ArrowRight
} from 'lucide-react';
import { Scan, AnalyzedQuestion } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeAiParse } from '../utils/aiParser';
import { RenderWithMath } from './MathRenderer';
import { cache } from '../utils/cache';

interface SketchGalleryProps {
  onBack?: () => void;
  scan?: Scan | null;
  onUpdateScan?: (scan: Scan) => void;
  recentScans?: Scan[];
}

const STATIC_SKETCHES: any[] = [];

const SketchGallery: React.FC<SketchGalleryProps> = ({ onBack, scan, onUpdateScan, recentScans }) => {
  const [activeTab, setActiveTab] = useState(scan ? 'Exam Specific' : 'All Subjects');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedSketch, setSelectedSketch] = useState<any | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [selectedVaultScan, setSelectedVaultScan] = useState<Scan | null>(scan);
  const [groupByDomain, setGroupByDomain] = useState(true);

  const [selectedGrade, setSelectedGrade] = useState(selectedVaultScan?.grade || 'Class 12');
  const [selectedSubject, setSelectedSubject] = useState(selectedVaultScan?.subject || 'Physics');

  useEffect(() => {
    if (!selectedVaultScan && recentScans && recentScans.length > 0) {
      const latest = recentScans[0];
      setSelectedVaultScan(latest);
      setActiveTab('Exam Specific');
    }
  }, [recentScans, selectedVaultScan]);

  useEffect(() => {
    if (selectedVaultScan) {
      setSelectedGrade(selectedVaultScan.grade);
      setSelectedSubject(selectedVaultScan.subject);
    }
  }, [selectedVaultScan]);

  const scanQuestions = selectedVaultScan?.analysisData?.questions || [];

  const dynamicSketches = useMemo(() => {
    return scanQuestions.map((q) => ({
      id: q.id,
      visualConcept: q.visualConcept || (q.topic ? `Visual Summary: ${q.topic}` : (q.text ? `${q.text.substring(0, 40)}...` : 'Conceptual Diagram')),
      subject: selectedVaultScan?.subject || 'Science',
      tag: `${q.marks} Marks`,
      img: q.sketchSvg || q.diagramUrl || null,
      isSvg: (q.sketchSvg || q.diagramUrl || '').trim().startsWith('<svg'),
      description: q.text || "",
      difficulty: q.difficulty || "Moderate",
      generated: !!(q.sketchSvg || q.diagramUrl),
      formulas: q.keyFormulas || [],
      tip: q.examTip || "",
      pitfalls: q.pitfalls || [],
      detailedNotes: q.masteryMaterial?.logic || "",
      mentalAnchor: q.masteryMaterial?.memoryTrigger || "",
      proceduralLogic: q.solutionSteps || []
    }));
  }, [scanQuestions, selectedVaultScan]);

  const categorizedSketches = useMemo(() => {
    if (!selectedVaultScan || activeTab !== 'Exam Specific') return null;

    const DOMAIN_MAP: Record<string, string[]> = {
      'Mechanics': ['Fluid', 'Rotational', 'Motion', 'Gravitation', 'Gravity', 'Work', 'Energy', 'Kinematics', 'Dynamics', 'Force', 'Momentum', 'Torque', 'Angular', 'Newton', 'Inertia', 'Oscillation', 'Satellite'],
      'Electrodynamics': ['Capacitor', 'Magnetic', 'Current', 'Electric', 'Circuit', 'Charge', 'Voltage', 'Resistance', 'Induction', 'Alternating', 'Field', 'Potential', 'Gauss', 'Ampere', 'Faraday', 'Lenz', 'Ohm'],
      'Modern Physics': ['Atomic', 'Nuclear', 'Photoelectric', 'Quantum', 'Electron', 'Photon', 'Dual Nature', 'Radioactivity', 'Bohr', 'De Broglie'],
      'Optics': ['Light', 'Lens', 'Mirror', 'Refraction', 'Reflection', 'Interference', 'Diffraction', 'Prism', 'Optical Instrument', 'Wavefront', 'Huygens', 'Polarisation'],
      'Thermodynamics': ['Heat', 'Temperature', 'Gas', 'Thermal', 'Entropy', 'Carnot', 'Specific Heat', 'Isothermal', 'Adiabatic'],
      'Waves': ['Wave', 'Sound', 'Oscillation', 'SHM', 'Frequency', 'Doppler', 'Beats', 'Resonance'],
      'Semiconductors': ['Diode', 'Transistor', 'Logic Gate', 'Semiconductor', 'PN Junction', 'Rectifier', 'LED', 'Zener']
    };

    const categorized: Record<string, any[]> = {};

    dynamicSketches.forEach(sketch => {
      const searchStr = `${sketch.visualConcept} ${sketch.description}`.toLowerCase();
      let matched = false;

      for (const [domain, keywords] of Object.entries(DOMAIN_MAP)) {
        if (keywords.some(kw => searchStr.includes(kw.toLowerCase()))) {
          if (!categorized[domain]) categorized[domain] = [];
          categorized[domain].push(sketch);
          matched = true;
          break;
        }
      }

      if (!matched) {
        if (!categorized['General']) categorized['General'] = [];
        categorized['General'].push(sketch);
      }
    });

    return categorized;
  }, [dynamicSketches, selectedVaultScan, activeTab]);

  const displayedSketches = activeTab === 'Exam Specific' && selectedVaultScan ? dynamicSketches : STATIC_SKETCHES;

  const handleGenerate = async (id: string) => {
    if (!selectedVaultScan || !onUpdateScan) return;
    setGeneratingId(id);
    setGenError(null);
    try {
      const q = scanQuestions.find(it => it.id === id);
      if (!q) return;

      const cacheKey = `sketch_${selectedVaultScan.id}_${id}`;
      const cachedSvg = cache.get(cacheKey);

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key Missing");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `Elite Academic Illustrator & Lead Curriculum Designer: Synthesize a MULTIMODAL PEDAGOGICAL BLUEPRINT.
CONCEPT: ${q.visualConcept || q.topic}
CONTEXT: ${q.text}

TASK 1: CREATE A WORLD-CLASS SCIENTIFIC ILLUSTRATION (SVG)
Requirements:
- Master-Level Aesthetics: Use <defs> with <linearGradient> for realistic shading, <radialGradient> for spherical bodies, and <filter> for realistic drop-shadows and glows.
- Textbook Accuracy: No simple lines; use 3D-effect cylinders, glass textures, and metallic brushed gradients.
- Professional Layout: 1000x800 viewBox. Light grid background (#f8fafc).
- Advanced Labeling: Labels in white capsules with shadows. Circular anchors.
- Scientific Notation: Forces(Red), Velocity(Blue), Fields(Indigo) color-coded with arrowheads.
- Concept Breakdown: Zoom-In insets if needed.

TASK 2: GENERATE DIMENSIONAL PEDAGOGICAL NOTES
- First Principles: Deep-dive into 'Why'.
- Mental Anchor: Power metaphor.
- Procedural Logic: Problem-solving steps.
- Key Formulas: LaTeX essential derivations.
- The Trap: Common pitfall.

RETURN JSON SCHEMA:
{
  "svgCode": "<svg ...> full standalone svg code </svg>",
  "detailedNotes": "...",
  "mentalAnchor": "...",
  "proceduralLogic": ["Step 1...", "Step 2..."],
  "visualConcept": "...",
  "keyFormulas": ["$$...$$"],
  "examTip": "...",
  "pitfalls": ["..."]
}`;

      const result = await model.generateContent(prompt);
      const blueprint = JSON.parse(result.response.text() || "{}");

      if (!blueprint.svgCode) throw new Error("Invalid blueprint");

      const updatedQuestions = scanQuestions.map(question =>
        question.id === id ? {
          ...question,
          sketchSvg: blueprint.svgCode,
          visualConcept: blueprint.visualConcept || question.visualConcept,
          examTip: blueprint.examTip || question.examTip,
          keyFormulas: blueprint.keyFormulas || question.keyFormulas,
          pitfalls: blueprint.pitfalls || question.pitfalls,
          solutionSteps: blueprint.proceduralLogic || question.solutionSteps,
          masteryMaterial: {
            ...question.masteryMaterial,
            logic: blueprint.detailedNotes,
            memoryTrigger: blueprint.mentalAnchor
          }
        } : question
      );

      const updatedScan: Scan = {
        ...selectedVaultScan,
        analysisData: {
          ...selectedVaultScan.analysisData!,
          questions: updatedQuestions
        }
      };

      onUpdateScan(updatedScan);
      setSelectedVaultScan(updatedScan);
      cache.save(`sketch_${selectedVaultScan.id}_${id}`, blueprint.svgCode, selectedVaultScan.id, 'sketch');
      cache.save(`blueprint_${selectedVaultScan.id}_${id}`, blueprint, selectedVaultScan.id, 'synthesis');

      if (selectedSketch && selectedSketch.id === id) {
        setSelectedSketch({
          ...selectedSketch,
          img: blueprint.svgCode,
          isSvg: true,
          generated: true,
          visualConcept: blueprint.visualConcept,
          formulas: blueprint.keyFormulas,
          tip: blueprint.examTip,
          pitfalls: blueprint.pitfalls,
          detailedNotes: blueprint.detailedNotes,
          proceduralLogic: blueprint.proceduralLogic,
          mentalAnchor: blueprint.mentalAnchor
        });
      }
    } catch (err: any) {
      console.error(err);
      setGenError(err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateAll = async () => {
    const pendingIds = dynamicSketches.filter(s => !s.generated).map(s => s.id);
    for (const id of pendingIds) {
      await handleGenerate(id);
    }
  };

  const renderCard = (item: any) => (
    <div
      key={item.id}
      onClick={() => setSelectedSketch(item)}
      className="bg-white rounded-[1.25rem] p-5 group cursor-pointer border border-slate-100 hover:border-primary-500/50 hover:shadow-xl transition-all duration-500 flex flex-col relative overflow-hidden shadow-sm"
    >
      <div className="absolute top-0 right-0 p-6 z-10 pointer-events-none">
        <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl shadow-lg border uppercase tracking-widest ${item.difficulty === 'Hard' ? 'bg-rose-50 text-rose-600 border-rose-100' :
          item.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-emerald-50 text-emerald-700 border-emerald-100'
          }`}>
          {item.tag}
        </span>
      </div>

      <div className="aspect-[4/3] bg-slate-50 rounded-[2rem] mb-6 overflow-hidden relative flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-95 transition-transform duration-500">
        {item.img ? (
          item.isSvg ? (
            <div className="w-full h-full p-5 mix-blend-multiply flex items-center justify-center" dangerouslySetInnerHTML={{ __html: item.img }} />
          ) : (
            <img src={item.img} alt={item.visualConcept} className="w-full h-full object-cover mix-blend-multiply transition-transform duration-1000 group-hover:scale-110" />
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-3 p-6 text-center w-full h-full">
            {generatingId === item.id ? (
              <div className="flex flex-col items-center">
                <Sparkles className="animate-spin text-primary-500 mb-2" size={32} />
                <p className="text-[9px] font-bold text-primary-600 uppercase tracking-widest">AI Synthesis...</p>
              </div>
            ) : (
              <>
                <ImageIcon size={48} className="text-slate-200 opacity-50" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Concept Pending</p>
                <button
                  onClick={(e) => { e.stopPropagation(); handleGenerate(item.id); }}
                  className="mt-4 text-[10px] bg-white border border-slate-200 text-slate-900 px-6 py-2.5 rounded-full font-black hover:bg-slate-900 hover:text-white transition-all shadow-md uppercase tracking-widest"
                >
                  Sync Sketch
                </button>
              </>
            )}
          </div>
        )}

        {item.generated && (
          <div className="absolute inset-0 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 backdrop-blur-md p-8 text-center overflow-hidden">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white mb-2 animate-bounce">
              <Maximize2 size={24} />
            </div>
            <div className="text-xs text-white font-bold leading-relaxed line-clamp-3 italic opacity-80 mb-4 overflow-hidden">
              <RenderWithMath text={item.description} showOptions={false} serif={false} dark={true} className="text-white text-xs" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleGenerate(item.id); }}
                disabled={generatingId !== null}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 group/reg"
              >
                {generatingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} className="group-hover/reg:rotate-180 transition-transform duration-500" />}
                {generatingId === item.id ? 'Syncing...' : 'Regenerate'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-1 pb-1">
        <h3 className="font-bold text-slate-900 leading-tight text-lg line-clamp-2 mb-1.5 font-outfit tracking-tight">
          <RenderWithMath text={item.visualConcept} showOptions={false} serif={false} />
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${item.subject === 'Physics' ? 'bg-indigo-500' : item.subject === 'Chemistry' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-outfit">
            {item.id} <span className="mx-1.5 text-slate-200">/</span> {item.subject}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-slate-50 p-8 font-instrument text-slate-900 scroller-hide selection:bg-primary-500 selection:text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-3 transition-all font-bold text-[9px] uppercase tracking-widest group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Mastermind
          </button>
          <div className="flex items-center gap-2 text-primary-600 mb-1.5 text-[9px] uppercase tracking-[0.2em] font-bold font-outfit">
            <span>{selectedGrade}</span> <ChevronRight size={10} /> <span>{selectedSubject}</span> <ChevronRight size={10} /> <span>Visual Blueprint</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-outfit">
            {selectedVaultScan ? `Visual Notes: ${selectedVaultScan.name}` : 'High-Yield Sketch Gallery'}
          </h1>
          <p className="text-slate-500 mt-3 max-w-2xl text-base font-medium italic leading-relaxed">
            AI-generated visual concepts optimized for board retention.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {recentScans && recentScans.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Selected Analysis Vault</label>
              <select
                value={selectedVaultScan?.id || ''}
                onChange={(e) => {
                  const selected = recentScans.find(s => s.id === e.target.value);
                  if (selected) setSelectedVaultScan(selected);
                }}
                className="bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer min-w-[200px]"
              >
                <option value="">Select from Vault...</option>
                {recentScans.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.subject})</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setGroupByDomain(!groupByDomain)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-primary-400 transition-all shadow-sm">
              {groupByDomain ? 'Show All' : 'Group by Domain'}
            </button>
            <button onClick={handleGenerateAll} disabled={generatingId !== null} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg flex items-center gap-2.5 shadow-lg hover:bg-slate-800 transition-all uppercase tracking-widest text-[10px] disabled:opacity-50">
              {generatingId ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} className="text-primary-400" />}
              Generate All
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-3 border-b border-slate-200 scroller-hide">
        {selectedVaultScan && (
          <button
            onClick={() => setActiveTab('Exam Specific')}
            className={`px-6 py-2.5 rounded-xl text-[9px] uppercase tracking-[0.15em] font-bold whitespace-nowrap transition-all ${activeTab === 'Exam Specific' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 bg-white border border-slate-100 shadow-sm'
              }`}
          >
            Exam Specific ({dynamicSketches.length})
          </button>
        )}
        {['Physics', 'Chemistry', 'Biology'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-[9px] uppercase tracking-[0.15em] font-bold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 bg-white border border-slate-100 shadow-sm'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Exam Specific' && groupByDomain && categorizedSketches ? (
        <div className="space-y-12">
          {Object.entries(categorizedSketches).map(([domain, sketches]) => sketches.length > 0 && (
            <div key={domain} className="animate-in fade-in slide-in-from-bottom-4 duration-700 border-l-4 border-slate-200 pl-8 ml-2">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform">
                  <PenTool size={20} className="text-primary-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight font-outfit uppercase">{domain}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sketches.length} Master Class Sketches</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {sketches.map(item => renderCard(item))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {displayedSketches.map(item => renderCard(item))}
        </div>
      )}

      {selectedSketch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setSelectedSketch(null)} />
          <div className="relative w-full max-w-7xl h-full max-h-[90vh] bg-slate-50 rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/20">
            <div className="flex-1 bg-[#f8fafc] relative overflow-hidden flex items-center justify-center p-12 group cursor-zoom-in min-h-[400px]">
              <div className="absolute top-8 left-8 z-10">
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 text-[10px] font-black rounded-xl border shadow-lg uppercase tracking-widest ${selectedSketch.difficulty === 'Hard' ? 'bg-rose-500 text-white border-rose-400' :
                    selectedSketch.difficulty === 'Medium' ? 'bg-amber-400 text-slate-900 border-amber-300' :
                      'bg-emerald-500 text-white border-emerald-400'
                    }`}>
                    {selectedSketch.difficulty}
                  </span>
                </div>
              </div>
              <div className="absolute top-8 right-8 z-10 flex gap-3">
                <button
                  onClick={() => handleGenerate(selectedSketch.id)}
                  disabled={generatingId !== null}
                  className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center text-slate-700 hover:text-primary-600 shadow-xl border border-slate-200 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 group/reg"
                  title="Regenerate Visual"
                >
                  {generatingId === selectedSketch.id ? <Loader2 size={20} className="animate-spin" /> : <RotateCw size={20} />}
                  <span className="text-[7px] font-black uppercase tracking-tighter mt-1 opacity-0 group-hover/reg:opacity-100 transition-opacity">Regen</span>
                </button>
                <button onClick={() => setSelectedSketch(null)} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-700 hover:text-slate-950 shadow-xl border border-slate-200 transition-all hover:scale-110 active:scale-95">
                  <X size={20} />
                </button>
              </div>
              <div className="w-full h-full flex items-center justify-center max-w-4xl max-h-4xl relative">
                {selectedSketch.img ? (
                  selectedSketch.isSvg ? (
                    <div className="w-full h-auto max-h-full drop-shadow-2xl mix-blend-multiply transition-transform duration-700 hover:scale-105" dangerouslySetInnerHTML={{ __html: selectedSketch.img }} />
                  ) : (
                    <img src={selectedSketch.img} alt={selectedSketch.visualConcept} className="w-full h-auto max-h-full rounded-3xl shadow-2xl transition-transform duration-700 hover:scale-105" />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-6 text-slate-300">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-inner border border-slate-100">
                      <Sparkles size={48} className="text-slate-200" />
                    </div>
                    <div className="text-center">
                      <p className="font-outfit font-black text-2xl uppercase tracking-[0.2em] text-slate-400 mb-2">Blueprint Empty</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[240px] leading-relaxed mb-8">Synchronized node data detected. Manifest the visual blueprint to initialize neural anchoring.</p>
                    </div>
                    <button
                      onClick={() => handleGenerate(selectedSketch.id)}
                      disabled={generatingId !== null}
                      className="px-10 py-5 bg-slate-900 border-2 border-slate-800 hover:bg-slate-800 text-white font-black rounded-full shadow-2xl transition-all flex items-center gap-4 uppercase tracking-[0.2em] text-xs hover:scale-105 active:scale-95"
                    >
                      {generatingId === selectedSketch.id ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-primary-400" />}
                      Generate Visual Blueprint
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full md:w-[450px] bg-white border-l border-slate-200 flex flex-col h-full shadow-[-20px_0_50px_rgba(0,0,0,0.05)]">
              <div className="flex-1 overflow-y-auto p-10 scroller-hide space-y-10">
                <section>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight mb-3 font-outfit tracking-tight">
                    <RenderWithMath text={selectedSketch.visualConcept} showOptions={false} serif={false} />
                  </h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed italic border-l-2 border-slate-100 pl-4 py-1">
                    <RenderWithMath text={selectedSketch.description} showOptions={false} serif={false} />
                  </p>
                </section>

                {selectedSketch.detailedNotes && (
                  <section className="bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Lightbulb size={14} /> First Principles Deep-Dive
                    </h4>
                    <div className="text-xs text-slate-700 font-bold leading-relaxed space-y-4">
                      <RenderWithMath text={selectedSketch.detailedNotes} showOptions={false} serif={false} />
                    </div>
                  </section>
                )}

                {selectedSketch.proceduralLogic && selectedSketch.proceduralLogic.length > 0 && (
                  <section>
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Sigma size={14} /> Procedural Walkthrough
                    </h4>
                    <div className="space-y-4">
                      {selectedSketch.proceduralLogic.map((step: string, i: number) => (
                        <div key={i} className="flex gap-4 group/step items-start">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] shrink-0 border border-indigo-100 group-hover/step:bg-indigo-600 group-hover/step:text-white transition-colors">
                            {i + 1}
                          </div>
                          <div className="text-[11px] text-slate-600 font-bold flex-1 leading-normal pt-1 group-hover/step:text-slate-900 transition-colors whitespace-normal">
                            <RenderWithMath text={step} showOptions={false} serif={false} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {selectedSketch.formulas && selectedSketch.formulas.length > 0 && (
                  <section className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden group/math">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><Sigma size={48} /></div>
                    <h4 className="text-[9px] font-black text-primary-400 uppercase tracking-[0.2em] mb-4 relative z-10">Mathematical DNA</h4>
                    <div className="space-y-4 relative z-10">
                      {selectedSketch.formulas.map((f: string, i: number) => (
                        <div key={i} className="py-2.5 border-b border-white/10 last:border-0">
                          <RenderWithMath text={f.includes('$') ? f : `$$${f}$$`} showOptions={false} serif={false} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
              <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                <button className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]">
                  <Printer size={18} className="text-primary-400" /> Print Expert Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SketchGallery;