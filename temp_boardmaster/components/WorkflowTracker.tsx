
import React from 'react';
import { 
  BookOpen,
  Route,
  Zap,
  Check
} from 'lucide-react';

export type WorkflowStep = 'selection' | 'hub' | 'quiz' | 'analytics';

interface WorkflowTrackerProps {
  currentStep: WorkflowStep;
  onStepClick?: (step: WorkflowStep) => void;
  isStepAvailable: (step: WorkflowStep) => boolean;
}

const STEPS = [
  { id: 'selection', label: 'Prep Track', icon: Route },
  { id: 'hub', label: 'Strategy Hub', icon: BookOpen },
  { id: 'quiz', label: 'Practice', icon: Zap },
] as const;

const WorkflowTracker: React.FC<WorkflowTrackerProps> = ({ currentStep, onStepClick, isStepAvailable }) => {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full px-6 py-4 overflow-x-auto scrollbar-hide">
      <div className="relative flex items-center justify-between max-w-[320px] mx-auto h-20">
        {/* Continuous Track Line (Screenshot Style) */}
        <div className="absolute top-[34px] left-[15%] right-[15%] h-[2px] bg-indigo-500/10 z-0 rounded-full" />
        <div 
          className="absolute top-[34px] left-[15%] h-[2.5px] bg-indigo-600 z-0 transition-all duration-700 ease-in-out rounded-full shadow-[0_0_8px_rgba(79,70,229,0.3)]" 
          style={{ width: `${currentIndex >= 0 ? (Math.min(currentIndex, STEPS.length - 1) / (STEPS.length - 1)) * 70 : 0}%` }}
        />
        
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentIndex;
          const isAccessible = isStepAvailable(step.id);

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <button
                disabled={!isAccessible}
                onClick={() => onStepClick?.(step.id)}
                className={`
                  w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 relative
                  ${isActive || isCompleted
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                    : 'bg-slate-50 text-slate-300 border border-slate-100 shadow-inner'
                  }
                  ${!isAccessible ? 'opacity-30 cursor-not-allowed grayscale' : 'active:scale-90'}
                `}
              >
                <Icon className={`w-6 h-6 ${isActive || isCompleted ? 'animate-in zoom-in-75' : ''}`} />
                
                {/* Completion Checkmark Badge (Exact screenshot style) */}
                {(isCompleted || (isActive && idx === 0)) && (
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg transform scale-110 animate-in zoom-in-50 duration-500">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowTracker;
