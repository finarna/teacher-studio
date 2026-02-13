import React from 'react';
import { X, PenTool } from 'lucide-react';
import { RenderWithMath } from './MathRenderer';
import type { AnalyzedQuestion } from '../types';

interface PracticeSolutionModalProps {
  question: AnalyzedQuestion;
  onClose: () => void;
}

const PracticeSolutionModal: React.FC<PracticeSolutionModalProps> = ({ question, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <PenTool size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black">Solution Steps</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {question.topic} • {question.domain}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-80px)] bg-slate-50/30">
          {/* Solution Steps - Handle both markingScheme (AI-generated) and solutionSteps (Database) */}
          {(question.markingScheme && question.markingScheme.length > 0) || (question.solutionSteps && question.solutionSteps.length > 0) ? (
            <div className="space-y-6">
              <div className="space-y-5">
                {/* Use markingScheme if available (Visual Question Bank), otherwise transform solutionSteps */}
                {(question.markingScheme && question.markingScheme.length > 0
                  ? question.markingScheme
                  : question.solutionSteps?.map((step, idx) => {
                      // Split by ':::' if present (ExamAnalysis format)
                      const [title, content] = step.includes(':::') ? step.split(':::') : [`Step ${idx + 1}`, step];
                      return { step: content.trim(), mark: '1' };
                    }) || []
                ).map((item, idx) => {
                  // Parse step to extract title and content (format: "Step X: Title ::: Content")
                  const stepText = item.step;
                  let stepTitle = `Step ${idx + 1}`;
                  let stepContent = stepText;

                  // Check if step contains ":::" separator
                  if (stepText.includes(':::')) {
                    const [titlePart, contentPart] = stepText.split(':::');
                    stepTitle = titlePart.trim();
                    stepContent = contentPart.trim();
                  } else {
                    // Try to extract title from "Step X: Title" format
                    const colonIndex = stepText.indexOf(':');
                    if (colonIndex !== -1 && colonIndex < 100) {
                      // Only treat as title if colon is within first 100 chars
                      const potentialTitle = stepText.substring(0, colonIndex);
                      if (potentialTitle.toLowerCase().startsWith('step ')) {
                        stepTitle = potentialTitle.trim();
                        stepContent = stepText.substring(colonIndex + 1).trim();
                      }
                    }
                  }

                  return (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                      {/* Step Header */}
                      <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-700 text-white rounded-lg flex items-center justify-center font-black text-base shadow-md">
                            {idx + 1}
                          </div>
                          <h3 className="text-[18px] font-bold text-slate-900 leading-tight">
                            <RenderWithMath text={stepTitle} showOptions={false} serif={false} />
                          </h3>
                        </div>
                      </div>

                      {/* Step Content */}
                      <div className="px-6 py-5">
                        <div className="text-[17px] text-slate-800 leading-loose solution-step-content">
                          <RenderWithMath text={stepContent} showOptions={false} serif={false} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extracted Images */}
              {question.extractedImages && question.extractedImages.length > 0 && (
                <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Reference Diagrams ({question.extractedImages.length})
                    </h4>
                  </div>
                  <div className="space-y-4">
                    {question.extractedImages.map((imgData, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <img
                          src={imgData}
                          alt={`Diagram ${idx + 1}${question.visualElementDescription ? ` - ${question.visualElementDescription}` : ''}`}
                          className="w-full h-auto object-contain max-h-[500px] bg-white"
                          style={{
                            imageRendering: 'high-quality',
                            objectFit: 'contain'
                          }}
                        />
                        {question.visualElementDescription && idx === 0 && (
                          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                            <p className="text-xs text-slate-600">
                              <RenderWithMath text={question.visualElementDescription} showOptions={false} serif={false} />
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <PenTool size={48} className="text-slate-300 mx-auto mb-4" />
              <h3 className="font-black text-lg text-slate-900 mb-2">No Solution Available</h3>
              <p className="text-sm text-slate-600">
                The solution for this question will be available soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeSolutionModal;
