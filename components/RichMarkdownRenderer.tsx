/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RICH MARKDOWN RENDERER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Enhanced renderer for Vidya responses with support for:
 * - Math equations ($$...$$ and $...$)
 * - Markdown tables
 * - Headers, bold, italic
 * - Lists (ordered and unordered)
 * - Code blocks
 * - Emojis and visual indicators
 */

import React, { useEffect, useState } from 'react';

interface RichMarkdownRendererProps {
  text: string;
  className?: string;
  textSize?: string; // e.g. 'text-lg'
}

const RichMarkdownRenderer: React.FC<RichMarkdownRendererProps> = ({ text, className = '', textSize = 'text-sm' }) => {
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

  const renderContent = () => {
    const mathPlaceholders: { [key: string]: string } = {};
    let placeholderCounter = 0;

    // CRITICAL FIX: Normalize line breaks. Handle literal \n or \\n strings
    // as well as real newlines.
    let processedText = text
      .replace(/\\n/g, '\n')
      .replace(/\\\\n/g, '\n');

    // Extract all math expressions and replace with placeholders
    // Expanded regex to catch $$, $, \[, \], \(, \)
    let protectedText = processedText.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g, (match) => {
      const placeholder = `__MATH_PLACEHOLDER_${placeholderCounter}__`;
      mathPlaceholders[placeholder] = match;
      placeholderCounter++;
      return placeholder;
    });

    // Now split by lines (math is protected)
    const lines = protectedText.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Skip empty lines
      if (!line.trim()) {
        elements.push(<div key={`empty-${i}`} className="h-2" />);
        i++;
        continue;
      }

      // Markdown Table Detection
      if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|')) {
        const tableLines: string[] = [];
        let j = i;
        while (j < lines.length && lines[j].includes('|')) {
          tableLines.push(lines[j]);
          j++;
        }

        if (tableLines.length >= 2) {
          elements.push(renderTable(tableLines, i));
          i = j;
          continue;
        }
      }

      // Code Block Detection (```)
      if (line.trim().startsWith('```')) {
        const codeLines: string[] = [];
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('```')) {
          codeLines.push(lines[j]);
          j++;
        }
        elements.push(renderCodeBlock(codeLines, i));
        i = j + 1;
        continue;
      }

      // Headers
      if (line.startsWith('###')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-bold mt-4 mb-2 text-slate-900">
            {renderInline(line.replace(/^###\s*/, ''), mathPlaceholders)}
          </h3>
        );
        i++;
        continue;
      }

      if (line.startsWith('##')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg font-bold mt-4 mb-2 text-slate-900">
            {renderInline(line.replace(/^##\s*/, ''), mathPlaceholders)}
          </h2>
        );
        i++;
        continue;
      }

      // Unordered List
      if (line.match(/^[\s]*[-*]\s/)) {
        const listItems: string[] = [];
        let j = i;
        while (j < lines.length && lines[j].match(/^[\s]*[-*]\s/)) {
          listItems.push(lines[j].replace(/^[\s]*[-*]\s/, ''));
          j++;
        }
        elements.push(
          <ul key={`ul-${i}`} className="list-disc list-inside my-2 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx} className={textSize}>
                {renderInline(item, mathPlaceholders)}
              </li>
            ))}
          </ul>
        );
        i = j;
        continue;
      }

      // Ordered List
      if (line.match(/^[\s]*\d+\.\s/)) {
        const listItems: string[] = [];
        let j = i;
        while (j < lines.length && lines[j].match(/^[\s]*\d+\.\s/)) {
          listItems.push(lines[j].replace(/^[\s]*\d+\.\s/, ''));
          j++;
        }
        elements.push(
          <ol key={`ol-${i}`} className="list-decimal list-inside my-2 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx} className={textSize}>
                {renderInline(item, mathPlaceholders)}
              </li>
            ))}
          </ol>
        );
        i = j;
        continue;
      }

      // Horizontal Rule
      if (line.match(/^[\s]*---[\s]*$/)) {
        elements.push(<hr key={`hr-${i}`} className="my-3 border-slate-300" />);
        i++;
        continue;
      }

      // Regular paragraph
      const isComponentInline = className.includes('inline');
      if (i === 0 && isComponentInline) {
        elements.push(
          <span key={`p-${i}`} className={`${textSize} leading-relaxed font-outfit text-slate-700`}>
            {renderInline(line, mathPlaceholders)}
          </span>
        );
      } else {
        elements.push(
          <div key={`p-${i}`} className={`${textSize} leading-relaxed my-1.5 font-outfit text-slate-700`}>
            {renderInline(line, mathPlaceholders)}
          </div>
        );
      }
      i++;
    }

    return elements;
  };

  const renderTable = (tableLines: string[], key: number) => {
    const rows = tableLines.map((line) =>
      line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0)
    );

    const headers = rows[0];
    const dataRows = rows.slice(2); // Skip header and separator line

    return (
      <div key={`table-${key}`} className="my-3 overflow-x-auto">
        <table className="min-w-full border-collapse border border-slate-300 text-xs">
          <thead className="bg-slate-100">
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700"
                >
                  {renderInline(header, {})}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-50">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="border border-slate-300 px-3 py-2">
                    {renderInline(cell, {})}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCodeBlock = (codeLines: string[], key: number) => {
    return (
      <pre
        key={`code-${key}`}
        className="bg-slate-800 text-slate-100 p-3 rounded-lg my-2 overflow-x-auto text-xs font-mono"
      >
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
  };

  const renderInline = (text: string, mathPlaceholders?: { [key: string]: string }): React.ReactNode => {
    // Restore math expressions from placeholders
    let processedText = text;
    if (mathPlaceholders) {
      Object.keys(mathPlaceholders).forEach((placeholder) => {
        processedText = processedText.replace(placeholder, mathPlaceholders[placeholder]);
      });
    }

    // Handle math first
    // Expanded regex to catch $$, $, \[, \], \(, \)
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\s\n\$][^\$]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
    const parts = processedText.split(mathRegex);

    return parts.map((part, index) => {
      // Display Math $$...$$ or \[...\]
      const isDisplay = (part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('\\\[') && part.endsWith('\\\]'));
      const isInline = !isDisplay && ((part.startsWith('$') && part.endsWith('$')) || (part.startsWith('\\\(') && part.endsWith('\\\)')));

      if (isDisplay && isKatexLoaded) {
        const latex = (part.startsWith('$$') ? part.slice(2, -2) : part.slice(2, -2)).trim();
        try {
          const html = (window as any).katex.renderToString(latex, {
            throwOnError: false,
            displayMode: true,
            strict: false,
            trust: true, // Enable \ce{} and other chemistry commands
            macros: {
              '\\ce': '\\ce', // Chemistry notation support
              '\\pu': '\\pu', // Physical units support
            },
          });
          return (
            <span
              key={index}
              className="block my-2 text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
          return <span key={index} className="text-red-500 font-mono">{latex}</span>;
        }
      }

      // Inline Math $...$ or \(...\)
      if (isInline && isKatexLoaded) {
        const latex = (part.startsWith('$') ? part.slice(1, -1) : part.slice(2, -2)).trim();
        try {
          const html = (window as any).katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
            strict: false,
            trust: true, // Enable \ce{} and other chemistry commands
            macros: {
              '\\ce': '\\ce', // Chemistry notation support
              '\\pu': '\\pu', // Physical units support
            },
          });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch (e) {
          return <span key={index} className="text-red-500 font-mono">{latex}</span>;
        }
      }

      // Handle other markdown inline elements
      return <span key={index}>{renderMarkdownInline(part)}</span>;
    });
  };

  const renderMarkdownInline = (text: string): React.ReactNode => {
    // Bold + Italic ***text***
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // Bold **text**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Inline code `text`
    text = text.replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded-sm font-semibold border-none" style="background-color: transparent !important; color: inherit !important;">$1</code>');

    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  const isComponentInline = className.includes('inline');

  return isComponentInline ? (
    <span className={`rich-markdown inline ${className}`}>
      {renderContent()}
    </span>
  ) : (
    <div className={`rich-markdown ${className}`}>
      {renderContent()}
    </div>
  );
};

export default RichMarkdownRenderer;
