import React, { useEffect, useRef, useState, useMemo } from 'react';

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
  text?: string; // For RenderWithMath compatibility
}

/**
 * SIMPLE MathRenderer - Based on working boardmaster-ai version
 *
 * NO preprocessing, NO fixing, NO complexity
 * Just split on $, extract LaTeX, and render with KaTeX
 */
const MathRenderer: React.FC<MathRendererProps> = ({
  expression,
  content,
  text,
  inline = false,
  className = '',
  displayMode
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [katexReady, setKatexReady] = useState(false);

  // Support both single expression mode and full text mode
  // Ensure we have strings to avoid React render errors if objects are passed
  const getSafeString = (val: any): string => {
    if (typeof val === 'string') return val;
    if (!val) return '';
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  };

  const rawExpression = getSafeString(expression || content);
  const fullText = getSafeString(text || rawExpression);
  const isDisplayMode = displayMode !== undefined ? displayMode : !inline;

  // Also normalize the 'text' prop for the useMemo
  const safeText = getSafeString(text);

  // Check if KaTeX is loaded
  useEffect(() => {
    const checkKatex = () => {
      if (window.katex) {
        setKatexReady(true);
        return true;
      }
      return false;
    };

    if (!checkKatex()) {
      const intervalId = setInterval(() => {
        if (checkKatex()) clearInterval(intervalId);
      }, 50);
      return () => clearInterval(intervalId);
    }
  }, []);

  // Render single expression mode
  useEffect(() => {
    if (!ref.current || !katexReady || text) return; // Skip if in text mode

    if (rawExpression && typeof rawExpression === 'string') {
      try {
        window.katex.render(rawExpression.trim(), ref.current, {
          throwOnError: false,
          displayMode: isDisplayMode,
          trust: true,
          strict: false
        });
      } catch (error) {
        console.error('KaTeX render error:', error);
        ref.current.innerText = rawExpression;
      }
    }
  }, [rawExpression, isDisplayMode, katexReady, text]);

  // Render full text mode (with $ delimiters)
  const renderedContent = useMemo(() => {
    if (!safeText || !katexReady) {
      return <span className="opacity-70">{fullText}</span>;
    }

    // Normalized text to handle common AI extraction quirks
    let processedText = safeText
      .replace(/\\\\n/g, '\n')
      .replace(/\\\\/g, '\\');

    const hasMathDelimiters = /\$|\\\[|\\\(/.test(processedText);

    // HEURISTIC FIX: Only auto-wrap if the string is short (likely a math option) 
    // or contains high-confidence LaTeX commands.
    // Do NOT wrap long blocks of text (paragraphs) because KaTeX will strip all spaces.
    const containsHighConfLatex = /\\(frac|sqrt|int|sum|begin|lambda|alpha|beta|gamma|theta|omega|sigma|pi|delta|phi|psi|mu|nu|xi|tau|vec|hat|bar|tilde|int)/.test(processedText);
    const containsMathMarkers = /[\^_]|\{|\}/.test(processedText);
    const containsOperators = /[\+\-\=\/\*x<\>\(\)\[\]]/.test(processedText);
    const looksLikeMathVar = /[0-9][A-Z]|[A-Z][0-9]/.test(processedText);

    const isShort = processedText.length < 100;
    const hasManySpaces = (processedText.match(/\s/g) || []).length > 5;

    // Auto-wrap if no delimiters AND:
    // 1. It contains explicit LaTeX commands
    // 2. It's a short string that looks like math (markers + operators) and NOT a plain sentence
    const shouldAutoWrap = !hasMathDelimiters && (
      containsHighConfLatex ||
      (isShort && (containsMathMarkers || looksLikeMathVar) && !hasManySpaces) ||
      (isShort && containsMathMarkers && containsOperators)
    );

    if (shouldAutoWrap) {
      processedText = `$${processedText}$`;
    }

    // Regex to match $$...$$ (display), $...$ (inline), \[...\] (display), \(...\) (inline)
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
    const parts = processedText.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      const isDisplay = (part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('\\\[') && part.endsWith('\\\]'));
      const isInline = !isDisplay && ((part.startsWith('$') && part.endsWith('$')) || (part.startsWith('\\\(') && part.endsWith('\\\)')));

      if (isDisplay || isInline) {
        let latex = '';
        if (part.startsWith('$$')) latex = part.slice(2, -2);
        else if (part.startsWith('\\\[')) latex = part.slice(2, -2);
        else if (part.startsWith('$')) latex = part.slice(1, -1);
        else if (part.startsWith('\\\(')) latex = part.slice(2, -2);

        latex = latex.trim();

        try {
          const html = window.katex.renderToString(latex, {
            throwOnError: false,
            displayMode: isDisplay,
            strict: false,
            trust: true
          });
          return (
            <span
              key={index}
              className={isDisplay ? "block w-full overflow-x-auto my-2 py-1 text-center" : "inline-block px-0.5"}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
          return <span key={index} className="text-rose-500 font-mono text-xs">{latex}</span>;
        }
      }
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  }, [safeText, fullText, katexReady]);

  // If in text mode, return the rendered content
  if (text) {
    return (
      <div className={`math-renderer break-words leading-relaxed ${className}`}>
        {renderedContent}
      </div>
    );
  }

  // Otherwise return single expression mode
  return (
    <span
      ref={ref}
      className={`math-rendered ${className} ${isDisplayMode ? 'block my-4 text-center' : 'inline-block mx-0.5'}`}
    />
  );
};

/**
 * RenderWithMath - Simple wrapper for compatibility
 * Just renders text with math delimiters
 */
export const RenderWithMath: React.FC<{
  text: any; // Allow anything for robustness
  className?: string;
  showOptions?: boolean;
  serif?: boolean;
  autoSteps?: boolean;
  dark?: boolean;
  compact?: boolean;
}> = ({ text, className = '', serif = false }) => {
  if (text === null || text === undefined) return null;

  return <MathRenderer text={text} className={`${className} ${serif ? 'font-serif' : ''}`} />;
};

/**
 * DerivationStep - For step-by-step solutions
 */
export const DerivationStep: React.FC<{
  index: number;
  title?: string;
  content: string;
}> = ({ index, title, content }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700 group/container">
      <div
        className="flex items-center gap-4 mb-3 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center text-sm font-black shadow-lg shrink-0 transition-all duration-300 ${isExpanded ? 'scale-100' : 'scale-90 opacity-70'} ${isHovered ? 'ring-4 ring-primary-500/20' : ''}`}>
          {index}
        </div>
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className={`text-[11px] font-bold text-slate-700 uppercase tracking-wider font-outfit transition-colors duration-300 truncate ${isHovered ? 'text-slate-900' : ''}`}>
            {title || `Step ${index}`}
          </div>
          {!isExpanded && (
            <div className="text-[9px] text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
              Click to expand
            </div>
          )}
        </div>
        <div className={`transition-transform duration-300 text-slate-400 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div className={`transition-all duration-500 ease-out ${isExpanded ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
        <div className="ml-13 relative group/step">
          <div className="absolute left-[-26px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
          <div className="bg-gradient-to-br from-white to-slate-50/30 border border-slate-200/60 rounded-2xl p-6 md:p-7 shadow-sm hover:shadow-md relative overflow-hidden transition-all duration-500">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] opacity-[0.02] pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
            <div className={`absolute top-3 right-3 flex items-center gap-1.5 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
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
            <div className="relative z-10 pr-12 solution-step-content">
              <RenderWithMath text={content} className="text-lg md:text-xl font-serif text-slate-800 leading-[1.85]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathRenderer;
