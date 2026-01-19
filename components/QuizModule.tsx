import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { useAdaptiveLogic } from '../hooks/useAdaptiveLogic';
import RemediationModal from './RemediationModal';
import { CheckCircle2, XCircle, HelpCircle, ChevronRight, Sparkles } from 'lucide-react';
import { RenderWithMath } from './MathRenderer';

interface QuizModuleProps {
  questions: QuizQuestion[];
  onComplete: (score: number, failedIds: string[]) => void;
}

const QuizModule: React.FC<QuizModuleProps> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { showRemediation, processAnswer, clearRemediation } = useAdaptiveLogic();
  const [misconceptions, setMisconceptions] = useState<string[]>([]);

  const currentQ = questions[currentIndex];

  const handleSubmit = () => {
    if (selectedOption === null) return;

    const isCorrect = selectedOption === currentQ.correctIndex;
    const newAnswers = { ...answers, [currentQ.id]: isCorrect };
    setAnswers(newAnswers);
    setIsSubmitted(true);
    processAnswer(isCorrect);

    if (!isCorrect && currentQ.misconceptionId) {
      setMisconceptions([...misconceptions, currentQ.misconceptionId]);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
      clearRemediation();
    } else {
      const correctCount = Object.values(answers).filter(Boolean).length;
      const score = Math.round((correctCount / questions.length) * 100);
      onComplete(score, misconceptions);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 animate-in fade-in duration-700 font-instrument selection:bg-primary-500 selection:text-white">
      <div className="mb-10 flex justify-between items-end border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-1.5 text-primary-600 font-bold text-[10px] uppercase tracking-wider mb-1.5">
            <Sparkles size={12} /> Knowledge Retrieval
          </div>
          <h2 className="text-2xl font-black text-slate-900 font-outfit tracking-tight leading-none uppercase">Assessment <span className="text-primary-600">Check</span></h2>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Progress</div>
          <span className="text-xl font-bold text-slate-900 font-outfit">{currentIndex + 1}<span className="text-slate-200 mx-1">/</span>{questions.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:rotate-12 transition-transform duration-700">
          <HelpCircle size={100} />
        </div>

        <div className="text-xl font-bold text-slate-800 mb-8 leading-relaxed border-l-4 border-primary-500 pl-5 py-0.5 font-outfit">
          <RenderWithMath text={currentQ.question} showOptions={false} />
        </div>

        <div className="grid gap-3">
          {currentQ.options.map((opt, idx) => {
            let itemClass = "w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden flex items-center justify-between ";

            if (isSubmitted) {
              if (idx === currentQ.correctIndex) itemClass += "border-emerald-500 bg-emerald-50 text-emerald-900";
              else if (idx === selectedOption) itemClass += "border-rose-500 bg-rose-50 text-rose-900";
              else itemClass += "border-slate-50 text-slate-300 opacity-50";
            } else {
              itemClass += selectedOption === idx
                ? "border-primary-600 bg-primary-50 text-primary-900 ring-4 ring-primary-50"
                : "border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-medium";
            }

            return (
              <button
                key={idx}
                onClick={() => !isSubmitted && setSelectedOption(idx)}
                className={itemClass}
                disabled={isSubmitted}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border shrink-0 ${selectedOption === idx && !isSubmitted ? 'bg-primary-600 border-primary-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className="text-base font-medium flex-1">
                    <RenderWithMath text={opt} showOptions={false} />
                  </div>
                </div>
                {isSubmitted && idx === currentQ.correctIndex && <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />}
                {isSubmitted && idx === selectedOption && idx !== currentQ.correctIndex && <XCircle size={22} className="text-rose-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={selectedOption === null}
            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-30 hover:bg-slate-800 transition-all shadow-md active:scale-95 text-xs uppercase tracking-widest"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-md flex items-center gap-2 text-xs uppercase tracking-widest"
          >
            {currentIndex === questions.length - 1 ? "Complete Verification" : "Next Question"}
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {showRemediation && (
        <RemediationModal
          isOpen={showRemediation}
          onClose={clearRemediation}
          hint={currentQ.hint}
        />
      )}
    </div>
  );
};

export default QuizModule;