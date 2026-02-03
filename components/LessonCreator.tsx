import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Layers,
  Zap,
  Settings,
  Target,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Beaker,
  FileQuestion,
  ClipboardCheck,
  BrainCircuit
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { LessonContract, ModuleType, Subject, Grade } from '../types';

interface LessonCreatorProps {
  onClose: () => void;
  onLessonCreated: (lesson: LessonContract) => void;
}

interface GenerationStatus {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  icon: any;
}

const LessonCreator: React.FC<LessonCreatorProps> = ({ onClose, onLessonCreated }) => {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState<Subject>('Physics');
  const [grade, setGrade] = useState<Grade>('Class 12');
  const [depth, setDepth] = useState<'Brief' | 'Standard' | 'Deep Dive'>('Standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<GenerationStatus[]>([
    { id: 'theory', label: 'Theory & Concepts', status: 'pending', icon: BookOpen },
    { id: 'simulation', label: 'Interactive Lab Logic', status: 'pending', icon: Beaker },
    { id: 'assessment', label: 'Adaptive Assessments', status: 'pending', icon: FileQuestion },
    { id: 'visuals', label: 'Synthesizing Visuals', status: 'pending', icon: Sparkles }
  ]);

  const updateStatus = (id: string, status: 'loading' | 'completed' | 'error') => {
    setStatuses(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const generateImage = async (prompt: string, context: string): Promise<string> => {
    const searchTerms = encodeURIComponent((prompt + " " + context + " " + topic).toLowerCase().replace(/[^a-z0-9]/g, ' '));
    return `https://loremflickr.com/800/600/${searchTerms}`;
  };

  const cleanAndParseJSON = (raw: string): any => {
    try {
      // Find the first '{' and last '}'
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON found");
      const cleaned = raw.substring(firstBrace, lastBrace + 1);
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON Parse Error", e);
      return null;
    }
  };

  const generateLesson = async () => {
    if (!topic.trim()) return setError("Please enter a topic.");
    setIsGenerating(true);
    setError(null);

    // Reset statuses
    setStatuses(prev => prev.map(s => ({ ...s, status: 'pending' })));

    try {
      // Get model from Settings
      const selectedModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';

      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: { responseMimeType: "application/json" }
      });

      let slideCount = depth === 'Brief' ? 3 : depth === 'Standard' ? 5 : 7;
      let quizCount = depth === 'Brief' ? 3 : depth === 'Standard' ? 5 : 8;

      let subjectInstructions = "";
      if (subject === 'Math') {
        subjectInstructions = `
          - Examples should be concrete numbers.
          - FORMULAS: Use strict LaTeX syntax. Inline: $x^2$. Block: $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$.
        `;
      } else if (subject === 'Physics') {
        subjectInstructions = `
          - Examples: Real-world mechanics, optics, electricity.
          - FORMULAS: Use LaTeX for physical laws. Example: $$F = ma$$.
        `;
      } else if (subject === 'Chemistry') {
        subjectInstructions = `
          - Examples: Reactions, atomic structures.
          - FORMULAS: CRITICAL - Use '\\ce{...}' for chemical formulas inside block math. 
          - Example: $$\\ce{2H2 + O2 -> 2H2O}$$
          - Inline example: $\\ce{H2O}$
        `;
      } else if (subject === 'Biology') {
        subjectInstructions = `
          - Examples: Living systems.
          - FORMULAS: Use LaTeX/mhchem for processes. Example: $$\\ce{ADP + P_i -> ATP}$$
        `;
      }

      const commonContext = `Topic: "${topic}" for ${grade} ${subject}. Level: ${depth}. Audience: Indian CBSE Students.`;

      // 1. PHASE 1: THEORY
      updateStatus('theory', 'loading');
      const theoryPrompt = `
        As a Senior CBSE Pedagogy Expert for ${subject}, generate Part 1: Theory Core on "${topic}".
        ${commonContext}
        Generate Part 1: Theory Core.
        {
          "lesson_id": "L-${Date.now()}",
          "title": "Topic Title",
          "description": "Short overview",
          "modules": [
             { "id": "m1", "type": "HOOK", "title": "Hook", "content": { "scenario": "engaging story" } },
             { 
               "id": "m2", "type": "CONCEPT", "title": "Concepts", 
               "content": { 
                 "slides": [ 
                   { 
                     "id": "s1", "title": "Title", "content": "Text with LaTeX", "example": "Solved example",
                     "highlight": "Board tip", "bulletPoints": ["Point 1"], "visualPrompt": "Diagram description"
                   } 
                 ] 
               } 
             }
          ]
        }
        REQUIREMENTS: Generate exactly ${slideCount} Concept Slides. ${subjectInstructions}
      `;
      const theoryResult = await model.generateContent(theoryPrompt);
      const theoryData = cleanAndParseJSON(theoryResult.response.text());
      if (!theoryData) throw new Error("Failed to generate theory.");
      updateStatus('theory', 'completed');

      // 2. PHASE 2: SIMULATION
      updateStatus('simulation', 'loading');
      const simPrompt = `
        ${commonContext}
        Generate Part 2: Interactive Lab.
        {
          "module": {
            "id": "m3", "type": "SIMULATION", "title": "Interactive Lab", 
            "content": { 
              "formula": "VALID JS STRING (use Math.* functions)", 
              "outputLabel": "Result Label", 
              "inputs": [{ "name": "x", "label": "Label", "min": 0, "max": 100, "unit": "unit" }],
              "visualPrompt": "Apparatus description",
              "visualMode": "chart" | "geometry" | "science_lab"
            }
          }
        }
      `;
      const simResult = await model.generateContent(simPrompt);
      const simData = cleanAndParseJSON(simResult.response.text());
      updateStatus('simulation', 'completed');

      // 3. PHASE 3: ASSESSMENT & SUMMARY
      updateStatus('assessment', 'loading');
      const assessPrompt = `
        ${commonContext}
        Generate Part 3: Assessment & Summary.
        {
          "summary": { 
             "id": "m4", "type": "LESSON_SUMMARY", "title": "Summary", 
             "content": { 
                "formulas": [{ "label": "Name", "equation": "LaTeX", "note": "Note" }], 
                "tips": ["Tip 1"], "mnemonic": "string", "visualPrompt": "Infographic"
             } 
          },
          "quiz": { 
             "id": "m5", "type": "ADAPTIVE_QUIZ", "title": "Quiz", 
             "content": { "questions": [ { "id": "q1", "question": "Question $x$", "options": ["$a$"], "correctIndex": 0, "hint": "...", "misconceptionId": "id" } ] } 
          }
        }
        REQUIREMENTS: ${quizCount} Quiz questions. ${subjectInstructions}
      `;
      const assessResult = await model.generateContent(assessPrompt);
      const assessData = cleanAndParseJSON(assessResult.response.text());
      updateStatus('assessment', 'completed');

      // 4. PHASE 4: VISUALS
      updateStatus('visuals', 'loading');

      const allModules = [
        ...theoryData.modules,
        simData?.module,
        assessData?.summary,
        assessData?.quiz
      ].filter(Boolean);

      const modulesWithVisuals = await Promise.all(allModules.map(async (mod) => {
        if (mod.type === ModuleType.HOOK) {
          mod.content.imageUrl = await generateImage(mod.content.scenario, "emotional hook");
        } else if (mod.type === ModuleType.CONCEPT) {
          mod.content.slides = await Promise.all(mod.content.slides.map(async (slide: any) => ({
            ...slide,
            imageUrl: await generateImage(slide.visualPrompt, slide.title)
          })));
        } else if (mod.type === ModuleType.SIMULATION) {
          mod.content.imageUrl = await generateImage(mod.content.visualPrompt, "lab background");
        } else if (mod.type === ModuleType.LESSON_SUMMARY) {
          mod.content.imageUrl = await generateImage(mod.content.visualPrompt, "infographic");
        }
        return mod;
      }));

      const finalContract: LessonContract = {
        lesson_id: theoryData.lesson_id || `L-${Date.now()}`,
        title: theoryData.title || topic,
        grade: grade,
        description: theoryData.description || `Comprehensive lesson on ${topic}`,
        subject: subject,
        bannerImageUrl: await generateImage(topic, "cinematic background"),
        modules: [
          ...modulesWithVisuals,
          { id: 'm6', type: ModuleType.EXAM_MODE, title: 'Final Assessment', content: { durationMinutes: 15, questions: [] } }
        ]
      };

      updateStatus('visuals', 'completed');

      // Delay slightly for UX
      setTimeout(() => onLessonCreated(finalContract), 1000);

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Synthesis failed. This usually happens due to bandwidth or complex LaTeX strings. Please re-run.");
      statuses.forEach(s => {
        if (s.status === 'loading') updateStatus(s.id, 'error');
      });
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 font-instrument selection:bg-primary-500 selection:text-white">

      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[650px]">
        {/* Left Side: Illustration / Branding */}
        <div className="hidden md:flex md:w-5/12 bg-primary-600 relative overflow-hidden flex-col justify-between p-10">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-48 h-48 border-4 border-white/30 rounded-full animate-pulse"></div>
            <div className="absolute top-1/2 right-0 w-80 h-80 border-8 border-white/10 rounded-full"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/20 blur-3xl rounded-full"></div>
          </div>

          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
              <Sparkles className="text-white" size={28} />
            </div>
            <h2 className="text-4xl font-black text-white leading-tight mb-4 tracking-tighter font-outfit uppercase italic">Cognitive<br /><span className="text-primary-200">Architect</span></h2>
            <p className="text-primary-100/80 text-sm font-medium leading-relaxed max-w-xs">
              Deconstructing complex curricula into high-fidelity, interactive board-standard modules.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            {statuses.map((s) => (
              <div key={s.id} className="flex items-center gap-4 group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${s.status === 'completed' ? 'bg-emerald-500 text-white' :
                    s.status === 'loading' ? 'bg-white text-primary-600 animate-pulse' :
                      s.status === 'error' ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/50'
                  }`}>
                  {s.status === 'completed' ? <CheckCircle2 size={16} /> : <s.icon size={16} />}
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${s.status === 'completed' ? 'text-white' :
                    s.status === 'loading' ? 'text-white' : 'text-white/40'
                  }`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-8 md:p-12 flex flex-col relative bg-slate-900">
          <button
            onClick={onClose}
            className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2 bg-slate-800 rounded-full"
          >
            <X size={18} />
          </button>

          <div className="flex-1 overflow-y-auto pr-2 scroller-hide">
            <div className="flex items-center gap-3 mb-8">
              <span className="bg-primary-500/10 text-primary-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-primary-500/20">Studio v2.5</span>
              <div className="h-px w-8 bg-slate-800"></div>
              <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest font-outfit">CBSE Standard Intelligence</span>
            </div>

            <h3 className="text-2xl font-black text-white mb-8 tracking-tight font-outfit uppercase">Synthesize <span className="text-primary-500">New Lesson</span></h3>

            <div className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1 group-focus-within:text-primary-500 transition-colors">Target Concept / Topic</label>
                <div className="relative">
                  <BrainCircuit className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary-500 transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="e.g. Semi-conductors & P-N Junction"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-slate-700 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Discipline</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as Subject)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold cursor-pointer transition-all"
                  >
                    <option>Physics</option>
                    <option>Math</option>
                    <option>Chemistry</option>
                    <option>Biology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Grade Level</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as Grade)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold cursor-pointer transition-all"
                  >
                    <option>Class 10</option>
                    <option>Class 12</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Pedagogical Depth</label>
                <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                  {['Brief', 'Standard', 'Deep Dive'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDepth(d as any)}
                      className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all uppercase tracking-tighter ${depth === d ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-8 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold leading-relaxed flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <Target size={18} className="shrink-0 text-rose-500" />
                {error}
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-800">
            <button
              onClick={generateLesson}
              disabled={isGenerating}
              className={`w-full py-5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 relative overflow-hidden uppercase tracking-[0.2em] shadow-2xl ${isGenerating ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-950 hover:bg-primary-500 hover:text-white hover:scale-[1.02] active:scale-95'}`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} fill="currentColor" />
                  <span>Launch AI Synthesis</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <p className="text-[9px] text-slate-600 text-center mt-4 font-bold uppercase tracking-widest">Powered by Google Gemini 2.0 Flash</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LessonCreator;