
import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  step: string;
  progress: number;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, step, progress }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      
      <div className="w-full max-w-md relative">
        {/* Animated Icon */}
        <div className="flex justify-center mb-8">
           <div className="relative">
             <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse" />
             <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-indigo-50 relative z-10">
               <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
             </div>
             <div className="absolute -top-2 -right-2 bg-indigo-600 p-1.5 rounded-full z-20 animate-bounce">
                <Sparkles className="w-3 h-3 text-white" />
             </div>
           </div>
        </div>

        {/* Text Status */}
        <div className="text-center mb-8 space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Processing Intelligence</h2>
          <p className="font-mono text-sm text-indigo-600 font-medium">{step}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out relative"
            style={{ width: `${progress}%` }}
          >
             <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30" />
          </div>
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           <span>Initiated</span>
           <span>{progress}%</span>
        </div>

      </div>
    </div>
  );
};

export default LoadingOverlay;
