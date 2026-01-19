import React from 'react';
import { Lightbulb, RotateCcw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { RenderWithMath } from './MathRenderer';

interface RemediationModalProps {
  isOpen: boolean;
  onClose: () => void;
  hint: string;
}

const RemediationModal: React.FC<RemediationModalProps> = ({ isOpen, onClose, hint }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md font-instrument">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-amber-50 p-5 border-b border-amber-100 flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-lg text-white shadow-lg shadow-amber-200">
            <Lightbulb size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-amber-900 font-outfit uppercase tracking-tight">Pause & Recalibrate</h3>
            <p className="text-amber-700 text-[10px] font-bold uppercase tracking-widest">Bridging the gap</p>
          </div>
        </div>

        <div className="p-6">
          <div className="text-slate-800 leading-[1.8] mb-8 text-base">
            <RenderWithMath text={hint} showOptions={false} autoSteps={true} />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 text-[11px] text-slate-500 font-medium italic">
            Expert Insight: In a right-angled triangle, if you know one side and an angle, you can always find the others using trigonometric ratios.
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
          >
            <RotateCcw size={16} /> Re-attempt Challenge
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RemediationModal;