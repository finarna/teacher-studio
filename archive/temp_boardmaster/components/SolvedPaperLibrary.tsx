
import React, { useState, useMemo, useEffect } from 'react';
import { Question, SubjectType } from '../types';
import MathRenderer from './MathRenderer';
import { 
  History, 
  Search,
  CheckCircle2,
  Brain,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SolvedPaperLibraryProps {
  subject: SubjectType | null;
  questions: Question[];
}

const SolvedPaperLibrary: React.FC<SolvedPaperLibraryProps> = ({ subject, questions }) => {
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [currentIndex, setCurrentIndex] = useState(0);

  const filtered = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = q.text?.toLowerCase().includes(search.toLowerCase()) || 
                           q.metadata?.topic?.toLowerCase().includes(search.toLowerCase());
      const matchesYear = selectedYear === 'All' || q.metadata?.year === selectedYear;
      return matchesSearch && matchesYear;
    });
  }, [questions, search, selectedYear]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    questions.forEach(q => { if (q.metadata?.year) years.add(q.metadata.year); });
    return ['All', ...Array.from(years).sort((a, b) => b.localeCompare(a))];
  }, [questions]);

  useEffect(() => { setCurrentIndex(0); }, [search, selectedYear]);

  const currentQuestion = filtered[currentIndex];

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="px-8 py-10 space-y-10 shrink-0 border-b border-slate-50/50">
        <div className="space-y-3">
          <h2 className="text-5xl font-black text-slate-950 uppercase tracking-tighter leading-none">
            SOLVED <span className="text-indigo-600">ARCHIVE</span>
          </h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em]">CONTENT AUDIT SYSTEM</p>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-200" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search concepts or year..."
              className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-6 pl-14 pr-8 text-[15px] font-bold focus:ring-8 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-300"
            />
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shrink-0 border ${
                  selectedYear === year 
                    ? 'bg-slate-950 border-slate-950 text-white shadow-2xl' 
                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-12 pb-60 bg-white">
        {filtered.length > 0 && currentQuestion ? (
          <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="bg-white rounded-[3.5rem] border border-slate-100 p-10 md:p-14 shadow-[0_40px_80px_rgba(0,0,0,0.02)] space-y-12">
              <div className="flex items-center gap-4">
                 <div className="px-4 py-2 bg-indigo-50 rounded-xl text-[10px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100">
                   {currentQuestion.metadata?.topic || 'CORE LOGIC'}
                 </div>
                 <div className="px-4 py-2 bg-slate-950 rounded-xl text-[10px] font-black text-white uppercase tracking-widest">
                   YEAR {currentQuestion.metadata?.year || '2024'}
                 </div>
              </div>

              <div className="text-3xl font-bold text-slate-900 leading-tight tracking-tight">
                <MathRenderer text={currentQuestion.text} />
              </div>

              {currentQuestion.imageUrl && (
                <div className="rounded-[2.5rem] border border-slate-50 bg-slate-50 p-6 shadow-inner overflow-hidden">
                  <img src={currentQuestion.imageUrl} className="max-h-80 w-auto mx-auto object-contain rounded-2xl" alt="Diagram" />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map(opt => (
                  <div key={opt.id} className={`flex items-center gap-6 p-6 rounded-[2rem] border-2 transition-all ${
                      opt.isCorrect ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-50 opacity-30'
                    }`}>
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base ${
                      opt.isCorrect ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {opt.id}
                    </div>
                    <div className={`text-[17px] font-bold ${opt.isCorrect ? 'text-emerald-950' : 'text-slate-600'}`}>
                      <MathRenderer text={opt.text} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 rounded-[3.5rem] p-12 md:p-16 text-white shadow-[0_50px_100px_rgba(0,0,0,0.4)] space-y-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[150px] rounded-full" />
              <div className="flex items-center gap-5 relative z-10">
                <Brain className="w-8 h-8 text-indigo-400" />
                <h3 className="text-xl font-black uppercase tracking-widest leading-none">STRATEGY AUDIT</h3>
              </div>
              <div className="space-y-10 relative z-10 border-l border-white/10 pl-10">
                {currentQuestion.solutionData?.steps.map((step, i) => (
                  <div key={i} className="space-y-4">
                    <p className="text-[17px] font-medium leading-relaxed text-slate-200">
                      <MathRenderer text={step.text} />
                    </p>
                    {step.pitfall && (
                      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-100 text-[14px] font-bold flex gap-4">
                        <ShieldAlert className="w-6 h-6 shrink-0" />
                        <span>CRITICAL TRAP: {step.pitfall}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-48 opacity-10">
            <History className="w-20 h-20 mb-6" />
            <p className="font-black uppercase tracking-[0.5em] text-[12px]">REGISTRY EMPTY</p>
          </div>
        )}
      </div>

      {/* OBSIDIAN GLASS DOCK */}
      {filtered.length > 0 && (
        <div className="fixed bottom-12 inset-x-0 z-[150] flex justify-center px-8 pointer-events-none">
          <div className="bg-slate-950 border border-white/10 p-2 rounded-full shadow-[0_40px_80px_rgba(0,0,0,0.6)] flex items-center pointer-events-auto">
            <button 
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="px-10 h-14 border-x border-white/5 flex flex-col items-center justify-center min-w-[140px]">
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-indigo-400 mb-1 leading-none">ASSET</span>
              <span className="text-lg font-black text-white tracking-tighter leading-none">
                {currentIndex + 1} <span className="text-white/20 mx-1">/</span> {filtered.length}
              </span>
            </div>
            <button 
              onClick={() => setCurrentIndex(prev => Math.min(filtered.length - 1, prev + 1))}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolvedPaperLibrary;
