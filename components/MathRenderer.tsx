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
  const [katexReady, setKatexReady] = React.useState(false);
  const hasWarnedRef = useRef(false);

  // Check if KaTeX is loaded - single check on mount
  useEffect(() => {
    if (window.katex) {
      setKatexReady(true);
      return;
    }

    // If not loaded, wait and check periodically
    const maxAttempts = 50; // 5 seconds max
    let attempts = 0;

    const checkKatex = () => {
      attempts++;
      if (window.katex) {
        setKatexReady(true);
      } else if (attempts < maxAttempts) {
        setTimeout(checkKatex, 100);
      } else if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        console.error('❌ KaTeX failed to load after 5 seconds');
      }
    };

    checkKatex();
  }, []);

  useEffect(() => {
    if (!ref.current) return;

    if (!katexReady) {
      ref.current.innerText = rawExpression;
      return;
    }

    if (typeof rawExpression === 'string' && rawExpression.trim()) {
      try {
        const cleanExpression = rawExpression
          .replace(/\n/g, ' ')      // Remove actual newline characters (NOT \n in LaTeX)
          .replace(/\r/g, '')       // Remove actual carriage returns (NOT \r in LaTeX)
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

        // Check if KaTeX rendered an error (contains katex-error class or color="red")
        if (html.includes('katex-error') || html.includes('color:#cc0000') || html.includes('\\color{red}')) {
          console.error('❌ KaTeX PARSE ERROR detected in output:', {
            expression: cleanExpression.substring(0, 200),
            htmlSnippet: html.substring(0, 300)
          });
        }

        ref.current.innerHTML = html;
      } catch (error) {
        console.error('❌ KaTeX rendering error:', error, 'Expression:', rawExpression);
        ref.current.innerText = rawExpression.replace(/\$/g, '');
      }
    } else if (ref.current) {
      ref.current.innerText = rawExpression;
    }
  }, [rawExpression, isDisplayMode, katexReady]);

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

export const RenderWithMath: React.FC<{
  text: string,
  className?: string,
  showOptions?: boolean,
  serif?: boolean,
  autoSteps?: boolean,
  dark?: boolean,
  compact?: boolean
}> = ({ text, className, showOptions = true, serif = true, autoSteps = false, dark = false, compact = false }) => {
  if (!text) return null;

  // 1. Clean "Junk" from AI output
  // CRITICAL: Do NOT replace single backslashes - they're needed for LaTeX commands!
  // Only handle double-escaped sequences from JSON like \\n -> \n
  let cleanText = text
    .replace(/\\\\n/g, '\n')  // Double backslash-n to newline (from JSON)
    .replace(/\\\\r/g, '\r')  // Double backslash-r to carriage return (from JSON)
    .replace(/\\\\"/g, '"')   // Double backslash-quote to quote (from JSON)
    .replace(/\n{3,}/g, '\n\n'); // Collapse excessive newlines

  // 2. Convert LaTeX \(...\) to $...$ and \[...\] to $$...$$
  // Handle escaped backslashes first: \\( becomes \(
  cleanText = cleanText.replace(/\\\\\(/g, '<<<ESCAPED_PAREN>>>');
  cleanText = cleanText.replace(/\\\\\)/g, '<<<ESCAPED_PAREN_CLOSE>>>');
  cleanText = cleanText.replace(/\\\\\[/g, '<<<ESCAPED_BRACKET>>>');
  cleanText = cleanText.replace(/\\\\\]/g, '<<<ESCAPED_BRACKET_CLOSE>>>');

  // Now convert LaTeX delimiters to $ delimiters
  cleanText = cleanText.replace(/\\\(/g, '$');
  cleanText = cleanText.replace(/\\\)/g, '$');
  cleanText = cleanText.replace(/\\\[/g, '$$');
  cleanText = cleanText.replace(/\\\]/g, '$$');

  // Restore escaped versions
  cleanText = cleanText.replace(/<<<ESCAPED_PAREN>>>/g, '\\(');
  cleanText = cleanText.replace(/<<<ESCAPED_PAREN_CLOSE>>>/g, '\\)');
  cleanText = cleanText.replace(/<<<ESCAPED_BRACKET>>>/g, '\\[');
  cleanText = cleanText.replace(/<<<ESCAPED_BRACKET_CLOSE>>>/g, '\\]');

  // 3. Handle literal code-like patterns that might come from AI
  cleanText = cleanText.replace(/```latex([\s\S]*?)```/g, '$$$1$$');
  cleanText = cleanText.replace(/```math([\s\S]*?)```/g, '$$$1$$');

  // 4. MINIMAL cleanup - Don't corrupt the formulas!
  // The aggressive regex was BREAKING formulas, not fixing them

  // In compact mode (flashcards), AI might use $$ wrongly or too often.
  // Force everything to be inline by temporarily swapping $$ for $ if it's on a single line or if we want single paragraph flow.
  if (compact) {
    cleanText = cleanText.replace(/\$\$/g, '$');
  }

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
    <div className={`${compact ? '' : 'prose prose-slate max-w-none'} ${serif ? 'font-serif' : 'font-instrument'} ${className}`}>
      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        {paragraphs.map((p, i) => {
          // Detect if paragraph is entirely a math block
          if (p.trim().startsWith('$$') && p.trim().endsWith('$$')) {
            if (compact) {
              return (
                <div key={i} className="my-1.5 flex justify-center w-full">
                  <MathRenderer expression={p.trim().slice(2, -2)} displayMode={false} className={`scale-110 drop-shadow-sm ${dark ? 'text-white' : (hasCustomColor ? '' : 'text-slate-900')}`} />
                </div>
              );
            }
            return (
              <div key={i} className="my-8 p-8 border-2 rounded-[2rem] shadow-xl relative group/math overflow-hidden bg-slate-50/50 border-primary-500/10">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] opacity-[0.05] pointer-events-none" />
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-primary-500/10 border-b border-l border-primary-500/20 rounded-bl-xl text-[8px] font-black text-primary-600 uppercase tracking-widest font-outfit">Equation Vault</div>
                <MathRenderer expression={p.trim().slice(2, -2)} displayMode={true} className={hasCustomColor ? '' : 'text-slate-900'} />
              </div>
            );
          }

          // Mixed text and math parsing
          const parts = p.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);

          return (
            <div key={i} className={`leading-[1.9] ${serif ? 'text-lg md:text-xl' : 'text-base font-medium'} ${dark ? 'text-white shrink-0' : (hasCustomColor ? '' : 'text-slate-800')}`}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('$$') && part.endsWith('$$') && !compact) {
                  return (
                    <div key={pIdx} className="my-10 p-10 border-2 rounded-[3rem] shadow-2xl relative group/math overflow-hidden bg-slate-50/50 border-primary-500/10">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] opacity-[0.05] pointer-events-none" />
                      <div className="absolute top-0 right-0 px-6 py-2 bg-primary-600/10 border-b border-l border-primary-500/20 rounded-bl-3xl text-[10px] font-black text-primary-700 uppercase tracking-[0.2em] font-outfit">Formula Insight</div>
                      <MathRenderer expression={part.slice(2, -2)} displayMode={true} className={dark ? 'text-white' : ''} />
                    </div>
                  );
                }
                if ((part.startsWith('$') && part.endsWith('$')) || (compact && part.startsWith('$$') && part.endsWith('$$'))) {
                  const expr = part.startsWith('$$') ? part.slice(2, -2) : part.slice(1, -1);
                  return <MathRenderer key={pIdx} expression={expr} inline={true} className={`font-bold ${dark ? 'text-emerald-300' : 'text-primary-700'}`} />;
                }

                // Fallback for raw LaTeX commands not wrapped in $
                const rawTriggers = [
                  '\\frac', '\\sqrt', '\\sum', '\\int', '\\prod', '\\lim',
                  '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\theta', '\\lambda', '\\mu', '\\nu', '\\pi', '\\rho', '\\sigma', '\\tau', '\\phi', '\\omega',
                  '\\Delta', '\\Omega', '\\Theta', '\\Lambda', '\\Sigma', '\\Phi',
                  '\\ce{', '\\text{', '\\mathrm{', '\\mathbf{',
                  '\\times', '\\cdot', '\\infty', '\\partial', '\\nabla'
                ];
                // Detect LaTeX commands OR subscripts/superscripts with underscores/carets
                const hasLatexCommand = rawTriggers.some(t => part.includes(t));
                const hasSubSuperscript = /[a-zA-Z0-9]+[_^][{a-zA-Z0-9]/.test(part);

                if (hasLatexCommand || (hasSubSuperscript && (part.includes('{') || part.includes('_') || part.includes('^')))) {
                  return <MathRenderer key={pIdx} expression={part} inline={true} className={dark ? 'text-emerald-300' : 'text-primary-700'} />;
                }

                return <span key={pIdx} className="whitespace-normal">{part}</span>;
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