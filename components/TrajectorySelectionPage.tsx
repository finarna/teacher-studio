import React from 'react';
import {
  GraduationCap,
  FlaskConical,
  Atom,
  BookOpen,
  ArrowRight,
  Clock,
  Target,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import type { ExamContext } from '../types';

interface TrajectorySelectionPageProps {
  onSelectTrajectory: (trajectory: ExamContext) => void;
  userProgress?: Record<ExamContext, {
    overallMastery: number;
    subjectsCompleted: number;
    totalSubjects: number;
  }>;
}

interface TrajectoryCard {
  id: ExamContext;
  name: string;
  fullName: string;
  description: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  pattern: {
    totalQuestions: number;
    duration: number;
    subjects: string[];
  };
  highlights: string[];
}

const TRAJECTORY_CARDS: TrajectoryCard[] = [
  {
    id: 'NEET',
    name: 'NEET',
    fullName: 'National Eligibility cum Entrance Test',
    description: 'Medical and dental entrance examination',
    icon: FlaskConical,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    pattern: {
      totalQuestions: 180,
      duration: 200,
      subjects: ['Physics', 'Chemistry', 'Biology']
    },
    highlights: [
      'Medical & Dental Colleges',
      'AIIMS, JIPMER & State Quotas',
      'Biology-focused preparation'
    ]
  },
  {
    id: 'JEE',
    name: 'JEE',
    fullName: 'Joint Entrance Examination',
    description: 'Engineering entrance examination',
    icon: Atom,
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    pattern: {
      totalQuestions: 90,
      duration: 180,
      subjects: ['Physics', 'Chemistry', 'Math']
    },
    highlights: [
      'IITs, NITs & IIITs',
      'JEE Main & Advanced',
      'Math & Physics mastery'
    ]
  },
  {
    id: 'KCET',
    name: 'KCET',
    fullName: 'Karnataka Common Entrance Test',
    description: 'State-level engineering & medical entrance',
    icon: GraduationCap,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    pattern: {
      totalQuestions: 60,
      duration: 80,
      subjects: ['Physics', 'Chemistry', 'Math/Biology']
    },
    highlights: [
      'Karnataka Engineering Colleges',
      'Fast-paced test pattern',
      'State quota advantage'
    ]
  },
  {
    id: 'CBSE',
    name: 'CBSE',
    fullName: 'Central Board of Secondary Education',
    description: 'Class 10 & 12 board examinations',
    icon: BookOpen,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    pattern: {
      totalQuestions: 40,
      duration: 180,
      subjects: ['All Core Subjects']
    },
    highlights: [
      'Board Exam Excellence',
      'Foundation for entrances',
      'Comprehensive curriculum'
    ]
  }
];

const TrajectorySelectionPage: React.FC<TrajectorySelectionPageProps> = ({
  onSelectTrajectory,
  userProgress
}) => {
  return (
    <div className="bg-slate-50/50 font-instrument text-slate-900 selection:bg-primary-500 selection:text-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center text-white font-black text-[10px] tracking-widest shadow-lg transform -rotate-3">
              EDU
            </div>
            <h1 className="font-black text-xl tracking-tight text-slate-900 font-outfit">
              Choose Your <span className="text-primary-600">Learning Journey</span>
            </h1>
          </div>
          <p className="text-slate-600 text-xs font-medium">
            Select your exam trajectory to access personalized study paths, topic-wise mastery tracking, and full-length mock tests.
          </p>
        </div>
      </div>

      {/* Trajectory Cards Grid */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TRAJECTORY_CARDS.map((trajectory) => {
            const progress = userProgress?.[trajectory.id];
            const hasProgress = progress && progress.overallMastery > 0;
            const Icon = trajectory.icon;

            return (
              <button
                key={trajectory.id}
                onClick={() => onSelectTrajectory(trajectory.id)}
                className="group relative bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-300 overflow-hidden text-left shadow-sm hover:shadow-lg"
              >
                {/* Gradient Header */}
                <div className={`relative h-20 bg-gradient-to-br ${trajectory.gradient} p-4 text-white overflow-hidden`}>
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }} />
                  </div>

                  {/* Icon */}
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <Icon size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-black text-xl tracking-tight">{trajectory.name}</h3>
                        <p className="text-white/80 text-[10px] font-medium mt-0.5">{trajectory.fullName}</p>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    {hasProgress && (
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                          <TrendingUp size={14} />
                          <span className="text-xs font-black">{progress.overallMastery}%</span>
                        </div>
                        <p className="text-white/70 text-[10px] font-medium mt-1 uppercase tracking-wider">
                          In Progress
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <p className="text-slate-600 text-xs font-medium mb-3">
                    {trajectory.description}
                  </p>

                  {/* Exam Pattern Info */}
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Target size={16} className={`text-${trajectory.color}-500`} />
                      <span className="text-xs font-black">{trajectory.pattern.totalQuestions}Q</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock size={16} className={`text-${trajectory.color}-500`} />
                      <span className="text-xs font-black">{trajectory.pattern.duration}min</span>
                    </div>
                    <div className="flex-1 text-right">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        {trajectory.pattern.subjects.join(' • ')}
                      </span>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-1.5 mb-3">
                    {trajectory.highlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 size={12} className={`text-${trajectory.color}-500 flex-shrink-0`} />
                        <span className="text-[11px] font-medium text-slate-700">{highlight}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress Bar (if has progress) */}
                  {hasProgress && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Overall Progress
                        </span>
                        <span className="text-[10px] font-black text-slate-700">
                          {progress.subjectsCompleted}/{progress.totalSubjects} subjects
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${trajectory.gradient} rounded-full transition-all duration-500`}
                          style={{ width: `${progress.overallMastery}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${trajectory.gradient} rounded-xl text-white group-hover:shadow-lg transition-all`}>
                    <span className="text-sm font-black tracking-tight">
                      {hasProgress ? 'Continue Learning' : 'Start Journey'}
                    </span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TrajectorySelectionPage;
