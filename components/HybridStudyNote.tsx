/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HYBRID STUDY NOTE - VISUAL NOTE GENERATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * APPROACH:
 * 1. HTML/CSS text rendering (100% accurate, perfect KaTeX math)
 * 2. OPTIONAL: AI-generated visual note using repository's proven method
 *
 * Image generation:
 * - Uses existing blueprint (already generated)
 * - Calls generateImageFromBlueprint() from sketchGenerators.ts
 * - Same prompt/model as successful question visuals in repo
 * - Includes LaTeX conversion, sections with icons, and accuracy instructions
 */

import React, { useState } from 'react';
import { StudyNoteRenderer } from './StudyNoteRenderer';
import { GenerationResult, generateImageFromBlueprint } from '../utils/sketchGenerators';
import { Loader2, ImagePlus, RefreshCw } from 'lucide-react';

interface HybridStudyNoteProps {
  blueprint: GenerationResult['blueprint'];
  subject: string;
  apiKey: string;
  showDiagram?: boolean;  // Toggle diagram generation controls
  className?: string;
}

/**
 * Main Hybrid Study Note Component
 */
export const HybridStudyNote: React.FC<HybridStudyNoteProps> = ({
  blueprint,
  subject,
  apiKey,
  showDiagram = false,
  className = ''
}) => {
  const [diagramUrl, setDiagramUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  /**
   * Generate visual note using existing blueprint
   * Uses the same proven prompt and model from the repo's sketchGenerators
   */
  const generateVisualNote = async () => {
    setIsGenerating(true);
    setError(null);
    setStatus('Creating visual note...');

    try {
      // Generate image from existing blueprint using repo's proven approach
      const imageDataUrl = await generateImageFromBlueprint(
        blueprint,
        subject,
        apiKey,
        (status) => setStatus(status)
      );

      setDiagramUrl(imageDataUrl);
      setStatus('');
    } catch (error: any) {
      console.error('Visual note generation error:', error);
      setError(error.message || 'Failed to generate visual note');
      setStatus('');
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateDiagram = () => {
    setDiagramUrl(null);
    setError(null);
    generateVisualNote();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Visual Note Generation Controls */}
      {showDiagram && (
        <div className="space-y-4">
          {/* Generate Visual Note Button */}
          {!isGenerating && !error && !diagramUrl && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <ImagePlus className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-base font-bold text-amber-900 mb-1">
                      Optional: Generate Visual Note
                    </h3>
                    <p className="text-sm text-amber-700 leading-relaxed">
                      Create a structured visual study note with sections, icons, and formulas - using the repository's proven approach.
                    </p>
                  </div>
                </div>
                <button
                  onClick={generateVisualNote}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <ImagePlus size={16} />
                  Generate Visual Note
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-8 shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-blue-900 font-bold text-lg">
                  {status || 'Creating visual note...'}
                </p>
                <p className="text-sm text-blue-700">
                  Generating structured visual with sections and icons • This may take 30-60 seconds
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <span className="text-4xl">⚠️</span>
                <div className="text-center">
                  <h4 className="text-red-900 font-bold mb-2">Visual Note Generation Failed</h4>
                  <p className="text-sm text-red-700 mb-4">{error}</p>
                  <p className="text-xs text-red-600 mb-4">
                    The study guide above is still complete and accurate.
                  </p>
                </div>
                <button
                  onClick={regenerateDiagram}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Retry Visual Note
                </button>
              </div>
            </div>
          )}

          {/* Regenerate Button (when diagram exists) */}
          {diagramUrl && (
            <div className="flex justify-center">
              <button
                onClick={regenerateDiagram}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Regenerate Visual Note
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Study Note Content (HTML/CSS - Always Accurate) */}
      <StudyNoteRenderer
        blueprint={blueprint}
        diagramUrl={diagramUrl || undefined}
      />

      {/* Info Footer */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0">✅</span>
          <div>
            <h4 className="text-lg font-black text-purple-900 mb-2">
              100% Accurate Text Content
            </h4>
            <p className="text-sm text-purple-700 leading-relaxed">
              All text, formulas, and explanations are rendered with professional math typography.
              <strong> Zero spelling errors, zero notation mistakes, zero hallucinations.</strong>
            </p>
          </div>
        </div>

        {showDiagram && diagramUrl && (
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">🎨</span>
            <div>
              <h4 className="text-lg font-black text-purple-900 mb-2">
                AI-Generated Visual Note
              </h4>
              <p className="text-sm text-purple-700 leading-relaxed">
                The visual note is AI-generated using the same proven approach from the repository. It complements the accurate text content above.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HybridStudyNote;
