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
    const allPapers = getPredictedPapers();
    const [selectedExamContext, setSelectedExamContext] = useState<string>('KCET'); // Default to KCET
    const [papers, setPapers] = useState<PaperSet[]>(
        allPapers.filter(p => p.examContext === selectedExamContext || p.id.startsWith('mock-'))
    );
    const [selectedPaper, setSelectedPaper] = useState<PaperSet | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const paperRef = useRef<HTMLDivElement>(null);

    // Update papers when exam context changes
    React.useEffect(() => {
        setPapers(allPapers.filter(p => p.examContext === selectedExamContext || p.id.startsWith('mock-')));
    }, [selectedExamContext]);

    // ── Map PaperSet → server paperId ────────────────────────────────────────
    const getPaperId = (paper: PaperSet): string | null => {
        const subj = (paper.subject || '').toLowerCase();
        const set  = (paper.setName || '').toUpperCase();
        if (subj.includes('physics')   && set === 'A') return 'neet-physics-set-a';
        if (subj.includes('physics')   && set === 'B') return 'neet-physics-set-b';
        if (subj.includes('chemistry') && set === 'A') return 'neet-chemistry-set-a';
        if (subj.includes('chemistry') && set === 'B') return 'neet-chemistry-set-b';
        return null;
    };

    // ── [ACTIVE] Server-side Gemini + Puppeteer PDF download ─────────────────
    const handleProDownload = async (paper: PaperSet) => {
        console.log('[PDF] handleProDownload called for:', paper.subject, paper.setName, paper.examContext);
        const paperId = getPaperId(paper);
        console.log('[PDF] resolved paperId:', paperId);

        if (!paperId) {
            console.error('[PDF] No paperId match — subject:', paper.subject, 'set:', paper.setName);
            alert(`Pro PDF not yet available for ${paper.subject} Set ${paper.setName}. Coming soon!`);
            return;
        }

        setIsGenerating(true);
        console.log('[PDF] setIsGenerating=true, calling server...');

        try {
            const res = await fetch('http://localhost:9001/api/generate-flagship-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paperId }),
            });

            console.log('[PDF] Server response status:', res.status);

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Unknown server error' }));
                throw new Error(err.error || `Server error ${res.status}`);
            }

            console.log('[PDF] Streaming blob...');
            const blob = await res.blob();
            console.log('[PDF] Blob received, size:', blob.size);
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `Plus2AI_NEET_2026_${paper.subject}_SET_${paper.setName}_Prediction.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log('[PDF] ✅ Download triggered');

        } catch (err: any) {
            console.error('[PDF] ❌ Gemini PDF generation error:', err);
            alert(`PDF generation failed: ${err.message}\n\nMake sure the server is running on port 9001.`);
        } finally {
            setIsGenerating(false);
        }
    };

    // ── [LEGACY — PRESERVED, BYPASSED] Client-side html2pdf pipeline ──────────
    // Do NOT delete. Switch button to call handleLegacyDownload to revert.
    const handleLegacyDownload = async (paper: PaperSet) => {
        const html2pdf = window.html2pdf;
        if (!html2pdf) {
            alert('Pro PDF engine loading... Please wait a second and try again.');
            return;
        }

        setSelectedPaper(paper);
        setIsGenerating(true);

        try {
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
        } catch (e) {
            console.warn('Font loading check failed, proceeding with delay fallback', e);
        }

        setTimeout(async () => {
            if (!paperRef.current) return;
            const paperElement = paperRef.current.querySelector('.paper-container');
            if (!paperElement) return;

            const opt = {
                margin: 0,
                filename: `Plus2AI_${paper.subject}_${paper.examContext || 'KCET'}_2026_SET_${paper.setName}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 1.35,
                    useCORS: true,
                    letterRendering: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    logging: false,
                    scrollY: -window.scrollY,
                    scrollX: -window.scrollX,
                    width: (paperElement as HTMLElement).scrollWidth,
                    height: (paperElement as HTMLElement).scrollHeight,
                    onclone: (clonedDoc: Document) => {
                        const containers = clonedDoc.querySelectorAll('html, body, #root, .print-area, .paper-container, .questions-grid');
                        containers.forEach(el => {
                            (el as HTMLElement).style.display = 'block';
                            (el as HTMLElement).style.height = 'auto';
                            (el as HTMLElement).style.minHeight = 'auto';
                            (el as HTMLElement).style.maxHeight = 'none';
                            (el as HTMLElement).style.overflow = 'visible';
                            (el as HTMLElement).style.visibility = 'visible';
                        });
                        clonedDoc.querySelectorAll('svg').forEach((svg: Element) => {
                            const el = svg as SVGElement;
                            el.style.display = 'inline-block';
                            el.style.visibility = 'visible';
                            el.style.opacity = '1';
                            el.style.overflow = 'visible';
                            const w = el.getAttribute('width');
                            const h = el.getAttribute('height');
                            if (w) el.style.width = w;
                            if (h) el.style.height = h;
                            el.querySelectorAll('path').forEach((path: Element) => {
                                (path as SVGPathElement).style.visibility = 'visible';
                                (path as SVGPathElement).style.display = 'block';
                            });
                        });
                        clonedDoc.querySelectorAll('.katex').forEach((el: Element) => {
                            (el as HTMLElement).style.display = 'inline-block';
                            (el as HTMLElement).style.visibility = 'visible';
                            (el as HTMLElement).style.opacity = '1';
                        });
                        clonedDoc.querySelectorAll('.katex-html, .katex-mathml').forEach((el: Element) => {
                            (el as HTMLElement).style.overflow = 'visible';
                            (el as HTMLElement).style.display = 'inline-block';
                        });
                    }
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            };

            try {
                await html2pdf().set(opt).from(paperElement).toPdf().get('pdf').then((pdf: any) => {
                    const totalPages = pdf.internal.getNumberOfPages();
                    const pageWidth  = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    for (let i = 1; i <= totalPages; i++) {
                        pdf.setPage(i);
                        pdf.setFontSize(8.5);
                        pdf.setTextColor(40);
                        pdf.text(
                            `Reproduction strictly prohibited. © 2026 Plus2AI. | ${paper.examContext || 'KCET'} 2026 Simulation - SET ${paper.setName} | Page ${i} of ${totalPages}`,
                            pageWidth / 2, pageHeight - 8, { align: 'center' }
                        );
                        pdf.setDrawColor(180);
                        pdf.setLineWidth(0.3);
                        pdf.line(20, pageHeight - 11, pageWidth - 20, pageHeight - 11);
                    }
                }).save();
            } catch (err) {
                console.error('Legacy PDF generation failed:', err);
            } finally {
                setIsGenerating(false);
                setSelectedPaper(null);
            }
        }, 35000);
    };
    // ── END LEGACY ────────────────────────────────────────────────────────────

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
            <style dangerouslySetInnerHTML={{
                __html: `
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
                        examContext={selectedPaper.examContext || 'KCET'}
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
                            <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm">
                                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900">Gemini is Generating Your PDF</h3>
                                <p className="text-slate-500 mt-1 text-sm">Formatting all 45 questions with NEET-standard layout, math rendering, watermarks, and branding...</p>
                                <p className="text-xs text-slate-400 mt-2">This takes ~30–60 seconds. Please wait.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Gemini generation spinner (independent of selectedPaper) ── */}
            {isGenerating && !selectedPaper && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full mx-4">
                        <div className="w-14 h-14 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-5" />
                        <h3 className="text-xl font-bold text-slate-900">Gemini is Generating Your PDF</h3>
                        <p className="text-slate-500 mt-2 text-sm">Formatting all 45 questions with NEET-standard layout, math rendering, watermarks, and branding...</p>
                        <p className="text-xs text-slate-400 mt-3">This takes ~30–60 seconds. Please wait.</p>
                    </div>
                </div>
            )}

            <div className={`max-w-5xl mx-auto dashboard-ui transition-opacity duration-300 ${selectedPaper || isGenerating ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
                                Download high-fidelity {selectedExamContext} 2026 AI mocktest papers with official layouts and Plus2AI simulated watermarking.
                            </p>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-500 flex items-center gap-2 shadow-sm">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            REI v17 Calibrated
                        </div>
                    </div>

                    {/* Exam Context Selector */}
                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={() => setSelectedExamContext('KCET')}
                            className={`px-6 py-3 rounded-xl font-bold transition-all ${selectedExamContext === 'KCET'
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            KCET 2026
                        </button>
                        <button
                            onClick={() => setSelectedExamContext('NEET')}
                            className={`px-6 py-3 rounded-xl font-bold transition-all ${selectedExamContext === 'NEET'
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            NEET 2026
                        </button>
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

                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-slate-900 truncate">
                                    {paper.subject} Prediction
                                </h3>
                                {paper.examContext && (
                                    <span className="bg-slate-900 text-white px-2 py-1 rounded text-xs font-bold">
                                        {paper.examContext}
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-500 text-sm mb-6">
                                {paper.questions.length} Questions • {Math.ceil(paper.questions.length * 1.33)} Minutes • Official Layout
                            </p>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => handleProDownload(paper)}
                                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md active:scale-[0.98]"
                                >
                                    <Sparkles size={16} className="text-amber-400" /> Generate AI PDF
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
