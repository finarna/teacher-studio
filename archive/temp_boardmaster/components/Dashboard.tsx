
import React from 'react';
import { ExamType, SubjectType, MockTestSession } from '../types';
import { 
  Cpu, 
  Stethoscope,
  ChevronRight, 
  Atom, 
  Dna, 
  Binary, 
  FlaskConical,
  ArrowLeft,
  Star,
  Activity
} from 'lucide-react';

interface DashboardProps {
  onSelectExam: (exam: ExamType) => void;
  onSelectSubject: (subject: SubjectType) => void;
  selectedExam: ExamType | null;
  onBack: () => void;
  mockHistory: MockTestSession[];
}

const EXAMS = [
  { 
    id: 'KCET_ENTRANCE' as ExamType, 
    title: 'KCET HUB', 
    desc: 'STATE ENTRANCE TRACK', 
    icon: Cpu, 
    color: 'indigo', 
    theme: 'bg-indigo-600',
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology'] as SubjectType[]
  },
  { 
    id: 'NEET_ENTRANCE' as ExamType, 
    title: 'NEET HUB', 
    desc: 'MEDICAL EXCELLENCE', 
    icon: Stethoscope, 
    color: 'emerald', 
    theme: 'bg-emerald-600',
    subjects: ['Biology', 'Physics', 'Chemistry'] as SubjectType[]
  },
];

const SUBJECT_CONFIG: Record<string, { icon: any, color: string, code: string }> = {
  'Mathematics': { icon: Binary, color: 'slate', code: '01' },
  'Physics': { icon: Atom, color: 'slate', code: '02' },
  'Chemistry': { icon: FlaskConical, color: 'slate', code: '03' },
  'Biology': { icon: Dna, color: 'slate', code: '04' },
};

const Dashboard: React.FC<DashboardProps> = ({ onSelectExam, onSelectSubject, selectedExam, onBack, mockHistory }) => {
  const currentExam = EXAMS.find(e => e.id === selectedExam);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 space-y-16">
      {!selectedExam ? (
        <div className="space-y-12">
          <div className="space-y-4">
             <h2 className="text-5xl font-black text-slate-950 uppercase tracking-tighter leading-none">
               SELECT <span className="text-indigo-600">HUB</span>
             </h2>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em]">COMPETITIVE PREP CYCLES</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {EXAMS.map((exam) => (
              <button
                key={exam.id}
                onClick={() => onSelectExam(exam.id)}
                className="w-full group bg-white border border-slate-100 rounded-[3rem] p-10 flex items-center justify-between hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-50 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-8">
                  <div className={`w-20 h-20 rounded-[1.75rem] flex items-center justify-center text-white ${exam.theme} shadow-2xl shadow-indigo-100`}>
                    <exam.icon className="w-10 h-10" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-1">{exam.title}</h3>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{exam.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-8 h-8 text-slate-200 group-hover:text-indigo-600 transition-all group-hover:translate-x-4" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 hover:bg-white hover:border-indigo-200 transition-all active:scale-95 shadow-sm">
              <ArrowLeft className="w-5 h-5" /> CHANGE HUB
            </button>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">ACTIVE CLUSTER</p>
              <p className="text-[14px] font-black text-slate-900 uppercase">{currentExam?.id.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-5xl font-black text-slate-950 uppercase tracking-tighter leading-none">
              DOMAIN <span className="text-indigo-600">INTEL</span>
            </h2>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em]">INITIATE SUBJECT TRAINING</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {currentExam?.subjects.map((subject) => {
              const config = SUBJECT_CONFIG[subject] || { icon: Activity, color: 'slate', code: '00' };
              const Icon = config.icon;
              return (
                <button
                  key={subject}
                  onClick={() => onSelectSubject(subject as SubjectType)}
                  className="group bg-white border border-slate-100 rounded-[2.5rem] p-8 flex items-center gap-8 hover:border-indigo-600 transition-all active:scale-[0.98] shadow-sm hover:shadow-2xl hover:shadow-indigo-50/30"
                >
                  <div className="w-16 h-16 rounded-[1.25rem] bg-slate-950 text-white flex items-center justify-center shrink-0 shadow-xl shadow-slate-200 group-hover:bg-indigo-600 transition-colors">
                     <Icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter mb-1 leading-none">{subject}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CURRICULUM TRACK {config.code}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-100 group-hover:text-indigo-600 transition-all ml-auto" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FOOTER STRATEGY BOX */}
      <div className="bg-slate-950 rounded-[3rem] p-10 text-white flex items-center gap-10 relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[150px] rounded-full" />
         <div className="w-20 h-20 bg-white/5 rounded-[1.75rem] flex items-center justify-center backdrop-blur shrink-0 border border-white/10">
            <Star className="w-10 h-10 text-amber-400 fill-amber-400" />
         </div>
         <div>
            <h4 className="text-2xl font-black uppercase tracking-tighter mb-1">UNIFIED HUB</h4>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">BOARD GAPS DETECTED & CORRECTED IN REAL-TIME BY AI CORE.</p>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
