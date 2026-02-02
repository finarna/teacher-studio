/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STUDY NOTE RENDERER - HTML/CSS BASED (HYBRID APPROACH) - V2
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Renders rich blueprint content as HTML with proper math notation.
 * NO IMAGE AI - guaranteed accuracy, no spelling errors, proper LaTeX rendering.
 *
 * FIXED:
 * - All sections now use RenderWithMath for proper LaTeX rendering
 * - Tailwind CSS instead of styled-jsx (fixes React warning)
 * - Markdown support for all text content
 * - Better visual design
 */

import React from 'react';
import { RenderWithMath } from './MathRenderer';

interface StudyNoteBlueprint {
  visualConcept: string;
  coreTheory: string;
  keyFormulas: string[];
  solvedExample: string;
  stepByStep: string[];
  commonVariations: string[];
  patternRecognition: string;
  relatedConcepts: string[];
  memoryTricks: string[];
  commonMistakes: string[];
  examStrategy: string;
  quickReference: string[];
}

interface StudyNoteRendererProps {
  blueprint: StudyNoteBlueprint;
  diagramUrl?: string; // Optional AI-generated concept diagram
  className?: string;
}

/**
 * Main Study Note Renderer Component
 */
export const StudyNoteRenderer: React.FC<StudyNoteRendererProps> = ({
  blueprint,
  diagramUrl,
  className = ''
}) => {
  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Title Section */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl md:text-4xl font-black text-center leading-tight">
          <RenderWithMath text={blueprint.visualConcept} serif={true} />
        </h1>
      </header>

      {/* Optional AI-Generated Diagram */}
      {diagramUrl && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col items-center">
            <img
              src={diagramUrl}
              alt={`Concept diagram for ${blueprint.visualConcept}`}
              className="max-w-full h-auto rounded-xl shadow-md"
            />
            <p className="text-sm text-slate-500 mt-4 font-medium">
              📊 Visual Concept Map (AI-generated illustration)
            </p>
          </div>
        </section>
      )}

      {/* Core Concept Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-blue-900 mb-4 flex items-center gap-3">
          <span className="text-2xl">📚</span>
          Core Concept
        </h2>
        <div className="text-base text-slate-800 leading-relaxed">
          <RenderWithMath text={blueprint.coreTheory} serif={true} />
        </div>
      </section>

      {/* Key Formulas Section */}
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-amber-900 mb-4 flex items-center gap-3">
          <span className="text-2xl">📐</span>
          Key Formulas
        </h2>
        <div className="space-y-4">
          {blueprint.keyFormulas.map((formula, index) => (
            <div key={index} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </span>
              <div className="flex-1 text-lg overflow-x-auto">
                <RenderWithMath text={formula} serif={true} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Solved Example Section */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-green-900 mb-4 flex items-center gap-3">
          <span className="text-2xl">✓</span>
          Solved Example
        </h2>
        <div className="bg-white border border-green-200 rounded-xl p-6 shadow-sm space-y-3 text-base">
          <RenderWithMath text={blueprint.solvedExample} serif={true} autoSteps={true} />
        </div>
      </section>

      {/* Step-by-Step Method Section */}
      <section className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-purple-900 mb-4 flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          Universal Method
        </h2>
        <ol className="space-y-4">
          {blueprint.stepByStep.map((step, index) => (
            <li key={index} className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-md">
                {index + 1}
              </span>
              <div className="flex-1 pt-1 text-base text-slate-800">
                <RenderWithMath text={step} serif={false} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Pattern Recognition Section */}
      <section className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-cyan-900 mb-4 flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          How to Recognize This Question Type
        </h2>
        <div className="bg-white border border-cyan-200 rounded-xl p-5 shadow-sm text-base text-slate-800 leading-relaxed">
          <RenderWithMath text={blueprint.patternRecognition} serif={false} />
        </div>
      </section>

      {/* Two-Column Layout for Variations and Related Concepts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Similar Question Types */}
        <section className="bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-black text-rose-900 mb-4 flex items-center gap-2">
            <span className="text-xl">🔄</span>
            Similar Question Types
          </h2>
          <ul className="space-y-3">
            {blueprint.commonVariations.map((variation, index) => (
              <li key={index} className="flex gap-3 items-start text-sm">
                <span className="flex-shrink-0 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  {index + 1}
                </span>
                <div className="flex-1 text-slate-800">
                  <RenderWithMath text={variation} serif={false} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Related Concepts */}
        <section className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-black text-teal-900 mb-4 flex items-center gap-2">
            <span className="text-xl">🔗</span>
            Related Concepts
          </h2>
          <ul className="space-y-3">
            {blueprint.relatedConcepts.map((concept, index) => (
              <li key={index} className="flex gap-3 items-start text-sm">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  {index + 1}
                </span>
                <div className="flex-1 text-slate-800">
                  <RenderWithMath text={concept} serif={false} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Memory Tricks Section */}
      <section className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-violet-900 mb-4 flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          Memory Tricks & Mnemonics
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {blueprint.memoryTricks.map((trick, index) => (
            <div key={index} className="bg-white border border-violet-200 rounded-xl p-4 shadow-sm flex gap-3 items-start">
              <span className="text-2xl flex-shrink-0">💡</span>
              <div className="text-sm text-slate-800 leading-relaxed">
                <RenderWithMath text={trick} serif={false} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Common Mistakes Section */}
      <section className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-red-900 mb-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          Common Mistakes to Avoid
        </h2>
        <div className="space-y-4">
          {blueprint.commonMistakes.map((mistake, index) => (
            <div key={index} className="bg-white border border-red-200 rounded-xl p-4 shadow-sm flex gap-3 items-start">
              <span className="text-xl flex-shrink-0 text-red-500">❌</span>
              <div className="text-sm text-slate-800 leading-relaxed flex-1">
                <RenderWithMath text={mistake} serif={false} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Exam Strategy Section */}
      <section className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-indigo-900 mb-4 flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          Exam Strategy
        </h2>
        <div className="bg-white border border-indigo-200 rounded-xl p-5 shadow-sm text-base text-slate-800 leading-relaxed">
          <RenderWithMath text={blueprint.examStrategy} serif={false} />
        </div>
      </section>

      {/* Quick Reference Section */}
      <section className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-yellow-900 mb-4 flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          Quick Reference Cheat-Sheet
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          {blueprint.quickReference.map((item, index) => (
            <div key={index} className="bg-white border border-yellow-200 rounded-xl p-3 shadow-sm text-sm">
              <RenderWithMath text={item} serif={false} />
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center">
        <p className="text-sm text-slate-600 font-medium">
          📝 Study note generated with accurate mathematical notation using HTML/CSS
        </p>
        <p className="text-xs text-slate-500 mt-1">
          100% accurate • No spelling errors • Professional LaTeX rendering
        </p>
      </footer>
    </div>
  );
};
