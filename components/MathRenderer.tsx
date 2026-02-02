import React, { useEffect, useRef } from 'react';
import { LATEX_MACROS, LATEX_PATTERNS } from '../utils/mathLatexReference';

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
        let cleanExpression = rawExpression
          .replace(/\n/g, ' ')      // Remove actual newline characters (NOT \n in LaTeX)
          .replace(/\r/g, '')       // Remove actual carriage returns (NOT \r in LaTeX)
          .replace(/\s+/g, ' ')
          .trim();

        // Fix common LaTeX errors
        // 1. Fix invalid superscript+spacing: \,^\circ → ^\circ
        cleanExpression = cleanExpression.replace(/\\,\s*\^\\circ/g, '^\\circ');

        // 2. Fix double superscripts: 10^{-5}^\circ → 10^{-5\circ}
        cleanExpression = cleanExpression.replace(/\^(\{[^}]+\})\s*\^(\{[^}]+\})/g, '^{$1$2}');
        cleanExpression = cleanExpression.replace(/\^(\{[^}]+\})\s*\^(\\[a-zA-Z]+)/g, '^{$1$2}');

        // 3. Fix \begin{tabular} → \begin{array} (KaTeX doesn't support tabular)
        cleanExpression = cleanExpression.replace(/\\begin\{tabular\}/g, '\\begin{array}');
        cleanExpression = cleanExpression.replace(/\\end\{tabular\}/g, '\\end{array}');

        // 2. Detect incomplete table rows (has & and \\ but no array wrapper)
        // If expression contains & and ends with \\, wrap it in array
        if (cleanExpression.includes('&') && cleanExpression.trim().endsWith('\\\\')) {
          // Don't auto-wrap if already in array/matrix/aligned environment
          if (!cleanExpression.includes('\\begin{') && !cleanExpression.includes('\\end{')) {
            // Skip wrapping - these are likely fragments that shouldn't be rendered alone
            // Just render as-is and KaTeX will show error (better than corrupting valid math)
            console.warn('⚠️ Detected table fragment without array wrapper:', cleanExpression.substring(0, 50));
          }
        }

        const html = window.katex.renderToString(cleanExpression, {
          throwOnError: false,
          displayMode: isDisplayMode,
          output: 'html',
          strict: false,
          trust: true,
          macros: LATEX_MACROS
        });

        // Only log actual KaTeX errors (katex-error class means parsing failed)
        if (html.includes('katex-error')) {
          console.error('❌ KaTeX parse error:', {
            expression: cleanExpression.substring(0, 100)
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
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [isCopied, setIsCopied] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700 group/container">
      {/* Step Header - Always Visible */}
      <div
        className="flex items-center gap-4 mb-3 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Step Number Badge */}
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center text-sm font-black shadow-lg shrink-0 transition-all duration-300 ${
          isExpanded ? 'scale-100' : 'scale-90 opacity-70'
        } ${isHovered ? 'ring-4 ring-primary-500/20' : ''}`}>
          {index}
        </div>

        {/* Title */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className={`text-[11px] font-bold text-slate-700 uppercase tracking-wider font-outfit transition-colors duration-300 truncate ${
            isHovered ? 'text-slate-900' : ''
          }`}>
            {title || `Step ${index}`}
          </div>
          {!isExpanded && (
            <div className="text-[9px] text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
              Click to expand
            </div>
          )}
        </div>

        {/* Expand/Collapse Icon */}
        <div className={`transition-transform duration-300 text-slate-400 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Step Content - Collapsible */}
      <div className={`transition-all duration-500 ease-out ${
        isExpanded ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0 overflow-hidden'
      }`}>
        <div className="ml-13 relative group/step">
          {/* Connecting Line */}
          <div className="absolute left-[-26px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />

          {/* Content Card */}
          <div className="bg-gradient-to-br from-white to-slate-50/30 border border-slate-200/60 rounded-2xl p-6 md:p-7 shadow-sm hover:shadow-md relative overflow-hidden transition-all duration-500">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] opacity-[0.02] pointer-events-none" />

            {/* Top Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />

            {/* Action Buttons - Show on Hover */}
            <div className={`absolute top-3 right-3 flex items-center gap-1.5 transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                className="p-1.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm group/btn"
                title="Copy step"
              >
                {isCopied ? (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-600 group-hover/btn:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Math Content */}
            <div className="relative z-10 pr-12">
              <RenderWithMath text={content} className="text-lg md:text-xl font-serif text-slate-800 leading-[1.85]" showOptions={false} />
            </div>
          </div>
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
  compact?: boolean,
  correctOptionIndex?: number
}> = ({ text, className, showOptions = true, serif = true, autoSteps = false, dark = false, compact = false, correctOptionIndex }) => {
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
              <div key={i} className="my-6 relative group/math">
                <div className="bg-gradient-to-br from-white via-slate-50/40 to-white border border-slate-200/70 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                  {/* Subtle Grid Background */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] opacity-[0.015] pointer-events-none" />

                  {/* Top Accent Line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-500/20 via-primary-500/40 to-primary-500/20" />

                  {/* Formula Insight Badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-primary-500/10 backdrop-blur-sm border border-primary-500/20 rounded-lg">
                    <div className="text-[9px] font-bold text-primary-700 uppercase tracking-wide font-outfit flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Formula
                    </div>
                  </div>

                  {/* Math Content */}
                  <div className="relative z-10 pt-2">
                    <MathRenderer expression={p.trim().slice(2, -2)} displayMode={true} className={hasCustomColor ? '' : 'text-slate-900'} />
                  </div>
                </div>
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
                    <div key={pIdx} className="my-6 relative group/math">
                      <div className="bg-gradient-to-br from-white via-slate-50/40 to-white border border-slate-200/70 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                        {/* Subtle Grid Background */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] opacity-[0.015] pointer-events-none" />

                        {/* Top Accent Line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-500/20 via-primary-500/40 to-primary-500/20" />

                        {/* Formula Insight Badge */}
                        <div className="absolute top-3 right-3 px-2.5 py-1 bg-primary-500/10 backdrop-blur-sm border border-primary-500/20 rounded-lg">
                          <div className="text-[9px] font-bold text-primary-700 uppercase tracking-wide font-outfit flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Formula
                          </div>
                        </div>

                        {/* Math Content */}
                        <div className="relative z-10 pt-2">
                          <MathRenderer expression={part.slice(2, -2)} displayMode={true} className={dark ? 'text-white' : ''} />
                        </div>
                      </div>
                    </div>
                  );
                }
                if ((part.startsWith('$') && part.endsWith('$')) || (compact && part.startsWith('$$') && part.endsWith('$$'))) {
                  const expr = part.startsWith('$$') ? part.slice(2, -2) : part.slice(1, -1);
                  return <MathRenderer key={pIdx} expression={expr} inline={true} className={`font-bold ${dark ? 'text-emerald-300' : 'text-primary-700'}`} />;
                }

                // Fallback for raw LaTeX commands not wrapped in $
                // Use shared LATEX_PATTERNS from mathLatexReference.ts
                const hasLatexCommand = LATEX_PATTERNS.some(t => part.includes(t));
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
            const isCorrect = correctOptionIndex !== undefined && i === correctOptionIndex;

            return (
              <div key={i} className={`flex gap-4 p-6 border rounded-[2rem] shadow-sm hover:shadow-xl transition-all group/opt relative ${
                isCorrect
                  ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300 hover:border-emerald-400'
                  : 'bg-white border-slate-100 hover:border-primary-200'
              }`}>
                {isCorrect && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center text-xs font-black shrink-0 transition-all shadow-2xl transform -rotate-2 group-hover/opt:rotate-0 ${
                  isCorrect
                    ? 'bg-emerald-600 group-hover/opt:bg-emerald-700 shadow-emerald-900/20'
                    : 'bg-slate-950 group-hover/opt:bg-primary-600 shadow-slate-900/10'
                }`}>{label}</div>
                <div className={`text-sm font-bold pt-3 flex-1 leading-relaxed ${
                  isCorrect ? 'text-emerald-900' : 'text-slate-800'
                }`}>
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