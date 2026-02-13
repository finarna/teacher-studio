import React from 'react';
import {
  Calculator,
  Atom,
  FlaskConical,
  Leaf,
  ArrowRight,
  ChevronLeft,
  TrendingUp,
  BookOpen,
  Target,
  AlertCircle,
  Trophy,
  Zap
} from 'lucide-react';
import type { Subject, ExamContext, SubjectProgress } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';

interface SubjectSelectionPageProps {
  examContext: ExamContext;
  onSelectSubject: (subject: Subject) => void;
  onBack: () => void;
  subjectProgress?: Record<Subject, SubjectProgress>;
}

const SUBJECT_ICONS: Record<Subject, React.ElementType> = {
  'Math': Calculator,
  'Physics': Atom,
  'Chemistry': FlaskConical,
  'Biology': Leaf
};

const SubjectSelectionPage: React.FC<SubjectSelectionPageProps> = ({
  examContext,
  onSelectSubject,
  onBack,
  subjectProgress
}) => {
  // Get subjects for this exam context
  const availableSubjects = (Object.keys(SUBJECT_CONFIGS) as Subject[]).filter(
    subject => SUBJECT_CONFIGS[subject].supportedExams.includes(examContext)
  );

  // Calculate overall stats
  const totalSubjects = availableSubjects.length;
  const completedSubjects = availableSubjects.filter(
    s => (subjectProgress?.[s]?.overallMastery || 0) >= 85
  ).length;
  const averageMastery = availableSubjects.reduce(
    (sum, s) => sum + (subjectProgress?.[s]?.overallMastery || 0),
    0
  ) / totalSubjects;

  // Find weakest and strongest subjects
  const weakestSubject = availableSubjects.reduce((weakest, subject) => {
    const mastery = subjectProgress?.[subject]?.overallMastery || 0;
    const weakestMastery = subjectProgress?.[weakest]?.overallMastery || 0;
    return mastery < weakestMastery ? subject : weakest;
  }, availableSubjects[0]);

  const strongestSubject = availableSubjects.reduce((strongest, subject) => {
    const mastery = subjectProgress?.[subject]?.overallMastery || 0;
    const strongestMastery = subjectProgress?.[strongest]?.overallMastery || 0;
    return mastery > strongestMastery ? subject : strongest;
  }, availableSubjects[0]);

  const weakestMastery = subjectProgress?.[weakestSubject]?.overallMastery || 0;
  const strongestMastery = subjectProgress?.[strongestSubject]?.overallMastery || 0;

  const getMasteryColor = (mastery: number): string => {
    if (mastery >= 85) return 'emerald';
    if (mastery >= 70) return 'green';
    if (mastery >= 50) return 'yellow';
    if (mastery >= 30) return 'orange';
    return 'red';
  };

  const getMasteryLabel = (mastery: number): string => {
    if (mastery >= 85) return 'Mastered';
    if (mastery >= 70) return 'Good';
    if (mastery >= 50) return 'Progressing';
    if (mastery >= 30) return 'Beginner';
    return 'Not Started';
  };

  return (
    <div className="bg-slate-50/50 font-instrument text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft size={18} />
              <span className="text-xs font-black uppercase tracking-wider">Back</span>
            </button>

            <div className="flex items-center gap-3">
              {/* Mastery Constellation - Compact Header Version */}
              <div className="relative bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 rounded-lg px-3 py-2 overflow-hidden">
                {/* Sparkle background */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-1 left-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse" />
                  <div className="absolute top-3 right-2 w-0.5 h-0.5 bg-yellow-200 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute bottom-1 left-3 w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                {/* Subject Stars - horizontal layout */}
                <div className="relative flex items-center gap-2">
                  {availableSubjects.map((subject, idx) => {
                    const mastery = subjectProgress?.[subject]?.overallMastery || 0;
                    const config = SUBJECT_CONFIGS[subject];
                    const size = 6 + (mastery / 100) * 6; // Smaller: 6px to 12px
                    const glow = mastery > 0 ? mastery / 100 : 0.1;

                    return (
                      <div key={subject} className="relative group">
                        {/* Glow effect */}
                        <div
                          className="absolute inset-0 rounded-full blur-sm transition-all duration-700"
                          style={{
                            width: size * 1.8,
                            height: size * 1.8,
                            background: config.color,
                            opacity: glow * 0.5,
                            transform: 'translate(-20%, -20%)'
                          }}
                        />

                        {/* Star */}
                        <div
                          className="relative rounded-full flex items-center justify-center text-white font-black transition-all duration-700"
                          style={{
                            width: size,
                            height: size,
                            background: `linear-gradient(135deg, ${config.color}, ${config.colorDark})`,
                            fontSize: size * 0.4,
                            boxShadow: `0 0 ${mastery * 0.15}px ${config.color}`
                          }}
                        >
                          {mastery >= 50 ? config.iconEmoji : ''}
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {config.displayName.split(' ')[0]}: {Math.round(mastery)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-2.5 py-1 bg-slate-100 rounded-lg">
                <span className="font-black text-[10px] text-slate-500 uppercase tracking-wider mr-1.5">
                  Trajectory
                </span>
                <span className="font-black text-slate-900 text-xs">{examContext}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-black text-xl tracking-tight text-slate-900 font-outfit">
              Select <span className="text-primary-600">Subject</span>
            </h1>
          </div>
          <p className="text-slate-600 text-xs font-medium">
            Choose a subject to explore topics, practice questions, and track your mastery.
          </p>
        </div>
      </div>

      {/* Stats Overview - Always show */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Overall Progress */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg p-3 text-white">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Trophy size={14} />
              <span className="text-[9px] font-black uppercase tracking-wider opacity-90">
                Overall Progress
              </span>
            </div>
            <div className="text-2xl font-black mb-0.5">{Math.round(averageMastery)}%</div>
            <div className="text-[10px] font-medium opacity-80">
              {completedSubjects}/{totalSubjects} subjects mastered
            </div>
          </div>

          {/* Questions Attempted */}
          <div className="bg-white border-2 border-slate-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen size={14} className="text-blue-500" />
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Questions
              </span>
            </div>
            <div className="text-xl font-black text-slate-900">
              {availableSubjects.reduce((sum, s) => sum + (subjectProgress?.[s]?.totalQuestionsAttempted || 0), 0)}
            </div>
            <div className="text-[10px] font-medium text-slate-600">Attempted</div>
          </div>

          {/* Average Accuracy */}
          <div className="bg-white border-2 border-slate-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target size={14} className="text-emerald-500" />
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Accuracy
              </span>
            </div>
            <div className="text-xl font-black text-slate-900">
              {Math.round(
                availableSubjects.reduce((sum, s) => sum + (subjectProgress?.[s]?.overallAccuracy || 0), 0) / totalSubjects
              )}%
            </div>
            <div className="text-[10px] font-medium text-slate-600">Average</div>
          </div>

          {/* Total Subjects */}
          <div className="bg-white border-2 border-slate-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap size={14} className="text-blue-500" />
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Subjects
              </span>
            </div>
            <div className="text-xl font-black text-slate-900">{totalSubjects}</div>
            <div className="text-[10px] font-medium text-slate-600">Available</div>
          </div>
        </div>
      </div>

      {/* Subject Cards */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableSubjects.map((subject) => {
            const config = SUBJECT_CONFIGS[subject];
            const progress = subjectProgress?.[subject];
            const Icon = SUBJECT_ICONS[subject];
            const mastery = progress?.overallMastery || 0;
            const masteryColor = getMasteryColor(mastery);
            const masteryLabel = getMasteryLabel(mastery);

            return (
              <button
                key={subject}
                onClick={() => onSelectSubject(subject)}
                className="group relative bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-300 overflow-hidden text-left shadow-sm hover:shadow-lg"
              >
                {/* Header with Subject Color */}
                <div
                  className="relative h-20 p-4 text-white overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${config.color} 0%, ${config.colorDark} 100%)`
                  }}
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }} />
                  </div>

                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <Icon size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-black text-xl tracking-tight">{config.displayName}</h3>
                        <p className="text-white/80 text-[9px] font-black uppercase tracking-wider mt-0.5">
                          {config.domains.length} domains
                        </p>
                      </div>
                    </div>

                    {/* Mastery Ring */}
                    {progress && (
                      <div className="relative w-14 h-14">
                        <svg className="transform -rotate-90 w-14 h-14">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="3"
                            fill="none"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="white"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray={`${(mastery / 100) * 150.8} 150.8`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-black">{Math.round(mastery)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Progress Info */}
                  {progress ? (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Mastery Status
                        </span>
                        <span className={`text-xs font-black text-${masteryColor}-600 uppercase tracking-wider`}>
                          {masteryLabel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">
                          {progress.topicsMastered}/{progress.topicsTotal} topics mastered
                        </span>
                        <span className="font-black text-slate-900">
                          {progress.overallAccuracy.toFixed(1)}% accuracy
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-${masteryColor}-500 rounded-full transition-all duration-500`}
                          style={{ width: `${mastery}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <p className="text-xs text-slate-600 font-medium">
                        Start your learning journey in {config.displayName}
                      </p>
                    </div>
                  )}

                  {/* Domains Preview */}
                  <div className="mb-3">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Key Domains
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.domains.slice(0, 4).map((domain) => (
                        <span
                          key={domain}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium"
                        >
                          {domain}
                        </span>
                      ))}
                      {config.domains.length > 4 && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-xs font-medium">
                          +{config.domains.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-white group-hover:shadow-lg transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${config.color} 0%, ${config.colorDark} 100%)`
                    }}
                  >
                    <span className="text-sm font-black tracking-tight">
                      {progress ? 'Continue Learning' : 'Start Learning'}
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

export default SubjectSelectionPage;
