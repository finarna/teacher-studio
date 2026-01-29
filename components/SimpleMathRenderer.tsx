/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIMPLIFIED MATH RENDERER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Based on working Google AI Studio experiments
 * Handles $$...$$ (display) and $...$ (inline) math delimiters
 */

import React, { useEffect, useState } from 'react';

interface SimpleMathRendererProps {
  text: string;
  className?: string;
}

const SimpleMathRenderer: React.FC<SimpleMathRendererProps> = ({ text, className = '' }) => {
  const [isKatexLoaded, setIsKatexLoaded] = useState(false);

  // Poll for KaTeX availability
  useEffect(() => {
    if ((window as any).katex) {
      setIsKatexLoaded(true);
      return;
    }

    const intervalId = setInterval(() => {
      if ((window as any).katex) {
        setIsKatexLoaded(true);
        clearInterval(intervalId);
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, []);

  if (!isKatexLoaded) {
    return <span className={className}>{text}</span>;
  }

  // Regex to match $$...$$ (display mode) or $...$ (inline mode)
  // We use capture groups to split the text while keeping the parts
  const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
  const parts = text.split(regex);

  return (
    <span className={`math-content block ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // Display Mode
          const latex = part.slice(2, -2).trim();
          try {
            const html = (window as any).katex.renderToString(latex, {
              throwOnError: false,
              displayMode: true,
              strict: false
            });
            return (
              <div
                key={index}
                className="overflow-x-auto overflow-y-hidden py-2 my-1 text-center"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            console.error("KaTeX Error (Block):", e);
            return <div key={index} className="text-red-500 font-mono text-sm">{latex}</div>;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          // Inline Mode
          const latex = part.slice(1, -1).trim();
          try {
            const html = (window as any).katex.renderToString(latex, {
              throwOnError: false,
              displayMode: false,
              strict: false
            });
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            console.error("KaTeX Error (Inline):", e);
            return <span key={index} className="text-red-500 font-mono text-sm">{latex}</span>;
          }
        } else {
          // Plain Text
          return <span key={index}>{part}</span>;
        }
      })}
    </span>
  );
};

export default SimpleMathRenderer;
