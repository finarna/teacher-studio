
import React from 'react';
import { SubjectType, ExamType, TopicMastery } from '../types';
import { 
  Zap, 
  Play, 
  ChevronRight, 
  BrainCircuit,
  Trophy,
  Activity,
  Library,
  History,
  Award
} from 'lucide-react';

interface SubjectHubProps {
  exam: ExamType | null;
  subject: SubjectType | null;
  onStartSimulation: () => void;
  onStartMockTest: () => void;
  onViewArchives: () => void;
  onViewAnalytics: () => void;
  topicMastery: TopicMastery[];
}

const SubjectHub: React.FC<SubjectHubProps> = ({ 
  exam, 
  subject, 
  onStartSimulation, 
  onStartMockTest,
  onViewArchives, 
  onViewAnalytics, 
  topicMastery 
}) => {
  const averageMastery = topicMastery.length > 0 
    ? topicMastery.reduce((acc, curr) => acc + curr.masteryScore, 0) / topicMastery.length 
    : 0;

  return (
    <div className="px-8 py-10 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 bg-white">
      
      {/* PERFORMANCE FOCUS - The Pro Dashboard */}
      <div className="bg-slate-950 rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[150px] rounded-full -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em]">ACTIVE ANALYSIS UNIT</p>
            </div>
            <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">{subject}</h2>
            <div className="flex gap-4">
               <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">PRO TIER</div>
               <div className="px-4 py-2 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20">LIVE TRACK</div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">BOARD PROFICIENCY</p>
            <div className="flex items-baseline gap-4">
              <span className="text-8xl font-black text-white leading-none tracking-tighter">{averageMastery.toFixed(0)}</span>
              <span className="text-4xl font-black text-indigo-500 uppercase tracking-widest">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* TACTILE ACTION MATRIX */}
      <div className="grid grid-cols-2 gap-8">
        <button 
          onClick={onStartSimulation}
          className="group relative h-64 bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-100 active:scale-95 transition-all overflow-hidden flex flex-col justify-between text-left"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:scale-125 transition-transform duration-700" />
          <div className="w-16 h-16 bg-white/20 rounded-[1.75rem] flex items-center justify-center border border-white/20 shadow-xl backdrop-blur-sm group-hover:bg-white group-hover:text-indigo-600 transition-all">
            <Play className="w-8 h-8 fill-current" />
          </div>
          <div>
            <h3 className="text-3xl font-black uppercase leading-none mb-1 tracking-tighter">Practice</h3>
            <p className="text-[11px] font-bold text-indigo-100 uppercase tracking-widest">AI LOGIC HUB</p>
          </div>
        </button>

        <button 
          onClick={onStartMockTest}
          className="group relative h-64 bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-200 active:scale-95 transition-all overflow-hidden flex flex-col justify-between text-left"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:scale-125 transition-transform duration-700" />
          <div className="w-16 h-16 bg-white/5 rounded-[1.75rem] flex items-center justify-center border border-white/10 shadow-xl backdrop-blur-sm group-hover:bg-rose-600 group-hover:border-rose-500 transition-all">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-3xl font-black uppercase leading-none mb-1 tracking-tighter">Mock Test</h3>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">TIMED SIMULATION</p>
          </div>
        </button>
      </div>

      {/* SECONDARY REGISTRY OPTIONS */}
      <div className="grid grid-cols-2 gap-6">
        <button 
          onClick={onViewArchives}
          className="group flex items-center gap-6 bg-white border border-slate-100 rounded-[2.5rem] p-8 text-slate-900 shadow-sm active:scale-95 transition-all hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-50"
        >
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Library className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="text-[14px] font-black uppercase tracking-tight text-slate-900 leading-none">Solved <br/> Archive</span>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Audit Log</p>
          </div>
        </button>

        <button 
          onClick={onViewAnalytics}
          className="group flex items-center gap-6 bg-white border border-slate-100 rounded-[2.5rem] p-8 text-slate-900 shadow-sm active:scale-95 transition-all hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-50"
        >
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <History className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="text-[14px] font-black uppercase tracking-tight text-slate-900 leading-none">Session <br/> Stats</span>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Deep Audit</p>
          </div>
        </button>
      </div>

      {/* UNIT BREAKDOWN */}
      <div className="space-y-8 pt-8">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em]">Neural Mastery Inventory</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">{topicMastery.length} TOPICS</span>
        </div>
        
        {topicMastery.length > 0 ? (
          <div className="space-y-6 pb-24">
            {topicMastery.map((topic, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center gap-8 transition-all active:bg-slate-50 hover:shadow-lg hover:border-indigo-50">
                <div className="w-16 h-16 bg-slate-950 text-white rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-2xl">
                  <span className="text-xs font-black">0{i+1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[18px] font-black text-slate-900 uppercase truncate leading-none mb-4 tracking-tighter">{topic.topic}</h4>
                  <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                    <div className={`h-full rounded-full transition-all duration-1000 ${topic.masteryScore >= 80 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.5)]'}`} style={{ width: `${topic.masteryScore}%` }} />
                  </div>
                </div>
                <div className="text-right pl-4">
                  <span className="text-3xl font-black text-slate-950 tracking-tighter">{topic.masteryScore.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-slate-50/50 rounded-[3rem] border-4 border-dashed border-slate-100 opacity-20">
            <Activity className="w-16 h-16 text-slate-200 mx-auto mb-6" />
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Inventory Sync Active...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectHub;