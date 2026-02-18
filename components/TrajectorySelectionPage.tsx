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
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';

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
      {/* Unified Header - No back button (start page) */}
      <LearningJourneyHeader
        showBack={false}
        icon={
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-900 font-black text-[10px] tracking-widest shadow-sm transform -rotate-3">
            EDU
          </div>
        }
        title="Choose Your Learning Journey"
        description="Select your exam trajectory to access personalized study paths, topic-wise mastery tracking, and full-length mock tests"
      />

      {/* Trajectory Cards Grid - Compact & Clean Design */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {TRAJECTORY_CARDS.map((trajectory) => {
            const progress = userProgress?.[trajectory.id];
            const hasProgress = progress && progress.overallMastery > 0;
            const Icon = trajectory.icon;

            return (
              <button
                key={trajectory.id}
                onClick={() => onSelectTrajectory(trajectory.id)}
                className={`group relative bg-white rounded-xl border transition-all duration-300 text-left shadow-sm hover:shadow-lg overflow-hidden flex flex-col ${
                  trajectory.id === 'KCET'
                    ? 'border-orange-400 ring-2 ring-orange-200 hover:border-orange-500'
                    : 'border-slate-200/60 hover:border-purple-300'
                }`}
              >
                {/* Active Badge for KCET */}
                {trajectory.id === 'KCET' && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-[8px] font-black uppercase tracking-wider shadow-md">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      Active Focus
                    </span>
                  </div>
                )}

                {/* Hover Arrow Indicator - Top Right */}
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5">
                  <ArrowRight size={14} className="text-purple-600" strokeWidth={2.5} />
                </div>

                {/* Card Content */}
                <div className="p-3.5 flex flex-col flex-1">
                  {/* Compact Icon Badge - Fixed Height */}
                  <div className="mb-3 h-12 flex items-start">
                    <div className={`w-12 h-12 bg-gradient-to-br ${trajectory.gradient} rounded-lg flex items-center justify-center shadow transition-all duration-300 group-hover:scale-105`}>
                      <Icon size={24} className="text-white" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Trajectory Name - Fixed Height */}
                  <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight transition-colors duration-300 group-hover:text-purple-600 h-7 flex items-center">
                    {trajectory.name}
                  </h3>

                  {/* Description - Fixed Height */}
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-3 leading-tight h-8 flex items-start">
                    {trajectory.description}
                  </p>

                  {/* Exam Pattern - Compact - Fixed Height */}
                  <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-slate-100 h-12">
                    <div className="flex items-center gap-1">
                      <div className={`w-6 h-6 bg-gradient-to-br ${trajectory.gradient} rounded-md flex items-center justify-center flex-shrink-0`}>
                        <Target size={12} className="text-white" />
                      </div>
                      <div className="min-w-[60px]">
                        <div className="text-sm font-black text-slate-900 leading-tight">{trajectory.pattern.totalQuestions}</div>
                        <div className="text-[7px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Questions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-6 h-6 bg-gradient-to-br ${trajectory.gradient} rounded-md flex items-center justify-center flex-shrink-0`}>
                        <Clock size={12} className="text-white" />
                      </div>
                      <div className="min-w-[60px]">
                        <div className="text-sm font-black text-slate-900 leading-tight">{trajectory.pattern.duration}</div>
                        <div className="text-[7px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Minutes</div>
                      </div>
                    </div>
                  </div>

                  {/* Subjects - Compact Pills */}
                  <div className="mb-3">
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Core Subjects</div>
                    <div className="flex items-center flex-wrap gap-1">
                      {trajectory.pattern.subjects.map((subject, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[9px] font-medium border border-slate-200 transition-colors duration-200 group-hover:bg-purple-100 group-hover:text-purple-700 group-hover:border-purple-200">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Progress Indicator (if in progress) - Fixed Height */}
                  <div className="min-h-[32px] mt-auto">
                    {hasProgress && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                            Progress
                          </span>
                          <span className="text-xs font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">
                            {progress.overallMastery}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${trajectory.gradient} rounded-full transition-all duration-300`}
                            style={{ width: `${progress.overallMastery}%` }}
                          />
                        </div>
                      </div>
                    )}
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
