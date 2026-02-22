import React from 'react';
import {
  GraduationCap,
  FlaskConical,
  Atom,
  BookOpen,
  ArrowRight,
  Clock,
  Target,
  Sparkles,
  Zap,
  Medal,
  Award,
  BookMarked
} from 'lucide-react';
import { motion } from 'framer-motion';
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
  lightColor: string;
  pattern: {
    totalQuestions: number;
    duration: number;
    subjects: string[];
  };
  highlights: { icon: React.ElementType; text: string }[];
}

const TRAJECTORY_CARDS: TrajectoryCard[] = [
  {
    id: 'NEET',
    name: 'NEET',
    fullName: 'National Eligibility cum Entrance Test',
    description: 'Premier Medical Track',
    icon: FlaskConical,
    color: '#10B981',
    gradient: 'from-emerald-500 to-emerald-700',
    lightColor: 'bg-emerald-50',
    pattern: {
      totalQuestions: 180,
      duration: 200,
      subjects: ['Physics', 'Chemistry', 'Biology']
    },
    highlights: [
      { icon: Medal, text: 'Medical & Dental Colleges' },
      { icon: Zap, text: 'Biology-focused prep' },
      { icon: Award, text: 'AIIMS & JIPMER track' }
    ]
  },
  {
    id: 'JEE',
    name: 'JEE MAIN',
    fullName: 'Joint Entrance Examination',
    description: 'Engineering Mastery Track',
    icon: Atom,
    color: '#3B82F6',
    gradient: 'from-blue-500 to-blue-700',
    lightColor: 'bg-blue-50',
    pattern: {
      totalQuestions: 90,
      duration: 180,
      subjects: ['Physics', 'Chemistry', 'Math']
    },
    highlights: [
      { icon: Medal, text: 'IITs, NITs & IIITs' },
      { icon: Zap, text: 'Math & Physics focus' },
      { icon: Award, text: 'Main & Advanced track' }
    ]
  },
  {
    id: 'KCET',
    name: 'KCET',
    fullName: 'Karnataka Common Entrance Test',
    description: 'State Academic Focus',
    icon: GraduationCap,
    color: '#F59E0B',
    gradient: 'from-orange-500 to-orange-700',
    lightColor: 'bg-orange-50',
    pattern: {
      totalQuestions: 60,
      duration: 80,
      subjects: ['P', 'C', 'M', 'B']
    },
    highlights: [
      { icon: Medal, text: 'State Govt. Colleges' },
      { icon: Zap, text: 'Fast-paced pattern' },
      { icon: Award, text: 'Common Entrance focus' }
    ]
  },
  {
    id: 'CBSE',
    name: 'BOARDS',
    fullName: 'Central Board Council',
    description: 'Academic Foundation',
    icon: BookMarked,
    color: '#EC4899',
    gradient: 'from-pink-500 to-pink-700',
    lightColor: 'bg-pink-50',
    pattern: {
      totalQuestions: 40,
      duration: 180,
      subjects: ['Core Academic Path']
    },
    highlights: [
      { icon: Medal, text: 'Board Excellence' },
      { icon: Zap, text: 'Foundation building' },
      { icon: Award, text: 'Concept mastery' }
    ]
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const cardVariants: { [key: string]: any } = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const TrajectorySelectionPage: React.FC<TrajectorySelectionPageProps> = ({
  onSelectTrajectory,
  userProgress
}) => {
  return (
    <div className="min-h-full bg-slate-50/50">
      <LearningJourneyHeader
        title="Path Selection"
        subtitle="Embark on your personal excellence journey"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-primary-100 shadow-sm"
          >
            <Sparkles size={12} />
            AI-Powered Personalization
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-black text-slate-900 font-outfit mb-3 tracking-tight"
          >
            Select Your <span className="text-primary-600">Trajectory</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 font-instrument text-lg"
          >
            Choose your exam target to unlock tailored study materials, predictive analytics, and mastery tracking.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {TRAJECTORY_CARDS.map((trajectory) => {
            const progress = userProgress?.[trajectory.id];
            const hasProgress = progress && progress.overallMastery > 0;
            const Icon = trajectory.icon;

            return (
              <motion.button
                key={trajectory.id}
                variants={cardVariants}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectTrajectory(trajectory.id)}
                className="group relative bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-2xl hover:border-primary-200 transition-all duration-300 text-left overflow-hidden flex flex-col h-full"
              >
                {/* Background Accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br ${trajectory.gradient}`} />

                <div className="p-6 flex flex-col h-full relative z-10">
                  {/* Icon & Progress */}
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${trajectory.gradient} flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform duration-300`}>
                      <Icon size={28} className="text-white" strokeWidth={2.5} />
                    </div>
                    {hasProgress && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery</span>
                        <span className="text-lg font-black text-slate-900 leading-none">{progress.overallMastery}%</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-black text-slate-900 font-outfit tracking-tight group-hover:text-primary-600 transition-colors">
                      {trajectory.name}
                    </h3>
                    <p className="text-sm font-bold text-slate-500">
                      {trajectory.fullName}
                    </p>
                    <div className="mt-2 text-[10px] font-black text-primary-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                      <Zap size={10} />
                      {trajectory.description}
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-3 mb-8 flex-1">
                    {trajectory.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                        <div className={`p-1.5 rounded-lg ${trajectory.lightColor}`}>
                          <h.icon size={14} style={{ color: trajectory.color }} />
                        </div>
                        {h.text}
                      </div>
                    ))}
                  </div>

                  {/* Footer Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Questions</span>
                        <span className="text-sm font-black text-slate-900">{trajectory.pattern.totalQuestions}</span>
                      </div>
                      <div className="w-px h-8 bg-slate-100" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</span>
                        <span className="text-sm font-black text-slate-900">{trajectory.pattern.duration}m</span>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all">
                      <ArrowRight size={18} />
                    </div>
                  </div>

                  {/* Active Progress Bar */}
                  {hasProgress && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.overallMastery}%` }}
                        className={`h-full bg-gradient-to-r ${trajectory.gradient}`}
                      />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default TrajectorySelectionPage;
