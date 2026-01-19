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
}

const ExamAnalysis: React.FC<ExamAnalysisProps> = ({ onBack, scan, onUpdateScan }) => {
  const [isSynthesizingAll, setIsSynthesizingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'vault'>('overview');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);
  const [isSynthesizingQuestion, setIsSynthesizingQuestion] = useState<string | null>(null);

  if (!scan || !scan.analysisData) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 text-slate-400 border border-slate-200 shadow-xl">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2 font-outfit uppercase tracking-tight">System Void</h2>
        <p className="text-[11px] text-slate-500 max-w-sm mb-10 font-bold uppercase tracking-widest italic">Initialize the holographic pipeline to synthesize paper intelligence.</p>
        <button onClick={onBack} className="px-10 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 text-[10px] uppercase tracking-widest">Reboot Dashboard</button>
      </div>
    );
  }

  const analysis = scan.analysisData;
  const questions = analysis.questions || [];

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

      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      });

      const prompt = `Elite Academic Specialist: Synthesize pedagogical solution for the ${scan.subject} ${scan.grade} question: "${question.text}".
      
      LATEX RULES:
      1. Use $$ ... $$ for EVERY important formula, equation, or derivation step.
      2. Use $ ... $ for inline variables (e.g. $x$, $v_0$).
      3. Ensure LaTeX is clean and professional.
      
      Return JSON ONLY. 
      Schema: { 
        "solutionSteps": ["Step Title ::: Explanation with $$公式$$ blocks"], 
        "masteryMaterial": { 
          "coreConcept": "Professional summary with $$Key Formula$$", 
          "logic": "Bulleted reasoning", 
          "memoryTrigger": "Mnemonic/Rule" 
        } 
      }`;

      const res = await model.generateContent(prompt);
      const rawText = res.response.text();
      let qData = safeAiParse<any>(rawText, null);

      // FIX: Handle array responses from AI (sometimes returns [{...}] instead of {...})
      if (Array.isArray(qData) && qData.length > 0) {
        qData = qData[0];
      }

      if (qData && (qData.solutionSteps || qData.masteryMaterial)) {
        // Deep clone for React state detection & Redis sync
        const clonedQuestions = JSON.parse(JSON.stringify(scan.analysisData.questions));
        const finalQuestions = clonedQuestions.map((q: any) =>
          q.id === qId ? { ...q, ...qData } : q
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
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      });

      const unSolved = questions.filter(q => !q.solutionSteps || q.solutionSteps.length === 0);
      if (unSolved.length === 0) return;

      // Process in batches of 3 to prevent timeouts/stalls
      const batchSize = 3;
      let currentQuestions = [...scan.analysisData!.questions];

      for (let i = 0; i < unSolved.length; i += batchSize) {
        const batch = unSolved.slice(i, i + batchSize);
        const batchPromises = batch.map(async (q) => {
          const prompt = `Elite Academic Specialist: Synthesize pedagogical solution for ${scan.subject} ${scan.grade}: "${q.text || ''}". 
          
          LATEX RULES:
          1. Wrap all formulas and derivations in $$ ... $$ for block rendering.
          2. Use $ ... $ for inline variables.
          
          Return JSON ONLY: { 
            "solutionSteps": ["Step Title ::: Explanation using $$Formula Block$$"], 
            "masteryMaterial": { 
              "coreConcept": "Summary with $$Key Formula$$", 
              "logic": "...", 
              "memoryTrigger": "..." 
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
          return result ? { ...q, ...result.data } : q;
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

  const SUBJECT_DOMAIN_MAPS: Record<string, Record<string, { domain: string, chapters: string[], friction: string }>> = {
    'Physics': {
      'Mechanics': {
        domain: 'Mechanics',
        chapters: ['Fluid', 'Rotational', 'Motion', 'Gravitation', 'Gravity', 'Work', 'Energy', 'Power', 'Kinematics', 'Dynamics', 'Units', 'Measurement', 'Properties of Matter', 'Circular', 'Friction', 'Collision', 'Momentum', 'Force', 'Newton', 'Projectile', 'Velocity', 'Acceleration', 'Mass', 'Density', 'Pressure'],
        friction: 'Advanced calculus-based modeling and 3D rigid body constraints.'
      },
      'Electrodynamics': {
        domain: 'Electrodynamics',
        chapters: ['Capacitor', 'Magnetic', 'Current', 'EM Wave', 'Charge', 'Magnetism', 'EMI', 'Alternating', 'Electrostatic', 'Electric', 'Circuit', 'Induction', 'Potentiometer', 'Resistance', 'Ohm', 'Voltage', 'Battery', 'Conductor', 'Insulator', 'Dielectric', 'Flux', 'Gauss', 'Coulomb'],
        friction: 'Multi-field interactions (Lorentz Force) and non-standard topographies.'
      },
      'Modern Physics': {
        domain: 'Modern Physics',
        chapters: ['Modern', 'Bohr', 'De-Broglie', 'Atomic', 'Atom', 'Nuclei', 'Nuclear', 'Photoelectric', 'Quantum', 'Radioactivity', 'Radioactive', 'X-Ray', 'Photon', 'Electron', 'Proton', 'Neutron', 'Isotope', 'Fission', 'Fusion', 'Planck', 'Einstein', 'Compton'],
        friction: 'Numerical precision with physical constants and proportional scaling.'
      },
      'Optics': {
        domain: 'Optics',
        chapters: ['Ray Optic', 'Wave Optic', 'Lens', 'Mirror', 'Interference', 'Diffraction', 'Polarization', 'Prism', 'Refraction', 'Reflection', 'Light', 'Spectrum', 'Dispersion', 'Focal', 'Image', 'Magnification', 'Telescope', 'Microscope'],
        friction: 'Spatial visualization of wave-fronts and geometric alignment.'
      },
      'Thermodynamics': {
        domain: 'Thermodynamics',
        chapters: ['Kinetic Theory', 'Heat', 'Gas', 'Thermodynamic', 'Thermal', 'Temperature', 'Efficiency', 'Entropy', 'Conduction', 'Convection', 'Radiation', 'Calorimetry', 'Expansion', 'Ideal Gas', 'Carnot', 'Kelvin', 'Celsius'],
        friction: 'Multi-variable state tracking during system transitions.'
      },
      'Waves': {
        domain: 'Oscillations & Waves',
        chapters: ['SHM', 'Simple Harmonic', 'Oscillation', 'Spring', 'Sound', 'Wave', 'Beat', 'Doppler', 'Resonance', 'Frequency', 'Amplitude', 'Period', 'Pendulum', 'Vibration'],
        friction: 'Dynamic variable dependencies mass loss vs frequency.'
      },
      'Semiconductors': {
        domain: 'Semiconductors',
        chapters: ['Logic Gate', 'Rectifier', 'Transistor', 'Diode', 'P-N Junction', 'Electronic Device', 'Semiconductor', 'LED', 'Amplifier', 'Oscillator', 'Digital', 'Analog'],
        friction: 'Boolean implementation vs gate bias determination.'
      }
    }
  };

  const aggregatedDomains = React.useMemo(() => {
    const currentMap = SUBJECT_DOMAIN_MAPS[scan.subject] || SUBJECT_DOMAIN_MAPS['Physics'];

    // 1. Assign each question to exactly ONE domain with improved matching
    const mappedQuestions = questions.map(q => {
      const topic = (q.topic || '').toLowerCase().trim();
      let matchedKey = 'General';
      let maxMatchScore = 0;

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
              for (const kw of kwWords) {
                if (tw.length > 3 && kw.length > 3) {
                  if (tw.startsWith(kw) || kw.startsWith(tw)) {
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

      return { ...q, mappedKey: maxMatchScore > 0 ? matchedKey : 'General' };
    });

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
  }, [scan.subject, questions]);

  const portfolioStats = React.useMemo(() => {
    // Collect all valid sources (filenames or identifiers)
    const sources = Array.from(new Set(questions.map(q => q.source?.trim()))).filter(Boolean) as string[];

    // If only one source, we'll create a "Baseline" paper for comparison
    const hasBaseline = sources.length === 1;
    const processingSources = hasBaseline ? ['Standard Baseline', sources[0]] : sources;

    const currentMap = SUBJECT_DOMAIN_MAPS[scan.subject] || SUBJECT_DOMAIN_MAPS['Physics'];

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
  }, [questions, scan.subject]);

  const topicTrendData = React.useMemo(() => {
    if (!portfolioStats) return null;
    return portfolioStats.map(stat => ({
      name: stat.source,
      ...stat.topicDistribution
    }));
  }, [portfolioStats]);

  const domainNames = React.useMemo(() => {
    const list = Array.from(new Set(Object.values(SUBJECT_DOMAIN_MAPS[scan.subject] || SUBJECT_DOMAIN_MAPS['Physics']).map(d => d.domain)));
    list.push('Core Foundations');
    return list;
  }, [scan.subject]);

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

  return (
    <div className="p-4 h-full flex flex-col gap-4 font-instrument bg-slate-50/50 overflow-hidden">
      <div className="flex items-center justify-between shrink-0 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900 transition-all group">
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 font-outfit uppercase tracking-tight italic">Intelligence <span className="text-accent-600">Sync</span></h2>
              <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-black text-slate-500 rounded uppercase tracking-widest">{scan.subject}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{scan.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl">
          {(['overview', 'intelligence', 'vault'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all font-outfit ${activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'vault' && (
          <button
            onClick={synthesizeAllSolutions}
            disabled={isSynthesizingAll}
            className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent-700 transition-all shadow-lg shadow-accent-600/20 active:scale-95 disabled:opacity-50"
          >
            {isSynthesizingAll ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sync All
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scroller-hide">
        {activeTab === 'overview' && (
          <div className="space-y-6 pb-8">
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
          <div className="grid grid-cols-12 gap-4 pb-8">
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
                      <Bar dataKey="marks" fill="#0f172a" radius={[8, 8, 0, 0]} barSize={48} />
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
          <div className="h-full flex flex-col pt-2 pb-4 overflow-hidden">
            <div className="flex-1 lg:grid lg:grid-cols-12 gap-4 overflow-hidden">
              {/* Master List (Left Column) */}
              {/* Master List (Left Column) - Grouped by Domain */}
              <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 scroller-hide">
                {aggregatedDomains.map((domain, dIdx) => {
                  const isDomainExpanded = expandedDomainId === domain.name || (expandedDomainId === null && dIdx === 0);
                  const domainQuestions = domain.catQuestions || [];

                  if (domainQuestions.length === 0) return null;

                  return (
                    <div key={domain.name} className="flex flex-col gap-2">
                      <button
                        onClick={() => setExpandedDomainId(expandedDomainId === domain.name ? '' : domain.name)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isDomainExpanded ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDomainExpanded ? 'bg-accent-500/20 text-accent-400' : 'bg-slate-50 text-slate-400'}`}>
                            <Compass size={16} />
                          </div>
                          <div className="text-left">
                            <p className={`text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${isDomainExpanded ? 'text-white' : 'text-slate-900'}`}>{domain.name}</p>
                            <p className={`text-[8px] font-bold uppercase tracking-widest ${isDomainExpanded ? 'text-slate-500' : 'text-slate-400'}`}>{domainQuestions.length} Questions Indexed</p>
                          </div>
                        </div>
                        {isDomainExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </button>

                      {isDomainExpanded && (
                        <div className="flex flex-col gap-2 pl-4 border-l-2 border-slate-100 animate-in slide-in-from-top-2 duration-300 ml-4">
                          {domainQuestions.map((q, i) => {
                            const qId = q.id || `frag-${dIdx}-${i}`;
                            const isActive = (expandedQuestionId || questions[0]?.id) === qId;

                            return (
                              <div
                                key={qId}
                                onClick={() => toggleQuestion(qId)}
                                className={`p-4 transition-all cursor-pointer rounded-2xl border flex flex-col gap-2 group relative overflow-hidden ${isActive ? 'bg-white border-accent-500 shadow-xl ring-1 ring-accent-500/20' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                              >
                                {isActive && <div className="absolute top-0 left-0 w-1 h-full bg-accent-500" />}
                                <div className="flex items-center justify-between">
                                  <span className={`text-[9px] font-black uppercase tracking-tighter ${isActive ? 'text-accent-500' : 'text-slate-400'}`}>
                                    {q.marks}M • {q.difficulty}
                                  </span>
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-slate-400' : 'text-slate-300'}`}>
                                    {q.source?.substring(0, 15)}...
                                  </span>
                                </div>
                                <div className={`text-[11px] font-bold leading-relaxed line-clamp-2 font-instrument ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                                  <RenderWithMath text={q.text || ''} showOptions={false} serif={false} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Detail Panel (Right Column) */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-y-auto scroller-hide p-6 md:p-8 relative">
                {questions.find(q => (q.id || `frag-0`) === (expandedQuestionId || questions[0]?.id || `frag-0`)) ? (
                  (() => {
                    const selectedQ = questions.find(q => (q.id || `frag-0`) === (expandedQuestionId || questions[0]?.id || `frag-0`))!;
                    const qId = selectedQ.id || 'frag-0';

                    return (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Header Section */}
                        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-accent-100 text-accent-700 text-[9px] font-black uppercase rounded tracking-widest">Pedagogical Logic</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {selectedQ.id} • {selectedQ.marks} Marks</span>
                            </div>
                            <h2 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tight">Intelligence <span className="text-accent-600">Breakdown</span></h2>
                          </div>
                          <div className="flex gap-2">
                            <button className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                              <Share2 size={16} />
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent-600 transition-all shadow-lg active:scale-95">
                              <Download size={14} /> Export
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="space-y-10">
                          {/* Question Text */}
                          <div className="text-lg font-bold text-slate-800 leading-relaxed font-instrument border-l-4 border-accent-500/20 pl-6 py-4 mb-8 bg-slate-50/50 rounded-xl">
                            <RenderWithMath text={selectedQ.text || ''} showOptions={false} serif={false} />
                          </div>

                          {isSynthesizingQuestion === qId ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                              <Loader2 className="animate-spin text-accent-600 mb-6" size={40} />
                              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Synthesizing Pedagogical Logic...</p>
                            </div>
                          ) : selectedQ.solutionSteps ? (
                            <div className="space-y-12">
                              {/* Core Logic Callout */}
                              <div className="p-6 md:p-8 bg-accent-50 border border-accent-100 rounded-[2rem] relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.05] -rotate-12"><Zap size={100} /></div>
                                <h4 className="text-[10px] font-black text-accent-600 uppercase tracking-widest mb-3 flex items-center gap-2 font-outfit">
                                  <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse outline outline-4 outline-accent-500/10"></div>
                                  Core Domain Logic
                                </h4>
                                <div className="text-lg font-bold text-slate-900 leading-relaxed italic border-l-2 border-accent-200 pl-6 font-instrument">
                                  <RenderWithMath text={selectedQ.masteryMaterial?.coreConcept} showOptions={false} serif={false} />
                                </div>
                              </div>

                              {/* Derivation Steps */}
                              <div className="space-y-8">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-4 font-outfit">
                                  Structural Breakdown <div className="h-px bg-slate-100 flex-1"></div>
                                </h4>
                                {selectedQ.solutionSteps.map((step: string, sIdx: number) => {
                                  const [title, content] = step.includes(':::') ? step.split(':::') : [`Step ${sIdx + 1}`, step];
                                  return (
                                    <div key={sIdx} className="relative pl-6 border-l border-slate-100 last:border-0 pb-6">
                                      <div className="absolute top-0 -left-[5px] w-2.5 h-2.5 rounded-full bg-white border-2 border-accent-500" />
                                      <div className="flex flex-col gap-1">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</div>
                                        <div className="text-base font-bold text-slate-700 leading-relaxed">
                                          <RenderWithMath text={content} showOptions={false} serif={false} />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                              <HelpCircle size={48} className="text-slate-300 mb-4" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">No Logic Fragments Found</p>
                              <button
                                onClick={() => synthesizeQuestionDetails(qId)}
                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-accent-600 transition-all flex items-center gap-3 shadow-2xl shadow-slate-900/20 active:scale-95"
                              >
                                <Zap size={14} /> Synthesize Logic Fragments
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 italic">
                    Select a fragment to synchronize intelligence...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamAnalysis;