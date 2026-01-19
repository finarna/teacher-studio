import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { RenderWithMath } from './MathRenderer';

interface VisualHookProps {
  title: string;
  scenario: string;
  imageUrl?: string;
  onNext: () => void;
}

const VisualHook: React.FC<VisualHookProps> = ({ title, scenario, imageUrl, onNext }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-8 relative overflow-hidden font-instrument selection:bg-primary-500 selection:text-white">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#0f4fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>

      <div className="max-w-3xl w-full z-10 flex flex-col md:flex-row gap-8 items-center bg-white p-8 shadow-xl rounded-2xl border border-slate-100">
        <div className="flex-1 order-2 md:order-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-[10px] font-bold uppercase mb-4 tracking-wider">
            <Sparkles size={12} /> Challenge Hook
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4 font-outfit uppercase tracking-tight">{title}</h1>
          <div className="text-lg text-slate-600 leading-relaxed mb-8 font-medium italic">
            <RenderWithMath text={scenario} serif={false} />
          </div>
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest"
          >
            Start Investigation <ArrowRight size={18} />
          </button>
        </div>

        <div className="w-full md:w-72 h-72 order-1 md:order-2 shrink-0 overflow-hidden rounded-xl border-4 border-white shadow-xl bg-slate-50 relative group p-2">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Sparkles size={48} className="animate-pulse" />
            </div>
          )}
          <div className="absolute inset-0 pointer-events-none rounded-xl border border-black/5"></div>
        </div>
      </div>
    </div>
  );
};

export default VisualHook;