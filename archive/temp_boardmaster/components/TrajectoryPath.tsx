
import React from 'react';
import { ExamType, SubjectType } from '../types';
import { 
  Stethoscope, 
  Cpu,
  Binary,
  Atom,
  FlaskConical,
  Dna,
  BookOpen,
  History,
  BarChart2,
  Activity,
  Zap,
  Layers
} from 'lucide-react';

interface TrajectoryPathProps {
  currentView: string;
  selectedExam: ExamType | null;
  selectedSubject: SubjectType | null;
}

const TrajectoryPath: React.FC<TrajectoryPathProps> = ({ currentView, selectedExam, selectedSubject }) => {
  const examActive = !!selectedExam;
  const subjectActive = !!selectedSubject;
  
  let modeLabel = "MODE";
  let ModeIcon = Activity;
  if (currentView === 'quiz') { modeLabel = "PRACTICE"; ModeIcon = Zap; }
  else if (currentView === 'mock-test-active') { modeLabel = "MOCK"; ModeIcon = Activity; }
  else if (currentView === 'archives') { modeLabel = "ARCHIVE"; ModeIcon = History; }
  else if (currentView === 'analytics') { modeLabel = "STATS"; ModeIcon = BarChart2; }
  else if (currentView === 'hub') { modeLabel = "STRATEGY"; ModeIcon = BookOpen; }

  const examIcon = selectedExam === 'NEET_ENTRANCE' ? Stethoscope : Cpu;
  const subjectIcons: Record<string, any> = {
    'Mathematics': Binary, 'Physics': Atom, 'Chemistry': FlaskConical, 'Biology': Dna
  };
  const SubIcon = selectedSubject ? subjectIcons[selectedSubject] : Layers;

  const steps = [
    { 
      id: 'exam', 
      label: selectedExam ? (selectedExam === 'KCET_ENTRANCE' ? 'KCET' : 'NEET') : 'GOAL', 
      icon: examIcon,
      active: currentView === 'selection',
      done: examActive && currentView !== 'selection'
    },
    { 
      id: 'subject', 
      label: (selectedSubject || 'DOMAIN').slice(0, 8), 
      icon: SubIcon,
      active: currentView === 'hub',
      done: subjectActive && !['selection', 'hub'].includes(currentView)
    },
    { 
      id: 'mode', 
      label: modeLabel, 
      icon: ModeIcon,
      active: !['selection', 'hub'].includes(currentView),
      done: false 
    }
  ];

  return (
    <div className="w-full px-8 py-4 bg-white shrink-0 border-b border-slate-50">
      <div className="max-w-md mx-auto relative flex items-center justify-between">
        {/* The Precision Trace */}
        <div className="absolute top-[18px] left-[10%] right-[10%] h-[1px] bg-slate-100 z-0" />
        <div 
          className="absolute top-[18px] left-[10%] h-[1px] bg-indigo-600 z-0 transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1)" 
          style={{ width: steps[1].done ? '80%' : steps[0].done ? '40%' : '0%' }}
        />

        {steps.map((step) => {
          const Icon = step.icon;
          const isIndigo = selectedExam === 'KCET_ENTRANCE' || !selectedExam;
          const themeColor = isIndigo ? 'indigo' : 'emerald';

          return (
            <div key={step.id} className="flex flex-col items-center gap-2.5 relative z-10 w-16">
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500
                ${step.active 
                  ? `bg-slate-950 text-white shadow-xl scale-110` 
                  : step.done
                  ? `bg-white text-indigo-600 border border-indigo-100 shadow-sm`
                  : 'bg-white text-slate-200 border border-slate-50'
                }
              `}>
                <Icon className={`w-4 h-4 ${step.active ? 'animate-pulse' : ''}`} />
              </div>
              <span className={`text-[8px] font-black uppercase tracking-[0.4em] text-center w-full truncate ${step.active ? `text-indigo-600` : 'text-slate-300'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrajectoryPath;