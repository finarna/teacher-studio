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
    examContext?: string; // 'KCET' or 'NEET'
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
    examContext = 'KCET',
    timeInMinutes,
    maxMarks,
    serialNumber
}) => {
    // NEET vs KCET specific defaults
    const isNEET = examContext === 'NEET';
    const defaultTime = isNEET ? 45 : 80;
    const defaultMarks = isNEET ? 180 : 60;
    const marksPerQuestion = isNEET ? 4 : 1;
    const hasNegativeMarking = isNEET;
    const negativeMarks = isNEET ? 1 : 0;

    const finalTime = timeInMinutes || defaultTime;
    const finalMarks = maxMarks || defaultMarks;
    const finalSerial = serialNumber || `P2-2026-${subject.slice(0, 4).toUpperCase()}-${setName}`;
    const subjectCode = isNEET ? (subject === 'Physics' ? 'PHYS' : subject.slice(0, 4).toUpperCase()) : subject.slice(0, 3).toUpperCase();
    return (
        <div className="paper-container">
            {/* Tiled Watermark is handled via CSS background in PaperWatermark.css */}
            
            <table className="print-layout-table">
                <thead>
                    <tr>
                        <td>
                            <div className="thead-spacer" />
                        </td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div className="paper-header">
                                <div className="paper-brand-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ width: '80px' }}></div>
                                    <div className="paper-brand" style={{ margin: 0 }}>
                                        <div className="brand-text" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '30pt', fontStyle: 'italic', letterSpacing: '-1.5px', lineHeight: 1 }}>
                                            <span style={{ color: '#0a1a16' }}>Plus2</span><span style={{ color: '#ff7f50' }}>AI</span>
                                        </div>
                                    </div>
                                    <div className="header-qr" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=65x65&data=https://learn.dataziv.com/&margin=0" alt="QR Code" style={{ width: '65px', height: '65px' }} />
                                        <span style={{ fontSize: '7pt', color: '#666', marginTop: '2px' }}>learn.dataziv.com</span>
                                    </div>
                                </div>

                                <div className="exam-title-section" style={{ textAlign: 'center', margin: '0.2rem 0', borderBottom: '1.5px solid #000', paddingBottom: '0.6rem' }}>
                                    <div className="exam-name" style={{ fontSize: '12pt', fontWeight: 600, textTransform: 'uppercase', color: '#444', marginBottom: '0.2rem' }}>
                                        {isNEET ? 'National Eligibility cum Entrance Test (NEET) 2026' : 'Karnataka Common Entrance Simulation Test 2026'}
                                    </div>
                                    <div className="paper-title" style={{ fontSize: '26pt', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.3rem', letterSpacing: '1px' }}>
                                        {subject} <span style={{ color: '#ff7f50' }}>SIMULATION</span>
                                    </div>
                                    <div className="subject-serial" style={{ display: 'inline-block', border: '1.5px solid #000', padding: '4px 15px', fontWeight: 800, fontSize: '11pt' }}>
                                        Serial No: {finalSerial}
                                    </div>
                                </div>

                                <div className="exam-meta">
                                    <div className="meta-left">
                                        <div className="meta-item">Subject Code: <strong>{subjectCode}</strong></div>
                                        <div className="meta-item">Duration: <strong>{finalTime} Minutes</strong></div>
                                    </div>
                                    <div className="meta-right">
                                        <div className="meta-item">Version Code: <strong style={{ fontSize: '14pt' }}>REI-v17</strong></div>
                                        <div className="meta-item">Maximum Marks: <strong>{finalMarks}</strong></div>
                                    </div>
                                </div>

                                <div className="candidate-info-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '2rem', marginTop: '0.8rem' }}>
                                    <div className="info-field">
                                        <span style={{ fontSize: '9pt', textTransform: 'uppercase' }}>Candidate Name:</span>
                                        <div style={{ borderBottom: '1px dotted #333', height: '24px', marginTop: '4px' }}></div>
                                    </div>
                                    <div className="info-field">
                                        <span style={{ fontSize: '9pt', textTransform: 'uppercase' }}>{isNEET ? 'NTA Reg. No:' : 'CET Reg. No:'}</span>
                                        <div className="reg-no-box" style={{ marginTop: '4px' }}>
                                            {[...Array(isNEET ? 10 : 8)].map((_, i) => (
                                                <div key={i} className="box" />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* LEGAL DISCLAIMER BOX */}
                            <div style={{ 
                                margin: '0.5rem 0', 
                                width: '100%',
                                padding: '0.8rem', 
                                border: '2.5px solid #000', 
                                backgroundColor: '#fff',
                                fontSize: '9pt',
                                boxSizing: 'border-box'
                            }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'underline' }}>
                                    Legal Disclaimer & Terms of Usage
                                </h4>
                                <p style={{ margin: 0, textAlign: 'justify', lineHeight: 1.4 }}>
                                    <strong>IMPORTANT:</strong> This document is an <strong>AI-generated simulation</strong> based on historical analysis of the {isNEET ? 'National Eligibility cum Entrance Test (NEET)' : 'Karnataka Common Entrance Test (KCET)'}. It is intended <strong>strictly for practice</strong> and training purposes. Plus2AI does not claim that these specific questions will appear in the actual 2026 {examContext} examination. Plus2AI assumes no legal liability for any discrepancies, variations, or performance outcomes in the actual exam. Users are advised to use this alongside official {isNEET ? 'NTA' : 'KEA'} study materials.
                                </p>
                            </div>

                            <section className="paper-instructions">
                                <h3>IMPORTANT INSTRUCTIONS TO CANDIDATES</h3>
                                <ol>
                                    <li>This question booklet contains <strong>{questions.length}</strong> questions. Check that all pages are intact.</li>
                                    <li>The Version Code and Serial Number must be correctly entered on the OMR Answer Sheet.</li>
                                    <li>Each question carries <strong>{marksPerQuestion} mark{marksPerQuestion > 1 ? 's' : ''}</strong>. {hasNegativeMarking ? <span>There is <strong>negative marking of {negativeMarks} mark{negativeMarks > 1 ? 's' : ''}</strong> for each wrong answer.</span> : <span>There is <strong>no negative marking</strong> for wrong answers.</span>}</li>
                                    <li>Answers must be marked ONLY on the OMR sheet provided using a blue/black ballpoint pen.</li>
                                    <li>Calculators, log tables, and electronic gadgets are strictly prohibited.</li>
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
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td>
                            <div className="tfoot-spacer" />
                        </td>
                    </tr>
                </tfoot>
            </table>

            <div className="paper-footer">
                <div className="footer-content">
                    Reproduction strictly prohibited. &copy; 2026 Plus2AI.
                    <span className="footer-separator">|</span>
                    {examContext} 2026 Simulation - SET {setName}
                    <span className="footer-separator">|</span>
                    Page <span className="page-num-placeholder"></span>
                </div>
            </div>
        </div>
    );
};
