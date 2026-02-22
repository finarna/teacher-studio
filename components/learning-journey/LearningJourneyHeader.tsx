import React from 'react';
import { ChevronLeft, Sparkles, Map } from 'lucide-react';
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

  // Actions (right side)
  actions?: React.ReactNode;

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

            {/* Left Section: Back Button + Breadcrumbs/Identity */}
            <div className="flex items-center gap-4 flex-1">
              <AnimatePresence mode="wait">
                {showBack && onBack && (
                  <motion.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack}
                    className="shrink-0 w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-slate-50 transition-colors group"
                    aria-label="Go back"
                  >
                    <ChevronLeft size={20} className="text-slate-600 group-hover:text-primary-600 transition-colors" />
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4 flex-1 min-w-0">
                {icon ? (
                  <motion.div
                    layoutId="header-icon"
                    className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden group text-white"
                    style={headerStyles.iconBg}
                  >
                    {/* Inner Glow/Shine */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <div className="relative z-10">
                      {icon}
                    </div>
                  </motion.div>
                ) : (
                  <div className="shrink-0 w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <Map size={24} className="text-slate-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {trajectory && (
                      <span className="text-xs font-black bg-slate-900 text-white px-2 py-1 rounded tracking-tighter uppercase leading-none">
                        {trajectory}
                      </span>
                    )}
                    {subject && (
                      <span
                        className="text-xs font-black px-2 py-1 rounded tracking-tighter uppercase leading-none bg-white text-slate-800 border"
                        style={{ borderColor: subjectConfig?.color }}
                      >
                        {subject}
                      </span>
                    )}
                  </div>
                  <h1 className="font-black text-xl md:text-2xl text-slate-900 font-outfit tracking-tight leading-none truncate">
                    {title}
                  </h1>
                </div>
              </div>
            </div>

            {/* Right Section: Badges & Actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Dynamic Badges */}
              <div className="hidden lg:flex items-center gap-2 mr-2">
                {additionalContext && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-100 shadow-sm">
                    <Sparkles size={12} className="text-amber-500" />
                    <span className="text-xs font-black text-amber-700 uppercase tracking-widest leading-none">
                      {additionalContext}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions Area */}
              {actions && (
                <div className="flex items-center gap-2">
                  {actions}
                </div>
              )}
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
