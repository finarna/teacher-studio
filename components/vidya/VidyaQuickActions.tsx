/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - QUICK ACTIONS COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Context-aware suggestion chips (inspired by math chat)
 * Reduces user typing friction with smart suggestions
 */

import React from 'react';
import {
  Lightbulb,
  BarChart3,
  Calendar,
  TrendingUp,
  Repeat,
  AlertCircle,
  Zap,
  BookOpen,
  Target,
  List,
  Upload,
  Info,
  HelpCircle,
} from 'lucide-react';
import { QuickAction } from '../../utils/vidya/quickActions';

interface VidyaQuickActionsProps {
  actions: QuickAction[];
  onActionClick: (prompt: string) => void;
  disabled?: boolean;
  userRole: 'teacher' | 'student';
}

/**
 * Icon map for quick actions
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Lightbulb,
  BarChart3,
  Calendar,
  TrendingUp,
  Repeat,
  AlertCircle,
  Zap,
  BookOpen,
  Target,
  List,
  Upload,
  Info,
  HelpCircle,
};

/**
 * Quick Actions Component
 */
const VidyaQuickActions: React.FC<VidyaQuickActionsProps> = ({
  actions,
  onActionClick,
  disabled = false,
  userRole,
}) => {
  if (actions.length === 0) return null;

  return (
    <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
      {actions.map((action) => {
        const Icon = action.icon ? ICON_MAP[action.icon] : Lightbulb;

        return (
          <button
            key={action.id}
            onClick={() => !disabled && onActionClick(action.prompt)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
              userRole === 'teacher'
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
            title={action.prompt}
          >
            {Icon && <Icon className="w-3 h-3" />}
            {action.label}
          </button>
        );
      })}
    </div>
  );
};

export default VidyaQuickActions;
