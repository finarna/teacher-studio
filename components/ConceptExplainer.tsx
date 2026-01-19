import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, BookOpen, CheckCircle2, Sparkles, Lightbulb } from 'lucide-react';
import { ConceptSlide } from '../types';
import { RenderWithMath } from './MathRenderer';

interface ConceptExplainerProps {
  content: { slides: ConceptSlide[] };
  onNext: () => void;
}

const ConceptExplainer: React.FC<ConceptExplainerProps> = ({ content, onNext }) => {
  const [idx, setIdx] = useState(0);

  if (!content || !content.slides || content.slides.length === 0) {
    return <div className="p-10 text-center">No concept content available.</div>;
  }

  const slide = content.slides[idx];
  const isLast = idx === content.slides.length - 1;

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col font-instrument selection:bg-primary-500 selection:text-white">
      <div className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="text-primary-600" size={18} />
          <span className="font-bold text-gray-800 text-sm">Learning Journey</span>
        </div>
        <div className="text-xs font-bold text-slate-400">Step {idx + 1} of {content.slides.length}</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start min-h-full">
          <div className="flex flex-col gap-6">
            <div>
              <span className="text-[9px] font-bold tracking-widest text-primary-600 uppercase bg-primary-50 px-2 py-1 rounded mb-3 inline-block">Theory</span>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 leading-tight font-outfit">{slide.title}</h2>
              <div className="text-base text-gray-700 leading-relaxed mb-6">
                <RenderWithMath text={slide.content} />
              </div>

              {slide.highlight && (
                <div className="border-l-4 border-primary-500 pl-4 py-2.5 italic text-slate-600 bg-primary-50/50 rounded-r-xl mb-6 font-medium text-base">
                  <RenderWithMath text={slide.highlight} />
                </div>
              )}
            </div>

            {slide.example && (
              <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 shadow-sm">
                <h3 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Lightbulb size={14} /> Real World Example
                </h3>
                <div className="text-amber-900/80 leading-relaxed text-sm font-medium">
                  <RenderWithMath text={slide.example} />
                </div>
              </div>
            )}

            {slide.bulletPoints && slide.bulletPoints.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Key Points</h3>
                {slide.bulletPoints.map((pt, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-gray-700 font-medium text-sm leading-relaxed w-full">
                      <RenderWithMath text={pt} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 sticky top-6">
            <div className="aspect-[4/3] w-full bg-slate-50 rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative group p-4">
              {slide.imageUrl ? (
                <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 p-12 text-center">
                  <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center text-primary-200 mb-4 animate-pulse">
                    <Sparkles size={48} />
                  </div>
                  <p className="text-sm font-medium text-slate-400">Visualizing Concept...</p>
                  <p className="text-xs text-slate-300 mt-2">Generating detailed diagrams</p>
                </div>
              )}
            </div>
            <div className="text-center text-xs text-slate-400 font-medium">
              Visualization: {slide.title}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 border-t border-gray-100 flex justify-between items-center px-8 md:px-12 shrink-0">
        <button
          onClick={() => setIdx(idx - 1)} disabled={idx === 0}
          className="flex items-center gap-2 text-slate-400 font-bold hover:text-primary-600 disabled:opacity-20 text-sm"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <button
          onClick={() => isLast ? onNext() : setIdx(idx + 1)}
          className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm"
        >
          {isLast ? "Begin Activity" : "Continue"} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default ConceptExplainer;