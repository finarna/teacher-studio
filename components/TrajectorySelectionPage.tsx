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
  BookMarked,
  FileQuestion
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
    <div className="relative min-h-screen bg-[#fcfdfe] overflow-hidden">
      {/* 1. PREMIUM AMBIENT BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
      </div>

      <LearningJourneyHeader
        title="Mission Selection"
        subtitle="Your personalized roadmap to academic excellence"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20">
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-primary-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-white/10 shadow-2xl"
          >
            <Sparkles size={14} className="animate-pulse" />
            AI-Powered Personalization Engine
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-slate-900 font-outfit mb-6 tracking-tight italic uppercase"
          >
            Choose Your <span className="text-primary-600 non-italic">Trajectory</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 font-instrument text-xl md:text-2xl leading-relaxed"
          >
            We've analyzed current exam trends to tailor your learning path.
            Pick the arena where you'll prove your excellence today.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 pb-12"
        >
          {TRAJECTORY_CARDS.map((trajectory) => {
            const progress = userProgress?.[trajectory.id];
            const hasProgress = progress && progress.overallMastery > 0;
            const Icon = trajectory.icon;

            return (
              <motion.button
                key={trajectory.id}
                variants={cardVariants}
                whileHover={{ y: -12, transition: { type: "spring", stiffness: 300 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectTrajectory(trajectory.id)}
                className="group relative bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] hover:border-primary-300/50 transition-all duration-500 text-left overflow-hidden flex flex-col h-full"
              >
                {/* Visual Accent Layer */}
                <div className={`absolute top-0 right-0 w-48 h-48 -mr-12 -mt-12 rounded-full blur-[80px] opacity-0 group-hover:opacity-30 transition-opacity bg-gradient-to-br ${trajectory.gradient}`} />

                {/* Progress Ring Background (Subtle) */}
                <div className="absolute top-6 right-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Target size={120} style={{ color: trajectory.color }} />
                </div>

                <div className="p-8 flex flex-col h-full relative z-10">
                  {/* Top Badge & Progress */}
                  <div className="flex items-start justify-between mb-8">
                    <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${trajectory.gradient} flex items-center justify-center shadow-xl transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-500`}>
                      <Icon size={32} className="text-white" strokeWidth={2.5} />
                    </div>
                    {hasProgress ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-900 leading-none">{progress.overallMastery}%</span>
                          <span className="text-[10px] font-bold text-slate-400">Mastery</span>
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100 italic font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                        Not Started
                      </div>
                    )}
                  </div>

                  {/* Identity Section */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em] leading-none">
                        {trajectory.description}
                      </span>
                      <div className="w-1 h-3 bg-primary-200 rounded-full" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 font-outfit tracking-tighter group-hover:text-primary-600 transition-colors uppercase italic">
                      {trajectory.name}
                    </h3>
                    <p className="text-sm font-bold text-slate-500 mt-1 line-clamp-1">
                      {trajectory.fullName}
                    </p>
                  </div>

                  {/* Highlights List */}
                  <div className="space-y-4 mb-10 flex-1">
                    {trajectory.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-slate-600 font-semibold group/item">
                        <div className={`p-2 rounded-xl ${trajectory.lightColor} group-hover/item:scale-110 transition-transform`}>
                          <h.icon size={16} style={{ color: trajectory.color }} strokeWidth={2.5} />
                        </div>
                        <span className="group-hover:text-slate-900 transition-colors">{h.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Predictive/Pattern Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-6 mt-auto border-t border-slate-100">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FileQuestion size={10} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Patterns</span>
                      </div>
                      <span className="text-sm font-black text-slate-900 uppercase italic">
                        {trajectory.pattern.totalQuestions} Questions
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock size={10} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Window</span>
                      </div>
                      <span className="text-sm font-black text-slate-900 uppercase italic">
                        {trajectory.pattern.duration} Minutes
                      </span>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="mt-8 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.25em] group-hover:translate-x-2 transition-transform duration-300">
                      Engage Mission
                    </span>
                    <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-xl transition-all duration-300`}>
                      <ArrowRight size={20} className="transform group-hover:scale-125 transition-transform" />
                    </div>
                  </div>

                  {/* Master Progress Bar */}
                  {hasProgress && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-50">
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

        {/* AI INSIGHT PILL */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex justify-center"
        >
          <div className="px-6 py-4 bg-white border border-slate-200 rounded-3xl shadow-2xl flex items-center gap-4 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <Zap size={24} className="fill-emerald-600/20" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Live AI Tip</p>
              <p className="text-sm font-bold text-slate-700 italic leading-snug">
                "Based on latest exam pattern updates, <span className="text-primary-600">JEE Math</span> weightage has shifted slightly towards vectors. Your roadmap is already updated."
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrajectorySelectionPage;
