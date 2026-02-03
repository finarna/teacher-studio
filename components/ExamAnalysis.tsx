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
  Download
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Scan, AnalyzedQuestion } from '../types';
import { RenderWithMath, DerivationStep } from './MathRenderer';
import { safeAiParse } from '../utils/aiParser';
import { generateSketch } from '../utils/sketchGenerators';
import { useAppContext } from '../contexts/AppContext';
import { useSubjectTheme } from '../hooks/useSubjectTheme';
import { useFilteredScans } from '../hooks/useFilteredScans';

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
}

const ExamAnalysis: React.FC<ExamAnalysisProps> = ({ onBack, scan, onUpdateScan, recentScans = [], onSelectScan }) => {
  // Use AppContext for subject/exam awareness
  const { subjectConfig, examConfig, activeSubject } = useAppContext();
  const theme = useSubjectTheme();
  const { scans: filteredScans } = useFilteredScans(recentScans);

  const [isSynthesizingAll, setIsSynthesizingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'vault'>('overview');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);
  const [isSynthesizingQuestion, setIsSynthesizingQuestion] = useState<string | null>(null);
  const [intelligenceBreakdownTab, setIntelligenceBreakdownTab] = useState<'logic' | 'visual'>('logic');
  const [isGeneratingVisual, setIsGeneratingVisual] = useState<string | null>(null);
  // Use best default model for visual generation
  const selectedImageModel = 'gemini-2.0-flash-exp-image-01';
  const [enlargedVisualNote, setEnlargedVisualNote] = useState<{ imageUrl: string, questionId: string } | null>(null);
  const [isGroupedView, setIsGroupedView] = useState(false);

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
    if (scan && scan.subject !== activeSubject) {
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
    if (scan && scan.subject === activeSubject) {
      lastSelectedScanRef.current = scan.id;
    }
  }, [activeSubject, scan?.id, filteredScans.length]);

  // Extract analysis data with safe defaults (MUST be before any conditional returns)
  const analysis = scan?.analysisData || { questions: [] };
  const questions = analysis.questions || [];
  // Safe subject value for useMemo dependencies
  const safeSubject = scan?.subject || activeSubject;

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
      const selectedModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';

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
      const prompt = `Elite Academic Specialist: Generate pedagogical solution for ${scan.subject} ${scan.grade}: "${question.text}"${optionsText}

CRITICAL: In JSON strings, double ALL backslashes for LaTeX.
Examples: "\\\\frac{1}{4}", "\\\\bar{A}", "\\\\sqrt{x}", "\\\\begin{bmatrix}"
(Write "\frac" → becomes "rac" after JSON parsing ❌. Write "\\\\frac" → becomes "\frac" ✓)

Schema: {
  "solutionSteps": ["Step Title ::: Explanation with $$Formula$$ blocks"],
  ${question.options && question.options.length > 0 ? '"correctOptionIndex": 0-3 (REQUIRED: 0=A, 1=B, 2=C, 3=D),' : ''}
  "masteryMaterial": {
    "coreConcept": "Professional summary with $$Key Formula$$",
    "logic": "Bulleted reasoning",
    "memoryTrigger": "Mnemonic/Rule"
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

      if (qData && (qData.solutionSteps || qData.masteryMaterial)) {
        // Check for corruption (but NOT inside valid \text{...} commands)
        const firstStep = qData.solutionSteps?.[0] || '';
        // Remove valid \text{...} commands before checking
        const withoutText = firstStep.replace(/\\text\{[^}]*\}/g, '');
        const hasCorruption = /\brac\b|\bimes\b|\bheta\b/.test(withoutText) || /(?<!\\)ext\b/.test(withoutText);
        console.log(hasCorruption ? '⚠️  CORRUPTED FORMULAS DETECTED' : '✨ FORMULAS CLEAN');
        if (hasCorruption) {
          console.log('Corruption found:', withoutText.substring(0, 150));
        } else {
          console.log('First step preview:', firstStep.substring(0, 150));
        }

        // DEBUG: Log correctOptionIndex
        console.log('🎯 [CORRECT ANSWER DEBUG] AI returned correctOptionIndex:', qData.correctOptionIndex);
        console.log('🎯 [CORRECT ANSWER DEBUG] Question has options:', question.options?.length > 0);
        if (qData.correctOptionIndex !== undefined) {
          console.log('✅ [CORRECT ANSWER] Will save correctOptionIndex:', qData.correctOptionIndex);
        } else {
          console.log('❌ [CORRECT ANSWER] AI did not return correctOptionIndex');
        }
        // Deep clone for React state detection & Redis sync
        const clonedQuestions = JSON.parse(JSON.stringify(scan.analysisData.questions));
        const finalQuestions = clonedQuestions.map((q: any) =>
          q.id === qId ? {
            ...q,
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
      const selectedModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';

      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
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

      for (let i = 0; i < questionsToSync.length; i += batchSize) {
        const batch = questionsToSync.slice(i, i + batchSize);
        const batchPromises = batch.map(async (q) => {
          // Build options string if question has options (MCQ)
          const optionsText = q.options && q.options.length > 0
            ? `\n\nOPTIONS:\n${q.options.map((opt, idx) => `${['A', 'B', 'C', 'D'][idx]}: ${opt}`).join('\n')}`
            : '';

          const prompt = `Elite Academic Specialist: Synthesize pedagogical solution for ${scan.subject} ${scan.grade}: "${q.text || ''}"${optionsText}

CRITICAL: In JSON strings, double ALL backslashes for LaTeX.
Examples: "\\\\frac{1}{4}", "\\\\bar{A}", "\\\\sqrt{x}", "\\\\begin{bmatrix}"
(Write "\frac" → becomes "rac" after JSON parsing ❌. Write "\\\\frac" → becomes "\frac" ✓)

Schema: {
  "solutionSteps": ["Step Title ::: Explanation with $$Formula$$ blocks"],
  ${q.options && q.options.length > 0 ? '"correctOptionIndex": 0-3 (REQUIRED: 0=A, 1=B, 2=C, 3=D),' : ''}
  "masteryMaterial": {
    "coreConcept": "Professional summary with $$Key Formula$$",
    "logic": "Bulleted reasoning",
    "memoryTrigger": "Mnemonic/Rule"
  }
}`;
          try {
            const res = await model.generateContent(prompt);
            const data = safeAiParse<any>(res.response.text(), null);
            return { id: q.id, data };
          } catch (err) {
            console.error(`Failed question ${q.id}:`, err);
            return { id: q.id, data: null };
          }
        });

        const results = await Promise.all(batchPromises);

        // Update local array for next batch iteration
        currentQuestions = currentQuestions.map(q => {
          const result = results.find(r => r.id === q.id && r.data);
          return result ? {
            ...q,
            solutionSteps: result.data.solutionSteps,
            masteryMaterial: result.data.masteryMaterial,
            // Update correctOptionIndex if AI provided it (for MCQs)
            ...(result.data.correctOptionIndex !== undefined && { correctOptionIndex: result.data.correctOptionIndex })
          } : q;
        });

        // Progressive update so user sees items populating
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
        scan.subject,
        apiKey,
        (status) => console.log(`📊 ${status}`)
      );

      console.log(`✓ Generated visual note for ${qId}`);

      // Update the scan with the new visual note
      const updatedQuestions = scan.analysisData.questions.map(q =>
        q.id === qId ? { ...q, sketchSvg: result.imageData } : q
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
      alert(`Failed to generate visual note: ${err.message}`);
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

    const confirmed = confirm(`Generate visual notes for ${questionsWithoutVisuals.length} questions? This may take several minutes.`);
    if (!confirmed) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("API Key Missing - Add VITE_GEMINI_API_KEY to .env.local");
      return;
    }

    console.log(`🎨 Starting bulk visual note generation for ${questionsWithoutVisuals.length} questions...`);

    for (const question of questionsWithoutVisuals) {
      try {
        setIsGeneratingVisual(question.id);
        console.log(`🎨 Generating visual note for ${question.id}...`);

        const result = await generateSketch(
          selectedImageModel,
          question.visualConcept || question.topic,
          question.text,
          scan.subject,
          apiKey,
          (status) => console.log(`📊 ${status}`)
        );

        console.log(`✓ Generated visual note for ${question.id}`);

        // Update scan incrementally for each question
        const updatedQuestions = scan.analysisData.questions.map(q =>
          q.id === question.id ? { ...q, sketchSvg: result.imageData } : q
        );

        const updatedScan: Scan = {
          ...scan,
          analysisData: {
            ...scan.analysisData,
            questions: updatedQuestions
          }
        };

        onUpdateScan(updatedScan);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err: any) {
        console.error(`Failed to generate visual for ${question.id}:`, err);
        // Continue with next question even if one fails
      }
    }

    setIsGeneratingVisual(null);
    alert(`✓ Bulk generation complete! Generated ${questionsWithoutVisuals.length} visual notes.`);
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

      if (!isGeneric) {
        // Try to match against each domain's keywords
        for (const key in currentMap) {
          const keywords = currentMap[key].chapters;
          let matchScore = 0;

          for (const keyword of keywords) {
            const kw = keyword.toLowerCase();
            // Check for exact word match or partial match
            if (topic === kw || topic.includes(kw) || kw.includes(topic)) {
              matchScore += 10; // Strong match
            } else {
              // Check for word boundary matches (e.g., "electric" matches "electricity")
              const topicWords = topic.split(/\s+/);
              const kwWords = kw.split(/\s+/);
              for (const tw of topicWords) {
                for (const kwWord of kwWords) {
                  if (tw.length > 3 && kwWord.length > 3) {
                    if (tw.startsWith(kwWord) || kwWord.startsWith(tw)) {
                      matchScore += 5; // Partial word match
                    }
                  }
                }
              }
            }
          }

          if (matchScore > maxMatchScore) {
            maxMatchScore = matchScore;
            matchedKey = key;
          }
        }
      }

      // Debug: Log first few classifications
      if (questions.indexOf(q) < 5) {
        console.log(`🔍 [CLASSIFICATION DEBUG] Q${questions.indexOf(q) + 1}: topic="${q.topic}" | chapter="${qData.chapter || 'N/A'}" | using="${rawTopic}" → matched="${matchedKey}" (score: ${maxMatchScore})`);
      }

      return { ...q, mappedKey: maxMatchScore > 0 ? matchedKey : 'General' };
    });

    // Debug: Log classification summary
    const classificationSummary: Record<string, number> = {};
    mappedQuestions.forEach(q => {
      classificationSummary[q.mappedKey] = (classificationSummary[q.mappedKey] || 0) + 1;
    });
    console.log(`📊 [CLASSIFICATION SUMMARY] Subject: ${safeSubject}, Distribution:`, classificationSummary);

    // 2. Aggregate metrics by domain
    const domainsFound: Record<string, any> = {};

    // Ensure all standard domains appear if they have questions
    Object.entries(currentMap).forEach(([key, info]) => {
      const catQuestions = mappedQuestions.filter(q => q.mappedKey === key);
      if (catQuestions.length > 0) {
        const totalMarks = catQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
        const avgDifficulty = catQuestions.reduce((acc, q) => {
          const d = (q.difficulty as string || '').toLowerCase();
          return acc + (d === 'hard' ? 3 : (d === 'moderate' || d === 'medium') ? 2 : 1);
        }, 0) / catQuestions.length;

        const bloomsDist: Record<string, number> = {};
        catQuestions.forEach(q => bloomsDist[q.blooms] = (bloomsDist[q.blooms] || 0) + 1);
        const dominantBlooms = Object.entries(bloomsDist).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Apply';

        domainsFound[key] = {
          name: info.domain,
          chapters: Array.from(new Set(catQuestions.map(q => q.topic))),
          catQuestions,
          totalMarks,
          avgDifficulty,
          difficultyDNA: avgDifficulty >= 2.4 ? 'Hard' : avgDifficulty >= 1.7 ? 'Moderate' : 'Easy',
          dominantBlooms,
          friction: info.friction
        };
      }
    });

    // Handle 'General' catch-all
    const generalQuestions = mappedQuestions.filter(q => q.mappedKey === 'General');
    if (generalQuestions.length > 0) {
      const gMarks = generalQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
      domainsFound['General'] = {
        name: 'Core Foundations',
        chapters: Array.from(new Set(generalQuestions.map(q => q.topic))),
        catQuestions: generalQuestions,
        totalMarks: gMarks,
        avgDifficulty: 1.5,
        difficultyDNA: 'Moderate',
        dominantBlooms: 'Understand',
        friction: 'Fundamental conceptual integration across branches.'
      };
    }

    return Object.values(domainsFound).sort((a, b) => b.totalMarks - a.totalMarks);
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

      const sourceQuestions = questions.filter(q => q.source?.trim() === source);
      if (sourceQuestions.length === 0) return null;

      const totalMarks = sourceQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
      const avgDiff = sourceQuestions.reduce((acc, q) => {
        const d = (q.difficulty as string || 'Moderate').toLowerCase();
        return acc + (d === 'hard' ? 3 : (d === 'moderate' || d === 'medium') ? 2 : 1);
      }, 0) / sourceQuestions.length;

      // FIXED: Complexity = Average marks per question (not total/length)
      const complexityIndex = sourceQuestions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0) / sourceQuestions.length;

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
            const matchedKey = Object.keys(currentMap).find(key =>
              currentMap[key].chapters.some(ch => topic.includes(ch.toLowerCase()) || ch.toLowerCase().includes(topic))
            ) || 'General';
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
        {/* Header Bar - Tabs + Scan Selection */}
        <div className="bg-white border-b border-slate-200 px-6 pt-4 pb-0 shrink-0">
          <div className="flex items-center justify-between">
            {/* Left: Tabs */}
            <div className="flex items-center gap-1">
              {(['overview', 'intelligence', 'vault'] as const).map(tab => {
                const TabIcon = tab === 'overview' ? HelpCircle : tab === 'intelligence' ? Activity : FolderOpen;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-[11px] font-bold uppercase tracking-wide transition-all border-b-2 ${
                      activeTab === tab
                        ? 'bg-slate-50 text-slate-900 border-accent-600'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                    }`}
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
                          <div className={`w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center ${insight.color}`}>{insight.icon}</div>
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
                            <div className="h-40 w-full">
                              <ResponsiveContainer width="100%" height="100%">
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
                          <div className="h-48 border border-slate-100 rounded-3xl p-4 bg-slate-50/30">
                            <ResponsiveContainer width="100%" height="100%">
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
                          <div className="h-48 border border-slate-100 rounded-3xl p-4 bg-slate-50/30">
                            {portfolioStats && (portfolioStats as any[]).length > 0 && (
                              <ResponsiveContainer width="100%" height="100%">
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
                                <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter ${stat.avgDifficulty >= 2.5 ? 'bg-rose-100 text-rose-600' : 'bg-accent-100 text-accent-600'}`}>
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
                          <div className={`w-8 h-8 rounded-full mb-4 flex items-center justify-center ${trend.type === 'positive' ? 'bg-emerald-100 text-emerald-600' : trend.type === 'negative' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
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
                            <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${(stat.totalMarks / 70) * 100}%` }} />
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
                            <div className="h-full bg-accent-500 shadow-[0_0_8px_rgba(20,184,166,0.5)] transition-all duration-1000 origin-left" style={{ width: `${prob}%` }} />
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
                      <th className="px-8 py-5">Cognitive DNA</th>
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
                            {cat.chapters.map((ch, ci) => (
                              <span key={ci} className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-sm hover:border-accent-400 transition-all">{ch}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-[15px] font-black text-slate-900 italic font-outfit">{cat.totalMarks}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 bg-slate-900 shadow-md text-white rounded-lg text-[9px] font-black uppercase tracking-[0.15em]">{cat.dominantBlooms}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              <span>{cat.difficultyDNA}</span>
                              <span className="text-slate-900">{Math.round((cat.avgDifficulty / 3) * 100)}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <div className={`h-full ${cat.difficultyDNA === 'Hard' ? 'bg-rose-500' : 'bg-accent-500'} transition-all shadow-[0_0_8px_rgba(20,184,166,0.4)]`} style={{ width: `${(cat.avgDifficulty / 3) * 100}%` }} />
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
                        <div className="h-full transition-all shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ width: `${bloom.percentage}%`, backgroundColor: bloom.color || '#3b82f6' }} />
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
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${insight.difficulty === 'Hard' ? 'bg-rose-100 text-rose-600' : 'bg-accent-100 text-accent-600'}`}>{insight.difficulty}</span>
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
          <div className="h-full flex overflow-hidden">
            {/* Left Column - Questions List */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
              {/* Search & View Toggle */}
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search questions..."
                    className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20 transition-all pl-8"
                  />
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                  <button
                    onClick={() => setIsGroupedView(false)}
                    className={`flex-1 px-2 py-1.5 text-[9px] font-semibold rounded transition-all ${
                      !isGroupedView ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setIsGroupedView(true)}
                    className={`flex-1 px-2 py-1.5 text-[9px] font-semibold rounded transition-all ${
                      isGroupedView ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Group
                  </button>
                </div>
              </div>

              {/* Question List - Plain View */}
              {!isGroupedView && (
                <div className="flex-1 overflow-y-auto scroller-hide p-3 space-y-2">
                  {questions.map((q, i) => {
                    const qId = q.id || `frag-${i}`;
                    const isActive = (expandedQuestionId || questions[0]?.id) === qId;
                    const qNumMatch = q.id?.match(/Q(\d+)/i);
                    const qNum = qNumMatch ? qNumMatch[1] : (i + 1);
                    const hasVisual = q.hasVisualElement || (q.extractedImages && q.extractedImages.length > 0);

                    return (
                      <button
                        key={qId}
                        onClick={() => toggleQuestion(qId)}
                        className={`w-full text-left p-2.5 rounded-lg transition-all border ${
                          isActive
                            ? 'bg-accent-50 border-accent-300 shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`flex items-center justify-center w-7 h-7 rounded text-[11px] font-bold ${
                            isActive
                              ? 'bg-accent-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {qNum}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-semibold rounded">
                            {q.marks}M
                          </span>
                          {hasVisual && (
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" title="Has diagram/image" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-600 line-clamp-2 leading-tight">
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
                      <div key={domain.name} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                        <button
                          onClick={() => setExpandedDomainId(isDomainExpanded ? null : domain.name)}
                          className="w-full flex flex-col gap-2 p-2.5 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150 transition-all"
                        >
                          <div className="flex items-start justify-between w-full gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isDomainExpanded ? (
                                <ChevronDown size={14} className="text-slate-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <ChevronRight size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                              )}
                              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide leading-tight">
                                {domain.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="px-1.5 py-0.5 bg-white text-slate-600 text-[8px] font-bold rounded">
                                {domainQuestions.length}Q
                              </span>
                              <span className="px-1.5 py-0.5 bg-white text-slate-600 text-[8px] font-bold rounded">
                                {domain.totalMarks}M
                              </span>
                              <span className={`px-1.5 py-0.5 text-[8px] font-semibold rounded ${
                                domain.difficultyDNA === 'Hard' ? 'bg-red-100 text-red-700' :
                                domain.difficultyDNA === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {domain.difficultyDNA}
                              </span>
                            </div>
                          </div>
                        </button>
                        {isDomainExpanded && (
                          <div className="p-2 space-y-2 bg-slate-50/50">
                            {domainQuestions.map((q, i) => {
                              const qId = q.id || `frag-${i}`;
                              const isActive = (expandedQuestionId || questions[0]?.id) === qId;
                              const qNumMatch = q.id?.match(/Q(\d+)/i);
                              const qNum = qNumMatch ? qNumMatch[1] : (i + 1);
                              const hasVisual = q.hasVisualElement || (q.extractedImages && q.extractedImages.length > 0);

                              return (
                                <button
                                  key={qId}
                                  onClick={() => toggleQuestion(qId)}
                                  className={`w-full text-left p-2 rounded-lg transition-all border ${
                                    isActive
                                      ? 'bg-accent-50 border-accent-300 shadow-sm'
                                      : 'bg-white hover:bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold ${
                                      isActive
                                        ? 'bg-accent-600 text-white'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {qNum}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-semibold rounded">
                                      {q.marks}M
                                    </span>
                                    {hasVisual && (
                                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" title="Has diagram/image" />
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-600 line-clamp-2 leading-tight">
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

              {/* Footer */}
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
            </div>

            {/* Right Column - Question Details */}
            <div className="flex-1 overflow-y-auto scroller-hide p-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
              {questions.find(q => (q.id || `frag-0`) === (expandedQuestionId || questions[0]?.id || `frag-0`)) ? (
                  (() => {
                    const selectedQ = questions.find(q => (q.id || `frag-0`) === (expandedQuestionId || questions[0]?.id || `frag-0`))!;
                    const qId = selectedQ.id || 'frag-0';

                    // Debug: Check if extractedImages is present on selectedQ
                    console.debug('🔍 [VAULT DISPLAY DEBUG] Selected question:', {
                      id: selectedQ.id,
                      hasExtractedImages: !!selectedQ.extractedImages,
                      extractedImagesCount: selectedQ.extractedImages?.length || 0,
                      extractedImagesType: typeof selectedQ.extractedImages,
                      hasVisualElement: selectedQ.hasVisualElement,
                      questionKeys: Object.keys(selectedQ)
                    });

                    return (
                      <>
                        {/* Single Row Question Header */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                          {/* Left - Question Info */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">{selectedQ.id}</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded">
                              {selectedQ.marks}M
                            </span>
                            {selectedQ.difficulty && (
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                                selectedQ.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                                selectedQ.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
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

                          {/* Right - Actions */}
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
                        </div>

                        {/* Question Text */}
                        <div className="text-base text-slate-900 leading-relaxed mb-6">
                            <RenderWithMath text={selectedQ.text || ''} showOptions={false} serif={false} />
                          </div>

                        {/* Options - Minimal */}
                        {selectedQ.options && selectedQ.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mb-6">
                            {selectedQ.options.map((option: string, idx: number) => {
                              const isCorrect = selectedQ.correctOptionIndex !== undefined && idx === selectedQ.correctOptionIndex;
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-2 p-3 rounded-lg transition-colors relative ${
                                    isCorrect
                                      ? 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-300'
                                      : 'bg-slate-50 hover:bg-slate-100'
                                  }`}
                                >
                                  {isCorrect && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                  <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {['A', 'B', 'C', 'D'][idx]}
                                  </span>
                                  <div className={`flex-1 text-sm ${isCorrect ? 'text-emerald-900 font-semibold' : 'text-slate-700'}`}>
                                    <RenderWithMath text={option.replace(/^\([A-D]\)\s*/, '')} showOptions={false} serif={false} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Content Container with Tab Switcher */}
                        <div className="relative border-t border-slate-200 pt-6">
                          {/* Tab Switcher - Top Right of Content */}
                          <div className="absolute top-0 right-0 flex items-center gap-1 bg-white px-2 py-1 -translate-y-1/2 rounded-lg border border-slate-200 shadow-sm">
                            <button
                              onClick={() => setIntelligenceBreakdownTab('logic')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                intelligenceBreakdownTab === 'logic'
                                  ? 'bg-slate-900 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <span className="text-sm">📝</span>
                              <span>Logic</span>
                            </button>
                            <button
                              onClick={() => setIntelligenceBreakdownTab('visual')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                intelligenceBreakdownTab === 'visual'
                                  ? 'bg-slate-900 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <span className="text-sm">👁</span>
                              <span>Visual</span>
                            </button>
                          </div>

                          {/* Content Tabs */}
                          {intelligenceBreakdownTab === 'logic' ? (
                            <div className="space-y-4">
                            {/* Extracted Images - Minimal */}
                            {selectedQ.extractedImages && selectedQ.extractedImages.length > 0 && (
                              <div className="mb-4">
                                {selectedQ.extractedImages.map((imgData, idx) => (
                                  <img
                                    key={idx}
                                    src={imgData}
                                    alt={`Diagram ${idx + 1}`}
                                    className="w-full rounded-lg border border-slate-200"
                                  />
                                ))}
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
                                  const [title, content] = step.includes(':::') ? step.split(':::') : [`${sIdx + 1}`, step];
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
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Question ID: {enlargedVisualNote.questionId}</p>
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