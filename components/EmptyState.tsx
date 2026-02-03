import React from 'react';
import { Upload } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useSubjectTheme } from '../hooks/useSubjectTheme';

interface EmptyStateProps {
  onUpload?: () => void;
  showUploadButton?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onUpload,
  showUploadButton = true
}) => {
  const { subjectConfig, examConfig } = useAppContext();
  const theme = useSubjectTheme();

  // Map subject names to lucide-react icon names
  const getSubjectIconComponent = () => {
    const iconMap: Record<string, any> = {
      Calculator: () => (
        <svg
          className="w-16 h-16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" strokeWidth="2" />
          <line x1="8" y1="6" x2="16" y2="6" strokeWidth="2" />
          <line x1="8" y1="10" x2="10" y2="10" strokeWidth="2" />
          <line x1="14" y1="10" x2="16" y2="10" strokeWidth="2" />
          <line x1="8" y1="14" x2="10" y2="14" strokeWidth="2" />
          <line x1="14" y1="14" x2="16" y2="14" strokeWidth="2" />
          <line x1="8" y1="18" x2="16" y2="18" strokeWidth="2" />
        </svg>
      ),
      Atom: () => (
        <svg
          className="w-16 h-16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="1" strokeWidth="2" />
          <ellipse cx="12" cy="12" rx="10" ry="4" strokeWidth="2" />
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="4"
            strokeWidth="2"
            transform="rotate(60 12 12)"
          />
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="4"
            strokeWidth="2"
            transform="rotate(-60 12 12)"
          />
        </svg>
      ),
      FlaskConical: () => (
        <svg
          className="w-16 h-16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M10 2v7.5L4 20c-1 2 1 4 3 4h10c2 0 4-2 3-4l-6-10.5V2"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="8.5" y1="2" x2="15.5" y2="2" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      Leaf: () => (
        <svg
          className="w-16 h-16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" strokeWidth="2" />
        </svg>
      )
    };

    const IconComponent = iconMap[subjectConfig.icon] || iconMap.Atom;
    return <IconComponent />;
  };

  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="text-center max-w-md px-6">
        {/* Subject Icon */}
        <div
          className="flex items-center justify-center mb-6"
          style={{ color: theme.color }}
        >
          {getSubjectIconComponent()}
        </div>

        {/* Main Message */}
        <h3 className="text-2xl font-bold text-slate-800 mb-3">
          No {subjectConfig.displayName} Papers Yet
        </h3>

        {/* Description */}
        <p className="text-slate-600 mb-8 leading-relaxed">
          Upload your first {subjectConfig.displayName} paper for {examConfig.name} to
          unlock AI-powered analysis, insights, and personalized study recommendations.
        </p>

        {/* Upload Button */}
        {showUploadButton && onUpload && (
          <button
            onClick={onUpload}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white
                     shadow-lg hover:shadow-xl transform hover:scale-[1.02]
                     transition-all duration-200 ease-in-out"
            style={{ backgroundColor: theme.color }}
          >
            <Upload className="w-5 h-5" />
            <span>Upload {subjectConfig.displayName} Paper</span>
          </button>
        )}

        {/* Helpful Tips */}
        <div className="mt-8 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-600 text-left">
            <span className="font-semibold">Pro tip:</span> Upload previous year papers,
            mock tests, or practice papers in PDF format for best results. The AI will
            analyze question patterns, difficulty levels, and provide actionable insights.
          </p>
        </div>
      </div>
    </div>
  );
};
