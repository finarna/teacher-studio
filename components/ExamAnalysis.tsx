import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Target,
  ChevronUp,
  FileText,
  Sigma,
  FolderOpen,
  Zap,
  Sparkles,
  Activity,
  Compass,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Share2,
  Download,
  TrendingUp,
  Trash2
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Scan, AnalyzedQuestion, Subject, ExamContext, ExamAnalysisData } from '../types';
import { RenderWithMath, DerivationStep } from './MathRenderer';
import { safeAiParse } from '../utils/aiParser';
import { generateSketch } from '../utils/sketchGenerators';
// import { fixLatexInObject } from '../utils/latexFixer'; // REMOVED - Gemini returns correct LaTeX
import { useAppContext } from '../contexts/AppContext';
import { useSubjectTheme } from '../hooks/useSubjectTheme';
import { useFilteredScans } from '../hooks/useFilteredScans';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';
import PredictiveTrendsTab from './PredictiveTrendsTab';
import { getApiUrl } from '../lib/api';
import { AI_CONFIG } from '../config/aiConfigs';
import { supabase } from '../lib/supabase';

interface MetricCardProps {
  title: string;
  content: string | number;
  label?: string;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, content, label, icon }) => (
  <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 hover:border-accent-500/50 transition-all group relative overflow-hidden shadow-sm">
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-slate-50 text-slate-500 group-hover:bg-slate-900 group-hover:text-white rounded-xl transition-all shadow-sm border border-slate-100">{icon}</div>
      <div className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em] font-outfit">{title}</div>
    </div>
    <div className="text-2xl font-black text-slate-900 font-outfit flex items-baseline gap-2 mt-0.5">
      {content} {label && <span className="text-xs font-bold text-slate-400 tracking-normal uppercase">{label}</span>}
    </div>
  </div>
);

interface ExamAnalysisProps {
  onBack: () => void;
  scan: Scan | null;
  onGenerateTraining?: () => void;
  onUpdateScan?: (scan: Scan) => void;
  recentScans?: Scan[];
  onSelectScan?: (scan: Scan) => void;
  showOnlyVault?: boolean;
  year?: string;
}

const ExamAnalysis: React.FC<ExamAnalysisProps> = ({ onBack, scan, onUpdateScan, onGenerateTraining, recentScans = [], onSelectScan, showOnlyVault = false, year }) => {
  // Use AppContext for subject/exam awareness
  const { subjectConfig, examConfig, activeSubject } = useAppContext();
  const theme = useSubjectTheme();
  const { scans: filteredScans } = useFilteredScans(recentScans);

  const [isSynthesizingAll, setIsSynthesizingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'trends' | 'vault'>(showOnlyVault ? 'vault' : 'overview');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);
  const [isSynthesizingQuestion, setIsSynthesizingQuestion] = useState<string | null>(null);
  const [intelligenceBreakdownTab, setIntelligenceBreakdownTab] = useState<'logic' | 'visual'>('logic');
  const [isGeneratingVisual, setIsGeneratingVisual] = useState<string | null>(null);
  // Use best default model for visual generation
  const selectedImageModel = AI_CONFIG.visionModel;
  const [enlargedVisualNote, setEnlargedVisualNote] = useState<{ imageUrl: string, questionId: string } | null>(null);
  const [isGroupedView, setIsGroupedView] = useState(false);
  const [mobileVaultView, setMobileVaultView] = useState<'list' | 'detail'>('list');
  const [questionSketches, setQuestionSketches] = useState<Record<string, string>>({});

  // CRITICAL FIX: Auto-select first scan if none selected or scan doesn't match active subject
  // Use ref to track last selected scan ID to prevent infinite loops
  const lastSelectedScanRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!onSelectScan) return;

    // Case 1: No scan selected but we have filtered scans - auto-select first one
    if (!scan && filteredScans.length > 0) {
      if (lastSelectedScanRef.current !== filteredScans[0].id) {
        lastSelectedScanRef.current = filteredScans[0].id;
        onSelectScan(filteredScans[0]);
      }
      return;
    }

    // Case 2: Current scan doesn't match active subject - switch to first filtered scan
    // NEW: Combined paper — check if current scan contains the active subject
    const isSubjectMatch = scan && (
      scan.subject === activeSubject ||
      (scan.isCombinedPaper && scan.subjects?.includes(activeSubject as any))
    );

    if (scan && !isSubjectMatch) {
      // Prevent infinite loop by checking if we already cleared this scan
      if (lastSelectedScanRef.current !== scan.id) {
        lastSelectedScanRef.current = scan.id;

        // Select first filtered scan or null
        if (filteredScans.length > 0) {
          onSelectScan(filteredScans[0]);
        } else {
          onSelectScan(null as any);
        }
      }
      return;
    }

    // Case 3: Valid scan selected - reset the ref
    if (isSubjectMatch) {
      lastSelectedScanRef.current = scan.id;
    }
  }, [activeSubject, scan?.id, filteredScans.length]);

  // Extract analysis data with safe defaults (MUST be before any conditional returns)
  const analysis = (scan?.analysisData || { questions: [] }) as ExamAnalysisData;
  const rawQuestions = analysis.questions || [];
  const safeSubject = scan?.subject || activeSubject;

  // Load sketches for this scan
  useEffect(() => {
    if (!scan?.id) {
      setQuestionSketches({});
      return;
    }

    const controller = new AbortController();

    const loadVisuals = async () => {
      console.log('🖼️ [loadVisuals] Starting for scan:', scan.id);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const url = getApiUrl(`/api/scan-visuals/${scan.id}`);
        console.log('🖼️ [loadVisuals] Fetching from:', url);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });

        if (controller.signal.aborted) return;
        if (response.ok) {
          const result = await response.json();
          if (controller.signal.aborted) return;
          console.log('🖼️ [loadVisuals] Success:', result.data?.questionSketches ? Object.keys(result.data.questionSketches).length : 0, 'sketches found');
          if (result.data?.questionSketches) {
            setQuestionSketches(result.data.questionSketches);
          }
        } else {
          console.error('🖼️ [loadVisuals] Server error:', response.status);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('🖼️ [loadVisuals] Error:', err);
      }
    };

    loadVisuals();
    return () => controller.abort();
  }, [scan?.id]);

  // Main questions source that merges metadata from scan and large sketches from questionSketches state
  const questions = React.useMemo((): AnalyzedQuestion[] => {
    // NEW: Filter by subject if it's a combined paper and we're in a subject-specific view
    const isSubjectSpecificView = activeSubject && !['All', 'Combined'].includes(activeSubject);
    
    // Use raw questions directly - filtering is handled by the render/logic if needed
    let filteredItems = rawQuestions;
    
    return filteredItems.map((q, idx) => {

      // DYNAMIC UPGRADE: Handle 'Biology' or 'Combined' tags for NEET scans
      let inferredSubject = q.subject || scan?.subject;
      let inferredSection = q.section || 'Section A';
      
      // Multi-layer fallback for question position (numeric identifying key)
      const qAny = q as any;
      const qOrder = Number(qAny.questionOrder ?? qAny.question_order ?? qAny.index ?? idx);
      
      const isCombined = !!scan?.isCombinedPaper || rawQuestions.length > 100 || scan?.subject === 'Combined';

      // Ensure subject tagging trigger is robust for NEET
      const needsInference = scan?.examContext === 'NEET' &&
        (!inferredSubject || inferredSubject === 'Combined' || inferredSubject === 'Biology');

      if (isCombined && needsInference) {
        if (qOrder < 50) { 
          inferredSubject = 'Physics' as any;
          inferredSection = qOrder < 35 ? 'Section A' : 'Section B';
        }
        else if (qOrder >= 50 && qOrder < 100) {
          inferredSubject = 'Chemistry' as any;
          const subIdx = qOrder - 50;
          inferredSection = subIdx < 35 ? 'Section A' : 'Section B';
        }
        else if (qOrder >= 100 && qOrder < 150) {
          inferredSubject = 'Botany' as any;
          const subIdx = qOrder - 100;
          inferredSection = subIdx < 35 ? 'Section A' : 'Section B';
        }
        else if (qOrder >= 150) {
          inferredSubject = 'Zoology' as any;
          const subIdx = qOrder - 150;
          inferredSection = subIdx < 35 ? 'Section A' : 'Section B';
        }
      }

      return {
        ...q,
        subject: inferredSubject as Subject,
        section: inferredSection as any,
        sketchSvg: questionSketches[q.id] || questionSketches[qAny.appId] || q.sketchSvg || q.sketchSvgUrl
      };
    });
  }, [rawQuestions, questionSketches, scan?.isCombinedPaper, scan?.subject, scan?.examContext, activeSubject]);


  // Debug: Log visual elements in vault questions
  React.useEffect(() => {
    if (!scan || !scan.analysisData) return;

    const questionsData = scan.analysisData.questions || [];
    console.debug('📊 [VAULT DEBUG] Total questions in vault:', questionsData.length);
    const questionsWithVisuals = questionsData.filter(q => q.hasVisualElement);
    console.debug('🖼️ [VAULT DEBUG] Questions with visual elements:', questionsWithVisuals.length);
    if (questionsWithVisuals.length > 0) {
      console.debug('🖼️ [VAULT DEBUG] Sample visual question:', {
        id: questionsWithVisuals[0].id,
        text: questionsWithVisuals[0].text?.substring(0, 50) + '...',
        hasVisualElement: questionsWithVisuals[0].hasVisualElement,
        visualElementType: questionsWithVisuals[0].visualElementType,
        visualElementDescription: questionsWithVisuals[0].visualElementDescription?.substring(0, 100) + '...',
        visualElementPosition: questionsWithVisuals[0].visualElementPosition
      });
    }
  }, [scan]);

  const toggleQuestion = (id: string) => {
    const isExpanding = expandedQuestionId !== id;
    setExpandedQuestionId(isExpanding ? id : null);
    setMobileVaultView('detail');
    if (isExpanding) {
      const q = questions.find(q => q.id === id);
      if (q && (!q.solutionSteps || q.solutionSteps.length <= 1)) {
        synthesizeQuestionDetails(id);
      }
    }
  };

  const synthesizeQuestionDetails = async (qId: string) => {
    if (!onUpdateScan || !scan || !scan.analysisData) return;
    setIsSynthesizingQuestion(qId);
    try {
      const question = questions.find(q => q.id === qId);
      if (!question) return;

      // Get model from Settings
      const selectedModel = localStorage.getItem('gemini_model') || AI_CONFIG.defaultModel;

      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      });

      // Build options string if question has options (MCQ)
      const optionsText = question.options && question.options.length > 0
        ? `\n\nOPTIONS:\n${question.options.map((opt, idx) => `${['A', 'B', 'C', 'D'][idx]}: ${opt}`).join('\n')}`
        : '';

      // Generate pedagogical solution with JSON escaping examples
      // Biology-specific rules for space preservation and correct answer validation
      const isBiology = (question.subject || scan.subject)?.toLowerCase() === 'biology';
      const prompt = `Elite Academic Specialist: Generate pedagogical solution for ${scan.subject} ${scan.grade}: "${question.text}"${optionsText}

RULES:
1. SYLLABUS COMPLIANCE: Strictly adhere to the latest official NCERT Class 12 syllabus for ${scan.subject}.
2. MARKING SCHEME: Match solution depth to marks (${question.marks} Marks).
3. PEDAGOGY: Provide clear, step-by-step logic.
4. MATH: Wrap ALL math in $$ blocks for display or $ for inline. Use standard LaTeX (\\frac, \\sqrt, \\int, etc.).
5. LATEX DELIMITERS: ALWAYS use $$ ... $$ for blocks and $ ... $ for inline.
6. BIOLOGY: ${isBiology ? 'Preserve spaces between words. Use italics for scientific names.' : 'N/A'}
7. JSON: Output valid JSON.

Schema: {
  "topic": "Specific chapter name",
  "domain": "Subject domain (e.g. Algebra, Mechanics)",
  "difficulty": "Easy/Moderate/Hard",
  "bloomsTaxonomy": "Apply/Analyze/Understand",
  "solutionSteps": ["Step Title ::: Explanation with $$Formula$$ blocks"],
  ${question.options && question.options.length > 0 ? `"correctOptionIndex": 0-3 (Identify correct option A=0, B=1, C=2, D=3),` : ''}
  "masteryMaterial": {
    "coreConcept": "Core principle with $$Key Formula$$",
    "logic": "Reasoning for the solution",
    "memoryTrigger": "Mnemonic or shortcut"
  }
}`;

      console.log('🚀 SENDING PROMPT:', prompt);
      const res = await model.generateContent(prompt);
      const rawText = res.response.text();
      console.log('📥 AI RESPONSE:', rawText.substring(0, 300) + '...');

      let qData = safeAiParse<any>(rawText, null);
      console.log('✅ PARSED DATA:', qData ? 'Success' : 'Failed');

      // FIX: Handle array responses from AI (sometimes returns [{...}] instead of {...})
      if (Array.isArray(qData) && qData.length > 0) {
        qData = qData[0];
      }

      // Store Gemini's response directly - NO fixing needed (Gemini returns correct LaTeX)
      console.log('✅ [SOLUTION] Storing AI response as-is (no LaTeX processing)');

      if (qData && (qData.solutionSteps || qData.masteryMaterial)) {
        // Deep clone for React state detection & Redis sync
        const clonedQuestions = JSON.parse(JSON.stringify(scan.analysisData.questions));
        const finalQuestions = clonedQuestions.map((q: any) =>
          q.id === qId ? {
            ...q,
            topic: qData.topic || q.topic,
            domain: qData.domain || q.domain,
            difficulty: qData.difficulty || q.difficulty,
            blooms: qData.bloomsTaxonomy || q.blooms,
            solutionSteps: qData.solutionSteps,
            masteryMaterial: qData.masteryMaterial,
            // Update correctOptionIndex if AI provided it (for MCQs)
            ...(qData.correctOptionIndex !== undefined && { correctOptionIndex: qData.correctOptionIndex })
          } : q
        );

        const updatedScan = {
          ...scan,
          analysisData: {
            ...scan.analysisData,
            questions: finalQuestions
          }
        } as Scan;

        onUpdateScan(updatedScan);
      } else {
        console.error("SYNTHESIS_CLEAN_FAIL: Response did not match expected schema", rawText);
      }
    } catch (e) {
      console.error("SYNTHESIS_ERROR:", e);
    } finally {
      setIsSynthesizingQuestion(null);
    }
  };

  const synthesizeAllSolutions = async () => {
    if (!onUpdateScan || !analysis || !scan) return;
    setIsSynthesizingAll(true);
    try {
      // Get model from Settings
      const selectedModel = localStorage.getItem('gemini_model') || AI_CONFIG.defaultModel;

      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 4096 }
      });

      // Find questions that need syncing:
      // 1. Questions without solutions
      // 2. MCQs with solutions but missing correctOptionIndex
      const unSolved = questions.filter(q => !q.solutionSteps || q.solutionSteps.length === 0);
      const mcqsMissingAnswer = questions.filter(q =>
        q.options && q.options.length > 0 &&
        q.solutionSteps && q.solutionSteps.length > 0 &&
        q.correctOptionIndex === undefined
      );

      const questionsToSync = [...unSolved, ...mcqsMissingAnswer];

      console.log('🔄 [SYNC ALL] Questions without solutions:', unSolved.length);
      console.log('🎯 [SYNC ALL] MCQs missing correctOptionIndex:', mcqsMissingAnswer.length);
      console.log('📊 [SYNC ALL] Total questions to sync:', questionsToSync.length);

      if (questionsToSync.length === 0) return;

      // Process in batches of 3 to prevent timeouts/stalls
      const batchSize = 3;
      let currentQuestions = [...scan.analysisData!.questions];

      const isBiology = scan.subject?.toLowerCase() === 'biology';

      for (let i = 0; i < questionsToSync.length; i += batchSize) {
        const batch = questionsToSync.slice(i, i + batchSize);
        const batchPromises = batch.map(async (q) => {
          const optionsText = q.options && q.options.length > 0 ? `\n\nOPTIONS:\n${q.options.map((opt, idx) => `${['A', 'B', 'C', 'D'][idx]}: ${opt}`).join('\n')}` : '';
          const prompt = `Elite Academic Specialist: Synthesize pedagogical solution for ${scan.subject} ${scan.grade}: "${q.text || ''}"${optionsText}

RULES:
1. SYLLABUS COMPLIANCE: Strictly follow the latest official NCERT Class 12 syllabus for ${scan.subject}.
2. MARKING SCHEME: Scale depth based on marks (${q.marks} Marks).
3. PEDAGOGY: Provide clear, step-by-step logic.
4. MATH: Wrap ALL math in $$ blocks for display or $ for inline. Use standard LaTeX (\\frac, \\sqrt, \\int, etc.).
5. LATEX DELIMITERS: ALWAYS use $$ ... $$ for blocks and $ ... $ for inline.
6. BIOLOGY: ${isBiology ? 'Preserve spaces between words. Use italics for scientific names.' : 'N/A'}
7. JSON: Output valid JSON.

Schema: {
  "topic": "Specific chapter name",
  "domain": "Subject domain",
  "difficulty": "Easy/Moderate/Hard",
  "bloomsTaxonomy": "Apply/Analyze/Understand",
  "solutionSteps": ["Step Title ::: Explanation with $$Formula$$ blocks"],
  ${q.options && q.options.length > 0 ? `"correctOptionIndex": 0-3 (Identify correct option A=0, B=1, C=2, D=3),` : ''}
  "masteryMaterial": {
    "coreConcept": "Core principle with $$Key Formula$$",
    "logic": "Reasoning for the solution",
    "memoryTrigger": "Mnemonic or shortcut"
  }
}`;
          try {
            const res = await model.generateContent(prompt);
            let data = safeAiParse<any>(res.response.text(), null);
            // Store Gemini's response as-is - LaTeX is already correct
            return { id: q.id, data };
          } catch (err) {
            console.error(`Failed question ${q.id}:`, err);
            return { id: q.id, data: null };
          }
        });

        const results = await Promise.all(batchPromises);
        currentQuestions = currentQuestions.map(q => {
          const result = results.find(r => r.id === q.id && r.data);
          return result ? {
            ...q,
            topic: result.data.topic || q.topic,
            domain: result.data.domain || q.domain,
            difficulty: result.data.difficulty || q.difficulty,
            blooms: result.data.bloomsTaxonomy || q.blooms,
            solutionSteps: result.data.solutionSteps,
            masteryMaterial: result.data.masteryMaterial,
            ...(result.data.correctOptionIndex !== undefined && { correctOptionIndex: result.data.correctOptionIndex })
          } : q;
        });

        const progressingScan = {
          ...scan,
          analysisData: {
            ...scan.analysisData!,
            questions: currentQuestions
          }
        } as Scan;
        onUpdateScan(progressingScan);
      }
    } catch (e) {
      console.error("SYNC_ALL_ERROR:", e);
    } finally {
      setIsSynthesizingAll(false);
    }
  };

  const handleGenerateVisual = async (qId: string) => {
    if (!onUpdateScan || !scan || !scan.analysisData) return;

    const question = scan.analysisData.questions.find(q => q.id === qId);
    if (!question) return;

    setIsGeneratingVisual(qId);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("API Key Missing - Add VITE_GEMINI_API_KEY to .env.local");
        return;
      }

      console.log(`🎨 Generating visual note for question ${qId}...`);

      const result = await generateSketch(
        selectedImageModel, // Use selected model
        question.visualConcept || question.topic,
        question.text,
        question.subject || scan.subject,
        apiKey,
        (status) => console.log(`📊 ${status}`),
        scan.examContext
      );

      console.log(`✓ Generated visual note for ${qId}`);

      // Upload to Supabase Storage directly (avoids 413 — no large payload over network)
      let visualUrl = result.imageData;

      // Local update for immediate UI feedback (optimistic update with base64)
      setQuestionSketches({ ...questionSketches, [qId]: visualUrl });

      let definitiveUrl = visualUrl;

      // SAVE only this single sketch to server (this uploads to S3 + saves to DB immediately!)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const response = await fetch(getApiUrl(`/api/scan-visuals/${scan.id}`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ questionSketches: { [qId]: visualUrl } })
        });
        const resData = await response.json();

        if (resData.uploadedUrls && resData.uploadedUrls[qId]) {
          // Yay! Server successfully uploaded and returned a lightweight HTTP URL!
          definitiveUrl = resData.uploadedUrls[qId];
          console.log(`✅ Switched to definitive storage URL: ${definitiveUrl}`);
        }
      } catch (sErr) {
        console.error('Failed to sync question visual:', sErr);
      }

      // Update the scan with the ACTUAL storage URL so App.tsx can sync lightweight!
      const updatedQuestions = scan.analysisData.questions.map(q =>
        q.id === qId ? { ...q, sketchSvg: definitiveUrl, sketchSvgUrl: definitiveUrl } : q
      );

      const updatedScan: Scan = {
        ...scan,
        analysisData: {
          ...scan.analysisData,
          questions: updatedQuestions
        }
      };

      onUpdateScan(updatedScan);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to generate visual note: ${err.message} `);
    } finally {
      setIsGeneratingVisual(null);
    }
  };

  const handleGenerateAllVisuals = async () => {
    if (!onUpdateScan || !scan || !scan.analysisData) return;

    const questionsWithoutVisuals = scan.analysisData.questions.filter(q => !q.sketchSvg);

    if (questionsWithoutVisuals.length === 0) {
      alert("All questions already have visual notes generated!");
      return;
    }

    const confirmed = confirm(`Generate visual notes for ${questionsWithoutVisuals.length} questions ? This will be batched to avoid timeouts.`);
    if (!confirmed) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("API Key Missing - Add VITE_GEMINI_API_KEY to .env.local");
      return;
    }

    console.log(`🎨 Starting bulk visual note generation for ${questionsWithoutVisuals.length} questions...`);
    setIsGeneratingVisual('bulk');

    const BATCH_SIZE = 5;
    const DELAY_MS = 2500;
    let currentQuestions = [...scan.analysisData.questions];

    for (let i = 0; i < questionsWithoutVisuals.length; i += BATCH_SIZE) {
      const batch = questionsWithoutVisuals.slice(i, i + BATCH_SIZE);
      console.log(`\n🔨 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(questionsWithoutVisuals.length / BATCH_SIZE)}`);

      const batchUrls: Record<string, string> = {};

      // 1. Generate images in parallel using Promise.allSettled
      await Promise.allSettled(batch.map(async (question: any) => {
        try {
          // DYNAMIC INFERENCE: Determine the specific subject for NEET combined papers
          let inferredSubj = question.subject || scan.subject;
          if (scan.examContext === 'NEET' && (inferredSubj === 'Combined' || inferredSubj === 'Biology' || !inferredSubj)) {
            const qOrder = Number(question.questionOrder ?? question.question_order ?? 0);
            if (qOrder < 50) inferredSubj = 'Physics';
            else if (qOrder >= 50 && qOrder < 100) inferredSubj = 'Chemistry';
            else if (qOrder >= 100 && qOrder < 150) inferredSubj = 'Botany';
            else if (qOrder >= 150) inferredSubj = 'Zoology';
          }

          console.log(`🎨 Generating visual note for ${question.id} [${inferredSubj}]...`);
          const result = await generateSketch(
            selectedImageModel,
            question.visualConcept || question.topic,
            question.text,
            inferredSubj,
            apiKey,
            (status) => console.log(`📊 ${question.id}: ${status}`),
            scan.examContext
          );
          batchUrls[question.id] = result.imageData;
          setQuestionSketches(prev => ({ ...prev, [question.id]: result.imageData }));
        } catch (err: any) {
          console.error(`Failed to generate visual for ${question.id}: `, err);
        }
      }));

      // 2. Sync to backend (S3 & metadata) once per batch to avoid HTTP 413 and excessive network loads
      const generatedIds = Object.keys(batchUrls);
      if (generatedIds.length > 0) {
        let definitiveUrls = { ...batchUrls };

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          const res = await fetch(getApiUrl(`/api/scan-visuals/${scan.id}`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ questionSketches: batchUrls })
          });
          const resData = await res.json();
          if (resData.uploadedUrls) {
            definitiveUrls = { ...definitiveUrls, ...resData.uploadedUrls };
          }
        } catch (sErr) {
          console.error('Failed to sync batch to S3:', sErr);
        }

        // 3. Update active state & database representation
        currentQuestions = currentQuestions.map(q =>
          definitiveUrls[q.id] ? { ...q, sketchSvg: definitiveUrls[q.id], sketchSvgUrl: definitiveUrls[q.id] } : q
        );

        const updatedScan: Scan = {
          ...scan,
          analysisData: {
            ...scan.analysisData,
            questions: currentQuestions
          }
        };

        onUpdateScan(updatedScan);
        console.log(`✓ Batch sync complete. Saved ${generatedIds.length} sketches permanently.`);
      }

      // 4. Rate-limit delay between batches
      if (i + BATCH_SIZE < questionsWithoutVisuals.length) {
        console.log(`⏸️ Waiting ${DELAY_MS}ms before next batch to respect rate limits...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    setIsGeneratingVisual(null);
    alert(`✓ Bulk generation complete! Evaluated ${questionsWithoutVisuals.length} missing visuals.`);
  };

  const SUBJECT_DOMAIN_MAPS: Record<string, Record<string, { domain: string, chapters: string[], friction: string }>> = {
    'Physics': {
      'Mechanics': {
        domain: 'Mechanics',
        chapters: ['Circular Motion', 'Laws of Motion', 'Work Energy and Power', 'System of Particles and Rotational Motion', 'Gravitation', 'Kinematics', 'Mechanical Properties of Solids', 'Mechanical Properties of Fluids', 'Fluid', 'Rotational', 'Motion', 'Gravity', 'Work', 'Energy', 'Power', 'Dynamics', 'Units', 'Measurement', 'Properties of Matter', 'Circular', 'Friction', 'Collision', 'Momentum', 'Force', 'Newton', 'Projectile', 'Velocity', 'Acceleration', 'Mass', 'Density', 'Pressure'],
        friction: 'Advanced calculus-based modeling and 3D rigid body constraints.'
      },
      'Electrodynamics': {
        domain: 'Electrodynamics',
        chapters: ['Current Electricity', 'Moving Charges and Magnetism', 'Electromagnetic Induction', 'Alternating Current', 'Electrostatics', 'Magnetism and Matter', 'Electrostatic Potential and Capacitance', 'Electromagnetic Waves', 'Semiconductor Electronics', 'Capacitor', 'Magnetic', 'Current', 'EM Wave', 'Charge', 'Magnetism', 'EMI', 'Alternating', 'Electrostatic', 'Electric', 'Circuit', 'Induction', 'Potentiometer', 'Resistance', 'Ohm', 'Voltage', 'Battery', 'Conductor', 'Insulator', 'Dielectric', 'Flux', 'Gauss', 'Coulomb'],
        friction: 'Multi-field interactions (Lorentz Force) and non-standard topographies.'
      },
      'Modern Physics': {
        domain: 'Modern Physics',
        chapters: ['Atoms', 'Nuclei', 'Dual Nature of Radiation and Matter', 'Modern', 'Bohr', 'De-Broglie', 'Atomic', 'Atom', 'Nuclear', 'Photoelectric', 'Quantum', 'Radioactivity', 'Radioactive', 'X-Ray', 'Photon', 'Electron', 'Proton', 'Neutron', 'Isotope', 'Fission', 'Fusion', 'Planck', 'Einstein', 'Compton'],
        friction: 'Numerical precision with physical constants and proportional scaling.'
      },
      'Optics': {
        domain: 'Optics',
        chapters: ['Wave Optics', 'Ray Optics and Optical Instruments', 'Ray Optic', 'Wave Optic', 'Lens', 'Mirror', 'Interference', 'Diffraction', 'Polarization', 'Prism', 'Refraction', 'Reflection', 'Light', 'Spectrum', 'Dispersion', 'Focal', 'Image', 'Magnification', 'Telescope', 'Microscope'],
        friction: 'Spatial visualization of wave-fronts and geometric alignment.'
      },
      'Thermodynamics': {
        domain: 'Thermodynamics',
        chapters: ['Thermodynamics', 'Kinetic Theory', 'Heat', 'Gas', 'Thermodynamic', 'Thermal', 'Temperature', 'Efficiency', 'Entropy', 'Conduction', 'Convection', 'Radiation', 'Calorimetry', 'Expansion', 'Ideal Gas', 'Carnot', 'Kelvin', 'Celsius'],
        friction: 'Multi-variable state tracking during system transitions.'
      },
      'Waves': {
        domain: 'Oscillations & Waves',
        chapters: ['Oscillations', 'Waves', 'SHM', 'Simple Harmonic', 'Oscillation', 'Spring', 'Sound', 'Wave', 'Beat', 'Doppler', 'Resonance', 'Frequency', 'Amplitude', 'Period', 'Pendulum', 'Vibration'],
        friction: 'Dynamic variable dependencies mass loss vs frequency.'
      },
      'Semiconductors': {
        domain: 'Semiconductors',
        chapters: ['Semiconductor Electronics', 'Logic Gate', 'Rectifier', 'Transistor', 'Diode', 'P-N Junction', 'Electronic Device', 'Semiconductor', 'LED', 'Amplifier', 'Oscillator', 'Digital', 'Analog'],
        friction: 'Boolean implementation vs gate bias determination.'
      }
    },
    'Math': {
      'Algebra': {
        domain: 'Algebra',
        chapters: ['Relations and Functions', 'Inverse Trigonometric Functions', 'Matrices', 'Determinants', 'Continuity and Differentiability', 'Application of Derivatives', 'Maxima and Minima', 'Rate of Change', 'Monotonicity', 'Relation', 'Function', 'Inverse Trigonometric', 'Trigonometric', 'Matrix', 'Determinant', 'Continuity', 'Differentiability', 'Derivative', 'Limit', 'Differentiation', 'Maxima', 'Minima', 'Extrema', 'Tangent', 'Normal', 'Increasing', 'Decreasing', 'Monotonic', 'Rolle', 'LMVT', 'Lagrange'],
        friction: 'Abstract symbolic manipulation and multi-step algebraic transformations.'
      },
      'Calculus': {
        domain: 'Calculus',
        chapters: ['Integrals', 'Indefinite Integration', 'Definite Integration', 'Applications of Integrals', 'Area under Curves', 'Differential Equations', 'Variable Separable', 'Linear Differential Equations', 'Homogeneous Equations', 'Integration', 'Integral', 'Indefinite', 'Definite', 'Area', 'Area under Curve', 'Differential Equation', 'Substitution', 'Partial Fraction', 'By Parts', 'Integration by Parts', 'Fundamental Theorem', 'Linear Differential', 'Homogeneous', 'Non-Homogeneous', 'Application of Integral'],
        friction: 'Multi-variable integration techniques and proper selection of integration methods.'
      },
      'Vectors & 3D': {
        domain: 'Vectors & 3D Geometry',
        chapters: ['Vectors', 'Scalar and Vector Products', 'Dot Product', 'Cross Product', 'Scalar Triple Product', 'Three Dimensional Geometry', 'Direction Cosines', 'Direction Ratios', 'Equation of Line', 'Equation of Plane', 'Angle Between Lines', 'Angle Between Planes', 'Distance Formulae', 'Vector', 'Vector Triple', 'Direction Cosine', 'Direction Ratio', 'Plane', 'Line in Space', '3D', 'Three Dimensional', 'Cartesian', 'Skew Lines', 'Coplanar', 'Distance Formula', 'Angle Between', 'Shortest Distance', 'Perpendicular'],
        friction: 'Spatial visualization and coordinate transformation in 3D space.'
      },
      'Linear Programming': {
        domain: 'Linear Programming',
        chapters: ['Linear Programming Problems', 'Optimization', 'Feasible Region', 'Objective Function', 'Constraints', 'Graphical Method', 'Corner Point Method', 'Linear Programming', 'LPP', 'Constraint', 'Maximize', 'Minimize', 'Corner Point', 'Inequalit', 'Optimal Solution'],
        friction: 'Constraint formulation and geometric interpretation of feasible region.'
      },
      'Probability': {
        domain: 'Probability & Statistics',
        chapters: ['Probability', 'Conditional Probability', 'Bayes Theorem', 'Multiplication Theorem', 'Independent Events', 'Random Variables', 'Probability Distributions', 'Binomial Distribution', 'Mean and Variance', 'Conditional', 'Bayes', 'Random Variable', 'Expectation', 'Variance', 'Binomial', 'Distribution', 'Mean', 'Standard Deviation', 'Independent Event', 'Mutually Exclusive', 'Bernoulli', 'Total Probability', 'Combination', 'Permutation'],
        friction: 'Conditional probability interpretation and distribution identification.'
      }
    },
    'Chemistry': {
      'Physical Chemistry': {
        domain: 'Physical Chemistry',
        chapters: ['Solid State', 'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'Surface Chemistry', 'Crystal Lattice', 'Unit Cell', 'Molarity', 'Molality', 'Mole Fraction', 'Raoult Law', 'Colligative Properties', 'Osmotic Pressure', 'Elevation', 'Depression', 'Galvanic Cell', 'Electrolytic Cell', 'Nernst Equation', 'Conductance', 'Electrode Potential', 'Rate of Reaction', 'Order of Reaction', 'Molecularity', 'Activation Energy', 'Arrhenius Equation', 'Half Life', 'Rate Constant', 'Integrated Rate', 'Adsorption', 'Catalysis', 'Colloid', 'Emulsion', 'Coagulation', 'Tyndall', 'Brownian'],
        friction: 'Quantitative calculations with multiple equilibrium constants and ionic interactions.'
      },
      'Inorganic Chemistry': {
        domain: 'Inorganic Chemistry',
        chapters: ['d and f Block Elements', 'Coordination Compounds', 'Transition Elements', 'Inner Transition Elements', 'Lanthanoids', 'Actinoids', 'Complex', 'Ligand', 'Coordination Number', 'Coordination Entity', 'Werner Theory', 'IUPAC Nomenclature', 'Isomerism', 'Crystal Field Theory', 'CFT', 'Magnetic Properties', 'Color', 'Oxidation State', 'Catalytic Properties', 'Interstitial Compounds', 'Alloy', 'Chromium', 'Manganese', 'Iron', 'Copper', 'Zinc', 'Silver', 'Gold', 'Platinum'],
        friction: 'Complex nomenclature rules and electronic configuration of d-block elements.'
      },
      'Organic Chemistry': {
        domain: 'Organic Chemistry',
        chapters: ['Haloalkanes and Haloarenes', 'Alcohols Phenols and Ethers', 'Aldehydes Ketones and Carboxylic Acids', 'Amines', 'Biomolecules', 'Polymers', 'Chemistry in Everyday Life', 'Halogen', 'Nucleophilic Substitution', 'SN1', 'SN2', 'Elimination', 'Alcohol', 'Phenol', 'Ether', 'Aldehyde', 'Ketone', 'Carboxylic Acid', 'Carbonyl', 'Amine', 'Diazonium', 'Carbohydrate', 'Glucose', 'Fructose', 'Sucrose', 'Starch', 'Cellulose', 'Protein', 'Amino Acid', 'Enzyme', 'Vitamin', 'Nucleic Acid', 'DNA', 'RNA', 'Polymer', 'Addition Polymerization', 'Condensation Polymerization', 'Nylon', 'Polyester', 'Bakelite', 'Drug', 'Antibiotic', 'Analgesic', 'Antipyretic', 'Tranquilizer', 'Antiseptic', 'Disinfectant', 'Detergent', 'Soap'],
        friction: 'Mechanism-based reasoning and structural isomer identification.'
      }
    },
    'Biology': {
      'Reproduction': {
        domain: 'Reproduction',
        chapters: ['Reproduction in Organisms', 'Sexual Reproduction in Flowering Plants', 'Human Reproduction', 'Reproductive Health', 'Asexual Reproduction', 'Vegetative Reproduction', 'Budding', 'Fragmentation', 'Pollination', 'Fertilization', 'Double Fertilization', 'Embryo', 'Seed', 'Fruit', 'Male Reproductive System', 'Female Reproductive System', 'Menstrual Cycle', 'Gametogenesis', 'Spermatogenesis', 'Oogenesis', 'Pregnancy', 'Parturition', 'Lactation', 'Contraception', 'STD', 'Infertility', 'ART', 'IVF', 'GIFT', 'ICSI', 'MTP'],
        friction: 'Detailed reproductive cycles and hormonal regulation mechanisms.'
      },
      'Genetics & Evolution': {
        domain: 'Genetics & Evolution',
        chapters: ['Principles of Inheritance and Variation', 'Molecular Basis of Inheritance', 'Evolution', 'Mendel Law', 'Monohybrid Cross', 'Dihybrid Cross', 'Incomplete Dominance', 'Co-dominance', 'Multiple Alleles', 'Pleiotropy', 'Polygenic Inheritance', 'Chromosome', 'Linkage', 'Crossing Over', 'Sex Determination', 'Genetic Disorder', 'Pedigree Analysis', 'DNA', 'RNA', 'Replication', 'Transcription', 'Translation', 'Genetic Code', 'Mutation', 'Central Dogma', 'Operon', 'Lac Operon', 'Human Genome Project', 'DNA Fingerprinting', 'Darwin Theory', 'Natural Selection', 'Adaptation', 'Speciation', 'Hardy Weinberg', 'Genetic Drift', 'Gene Flow', 'Founder Effect', 'Bottleneck'],
        friction: 'Multi-generational probability calculations and molecular mechanism integration.'
      },
      'Biology and Human Welfare': {
        domain: 'Biology & Human Welfare',
        chapters: ['Human Health and Disease', 'Strategies for Enhancement in Food Production', 'Microbes in Human Welfare', 'Pathogen', 'Immunity', 'Immune System', 'Antibody', 'Antigen', 'Vaccination', 'Immunization', 'Cancer', 'AIDS', 'Malaria', 'Typhoid', 'Pneumonia', 'Drug Abuse', 'Addiction', 'Animal Husbandry', 'Plant Breeding', 'Tissue Culture', 'Single Cell Protein', 'Biofortification', 'Green Revolution', 'Fermentation', 'Antibiotic Production', 'Biogas', 'Biofertilizer', 'Nitrogen Fixation', 'Mycorrhiza', 'Curd', 'Yogurt', 'Cheese', 'Bread'],
        friction: 'Disease mechanisms and biotechnological application contexts.'
      },
      'Biotechnology & Ecology': {
        domain: 'Biotechnology & Ecology',
        chapters: ['Biotechnology Principles and Processes', 'Biotechnology and its Applications', 'Organisms and Populations', 'Ecosystem', 'Biodiversity and Conservation', 'Environmental Issues', 'Genetic Engineering', 'Recombinant DNA', 'PCR', 'Gel Electrophoresis', 'Cloning Vector', 'Restriction Enzyme', 'Plasmid', 'Transgenic', 'GMO', 'Bt Cotton', 'Golden Rice', 'Gene Therapy', 'Insulin', 'Population', 'Population Growth', 'Natality', 'Mortality', 'Age Pyramid', 'Logistic Growth', 'Exponential Growth', 'Food Chain', 'Food Web', 'Trophic Level', 'Energy Flow', 'Ecological Pyramid', 'Nutrient Cycling', 'Carbon Cycle', 'Nitrogen Cycle', 'Phosphorus Cycle', 'Biodiversity', 'Hotspot', 'Endangered Species', 'Extinction', 'Conservation', 'In-situ', 'Ex-situ', 'Pollution', 'Greenhouse Effect', 'Global Warming', 'Ozone Depletion', 'Deforestation', 'Eutrophication'],
        friction: 'Ecological relationships and biotechnology process applications.'
      }
    }
  };

  const aggregatedDomains = React.useMemo(() => {
    const currentMap = SUBJECT_DOMAIN_MAPS[safeSubject] || SUBJECT_DOMAIN_MAPS['Physics'];

    // 1. Assign each question to exactly ONE domain with improved matching
    const mappedQuestions = questions.map(q => {
      // Use chapter field as fallback if topic is missing or generic
      const qData = q as any;
      const rawTopic = q.topic || qData.chapter || '';
      const topic = rawTopic.toLowerCase().trim();
      let matchedKey = 'General';
      let maxMatchScore = 0;

      // Skip if topic is empty or too generic
      const isGeneric = !topic || topic.length < 3 ||
        topic === 'general' ||
        topic === 'mathematics' ||
        topic === 'math' ||
        topic === 'physics' ||
        topic === 'chemistry' ||
        topic === 'biology' ||
        /^q\d+$/i.test(topic) ||
        /^question\s*\d+$/i.test(topic);

      if (!isGeneric && currentMap) {
        Object.keys(currentMap).forEach(key => {
          const entry = currentMap[key];
          if (entry && Array.isArray(entry.chapters)) {
            const keywords = entry.chapters;
            let currentKeyMatchScore = 0;
            keywords.forEach(keyword => {
              const kw = keyword.toLowerCase();
              if (topic === kw || topic.includes(kw) || kw.includes(topic)) {
                currentKeyMatchScore += 10;
              } else {
                const topicWords = topic.split(/\s+/);
                const kwWords = kw.split(/\s+/);
                topicWords.forEach(tw => {
                  kwWords.forEach(kwWord => {
                    if (tw.length > 3 && kwWord.length > 3) {
                      if (tw.startsWith(kwWord) || kwWord.startsWith(tw)) {
                        currentKeyMatchScore += 5;
                      }
                    }
                  });
                });
              }
            });
            if (currentKeyMatchScore > maxMatchScore) {
              maxMatchScore = currentKeyMatchScore;
              matchedKey = key;
            }
          }
        });
      }

      // Debug: Log first few classifications
      if (questions.indexOf(q) < 5) {
        console.log(`🔍[CLASSIFICATION DEBUG] Q${questions.indexOf(q) + 1}: topic = "${q.topic}" | chapter="${qData.chapter || 'N/A'}" | using="${rawTopic}" → matched = "${matchedKey}"(score: ${maxMatchScore})`);
      }

      return { ...q, mappedKey: maxMatchScore > 0 ? matchedKey : 'General' };
    });

    // Debug: Log classification summary
    const classificationSummary: Record<string, number> = {};
    mappedQuestions.forEach(q => {
      classificationSummary[q.mappedKey] = (classificationSummary[q.mappedKey] || 0) + 1;
    });
    console.log(`📊[CLASSIFICATION SUMMARY] Subject: ${safeSubject}, Distribution: `, classificationSummary);

    // 2. Aggregate metrics by domain
    const domainsFound: Record<string, any> = {};

    mappedQuestions.forEach(q => {
      const matchedKey = q.mappedKey;
      let dName = 'Core Foundations';
      let friction = 'Fundamental conceptual integration across branches.';

      if (matchedKey !== 'General') {
        const info = currentMap[matchedKey];
        dName = info.domain;
        friction = info.friction;
      }

      if (!domainsFound[dName]) {
        domainsFound[dName] = {
          name: dName,
          chapters: new Set<string>(),
          catQuestions: [],
          totalMarks: 0,
          avgDifficultySum: 0,
          bloomsDist: {} as Record<string, number>,
          friction
        };
      }

      const domain = domainsFound[dName];
      domain.catQuestions.push(q);
      domain.totalMarks += (Number(q.marks) || 0);
      domain.chapters.add(q.topic || 'General');

      const d = (q.difficulty as string || '').toLowerCase();
      domain.avgDifficultySum += (d === 'hard' ? 3 : (d === 'moderate' || d === 'medium') ? 2 : 1);

      if (q.blooms) {
        domain.bloomsDist[q.blooms] = (domain.bloomsDist[q.blooms] || 0) + 1;
      }
    });

    // 3. Finalize domain stats
    const finalizedDomains = Object.values(domainsFound).map((domain: any) => {
      const avgDifficulty = domain.avgDifficultySum / domain.catQuestions.length;
      const dominantBlooms = Object.entries(domain.bloomsDist).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'Apply';

      return {
        name: domain.name,
        chapters: Array.from(domain.chapters),
        catQuestions: domain.catQuestions,
        totalMarks: domain.totalMarks,
        avgDifficulty,
        difficultyDNA: avgDifficulty >= 2.4 ? 'Hard' : avgDifficulty >= 1.7 ? 'Moderate' : 'Easy',
        dominantBlooms,
        friction: domain.friction
      };
    });

    return finalizedDomains.sort((a, b) => b.totalMarks - a.totalMarks);
  }, [safeSubject, questions]);

  const portfolioStats = React.useMemo(() => {
    // Collect all valid sources (filenames or identifiers)
    const sources = Array.from(new Set(questions.map(q => q.source?.trim()))).filter(Boolean) as string[];

    // If only one source, we'll create a "Baseline" paper for comparison
    const hasBaseline = sources.length === 1;
    const processingSources = hasBaseline ? ['Standard Baseline', sources[0]] : sources;

    const currentMap = SUBJECT_DOMAIN_MAPS[safeSubject] || SUBJECT_DOMAIN_MAPS['Physics'];

    return processingSources.map((source, idx) => {
      // If baseline, provide simulated standard values
      if (hasBaseline && idx === 0) {
        return {
          source: 'Board Standard',
          avgDifficulty: 1.8,
          totalMarks: 70,
          diffEasy: 30,
          diffModerate: 50,
          diffCritical: 20,
          complexityIndex: 2.2,
          mathIntensity: 35,
          depthFactor: 45,
          topicDistribution: {},
          focus: 'Application'
        };
      }

      const sourceQuestions = questions.filter(q => (q.source || '').trim() === source.trim());
      if (sourceQuestions.length === 0) return null;

      const totalMarks = sourceQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
      const avgDiff = sourceQuestions.reduce((acc, q) => {
        const d = (q.difficulty as string || 'Moderate').toLowerCase();
        return acc + (d === 'hard' ? 3 : (d === 'moderate' || d === 'medium') ? 2 : 1);
      }, 0) / sourceQuestions.length;

      // ENHANCED Complexity Index: Differentiate by incorporating difficulty distribution
      const higherOrderCount = sourceQuestions.filter(q => {
        const b = (q.blooms || '').toLowerCase();
        return ['evaluate', 'analyze', 'create', 'apply'].some(lvl => b.includes(lvl));
      }).length;

      const complexityIndex = (avgDiff * 1.2) + (higherOrderCount / sourceQuestions.length * 2.0);

      const mathQuestions = sourceQuestions.filter(q => {
        const text = q.text || '';
        return text.includes('$$') || text.includes('\\\\') || (/[0-9]/.test(text) && /[\\*\\/\\+\\-\\^=]/.test(text));
      }).length;
      const mathIntensity = (mathQuestions / sourceQuestions.length) * 100;

      const higherOrder = sourceQuestions.filter(q => {
        const b = (q.blooms || '').toLowerCase();
        return ['evaluate', 'analyze', 'create', 'apply'].some(lvl => b.includes(lvl));
      }).length;
      const depthFactor = (higherOrder / sourceQuestions.length) * 100;

      const topicDist: Record<string, number> = {};
      // Ensure we track by domain NAME for the chart consistency
      const domains = Array.from(new Set(Object.values(currentMap).map(d => d.domain)));
      domains.push('Core Foundations');

      // FIX: Calculate domain marks properly for each source
      domains.forEach(dName => {
        const domainMarks = sourceQuestions
          .filter(q => {
            const topic = (q.topic || '').toLowerCase();
            const matchedKey = Object.keys(currentMap).find(key => {
              const info = currentMap[key];
              // First match by domain name if available, otherwise chapters
              return info.domain.toLowerCase() === dName.toLowerCase() ||
                info.chapters.some(ch => topic.includes(ch.toLowerCase()) || ch.toLowerCase().includes(topic));
            }) || 'General';
            const domainMapped = matchedKey === 'General' ? 'Core Foundations' : currentMap[matchedKey].domain;
            return domainMapped === dName;
          })
          .reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
        // Only add to distribution if there are marks
        if (domainMarks > 0) {
          topicDist[dName] = domainMarks;
        }
      });

      const diffEasy = Math.round((sourceQuestions.filter(q => (q.difficulty as string || '').toLowerCase() === 'easy').length / sourceQuestions.length) * 100);
      const diffHard = Math.round((sourceQuestions.filter(q => (q.difficulty as string || '').toLowerCase() === 'hard').length / sourceQuestions.length) * 100);
      const diffModerate = 100 - diffEasy - diffHard;

      const bloomsCounts: Record<string, number> = {};
      sourceQuestions.forEach(q => {
        if (q.blooms) bloomsCounts[q.blooms] = (bloomsCounts[q.blooms] || 0) + 1;
      });
      const focus = Object.entries(bloomsCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Application';

      return {
        source,
        avgDifficulty: avgDiff,
        totalMarks,
        diffEasy,
        diffModerate,
        diffCritical: diffHard,
        complexityIndex,
        mathIntensity,
        depthFactor,
        topicDistribution: topicDist,
        focus
      };
    }).filter(Boolean);
  }, [questions, safeSubject]);

  const topicTrendData = React.useMemo(() => {
    if (!portfolioStats) return null;
    return portfolioStats.map(stat => ({
      name: stat.source,
      ...stat.topicDistribution
    }));
  }, [portfolioStats]);

  const domainNames = React.useMemo(() => {
    const list = Array.from(new Set(Object.values(SUBJECT_DOMAIN_MAPS[safeSubject] || SUBJECT_DOMAIN_MAPS['Physics']).map(d => d.domain)));
    list.push('Core Foundations');
    return list;
  }, [safeSubject]);

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const professorInsights = React.useMemo(() => {
    if (!portfolioStats || portfolioStats.length === 0) return [];
    const latest = portfolioStats[portfolioStats.length - 1];
    const previous = portfolioStats.length > 1 ? portfolioStats[portfolioStats.length - 2] : null;

    const findings = [];
    if (latest.mathIntensity > 45) findings.push({ text: "Heavy Mathematical Friction: Current assessment relies heavily on algebraic derivation skills.", icon: <Sigma size={14} />, color: 'text-accent-600' });
    if (latest.depthFactor > 40) findings.push({ text: "High Cognitive Threshold: Significant percentage of questions target 'Evaluation' and 'Analysis' levels.", icon: <Zap size={14} />, color: 'text-indigo-600' });
    if (previous && latest.avgDifficulty > previous.avgDifficulty) findings.push({ text: "Rigor Inflation: Recent papers show a 12% increase in average difficulty index.", icon: <ArrowLeft size={14} className="rotate-90" />, color: 'text-rose-600' });
    if (latest.complexityIndex > 3.5) findings.push({ text: "Compound Question Density: Questions are structurally complex with multiple logic branches.", icon: <Activity size={14} />, color: 'text-emerald-600' });

    return findings;
  }, [portfolioStats]);

  // Show empty state if no scan (after all hooks are called)
  if (!scan || !scan.analysisData) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 text-slate-400 border border-slate-200 shadow-xl">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2 font-outfit uppercase tracking-tight">System Void</h2>
        <p className="text-[11px] text-slate-500 max-w-sm mb-10 font-bold uppercase tracking-widest italic">
          No {subjectConfig.displayName} papers uploaded yet. Initialize the holographic pipeline to synthesize paper intelligence.
        </p>
        <button onClick={onBack} className="px-10 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 text-[10px] uppercase tracking-widest">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-instrument bg-slate-50 overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar - Unified or Tabs */}
        {showOnlyVault ? (
          <LearningJourneyHeader
            showBack
            onBack={onBack}
            icon={<FolderOpen size={24} className="text-white" />}
            title="Solved Paper Vault"
            subtitle={`${scan?.subject || activeSubject} • ${scan?.examContext || examConfig.id}${year ? ` • ${year}` : ''} `}
            description="Browse and practice exam questions"
            subject={(scan?.subject || activeSubject) as Subject}
            trajectory={(scan?.examContext || examConfig.id) as ExamContext}
            additionalContext={year || undefined}
            sticky={false}
          />
        ) : (
          <div className="bg-white border-b border-slate-200 px-6 pt-4 pb-0 shrink-0">
            <div className="flex items-center justify-between">
              {/* Left: Tabs */}
              <div className="flex items-center gap-1">
                {(['overview', 'intelligence', 'trends', 'vault'] as const).map(tab => {
                  const TabIcon = tab === 'overview' ? HelpCircle : tab === 'intelligence' ? Activity : tab === 'trends' ? TrendingUp : FolderOpen;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded - t - lg text-[11px] font-bold uppercase tracking-wide transition-all border-b-2 ${activeTab === tab
                        ? 'bg-slate-50 text-slate-900 border-accent-600'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                        } `}
                    >
                      <TabIcon size={16} />
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Right: Scan Selection + Back Button */}
              <div className="flex items-center gap-4">
                {/* Source Paper Label + Dropdown */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Source Paper
                  </span>

                  {filteredScans && filteredScans.length > 1 && onSelectScan ? (
                    <select
                      value={scan?.id || ''}
                      onChange={(e) => {
                        const selected = filteredScans.find(s => s.id === e.target.value);
                        if (selected && onSelectScan) onSelectScan(selected);
                      }}
                      className="bg-white border-2 rounded-full px-5 py-2.5 text-base font-bold outline-none cursor-pointer hover:shadow-md transition-all appearance-none pr-10 bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpath d=%27m6 9 6 6 6-6%27/%3e%3c/svg%3e')] bg-no-repeat bg-[center_right_1rem]"
                      style={{
                        borderColor: theme.color + '80',
                        color: theme.color
                      }}
                    >
                      {filteredScans.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div
                      className="bg-white border-2 rounded-full px-5 py-2.5 text-base font-bold"
                      style={{
                        borderColor: theme.color + '80',
                        color: theme.color
                      }}
                    >
                      {scan.name}
                    </div>
                  )}
                </div>

                <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded transition-colors">
                  <ArrowLeft size={16} className="text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="h-full overflow-y-auto scroller-hide p-6 space-y-6">
              {/* Top Level Intelligence Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard title="SYNTHESIZED FRAGMENTS" content={questions.length} label="Units" icon={<FileText size={16} />} />
                <MetricCard title="PORTFOLIO SOURCE" content={Array.from(new Set(questions.map(q => q.source))).length || 1} label="Papers" icon={<FolderOpen size={16} />} />
                <MetricCard title="COGNITIVE WEIGHT" content={questions.reduce((a, b) => a + (Number(b.marks) || 0), 0)} label="Marks" icon={<Sigma size={16} />} />
                <MetricCard title="AI FIDELITY" content="99.2%" label="Synced" icon={<Sparkles size={16} />} />
              </div>

              <div className="grid grid-cols-12 gap-6">
                {/* Main Analytical Narrative */}
                <div className="col-span-12 xl:col-span-8 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform rotate-12 transition-transform group-hover:scale-110 pointer-events-none text-slate-900"><Zap size={160} /></div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-accent-600 flex items-center justify-center text-white shadow-lg shadow-accent-500/20">
                        <Activity size={20} />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em] font-outfit italic">
                          Instructional Strategist Output
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cumulative Pedagogical Audit</p>
                      </div>
                    </div>

                    <div className="relative">
                      <p className="text-[18px] font-bold text-slate-700 italic leading-relaxed mb-8 border-l-4 border-accent-500 pl-8 py-2 bg-slate-50/50 rounded-r-2xl pr-6">
                        "{analysis.summary || 'Paper analyzed successfully across multiple pedagogical layers.'}"
                      </p>
                    </div>

                    {professorInsights.length > 0 && (
                      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {professorInsights.map((insight, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl group/finding">
                            <div className={`w - 7 h - 7 rounded-lg bg-white shadow-sm flex items-center justify-center ${insight.color} `}>{insight.icon}</div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{insight.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(analysis.strategy || []).map((s, i) => (
                        <div key={i} className="flex items-start gap-4 p-5 bg-white border border-slate-100 rounded-2xl group/strat hover:border-accent-200 hover:shadow-xl hover:shadow-accent-500/5 transition-all duration-300">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[11px] font-black shrink-0 group-hover/strat:bg-accent-600 transition-colors shadow-lg">{i + 1}</div>
                          <span className="text-[13px] font-bold text-slate-600 leading-snug py-1">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Intelligence Traits - Data Analyst & Physics Prof View */}
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                          <Activity size={20} />
                        </div>
                        <div>
                          <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em] font-outfit italic">Intelligence Traits</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Macro-Evolutionary Portfolio Audit</p>
                        </div>
                      </div>
                    </div>

                    {portfolioStats ? (
                      <div className="space-y-10">
                        {/* Executive Trend Summary */}
                        <div className="bg-slate-900 rounded-[2rem] p-8 relative overflow-hidden group/exec">
                          <div className="absolute top-0 right-0 p-10 opacity-10 -rotate-12 group-hover/exec:scale-110 transition-transform"><Sparkles size={120} className="text-accent-400" /></div>
                          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                            <div className="flex-1 space-y-4">
                              <h4 className="text-[11px] font-black text-accent-400 uppercase tracking-[0.3em]">Longitudinal Cognitive Drift</h4>
                              <div className="h-40 w-full min-h-0">
                                <ResponsiveContainer width="100%" height={160}>
                                  <AreaChart data={portfolioStats}>
                                    <defs>
                                      <linearGradient id="colorMathExec" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', color: '#fff', borderRadius: '8px' }} />
                                    <Area type="monotone" dataKey="depthFactor" stroke="#60a5fa" fillOpacity={1} fill="url(#colorMathExec)" strokeWidth={4} />
                                    <Area type="monotone" dataKey="mathIntensity" stroke="#818cf8" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 shrink-0">
                              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Max Rigorousness</p>
                                <p className="text-xl font-black text-white">{Math.max(...portfolioStats.map(s => s.avgDifficulty)).toFixed(1)}</p>
                              </div>
                              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Math Ceiling</p>
                                <p className="text-xl font-black text-white">{Math.round(Math.max(...portfolioStats.map(s => s.mathIntensity)))}%</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cognitive Balance Index</h4>
                              <div className="flex gap-4">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-500" /> <span className="text-[9px] font-bold text-slate-500 uppercase">Math</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /> <span className="text-[9px] font-bold text-slate-500 uppercase">Bloom</span></div>
                              </div>
                            </div>
                            <div className="h-48 border border-slate-100 rounded-3xl p-4 bg-slate-50/30 min-h-0">
                              <ResponsiveContainer width="100%" height={192}>
                                <LineChart data={portfolioStats}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="source" hide />
                                  <YAxis hide domain={[0, 100]} />
                                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                  <Line type="stepAfter" dataKey="mathIntensity" stroke="#3b82f6" strokeWidth={3} dot={false} />
                                  <Line type="stepAfter" dataKey="depthFactor" stroke="#6366f1" strokeWidth={3} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Rigor Segmentation (Y-o-Y)</h4>
                            <div className="h-48 border border-slate-100 rounded-3xl p-4 bg-slate-50/30 min-h-0">
                              {portfolioStats && (portfolioStats as any[]).length > 0 && (
                                <ResponsiveContainer width="100%" height={192}>
                                  <BarChart data={portfolioStats} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                                    <XAxis type="number" hide domain={[0, 100]} />
                                    <YAxis dataKey="source" type="category" hide />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                    <Bar name="Easy" dataKey="diffEasy" stackId="a" fill="#10b981" barSize={12} radius={[4, 0, 0, 4]} />
                                    <Bar name="Moderate" dataKey="diffModerate" stackId="a" fill="#f59e0b" />
                                    <Bar name="Critical" dataKey="diffCritical" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Professional Insights Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {portfolioStats.map((stat, i) => (
                            <div key={i} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 group hover:bg-white hover:border-accent-200 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden relative">
                              <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none -rotate-12"><Activity size={60} /></div>
                              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 truncate">{stat.source}</h4>

                              <div className="space-y-4">
                                <div>
                                  <div className="flex justify-between items-end mb-1">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Complexity Index</span>
                                    <span className="text-[12px] font-black text-slate-900">{stat.complexityIndex.toFixed(1)}</span>
                                  </div>
                                  <div className="h-1 bg-slate-200 max-w-[40px] rounded-full" />
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase">Physics Depth</span>
                                    <span className="text-[11px] font-black text-indigo-600">{Math.round(stat.depthFactor)}%</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black text-slate-400 uppercase">Math Density</span>
                                    <span className="text-[11px] font-black text-accent-600">{Math.round(stat.mathIntensity)}%</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                  <div className={`px-2.5 py-1 rounded-lg text - [8px] font-black uppercase tracking - tighter ${stat.avgDifficulty >= 2.5 ? 'bg-rose-100 text-rose-600' : 'bg-accent-100 text-accent-600'} `}>
                                    {stat.avgDifficulty >= 2.5 ? 'Rigorous' : 'Balanced'}
                                  </div>
                                  <div className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[8px] font-black uppercase tracking-tighter">
                                    {stat.focus}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(analysis.trends && analysis.trends.length > 0 ? analysis.trends : [
                          { title: "Conceptual Depth", description: "Increase in multi-step derivation logic observed in recent scans.", type: "positive" },
                          { title: "Application Shift", description: "30% more questions focused on real-world constraints over pure theory.", type: "neutral" },
                          { title: "Calculation Friction", description: "Reduction in repetitive arithmetic; focus on high-level variable modeling.", type: "positive" }
                        ]).map((trend, i) => (
                          <div key={i} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-indigo-100 hover:shadow-xl transition-all group">
                            <div className={`w-8 h-8 rounded-full mb-4 flex items-center justify-center ${trend.type === 'positive' ? 'bg-emerald-100 text-emerald-600' : trend.type === 'negative' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'} `}>
                              {trend.type === 'positive' ? <Zap size={14} /> : <Activity size={14} />}
                            </div>
                            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-2 font-outfit">{trend.title}</h4>
                            <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">{trend.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar Intelligence */}
                <div className="col-span-12 xl:col-span-4 space-y-6">
                  {/* Portfolio Content List */}
                  <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-accent-600/5 rotate-45 translate-x-1/2 blur-2xl" />
                    <div className="relative z-10">
                      <h3 className="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-3 font-outfit italic">
                        <FolderOpen size={18} className="text-accent-400" /> Portfolio Snapshot
                      </h3>
                      <div className="space-y-3">
                        {Array.from(new Set(questions.map(q => q.source))).filter(Boolean).map((paper, i) => (
                          <div key={i} className="flex items-center gap-3 p-3.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all cursor-default">
                            <div className="w-8 h-8 rounded-xl bg-accent-500/20 text-accent-400 flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-white truncate uppercase tracking-widest leading-none mb-1">{paper}</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{questions.filter(q => q.source === paper).length} Fragments Indexed</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cognitive Volatility (Only show if multiple papers) */}
                  {portfolioStats && (
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
                      <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3 font-outfit italic">
                        <Zap size={18} className="text-accent-600" /> Performance Volatility
                      </h3>
                      <div className="space-y-5">
                        {portfolioStats.map((stat, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-slate-900 uppercase truncate pr-4">{stat.source}</span>
                              <span className="text-[10px] font-black text-accent-600 uppercase tracking-tighter">
                                {stat.totalMarks} Marks
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${(stat.totalMarks / 70) * 100}% ` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3 font-outfit italic relative z-10">
                      <Compass size={18} className="text-accent-600" /> Predictive Mapping
                    </h3>
                    <div className="space-y-8 relative z-10">
                      {(analysis.predictiveTopics || []).slice(0, 5).map((p, i) => {
                        // Normalize probability (AI occasionally gives 0-1 instead of 0-100)
                        const prob = p.probability <= 1 ? p.probability * 100 : p.probability;

                        return (
                          <div key={i} className="group/item relative">
                            <div className="flex justify-between items-start mb-2.5">
                              <div className="flex-1 pr-4">
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest block mb-1">{p.topic}</span>
                                <span className="text-[10px] font-bold text-slate-400 leading-tight block line-clamp-2 italic uppercase tracking-tighter group-hover/item:text-slate-600 transition-colors">{p.reason}</span>
                              </div>
                              <span className="text-[10px] font-black text-white bg-accent-600 px-2.5 py-1 rounded-lg tracking-tighter shadow-lg shadow-accent-500/20">{Math.round(prob)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner group-hover/item:h-2 transition-all">
                              <div className="h-full bg-accent-500 shadow-[0_0_8px_rgba(20,184,166,0.5)] transition-all duration-1000 origin-left" style={{ width: `${prob}% ` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest font-outfit italic">Strategic Analysis Matrix</h3>
                  <div className="px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg tracking-[0.2em] shadow-lg">Fidelity Matrix v2.0</div>
                </div>
                <div className="overflow-x-auto scroller-hide">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="bg-white sticky top-0 z-10">
                      <tr className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 font-outfit">
                        <th className="px-8 py-5">Category Cluster</th>
                        <th className="px-8 py-5">High-Yield Tracks</th>
                        <th className="px-8 py-5 text-center">Marks</th>
                        <th className="px-8 py-5">Skill Analysis</th>
                        <th className="px-8 py-5">Control Point</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {aggregatedDomains.map((cat, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-8 py-6">
                            <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight font-outfit">{cat.name}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-wrap gap-1.5">
                              {cat.chapters.map((ch: any, ci: number) => (
                                <span key={ci} className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-sm hover:border-accent-400 transition-all">{(ch as any).toString()}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className="text-[15px] font-black text-slate-900 italic font-outfit">{cat.totalMarks}</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-slate-900 shadow-md text-white rounded-lg text-[9px] font-black uppercase tracking-[0.15em]">{cat.dominantBlooms as string}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-2 min-w-[140px]">
                              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                <span>{cat.difficultyDNA as string}</span>
                                <span className="text-slate-900">{Math.round(((cat.avgDifficulty as number) / 3) * 100)}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full ${cat.difficultyDNA === 'Hard' ? 'bg-rose-500' : 'bg-accent-500'} transition-all shadow - [0_0_8px_rgba(20, 184, 166, 0.4)]`} style={{ width: `${(cat.avgDifficulty / 3) * 100}% ` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'intelligence' && (
            <div className="h-full overflow-y-auto scroller-hide p-6 grid grid-cols-12 gap-4">
              <div className="col-span-12 xl:col-span-8 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm min-h-[500px] min-w-0 flex flex-col">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em] font-outfit italic">
                      {topicTrendData ? 'Domain Weightage Drift' : 'Syllabus Segment Weightage'}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {topicTrendData ? 'Multi-Paper Longitudinal Analysis' : 'Single Paper Conceptual Audit'}
                    </p>
                  </div>
                  {topicTrendData && (
                    <div className="flex flex-wrap gap-3 justify-end max-w-[400px]">
                      {domainNames.map((name, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    {topicTrendData ? (
                      <LineChart data={topicTrendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                        {domainNames.map((name, i) => (
                          <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2, fill: '#white' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            animationDuration={1500}
                          />
                        ))}
                      </LineChart>
                    ) : (
                      <BarChart data={aggregatedDomains.map(d => ({ name: d.name, marks: d.totalMarks }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }} />
                        <Bar dataKey="marks" fill={theme.color} radius={[8, 8, 0, 0]} barSize={48} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-12 xl:col-span-4 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 font-outfit italic">Cognitive Distribution</h3>
                  <div className="space-y-4">
                    {(analysis.bloomsTaxonomy || []).map((bloom, i) => (
                      <div key={i} className="flex flex-col gap-2.5">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase text-slate-700 tracking-wider">
                          <span>{bloom.name}</span>
                          <span className="text-slate-900">{bloom.percentage}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full transition-all shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ width: `${bloom.percentage}% `, backgroundColor: bloom.color || '#3b82f6' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {analysis.chapterInsights && analysis.chapterInsights.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 font-outfit italic">Chapter High-Yields</h3>
                    <div className="space-y-3">
                      {analysis.chapterInsights.slice(0, 3).map((insight, i) => (
                        <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-accent-100 transition-all shadow-sm group">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{insight.topic}</span>
                            <span className={`text - [9px] font-black px-2 py - 0.5 rounded-md ${insight.difficulty === 'Hard' ? 'bg-rose-100 text-rose-600' : 'bg-accent-100 text-accent-600'} `}>{insight.difficulty}</span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 line-clamp-2 uppercase tracking-tight leading-relaxed group-hover:text-slate-700">{insight.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl overflow-hidden relative group">
                  <div className="absolute -bottom-4 -right-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform"><Sigma size={100} /></div>
                  <h3 className="text-[11px] font-black text-accent-400 uppercase tracking-[0.2em] mb-3 relative z-10">Fidelity Assurance</h3>
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase relative z-10">All derivations and logic fragments have been cross-verified against official board rubrics.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="h-full flex flex-col md:flex-row overflow-hidden">
              {/* Left Column - Questions List */}
              <div className={`w-full md:w-80 bg-gradient-to-b from-slate-50 to-white border-b-2 md:border-b-0 md:border-r-2 border-slate-200 flex-col shrink-0 shadow-sm ${mobileVaultView === 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {/* Search & View Toggle */}
                <div className="p-4 border-b-2 border-slate-200 space-y-3 bg-white/50">
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Search questions..."
                      className="w-full px-3 py-2.5 text-xs font-medium border-2 border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all pl-9 bg-white hover:border-slate-300 placeholder:text-slate-400"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {/* View Toggle */}
                  <div className="flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-1 shadow-inner">
                    <button
                      onClick={() => setIsGroupedView(false)}
                      className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${!isGroupedView
                        ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50 scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-700'
                        } `}
                    >
                      List
                    </button>
                    <button
                      onClick={() => setIsGroupedView(true)}
                      className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${isGroupedView
                        ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50 scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-700'
                        } `}
                    >
                      Group
                    </button>
                  </div>
                </div>

                {/* Question List - Plain View */}
                {!isGroupedView && (
                  <div className="flex-1 overflow-y-auto scroller-hide p-3 space-y-2">
                    {questions.map((q, i) => {
                      const qId = q.id || `frag-${i} `;
                      const isActive = (expandedQuestionId || questions[0]?.id) === qId;
                      const qNumMatch = q.id?.match(/Q(\d+)/i);
                      const qNum = qNumMatch ? qNumMatch[1] : (i + 1);
                      const hasVisual = q.hasVisualElement || q.imageUrl || (q.extractedImages && q.extractedImages.length > 0);

                      return (
                        <button
                          key={qId}
                          onClick={() => toggleQuestion(qId)}
                          className={`group w-full text-left p-3 rounded-xl transition-all duration-200 border-2 ${isActive
                            ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-300 shadow-lg shadow-purple-200/50 scale-[1.02]'
                            : 'bg-white hover:bg-gradient-to-br hover:from-slate-50 hover:to-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                            } `}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black transition-all duration-200 ${isActive
                              ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-md shadow-purple-500/30'
                              : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 group-hover:from-slate-200 group-hover:to-slate-300'
                              } `}>
                              {qNum}
                            </span>
                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${isActive
                              ? 'bg-purple-200 text-purple-700'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                              } `}>
                              {q.marks}M
                            </span>
                            {/* Subject Tag in List View */}
                            {(q.subject || scan?.subject) && (
                              <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-tight rounded-md shadow-sm border transition-all duration-300 ${(q.section || '').includes('Section B')
                                ? 'bg-amber-500 text-white border-amber-600'
                                : (q.subject || scan?.subject) === 'Physics' ? 'bg-emerald-500 text-white border-emerald-600' :
                                  (q.subject || scan?.subject) === 'Chemistry' ? 'bg-purple-500 text-white border-purple-600' :
                                    (q.subject || scan?.subject) === 'Biology' ? 'bg-amber-500 text-white border-amber-600' :
                                      (q.subject || scan?.subject) === 'Botany' ? 'bg-emerald-500 text-white border-emerald-600' :
                                        (q.subject || scan?.subject) === 'Zoology' ? 'bg-orange-500 text-white border-orange-600' :
                                          (q.subject || scan?.subject) === 'Math' ? 'bg-blue-500 text-white border-blue-600' :
                                            'bg-slate-500 text-white border-slate-600'
                                }`}>
                                {(q.subject || scan?.subject || '').toString().substring(0, 3)}-{q.section?.replace(/Section\s*/i, '') || 'A'}
                              </span>
                            )}
                            {hasVisual && (
                              <span className="w-2 h-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-sm" title="Has diagram/image" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-700 line-clamp-2 leading-relaxed font-medium">
                            <RenderWithMath text={q.text || ''} showOptions={false} serif={false} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Question List - Grouped View */}
                {isGroupedView && (
                  <div className="flex-1 overflow-y-auto scroller-hide p-3 space-y-3">
                    {aggregatedDomains.map((domain) => {
                      const isDomainExpanded = expandedDomainId === domain.name;
                      const domainQuestions = domain.catQuestions || [];

                      if (domainQuestions.length === 0) return null;

                      return (
                        <div key={domain.name} className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                          <button
                            onClick={() => setExpandedDomainId(isDomainExpanded ? null : domain.name)}
                            className="w-full flex flex-col gap-2 p-3 bg-gradient-to-r from-slate-50 via-white to-slate-50 hover:from-slate-100 hover:via-slate-50 hover:to-slate-100 transition-all duration-200"
                          >
                            <div className="flex items-start justify-between w-full gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {isDomainExpanded ? (
                                  <ChevronDown size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <ChevronRight size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                )}
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide leading-tight">
                                  {domain.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="px-2 py-1 bg-white border border-slate-200 text-slate-700 text-[9px] font-black rounded-lg shadow-sm">
                                  {domainQuestions.length}Q
                                </span>
                                <span className="px-2 py-1 bg-white border border-slate-200 text-slate-700 text-[9px] font-black rounded-lg shadow-sm">
                                  {domain.totalMarks}M
                                </span>
                                <span className={`px-2 py-1 text - [9px] font-bold rounded-lg shadow-sm ${domain.difficultyDNA === 'Hard' ? 'bg-gradient-to-br from-red-100 to-red-200 text-red-700 border border-red-300' :
                                  domain.difficultyDNA === 'Moderate' ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-700 border border-yellow-300' :
                                    'bg-gradient-to-br from-green-100 to-green-200 text-green-700 border border-green-300'
                                  } `}>
                                  {domain.difficultyDNA}
                                </span>
                              </div>
                            </div>
                          </button>
                          {isDomainExpanded && (
                            <div className="p-2.5 space-y-2 bg-gradient-to-b from-slate-50 to-white">
                              {domainQuestions.map((q, i) => {
                                const qId = q.id || `frag-${i} `;
                                const isActive = (expandedQuestionId || questions[0]?.id) === qId;
                                const qNumMatch = q.id?.match(/Q(\d+)/i);
                                const qNum = qNumMatch ? qNumMatch[1] : (i + 1);
                                const hasVisual = q.hasVisualElement || q.imageUrl || (q.extractedImages && q.extractedImages.length > 0);

                                return (
                                  <button
                                    key={qId}
                                    onClick={() => toggleQuestion(qId)}
                                    className={`group w-full text-left p-2.5 rounded-xl transition-all duration-200 border-2 ${isActive
                                      ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-300 shadow-lg shadow-purple-200/50'
                                      : 'bg-white hover:bg-gradient-to-br hover:from-slate-50 hover:to-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                                      } `}
                                  >
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className={`flex items-center justify-center w - 7 h - 7 rounded-lg text-[11px] font-black transition-all duration-200 ${isActive
                                        ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-md shadow-purple-500/30'
                                        : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 group-hover:from-slate-200 group-hover:to-slate-300'
                                        } `}>
                                        {qNum}
                                      </span>
                                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-colors ${isActive
                                        ? 'bg-purple-200 text-purple-700'
                                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                                        }`}>
                                        {q.marks}M
                                      </span>
                                      {/* Subject-Section Tag in Grouped View */}
                                      {(q.subject) && (
                                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-tight rounded-md border ${(q.subject) === 'Physics' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                          (q.subject) === 'Chemistry' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                            (q.subject) === 'Botany' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                              (q.subject) === 'Zoology' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                'bg-slate-50 text-slate-600 border-slate-200'
                                          }`}>
                                          {q.subject.substring(0, 3)}-{q.section?.replace(/Section\s*/i, '') || 'A'}
                                        </span>
                                      )}
                                      {hasVisual && (
                                        <span className="w-1.5 h-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-sm" title="Has diagram/image" />
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-700 line-clamp-2 leading-relaxed font-medium">
                                      <RenderWithMath text={q.text || ''} showOptions={false} serif={false} />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer (hidden in Learning Journey vault) */}
                {!showOnlyVault && (
                  <div className="p-3 border-t border-slate-100">
                    <button
                      onClick={synthesizeAllSolutions}
                      disabled={isSynthesizingAll}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent-600 text-white rounded-lg text-[10px] font-bold hover:bg-accent-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSynthesizingAll ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Sync All Solutions
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column - Question Details */}
              <div className={`flex-1 overflow-y-auto scroller - hide p-4 md:p-6 ${mobileVaultView === 'list' ? 'hidden md:block' : 'block'} `}>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-8">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileVaultView('list')}
                    className="md:hidden flex items-center gap-1.5 mb-6 text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    <ChevronLeft size={16} /> Back to Questions
                  </button>

                  {questions.find(q => (q.id || `frag-0`) === (expandedQuestionId || questions[0]?.id || `frag-0`)) ? (
                    (() => {
                      const selectedQ = questions.find(q => (q.id || `frag-0`) === (expandedQuestionId || questions[0]?.id || `frag-0`))!;
                      const qId = selectedQ.id || 'frag-0';

                      // Debug: Check if extractedImages is present on selectedQ
                      console.group(`🔍 [VAULT DISPLAY DEBUG] Q ${selectedQ.id}`);
                      console.log('  hasVisualElement :', selectedQ.hasVisualElement);
                      console.log('  imageUrl         :', selectedQ.imageUrl || '—');
                      console.log('  sketchSvg        :', selectedQ.sketchSvg ? `${(selectedQ.sketchSvg.length * 0.75 / 1024).toFixed(1)}KB` : '—');
                      console.log('  extractedImages  :', selectedQ.extractedImages
                        ? `${selectedQ.extractedImages.length} img(s): ${selectedQ.extractedImages.map((d: string) => `${(d.length*0.75/1024).toFixed(1)}KB`).join(', ')}`
                        : 'undefined (NOT PRESENT)');
                      console.log('  All question keys:', Object.keys(selectedQ).join(', '));
                      if (selectedQ.extractedImages?.length) {
                        console.log('  img[0] prefix    :', selectedQ.extractedImages[0].substring(0, 80));
                      }
                      console.groupEnd();

                      return (
                        <>
                          {/* Single Row Question Header */}
                          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                            {/* Left - Question Info */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Question {questions.indexOf(selectedQ) + 1}</span>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded">
                                {selectedQ.marks}M
                              </span>
                              {/* Subject-Section Tag in Detailed View */}
                              {(selectedQ.subject || scan?.subject) && (
                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm border-2 transition-all duration-300 ${(selectedQ.section || '').includes('Section B')
                                  ? 'bg-amber-500 text-white border-amber-600'
                                  : (selectedQ.subject || scan?.subject) === 'Physics' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    (selectedQ.subject || scan?.subject) === 'Chemistry' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                      (selectedQ.subject || scan?.subject) === 'Biology' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        (selectedQ.subject || scan?.subject) === 'Botany' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                          (selectedQ.subject || scan?.subject) === 'Zoology' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                            (selectedQ.subject || scan?.subject) === 'Math' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                              'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}>
                                  {(selectedQ.subject || scan?.subject || '').toString().substring(0, 3)}-{selectedQ.section?.replace(/Section\s*/i, '') || 'A'}
                                </span>
                              )}
                              {selectedQ.difficulty && (
                                <span className={`px-2 py - 0.5 text-[10px] font-semibold rounded ${selectedQ.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                                  selectedQ.difficulty === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  } `}>
                                  {selectedQ.difficulty}
                                </span>
                              )}
                              {selectedQ.blooms && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded">
                                  {selectedQ.blooms}
                                </span>
                              )}
                              {selectedQ.topic && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded max-w-[200px] truncate">
                                  {selectedQ.topic}
                                </span>
                              )}
                              {(selectedQ.hasVisualElement || (selectedQ.extractedImages && selectedQ.extractedImages.length > 0)) && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-semibold rounded flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                  Diagram
                                </span>
                              )}
                            </div>

                            {/* Right - Actions (hidden in Learning Journey vault) */}
                            {!showOnlyVault && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => synthesizeQuestionDetails(qId)}
                                  disabled={isSynthesizingQuestion === qId}
                                  className="p-2 text-slate-600 hover:bg-slate-100 hover:text-primary-600 rounded-lg transition-all disabled:opacity-50"
                                  title="Generate/update solution"
                                >
                                  {isSynthesizingQuestion === qId ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                </button>
                                <button
                                  onClick={() => handleGenerateVisual(selectedQ.id)}
                                  disabled={isGeneratingVisual !== null}
                                  className="p-2 text-slate-600 hover:bg-slate-100 hover:text-purple-600 rounded-lg transition-all disabled:opacity-50"
                                  title="Generate visual diagram"
                                >
                                  {isGeneratingVisual === selectedQ.id ? (
                                    <Loader2 size={16} className="animate-spin text-purple-600" />
                                  ) : (
                                    <Sparkles size={16} />
                                  )}
                                </button>
                                <button
                                  onClick={handleGenerateAllVisuals}
                                  disabled={isGeneratingVisual !== null}
                                  className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg transition-all disabled:opacity-50"
                                  title="Generate all visuals"
                                >
                                  {(isGeneratingVisual !== null && isGeneratingVisual !== selectedQ.id) ? (
                                    <Loader2 size={16} className="animate-spin text-yellow-500" />
                                  ) : (
                                    <Zap size={16} />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Question Text */}
                          <div className="text-base text-slate-900 leading-relaxed mb-6">
                            <RenderWithMath text={selectedQ.text || ''} showOptions={false} serif={false} />
                          </div>

                          {/* Options - Minimal */}
                          {selectedQ.options && selectedQ.options.length > 0 && (() => {
                            const allImgs: string[] = selectedQ.extractedImages || [];
                            const optCount: number = selectedQ.options.length;
                            let optionImgs: string[] = [];
                            if (allImgs.length === optCount) {
                              optionImgs = allImgs;
                            } else if (allImgs.length === optCount + 1) {
                              optionImgs = allImgs.slice(1);
                            }
                            return (
                              <div className="grid grid-cols-2 gap-2 mb-6">
                                {selectedQ.options.map((option: string, idx: number) => {
                                  const isCorrect = selectedQ.correctOptionIndex !== undefined && idx === selectedQ.correctOptionIndex;
                                  const optImg: string | undefined = optionImgs[idx];
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-start gap-2 p-3 rounded-lg transition-colors relative ${isCorrect
                                        ? 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-300'
                                        : 'bg-slate-50 hover:bg-slate-100'
                                        } `}
                                    >
                                      {isCorrect && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </div>
                                      )}
                                      <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold mt-0.5 ${isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                        } `}>
                                        {['A', 'B', 'C', 'D'][idx]}
                                      </span>
                                      <div className={`flex-1 text-sm ${isCorrect ? 'text-emerald-900 font-semibold' : 'text-slate-700'} `}>
                                        {optImg ? (
                                          <div className="flex flex-col gap-1">
                                            <img
                                              src={optImg}
                                              alt={`Option ${['A', 'B', 'C', 'D'][idx]}`}
                                              className="max-w-full h-auto max-h-32 object-contain rounded cursor-zoom-in hover:opacity-90 transition-opacity"
                                              onClick={() => setEnlargedVisualNote({ imageUrl: optImg, questionId: selectedQ.id })}
                                            />
                                            {option && option.trim() && option.trim() !== ['A', 'B', 'C', 'D'][idx] && (
                                              <RenderWithMath text={option.replace(/^\([A-D]\)\s*/, '')} showOptions={false} serif={false} />
                                            )}
                                          </div>
                                        ) : (
                                          <RenderWithMath text={option.replace(/^\([A-D]\)\s*/, '')} showOptions={false} serif={false} />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Content Container with Tab Switcher */}
                          <div className="relative border-t border-slate-200 pt-6">
                            {/* Tab Switcher - Top Right of Content */}
                            <div className="absolute top-0 right-0 flex items-center gap-1 bg-white px-2 py-1 -translate-y-1/2 rounded-lg border border-slate-200 shadow-sm">
                              <button
                                onClick={() => setIntelligenceBreakdownTab('logic')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${intelligenceBreakdownTab === 'logic'
                                  ? 'bg-slate-900 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                  } `}
                              >
                                <span className="text-sm">📝</span>
                                <span>Logic</span>
                              </button>
                              <button
                                onClick={() => setIntelligenceBreakdownTab('visual')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${intelligenceBreakdownTab === 'visual'
                                  ? 'bg-slate-900 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                  } `}
                              >
                                <span className="text-sm">👁</span>
                                <span>Visual</span>
                              </button>
                            </div>

                            {/* Content Tabs */}
                            {intelligenceBreakdownTab === 'logic' ? (
                              <div className="space-y-4">
                                {/* Question Diagrams/Images — show all sources */}
                                {/* Source 1: imageUrl — Biology extractor's cropDiagram() output */}
                                {selectedQ.imageUrl && (
                                  <div className="mb-4 rounded-xl overflow-hidden border border-indigo-200 shadow-sm">
                                    <div className="bg-indigo-50 px-3 py-1.5 border-b border-indigo-100 flex items-center gap-2">
                                      <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                      <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wide">Extracted Diagram</span>
                                    </div>
                                    <img
                                      src={selectedQ.imageUrl}
                                      alt="Question diagram"
                                      className="w-full h-auto max-h-64 object-contain bg-white p-2 cursor-zoom-in hover:opacity-95 transition-opacity"
                                      onClick={() => setEnlargedVisualNote({ imageUrl: selectedQ.imageUrl!, questionId: selectedQ.id })}
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    {selectedQ.visualElementDescription && (
                                      <p className="text-[10px] text-slate-500 px-3 py-1.5 border-t border-indigo-100 italic">
                                        {selectedQ.visualElementDescription}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Source 2: extractedImages array — only question-level images (option images are shown in options grid above) */}
                                {selectedQ.extractedImages && selectedQ.extractedImages.length > 0 && (() => {
                                  const allImgs: string[] = selectedQ.extractedImages!;
                                  const optCount: number = selectedQ.options?.length || 0;
                                  // Determine which images are question diagrams vs option diagrams
                                  let questionLevelImgs: string[];
                                  if (allImgs.length === optCount && optCount > 0) {
                                    questionLevelImgs = []; // all are option images, shown in options grid
                                  } else if (allImgs.length === optCount + 1 && optCount > 0) {
                                    questionLevelImgs = [allImgs[0]]; // first is question diagram
                                  } else {
                                    questionLevelImgs = allImgs; // all are question diagrams
                                  }
                                  console.group(`🖼️ [RENDER-IMG] Q${selectedQ.id} — ${allImgs.length} total, ${questionLevelImgs.length} question-level`);
                                  allImgs.forEach((d: string, i: number) => {
                                    console.log(`  img[${i}]: length=${d.length} chars (~${(d.length*0.75/1024).toFixed(1)}KB), starts="${d.substring(0,80)}"`);
                                    if (!d.startsWith('data:')) console.warn(`  ⚠️ img[${i}] does NOT start with "data:" — src will be invalid!`);
                                  });
                                  console.groupEnd();
                                  if (questionLevelImgs.length === 0) return null;
                                  return (
                                    <div className="mb-4 space-y-2">
                                      {questionLevelImgs.map((imgData: string, idx: number) => (
                                        <div key={idx} className="rounded-xl overflow-hidden border border-blue-200 shadow-sm">
                                        <div className="bg-blue-50 px-3 py-1.5 border-b border-blue-100 flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                                              Figure {questionLevelImgs.length > 1 ? idx + 1 : ''}
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => {
                                              if (confirm('Are you sure you want to remove this diagram?')) {
                                                const newImages = [...selectedQ.extractedImages!];
                                                newImages.splice(idx, 1);
                                                onUpdateScan({
                                                  ...scan!,
                                                  analysisData: {
                                                    ...scan!.analysisData!,
                                                    questions: scan!.analysisData!.questions.map(q =>
                                                      q.id === selectedQ.id ? { ...q, extractedImages: newImages } : q
                                                    )
                                                  }
                                                });
                                              }
                                            }}
                                            className="p-1 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                            title="Delete diagram"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                        <img
                                          src={imgData}
                                          alt={`Diagram ${idx + 1}`}
                                          className="w-full h-auto max-h-64 object-contain bg-white p-2 cursor-zoom-in hover:opacity-95 transition-opacity"
                                          onClick={() => setEnlargedVisualNote({ imageUrl: imgData, questionId: selectedQ.id })}
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  );
                                })()}

                                {/* Source 3: hasVisualElement but no images yet — show indicator */}
                                {selectedQ.hasVisualElement && !selectedQ.imageUrl && (!selectedQ.extractedImages || selectedQ.extractedImages.length === 0) && (() => {
                                  console.warn(`🖼️ [RENDER-IMG] Q${selectedQ.id} falling through to Source-3 placeholder — no images available`, {
                                    hasVisualElement: selectedQ.hasVisualElement,
                                    imageUrl: selectedQ.imageUrl,
                                    extractedImages: selectedQ.extractedImages,
                                    sketchSvg: !!selectedQ.sketchSvg,
                                    allKeys: Object.keys(selectedQ),
                                  });
                                  return null;
                                })()}
                                {selectedQ.hasVisualElement && !selectedQ.imageUrl && (!selectedQ.extractedImages || selectedQ.extractedImages.length === 0) && (
                                  <div className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 flex items-start gap-3">
                                    <span className="text-2xl flex-shrink-0">🖼️</span>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-600 mb-0.5">
                                        {selectedQ.visualElementType || 'Diagram'} referenced in question
                                      </p>
                                      {selectedQ.visualElementDescription && (
                                        <p className="text-[11px] text-slate-500 italic leading-relaxed">
                                          {selectedQ.visualElementDescription}
                                        </p>
                                      )}
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        Re-scan the paper to extract the diagram image.
                                      </p>
                                    </div>
                                  </div>
                                )}



                                {/* Solution Steps - Minimal */}
                                {isSynthesizingQuestion === qId ? (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="animate-spin text-accent-500" size={20} />
                                  </div>
                                ) : selectedQ.solutionSteps ? (
                                  <div className="space-y-3">
                                    {selectedQ.solutionSteps.map((step: string, sIdx: number) => {
                                      const [title, content] = step.includes(':::') ? step.split(':::').map(s => s.trim()) : [`${sIdx + 1}`, step.trim()];
                                      return (
                                        <div key={sIdx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0">
                                          <span className="flex-shrink-0 w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-semibold">
                                            {sIdx + 1}
                                          </span>
                                          <div className="flex-1 text-sm text-slate-700 leading-relaxed">
                                            <RenderWithMath text={content} showOptions={false} serif={false} />
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Also show AI Sketch at the bottom of Logic if present */}
                                    {selectedQ.sketchSvg && (
                                      <div className="mt-4 pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mb-3">
                                          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interactive Sketch</span>
                                        </div>
                                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                                          <img
                                            src={selectedQ.sketchSvg}
                                            alt="Visual aid"
                                            className="w-full h-auto cursor-zoom-in"
                                            onClick={() => setEnlargedVisualNote({ imageUrl: selectedQ.sketchSvg!, questionId: selectedQ.id })}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-8">
                                    <p className="text-xs text-slate-400 mb-3">No solution available</p>
                                    <button
                                      onClick={() => synthesizeQuestionDetails(qId)}
                                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-medium hover:bg-slate-800 transition-colors"
                                    >
                                      Generate
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Visual Tab Content */
                              <div className="space-y-4">
                                {selectedQ.sketchSvg ? (
                                  <div
                                    className="rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-accent-400 transition-colors"
                                    onClick={() => setEnlargedVisualNote({ imageUrl: selectedQ.sketchSvg!, questionId: selectedQ.id })}
                                  >
                                    <img
                                      src={selectedQ.sketchSvg}
                                      alt="Visual note"
                                      className="w-full h-auto"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-8">
                                    {isGeneratingVisual === selectedQ.id ? (
                                      <>
                                        <Loader2 size={20} className="text-accent-500 mb-2 animate-spin" />
                                        <p className="text-xs text-slate-500">Generating...</p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-xs text-slate-400 mb-3">No visual note</p>
                                        <button
                                          onClick={() => handleGenerateVisual(selectedQ.id)}
                                          disabled={isGeneratingVisual !== null}
                                          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                                        >
                                          Generate
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300 italic">
                      Select a fragment to synchronize intelligence...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trends' && scan && (
            <PredictiveTrendsTab
              examContext={scan.examContext || 'KCET'}
              subject={scan.subject}
              currentYear={scan.year}
            />
          )}
        </div>

        {/* Enlarged Visual Note Modal */}
        {enlargedVisualNote && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEnlargedVisualNote(null)}
          >
            <div className="relative max-w-6xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 p-4 z-10">
                <button
                  onClick={() => setEnlargedVisualNote(null)}
                  className="p-2 bg-slate-900/90 hover:bg-slate-900 text-white rounded-xl shadow-lg transition-all active:scale-95"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">Visual Learning Note</h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Question: {questions.findIndex(q => q.id === enlargedVisualNote.questionId) + 1}</p>
                </div>
                <div className="overflow-auto max-h-[calc(90vh-120px)]">
                  <img
                    src={enlargedVisualNote.imageUrl}
                    alt="Enlarged visual note"
                    className="w-full h-auto rounded-xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamAnalysis;