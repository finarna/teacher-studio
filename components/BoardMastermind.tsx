import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  ChevronRight,
  BrainCircuit,
  Sparkles,
  RefreshCcw,
  Zap,
  Cpu,
  Terminal,
  Activity,
  Layers,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import { Scan, ExamAnalysisData, AnalyzedQuestion, Subject } from '../types';
import { safeAiParse, normalizeData } from '../utils/aiParser';
import { generateMathExtractionInstructions, generateStreamlinedMathInstructions } from '../utils/mathLatexReference';
import { generatePhysicsExtractionInstructions } from '../utils/physicsNotationReference';
import { generateCleanMathPrompt, validateExtraction } from '../utils/cleanMathExtractor';
import { generateCleanPhysicsPrompt } from '../utils/cleanPhysicsExtractor';
import { generateCleanBiologyPrompt } from '../utils/cleanBiologyExtractor';
import { generateCleanChemistryPrompt } from '../utils/cleanChemistryExtractor';
import { processQuestionsUnicode } from '../utils/unicodeToLatex'; // Latest: fixed escape char regex patterns
import { extractQuestionsSimplified } from '../utils/simpleMathExtractor';
import { extractPhysicsQuestionsSimplified } from '../utils/simplePhysicsExtractor';
import { extractBiologyQuestionsSimplified } from '../utils/simpleBiologyExtractor';
import { extractChemistryQuestionsSimplified } from '../utils/simpleChemistryExtractor'; // NEW: Simplified Chemistry
import { matchToOfficialTopic } from '../utils/officialTopics'; // NEW: Official Topic Mapping
import { AI_CONFIG } from '../config/aiConfigs';

import { mapTopicsFast } from '../utils/topicMapper'; // NEW: Instant keyword-based topic mapping
import { useAppContext } from '../contexts/AppContext';
import { useFilteredScans, useSubjectStats } from '../hooks/useFilteredScans';
import { EmptyState } from './EmptyState';

interface BoardMastermindProps {
  onNavigate: (view: string) => void;
  recentScans: Scan[];
  onAddScan: (scan: Scan) => void;
  onSelectScan: (scan: Scan) => void;
}

const BoardMastermind: React.FC<BoardMastermindProps> = ({ onNavigate, recentScans, onAddScan, onSelectScan }) => {
  // Use AppContext for subject/exam instead of local state
  const { activeSubject, activeExamContext, subjectConfig, examConfig } = useAppContext();
  const { scans: filteredScans, hasScans } = useFilteredScans(recentScans);
  const stats = useSubjectStats(recentScans);

  // Use context values instead of local state
  const selectedSubject = activeSubject;
  const subj: any = selectedSubject;
  const selectedGrade = 'Class 12'; // Can be derived from examConfig if needed

  const [selectedModel, setSelectedModel] = useState<string>(AI_CONFIG.defaultModel);
  const [useSimplifiedExtraction, setUseSimplifiedExtraction] = useState(true); // NEW: Toggle for simplified extraction
  const [enableVisionExtraction, setEnableVisionExtraction] = useState(false); // NEW: Toggle for vision-guided image extraction (slow)
  const [isCombinedPaperMode, setIsCombinedPaperMode] = useState(false); // NEW: Toggle for full NEET/JEE combined papers
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [pipelineProgress, setPipelineProgress] = useState<number | null>(null); // NEW: Overwrites stage-based progress for smoothness
  const [pipelineLogs, setPipelineLogs] = useState<{ stage: string; status: 'pending' | 'active' | 'complete' | 'error'; label: string }[]>([
    { stage: 'extraction', status: 'pending', label: 'Intelligence Extraction' },
    { stage: 'analysis', status: 'pending', label: 'Cognitive Meta-Analysis' },
    { stage: 'skeptic', status: 'pending', label: 'Fidelity Lock' }
  ]);

  const updatePipelineStatus = (stage: string, status: 'pending' | 'active' | 'complete' | 'error') => {
    setPipelineLogs(prev => prev.map(log => log.stage === stage ? { ...log, status } : log));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        processHolographicPipeline(files[0]);
      } else {
        processBulkPipeline(Array.from(files));
      }
    }
  };

  const processBulkPipeline = async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    setBulkProgress({ current: 0, total: files.length });
    setPipelineLogs([
      { stage: 'extraction', status: 'pending', label: `Bulk Extraction (${files.length} Files)` },
      { stage: 'analysis', status: 'pending', label: 'Cumulative Meta-Analysis' },
      { stage: 'skeptic', status: 'pending', label: 'Unified Fidelity Lock' }
    ]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey.length < 5) {
        throw new Error("API Key Missing");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 65536  // Max allowed - handle all 60 questions in one response
        }
      });

      const allExtractedQuestions: AnalyzedQuestion[] = [];
      // Process files one by one for maximum clarity and per-file progress tracking
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setBulkProgress(prev => ({ ...prev, current: i + 1 }));
        setLoadingStage(`Scanning File ${i + 1}/${files.length}: ${file.name}`);

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
          reader.readAsDataURL(file);
        });
        const base64Data = await base64Promise;
        const mimeType = file.type || 'application/pdf';

        // Extract images from PDF (if PDF file)
        let fileImageMapping: any = null;
        if (mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          try {
            console.log(`🖼️ [BULK PDF EXTRACTOR] Starting image extraction from ${file.name}...`);
            const { extractAndMapImages } = await import('../utils/pdfImageExtractor');
            const result = await extractAndMapImages(file);
            fileImageMapping = result?.mapping;
            (window as any).rawExtractedImages = result?.rawImages;
            console.log(`✅ [BULK PDF EXTRACTOR] ${file.name}: Extracted images for`, (fileImageMapping?.size !== undefined ? fileImageMapping.size : "0"), 'questions');
          } catch (err) {
            console.warn(`⚠️ [BULK PDF EXTRACTOR] ${file.name}: Image extraction failed:`, err);
          }
        }

        // 🎯 SIMPLIFIED EXTRACTION (if enabled for Math or Physics)
        let extractedData: any;
        if (useSimplifiedExtraction && subj === 'Math') {
          console.log('🚀 [SIMPLIFIED MODE - MATH] Using schema-driven extraction with @google/genai');
          const simpleQuestions = await extractQuestionsSimplified(file, apiKey, selectedModel, subj, activeExamContext);
          // Convert simplified format to our existing format
          extractedData = {
            questions: simpleQuestions.map((sq: any) => ({
              id: `Q${sq.id}`,
              text: sq.text,
              options: Array.isArray(sq.options) ? sq.options.map((opt: any) => {
                if (typeof opt === 'string') return opt;
                const idStr = opt.id ? `(${opt.id.toLowerCase()}) ` : "";
                return `${idStr}${opt.text || opt}`;
              }) : [],
              correct_answer: sq.options?.find((o: any) => o.isCorrect)?.id?.toUpperCase() || "",
              marks: 1,
              difficulty: sq.difficulty || 'Medium',
              topic: sq.topic || 'General',
              domain: sq.domain || 'ALGEBRA',
              blooms: sq.blooms || 'Apply',
              hasVisualElement: !!sq.diagramBox || !!sq.hasVisualElement,
              visualElementType: null,
              visualElementDescription: null,
              source: `${file.name}`
            }))
          };

          // Extract images for Math (basic mode, no vision guidance)
          if (fileImageMapping) {
            console.log('🖼️ [BULK - SIMPLIFIED MATH] Using pre-extracted images:', fileImageMapping.size);
          }
        } else if (useSimplifiedExtraction && subj === 'Physics') {
          console.log('🚀 [SIMPLIFIED MODE - PHYSICS] Using schema-driven extraction with @google/genai');
          const simpleQuestions = await extractPhysicsQuestionsSimplified(file, apiKey, selectedModel, subj, activeExamContext);
          // Convert simplified format to our existing format
          extractedData = {
            questions: simpleQuestions.map((sq: any) => ({
              id: `Q${sq.id}`,
              text: sq.text,
              options: sq.options.map((opt: any) => `(${opt.id}) ${opt.text}`),
              correct_answer: sq.options?.find((o: any) => o.isCorrect)?.id?.toUpperCase() || "",
              marks: 1,
              difficulty: sq.difficulty || 'Medium',
              topic: sq.topic || 'Physics',
              domain: sq.domain || 'MECHANICS',
              blooms: sq.blooms || 'Apply',
              hasVisualElement: !!sq.hasVisualElement,
              visualElementType: sq.visualElementType || null,
              visualElementDescription: sq.visualElementDescription || null,
              visualBoundingBox: sq.visualBoundingBox || null,
              source: `${file.name}`
            }))
          };

          // Extract images for Physics (use pre-extracted images from line 118)
          if (fileImageMapping) {
            console.log('🖼️ [BULK - SIMPLIFIED PHYSICS] Using pre-extracted images:', fileImageMapping.size);
          }
        } else {
          // Legacy extraction
          const extractionPrompt = subj === 'Math'
            ? generateCleanMathPrompt(selectedGrade)
            : subj === 'Physics'
              ? generateCleanPhysicsPrompt(selectedGrade)
              : subj === 'Biology'
                ? generateCleanBiologyPrompt(activeExamContext)
                : `Extract ALL questions verbatim from this ${subj} paper.

        RULES:
        1. SYLLABUS COMPLIANCE: Strictly follow the latest official syllabus for ${subj} (${selectedGrade}).
        2. MARKING SCHEME: Extract marks verbatim. MCQs are usually 1 Mark.
        3. Verbatim Extraction: Copy text exactly as seen in the paper.
        4. Math Formatting: Wrap ALL mathematical expressions, symbols, and formulas in $ delimiters ($...$ for inline, $$...$$ for display).
        5. LaTeX Commands: Use standard LaTeX for math (e.g., \\frac{a}{b}, \\sqrt{x}, \\sin\\theta).
        6. Space Preservation: Ensure spaces are preserved between words. Avoid merging words.
        7. Visual Elements: Detect if a question has a diagram/table/graph and provide a brief description and location.

        SCHEMA: { "questions": [{
          "id": "Q1",
          "text": "The question text with math wrapped in $...$",
          "options": ["(A) Option 1", "(B) Option 2", "(C) Option 3", "(D) Option 4"],
          "correctOptionIndex": 0-3 (Identify from answer key or solve if possible),
          "marks": 1,
          "difficulty": "Easy|Medium|Hard",
          "topic": "Specific chapter name",
          "chapter": "Specific chapter name",
          "domain": "Domain name",
          "hasVisualElement": boolean,
          "visualElementType": "diagram|table|graph",
          "visualElementDescription": "Detailed description for the diagram",
          "visualBoundingBox": { "pageNumber": 1, "x": "10%", "y": "20%", "width": "80%", "height": "30%" }
        }] }`;

          const result = await genModel.generateContent([{ inlineData: { mimeType, data: base64Data } }, extractionPrompt]);
          const data = safeAiParse<any>(result.response.text(), { questions: [] }, true);

          // 🐛 DEBUG: Log BEFORE Unicode conversion to see raw extraction
          if (data.questions && data.questions.length > 0) {
            console.log(`🔍 [RAW EXTRACTION DEBUG] First 3 questions BEFORE Unicode conversion:`,
              data.questions.slice(0, 3).map((q: any) => ({
                id: q.id,
                text: q.text?.substring(0, 100),
                topic: q.topic,
                domain: q.domain
              }))
            );
          }

          // ⭐ CRITICAL: Convert Unicode symbols (θ, √, etc.) to LaTeX before processing
          if (data.questions && data.questions.length > 0) {
            data.questions = processQuestionsUnicode(data.questions);
            console.log(`✨ [UNICODE CONVERSION] ${file.name}: Processed ${data.questions.length} questions for Unicode→LaTeX conversion`);

            // 🐛 DEBUG: Log topic assignments for classification debugging
            const topicSummary = data.questions.slice(0, 10).map((q: any) => ({
              id: q.id,
              text: q.text?.substring(0, 60),
              topic: q.topic,
              domain: q.domain
            }));
            console.log(`📊 [TOPIC DEBUG] ${file.name} topic assignments (first 10):`, topicSummary);
          }

          extractedData = data;
        } // End of legacy extraction

        // Debug: Log visual element detection for this file
        console.log(`🔍 [BULK SCAN DEBUG] File: ${file.name}, Questions: ${extractedData.questions?.length || 0}`);
        if (extractedData.questions && extractedData.questions.length > 0) {
          const questionsWithVisuals = extractedData.questions.filter((q: any) => q.hasVisualElement);
          console.log(`🖼️ [BULK SCAN DEBUG] ${file.name}: Questions with visual elements:`, questionsWithVisuals.length);
        }

        if (extractedData.questions) {
          const filePrefix = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 10);

          // Try vision-guided extraction first (if bounding boxes provided), fallback to proximity-based
          let visionGuidedMapping: Map<number, any[]> | null = null;
          const questionsWithBoundingBoxes = extractedData.questions
            .filter((q: any) => q.hasVisualElement && q.visualBoundingBox)
            .map((q: any) => {
              const questionNumMatch = q.id?.match(/Q?(\d+)/i);
              const questionNumber = questionNumMatch ? parseInt(questionNumMatch[1]) : null;
              return { questionNumber, boundingBox: q.visualBoundingBox };
            })
            .filter((item: any) => {
              // Validate: must have question number AND complete bounding box with all fields
              if (!item.questionNumber) return false;
              const bb = item.boundingBox;
              if (!bb) return false;
              // Check all required fields are present and valid
              const isValid = bb.pageNumber &&
                bb.x && typeof bb.x === 'string' &&
                bb.y && typeof bb.y === 'string' &&
                bb.width && typeof bb.width === 'string' &&
                bb.height && typeof bb.height === 'string';
              if (!isValid) {
                console.warn(`⚠️ [BULK VISION-GUIDED] Q${item.questionNumber} has incomplete bounding box, skipping:`, bb);
              }
              return isValid;
            });

          if (questionsWithBoundingBoxes.length > 0) {
            try {
              console.log(`🎯 [BULK VISION-GUIDED] ${file.name}: Found ${questionsWithBoundingBoxes.length} questions with bounding boxes`);
              const { extractImagesByBoundingBoxes } = await import('../utils/visionGuidedExtractor');
              visionGuidedMapping = await extractImagesByBoundingBoxes(file, questionsWithBoundingBoxes);
              console.log(`✅ [BULK VISION-GUIDED] ${file.name}: Extracted images for ${visionGuidedMapping.size} questions`);
            } catch (err) {
              console.warn(`⚠️ [BULK VISION-GUIDED] ${file.name}: Vision-guided extraction failed, using proximity-based:`, err);
            }
          }

          const taggedQuestions = extractedData.questions.map((q: any, idx: number) => {
            const newQuestion: any = {
              ...q,
              id: q.id ? `${filePrefix}-${q.id}` : `${filePrefix}-q-${idx}`,
              source: file.name
            };

            const questionNumMatch = q.id?.match(/Q?(\d+)/i);
            if (questionNumMatch) {
              const questionNum = parseInt(questionNumMatch[1]);

              // Prioritize vision-guided images over proximity-based
              if (visionGuidedMapping && visionGuidedMapping.has(questionNum)) {
                const visionImages = visionGuidedMapping.get(questionNum);
                if (visionImages && visionImages.length > 0) {
                  newQuestion.extractedImages = visionImages.map(img => img.imageData);
                  console.log(`🔗 [BULK VISION MERGE] ${file.name}: Attached ${visionImages.length} vision-guided image(s) to Q${questionNum}`);
                }
              } else if (fileImageMapping && fileImageMapping.has(questionNum)) {
                // Fallback to proximity-based images
                const images = fileImageMapping.get(questionNum);
                if (images && images.length > 0) {
                  newQuestion.extractedImages = images.map(img => img.imageData);
                  console.log(`🔗 [BULK IMAGE MERGE] ${file.name}: Attached ${images.length} proximity-based image(s) to Q${questionNum}`);
                }
              }
            }

            return newQuestion;
          });
          allExtractedQuestions.push(...taggedQuestions);
        }
      }

      updatePipelineStatus('extraction', 'complete');
      updatePipelineStatus('analysis', 'active');
      setLoadingStage('Synthesizing Cumulative Portfolio Trends...');

      const analysisPrompt = `Perform a CUMULATIVE meta-analysis on these ${allExtractedQuestions.length} questions from ${files.length} different ${selectedSubject} papers.
      Topics & Difficulties provided: ${JSON.stringify(allExtractedQuestions.map(q => ({ topic: q.topic, difficulty: q.difficulty, marks: q.marks, source: q.source })))}
      
      Analyze CROSS-PAPER TRENDS (e.g., repeating topics, shifting difficulty).
      
      SCHEMA: { 
        "summary": "Unified analysis across ${files.length} papers...", 
        "overallDifficulty": "Hard", 
        "difficultyDistribution": [{"name": "Easy", "percentage": 30, "color": "#10b981"}, ...], 
        "bloomsTaxonomy": [{"name": "Remembering", "percentage": 20, "color": "#6366f1"}, ...], 
        "topicWeightage": [{"name": "Topic A", "marks": 45, "color": "#f59e0b"}, ...], 
        "predictiveTopics": [{"topic": "Semiconductors: Logic Gates", "probability": 95, "reason": "Consistent 4-mark yield across all 3 years with shifting Boolean logic constraints."}], 
        "trends": [{"title": "Era of Numerical Shift", "description": "Analysis shows a 20% increase in formula-based application over theory.", "type": "positive"}],
        "strategy": ["Focus on Topic X due to Y..."] 
      }`;

      const analysisRes = await genModel.generateContent(analysisPrompt);
      const cumulativeAnalyticData = safeAiParse<any>(analysisRes.response.text(), {}, false);

      updatePipelineStatus('analysis', 'complete');
      updatePipelineStatus('skeptic', 'active');
      setLoadingStage('Forging Unified Vault...');

      const brainData: ExamAnalysisData = normalizeData({
        ...cumulativeAnalyticData,
        questions: allExtractedQuestions
      });

      // Extract year from representative filename (e.g., "KCET_2024_Biology..." → "2024")
      const yearMatch = files[0].name.match(/20\d{2}|19\d{2}/);
      const extractedYear = yearMatch ? yearMatch[0] : null;
      console.log(`📅 [YEAR EXTRACTION] Filename: ${files[0].name} → Year: ${extractedYear}`);

      const newScan: Scan = {
        id: crypto.randomUUID(), // Generate proper UUID for database compatibility
        name: `Portfolio: ${files.length} ${selectedSubject} Papers [${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]`,
        date: new Date().toISOString(),
        timestamp: Date.now(),
        status: 'Complete',
        grade: selectedGrade || 'Class 12',
        subject: selectedSubject,
        examContext: activeExamContext, // Multi-subject context
        year: extractedYear, // Add year for Learning Journey Past Year Exams
        analysisData: brainData
      };

      updatePipelineStatus('skeptic', 'complete');
      onAddScan(newScan);
      onSelectScan(newScan);
      onNavigate('analysis');

    } catch (e: any) {
      console.error("BULK_PIPELINE_ERROR:", e);
      setError(e.message || "Bulk processing failed.");
      pipelineLogs.forEach(log => updatePipelineStatus(log.stage, 'error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const processHolographicPipeline = async (file: File) => {
    console.log(`📄 [UPLOAD] Starting scan for ${file.name} | Subject: ${selectedSubject} | Exam: ${activeExamContext} | Grade: ${selectedGrade}`);
    setIsProcessing(true);
    setError(null);
    setBulkProgress({ current: 1, total: 1 });
    setPipelineLogs([
      { stage: 'extraction', status: 'pending', label: 'Intelligence Extraction' },
      { stage: 'analysis', status: 'pending', label: 'Cognitive Meta-Analysis' },
      { stage: 'skeptic', status: 'pending', label: 'Fidelity Lock' }
    ]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey.length < 5) {
        throw new Error("API Key Missing: Please configure VITE_GEMINI_API_KEY in your environment.");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;
      const mimeType = file.type || 'application/pdf';
      // Image mapping will be done after Gemini provides bounding boxes
      let imageMapping: any = null;

      // --- PHASE 1: PARALLEL NEURAL TRACKS ---
      updatePipelineStatus('analysis', 'active');
      const genModel = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 65536
        }
      });

      // 🎯 EXTRACTION LOGIC
      let extractionData: any;
      let analyticData: any;
      let combinedPaperSubjects: Subject[] = [];
      const extractionId = Date.now().toString().slice(-4);

      // --- MULTI-SUBJECT COMBINED PAPER MODE (NEET/JEE ALL-IN-ONE) ---
      if (isCombinedPaperMode && useSimplifiedExtraction && (activeExamContext === 'NEET' || activeExamContext === 'JEE')) {
        updatePipelineStatus('extraction', 'active');
        setLoadingStage(`Extracting combined ${activeExamContext} paper...`);
        setPipelineProgress(10); // Start at 10%

        // Simulate steady crawl for the long AI scan
        const crawlInterval = setInterval(() => {
          setPipelineProgress(prev => {
            if (prev === null) return 10;
            if (prev >= 60) return prev; // Cap simulation at 60% until LLM returns
            return prev + (60 - prev) * 0.05; // Asymptotic crawl
          });
        }, 3000);

        const { extractCombinedPaper } = await import('../utils/combinedPaperExtractor');
        const combinedQuestions = await extractCombinedPaper(
          file, apiKey, selectedModel, activeExamContext as 'NEET' | 'JEE', (stage) => setLoadingStage(stage)
        );

        clearInterval(crawlInterval);
        setPipelineProgress(70); // LLM phase complete

        combinedPaperSubjects = activeExamContext === 'NEET' ? ['Physics', 'Chemistry', 'Botany', 'Zoology'] : ['Physics', 'Chemistry', 'Math'];
        console.log(`✅ [COMBINED HUB] Successfully recovered ${combinedQuestions.length} units from neural tracks.`);

        // Convert to standard internal format
        extractionData = {
          questions: combinedQuestions.map((q, idx) => {
            // Find correct answer from options - NEET uses 1-4 or a-d
            const correctOptIdx = q.correctOptionIndex ?? 0;
            const correctLetter = ['A', 'B', 'C', 'D'][correctOptIdx] || "A";

            return {
              id: q.id,
              question_number: q.id.toString().replace(/\D/g, '') || (idx + 1).toString(),
              text: q.text,
              correct_answer: correctLetter,
              options: q.options,
              marks: q.marks,
              difficulty: q.difficulty,
              topic: q.topic,
              domain: q.domain || (q.subject === 'Botany' ? 'Plant Physiology' : q.subject === 'Zoology' ? 'Human Physiology' : q.subject === 'Biology' ? 'REPRODUCTION' : q.subject === 'Physics' ? 'MECHANICS' : 'Physical Chemistry'),
              blooms: q.blooms,
              subject: q.subject,
              hasVisualElement: q.hasVisualElement,
              visualBoundingBox: q.visualBoundingBox,
              source: file.name
            };
          })
        };

        // Calculate real-time stats for combined paper fidelity
        const totalQs = combinedQuestions.length || 1;
        const easyCount = combinedQuestions.filter(q => q.difficulty === 'Easy').length;
        const hardCount = combinedQuestions.filter(q => q.difficulty === 'Hard').length;
        const modCount = combinedQuestions.length - (easyCount + hardCount);

        const bloomCounts: Record<string, number> = {};
        combinedQuestions.forEach(q => bloomCounts[q.blooms] = (bloomCounts[q.blooms] || 0) + 1);

        analyticData = {
          summary: `${activeExamContext} Combined Paper — ${combinedQuestions.length} questions extracted across ${combinedPaperSubjects.join(', ')}. Parallel neural tracks active for high-fidelity unit recovery.`,
          overallDifficulty: modCount > easyCount && modCount > hardCount ? 'Moderate' : hardCount > easyCount ? 'Hard' : 'Easy',
          difficultyDistribution: [
            { name: 'Easy', percentage: Math.round((easyCount / totalQs) * 100), color: '#10B981' },
            { name: 'Moderate', percentage: Math.round((modCount / totalQs) * 100), color: '#F59E0B' },
            { name: 'Hard', percentage: Math.round((hardCount / totalQs) * 100), color: '#EF4444' }
          ],
          bloomsTaxonomy: Object.entries(bloomCounts).map(([name, count], i) => ({
            name,
            percentage: Math.round((count / totalQs) * 100),
            color: ['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'][i % 5]
          })),
          topicWeightage: [], // Topics are per-question; combined dashboard handles aggregate view
          strategy: [
            "Balanced coverage observed across all subject tracks.",
            "High-density unit recovery successful for medical entrance pattern."
          ]
        };

        // --- IMAGE EXTRACTION FOR COMBINED PAPERS (optimized vision approach) ---
        if (mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          try {
            const questionsWithBoxes = extractionData.questions
              .filter((q: any) => q.hasVisualElement && q.visualBoundingBox)
              .map((q: any) => ({
                questionNumber: parseInt(q.question_number),
                boundingBox: q.visualBoundingBox
              }))
              .filter((item: any) => item.questionNumber && item.boundingBox);

            if (questionsWithBoxes.length > 0) {
              console.log('🎯 [COMBINED - VISION] Extracting images using AI bounding boxes:', questionsWithBoxes.length);
              const { extractImagesByBoundingBoxes } = await import('../utils/visionGuidedExtractor');

              imageMapping = await extractImagesByBoundingBoxes(
                file,
                questionsWithBoxes,
                (idx, total) => {
                  const percent = 70 + (Math.round((idx / total) * 15)); // Use 15% range for images (70% to 85%)
                  setPipelineProgress(percent);
                  setLoadingStage(`Visual Analysis: Processing diagram ${idx + 1} of ${total}...`);
                }
              );
              setPipelineProgress(85);
            } else {
              console.log('🖼️ [COMBINED - BASIC] Fallback image extraction...');
              const { extractAndMapImages } = await import('../utils/pdfImageExtractor');
              const result = await extractAndMapImages(file);
              imageMapping = result?.mapping;
            }
          } catch (err) {
            console.warn('⚠️ [COMBINED - IMAGE] Failed:', err);
          }
        }
      }
      else if (useSimplifiedExtraction && subj === 'Math') {
        console.log('🚀 [SIMPLIFIED MODE - SINGLE FILE - MATH] Restoring SUCCESS-MATH_FORMAT_ALL logic');
        const simpleQuestions = await extractQuestionsSimplified(file, apiKey, selectedModel, subj, activeExamContext);

        // Convert the rich Gemini output to our database schema
        extractionData = {
          questions: simpleQuestions.map((sq: any, sIdx: number) => {
            const hasVisual = !!sq.visualBoundingBox || !!sq.hasVisualElement;

            return {
              id: sq.id ? sq.id.toString() : (sIdx + 1).toString(),
              question_number: sq.id ? sq.id.toString().replace(/\D/g, '') : (sIdx + 1).toString(),
              page_number: sq.page || 1,
              text: sq.text,
              correct_answer: sq.options?.find((o: any) => o.isCorrect)?.id?.toUpperCase() || "",
              options: (sq.options || []).map((opt: any) => {
                const idStr = opt.id ? `(${opt.id.toLowerCase()}) ` : "";
                return `${idStr}${opt.text || opt}`;
              }),
              marks: 1,
              difficulty: sq.difficulty || 'Medium',
              topic: matchToOfficialTopic(sq.chapter || sq.topic || 'Mathematics', 'Math') || 'Mathematics',
              blooms: sq.blooms || 'Apply',
              domain: sq.domain || 'Mathematics',
              chapter: matchToOfficialTopic(sq.chapter || sq.topic || 'General Mathematics', 'Math') || 'General Mathematics',
              hasVisualElement: hasVisual,
              visualElementType: hasVisual ? 'diagram' : null,
              visualBoundingBox: sq.visualBoundingBox || null,
              visualElementDescription: null
            };
          })
        };

        // Baseline analytic data
        analyticData = {
          subject: 'Math',
          examType: activeExamContext,
          topicDistribution: { 'General': extractionData.questions.length },
          performanceMetrics: { overallScore: 0, accuracy: 0 }
        };

        // --- IMAGE EXTRACTION FOR SIMPLIFIED MATH ---
        if ((mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
          try {
            // Priority 1: Vision-Guided (Using AI-provided bounding boxes)
            const questionsWithBoxes = extractionData.questions
              .filter((q: any) => q.hasVisualElement && q.visualBoundingBox)
              .map((q: any) => ({
                questionNumber: parseInt(q.question_number),
                boundingBox: q.visualBoundingBox
              }))
              .filter((item: any) => item.questionNumber && item.boundingBox);

            if (questionsWithBoxes.length > 0) {
              console.log('🎯 [SIMPLIFIED MATH - VISION] Using precise AI bounding boxes:', questionsWithBoxes.length);
              const { extractImagesByBoundingBoxes } = await import('../utils/visionGuidedExtractor');
              imageMapping = await extractImagesByBoundingBoxes(file, questionsWithBoxes);
              console.log('✅ [SIMPLIFIED MATH - VISION] Extracted diagrams for', imageMapping.size, 'questions');
            } else {
              // Priority 2: Basic Proximity Fallback (Only if no boxes provided)
              console.log('🖼️ [SIMPLIFIED MATH - BASIC] Page-Level fallback...');
              const { extractAndMapImages } = await import('../utils/pdfImageExtractor');
              const result = await extractAndMapImages(file);
              imageMapping = result?.mapping;
              (window as any).rawExtractedImages = result?.rawImages;
              console.log('✅ [SIMPLIFIED MATH - BASIC] Extracted', (imageMapping?.size || 0), 'images');
            }
          } catch (err) {
            console.warn('⚠️ [SIMPLIFIED MATH - IMAGE] Failed:', err);
          }
        }
      } else if (useSimplifiedExtraction && subj === 'Physics') {
        console.log('🚀 [SIMPLIFIED MODE - SINGLE FILE - PHYSICS] Using schema-driven extraction with @google/genai');
        const simpleQuestions = await extractPhysicsQuestionsSimplified(file, apiKey, selectedModel, subj, activeExamContext);
        // Convert simplified format to our existing format
        extractionData = {
          questions: simpleQuestions.map((sq: any) => ({
            id: `Q${sq.id}`,
            text: sq.text,
            options: sq.options.map((opt: any) => `(${opt.id}) ${opt.text}`),
            correct_answer: sq.options?.find((o: any) => o.isCorrect)?.id?.toUpperCase() || "",
            marks: 1,
            difficulty: sq.difficulty || 'Medium',
            topic: matchToOfficialTopic(sq.topic || 'Physics', 'Physics') || 'Physics',
            domain: sq.domain || 'MECHANICS',
            blooms: sq.blooms || 'Apply',
            hasVisualElement: !!sq.hasVisualElement,
            visualElementType: sq.visualElementType || null,
            visualElementDescription: sq.visualElementDescription || null,
            visualBoundingBox: sq.visualBoundingBox || null,
            source: `${file.name}`
          }))
        };

        // --- IMAGE EXTRACTION FOR SIMPLIFIED PHYSICS ---
        if ((mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
          try {
            if (enableVisionExtraction) {
              const questionsWithBoundingBoxes = extractionData.questions
                .filter((q: any) => q.hasVisualElement && q.visualBoundingBox)
                .map((q: any) => ({
                  questionNumber: parseInt(q.id.replace(/\D/g, '')),
                  boundingBox: q.visualBoundingBox
                }))
                .filter((item: any) => item.questionNumber && item.boundingBox);

              if (questionsWithBoundingBoxes.length > 0) {
                console.log('🎯 [SIMPLIFIED PHYSICS - VISION] Found', questionsWithBoundingBoxes.length, 'questions with bounding boxes');
                const { extractImagesByBoundingBoxes } = await import('../utils/visionGuidedExtractor');
                imageMapping = await extractImagesByBoundingBoxes(file, questionsWithBoundingBoxes);
                console.log('✅ [SIMPLIFIED PHYSICS - VISION] Extracted', imageMapping.size, 'images');
              }
            } else {
              console.log('🖼️ [SIMPLIFIED PHYSICS - BASIC] Extracting images...');
              const { extractAndMapImages } = await import('../utils/pdfImageExtractor');
              const result = await extractAndMapImages(file);
              imageMapping = result.mapping;
              (window as any).rawExtractedImages = result.rawImages;
              console.log('✅ [SIMPLIFIED PHYSICS - BASIC] Extracted', imageMapping?.size || 0, 'images');
            }
          } catch (err) {
            console.warn('⚠️ [SIMPLIFIED PHYSICS - IMAGE] Failed:', err);
          }
        }
      } else if (useSimplifiedExtraction && subj === 'Biology') {
        console.log('🚀 [SIMPLIFIED MODE - SINGLE FILE - BIOLOGY] Using schema-driven extraction with @google/genai');
        const simpleQuestions = await extractBiologyQuestionsSimplified(file, apiKey, selectedModel, activeExamContext);
        // Convert simplified format to our existing format
        extractionData = {
          questions: simpleQuestions.map((sq: any) => ({
            id: `Q${sq.id}`,
            text: sq.text,
            options: sq.options.map((opt: any) => `(${opt.id}) ${opt.text}`),
            correct_answer: sq.options?.find((o: any) => o.isCorrect)?.id?.toUpperCase() || "",
            marks: 1,
            difficulty: sq.difficulty || 'Medium',
            topic: matchToOfficialTopic(sq.topic || 'Biology', 'Biology') || 'Biology',
            domain: sq.domain || 'Biotechnology',
            blooms: sq.blooms || 'Apply',
            hasVisualElement: !!sq.hasVisualElement,
            visualElementType: sq.visualElementType || null,
            visualElementDescription: sq.visualElementDescription || null,
            visualBoundingBox: sq.visualBoundingBox || null,
            source: `${file.name}`
          }))
        };

        // --- IMAGE EXTRACTION FOR SIMPLIFIED BIOLOGY ---
        if ((mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
          try {
            if (enableVisionExtraction) {
              const questionsWithBoundingBoxes = extractionData.questions
                .filter((q: any) => q.hasVisualElement && q.visualBoundingBox)
                .map((q: any) => ({
                  questionNumber: parseInt(q.id.replace(/\D/g, '')),
                  boundingBox: q.visualBoundingBox
                }))
                .filter((item: any) => item.questionNumber && item.boundingBox);

              if (questionsWithBoundingBoxes.length > 0) {
                console.log('🎯 [SIMPLIFIED BIOLOGY - VISION] Found', questionsWithBoundingBoxes.length, 'questions with bounding boxes');
                const { extractImagesByBoundingBoxes } = await import('../utils/visionGuidedExtractor');
                imageMapping = await extractImagesByBoundingBoxes(file, questionsWithBoundingBoxes);
                console.log('✅ [SIMPLIFIED BIOLOGY - VISION] Extracted', imageMapping.size, 'images');
              }
            } else {
              console.log('🖼️ [SIMPLIFIED BIOLOGY - BASIC] Extracting images...');
              const { extractAndMapImages } = await import('../utils/pdfImageExtractor');
              const result = await extractAndMapImages(file);
              imageMapping = result.mapping;
              (window as any).rawExtractedImages = result.rawImages;
              console.log('✅ [SIMPLIFIED BIOLOGY - BASIC] Extracted', imageMapping?.size || 0, 'images');
            }
          } catch (err) {
            console.warn('⚠️ [SIMPLIFIED BIOLOGY - IMAGE] Failed:', err);
          }
        }
      } else if (useSimplifiedExtraction && subj === 'Chemistry') {
        console.log('🚀 [SIMPLIFIED MODE - CHEMISTRY] Using schema-driven page-by-page extraction...');
        const simpleQuestions = await extractChemistryQuestionsSimplified(file, apiKey, selectedModel, subj, activeExamContext);
        extractionData = {
          questions: simpleQuestions.map((sq: any) => ({
            id: `Q${sq.id}`,
            text: sq.text,
            options: sq.options?.map((opt: any) => `(${opt.id}) ${opt.text}`) || [],
            correct_answer: sq.options?.find((o: any) => o.isCorrect)?.id?.toUpperCase() || "",
            marks: 1,
            difficulty: sq.difficulty || 'Moderate',
            topic: matchToOfficialTopic(sq.topic || 'Chemistry', 'Chemistry') || 'Chemistry',
            domain: sq.domain || 'Physical Chemistry',
            blooms: sq.blooms || 'Apply',
            hasVisualElement: !!sq.hasVisualElement,
            visualElementType: sq.visualElementType || null,
            visualElementDescription: sq.visualElementDescription || null,
            visualBoundingBox: sq.visualBoundingBox || null,
            source: `${file.name}`
          }))
        };

        // Image extraction for Chemistry (basic proximity-based)
        if (mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          try {
            const { extractAndMapImages } = await import('../utils/pdfImageExtractor');
            const result = await extractAndMapImages(file);
            imageMapping = result.mapping;
            (window as any).rawExtractedImages = result.rawImages;
            console.log('✅ [SIMPLIFIED CHEMISTRY - IMAGE] Extracted', imageMapping?.size || 0, 'images');
          } catch (err) {
            console.warn('⚠️ [SIMPLIFIED CHEMISTRY - IMAGE] Failed:', err);
          }
        }
      } else {

        const extractionPrompt = subj === 'Math'
          ? generateCleanMathPrompt(selectedGrade)
          : subj === 'Physics'
            ? generateCleanPhysicsPrompt(selectedGrade)
            : subj === 'Biology'
              ? generateCleanBiologyPrompt(activeExamContext)
              : subj === 'Chemistry'
                ? generateCleanChemistryPrompt(selectedGrade)
                : `Extract ALL questions verbatim from this ${subj} (${selectedGrade}) paper.
      RULES:
      1. SYLLABUS COMPLIANCE: Strictly follow the latest official NCERT Class 12 syllabus for ${subj}.
      2. MARKING SCHEME: Extract marks verbatim. MCQs are usually 1 Mark.
      3. Verbatim Extraction: Copy text exactly as seen in the paper. Extract what you OBSERVE, not what you EXPECT.
      4. Math Formatting: Wrap ALL mathematical expressions, symbols, and formulas in $ delimiters ($...$ for inline, $$...$$ for display).
      5. LaTeX Commands: Use standard LaTeX for math (e.g., \\frac{a}{b}, \\sqrt{x}, \\sin\\theta).
      6. Space Preservation: Ensure spaces are preserved between words. Avoid merging words.
      7. Visual Elements: Detect if a question has a diagram/table/graph and provide a brief description and location.
      ${subj === 'Math' ? `4. CRITICAL MATH NOTATION - READ CAREFULLY:

${generateStreamlinedMathInstructions()}
` : subj === 'Physics' ? `4. CRITICAL PHYSICS NOTATION - READ CAREFULLY:

${generatePhysicsExtractionInstructions()}
` : ''}.
      ${subj === 'Math' || subj === 'Physics' ? '5' : '4'}. Classify each question into the correct NCERT ${selectedGrade} ${subj} domain and chapter.
      ${subj === 'Math' || subj === 'Physics' ? '6' : '5'}. VISUAL ELEMENT DETECTION WITH PRECISE LOCATION:
         - If question has a diagram/figure/table/graph nearby OR text mentions "shown"/"following figure":
           * Set hasVisualElement=true
           * Provide visualElementDescription="[Detailed description]"
           * CRITICAL: Provide visualBoundingBox with PERCENTAGE-BASED coordinates from page edges:
             {
               "pageNumber": 3,
               "x": "10%",  (distance from left edge as %)
               "y": "45%",  (distance from top edge as %)
               "width": "80%",  (width of diagram as % of page width)
               "height": "25%"  (height of diagram as % of page height)
             }
           * This gives us pixel-perfect extraction of the diagram
         - If no visual, set hasVisualElement=false
         ${subj === 'Math' ? `
         - MATH-SPECIFIC VISUALS: Look for coordinate planes, geometric figures (triangles, circles), 3D diagrams, matrices, number lines, Venn diagrams, tree diagrams (probability), or flowcharts
         - Set appropriate visualElementType: coordinate-plane, geometric-figure, 3d-diagram, matrix, number-line, venn-diagram, tree-diagram, or flowchart
         ` : subj === 'Physics' ? `
         - PHYSICS-SPECIFIC VISUALS: Look for circuit diagrams (resistors, capacitors, batteries, switches), ray diagrams (lenses, mirrors, prisms, light paths), free body diagrams (forces with arrows), wave diagrams (interference patterns, standing waves), field diagrams (electric/magnetic field lines), energy level diagrams (atomic transitions)
         - Set appropriate visualElementType: circuit-diagram, ray-diagram, free-body-diagram, wave-diagram, field-diagram, or energy-level-diagram
         ` : ''}

      ${subj === 'Math' || subj === 'Physics' ? '6' : '5'}. CRITICAL: Extract ALL questions from the paper (scan every page, no limit). Use minimal text in descriptions to fit all questions in response.

      ${subj === 'Physics' ? `
      PHYSICS DOMAINS & CHAPTERS (Class 12 NCERT):
      - MECHANICS: Circular Motion, Laws of Motion, Work Energy and Power, System of Particles and Rotational Motion, Gravitation, Kinematics, Mechanical Properties of Solids, Mechanical Properties of Fluids, Thermodynamics
      - ELECTRODYNAMICS: Current Electricity, Moving Charges and Magnetism, Electromagnetic Induction, Alternating Current, Electrostatics, Magnetism and Matter, Electrostatic Potential and Capacitance, Electromagnetic Waves, Semiconductor Electronics
      - MODERN PHYSICS: Atoms, Nuclei, Dual Nature of Radiation and Matter
      - OPTICS: Wave Optics, Ray Optics and Optical Instruments
      - OSCILLATIONS & WAVES: Oscillations, Waves
      ` : subj === 'Chemistry' ? `
      CHEMISTRY DOMAINS & CHAPTERS (Class 12 NCERT):
      - PHYSICAL CHEMISTRY: Solutions, Electrochemistry, Chemical Kinetics, Surface Chemistry, Solid State
      - ORGANIC CHEMISTRY: Alcohols Phenols and Ethers, Aldehydes Ketones and Carboxylic Acids, Amines, Biomolecules, Polymers, Chemistry in Everyday Life, Haloalkanes and Haloarenes
      - INORGANIC CHEMISTRY: p-Block Elements, d and f Block Elements, Coordination Compounds, General Principles and Processes of Isolation of Elements
      ` : subj === 'Math' ? `
      MATHEMATICS DOMAINS & CHAPTERS (Class 12 NCERT):
      - ALGEBRA: Relations and Functions, Inverse Trigonometric Functions, Matrices, Determinants, Continuity and Differentiability, Application of Derivatives, Maxima and Minima, Rate of Change, Monotonicity
      - CALCULUS: Integrals, Indefinite Integration, Definite Integration, Applications of Integrals, Area under Curves, Differential Equations, Variable Separable, Linear Differential Equations, Homogeneous Equations
      - VECTORS & 3D GEOMETRY: Vectors, Scalar and Vector Products, Dot Product, Cross Product, Scalar Triple Product, Three Dimensional Geometry, Direction Cosines, Direction Ratios, Equation of Line, Equation of Plane, Angle Between Lines, Angle Between Planes, Distance Formulae
      - LINEAR PROGRAMMING: Linear Programming Problems, Optimization, Feasible Region, Objective Function, Constraints, Graphical Method, Corner Point Method
      - PROBABILITY: Probability, Conditional Probability, Bayes Theorem, Multiplication Theorem, Independent Events, Random Variables, Probability Distributions, Binomial Distribution, Mean and Variance
      ` : subj === 'Biology' ? `
      BIOLOGY DOMAINS & CHAPTERS (Class 12 NCERT):
      - GENETICS & EVOLUTION: Heredity and Variation, Molecular Basis of Inheritance, Evolution
      - BIOLOGY IN HUMAN WELFARE: Human Health and Disease, Strategies for Enhancement in Food Production, Microbes in Human Welfare
      - BIOTECHNOLOGY: Biotechnology Principles and Processes, Biotechnology and its Applications
      - ECOLOGY: Organisms and Populations, Ecosystem, Biodiversity and Conservation, Environmental Issues
      - REPRODUCTION: Reproduction in Organisms, Sexual Reproduction in Flowering Plants, Human Reproduction, Reproductive Health
      ` : ''}

      SCHEMA: { "questions": [{
        "id": "Q1",
        "text": "...",
        "options": ["..."],
        "marks": 1,
        "difficulty": "...",
        "topic": "Same as chapter name OR more specific sub-topic (e.g., 'Differential Equations' or 'Matrices'). NEVER leave empty!",
        "blooms": "...",
        "domain": "MECHANICS | ELECTRODYNAMICS | etc. (major domain from above)",
        "chapter": "Specific chapter name from the list above that best matches this question",
        "hasVisualElement": true | false,
        "visualElementType": "diagram" | "table" | "graph" | "illustration" | "chart" | "image" | "coordinate-plane" | "geometric-figure" | "3d-diagram" | "matrix" | "number-line" | "venn-diagram" | "tree-diagram" | "flowchart" | "circuit-diagram" | "ray-diagram" | "free-body-diagram" | "wave-diagram" | "field-diagram" | "energy-level-diagram" (if hasVisualElement is true),
        "visualElementDescription": "Detailed description of the diagram/table/image content, including all labels, values, and key features. For Math: describe axes, equations, vertices, measurements. For Physics: describe circuit components, ray paths, forces, field directions, etc." (if hasVisualElement is true),
        "visualElementPosition": "above" | "below" | "inline" | "side" (if hasVisualElement is true),
        "visualBoundingBox": { "pageNumber": 3, "x": "10%", "y": "45%", "width": "80%", "height": "25%" } (if hasVisualElement is true, percentage coordinates from page edges)
      }] }`;

        // Track 2: Pedagogical Meta-Analysis (Charts/Summary)
        const analysisPrompt = `Synthesize structural analysis for this ${selectedSubject} paper.
        SCHEMA: {
          "summary": "Full paper meta-analysis...",
          "overallDifficulty": "Moderate",
          "difficultyDistribution": [{"name": "Easy", "percentage": 30, "color": "#10b981"}, ...],
          "bloomsTaxonomy": [{"name": "Remembering", "percentage": 20, "color": "#6366f1"}, ...],
          "topicWeightage": [{"name": "Optics", "marks": 14, "color": "#f59e0b"}, ...],
          "predictiveTopics": [{"topic": "Compound Microscope", "probability": 85, "reason": "High-yield derivation frequency in late-stage board cycles."}],
          "evolutionNote": "Qualitative insight (max 15 words) on how this paper's rigor or style has evolved compared to past standards (e.g., 'Increasing focus on multi-chapter conceptual fusion' or 'Shift towards calculation-heavy mechanics').",
          "strategy": ["Prioritize derivation A...", "Logic focus on B..."]
        }`;

        console.log(`🚀 [${selectedSubject.toUpperCase()} EXTRACTION] Starting ${subj === 'Biology' ? 'cleanBiologyExtractor' : subj === 'Math' ? 'cleanMathExtractor' : subj === 'Physics' ? 'cleanPhysicsExtractor' : 'legacy'} for ${file.name}`);
        const [extractRes, analysisRes] = await Promise.all([
          genModel.generateContent([{ inlineData: { mimeType, data: base64Data } }, extractionPrompt]),
          genModel.generateContent([{ inlineData: { mimeType, data: base64Data } }, analysisPrompt])
        ]);

        const rawExtract = extractRes.response.text();
        const rawAnalysis = analysisRes.response.text();

        // Debug: Log raw response length and preview
        console.log('📥 [RAW RESPONSE DEBUG] Extraction response length:', rawExtract.length, 'chars');
        console.log('📥 [RAW RESPONSE DEBUG] First 500 chars:', rawExtract.substring(0, 500));
        console.log('📥 [RAW RESPONSE DEBUG] Last 500 chars:', rawExtract.substring(Math.max(0, rawExtract.length - 500)));

        // Check if JSON is truncated
        const openBraces = (rawExtract.match(/\{/g) || []).length;
        const closeBraces = (rawExtract.match(/\}/g) || []).length;
        const openBrackets = (rawExtract.match(/\[/g) || []).length;
        const closeBrackets = (rawExtract.match(/\]/g) || []).length;
        console.warn('⚠️ [JSON STRUCTURE] Open braces:', openBraces, 'Close braces:', closeBraces, 'Diff:', openBraces - closeBraces);
        console.warn('⚠️ [JSON STRUCTURE] Open brackets:', openBrackets, 'Close brackets:', closeBrackets, 'Diff:', openBrackets - closeBrackets);

        extractionData = safeAiParse<any>(rawExtract, { questions: [] }, true);
        analyticData = safeAiParse<any>(rawAnalysis, {}, false);
      } // End of legacy extraction

      // For simplified mode, set minimal analysis data
      if (useSimplifiedExtraction && !isCombinedPaperMode && (subj === 'Math' || subj === 'Physics')) {
        analyticData = {
          summary: `Questions extracted using simplified mode for ${selectedSubject}`,
          overallDifficulty: 'Moderate',
          difficultyDistribution: [],
          bloomsTaxonomy: [],
          topicWeightage: [],
          predictiveTopics: [],
          strategy: []
        };
      }

      // 🐛 DEBUG: Log BEFORE Unicode conversion to see raw extraction
      if (extractionData.questions && extractionData.questions.length > 0) {
        console.log(`🔍 [RAW EXTRACTION DEBUG] First 3 questions BEFORE Unicode conversion:`,
          extractionData.questions.slice(0, 3).map((q: any) => ({
            id: q.id,
            text: q.text?.substring(0, 100),
            topic: q.topic,
            domain: q.domain
          }))
        );
      }

      // ⭐ CRITICAL: Convert Unicode symbols (θ, √, etc.) to LaTeX before processing
      // SKIP for simplified mode - it already produces correct double-backslash LaTeX
      const isSimplifiedMode = useSimplifiedExtraction && (subj === 'Math' || subj === 'Physics' || subj === 'Biology' || subj === 'Chemistry');

      if (extractionData.questions && extractionData.questions.length > 0 && !isSimplifiedMode) {
        extractionData.questions = processQuestionsUnicode(extractionData.questions);
        console.log(`✨ [UNICODE CONVERSION] Processed ${extractionData.questions.length} questions for Unicode→LaTeX conversion`);

        // ⭐ VALIDATION: Check for common extraction errors (Math only)
        if (subj === 'Math') {
          const validation = validateExtraction(extractionData);
          console.log(`🔍 [VALIDATION] Questions: ${validation.questionCount}, Valid: ${validation.valid}, Errors: ${validation.errors.length}`);

          if (validation.errors.length > 0) {
            console.error('❌ [VALIDATION ERRORS]', validation.errors.slice(0, 10)); // Show first 10
            validation.errors.forEach(err => {
              console.warn(`  - ${err.questionId} [${err.field}]: ${err.error}`);
            });
          }
        }

        // 🐛 DEBUG: Log topic assignments for classification debugging
        const topicSummary = extractionData.questions.slice(0, 10).map((q: any) => ({
          id: q.id,
          text: q.text?.substring(0, 60),
          options: q.options?.length || 0,
          topic: q.topic,
          domain: q.domain
        }));
        console.log(`📊 [TOPIC DEBUG] Single paper - topic assignments (first 10):`, topicSummary);
      } else if (isSimplifiedMode) {
        console.log(`✅ [SIMPLIFIED MODE - ${selectedSubject}] Skipping Unicode conversion - LaTeX already correct with double backslashes`);
      }

      console.log('🔧 [PARSER DEBUG] Parsed questions count:', extractionData.questions?.length || 0);

      // 🔄 RECURSIVE SECOND PASS: Keep extracting until we have all questions (Math papers typically have 60 questions)
      // SKIP for simplified mode - it extracts all questions in one pass
      const expectedQuestions = subj === 'Math' ? 60 : 50; // Math = 60, others ~50
      let passNumber = 2;
      const MAX_PASSES = 5; // Safety limit to prevent infinite loops

      while (
        !isSimplifiedMode && // Skip recursive passes for both Math AND Physics simplified modes
        extractionData.questions &&
        extractionData.questions.length > 0 &&
        extractionData.questions.length < expectedQuestions &&
        passNumber <= MAX_PASSES
      ) {
        console.warn(`⚠️ [INCOMPLETE EXTRACTION - PASS ${passNumber}] Got ${extractionData.questions.length}/${expectedQuestions} questions, attempting another pass...`);

        try {
          const lastQNum = extractionData.questions.length;

          // Use CLEAN Math prompt for second pass if subject is Math
          console.log(`🔍 [PASS ${passNumber} DEBUG] Subject: ${selectedSubject}, Using clean Math prompt: ${subj === 'Math'}`);

          const remainingPrompt = subj === 'Math'
            ? generateCleanMathPrompt(selectedGrade) + `\n\n🚨 CRITICAL: PASS ${passNumber} - START from Q${lastQNum + 1}

Already extracted: Q1-Q${lastQNum}
NOW extract: Q${lastQNum + 1} onwards (ALL remaining questions)
DO NOT repeat Q1-Q${lastQNum}`
            : subj === 'Physics'
              ? generateCleanPhysicsPrompt(selectedGrade) + `\n\n🚨 CRITICAL: PASS ${passNumber} - START from Q${lastQNum + 1}

Already extracted: Q1-Q${lastQNum}
NOW extract: Q${lastQNum + 1} onwards (ALL remaining questions)
DO NOT repeat Q1-Q${lastQNum}`
              : subj === 'Biology'
                ? generateCleanBiologyPrompt(activeExamContext) + `\n\n🚨 CRITICAL: PASS ${passNumber} - START from Q${lastQNum + 1}

Already extracted: Q1-Q${lastQNum}
NOW extract: Q${lastQNum + 1} onwards (ALL remaining questions)
DO NOT repeat Q1-Q${lastQNum}`
                : `Extract ALL remaining questions starting from question ${lastQNum + 1} onwards from this ${subj} paper.

CRITICAL RULES:
1. SYLLABUS COMPLIANCE: Strictly follow the latest official NCERT Class 12 syllabus for ${subj}.
2. MARKING SCHEME: Scale depth based on marks provided in the paper.
3. Use high fidelity LaTeX for ALL math (wrap in $ delimiters)
4. Convert ALL Unicode symbols to LaTeX commands (\\sin, \\cos, \\theta, \\pi, \\int, etc.)
5. NEVER skip LaTeX conversion - expressions like "xex" must be "xe^x"
6. CRITICAL TRIG FUNCTIONS: ALWAYS use backslash! Write \\sin, \\cos, \\tan, \\sec, \\csc, \\cot NOT sin, cos, tan
7. CRITICAL EXPRESSION INTEGRITY: NEVER break expressions across multiple lines or close $ delimiters mid-expression
   Example WRONG: "$x = e^\\theta$$\\sin\\theta$" or "$x = e^\\theta$\\n$\\sin\\theta$"
   Example RIGHT: "$x = e^\\theta \\sin\\theta, y = e^\\theta \\cos\\theta$"
8. CRITICAL SQRT: ALWAYS use \\sqrt{} with curly braces! Write \\sqrt{x}, \\sqrt{2} NOT sqrt x or sqrtx
9. Use the FULL SCHEMA with ALL fields (especially topic, chapter, domain):
{
  "id": "Q${lastQNum + 1}",
  "text": "... (with proper LaTeX wrapped in $ delimiters)",
  "options": ["(A) ...", "(B) ...", "(C) ...", "(D) ..."],
  "marks": 1,
  "difficulty": "Easy|Moderate|Hard",
  "topic": "Same as chapter name OR specific sub-topic (e.g., 'Differential Equations', 'Matrices'). NEVER leave empty!",
  "blooms": "Knowledge|Understand|Apply|Analyze|Evaluate|Create",
  "domain": "${subj === 'Math' ? 'ALGEBRA|CALCULUS|VECTORS & 3D GEOMETRY|LINEAR PROGRAMMING|PROBABILITY' : subj === 'Physics' ? 'MECHANICS|ELECTRODYNAMICS|MODERN PHYSICS|OPTICS|OSCILLATIONS & WAVES' : 'Domain from subject'}",
  "chapter": "Specific chapter name from NCERT Class 12 ${selectedSubject} syllabus",
  "hasVisualElement": true|false,
  "visualElementType": "diagram"|"table"|"graph"|"coordinate-plane"|"circuit-diagram" (if has visual),
  "visualElementDescription": "..." (if has visual),
  "visualBoundingBox": { "pageNumber": X, "x": "10%", "y": "20%", "width": "80%", "height": "30%" } (if has visual)
}`;

          const remainingRes = await genModel.generateContent([{ inlineData: { mimeType, data: base64Data } }, remainingPrompt]);
          const remainingData = safeAiParse<any>(remainingRes.response.text(), { questions: [] }, true);

          if (remainingData.questions && remainingData.questions.length > 0) {
            // ⭐ Convert Unicode to LaTeX for additional pass questions too
            remainingData.questions = processQuestionsUnicode(remainingData.questions);
            console.log(`✅ [PASS ${passNumber}] Extracted additional ${remainingData.questions.length} questions (Unicode converted)`);
            extractionData.questions.push(...remainingData.questions);
            passNumber++;
          } else {
            console.warn(`⚠️ [PASS ${passNumber}] No more questions extracted, stopping at ${extractionData.questions.length} total`);
            break; // No more questions found, exit loop
          }
        } catch (err) {
          console.error(`❌ [PASS ${passNumber}] Failed:`, err);
          break; // Exit on error
        }
      }

      if (passNumber > 2) {
        console.log(`✅ [EXTRACTION COMPLETE] Total passes: ${passNumber - 1}, Final count: ${extractionData.questions.length}/${expectedQuestions} questions`);

        // Deduplicate questions by ID (fix duplicate keys from recursive passes)
        const seenIds = new Set<string>();
        const deduplicatedQuestions = extractionData.questions.filter((q: any) => {
          if (seenIds.has(q.id)) {
            console.warn(`⚠️ [DEDUPLICATION] Removing duplicate question: ${q.id}`);
            return false;
          }
          seenIds.add(q.id);
          return true;
        });

        if (deduplicatedQuestions.length < extractionData.questions.length) {
          console.log(`🔧 [DEDUPLICATION] Removed ${extractionData.questions.length - deduplicatedQuestions.length} duplicate questions`);
          extractionData.questions = deduplicatedQuestions;
        }
      }

      // Debug: Log visual element detection
      console.log('🔍 [SCAN DEBUG] Extracted questions count:', extractionData.questions?.length || 0);
      if (extractionData.questions && extractionData.questions.length > 0) {
        const questionsWithVisuals = extractionData.questions.filter((q: any) => q.hasVisualElement);
        console.log('🖼️ [SCAN DEBUG] Questions with visual elements:', questionsWithVisuals.length);
        if (questionsWithVisuals.length > 0) {
          console.log('🖼️ [SCAN DEBUG] Sample visual element:', {
            id: questionsWithVisuals[0].id,
            hasVisualElement: questionsWithVisuals[0].hasVisualElement,
            visualElementType: questionsWithVisuals[0].visualElementType,
            visualElementDescription: questionsWithVisuals[0].visualElementDescription?.substring(0, 100) + '...',
            visualElementPosition: questionsWithVisuals[0].visualElementPosition
          });
        }
      }

      // --- IMAGE EXTRACTION (vision-guided if enabled, otherwise basic) ---
      if ((mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) &&
        extractionData.questions && extractionData.questions.length > 0) {
        try {
          if (enableVisionExtraction) {
            // VISION-GUIDED MODE: Use AI-provided bounding boxes for precise extraction
            // ⚡ PERFORMANCE: Adds 1-2 minutes per upload
            const questionsWithBoundingBoxes = extractionData.questions
              .filter((q: any) => q.hasVisualElement && q.visualBoundingBox)
              .map((q: any) => {
                const questionNumMatch = q.id?.match(/Q?(\d+)/i);
                const questionNumber = questionNumMatch ? parseInt(questionNumMatch[1]) : null;
                return {
                  questionNumber,
                  boundingBox: q.visualBoundingBox
                };
              })
              .filter((item: any) => {
                // Validate: must have question number AND complete bounding box with all fields
                if (!item.questionNumber) return false;
                const bb = item.boundingBox;
                if (!bb) return false;
                // Check all required fields are present and valid
                const isValid = bb.pageNumber &&
                  bb.x && typeof bb.x === 'string' &&
                  bb.y && typeof bb.y === 'string' &&
                  bb.width && typeof bb.width === 'string' &&
                  bb.height && typeof bb.height === 'string';
                if (!isValid) {
                  console.warn(`⚠️ [VISION-GUIDED] Q${item.questionNumber} has incomplete bounding box, skipping:`, bb);
                }
                return isValid;
              });

            if (questionsWithBoundingBoxes.length > 0) {
              console.log('🎯 [VISION-GUIDED] Found', questionsWithBoundingBoxes.length, 'questions with bounding boxes');
              const { extractImagesByBoundingBoxes } = await import('../utils/visionGuidedExtractor');
              imageMapping = await extractImagesByBoundingBoxes(file, questionsWithBoundingBoxes);
              console.log('✅ [VISION-GUIDED] Extracted images for', imageMapping.size, 'questions');
            } else {
              console.log('ℹ️ [VISION-GUIDED] No bounding boxes provided, skipping image extraction');
            }
          } else if (!imageMapping || (typeof imageMapping.size === 'number' && imageMapping.size === 0) || typeof imageMapping.get !== 'function') {
            // BASIC MODE: Extract all images from PDF pages (faster, less precise)
            console.log('🖼️ [BASIC IMAGE EXTRACTION] Extracting images from PDF pages...');
            const { extractAndMapImages } = await import('../utils/pdfImageExtractor');
            const result = await extractAndMapImages(file);
            imageMapping = result?.mapping;
            (window as any).rawExtractedImages = result?.rawImages;
            console.log('✅ [BASIC IMAGE EXTRACTION] Extracted images for', (imageMapping?.size !== undefined ? imageMapping.size : "0"), 'question pages');
          }
        } catch (err) {
          console.warn('⚠️ [IMAGE EXTRACTION] Failed:', err);
          // Continue without images - not a critical failure
        }
      }

      console.log('🔍 [MERGE CHECKPOINT] About to check extractionData.questions. Has questions?', !!extractionData.questions, 'Count:', extractionData.questions?.length);
      console.log('🔍 [MERGE CHECKPOINT] imageMapping still available?', !!imageMapping, 'Size:', imageMapping?.size);

      if (extractionData.questions) {
        console.log('✅ [MERGE CHECKPOINT] Inside merge block! Processing', extractionData.questions.length, 'questions');

        // Debug image mapping
        if (imageMapping && imageMapping.size > 0) {
          console.log('🔍 [IMAGE MERGE DEBUG] imageMapping has', imageMapping.size, 'question numbers with images');
          console.log('🔍 [IMAGE MERGE DEBUG] Question numbers with images:', Array.from(imageMapping.keys()));
        } else {
          console.warn('⚠️ [IMAGE MERGE DEBUG] imageMapping is null or empty');
        }

        extractionData.questions = extractionData.questions.map((q: any, idx: number) => {
          const newQuestion: any = {
            ...q,
            id: q.id ? `${extractionId}-${q.id}` : `${extractionId}-q-${idx}`,
            source: file.name
          };

          // Merge extracted images if available
          if (imageMapping) {
            const questionNumMatch = q.id?.match(/(\d+)(?!.*\d)/);
            if (questionNumMatch) {
              const questionNum = parseInt(questionNumMatch[1]);

              // 🛡️ DEFENSIVE: Check if imageMapping is a Map with .get function
              let images = (typeof imageMapping.get === 'function') ? imageMapping.get(questionNum) : null;

              // 💡 FALLBACK: Page-Level Lock (Page 6 graph lock)
              // If spatial mapping failed but AI detected a visual element, 
              // grab ANY images from that specific page.
              if ((!images || images.length === 0) && q.hasVisualElement && (window as any).rawExtractedImages) {
                const pageImages = ((window as any).rawExtractedImages as any[]).filter(img => img.pageNum === q.page_number);
                if (pageImages.length > 0) {
                  console.log(`🎯 [IMAGE FALLBACK] Q${questionNum} Page-Level Lock: Found ${pageImages.length} images on page ${q.page_number}`);
                  images = pageImages;
                }
              }

              if (images && images.length > 0) {
                newQuestion.extractedImages = images.map(img => img.imageData);
                newQuestion.hasVisualElement = true; // Force UI to recognize images
                console.log(`🔗 [IMAGE MERGE] Attached ${images.length} image(s) to question ${questionNum}`);
              }
            }
          }

          return newQuestion;
        });

        // Debug: Check if extractedImages actually made it onto the questions
        if (imageMapping && imageMapping.size > 0) {
          const questionNumbersWithImages = Array.from(imageMapping.keys());
          const sampleQuestionsWithImages = extractionData.questions.filter((q: any) => {
            const rawId = q.id?.toString() || "";
            const numMatch = rawId.match(/(\d+)/);
            if (numMatch) {
              const num = parseInt(numMatch[1]);
              return questionNumbersWithImages.includes(num);
            }
            return false;
          });

          if (sampleQuestionsWithImages.length > 0) {
            console.log(`🔍 [POST-MERGE DEBUG] Questions ${questionNumbersWithImages.join(', ')} after merge:`, sampleQuestionsWithImages.map((q: any) => ({
              id: q.id,
              hasExtractedImages: !!q.extractedImages,
              extractedImagesCount: q.extractedImages?.length || 0,
              extractedImagesPreview: q.extractedImages?.[0]?.substring(0, 50)
            })));
          }
        }
      }

      updatePipelineStatus('extraction', 'complete');
      updatePipelineStatus('analysis', 'complete');
      setPipelineProgress(95);

      // --- PHASE 2: INTEGRATION & FIDELITY LOCK ---
      updatePipelineStatus('skeptic', 'active');
      setLoadingStage('Finalizing Multimodal Lock...');

      const brainData: ExamAnalysisData = isCombinedPaperMode ? {
        ...analyticData,
        questions: extractionData.questions || []
      } : {
        ...analyticData,
        questions: extractionData.questions || []
      };

      // Extract year from filename if present
      const yearMatch = file.name.match(/\b(19|20)\d{2}\b/);
      const extractedYear = yearMatch ? yearMatch[0] : null;

      const newScan: Scan = {
        id: crypto.randomUUID(),
        name: isCombinedPaperMode
          ? `${activeExamContext} ${extractedYear || ''} Combined Paper [${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]`
          : `${file.name.split('.')[0]} [${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]`,
        date: new Date().toISOString(),
        timestamp: Date.now(),
        status: 'Complete',
        grade: selectedGrade || 'Class 12',
        subject: isCombinedPaperMode ? 'Combined' : selectedSubject,
        subjects: isCombinedPaperMode ? combinedPaperSubjects : [selectedSubject as any],
        examContext: activeExamContext,
        year: extractedYear || undefined,
        isCombinedPaper: isCombinedPaperMode,
        analysisData: brainData
      };

      updatePipelineStatus('skeptic', 'complete');
      setPipelineProgress(100);
      onAddScan(newScan);
      onSelectScan(newScan);

      // Short delay for user to see 100% completion before switching
      setTimeout(() => {
        onNavigate('analysis');
      }, 500);

    } catch (e: any) {
      console.error("PIPELINE_ERROR:", e);
      setError(e.message);
      pipelineLogs.forEach(log => updatePipelineStatus(log.stage, 'error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col gap-4 font-instrument bg-slate-50/50">

      {/* Dynamic Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tight">Intelligence Hub</h2>
            <button
              onClick={() => setIsCombinedPaperMode(!isCombinedPaperMode)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-xl ${isCombinedPaperMode
                ? 'bg-indigo-600 text-white border-2 border-indigo-700'
                : 'bg-white text-indigo-600 border-2 border-indigo-400 border-dashed animate-bounce'
                }`}
              title="Full All-in-One Paper Mode (Physics + Chemistry + Biology)"
            >
              🚀 {isCombinedPaperMode ? 'Combined Active' : 'Enable Combined Paper'}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">AI Ops Pipeline: ACTIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Removed Grade/Subject controls - now controlled by top SubjectSwitcher */}
          {/* Current Context Badge */}
          <div
            className="px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm"
            style={{
              backgroundColor: subjectConfig.colorLight,
              color: subjectConfig.colorDark,
              border: `2px solid ${subjectConfig.color}40`
            }}
          >
            <span className="text-base">{subjectConfig.iconEmoji}</span>
            <span>{subjectConfig.displayName}</span>
            <span className="opacity-60">•</span>
            <span>{examConfig.name}</span>
          </div>
          {/* Toolbar Items */}

          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-accent-500/10 shadow-sm outline-none cursor-pointer hover:border-accent-300 transition-colors">
            {AI_CONFIG.displayModels.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <div className="h-6 w-px bg-slate-200" />
          <button
            onClick={() => setUseSimplifiedExtraction(!useSimplifiedExtraction)}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${useSimplifiedExtraction
              ? 'bg-emerald-500 text-white border-2 border-emerald-600'
              : 'bg-white text-slate-400 border-2 border-slate-200 hover:border-slate-300'
              }`}
          >
            {useSimplifiedExtraction ? '✓ SIMPLIFIED MODE' : 'LEGACY MODE'}
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <button
            onClick={() => setEnableVisionExtraction(!enableVisionExtraction)}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${enableVisionExtraction
              ? 'bg-purple-500 text-white border-2 border-purple-600'
              : 'bg-white text-slate-400 border-2 border-slate-200 hover:border-slate-300'
              }`}
            title="Extract diagrams from PDFs using vision AI (adds 1-2 min processing time)"
          >
            {enableVisionExtraction ? '✓ DIAGRAM EXTRACTION' : 'DIAGRAM EXTRACTION'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">

        {/* Left Panel: Primary Actions */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-6 min-h-0">

          {/* Ingestion Zone */}
          <div className={`bg-white border border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-center relative overflow-hidden group/zone shadow-sm transition-all duration-700 ${isProcessing ? 'p-6 md:p-8 min-h-[380px] border-accent-100 shadow-2xl shadow-accent-500/10' : 'p-8 border-dashed'}`}>
            {isProcessing && (
              <>
                {/* Animated top gradient bar */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-500 via-purple-500 to-accent-500 animate-shimmer-fast" style={{ backgroundSize: '200% 100%' }} />

                {/* Floating particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-10 left-10 w-2 h-2 bg-accent-400/30 rounded-full animate-float-slow" />
                  <div className="absolute top-20 right-16 w-1.5 h-1.5 bg-purple-400/30 rounded-full animate-float-medium" />
                  <div className="absolute bottom-20 left-20 w-1 h-1 bg-accent-300/40 rounded-full animate-float-fast" />
                  <div className="absolute bottom-32 right-12 w-2 h-2 bg-purple-300/30 rounded-full animate-float-slow" />
                </div>
              </>
            )}
            {isProcessing ? (
              <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-500 py-2 px-4 max-w-xl mx-auto">
                {/* Compact Header with Glassmorphism */}
                <div className="relative p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-accent-600/20 via-purple-600/20 to-accent-600/20 animate-gradient-shift" style={{ backgroundSize: '200% 200%' }} />

                  <div className="relative flex items-center gap-4">
                    {/* Compact animated icon */}
                    <div className="relative w-12 h-12 bg-gradient-to-br from-white to-slate-100 rounded-xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden border-2 border-slate-700">
                      <Cpu size={22} className="text-slate-900 animate-spin-slow" />
                      <div className="absolute inset-0 bg-gradient-to-t from-accent-500/30 to-transparent animate-pulse-slow" />
                    </div>

                    <div className="flex-1 text-left space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white font-outfit uppercase tracking-tight">
                          AI <span className="text-accent-400">Pipeline</span>
                        </h3>
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 rounded-full bg-accent-400 animate-pulse [animation-delay:0ms]" />
                          <div className="w-1 h-1 rounded-full bg-accent-400 animate-pulse [animation-delay:200ms]" />
                          <div className="w-1 h-1 rounded-full bg-accent-400 animate-pulse [animation-delay:400ms]" />
                        </div>
                      </div>

                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {bulkProgress.total > 1 ? `Portfolio ${bulkProgress.current}/${bulkProgress.total}` : 'Multimodal Analysis'}
                      </p>

                      {/* Sleek progress bar */}
                      <div className="pt-1">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[8px] font-black text-accent-400 uppercase tracking-wide">
                            Progress
                          </span>
                          <span className="text-[8px] font-black text-white tabular-nums">
                            {bulkProgress.total > 1
                              ? Math.round((bulkProgress.current / bulkProgress.total) * 100)
                              : pipelineProgress !== null
                                ? Math.round(pipelineProgress)
                                : Math.round((pipelineLogs.filter(p => p.status === 'complete').length / pipelineLogs.length) * 100)}%
                          </span>
                        </div>
                        <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-500 via-purple-500 to-accent-400 rounded-full transition-all duration-700 ease-out shadow-lg shadow-accent-500/50"
                            style={{
                              width: `${bulkProgress.total > 1
                                ? (bulkProgress.current / bulkProgress.total) * 100
                                : pipelineProgress !== null
                                  ? pipelineProgress
                                  : (pipelineLogs.filter(p => p.status === 'complete').length / pipelineLogs.length) * 100}%`
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-slow" style={{ backgroundSize: '200% 100%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ultra Compact Pipeline Steps - Horizontal Flow */}
                <div className="flex gap-2 items-center justify-center">
                  {pipelineLogs.map((log, i) => (
                    <React.Fragment key={i}>
                      <div className={`group relative flex flex-col items-center gap-1.5 transition-all duration-500 ${log.status === 'active' ? 'scale-110' : ''}`}>
                        {/* Icon circle */}
                        <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 shadow-lg ${log.status === 'complete'
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30'
                          : log.status === 'active'
                            ? 'bg-gradient-to-br from-accent-500 to-purple-600 text-white shadow-accent-500/40 animate-pulse-gentle'
                            : 'bg-slate-100 text-slate-300 border-2 border-slate-200'
                          }`}>
                          {log.status === 'complete' ? (
                            <CheckCircle2 size={18} className="animate-in zoom-in duration-300" />
                          ) : log.status === 'active' ? (
                            <Activity size={18} className="animate-pulse" />
                          ) : (
                            <Clock size={16} />
                          )}

                          {/* Active glow effect */}
                          {log.status === 'active' && (
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent-400 to-purple-500 animate-ping opacity-30" />
                          )}
                        </div>

                        {/* Label */}
                        <div className="text-center max-w-[70px]">
                          <p className={`text-[8px] font-black uppercase tracking-wider leading-tight transition-colors duration-300 ${log.status === 'active' ? 'text-accent-600' : log.status === 'complete' ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                            {log.label.split(' ')[0]}
                          </p>

                          {/* Active indicator */}
                          {log.status === 'active' && (
                            <div className="flex items-center justify-center gap-0.5 mt-0.5">
                              <span className="w-1 h-1 bg-accent-500 rounded-full animate-bounce [animation-delay:0ms]" />
                              <span className="w-1 h-1 bg-accent-500 rounded-full animate-bounce [animation-delay:150ms]" />
                              <span className="w-1 h-1 bg-accent-500 rounded-full animate-bounce [animation-delay:300ms]" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Connector line */}
                      {i < pipelineLogs.length - 1 && (
                        <div className={`h-0.5 w-6 transition-all duration-500 rounded-full ${pipelineLogs[i + 1].status === 'complete' || pipelineLogs[i + 1].status === 'active'
                          ? 'bg-gradient-to-r from-emerald-400 to-accent-400'
                          : 'bg-slate-200'
                          }`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Current Stage Indicator */}
                {loadingStage && (
                  <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-accent-50 to-purple-50 rounded-xl border border-accent-100">
                    <div className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-bold text-accent-700 uppercase tracking-wide">{loadingStage}</span>
                  </div>
                )}

                {/* Minimal Footer */}
                <div className="flex items-center justify-center gap-2 pt-2 opacity-60">
                  <Terminal size={10} className="text-slate-400" />
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">AI Engine v2.0</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover/zone:scale-110 group-hover/zone:rotate-3">
                  <Plus size={24} className="text-slate-400 group-hover/zone:text-accent-600 transition-colors" />
                </div>
                <h3 className="text-lg font-black text-slate-900 font-outfit uppercase tracking-tight">New Ingestion</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-6 italic">Verbatim Multi-Modal PDF/Image Processing</p>
                <label className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] cursor-pointer hover:bg-accent-600 transition-all shadow-xl active:scale-95 group-hover/zone:px-12">
                  Trigger Agent
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png" disabled={isProcessing} multiple />
                </label>
              </>
            )}
          </div>

          {/* Data Monitoring (Dense) - Subject-specific stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: `${subjectConfig.name} Papers`, value: stats.totalScans, icon: Layers, color: 'text-accent-600' },
              { label: 'Total Questions', value: stats.totalQuestions, icon: BrainCircuit, color: 'text-rose-600' },
              { label: 'Topics Covered', value: stats.uniqueTopics, icon: Sparkles, color: 'text-amber-600' }
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <stat.icon size={16} className={`${stat.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</span>
                </div>
                <div className="text-xl font-black text-slate-900 font-outfit uppercase italic">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Vault (Scrollable List) */}
        <div className="col-span-12 xl:col-span-4 min-h-0 flex flex-col">
          <div className="bg-white border border-slate-200 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] font-outfit italic">Vault History</h3>
              <Filter size={14} className="text-slate-400" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scroller-hide bg-slate-50/30">
              {hasScans ? [...filteredScans].reverse().map(scan => (
                <button key={scan.id} onClick={() => { onSelectScan(scan); onNavigate('analysis'); }}
                  className="w-full text-left p-4 bg-white border border-slate-100 rounded-xl hover:border-primary-300 hover:shadow-lg transition-all group/item flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover/item:bg-primary-600 group-hover/item:text-white transition-colors">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-slate-900 truncate uppercase mb-1 font-outfit">{scan.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{scan.date}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover/item:text-primary-600 transform group-hover/item:translate-x-1 transition-all" />
                </button>
              )) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-10 px-6">
                  <div style={{ color: subjectConfig.color }}>
                    <Layers size={32} className="mx-auto mb-3" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    No {subjectConfig.name} papers yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-6 py-3 rounded-xl shadow-2xl font-black text-[10px] uppercase tracking-widest animate-in slide-in-from-bottom-5">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default BoardMastermind;