import React, { useEffect, useRef } from 'react';

// Declare global katex since we loaded it via script tag
declare global {
  interface Window {
    katex: any;
  }
}

interface MathRendererProps {
  expression?: string;
  content?: string; // Alias for expression
  inline?: boolean;
  className?: string;
  displayMode?: boolean;
}

const MathRenderer: React.FC<MathRendererProps> = ({ expression, content, inline = false, className = '', displayMode }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const rawExpression = expression || content || '';
  const isDisplayMode = displayMode !== undefined ? displayMode : !inline;

  useEffect(() => {
    if (ref.current && window.katex && typeof rawExpression === 'string' && rawExpression.trim()) {
      try {
        const cleanExpression = rawExpression
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const html = window.katex.renderToString(cleanExpression, {
          throwOnError: false,
          displayMode: isDisplayMode,
          output: 'html',
          strict: false,
          trust: true,
          macros: {
            "\\label": "\\href{###1}"
          }
        });
        ref.current.innerHTML = html;
      } catch (error) {
        console.error('KaTeX error:', error);
        ref.current.innerText = rawExpression;
      }
    } else if (ref.current) {
      ref.current.innerText = rawExpression;
    }
  }, [rawExpression, isDisplayMode]);

  return (
    <span
      ref={ref}
      className={`math-rendered ${className} ${isDisplayMode ? 'block my-4 text-center scale-110' : 'inline-block mx-0.5'}`}
    />
  );
};

export const DerivationStep: React.FC<{ index: number, title?: string, content: string }> = ({ index, title, content }) => {
  return (
    <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center gap-6 mb-4">
        <div className="w-11 h-11 rounded-[14px] bg-slate-950 text-white flex items-center justify-center text-sm font-black shadow-2xl shadow-slate-900/40 shrink-0 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
          {index}
        </div>
        <div className="flex-1 flex items-center gap-4">
          <div className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] font-outfit italic bg-slate-100/50 px-4 py-1.5 rounded-full border border-slate-200/50 shadow-sm">
            {title || `Derivation Lead ${index}`}
          </div>
          <div className="h-[2px] bg-gradient-to-r from-slate-200 to-transparent flex-1"></div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.02)] relative overflow-hidden group/step hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] transition-all duration-700 ease-out">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] opacity-[0.03] pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500/20 to-transparent opacity-0 group-hover/step:opacity-100 transition-opacity duration-700" />
        <div className="relative z-10">
          <RenderWithMath text={content} className="text-xl md:text-2xl font-serif text-slate-800 leading-[1.9]" showOptions={false} />
        </div>
      </div>
    </div>
  );
};

export const RenderWithMath: React.FC<{ text: string, className?: string, showOptions?: boolean, serif?: boolean, autoSteps?: boolean, dark?: boolean }> = ({ text, className, showOptions = true, serif = true, autoSteps = false, dark = false }) => {
  if (!text) return null;

  // 1. Clean "Junk" from AI output
  // Restore real newlines if AI sent literal \n strings
  let cleanText = text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\n{3,}/g, '\n\n'); // Collapse excessive newlines

  // 2. Handle literal code-like patterns that might come from AI
  cleanText = cleanText.replace(/```latex([\s\S]*?)```/g, '$$$1$$');
  cleanText = cleanText.replace(/```math([\s\S]*?)```/g, '$$$1$$');

  // 3. Auto-detect steps if text is long and has numbering markers
  if (autoSteps && cleanText.length > 200) {
    const stepMarkers = cleanText.match(/(?:^|\n)(?:\d+\.|\*\*Step \d+:\*\*|### Step \d+)\s*(.*?)(?=\n(?:\d+\.|\*\*Step \d+:\*\*|### Step \d+)\s*|$)/gs);
    if (stepMarkers && stepMarkers.length > 1) {
      return (
        <div className="space-y-4">
          {stepMarkers.map((step, idx) => {
            const titleMatch = step.match(/(?:\d+\.|\*\*Step \d+:\*\*|### Step \d+)\s*(.*?)\n/i);
            const title = titleMatch ? titleMatch[1].trim() : `Step ${idx + 1}`;
            const content = step.replace(/(?:\d+\.|\*\*Step \d+:\*\*|### Step \d+)\s*(.*?)\n/i, '').trim();
            return <DerivationStep key={idx} index={idx + 1} title={title} content={content} />;
          })}
        </div>
      );
    }
  }

  // 4. Extract options if they are embedded in the text
  const optionMatches = cleanText.match(/\(([1-4A-D])\).*?(?=\([1-4A-D]\)|$)/gs);

  // Remove extracted options from main text if showOptions is true (to avoid double rendering)
  if (showOptions && optionMatches) {
    optionMatches.forEach(opt => {
      cleanText = cleanText.replace(opt, '');
    });
  }

  // 5. Split by newlines to handle paragraphs
  const paragraphs = cleanText.split('\n').filter(p => p.trim().length > 0);

  const hasCustomColor = className?.includes('text-');

  return (
    <div className={`prose prose-slate max-w-none ${serif ? 'font-serif' : 'font-instrument'} ${className}`}>
      <div className="space-y-4">
        {paragraphs.map((p, i) => {
          // Detect if paragraph is entirely a math block
          if (p.trim().startsWith('$$') && p.trim().endsWith('$$')) {
            return (
              <div key={i} className={`my-8 p-8 border-2 rounded-[2rem] shadow-xl relative group/math overflow-hidden ${dark ? 'bg-slate-900/50 border-white/10' : 'bg-slate-50/50 border-primary-500/10'}`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] opacity-[0.05] pointer-events-none" />
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-primary-500/10 border-b border-l border-primary-500/20 rounded-bl-xl text-[8px] font-black text-primary-600 uppercase tracking-widest font-outfit">Equation Vault</div>
                <MathRenderer expression={p.trim().slice(2, -2)} displayMode={true} className={dark ? 'text-white' : (hasCustomColor ? '' : 'text-slate-900')} />
              </div>
            );
          }

          // Mixed text and math parsing
          const parts = p.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);

          return (
            <div key={i} className={`leading-[1.9] ${serif ? 'text-lg md:text-xl' : 'text-base font-medium'} ${dark ? 'text-white shrink-0' : (hasCustomColor ? '' : 'text-slate-800')}`}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                  return (
                    <div key={pIdx} className={`my-10 p-10 border-2 rounded-[3rem] shadow-2xl relative group/math overflow-hidden ${dark ? 'bg-slate-900/50 border-white/10' : 'bg-slate-50/50 border-primary-500/10'}`}>
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] opacity-[0.05] pointer-events-none" />
                      <div className="absolute top-0 right-0 px-6 py-2 bg-primary-600/10 border-b border-l border-primary-500/20 rounded-bl-3xl text-[10px] font-black text-primary-700 uppercase tracking-[0.2em] font-outfit">Formula Insight</div>
                      <MathRenderer expression={part.slice(2, -2)} displayMode={true} className={dark ? 'text-white' : ''} />
                    </div>
                  );
                }
                if (part.startsWith('$') && part.endsWith('$')) {
                  return <MathRenderer key={pIdx} expression={part.slice(1, -1)} inline={true} className="bg-primary-50 px-1 rounded mx-0.5 border border-primary-100/50 text-primary-900 font-bold" />;
                }

                // Fallback for raw LaTeX commands not wrapped in $
                const rawTriggers = ['\\frac', '\\sqrt', '\\sum', '\\int', '\\alpha', '\\beta', '\\gamma', '\\theta', '\\pi', '\\ce{'];
                if (rawTriggers.some(t => part.includes(t)) && (part.includes('{') || part.includes('_') || part.includes('^'))) {
                  return <MathRenderer key={pIdx} expression={part} inline={true} />;
                }

                return <span key={pIdx}>{part}</span>;
              })}
            </div>
          );
        })}
      </div>

      {showOptions && optionMatches && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 pt-12 border-t border-slate-200/50">
          {optionMatches.map((opt, i) => {
            const labelMatch = opt.match(/\(([1-4A-D])\)/);
            const label = labelMatch ? labelMatch[1] : (i + 1).toString();
            const content = opt.replace(/\([1-4A-D]\)/, '').trim();
            return (
              <div key={i} className="flex gap-4 p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-primary-200 transition-all group/opt">
                <div className="w-12 h-12 rounded-xl bg-slate-950 text-white flex items-center justify-center text-xs font-black shrink-0 group-hover/opt:bg-primary-600 transition-colors shadow-2xl shadow-slate-900/10 transform -rotate-2 group-hover/opt:rotate-0">{label}</div>
                <div className="text-sm font-bold text-slate-800 pt-3 flex-1 leading-relaxed">
                  <RenderWithMath text={content} showOptions={false} serif={false} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MathRenderer;