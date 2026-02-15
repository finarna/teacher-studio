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
  CheckCircle2,
  Sparkles
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
    description: 'MEDICAL PREP TRACK (BIOLOGY FOCUS)',
    icon: FlaskConical,
    color: 'emerald',
    gradient: 'from-emerald-500 to-emerald-600',
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
    name: 'JEE MAIN',
    fullName: 'Joint Entrance Examination',
    description: 'ENGINEERING PREP TRACK (MATH FOCUS)',
    icon: Atom,
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
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
    description: 'STATE COMMON PREP TRACK',
    icon: GraduationCap,
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
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
    name: 'BOARD EXAM',
    fullName: 'Central Board of Secondary Education',
    description: 'CLASS 12TH SENIOR SECONDARY',
    icon: BookOpen,
    color: 'pink',
    gradient: 'from-pink-500 to-pink-600',
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

      {/* PREMIUM DESIGN ACTIVE - You should see this banner! */}
      <div className="max-w-7xl mx-auto px-6 py-2">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-2xl mb-4 flex items-center justify-center gap-3 shadow-xl animate-pulse">
          <Sparkles size={24} className="animate-spin" />
          <span className="text-sm font-black uppercase tracking-wider">🎨 Premium Design System Active - All Cards Redesigned!</span>
          <Sparkles size={24} className="animate-spin" />
        </div>
      </div>

      {/* Trajectory Cards Grid - Premium Clean Design (Compact) */}
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
                className="group relative bg-white rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all duration-300 text-left shadow-sm hover:shadow-xl overflow-hidden"
              >
                {/* Card Content */}
                <div className="p-5">
                  {/* Large Gradient Icon Badge with Hover Animation */}
                  <div className="mb-4 relative">
                    <div className={`inline-flex w-16 h-16 bg-gradient-to-br ${trajectory.gradient} rounded-xl items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-2xl`}>
                      <Icon size={32} className="text-white transition-all duration-500 group-hover:scale-110" strokeWidth={2.5} />
                    </div>
                    {/* Glow effect on hover */}
                    <div className={`absolute top-0 left-0 w-16 h-16 bg-gradient-to-br ${trajectory.gradient} rounded-xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500`} />
                  </div>

                  {/* Trajectory Name - Bold & Black with Hover Effect */}
                  <h3 className="text-2xl font-black text-slate-900 mb-1.5 tracking-tight transition-colors duration-300 group-hover:text-purple-600">
                    {trajectory.name}
                  </h3>

                  {/* Description - Uppercase Gray with Hover Effect */}
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 leading-relaxed transition-colors duration-300 group-hover:text-purple-500">
                    {trajectory.description}
                  </p>

                  {/* Exam Pattern - Compact Info with Hover Effects */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-7 h-7 bg-gradient-to-br ${trajectory.gradient} rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}>
                        <Target size={14} className="text-white transition-all duration-300 group-hover:scale-110" />
                      </div>
                      <div>
                        <div className="text-base font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">{trajectory.pattern.totalQuestions}</div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Questions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-7 h-7 bg-gradient-to-br ${trajectory.gradient} rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}>
                        <Clock size={14} className="text-white transition-all duration-300 group-hover:scale-110" />
                      </div>
                      <div>
                        <div className="text-base font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">{trajectory.pattern.duration}</div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Minutes</div>
                      </div>
                    </div>
                  </div>

                  {/* Subjects with Hover Effects */}
                  <div className="mb-4">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Core Subjects</div>
                    <div className="flex flex-wrap gap-1.5">
                      {trajectory.pattern.subjects.map((subject, idx) => (
                        <div key={idx} className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 transition-all duration-300 group-hover:bg-purple-50 group-hover:border-purple-200 group-hover:scale-105">
                          <span className="text-[11px] font-bold text-slate-700 transition-colors duration-300 group-hover:text-purple-700">{subject}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress Indicator (if in progress) with Hover Animation */}
                  {hasProgress && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          Your Progress
                        </span>
                        <span className="text-xs font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">
                          {progress.overallMastery}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden group-hover:h-2 transition-all duration-300">
                        <div
                          className={`h-full bg-gradient-to-r ${trajectory.gradient} rounded-full transition-all duration-500 group-hover:shadow-lg`}
                          style={{ width: `${progress.overallMastery}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Purple Action Button - Premium Style */}
                  <button className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl text-white group-hover:shadow-2xl group-hover:from-purple-700 group-hover:to-purple-800 transition-all">
                    <span className="text-xs font-black tracking-tight uppercase">
                      {hasProgress ? 'Continue Prep Track' : 'Enter Prep Track Port'}
                    </span>
                    <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                  </button>
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
