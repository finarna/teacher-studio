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

        // Standard delay for high-fidelity stabilization
        setTimeout(async () => {
            if (!paperRef.current) return;

            const paperElement = paperRef.current.querySelector('.paper-container');
            if (!paperElement) return;

            const opt = {
                margin: 0,
                filename: `Plus2AI_${paper.subject}_KCET_2026_SET_${paper.setName}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2.5,
                    useCORS: true,
                    letterRendering: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    logging: false,
                    scrollY: -window.scrollY,
                    scrollX: -window.scrollX,
                    width: paperElement.scrollWidth,
                    height: paperElement.scrollHeight,
                    onclone: (clonedDoc: Document) => {
                        const clonedPaper = clonedDoc.querySelector('.paper-container') as HTMLElement;
                        if (clonedPaper) {
                            clonedPaper.style.boxShadow = 'none';
                            clonedPaper.style.width = '210mm';
                            clonedPaper.style.margin = '0';
                            clonedPaper.style.padding = '0';
                        }

                        // CRITICAL FIX: Ensure ALL SVG elements are visible and properly sized
                        const allSvgs = clonedDoc.querySelectorAll('svg');
                        allSvgs.forEach((svg: Element) => {
                            const htmlSvg = svg as SVGElement;
                            // Force visibility
                            htmlSvg.style.display = 'inline-block';
                            htmlSvg.style.visibility = 'visible';
                            htmlSvg.style.opacity = '1';
                            htmlSvg.style.overflow = 'visible';

                            // Ensure SVG has dimensions
                            const width = htmlSvg.getAttribute('width');
                            const height = htmlSvg.getAttribute('height');
                            if (width) htmlSvg.style.width = width;
                            if (height) htmlSvg.style.height = height;

                            // Ensure all paths within SVG are visible
                            const paths = htmlSvg.querySelectorAll('path');
                            paths.forEach((path: Element) => {
                                const htmlPath = path as SVGPathElement;
                                htmlPath.style.visibility = 'visible';
                                htmlPath.style.display = 'block';
                            });
                        });

                        // Make sure all KaTeX elements are visible
                        const katexElements = clonedDoc.querySelectorAll('.katex');
                        katexElements.forEach((el: Element) => {
                            const htmlEl = el as HTMLElement;
                            htmlEl.style.display = 'inline-block';
                            htmlEl.style.visibility = 'visible';
                            htmlEl.style.opacity = '1';
                        });

                        // Ensure no hidden overflow on math containers
                        const mathContainers = clonedDoc.querySelectorAll('.katex-html, .katex-mathml');
                        mathContainers.forEach((el: Element) => {
                            const htmlEl = el as HTMLElement;
                            htmlEl.style.overflow = 'visible';
                            htmlEl.style.display = 'inline-block';
                        });
                    }
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            try {
                await html2pdf().set(opt).from(paperElement).toPdf().get('pdf').then((pdf: any) => {
                    const totalPages = pdf.internal.getNumberOfPages();
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();

                    for (let i = 1; i <= totalPages; i++) {
                        pdf.setPage(i);
                        pdf.setFontSize(8.5);
                        pdf.setTextColor(40);
                        const footerLine = `Reproduction strictly prohibited. © 2026 Plus2AI. | KCET 2026 Simulation - SET ${paper.setName} | Page ${i} of ${totalPages}`;
                        pdf.text(footerLine, pageWidth / 2, pageHeight - 8, { align: 'center' });
                        pdf.setDrawColor(180);
                        pdf.setLineWidth(0.3);
                        pdf.line(20, pageHeight - 11, pageWidth - 20, pageHeight - 11);
                    }
                }).save();
            } catch (err) {
                console.error('PDF Generation failed:', err);
            } finally {
                setIsGenerating(false);
                setSelectedPaper(null);
            }
        }, 2000);
    };

    const handleQuickPrint = (paper: PaperSet) => {
        setSelectedPaper(paper);
        // Standard delay for DOM to settle
        setTimeout(() => {
            window.print();
            setSelectedPaper(null); 
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            {/* SURGICAL PRINT OVERRIDE: Uses standard browser engine without unmounting */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    html, body, #root, #root > div, .min-h-screen { 
                        height: auto !important;
                        overflow: visible !important;
                        display: block !important;
                        position: static !important;
                        background: white !important;
                    }
                    .no-print, .dashboard-ui header, .dashboard-ui footer, .dashboard-ui > header, .dashboard-ui > footer, .vidya-assistant-portal, [class*="chatbot-button"] { 
                        display: none !important; 
                    }
                    .print-section { 
                        display: block !important; 
                        position: relative !important; 
                        width: 100% !important; 
                        visibility: visible !important;
                    }
                }
            `}} />

            {/* Hidden render area for PDF capture and Quick Print */}
            {selectedPaper && (
                <div
                    ref={paperRef}
                    className="fixed inset-0 z-[100] bg-white overflow-auto print:static print:h-auto print:overflow-visible print-section"
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        padding: '2rem 0'
                    }}
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

            <div className={`max-w-5xl mx-auto dashboard-ui transition-opacity duration-300 ${selectedPaper ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <header className="mb-12">
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
                            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                                paper.subject === 'Physics' ? 'bg-blue-500' : 
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
                                    onClick={() => handleProDownload(paper)}
                                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md active:scale-[0.98]"
                                >
                                    <Sparkles size={16} className="text-amber-400" /> Download Pro PDF
                                </button>
                                <button 
                                    onClick={() => handleQuickPrint(paper)}
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
