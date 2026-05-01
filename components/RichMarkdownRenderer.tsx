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
}

const RichMarkdownRenderer: React.FC<RichMarkdownRendererProps> = ({ text, className = '' }) => {
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
    // CRITICAL FIX: Handle literal \n strings that might come from double-escaped JSON
    let processedText = text.replace(/\\n/g, '\n');

    // NEW: Transform LaTeX tabular Match-the-Following into standard list format before other cleanups
    // This handles the case where Column I and Column II items are on the same line separated by &
    processedText = processedText.replace(/\\begin\{tabular\}.*?Column\s*I.*?Column\s*II.*?\\\\(.*?)\\end\{tabular\}/gsi, (match, content) => {
      const rows = content.split(/\\\\|\\hline/).filter(r => r.trim() && r.includes('&'));
      const col1: string[] = [];
      const col2: string[] = [];
      rows.forEach(row => {
        const parts = row.split('&');
        if (parts.length >= 2) {
          col1.push(parts[0].trim());
          col2.push(parts[1].trim());
        }
      });
      return `\nColumn I\n${col1.join('\n')}\nColumn II\n${col2.join('\n')}\n`;
    });

    // NEW: Strip LaTeX environment tags and common formatting artifacts
    processedText = processedText
      .replace(/\\begin\{itemize\}/g, '')
      .replace(/\\end\{itemize\}/g, '')
      .replace(/\\begin\{tabular\}\{.*?\}/g, '')
      .replace(/\\end\{tabular\}/g, '')
      .replace(/\\hline/g, '')
      .replace(/\\item\s*\[(.*?)\]/g, '$1') // Convert \item [Label] to Label
      .replace(/\\item/g, '')               // Strip remaining \item tags
      .replace(/\\text\{.*?\}/g, (m) => m.slice(6, -1)) // Strip \text{} wrapper but keep content
      .replace(/\\textbf\{(.*?)\}/g, '**$1**')           // Convert to Markdown Bold
      .replace(/\\textit\{(.*?)\}/g, '*$1*')             // Convert to Markdown Italic
      .replace(/\\underline\{(.*?)\}/g, '_$1_')          // Convert to Markdown Underline
      .replace(/\\\\/g, '\n')               // Convert LaTeX newlines to actual newlines
      .replace(/&/g, ' ');                  // Remove LaTeX table column separators (default fallback)

    // CRITICAL FIX: Extract and protect math expressions BEFORE splitting by lines
    // This prevents multi-line math from being broken up
    const mathPlaceholders: { [key: string]: string } = {};
    let placeholderCounter = 0;

    // Extract all math expressions and replace with placeholders
    processedText = processedText.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (match) => {
      const placeholder = `__MATH_PLACEHOLDER_${placeholderCounter}__`;
      mathPlaceholders[placeholder] = match;
      placeholderCounter++;
      return placeholder;
    });

    // Now split by lines (math is protected)
    const lines = processedText.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        elements.push(<div key={`empty-${i}`} className="h-1" />);
        i++;
        continue;
      }

      // Markdown Table Detection
      if (trimmedLine.includes('|') && i + 1 < lines.length && (lines[i + 1].includes('|') || lines[i+1].includes('---'))) {
        const tableLines: string[] = [];
        let j = i;
        while (j < lines.length && (lines[j].includes('|') || lines[j].includes('---'))) {
          tableLines.push(lines[j]);
          j++;
        }

        if (tableLines.length >= 2) {
          elements.push(renderTable(tableLines, i));
          i = j;
          continue;
        }
      }

      // Match-the-Following (Column I / Column II) Detection
      // Robust detection for "Column I", "Column I:", "[Column I]", etc.
      if (trimmedLine.match(/Column\s+I/i) && i + 1 < lines.length) {
        // Look ahead for Column II
        let column2Index = -1;
        for (let k = i + 1; k < Math.min(i + 15, lines.length); k++) {
          if (lines[k].match(/Column\s+II/i)) {
            column2Index = k;
            break;
          }
        }

        if (column2Index !== -1) {
          // Extract items for Column I and Column II
          const col1Items: string[] = lines.slice(i + 1, column2Index).filter(l => l.trim());
          
          // Find where Column II ends (usually next empty line or header)
          let col2End = column2Index + 1;
          while (col2End < lines.length && lines[col2End].trim() && !lines[col2End].includes('|') && !lines[col2End].startsWith('###')) {
            col2End++;
          }
          const col2Items: string[] = lines.slice(column2Index + 1, col2End).filter(l => l.trim());

          elements.push(
            <div key={`match-${i}`} className="my-4 bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100/80">
                <div className="px-4 py-2 font-bold text-xs uppercase tracking-wider text-slate-600 border-r border-slate-200">Column I</div>
                <div className="px-4 py-2 font-bold text-xs uppercase tracking-wider text-slate-600">Column II</div>
              </div>
              <div className="grid grid-cols-2 min-h-[100px]">
                <div className="p-4 border-r border-slate-200 space-y-2">
                  {col1Items.map((item, idx) => (
                    <div key={idx} className="text-sm flex gap-2">
                      <span className="font-bold text-indigo-600 min-w-[20px]">{renderInline(item, mathPlaceholders)}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 space-y-2">
                  {col2Items.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      {renderInline(item, mathPlaceholders)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
          i = col2End;
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
              <li key={idx} className="text-sm">
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
              <li key={idx} className="text-sm">
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
      elements.push(
        <p key={`p-${i}`} className="text-sm leading-relaxed my-1">
          {renderInline(line, mathPlaceholders)}
        </p>
      );
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
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
    const parts = processedText.split(mathRegex);

    return parts.map((part, index) => {
      // Display Math $$...$$
      if (part.startsWith('$$') && part.endsWith('$$') && isKatexLoaded) {
        const latex = part.slice(2, -2).trim();
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

      // Inline Math $...$
      const isKatexActuallyAvailable = typeof (window as any).katex !== 'undefined';
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2 && (isKatexLoaded || isKatexActuallyAvailable)) {
        const latex = part.slice(1, -1).trim();
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
    text = text.replace(/`(.*?)`/g, '<code class="bg-slate-200 px-1 py-0.5 rounded text-xs font-mono">$1</code>');

    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  return (
    <div className={`rich-markdown ${className}`}>
      {renderContent()}
    </div>
  );
};

export default RichMarkdownRenderer;
