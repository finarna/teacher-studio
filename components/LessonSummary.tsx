import React, { useState } from 'react';
import { ArrowRight, BookOpen, PenTool, Lightbulb, Eye, EyeOff, Sparkles } from 'lucide-react';
import MathRenderer, { RenderWithMath } from './MathRenderer';

interface LessonSummaryProps {
  title: string;
  content: {
    formulas: { label: string; equation: string; note: string }[];
    tips: string[];
    mnemonic: string;
    imageUrl?: string;
  };
  onNext: () => void;
}

const LessonSummary: React.FC<LessonSummaryProps> = ({ title, content, onNext }) => {
  const safeTitle = title || '';
  const formulas = Array.isArray(content?.formulas) ? content.formulas : [];

  // Basic heuristic for Trig features
  const isTrig = safeTitle.toLowerCase().includes('trigonometry') ||
    formulas.some(f => (f.equation || '').includes('\\sin') || (f.equation || '').includes('\\tan'));

  const [showTableValues, setShowTableValues] = useState(true);

  return (
    <div className="w-full h-full bg-slate-50 overflow-y-auto font-instrument selection:bg-primary-500 selection:text-white">
      <div className="max-w-5xl mx-auto p-6 md:p-8 pb-20">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-slate-200 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 font-outfit uppercase tracking-tight">
              <BookOpen className="text-primary-600" size={20} />
              {safeTitle}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Your Ultimate Board Exam Cheat Sheet</p>
          </div>
          <button
            onClick={onNext}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-md transition-all active:scale-95 text-xs uppercase tracking-wider"
          >
            Ready for Quiz <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Main Visual */}
          <div className="md:col-span-7 bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden flex flex-col">
            <h2 className="text-[10px] font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <PenTool size={16} className="text-primary-500" /> Concept Map
            </h2>

            <div className="relative flex-1 min-h-[250px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
              {content.imageUrl ? (
                <img src={content.imageUrl} alt="Summary Visualization" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-200">
                    <Sparkles size={32} />
                  </div>
                  <p className="text-slate-400 text-sm">Visual Summary</p>
                </div>
              )}
            </div>

            {content.mnemonic && (
              <div className="mt-4 p-4 bg-primary-50 rounded-lg text-primary-900 text-[11px] font-bold border border-primary-100 flex flex-col md:flex-row items-center gap-3 text-center md:text-left">
                <span className="font-bold bg-white px-2.5 py-1 rounded shadow-sm shrink-0 uppercase tracking-widest border border-primary-200 text-[9px]">Mnemonic</span>
                <span className="leading-relaxed"><RenderWithMath text={content.mnemonic} showOptions={false} /></span>
              </div>
            )}
          </div>

          {/* Key Formulas */}
          <div className="md:col-span-5 flex flex-col gap-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-1">
              <h2 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">Core Relations</h2>
              <div className="space-y-3">
                {formulas.length > 0 ? (
                  formulas.map((f, i) => (
                    <div key={i} className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary-200 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{f.label || `Formula ${i + 1}`}</span>
                      </div>
                      <div className="text-base text-primary-600 break-words flex justify-center py-2">
                        <MathRenderer expression={f.equation || ''} />
                      </div>
                      {f.note && <div className="text-[9px] text-slate-400 mt-1 italic text-center font-medium">{f.note}</div>}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic text-sm">No formulas for this topic.</div>
                )}
              </div>
            </div>
          </div>

          {/* Exam Tips */}
          <div className="md:col-span-12 bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-inner">
            <h2 className="text-[10px] font-bold text-amber-800 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <Lightbulb className="fill-amber-400 text-amber-600" size={18} /> CBSE Board Exam Tips
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {content.tips && content.tips.map((tip, idx) => (
                <div key={idx} className="flex gap-3 bg-white p-3.5 rounded-lg shadow-sm border border-amber-100">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <p className="text-slate-700 text-[13px] font-medium leading-relaxed">
                    <RenderWithMath text={tip} />
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Values Table Cheat Sheet */}
          {isTrig && (
            <div className="md:col-span-12 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">The "Must Memorize" Values</h2>
                <button
                  onClick={() => setShowTableValues(!showTableValues)}
                  className="text-[10px] flex items-center gap-2 text-primary-600 font-bold uppercase tracking-widest hover:text-primary-800"
                >
                  {showTableValues ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showTableValues ? 'Hide to Test' : 'Show Values'}
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                    <tr>
                      <th className="px-6 py-4">Ratio \ Angle</th>
                      <th className="px-6 py-4"><MathRenderer expression="0^\circ" inline /></th>
                      <th className="px-6 py-4"><MathRenderer expression="30^\circ" inline /></th>
                      <th className="px-6 py-4"><MathRenderer expression="45^\circ" inline /></th>
                      <th className="px-6 py-4"><MathRenderer expression="60^\circ" inline /></th>
                      <th className="px-6 py-4"><MathRenderer expression="90^\circ" inline /></th>
                    </tr>
                  </thead>
                  <tbody className={`transition-opacity duration-300 ${showTableValues ? 'opacity-100' : 'opacity-0 select-none'}`}>
                    <tr className="bg-white border-b">
                      <td className="px-6 py-4 font-bold text-primary-600"><MathRenderer expression="\sin \theta" inline /></td>
                      <td className="px-6 py-4">0</td>
                      <td className="px-6 py-4"><MathRenderer expression="\frac{1}{2}" inline /></td>
                      <td className="px-6 py-4"><MathRenderer expression="\frac{1}{\sqrt{2}}" inline /></td>
                      <td className="px-6 py-4"><MathRenderer expression="\frac{\sqrt{3}}{2}" inline /></td>
                      <td className="px-6 py-4">1</td>
                    </tr>
                    <tr className="bg-white border-b">
                      <td className="px-6 py-4 font-bold text-primary-600"><MathRenderer expression="\cos \theta" inline /></td>
                      <td className="px-6 py-4">1</td>
                      <td className="px-6 py-4"><MathRenderer expression="\frac{\sqrt{3}}{2}" inline /></td>
                      <td className="px-6 py-4"><MathRenderer expression="\frac{1}{\sqrt{2}}" inline /></td>
                      <td className="px-6 py-4"><MathRenderer expression="\frac{1}{2}" inline /></td>
                      <td className="px-6 py-4">0</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-6 py-4 font-bold text-primary-600"><MathRenderer expression="\tan \theta" inline /></td>
                      <td className="px-6 py-4">0</td>
                      <td className="px-6 py-4"><MathRenderer expression="\frac{1}{\sqrt{3}}" inline /></td>
                      <td className="px-6 py-4 font-bold bg-amber-100 rounded text-amber-900">1</td>
                      <td className="px-6 py-4 font-bold bg-amber-100 rounded text-amber-900"><MathRenderer expression="\sqrt{3}" inline /></td>
                      <td className="px-6 py-4 text-rose-500 font-bold">Undef</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LessonSummary;