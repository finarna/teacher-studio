
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import React, { useState, useEffect } from 'react';
import { Question, SmartNotes } from '../types';
import MathRenderer from './MathRenderer';
import { 
  X, Loader2, Zap, Brain, Target, 
  Lightbulb, Anchor, CheckCircle2, 
  ArrowRight, Maximize2, PenTool
} from 'lucide-react';

interface SmartNotesModalProps {
  question: Question | null;
  onClose: () => void;
}

const SmartNotesModal: React.FC<SmartNotesModalProps> = ({ question, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SmartNotes | null>(question?.smartNotes || null);
  const [diagramUrl, setDiagramUrl] = useState<string | null>(question?.smartNotes?.diagramUrl || null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  useEffect(() => {
    if (!question) return;
    if (question.smartNotes) {
      setLoading(false);
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const generateAssets = async () => {
      setLoading(true);
      try {
        const prompt = `Generate a Visual Cheat Sheet (SmartNotes) for: ${question.text}. Include topicTitle, visualConcept, keyPoints (LaTeX), steps, mentalAnchor, quickRef.`;
        // Upgraded model to gemini-3-pro-preview for complex reasoning and STEM clarity.
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: { parts: [{ text: prompt }] },
          config: { responseMimeType: 'application/json', temperature: 0.2 }
        });
        const parsed = JSON.parse(response.text || "{}");
        setData(parsed);

        // Fallback Diagram Generation using gemini-2.5-flash-image
        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: `Technical sketch for topic: ${parsed.topicTitle || 'Science'}` }] },
        });
        const imgPart = imgResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (imgPart) setDiagramUrl(`data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`);

      } catch (e) {
        console.error("Notes generation failed", e);
      } finally {
        setLoading(false);
      }
    };

    generateAssets();
  }, [question]);

  if (!question) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-6xl min-h-[90vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden ring-8 ring-white/20">
        
        <div className="bg-slate-50 border-b-2 border-slate-900 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
           <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
                {loading ? "ANALYZING..." : data?.topicTitle || "SCIENCE"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Verified Asset</span>
                 <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Visual Cheat Sheet</span>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full border-2 border-transparent hover:border-slate-300 transition-all">
              <X className="w-6 h-6 text-slate-900" />
           </button>
        </div>

        {loading ? (
           <div className="flex-1 flex flex-col items-center justify-center p-12 gap-6">
              <Loader2 className="w-16 h-16 text-slate-900 animate-spin" />
              <p className="font-mono text-slate-500 animate-pulse uppercase tracking-widest text-xs">Forging Scientific Asset Map...</p>
           </div>
        ) : data ? (
          <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50/50">
             <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                <div className="md:col-span-7 flex flex-col gap-4">
                   <div className="relative group rounded-2xl border-2 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                      <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur border border-slate-900 px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
                         <PenTool className="w-4 h-4 text-indigo-600" />
                         <span className="text-xs font-black uppercase">Visual Schematic</span>
                      </div>
                      <div className="w-full aspect-video bg-white flex items-center justify-center p-6">
                         {diagramUrl ? (
                            <img src={diagramUrl} alt="Diagram" className="w-full h-full object-contain mix-blend-multiply" />
                         ) : (
                            <div className="text-slate-300 italic uppercase text-[10px] tracking-widest">Visual Logic Stream Active</div>
                         )}
                      </div>
                      {data.visualConcept && (
                        <div className="absolute bottom-4 right-4 max-w-[220px] bg-yellow-100 border-2 border-slate-900 p-3 rounded-xl rounded-tr-none shadow-sm -rotate-1 hidden md:block">
                            <p className="text-xs font-bold text-slate-900 leading-tight italic leading-relaxed">"{data.visualConcept}"</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="md:col-span-5 flex flex-col h-full">
                   <div className="h-full bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-100 pb-2 mb-4 flex items-center gap-2">
                         <Target className="w-4 h-4" /> Core Key Points
                      </h3>
                      <ul className="space-y-3">
                         {data.keyPoints?.map((pt, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                               <Zap className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                               <div className="font-medium leading-relaxed"><MathRenderer text={pt} /></div>
                            </li>
                         ))}
                      </ul>
                   </div>
                </div>

                <div className="md:col-span-12">
                   <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Execution Path</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                         {data.steps?.map((step, i) => (
                            <div key={i} className="relative pl-12 group">
                               <div className="absolute left-0 top-0 w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center font-black text-slate-900 bg-white group-hover:bg-yellow-300 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                  {i + 1}
                               </div>
                               <div>
                                  <h4 className="font-black text-slate-900 uppercase text-xs mb-1">{step.title}</h4>
                                  <div className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                                     <MathRenderer text={step.content} />
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="md:col-span-4">
                   <div className="h-full bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="bg-slate-100 p-3 rounded-full mb-3 border border-slate-200"><Anchor className="w-6 h-6 text-slate-700" /></div>
                      <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-2 border-2 border-slate-900 px-2 py-0.5 rounded bg-white">Mental Anchor</h3>
                      <p className="text-sm text-slate-600 font-medium italic"><MathRenderer text={data.mentalAnchor || "Trust the process!"} /></p>
                   </div>
                </div>

                <div className="md:col-span-8">
                   <div className="h-full bg-slate-900 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(79,70,229,0.5)] p-5 text-white flex flex-col justify-center">
                      <p className="text-sm md:text-base font-medium leading-relaxed text-slate-200">
                         <MathRenderer text={data.quickRef || "Success follows consistency."} />
                      </p>
                   </div>
                </div>
             </div>
          </div>
        ) : (
           <div className="p-12 text-center text-rose-500 font-bold uppercase tracking-widest">Diagnostic Failed.</div>
        )}
      </div>
    </div>
  );
};

export default SmartNotesModal;
