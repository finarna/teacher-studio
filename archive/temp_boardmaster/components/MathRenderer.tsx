
import React, { useEffect, useState, useMemo } from 'react';

interface MathRendererProps {
  text: string;
  className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  const [isKatexLoaded, setIsKatexLoaded] = useState(false);

  useEffect(() => {
    const checkKatex = () => {
      if ((window as any).katex) {
        setIsKatexLoaded(true);
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

  const renderedContent = useMemo(() => {
    if (typeof text !== 'string' || !text) return null;
    if (!isKatexLoaded) return <span className="opacity-70">{text}</span>;

    // Regex to match $$...$$ (display) or $...$ (inline), ensuring we don't trip on escaped dollars
    const regex = /(\$\$[\s\S]*?\$\$|\$(?!\s)[\s\S]*?(?<!\s)\$)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;
      
      const isDisplay = part.startsWith('$$') && part.endsWith('$$');
      const isInline = !isDisplay && part.startsWith('$') && part.endsWith('$');

      if (isDisplay || isInline) {
        const latex = isDisplay ? part.slice(2, -2).trim() : part.slice(1, -1).trim();
        try {
          const html = (window as any).katex.renderToString(latex, {
            throwOnError: false,
            displayMode: isDisplay,
            strict: false,
            trust: true,
            macros: {
              "\\ce": "\\ce" // Support for mhchem if loaded
            }
          });
          return (
            <span 
              key={index} 
              className={isDisplay ? "block w-full overflow-x-auto my-4 py-2 text-center no-scrollbar" : "inline-block px-0.5"}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
          return <span key={index} className="text-rose-500 font-mono text-[10px] border border-rose-200 px-1 rounded">{latex}</span>;
        }
      }
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  }, [text, isKatexLoaded]);

  return (
    <div className={`math-renderer break-words leading-relaxed ${className}`}>
      {renderedContent}
    </div>
  );
};

export default MathRenderer;
