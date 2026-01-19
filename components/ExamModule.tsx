import React, { useState, useEffect } from 'react';
import { Timer, AlertOctagon, CheckSquare } from 'lucide-react';

interface ExamModuleProps {
  durationMinutes: number;
  questions: any[];
  onComplete: (score: number) => void;
}

const ExamModule: React.FC<ExamModuleProps> = ({ durationMinutes, questions, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelect = (qId: string, optIdx: number) => {
    setAnswers(prev => ({ ...prev, [qId]: optIdx }));
  };

  const handleSubmit = () => {
    setIsActive(false);
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctIndex) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);
    // Add small delay for UX
    setTimeout(() => onComplete(score), 1000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 h-full flex flex-col font-instrument selection:bg-primary-500 selection:text-white">
      <div className="flex items-center justify-between mb-8 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2.5 font-outfit uppercase tracking-tight">
          <CheckSquare className="text-primary-600" size={20} />
          Board Exam Mode
        </h2>
        <div className={`flex items-center gap-2 font-mono text-lg font-bold px-4 py-2 rounded-xl ${timeLeft < 60 ? 'bg-rose-50 text-rose-600 animate-pulse border border-rose-100' : 'bg-slate-50 text-slate-700 border border-slate-100'}`}>
          <Timer size={18} />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pb-20">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-primary-500/20 transition-all">
            <div className="flex gap-4">
              <span className="font-black text-slate-300 text-lg font-outfit">Q{idx + 1}</span>
              <div className="flex-1">
                <p className="text-base text-slate-800 mb-6 font-bold leading-relaxed">{q.question}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt: string, oIdx: number) => (
                    <button
                      key={oIdx}
                      onClick={() => handleSelect(q.id, oIdx)}
                      className={`p-4 text-left rounded-xl border-2 transition-all text-sm font-medium ${answers[q.id] === oIdx
                          ? 'border-primary-500 bg-primary-50 text-primary-900 shadow-md shadow-primary-500/10'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                    >
                      <span className={`inline-block w-6 font-black ${answers[q.id] === oIdx ? 'text-primary-600' : 'text-slate-300'}`}>{String.fromCharCode(65 + oIdx)}.</span>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-5 shadow-2xl z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-black tracking-widest">
            <AlertOctagon size={16} className="text-rose-500" />
            <span>Strict Board Simulation • No Assistance Permitted</span>
          </div>
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all shadow-xl active:scale-95 text-[11px] uppercase tracking-widest"
          >
            Submit Final Response
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamModule;