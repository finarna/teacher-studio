import React from 'react';
import './PaperWatermark.css';
import RichMarkdownRenderer from './RichMarkdownRenderer';

interface Question {
    id: string;
    text: string;
    options: string[];
    marks?: number;
    topic?: string;
}

interface PaperProps {
    title: string;
    subject: string;
    questions: Question[];
    setName: string;
    timeInMinutes?: number;
    maxMarks?: number;
    serialNumber?: string;
}

/**
 * QuestionPaperTemplate
 * Renders an official KCET-style question paper with Plus2AI branding.
 * Optimized for professional print and PDF output.
 */
export const QuestionPaperTemplate: React.FC<PaperProps> = ({
    title,
    subject,
    questions,
    setName,
    timeInMinutes = 80,
    maxMarks = 60,
    serialNumber = "P2-2026-MATH"
}) => {
    return (
        <div className="paper-container">
            {/* Tiled Watermark is handled via CSS background in PaperWatermark.css */}
            
            <header className="paper-header">
                <div className="paper-brand">
                    <div className="brand-text">plus2<span>AI</span> mocktest</div>
                    <div className="serial-number">Serial No: <strong>{serialNumber}</strong></div>
                </div>

                <div className="exam-title-section" style={{ textAlign: 'center', margin: '1rem 0', borderBottom: '1px solid #ddd', paddingBottom: '0.8rem' }}>
                    <h2 style={{ fontSize: '14pt', fontWeight: 500, margin: 0, opacity: 0.8 }}>COMMON ENTRANCE TEST - 2026</h2>
                    <h1 style={{ fontSize: '22pt', fontWeight: 900, textTransform: 'uppercase', margin: '0.2rem 0' }}>
                        {subject}
                    </h1>
                </div>

                <div className="exam-meta">
                    <div className="meta-left">
                        <div className="meta-item">Subject Code: <strong>{subject.slice(0, 3).toUpperCase()}</strong></div>
                        <div className="meta-item">Duration: <strong>{timeInMinutes} Minutes</strong></div>
                    </div>
                    <div className="meta-right">
                        <div className="meta-item">Version Code: <strong style={{ fontSize: '14pt' }}>REI-v17</strong></div>
                        <div className="meta-item">Maximum Marks: <strong>{maxMarks}</strong></div>
                    </div>
                </div>

                <div className="candidate-info-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '2rem', marginTop: '1.5rem' }}>
                    <div className="info-field">
                        <span style={{ fontSize: '9pt', textTransform: 'uppercase' }}>Candidate Name:</span>
                        <div style={{ borderBottom: '1px dotted #333', height: '24px', marginTop: '4px' }}></div>
                    </div>
                    <div className="info-field">
                        <span style={{ fontSize: '9pt', textTransform: 'uppercase' }}>CET Reg. No:</span>
                        <div className="reg-no-box" style={{ marginTop: '4px' }}>
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="box" />
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* LEGAL DISCLAIMER BOX */}
            <section style={{ 
                margin: '1rem 2cm', 
                padding: '1rem', 
                border: '2px solid #000', 
                backgroundColor: '#fff',
                fontSize: '9pt'
            }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'underline' }}>
                    Legal Disclaimer & Terms of Usage
                </h4>
                <p style={{ margin: 0, textAlign: 'justify', lineHeight: 1.4 }}>
                    <strong>IMPORTANT:</strong> This document is an <strong>AI-generated simulation</strong> based on historical analysis of the Karnataka Common Entrance Test (KCET). It is intended <strong>strictly for practice</strong> and training purposes. Plus2AI does not claim that these specific questions will appear in the actual 2026 KCET examination. Plus2AI assumes no legal liability for any discrepancies, variations, or performance outcomes in the actual exam. Users are advised to use this alongside official KEA study materials.
                </p>
            </section>

            <section className="paper-instructions">
                <h3>IMPORTANT INSTRUCTIONS TO CANDIDATES</h3>
                <ol>
                    <li>This question booklet contains <strong>{questions.length}</strong> questions. Check that all pages are intact.</li>
                    <li>The Version Code and Serial Number must be correctly entered on the OMR Answer Sheet.</li>
                    <li>Each question carries <strong>1 mark</strong>. There is <strong>no negative marking</strong> for wrong answers.</li>
                    <li>Answers must be marked ONLY on the OMR sheet provided using a blue/black ballpoint pen.</li>
                    <li>Calculators, log tables, and electronic gadgets are strictly prohibited.</li>
                    <li>Candidates must sign the attendance sheet in the presence of the invigilator.</li>
                    <li><strong>Plus2AI DNA Model (REI v17)</strong>: This is a high-fidelity pattern simulation. Final results may vary.</li>
                </ol>
            </section>

            <main className="questions-grid">
                {questions.map((q, index) => (
                    <div key={q.id} className="question-item">
                        <div className="question-text">
                            <strong>{index + 1}.</strong> 
                            <div style={{ flex: 1 }}>
                                <RichMarkdownRenderer text={q.text} className="inline" />
                            </div>
                        </div>
                        <div className="options-grid">
                            {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="option">
                                    <span className="option-letter">({String.fromCharCode(65 + optIdx)})</span>
                                    <span className="option-content">
                                        <RichMarkdownRenderer text={opt} className="inline" />
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </main>

            <footer className="paper-footer">
                <div className="footer-disclaimer">
                    Official Pattern Simulation. Reproduction strictly prohibited. &copy; 2026 Plus2AI.
                </div>
                <div className="page-number">KCET 2026 Simulation - SET {setName} | Page </div>
            </footer>
        </div>
    );
};
