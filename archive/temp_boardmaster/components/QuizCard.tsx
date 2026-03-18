
import React, { useState } from 'react';
import { Question } from '../types';
import MathRenderer from './MathRenderer';
import { getSolutionBreakdown } from '../utils/aiParser';
import { 
  Check, 
  Lightbulb, 
  Brain, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Maximize2,
  Zap,
  ShieldAlert,
  Circle
} from 'lucide-react';

interface QuizCardProps {
  question: Question;
  selectedOptionId?: string;
  onSelectOption: (optionId: string) => void;
  isSubmitted: boolean;
  onShowNotes?: (question: Question) => void;
  autoExpandSolution?: boolean;
}

const QuizCard: React.FC<QuizCardProps> = ({ 
  question, 
  selectedOptionId, 
  onSelectOption, 
  isSubmitted, 
  onShowNotes,
  autoExpandSolution = false 
}) => {
  const [showSolution, setShowSolution] = useState(autoExpandSolution);
  const [loadingSolution, setLoadingSolution] = useState(false);
  const [solutionData, setSolutionData] = useState<{ steps: {text: string, pitfall?: string, reminder?: string}[], finalTip: string } | null>(question.solutionData || null);
  const [zoomImage, setZoomImage] = useState(false);

  const handleToggleSolution = async () => {
    if (!solutionData) {
      setLoadingSolution(true);
      try {
        const data = await getSolutionBreakdown(question);
        setSolutionData(data);
      } finally {
        setLoadingSolution(false);
      }
    }
    setShowSolution(!showSolution);
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_40px_80px_rgba(0,0,0,0.03)] p-8 md:p-12 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      
      {/* Mentor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
            <Zap className="w-7 h-7 text-indigo-400 fill-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">
              {question.metadata?.topic || 'SYSTEM CORE'}
            </p>
            <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tighter">Diagnostic View</h4>
          </div>
        </div>
        <button 
          onClick={() => onShowNotes?.(question)}
          className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all border border-indigo-100"
        >
          <Lightbulb className="w-6 h-6" />
        </button>
      </div>

      {/* Main Question Focus */}
      <div className="space-y-8">
        <div className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight tracking-tight">
          <MathRenderer text={question.text} />
        </div>

        {question.imageUrl && (
          <div className="group relative rounded-[2rem] border border-slate-100 overflow-hidden bg-slate-50 p-4 w-fit max-w-full hover:border-indigo-300 transition-all cursor-zoom-in">
            <img src={question.imageUrl} className="max-h-72 w-auto rounded-xl bg-white" alt="Diagram" />
            <div className="absolute top-8 right-8 p-2.5 bg-slate-950 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all">
               <Maximize2 className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>

      {/* Answer Blocks (Checkbox Style) */}
      <div className="grid grid-cols-1 gap-4">
        {question.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrect = option.isCorrect;
          const showResult = isSubmitted;

          let blockClass = "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50";
          if (isSelected) {
            blockClass = showResult 
              ? (isCorrect ? "bg-emerald-50 border-emerald-500 text-emerald-900" : "bg-rose-50 border-rose-500 text-rose-900")
              : "bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-[1.01]";
          } else if (showResult && isCorrect) {
            blockClass = "bg-emerald-50 border-emerald-300 text-emerald-800 border-dashed animate-pulse";
          }

          return (
            <button
              key={option.id}
              disabled={isSubmitted}
              onClick={() => onSelectOption(option.id)}
              className={`group w-full flex items-center gap-6 p-6 rounded-[2rem] border-2 transition-all duration-300 text-left ${blockClass}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all border ${
                isSelected ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:border-slate-300'
              }`}>
                {isSelected ? <Check className="w-5 h-5" strokeWidth={3} /> : <Circle className="w-4 h-4 opacity-20" />}
              </div>
              <div className="text-lg font-bold flex-1 tracking-tight leading-snug">
                <MathRenderer text={option.text} />
              </div>
              {showResult && isCorrect && isSelected && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
            </button>
          );
        })}
      </div>

      {/* Logic Hub Button */}
      {isSubmitted && (
        <div className="pt-8 border-t border-slate-50 space-y-6">
          <button 
            onClick={handleToggleSolution}
            className={`w-full flex items-center justify-between p-6 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] transition-all active:scale-95 ${
              showSolution ? 'bg-slate-950 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-4">
              <Brain className="w-5 h-5" />
              {showSolution ? 'Close Strategy Hub' : 'Synthesize Mentor Logic'}
            </div>
            {showSolution ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showSolution && (
            <div className="bg-slate-50 rounded-[2.5rem] p-10 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
               {loadingSolution ? (
                 <div className="flex flex-col items-center py-10 gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Forging Assets...</p>
                 </div>
               ) : solutionData ? (
                 <>
                   <div className="space-y-12 border-l border-indigo-200 pl-8">
                     {solutionData.steps.map((step, i) => (
                       <div key={i} className="space-y-4">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Logic Node {i+1}</p>
                          <div className="text-lg text-slate-800 font-medium leading-relaxed">
                            <MathRenderer text={step.text} />
                          </div>
                          
                          {step.pitfall && (
                            <div className="flex gap-4 p-5 bg-rose-50 border border-rose-100 rounded-3xl text-rose-900 animate-in slide-in-from-left-4 duration-500">
                              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                              <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Common Pitfall</p>
                                <p className="text-[13px] font-bold leading-relaxed">{step.pitfall}</p>
                              </div>
                            </div>
                          )}

                          {step.reminder && (
                            <div className="flex gap-4 p-5 bg-amber-50 border border-amber-100 rounded-3xl text-amber-900 animate-in slide-in-from-left-4 duration-700">
                              <Zap className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                              <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Mentor Reminder</p>
                                <p className="text-[13px] font-bold leading-relaxed">{step.reminder}</p>
                              </div>
                            </div>
                          )}
                       </div>
                     ))}
                   </div>
                   <div className="p-8 bg-slate-950 rounded-[2rem] text-white space-y-3 border border-white/5 shadow-2xl">
                     <div className="flex items-center gap-3 text-amber-400">
                        <ShieldAlert className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-[0.4em]">MENTOR SECRET</span>
                     </div>
                     <p className="text-lg font-bold italic leading-relaxed text-slate-200">
                       "{solutionData.finalTip}"
                     </p>
                   </div>
                 </>
               ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizCard;
