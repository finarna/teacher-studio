import React from 'react';
import { ChevronLeft, Sparkles, Map, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Subject, ExamContext } from '../../types';
import { SUBJECT_CONFIGS } from '../../config/subjects';

interface LearningJourneyHeaderProps {
  // Navigation
  showBack?: boolean;
  onBack?: () => void;

  // Page Identity
  icon?: React.ReactNode;
  title: string;
  description?: string;
  subtitle?: string;

  // Context Badges
  trajectory?: ExamContext;
  subject?: Subject;
  additionalContext?: string; // e.g., year, custom text

  // Stats
  mastery?: number;
  accuracy?: number;

  // Actions (right side)
  actions?: React.ReactNode;
  // ...

  // Children (for stats grid, etc.)
  children?: React.ReactNode;

  // styling
  sticky?: boolean;
  className?: string;
}

const LearningJourneyHeader: React.FC<LearningJourneyHeaderProps> = ({
  showBack = false,
  onBack,
  icon,
  title,
  description,
  subtitle,
  trajectory,
  subject,
  additionalContext,
  mastery,
  accuracy,
  actions,
  children,
  sticky = true,
  className = ''
}) => {
  // Get subject config for styling
  const subjectConfig = subject ? SUBJECT_CONFIGS[subject] : null;

  // Generate dynamic styles based on subject color
  const headerStyles = subjectConfig ? {
    iconBg: { backgroundColor: subjectConfig.color },
    accentLine: { backgroundColor: subjectConfig.color }
  } : {
    iconBg: { background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)' },
    accentLine: { background: 'linear-gradient(90deg, #4F46E5, #818CF8)' }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`${sticky ? 'sticky top-0 z-[60]' : ''} ${className}`}
    >
      {/* Main Header Bar with Premium Glassmorphism */}
      <div className="border-b border-white/10 bg-white/70 backdrop-blur-2xl shadow-sm overflow-hidden relative">
        {/* Subtle top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={headerStyles.accentLine}
        />

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">

            {/* Universal Adaptive Header Content */}
            <div className="flex items-center justify-between w-full gap-2">

              {/* Left: Navigation Actions */}
              <div className="flex items-center gap-2 w-20 md:w-auto shrink-0 transition-all">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('openMobileMenu'))}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-full active:bg-slate-100 shadow-sm md:hidden"
                  aria-label="Open menu"
                >
                  <Menu size={20} className="text-slate-400" />
                </button>

                {showBack && onBack && (
                  <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-full active:bg-slate-100 shadow-sm"
                    aria-label="Go back"
                  >
                    <ChevronLeft size={22} className="text-primary-600" />
                  </button>
                )}
              </div>

              {/* Center: Identity Stack */}
              <div className="flex-1 min-w-0 text-center flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-center">
                  {trajectory && (
                    <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded tracking-wide uppercase leading-none shadow-sm">
                      {trajectory}
                    </span>
                  )}
                  {subject && (
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded tracking-wide uppercase leading-none bg-white text-slate-800 border shadow-sm"
                      style={{ borderColor: subjectConfig?.color }}
                    >
                      {subject}
                    </span>
                  )}
                  {additionalContext && (
                    <span className="text-[10px] font-black bg-white text-primary-600 px-2 py-0.5 rounded border border-primary-200 tracking-wide uppercase leading-none shadow-sm">
                      {additionalContext}
                    </span>
                  )}
                </div>
                <h1 className="font-black text-base md:text-2xl text-slate-900 font-outfit tracking-tight leading-tight truncate w-full max-w-[240px] md:max-w-none">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 truncate w-full px-2">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Right: Master Stats / Trophy / Actions */}
              <div className="flex items-center justify-end gap-3 md:w-auto shrink-0 transition-all">
                {actions && (
                  <div className="flex items-center gap-2">
                    {actions}
                  </div>
                )}

                {mastery !== undefined && (
                  <>
                    <div className="relative group transition-transform active:scale-95 shrink-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 text-slate-900 border-2 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)] bg-white">
                        <span className="text-xs font-black">{Math.round(mastery)}%</span>
                      </div>
                      <div className="absolute -top-1 -right-1">
                        <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm">
                          <Sparkles size={8} />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Global Stats Pill */}
                    <div className="hidden lg:flex items-center gap-3 ml-6">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                          <span className="text-base font-bold text-slate-900 leading-none">{Math.round(accuracy ?? 0)}%</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Accuracy</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-xl shadow-lg border border-white/10">
                          <span className="text-base font-bold text-white leading-none">{Math.round(mastery)}%</span>
                          <span className="text-[9px] font-bold text-primary-400 uppercase tracking-widest whitespace-nowrap">Mastery</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {(!actions && mastery === undefined) && <div className="w-10 h-10 md:hidden" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Sub-header (Stats, Progress, etc.) */}
      <AnimatePresence>
        {children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default LearningJourneyHeader;
