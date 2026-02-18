import React from 'react';
import { ChevronLeft } from 'lucide-react';
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

  // Styling
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

  return (
    <div className={`${sticky ? 'sticky top-0 z-10' : ''} ${className}`}>
      {/* Main Header Bar */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            {/* Left: Back Button + Page Identity */}
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              {/* Back button */}
              {showBack && onBack && (
                <button
                  onClick={onBack}
                  className="shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors group"
                  aria-label="Go back"
                >
                  <ChevronLeft size={20} className="text-slate-600 group-hover:text-slate-900" />
                </button>
              )}

              {/* Icon and title */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {icon && (
                  <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${
                    subjectConfig ? subjectConfig.bgGradient : 'bg-gradient-to-br from-blue-500 to-blue-600'
                  }`}>
                    {icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="font-black text-lg md:text-xl text-slate-900 font-outfit truncate">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xs md:text-sm text-slate-600 font-instrument font-medium truncate">
                      {subtitle}
                    </p>
                  )}
                  {description && (
                    <p className="hidden md:block text-xs text-slate-500 font-instrument mt-0.5 line-clamp-1">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Context Badges + Actions */}
            <div className="flex items-center gap-3 md:gap-4 shrink-0">
              {/* Actions (custom content) */}
              {actions && (
                <div className="flex items-center gap-2">
                  {actions}
                </div>
              )}

              {/* Context Badges */}
              {(trajectory || subject || additionalContext) && (
                <div className="flex items-center gap-2">
                  {/* Additional Context (e.g., year) */}
                  {additionalContext && (
                    <div className="px-2.5 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                      <span className="text-[10px] md:text-xs font-black text-slate-700 uppercase tracking-wider">
                        {additionalContext}
                      </span>
                    </div>
                  )}

                  {/* Subject Badge */}
                  {subject && subjectConfig && (
                    <div className={`px-2.5 py-1.5 rounded-lg ${subjectConfig.bgGradient} border border-white/20 shadow-sm hidden md:block`}>
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">
                        {subject}
                      </span>
                    </div>
                  )}

                  {/* Trajectory Badge */}
                  {trajectory && (
                    <div className="px-2.5 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-wider">
                          {trajectory}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Children (e.g., stats grid) */}
      {children && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningJourneyHeader;
