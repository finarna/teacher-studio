import React, { useState, useRef } from 'react';
import { Download, FileText, ChevronRight, Printer, Sparkles } from 'lucide-react';
import { getPredictedPapers, PaperSet } from '../utils/predictedPapersData';
import { QuestionPaperTemplate } from './QuestionPaperTemplate';

// The library is now loaded via CDN in index.html for maximum compatibility
declare global {
    interface Window {
        html2pdf: any;
    }
}

/**
 * MockTestDashboard
 * A high-end dashboard to manage and download PLUS2AI official prediction papers.
 */
export const MockTestDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [papers] = useState<PaperSet[]>(getPredictedPapers());
    const [selectedPaper, setSelectedPaper] = useState<PaperSet | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const paperRef = useRef<HTMLDivElement>(null);

    const handleQuickPrint = (paper: PaperSet) => {
        setSelectedPaper(paper);
        setTimeout(() => {
            window.print();
            setSelectedPaper(null);
        }, 1500);
    };

    const handleProDownload = async (paper: PaperSet) => {
        const html2pdf = window.html2pdf;
        if (!html2pdf) {
            alert('Pro PDF engine loading... Please wait a second and try again.');
            return;
        }

        setSelectedPaper(paper);
        setIsGenerating(true);

        // FONT GUARD: Wait for all fonts (including KaTeX) to be ready
        try {
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
        } catch (e) {
            console.warn('Font loading check failed, proceeding with delay fallback', e);
        }

        // Expanded delay to ensure absolute stabilization of complex math
        setTimeout(async () => {
            if (!paperRef.current) return;

            const paperElement = paperRef.current.querySelector('.paper-container');
            if (!paperElement) return;

            // 1. CONSTRUCT TOTAL ISOLATION SANDBOX
            const paperHtml = paperElement.outerHTML;
            const cleanHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Outfit:wght@400;900&display=swap" rel="stylesheet">
                    <style>
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 210mm !important;
                            background: white !important;
                        }
                        .paper-container {
                            width: 210mm !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background-color: white !important;
                            box-shadow: none !important;
                            position: relative !important;
                            /* MASSIVE TILES TO PREVENT ANY CLIPPING */
                            background-image: url("data:image/svg+xml,%3Csvg width='1000' height='1000' viewBox='0 0 1000 1000' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' fill='%230a1a16' fill-opacity='0.06' font-family='Arial' font-size='28' font-weight='900' transform='rotate(-33, 500, 500)' text-anchor='middle' dominant-baseline='middle'%3EPlus2AI OFFICIAL PATTERN SIMULATION • 2026%3C/text%3E%3C/svg%3E") !important;
                            background-repeat: repeat !important;
                        }
                        .paper-header { padding: 2cm 2cm 1rem 2cm; border-bottom: 2px solid #0a1a16; position: relative; z-index: 2; }
                        .exam-meta { display: flex; justify-content: space-between; border: 1px solid #000; padding: 0.75rem 1rem; background-color: #fafafa; }
                        .paper-instructions { margin: 1rem 2cm 2.5rem 2cm; border: 1.5px solid #000; padding: 1rem 1.5rem; position: relative; z-index: 2; }
                        .questions-grid { padding: 0 2cm 4rem 2cm; position: relative; z-index: 2; }
                        .question-item { margin-bottom: 2.5rem; page-break-inside: avoid; break-inside: avoid; }
                        .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 2.5rem; padding-left: 1.5rem; }
                        .katex { font-size: 1.15em !important; }
                        /* THE GLUE: Absolute Fusion of matrix brackets */
                        .katex .delimsizing { 
                            transform: scaleY(1.05) !important; 
                            margin-top: -1px !important;
                            margin-bottom: -1px !important;
                        }
                        .katex .vlist-t { border-collapse: collapse !important; }
                        /* THE SVG MIRROR: Match the perfect HTML view */
                        /* We use borders for sharpness and margins for zero-smudge spacing */
                        .katex .mfrac .frac-line { 
                            border-bottom: 1.2pt solid black !important;
                            height: 1px !important; 
                            background-color: transparent !important;
                            display: block !important;
                            min-width: 100% !important;
                            margin: 3px 0 !important; /* Absolute prevention of smudging */
                        }
                        .katex .sqrt .sqrt-line { 
                            border-top: 1.2pt solid black !important;
                            height: 1px !important; 
                            background-color: transparent !important;
                            display: block !important;
                            margin-bottom: 2px !important;
                        }
                        /* Ensure proper gap in fractions */
                        .katex .mfrac { padding: 3px 0 !important; }
                        /* Hide any raw AI context blocks that might leak */
                        .rich-markdown [class*="graph-description"],
                        .rich-markdown [class*="ai-context"] {
                            display: none !important;
                        }
                    </style>
                </head>
                <body>
                    ${paperHtml}
                </body>
                </html>
            `;

            const opt = {
                margin: [10, 0, 35, 0],
                filename: `Plus2AI_${paper.subject}_KCET_2026_SET_${paper.setName}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 3.0, // HIGH FIDELITY STABILITY
                    useCORS: true,
                    letterRendering: true,
                    foreignObjectRendering: false, // STABLE ALIGNMENT
                    logging: true,
                    onclone: (clonedDoc: Document) => {
                        const paths = clonedDoc.querySelectorAll('.katex svg path');
                        paths.forEach(p => {
                            p.setAttribute('stroke-width', '40'); // Solid vector paths
                            p.setAttribute('stroke', 'black');
                            p.setAttribute('fill', 'black');
                        });
                    }
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            try {
                const pdfGenerator = html2pdf().set(opt).from(cleanHtml).toPdf().get('pdf').then((pdf: any) => {
                    const totalPages = pdf.internal.getNumberOfPages();
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();

                    for (let i = 1; i <= totalPages; i++) {
                        pdf.setPage(i);

                        // NO MANUAL OVERLAY WATERMARK HERE - IT'S NOW IN THE SANDBOX CSS

                        pdf.setFontSize(8);
                        pdf.setTextColor(120);
                        pdf.text('Official Pattern Simulation. Reproduction strictly prohibited. © 2026 Plus2AI.', 20, pageHeight - 10);
                        pdf.text(`KCET 2026 Mock Test | SET ${paper.setName} | Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
                        pdf.setDrawColor(200);
                        pdf.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
                    }
                });

                await pdfGenerator.save();
            } catch (err) {
                console.error('PDF Generation failed:', err);
            } finally {
                setIsGenerating(false);
            }
        }, 4500); 
    };

    /**
     * handlePopOutPrint
     * The NUCLEAR OPTION: Opens the paper in a clean NEW window and prints from there.
     * This is 100% immune to dashboard CSS issues and blank previews.
     */
    const handlePopOutPrint = (paper: PaperSet) => {
        setSelectedPaper(paper);
        
        // Give UI a moment to render the template
        setTimeout(() => {
            if (!paperRef.current) return;
            const paperElement = paperRef.current.querySelector('.paper-container');
            if (!paperElement) return;

            const paperHtml = paperElement.outerHTML;
            const cleanHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Plus2AI Mock Test - ${paper.subject} SET ${paper.setName}</title>
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Outfit:wght@400;900&display=swap" rel="stylesheet">
                    <style>
                        @media print {
                            body { margin: 0; padding: 0; }
                            @page { margin: 10mm; }
                        }
                        html, body {
                            margin: 0 !important; padding: 0 !important;
                            background: white !important;
                            font-family: 'Inter', sans-serif;
                        }
                        .paper-container {
                            width: 210mm; margin: 0 auto; padding: 0;
                            background-color: white !important;
                            position: relative !important;
                            background-image: url("data:image/svg+xml,%3Csvg width='800' height='800' viewBox='0 0 1000 1000' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' fill='%230a1a16' fill-opacity='0.05' font-family='Arial' font-size='30' font-weight='900' transform='rotate(-30, 500, 500)' text-anchor='middle'%3EPlus2AI OFFICIAL PATTERN SIMULATION%3C/text%3E%3C/svg%3E") !important;
                            background-repeat: repeat !important;
                        }
                        .paper-header { padding: 2cm 2cm 1rem 2cm; border-bottom: 2px solid #0a1a16; }
                        .exam-meta { display: flex; justify-content: space-between; border: 1px solid #000; padding: 0.75rem 1rem; }
                        .paper-instructions { margin: 1rem 2cm 2.5rem 2cm; border: 1.5px solid #000; padding: 1rem 1.5rem; }
                        .questions-grid { padding: 0 2cm 4rem 2cm; }
                        .question-item { margin-bottom: 2.5rem; page-break-inside: avoid; }
                        /* Forces question number and text to stay on same line */
                        .question-text { 
                            display: flex !important; 
                            align-items: flex-start !important; 
                            gap: 0.5rem !important; 
                            margin-bottom: 0.5rem !important;
                        }
                        .question-text div { display: inline !important; }
                        .question-text p { display: inline !important; margin: 0 !important; }
                        
                        /* Vertical gap between question and its options */
                        .options-grid { 
                            display: grid; 
                            grid-template-columns: 1fr 1fr; 
                            gap: 0.5rem 2.5rem; 
                            padding-left: 1.5rem; 
                            margin-top: 0.8rem !important;
                        }
                        
                        /* SURGICAL LIFT: Fixes 'Sinking' Alignment in Print */
                        .katex { font-size: 1.15em !important; }
                        .katex .delimsizing { transform: scaleY(1.05) !important; margin-top: -1px !important; }
                        
                        .katex .mfrac .frac-line { 
                            display: block !important;
                            height: 1px !important;
                            background-color: black !important;
                            opacity: 1 !important;
                            /* We physically LIFT the line to counteract the drooping */
                            transform: translateY(-4px) !important; 
                            margin: 0 !important;
                        }
                        .katex .sqrt .sqrt-line { 
                            display: block !important;
                            height: 1px !important;
                            background-color: black !important;
                            opacity: 1 !important;
                            /* Subtle lift for roots */
                            transform: translateY(1px) !important;
                        }
                    </style>
                </head>
                <body>
                    ${paperHtml}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                // Optional: window.close();
                            }, 1000);
                        };
                    </script>
                </body>
                </html>
            `;

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(cleanHtml);
                printWindow.document.close();
            } else {
                alert('Pop-up blocked! Please allow pop-ups for this site to print.');
            }
            
            setSelectedPaper(null);
        }, 500);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            {/* ATOMIC PRINT OVERRIDE: Physically removes dashboard from printer's layout */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    /* 1. Reset Page and body */
                    html, body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* 2. Kill the entire Dashboard UI */
                    #root > div:not(.print-section),
                    .no-print, 
                    .min-h-screen:not(.print-section) { 
                        display: none !important; 
                    }
                    
                    /* 3. Resuscitate the paper into standard document flow */
                    .print-section { 
                        display: block !important; 
                        position: static !important; 
                        width: 100% !important; 
                        height: auto !important;
                        margin: 0 !important; 
                        padding: 0 !important;
                        visibility: visible !important;
                    }
                    .print-section * { visibility: visible !important; }
                    
                    /* 4. Fix KaTeX spacing for physical paper */
                    .katex { font-variant-numeric: lining-nums tabular-nums !important; }
                }
            `}} />

            {/* Hidden render area for PDF capture */}
            {selectedPaper && (
                <div
                    ref={paperRef}
                    className="fixed inset-0 z-[100] bg-white overflow-auto print:static print:h-auto print:overflow-visible print-section"
                >
                    <QuestionPaperTemplate
                        title={selectedPaper.title}
                        subject={selectedPaper.subject}
                        questions={selectedPaper.questions}
                        setName={selectedPaper.setName}
                        serialNumber={`P2-2026-${selectedPaper.subject.slice(0, 4).toUpperCase()}`}
                    />

                    {!isGenerating && (
                        <button
                            onClick={() => setSelectedPaper(null)}
                            className="no-print fixed top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-slate-700 transition-all flex items-center gap-2"
                        >
                            <ChevronRight className="rotate-180" size={18} /> Close Preview
                        </button>
                    )}

                    {isGenerating && (
                        <div className="no-print fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center">
                            <div className="bg-white p-8 rounded-2xl shadow-2xl text-center">
                                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900">Generating PDF</h3>
                                <p className="text-slate-500">Wait while we render your high-fidelity mock paper...</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className={`max-w-5xl mx-auto no-print transition-opacity duration-300 ${selectedPaper ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <header className="mb-12 no-print">
                    <button
                        onClick={onBack}
                        className="mb-8 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 font-medium"
                    >
                        <ChevronRight className="rotate-180" size={18} /> Back to Dashboard
                    </button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="font-black tracking-tight font-outfit text-xl leading-none uppercase italic">
                                <span style={{ color: '#0a1a16' }}>plus2</span>
                                <span style={{ color: '#ff7f50' }}>AI</span>
                            </h1>
                            <p className="text-slate-600 text-lg max-w-2xl">
                                Download high-fidelity KCET 2026 AI mocktest papers with official layouts and Plus2AI simulated watermarking.
                            </p>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-500 flex items-center gap-2 shadow-sm">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            REI v17 Calibrated
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {papers.map((paper) => (
                        <div
                            key={paper.id}
                            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative"
                        >
                            <div className={`absolute top-0 left-0 right-0 h-1.5 ${paper.subject === 'Physics' ? 'bg-blue-500' :
                                    paper.subject === 'Mathematics' ? 'bg-indigo-600' :
                                        paper.subject === 'Chemistry' ? 'bg-emerald-500' :
                                            paper.subject === 'Biology' ? 'bg-rose-500' : 'bg-coral-500'
                                }`} />

                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors">
                                    <FileText className="text-slate-700" size={24} />
                                </div>
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                                    SET {paper.setName}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-2 truncate">
                                {paper.subject} Prediction
                            </h3>
                            <p className="text-slate-500 text-sm mb-6">
                                60 Questions • 80 Minutes • Official Layout
                            </p>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => handlePopOutPrint(paper)}
                                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md active:scale-[0.98]"
                                >
                                    <Sparkles size={16} className="text-amber-400" /> Download Pro PDF
                                </button>
                                <button
                                    onClick={() => handlePopOutPrint(paper)}
                                    className="w-full bg-white text-slate-900 border-2 border-slate-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-[0.98]"
                                >
                                    <Printer size={16} /> Quick Print Paper
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <footer className="mt-20 pt-8 border-t border-slate-200 text-center">
                    <p className="text-slate-400 text-sm mb-4">
                        &copy; 2026 Plus2AI Teacher Studio. All papers are proprietary prediction models.
                    </p>
                </footer>
            </div>
        </div>
    );
};
