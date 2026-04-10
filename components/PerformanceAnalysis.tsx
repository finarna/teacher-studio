import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Zap,
  Brain,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldCheck,
  Shield,
  BarChart3,
  Activity,
  Loader2,
  ArrowRight,
  Lightbulb,
  BookOpen,
  ChevronLeft,
  Menu,
  MinusCircle,
  RefreshCcw,
  Check,
  X,
  Signal,
  FileText,
  Workflow,
  MousePointer2,
  Table as TableIcon,
  Activity as ActivityIcon,
  CircleStop
} from 'lucide-react';
import { DetailedTestCard } from './ui/DetailedTestCard';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { supabase } from '../lib/supabase';
import type { TestAttempt, TestResponse, AnalyzedQuestion } from '../types';
import { RenderWithMath } from './MathRenderer';
import { getApiUrl } from '../lib/api';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
import { getExamConfig } from '../config/exams';

interface PerformanceAnalysisProps {
  attempt: TestAttempt;
  responses: TestResponse[];
  questions: AnalyzedQuestion[];
  onReviewQuestions: () => void;
  onRetakeTest: () => void;
  onBackToDashboard: () => void;
  mode?: 'results' | 'vault';
}

interface AISummary {
  verdict: string;
  strengths: { title: string; detail: string }[];
  weaknesses: { title: string; detail: string }[];
  studyPlan: string;
  isBlueprint?: boolean;
  paperStats?: {
    entropyScore: number;
    entropyLabel: string;
    volatilityScore: number;
    volatilityLabel: string;
    trapProbability: number;
    trapLabel: string;
    strategicFocus: string;
    strategicPacing?: number;
    cognitiveLoad?: number;
    cognitiveLabel?: string;
    topicSynergy?: string;
    preparationVelocity?: string;
  };
}

const SUBJECT_DOMAIN_MAPS: Record<string, any> = {
  'Physics': {
    'Mechanics': { domain: 'Mechanics', chapters: ['Circular Motion', 'Laws of Motion', 'Work Energy and Power', 'System of Particles and Rotational Motion', 'Gravitation', 'Kinematics', 'Measurement', 'Friction', 'Force', 'Newton', 'Projectile', 'Velocity', 'Acceleration', 'Mass'], friction: 'Advanced calculus-based modeling and 3D rigid body constraints.' },
    'Electrodynamics': { domain: 'Electrodynamics', chapters: ['Current Electricity', 'Moving Charges and Magnetism', 'Electromagnetic Induction', 'Alternating Current', 'Electrostatics', 'Magnetism and Matter', 'Capacitance', 'Magnetic', 'Charge', 'EM Wave'], friction: 'Multi-field interactions and non-standard topographies.' },
    'Modern Physics': { domain: 'Modern Physics', chapters: ['Atoms', 'Nuclei', 'Dual Nature', 'Modern', 'Bohr', 'Nuclear', 'Photoelectric', 'Quantum', 'Radioactivity', 'X-Ray'], friction: 'Numerical precision with physical constants.' },
    'Optics': { domain: 'Optics', chapters: ['Wave Optics', 'Ray Optics', 'Lens', 'Mirror', 'Interference', 'Diffraction', 'Polarization', 'Prism', 'Refraction'], friction: 'Spatial visualization of wave-fronts.' }
  },
  'Botany': {
    'Plant Physiology': { domain: 'Plant Physiology', chapters: ['Photosynthesis', 'Respiration', 'Plant Growth', 'Transport in Plants', 'Mineral Nutrition'], friction: 'Bio-chemical pathway complexity.' },
    'Reproduction': { domain: 'Reproduction', chapters: ['Sexual Reproduction in Flowering Plants', 'Pollination', 'Seed and Fruit Development'], friction: 'Botanical terminology density.' },
    'Genetics & Evolution': { domain: 'Genetics', chapters: ['Principles of Inheritance', 'Molecular Basis of Inheritance', 'Mendelian Genetics', 'DNA Replication', 'Transcription', 'Translation', 'Genetic Code'], friction: 'Abstract molecular logic.' },
    'Biology in Human Welfare': { domain: 'Welfare', chapters: ['Microbes in Human Welfare', 'Strategies for Enhancement in Food Production'], friction: 'Process flow memory.' },
    'Ecology': { domain: 'Ecology', chapters: ['Organisms and Populations', 'Ecosystem', 'Biodiversity', 'Environmental Issues'], friction: 'Systemic interaction logic.' },
    'Diversity of Life': { domain: 'Diversity', chapters: ['Biological Classification', 'Plant Kingdom', 'Monera', 'Protista', 'Fungi', 'Algae', 'Bryophytes', 'Pteridophytes', 'Gymnosperms', 'Angiosperms'], friction: 'Classification memory density.' }
  },
  'Zoology': {
    'Human Physiology': { domain: 'Human Physiology', chapters: ['Digestion and Absorption', 'Breathing and Exchange of Gases', 'Body Fluids and Circulation', 'Excretory Products', 'Locomotion and Movement', 'Neural Control', 'Chemical Coordination'], friction: 'Complex organ system interactions.' },
    'Animal Kingdom': { domain: 'Diversity', chapters: ['Animal Kingdom', 'Porifera', 'Coelenterata', 'Platyhelminthes', 'Aschelminthes', 'Annelida', 'Arthropoda', 'Mollusca', 'Echinodermata', 'Hemichordata', 'Chordata'], friction: 'Taxonomic diversity.' },
    'Reproduction': { domain: 'Reproductive Biology', chapters: ['Human Reproduction', 'Reproductive Health', 'Embryonic Development', 'Gametogenesis', 'Fertilization'], friction: 'Cellular developmental stages.' },
    'Evolution': { domain: 'Evolution', chapters: ['Evolution', 'Origin of Life', 'Natural Selection', 'Darwinism', 'Human Evolution'], friction: 'Temporal logic and evidence synthesis.' },
    'Biotechnology': { domain: 'Biotech', chapters: ['Biotechnology: Principles and Processes', 'Biotechnology and its Applications'], friction: 'Technical methodology logic.' },
    'Human Health & Disease': { domain: 'Pathology', chapters: ['Human Health and Disease', 'Immunity', 'Common Diseases in Humans', 'Cancer', 'AIDS'], friction: 'Pathogen-host interaction logic.' }
  },
  'Chemistry': {
    'Physical Chemistry': { domain: 'Physical', chapters: ['Solid State', 'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'Surface Chemistry', 'Thermodynamics', 'Equilibrium', 'Atomic Structure', 'Mole Concept', 'Redox'], friction: 'Numerical density and conceptual derivation.' },
    'Organic Chemistry': { domain: 'Organic', chapters: ['Haloalkanes', 'Haloarenes', 'Alcohols', 'Phenols', 'Ethers', 'Aldehydes', 'Ketones', 'Carboxylic Acids', 'Amines', 'Biomolecules', 'Polymers', 'General Organic Chemistry', 'Hydrocarbons', 'Isomerism'], friction: 'Reagent path complexity and mechanism logic.' },
    'Inorganic Chemistry': { domain: 'Inorganic', chapters: ['General Principles and Processes of Isolation of Elements', 'p-Block Elements', 'd and f Block Elements', 'Coordination Compounds', 'Periodic Classification', 'Chemical Bonding', 's-Block', 'Hydrogen'], friction: 'Memory density and periodic trends.' }
  },
  'Math': {
    'Relations and Functions': { domain: 'Algebra', chapters: ['Relations and Functions', 'Relation', 'Function', 'Binary Operation', 'Invertible'], friction: 'Abstract mapping logic.' },
    'Inverse Trigonometric Functions': { domain: 'Algebra', chapters: ['Inverse Trigonometric', 'Principle Value', 'ITF'], friction: 'Domain/Range constraints.' },
    'Matrices': { domain: 'Algebra', chapters: ['Matrices', 'Matrix', 'Transpose', 'Symmetric'], friction: 'Linear operations.' },
    'Determinants': { domain: 'Algebra', chapters: ['Determinants', 'Determinant', 'Adjoint', 'Cofactor', 'Minor', 'Inverse'], friction: 'Calculation density.' },
    'Continuity and Differentiability': { domain: 'Calculus', chapters: ['Continuity', 'Differentiability', 'Limit', 'Chain Rule', 'Parametric'], friction: 'Formal definition logic.' },
    'Applications of Derivatives': { domain: 'Calculus', chapters: ['Applications of Derivatives', 'Rate of Change', 'Tangent', 'Normal', 'Maxima', 'Minima', 'Increasing', 'Decreasing'], friction: 'Real-world modeling.' },
    'Integrals': { domain: 'Calculus', chapters: ['Integrals', 'Integral', 'Indefinite', 'Definite', 'Substitution', 'Parts', 'Fundamental Theorem'], friction: 'Highest yield area.' },
    'Applications of Integrals': { domain: 'Calculus', chapters: ['Applications of Integrals', 'Area under Curve', 'Area between Curves'], friction: 'Geometric accumulation.' },
    'Differential Equations': { domain: 'Calculus', chapters: ['Differential Equations', 'Order', 'Degree', 'Variable Separable', 'Linear Differential'], friction: 'Dynamic modeling.' },
    'Vectors': { domain: 'Vectors & 3D', chapters: ['Vectors', 'Vector', 'Dot Product', 'Cross Product', 'Scalar Triple'], friction: 'Geometrical algebra.' },
    'Three Dimensional Geometry': { domain: 'Vectors & 3D', chapters: ['Three Dimensional Geometry', 'Direction Cosines', 'Plane', 'Line', 'Skew', 'Cartesian'], friction: 'Spatial visualization.' },
    'Linear Programming': { domain: 'Linear Programming', chapters: ['Linear Programming', 'LPP', 'Feasible Region', 'Objective Function'], friction: 'Feasibility constraints.' },
    'Probability': { domain: 'Probability', chapters: ['Probability', 'Bayes', 'Conditional', 'Random Variable', 'Binomial'], friction: 'Deep uncertainty logic.' }
  }
};

const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({
  attempt,
  responses,
  questions,
  onReviewQuestions,
  onRetakeTest,
  onBackToDashboard,
  mode = 'results'
}) => {
  const isVaultMode = mode === 'vault';
  const { updateCurrentTest } = useLearningJourney();
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(!attempt.aiReport);
  const [aiError, setAiError] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);

  const examConfig = useMemo(() => attempt.examContext ? getExamConfig(attempt.examContext as any) : null, [attempt.examContext]);
  const isNEET = attempt.examContext === 'NEET';

  // selectedOption from DB is null (not undefined) when skipped — null !== undefined is TRUE which is wrong
  // Use this helper everywhere to treat both null and undefined as "not answered"
  const isAnswered = (opt: number | null | undefined): opt is number => opt !== null && opt !== undefined;

  // Metrics Calculation
  const metrics = useMemo(() => {
    let correct = 0, incorrect = 0, skipped = 0, marks = 0, totalMarks = 0;

    if (isNEET && examConfig?.pattern?.sections) {
      const subjectSections = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
      const sectionedFound = questions.some(q => q.section === 'Section A' || q.section === 'Section B');

      if (sectionedFound) {
        subjectSections.forEach(subject => {
          const sA = questions.filter(q => q.subject === subject && q.section === 'Section A');
          sA.forEach(q => {
            const r = responses.find(res => res.questionId === q.id);
            totalMarks += 4;
            if (r && isAnswered(r.selectedOption)) { if (r.isCorrect) { correct++; marks += 4; } else { incorrect++; marks -= 1; } }
            else skipped++;
          });
          const sB = questions.filter(q => q.subject === subject && q.section === 'Section B');
          let attB = 0;
          sB.forEach(q => {
            const r = responses.find(res => res.questionId === q.id);
            if (r && isAnswered(r.selectedOption) && attB < 10) {
              attB++; if (r.isCorrect) { correct++; marks += 4; } else { incorrect++; marks -= 1; }
            } else skipped++;
          });
          // SecB max: real NEET = 10 countable, custom tests may have fewer SecB questions
          totalMarks += Math.min(sB.length, 10) * 4;
        });
      } else {
        // NEET questions without section tags — score all at 4 marks each
        questions.forEach(q => {
          const r = responses.find(res => res.questionId === q.id);
          totalMarks += 4;
          if (r) { if (r.isCorrect) { correct++; marks += 4; } else if (isAnswered(r.selectedOption)) { incorrect++; marks -= 1; } else skipped++; }
          else skipped++;
        });
      }
    } else {
      // KCET / JEE / CBSE — exam-agnostic scoring
      correct = responses.filter(r => r.isCorrect).length;
      incorrect = responses.filter(r => !r.isCorrect && isAnswered(r.selectedOption)).length;
      skipped = questions.length - (correct + incorrect);
      const mPerQ = examConfig?.pattern?.marksPerQuestion || 1;
      const hNeg = examConfig?.pattern?.negativeMarking || false;
      const nVal = examConfig?.pattern?.negativeMarkingValue || 0;
      responses.forEach(r => {
        totalMarks += mPerQ;
        if (r.isCorrect) marks += mPerQ; else if (isAnswered(r.selectedOption) && hNeg) marks += nVal;
      });
    }
    const perc = totalMarks > 0 ? Math.round((Math.max(0, marks) / totalMarks) * 100) : 0;
    return { correct, incorrect, skipped, marks, totalMarks, percentage: perc };
  }, [questions, responses, isNEET, examConfig]);

  // NEET per-subject Section A / Section B breakdown for the results table
  const neetSectionBreakdown = useMemo(() => {
    if (!isNEET) return [];
    const sectionedFound = questions.some(q => q.section === 'Section A' || q.section === 'Section B');
    if (!sectionedFound) return [];
    return ['Physics', 'Chemistry', 'Botany', 'Zoology'].map(subject => {
      const sAQs = questions.filter(q => q.subject === subject && q.section === 'Section A');
      let aCorrect = 0, aIncorrect = 0, aMarks = 0;
      sAQs.forEach(q => {
        const r = responses.find(res => res.questionId === q.id);
        if (r && isAnswered(r.selectedOption)) {
          if (r.isCorrect) { aCorrect++; aMarks += 4; } else { aIncorrect++; aMarks -= 1; }
        }
      });
      const sBQs = questions.filter(q => q.subject === subject && q.section === 'Section B');
      let bAttempted = 0, bCorrect = 0, bIncorrect = 0, bMarks = 0;
      sBQs.forEach(q => {
        const r = responses.find(res => res.questionId === q.id);
        if (r && isAnswered(r.selectedOption) && bAttempted < 10) {
          bAttempted++;
          if (r.isCorrect) { bCorrect++; bMarks += 4; } else { bIncorrect++; bMarks -= 1; }
        }
      });
      const subjectMarks = aMarks + bMarks;
      const subjectMaxMarks = sAQs.length * 4 + Math.min(sBQs.length, 10) * 4;
      return { subject, sA: { total: sAQs.length, correct: aCorrect, incorrect: aIncorrect, marks: aMarks }, sB: { total: sBQs.length, attempted: bAttempted, correct: bCorrect, incorrect: bIncorrect, marks: bMarks }, subjectMarks, subjectMaxMarks };
    }).filter(s => s.sA.total > 0 || s.sB.total > 0);
  }, [questions, responses, isNEET]);

  // For compatibility with rest of the code that uses top-level variables
  const totalQuestions = questions.length;
  const correctAnswers = metrics.correct;
  const incorrectAnswers = metrics.incorrect;
  const skippedAnswers = metrics.skipped;
  const percentage = metrics.percentage;

  // Time analysis
  const totalTime = responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
  const avgTimePerQuestion = totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0;

  // Topic breakdown
  const topicStats = new Map<string, { correct: number; total: number }>();
  responses.forEach(r => {
    const stats = topicStats.get(r.topic) || { correct: 0, total: 0 };
    stats.total++;
    if (r.isCorrect) stats.correct++;
    topicStats.set(r.topic, stats);
  });

  // Difficulty breakdown — robust normalization
  const difficultyStats = {
    Easy: { correct: 0, total: 0 },
    Moderate: { correct: 0, total: 0 },
    Hard: { correct: 0, total: 0 }
  };

  const normalizeDifficulty = (raw: string): 'Easy' | 'Moderate' | 'Hard' => {
    const d = (raw || 'Easy').toLowerCase();
    if (d.includes('har')) return 'Hard';
    if (d.includes('mod') || d.includes('med')) return 'Moderate';
    return 'Easy';
  };

  if (isVaultMode && responses.length === 0) {
    questions.forEach(q => {
      const diff = normalizeDifficulty(q.difficulty || '');
      difficultyStats[diff].total++;
    });
  } else {
    responses.forEach(r => {
      const diff = normalizeDifficulty(r.difficulty || '');
      difficultyStats[diff].total++;
      if (r.isCorrect) difficultyStats[diff].correct++;
    });
  }

  // Strategic Analysis Matrix Data (Aggregated Domains Logic)
  const aggregatedDomains = React.useMemo(() => {
    if (!isVaultMode) return [];

    const subRaw = attempt.subject?.trim() || '';
    const subLower = subRaw.toLowerCase();

    // Fuzzy match for subject map
    const currentMap = SUBJECT_DOMAIN_MAPS[subRaw] ||
      (subLower.includes('math') ? SUBJECT_DOMAIN_MAPS['Math'] : null) ||
      (subLower.includes('physic') ? SUBJECT_DOMAIN_MAPS['Physics'] : null) ||
      (subLower.includes('chem') ? SUBJECT_DOMAIN_MAPS['Chemistry'] : null) ||
      (subLower.includes('biol') ? SUBJECT_DOMAIN_MAPS['Biology'] : null) ||
      SUBJECT_DOMAIN_MAPS['Math']; // Fallback to Math for KCET if others fail

    // 1. Assign each question to exactly ONE domain
    const mappedQuestions = questions.map(q => {
      const qData = q as any;
      const rawTopic = q.topic || qData.chapter || '';
      const topic = rawTopic.toLowerCase().trim();
      let matchedKey = 'General';
      let maxMatchScore = 0;

      const isGeneric = !topic || topic.length < 3 ||
        topic === 'general' || topic === 'mathematics' ||
        topic === 'math' || topic === 'physics' ||
        topic === 'chemistry' || topic === 'biology' ||
        /^q\d+$/i.test(topic) || /^question\s*\d+$/i.test(topic);

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
      return { ...q, mappedKey: maxMatchScore > 0 ? matchedKey : 'General' };
    });

    // 2. Aggregate metrics by domain
    const domainsFound: Record<string, any> = {};
    mappedQuestions.forEach(q => {
      const matchedKey = q.mappedKey;
      let dName = matchedKey === 'General' ? 'Core Foundations' : matchedKey;
      let friction = 'Fundamental conceptually intensive chapter.';

      if (matchedKey !== 'General') {
        const info = currentMap[matchedKey];
        dName = matchedKey;
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

    // 3. Finalize
    const processedDomains = Object.values(domainsFound).map((domain: any) => {
      const avgDifficulty = domain.avgDifficultySum / domain.catQuestions.length;
      const dominantBlooms = Object.entries(domain.bloomsDist).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'Apply';
      return {
        name: domain.name,
        chapters: Array.from(domain.chapters),
        totalMarks: domain.totalMarks,
        questionCount: domain.catQuestions.length,
        avgDifficulty,
        difficultyDNA: avgDifficulty >= 2.4 ? 'Hard' : avgDifficulty >= 1.7 ? 'Moderate' : 'Easy',
        dominantBlooms,
        bloomsDist: domain.bloomsDist
      };
    });

    // 4. Global Blooms DNA
    const globalBlooms: Record<string, number> = {};
    questions.forEach(q => {
      if (q.blooms) {
        let b = q.blooms.trim();
        if (b.toLowerCase().includes('remember')) b = 'Remember';
        else if (b.toLowerCase().includes('underst')) b = 'Understand';
        else if (b.toLowerCase().includes('appl')) b = 'Apply';
        else if (b.toLowerCase().includes('anal')) b = 'Analyze';
        else if (b.toLowerCase().includes('evalu')) b = 'Evaluate';
        else if (b.toLowerCase().includes('creat')) b = 'Create';
        globalBlooms[b] = (globalBlooms[b] || 0) + 1;
      }
    });

    return { domains: processedDomains, globalBlooms };
  }, [questions, attempt.subject, isVaultMode]);

  const aggregatedDomainsList = (aggregatedDomains as any).domains || [];
  const globalBloomsDist = (aggregatedDomains as any).globalBlooms || {};
  // Weak/strong topics
  const topicArray = Array.from(topicStats.entries()).map(([topic, stats]) => ({
    topic,
    accuracy: Math.round((stats.correct / stats.total) * 100),
    correct: stats.correct,
    total: stats.total
  }));
  const weakTopics = topicArray.filter(t => t.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  const strongTopics = topicArray.filter(t => t.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);

  // Performance label
  const getPerformance = () => {
    if (percentage >= 90) return { label: 'Excellent', color: 'emerald', bg: 'from-emerald-500 to-emerald-600' };
    if (percentage >= 75) return { label: 'Good', color: 'lime', bg: 'from-lime-500 to-lime-600' };
    if (percentage >= 60) return { label: 'Average', color: 'yellow', bg: 'from-yellow-500 to-yellow-600' };
    if (percentage >= 40) return { label: 'Below Avg', color: 'orange', bg: 'from-orange-500 to-orange-600' };
    return { label: 'Needs Work', color: 'red', bg: 'from-red-500 to-red-600' };
  };
  const performance = getPerformance();

  // ── PREPARE DETAILED PERFORMANCE DATA (Shadcn ScreenTime Pattern) ──
  const detailedPerformanceData = useMemo(() => {
    // 1. Time Series Bar Data: Bin questions into 20 segments to show time trend
    const bucketCount = 20;
    const bins = new Array(bucketCount).fill(0);
    if (responses.length > 0) {
      const qPerBucket = Math.max(1, Math.ceil(responses.length / bucketCount));
      responses.forEach((r, idx) => {
        const binIdx = Math.min(bucketCount - 1, Math.floor(idx / qPerBucket));
        bins[binIdx] += (r.timeSpent || 0);
      });
    }

    // 2. Top Topics Performance (List on the right)
    const sortedTopics = [...topicArray].sort((a, b) => b.accuracy - a.accuracy);
    const topPerformers = sortedTopics.slice(0, 3).map(t => ({
      icon: t.accuracy >= 80 ? <ShieldCheck size={14} className="text-emerald-400" /> : <Shield size={14} className="text-indigo-400" />,
      name: t.topic,
      duration: `${t.correct}/${t.total} Correct`,
      accuracy: t.accuracy
    }));

    return {
      totalTimeMinutes: Math.floor(totalTime / 60),
      totalTimeSeconds: totalTime % 60,
      bins,
      topPerformers
    };
  }, [responses, totalTime, topicArray]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const fetchAISummary = async (signal?: AbortSignal) => {
    const isSimplifiedVerdict = attempt.aiReport?.verdict?.toLowerCase().includes('simplified mode') ||
      attempt.aiReport?.verdict?.toLowerCase().includes('extracted using');

    // Check if AI report already exists in attempt and is sufficient
    // For vault mode, we require the full blueprint (paperStats) to be present
    const isMissingFullBlueprint = isVaultMode && !attempt.aiReport?.paperStats;

    if (attempt.aiReport && typeof attempt.aiReport === 'object' && !isSimplifiedVerdict && !isMissingFullBlueprint) {
      setAiSummary(attempt.aiReport as AISummary);
      setIsLoadingAI(false);
      return;
    }

    setIsLoadingAI(true);
    setAiError(false);
    setAiSummary(null);
    try {
      const topicStatsObj: Record<string, { correct: number; total: number; accuracy: number }> = {};
      topicStats.forEach((stats, topic) => {
        topicStatsObj[topic] = {
          ...stats,
          accuracy: Math.round((stats.correct / stats.total) * 100)
        };
      });

      const diffStatsObj: Record<string, { correct: number; total: number }> = {};
      Object.entries(difficultyStats).forEach(([d, s]) => {
        diffStatsObj[d] = s;
      });

      const url = getApiUrl('/api/learning-journey/ai-summary');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(url, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          attemptId: attempt.id,
          subject: attempt.subject,
          examContext: attempt.examContext,
          testName: attempt.testName,
          percentage,
          correctAnswers,
          incorrectAnswers,
          skippedAnswers,
          totalQuestions,
          topicStats: topicStatsObj,
          difficultyStats: diffStatsObj,
          bloomStats: globalBloomsDist, // CRITICAL: Provide Cognitive mapping for accurate AI analytics
          avgTimePerQuestion,
          totalTimeSeconds: totalTime,
          isBlueprint: isVaultMode, // Explicit flag for blueprint analysis
          mode: isVaultMode ? 'blueprint' : 'results',
          // If vault mode, don't emphasize results as much to the AI
          performanceFocus: isVaultMode ? 'blueprint' : 'student_results',
          customContext: isVaultMode
            ? `Use simple, encouraging, and clear language for a high school student. 
               CRITICAL: Always return your analysis as a set of clear, actionable bullet points (using • symbols). 
               Break long paragraphs into multiple short, high-density points. Ensure points are vertically separated.
               This is an official ${attempt.subject} paper analysis for year ${attempt.testName}. Focus on paper blueprint, weightage, and global strategy patterns rather than individual performance. Ensure consistency between stats like 'entropyScore' and high-level verdict description.`
            : `Use simple, clear, and actionable feedback for the student. 
               CRITICAL: Break your advice into clear, concise bullet points (using • symbols) to make it easy to scan. Focus on showing them exactly where they can improve using encouraging language.`
        })
      });

      if (signal?.aborted) return;
      if (response.ok) {
        const result = await response.json();
        if (signal?.aborted) return;
        if (result.success && result.data) {
          setAiSummary(result.data);
          // Sync back to context so it persists on navigation
          updateCurrentTest({ aiReport: result.data });
        } else {
          setAiError(true);
        }
      } else {
        setAiError(true);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // Strict Mode test-invoke cancelled — ignore
      setAiError(true);
    } finally {
      if (!signal?.aborted) setIsLoadingAI(false);
    }
  };

  // Helper to parse text into an array of points
  const parsePoints = (text: string) => {
    if (!text) return [];

    // 1. Remove common headers like "ARCHIVE STRATEGY:" or "PREP STRATEGY:"
    const cleanText = text.replace(/^[A-Z\s]+STRATEGY:\s*/i, '');

    // 2. Split by bullets or numbers (1. or 1))
    // We look for numbers even if they aren't at the start of a line
    const points = cleanText.split(/•|\n•|(?:\s\d+[\.\)])|(?:\n\d+[\.\)])|(?:\d+[\.\)])/)
      .map(p => p.trim())
      .filter(p => p.length > 5); // Filter out very short artifacts

    // If no points found after splitting, return the original (cleaned) text
    return points.length > 0 ? points : [cleanText.trim()];
  };

  // Modern Point Component
  const AnalysisPoint = ({ text, colorClass = 'bg-primary-400', isDark = false, index = 0 }: { text: string, colorClass?: string, isDark?: boolean, index?: number }) => (
    <div
      className="flex gap-5 items-start group/point animate-in fade-in slide-in-from-left-4 fill-mode-both duration-700"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className={`mt-1 w-7 h-7 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border flex items-center justify-center shrink-0 shadow-sm group-hover/point:scale-110 group-hover/point:border-current transition-all duration-300`}>
        <div className={`w-1.5 h-1.5 rounded-full ${colorClass} shadow-[0_0_12px] shadow-current animate-pulse`} />
      </div>
      <div className={`flex-1 text-[16px] leading-[1.7] ${isDark ? 'text-slate-200' : 'text-slate-600'} font-medium`}>
        <RenderWithMath text={text} showOptions={false} dark={isDark} />
      </div>
    </div>
  );

  // Fetch AI summary on mount — AbortController cancels the Strict Mode test-invoke
  useEffect(() => {
    const controller = new AbortController();
    fetchAISummary(controller.signal);
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen lg:h-screen bg-slate-50 font-instrument flex flex-col overflow-y-auto lg:overflow-hidden">
      {/* 1. Header Area */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm shrink-0">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('openMobileMenu'))}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition md:hidden"
              >
                <Menu size={16} />
              </button>
              <button
                onClick={onBackToDashboard}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h1 className="font-black text-xl tracking-tight text-slate-950 font-outfit leading-none">
                  {isVaultMode ? 'Past Year Paper Analysis' : attempt.testName || 'Mock Test Results'}
                </h1>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                  {isVaultMode
                    ? attempt.testName
                    : `${attempt.subject} • ${attempt.examContext} • ${new Date(attempt.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  }
                </p>
                {/* Category Badge */}
                {(attempt.testConfig?.strategyMode || attempt.testType === 'custom_mock') && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {(attempt.testConfig?.strategyMode === 'predictive_mock') && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-widest shadow-sm">
                          <ShieldCheck size={10} />
                          Real Exam Type
                        </div>
                    )}
                    {(attempt.testConfig?.strategyMode === 'hybrid' || (!attempt.testConfig?.strategyMode && (attempt.testType === 'custom_mock' || !attempt.testType))) && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-widest shadow-sm">
                          <Zap size={10} />
                          Smart Mix
                        </div>
                    )}
                    {attempt.testConfig?.strategyMode === 'adaptive_growth' && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-widest shadow-sm">
                          <Target size={10} />
                          Fix Weak Spots
                        </div>
                    )}
                    {attempt.testConfig?.oracleMode?.enabled && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 uppercase tracking-widest shadow-sm">
                          <Sparkles size={10} />
                          Peak Simulation
                        </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Premium Results Dashboard */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-8 py-1.5 lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3 lg:h-full">

          {/* LEFT COLUMN: Hero Score & Actions */}
          <div className="flex flex-col gap-2.5 lg:h-full lg:overflow-y-auto lg:pr-1 lg:pb-3 custom-scrollbar lg:sticky lg:top-0">

            {/* Score & Analytics Engine Box */}
            <div className="bg-slate-950 rounded-[1.5rem] p-3.5 border border-white/5 shadow-2xl relative overflow-hidden shrink-0">
              <div className={`absolute top-0 right-0 w-64 h-64 blur-[120px] rounded-full -mr-32 -mt-32 transition-all duration-1000 ${isVaultMode ? 'bg-indigo-500/20' : (percentage >= 75 ? 'bg-emerald-500/30' : percentage >= 50 ? 'bg-amber-500/20' : 'bg-rose-500/20')
                }`} />
              <div className="relative z-10 text-center pb-2.5 border-b border-white/5">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-2">
                  {isVaultMode ? <FileText size={12} className="text-primary-400" /> : <Activity size={12} className="text-primary-400" />}
                  <span className="text-xs font-black uppercase tracking-[0.2em]">{isVaultMode ? 'Paper Blueprint' : 'Final Score'}</span>
                </div>
                <div className="text-6xl font-black text-white font-outfit leading-none tracking-tighter">
                  {isVaultMode ? totalQuestions : percentage}<span className="text-xl text-white/30 ml-1">{isVaultMode ? 'Q' : '%'}</span>
                </div>
                {/* Total marks display — critical for NEET (shows e.g. 360/720) */}
                {!isVaultMode && metrics.totalMarks > 0 && (
                  <div className="mt-1.5 text-sm font-black tracking-tight font-outfit">
                    <span className={metrics.marks < 0 ? 'text-rose-400' : 'text-white/50'}>
                      {metrics.marks}
                    </span>
                    <span className="text-white/25">/{metrics.totalMarks}</span>
                    <span className="text-xs text-white/30 ml-1.5 font-bold">marks</span>
                  </div>
                )}
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mt-2.5 border ${isVaultMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : (percentage >= 75 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  percentage >= 50 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    'bg-rose-500/10 border-rose-500/20 text-rose-400')
                  }`}>
                  <Sparkles size={12} />
                  {isVaultMode ? 'Official Paper' : performance.label}
                </div>
              </div>

              {/* Paper Stats / DNA Split */}
              <div className="relative z-10 pt-2.5 space-y-2.5">
                {isVaultMode ? (
                  <>
                    {/* Cognitive DNA Section (Condensed inside sidebar) */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 shadow-inner">
                      <h5 className="text-xs font-black text-slate-100 uppercase tracking-[0.2em] mb-3.5 flex items-center gap-2">
                        <Brain size={14} className="text-indigo-400" /> Skill Analysis
                      </h5>
                      <div className="space-y-3.5">
                        {Object.entries(globalBloomsDist).map(([level, count]: [any, any]) => {
                          const percent = Math.round((count / totalQuestions) * 100);
                          const colors: Record<string, string> = {
                            Remember: 'bg-sky-400', Understand: 'bg-emerald-400', Apply: 'bg-indigo-400',
                            Analyze: 'bg-orange-400', Evaluate: 'bg-rose-400', Create: 'bg-fuchsia-400'
                          };
                          return (
                            <div key={level} className="space-y-2">
                              <div className="flex justify-between items-center text-xs font-black tracking-tight">
                                <span className="text-slate-200">{level}</span>
                                <span className="text-white text-base">{percent}%</span>
                              </div>
                              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${colors[level] || 'bg-slate-400'} transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Difficulty Summary Section (Condensed inside sidebar) */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 shadow-inner">
                      <h5 className="text-xs font-black text-slate-100 uppercase tracking-[0.2em] mb-3.5 flex items-center gap-2">
                        <Signal size={14} className="text-rose-400" /> Paper Difficulty
                      </h5>
                      <div className="grid grid-cols-3 gap-1.5">
                        {Object.entries(difficultyStats).map(([diff, stats]) => {
                          const distribution = totalQuestions > 0 ? Math.round((stats.total / totalQuestions) * 100) : 0;
                          const colors = {
                            Easy: 'bg-emerald-400',
                            Moderate: 'bg-orange-400',
                            Hard: 'bg-rose-400'
                          }[diff as 'Easy' | 'Moderate' | 'Hard'];
                          return (
                            <div key={diff} className="flex flex-col gap-1.5 bg-white/5 p-2 rounded-2xl border border-white/10 items-center">
                              <span className="text-[11px] font-black text-slate-200 uppercase tracking-widest">{diff}</span>
                              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full ${colors} transition-all duration-700`} style={{ width: `${distribution}%` }} />
                              </div>
                              <span className="text-base font-black text-white font-outfit">{distribution}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col items-center p-3 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <CheckCircle2 size={16} className="text-emerald-400 mb-2" />
                        <span className="text-xl font-black text-white">{correctAnswers}</span>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">Correct</span>
                      </div>
                      <div className="flex flex-col items-center p-3 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <XCircle size={16} className="text-rose-400 mb-2" />
                        <span className="text-xl font-black text-white">{incorrectAnswers}</span>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">Incorrect</span>
                      </div>
                      <div className="flex flex-col items-center p-3 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors opacity-60">
                        <MinusCircle size={16} className="text-slate-400 mb-2" />
                        <span className="text-xl font-black text-white">{skippedAnswers}</span>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">Skipped</span>
                      </div>
                    </div>
                    {/* Time Metrics (Only for Results Mode) */}
                    <div className="relative z-10 mt-4 rounded-2xl bg-white/5 p-4 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary-500/20 flex items-center justify-center text-primary-400">
                          <Clock size={18} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Time Taken</span>
                          <span className="text-sm font-black text-white leading-none tracking-tight">{formatTime(totalTime)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Speed (sec/q)</span>
                        <span className="text-sm font-black text-white leading-none tracking-tight">{avgTimePerQuestion + 's'}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Action Dock */}
            <div className="flex flex-col gap-3 shrink-0">
              <button
                onClick={onReviewQuestions}
                className="w-full flex items-center justify-between px-5 py-5 bg-gradient-to-br from-indigo-600 to-primary-600 hover:from-indigo-500 hover:to-primary-500 rounded-[1.75rem] transition-all shadow-xl shadow-indigo-500/25 group active:scale-[0.97] relative overflow-hidden"
              >
                {/* Animated Background Shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />

                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg backdrop-blur-md">
                    <BookOpen size={22} className="stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="block text-base font-black text-white tracking-tight">{isVaultMode ? 'View Detailed Solution' : 'Review Results'}</span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 border border-white/20 animate-pulse">
                        <Sparkles size={8} className="text-white" />
                        <span className="text-[7px] font-black text-white uppercase tracking-[0.2em]">Live</span>
                      </div>
                    </div>
                    <span className="block text-[11px] font-bold text-white/70 uppercase tracking-widest leading-none">{isVaultMode ? 'Step-by-step concepts' : 'Analyze your errors'}</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1.5 transition-all text-white">
                  <ArrowRight size={18} />
                </div>
              </button>

              {!isVaultMode && (
                <button
                  onClick={onRetakeTest}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all shadow-sm group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center group-hover:rotate-12 transition-transform shadow-sm">
                      <Zap size={18} className="stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-black text-slate-800 tracking-tight">Retake Test</span>
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Start Fresh</span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-900 transition-all" />
                </button>
              )}
            </div>

            {/* Matrix Splits */}
            <div className="flex flex-col gap-4">

              {/* Topic Performance List (Mock Test Only) */}
              {!isVaultMode && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 font-outfit mb-4 flex items-center gap-2">
                    <BookOpen size={16} className="text-slate-400" /> Topic Breakdown
                  </h3>
                  <div className="space-y-4">
                    {topicArray.length === 0 ? <span className="text-xs text-slate-400">Empty logic</span> :
                      topicArray.sort((a, b) => b.total - a.total).map(t => {
                        const share = totalQuestions > 0 ? Math.round((t.total / totalQuestions) * 100) : 0;
                        return (
                          <div key={t.topic}>
                            <div className="flex justify-between items-end mb-1">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-slate-700 truncate w-2/3">{t.topic}</span>
                              </div>
                              <span className={`text-xs font-black ${t.accuracy >= 75 ? 'text-emerald-500' : t.accuracy >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                {`${t.accuracy}%`}
                              </span>
                            </div>
                            <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${t.accuracy >= 75 ? 'bg-emerald-500' : t.accuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'} rounded-full shadow-[0_0_8px_rgba(129,140,248,0.2)]`}
                                style={{ width: `${t.accuracy}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              )}


              {/* Note: Topic Breakdown and other splits below are conditionally rendered based on mode */}

              {/* Difficulty Summary (Mock Test Only) */}
              {!isVaultMode && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 font-outfit mb-4 flex items-center gap-2">
                    <Signal size={16} className="text-slate-400" /> Difficulty Summary
                  </h3>
                  <div className="flex flex-col gap-3">
                    {Object.entries(difficultyStats).map(([diff, stats]) => {
                      const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                      const colors = {
                        Easy: { ring: 'border-emerald-200 bg-emerald-50/30 text-emerald-700', fill: 'bg-emerald-500' },
                        Moderate: { ring: 'border-amber-200 bg-amber-50/30 text-amber-700', fill: 'bg-amber-500' },
                        Hard: { ring: 'border-rose-200 bg-rose-50/30 text-rose-700', fill: 'bg-rose-500' }
                      }[diff as 'Easy' | 'Moderate' | 'Hard'];

                      return (
                        <div key={diff} className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className={`px-2 py-0.5 rounded border ${colors.ring}`}>{diff}</span>
                            <span>{acc}% Accuracy</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors.fill} transition-all duration-1000`}
                              style={{ width: `${acc}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* RIGHT COLUMN: Studio Breakdown */}
          <div className="flex flex-col gap-2.5 lg:h-full lg:overflow-y-auto lg:pr-1 lg:pb-3 custom-scrollbar">

            {/* NEET Section A / B Breakdown Table */}
            {isNEET && !isVaultMode && neetSectionBreakdown.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm shrink-0">
                <h3 className="text-sm font-black text-slate-900 font-outfit mb-3 flex items-center gap-2">
                  <TableIcon size={15} className="text-slate-400" /> Subject × Section Breakdown
                  <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sec A: 35Q · Sec B: 10/15Q</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 pr-3 font-black text-slate-500 uppercase tracking-wider text-[10px]">Subject</th>
                        <th className="text-center py-2 px-2 font-black text-indigo-500 uppercase tracking-wider text-[10px]">Sec A (35)</th>
                        <th className="text-center py-2 px-2 font-black text-violet-500 uppercase tracking-wider text-[10px]">Sec B (10↑)</th>
                        <th className="text-center py-2 pl-2 font-black text-slate-500 uppercase tracking-wider text-[10px]">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {neetSectionBreakdown.map(s => (
                        <tr key={s.subject} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 pr-3">
                            <span className="font-black text-slate-800 text-[11px]">{s.subject.substring(0, 4).toUpperCase()}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-emerald-600 font-black">{s.sA.correct}</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-slate-500 font-bold">{s.sA.total}</span>
                              {s.sA.incorrect > 0 && <span className="text-rose-400 font-bold text-[9px] ml-1">-{s.sA.incorrect}</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-emerald-600 font-black">{s.sB.correct}</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-slate-500 font-bold">{s.sB.attempted}</span>
                              {s.sB.incorrect > 0 && <span className="text-rose-400 font-bold text-[9px] ml-1">-{s.sB.incorrect}</span>}
                              <span className="text-slate-300 text-[9px] ml-0.5">of {s.sB.total}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pl-2 text-center">
                            <span className={`font-black text-sm ${s.subjectMarks < 0 ? 'text-rose-600' : s.subjectMarks >= s.subjectMaxMarks * 0.75 ? 'text-emerald-600' : s.subjectMarks >= s.subjectMaxMarks * 0.5 ? 'text-amber-600' : 'text-rose-500'}`}>
                              {s.subjectMarks}
                            </span>
                            <span className="text-slate-400 font-bold text-[10px]">/{s.subjectMaxMarks}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td colSpan={3} className="pt-2.5 pr-3 font-black text-slate-700 text-[11px] uppercase tracking-wider">Total Score</td>
                        <td className="pt-2.5 pl-2 text-center">
                          <span className={`font-black text-base ${metrics.marks < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{metrics.marks}</span>
                          <span className="text-slate-400 font-bold text-[10px]">/{metrics.totalMarks}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Detailed Analytics Logic (BoardMaster Mastery Dashboard) */}
            {!isVaultMode && responses.length > 0 && (
              <div className="mb-6 shrink-0">
                <DetailedTestCard
                  title="Session Intelligence"
                  mainMetric={{
                    label: "Accuracy",
                    value: `${percentage}%`,
                    icon: <Target size={14} className="text-white" />,
                    color: percentage >= 75 ? "bg-emerald-500 text-emerald-500" : percentage >= 50 ? "bg-indigo-500 text-indigo-500" : "bg-rose-500 text-rose-500"
                  }}
                  stats={[
                    { label: "Questions", value: `${correctAnswers}/${questions.length}`, icon: <ShieldCheck size={14} className="text-indigo-400" />, color: "bg-indigo-400 text-indigo-400" },
                    { label: "Time Taken", value: formatTime(totalTime), icon: <Clock size={14} className="text-amber-400" />, color: "bg-amber-400 text-amber-400" },
                    { label: "Avg Speed", value: `${avgTimePerQuestion}s/q`, icon: <Zap size={14} className="text-purple-400" />, color: "bg-purple-400 text-purple-400" }
                  ]}
                  history={detailedPerformanceData.bins}
                  historyLabel="Energy & Confidence Index over test duration"
                  breakdown={topicArray.slice(0, 4).map(t => ({
                    label: t.topic,
                    value: t.accuracy,
                    icon: <Activity size={12} className="text-white" />,
                    color: t.accuracy >= 75 ? "bg-emerald-500 text-emerald-500" : t.accuracy >= 50 ? "bg-indigo-500 text-indigo-500" : "bg-rose-500 text-rose-500"
                  }))}
                  breakdownLabel="Internal Knowledge Matrix"
                  observation={aiSummary?.verdict?.split('.')[0] || "Your performance metadata is being indexed for strategic guidance..."}
                  className="max-w-none shadow-2xl"
                />
              </div>
            )}

            {/* AI Mastermind Box */}
            <div className="bg-white border-2 border-slate-100 rounded-3xl p-3.5 md:p-4 shadow-md relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 blur-[120px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
                      <Sparkles size={20} className="text-white animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 font-outfit tracking-tight">{isVaultMode ? 'Paper Intelligence' : 'AI Learning Report'}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isVaultMode ? 'Subject Specialist Insights' : 'AI Analysis Engine'}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchAISummary()}
                    disabled={isLoadingAI}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-700 transition-all active:scale-95 shadow-sm"
                  >
                    {isLoadingAI ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                    Refresh
                  </button>
                </div>

                {isLoadingAI ? (
                  <div className="py-10 flex flex-col items-center text-center animate-in zoom-in duration-500">
                    <div className="relative w-16 h-16 mb-6">
                      <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping" />
                      <div className="relative w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg border border-white/10">
                        <Brain size={32} className="text-primary-400 animate-pulse" />
                      </div>
                    </div>
                    <h4 className="text-base font-black text-slate-900 font-outfit mb-1">Creating Your Performance Report</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Finding exactly where you can improve next...</p>
                  </div>
                ) : aiError ? (
                  <div className="py-10 text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle size={24} className="text-rose-400" />
                    </div>
                    <span className="text-sm font-black text-slate-900 font-outfit">Analysis Offline</span>
                  </div>
                ) : aiSummary && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group">
                      <div className="absolute -top-3 left-4 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                        {isVaultMode ? 'Strategic Verdict' : 'Diagnostic Verdict'}
                      </div>
                      <div className="text-base font-serif italic text-slate-800 leading-relaxed">
                        <RenderWithMath text={aiSummary.verdict} showOptions={false} serif={true} />
                      </div>
                    </div>

                    {/* Strategic Analysis Matrix for Vault Mode */}
                    {isVaultMode && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-md">
                              <Workflow size={16} />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-900 font-outfit uppercase tracking-tight">Syllabus Overview</h3>
                            </div>
                          </div>
                        </div>

                        {/* Consolidated Syllabus Section (Radar + Deep Dives) */}
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                          {/* Difficulty Radar Chart and Modal Trigger */}
                          <div className="bg-white border border-slate-100 rounded-3xl p-3.5 shadow-sm relative overflow-hidden flex flex-col items-center">
                            <h4 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 self-start">
                              <Signal size={14} className="text-indigo-500" /> Syllabus Radar
                            </h4>
                            <p className="text-xs text-slate-500 font-bold self-start mb-3 w-full leading-tight">
                              <span className="text-indigo-600 font-black">Weightage</span> vs <span className="text-rose-500 font-black">IQ Load</span>
                            </p>
                            <div className="w-full h-[210px] relative z-10 mb-3">
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={(aggregatedDomainsList as any[]).map((d: any) => {
                                  const abbreviations: Record<string, string> = {
                                    'Three Dimensional Geometry': '3D Geometry',
                                    'Differential Equations': 'Diff. Eqs',
                                    'Applications of Derivatives': 'App. Derivs',
                                    'Continuity and Differentiability': 'Calculus base',
                                    'Relations and Functions': 'Relations',
                                    'Inverse Trigonometric Functions': 'Inv. Trigo',
                                    'Applications of Integrals': 'App. Integrals',
                                    'Linear Programming': 'LPP',
                                    'Probability': 'Probability',
                                    'Matrices': 'Matrices',
                                    'Determinants': 'Determinants',
                                    'Vectors': 'Vectors',
                                    'Integrals': 'Integrals',
                                  };
                                  let shortName = abbreviations[d.name] || d.name;
                                  if (shortName.length > 15) shortName = shortName.substring(0, 13) + '..';

                                  return {
                                    subject: shortName,
                                    'Weightage (Qs)': d.questionCount,
                                    'IQ Load': Math.round(Math.pow(d.avgDifficulty, 2) * 1.5),
                                    fullMark: 20,
                                  };
                                })}>
                                  <defs>
                                    <linearGradient id="colorRadar" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="colorDifficulty" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6} />
                                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                                    </linearGradient>
                                  </defs>
                                  <PolarGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#334155', fontSize: 11, fontWeight: 900 }} />
                                  <Tooltip wrapperClassName="text-xs font-black rounded-xl p-2 shadow-xl border-none" />
                                  <Radar name="Weight" dataKey="Weightage (Qs)" stroke="#4f46e5" strokeWidth={3} fill="url(#colorRadar)" fillOpacity={1} />
                                  <Radar name="IQ" dataKey="IQ Load" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" fill="url(#colorDifficulty)" fillOpacity={1} />
                                </RadarChart>
                              </ResponsiveContainer>
                            </div>
                            <button
                              onClick={() => setShowSyllabusModal(true)}
                              className="w-full py-3 rounded-full bg-indigo-50 hover:bg-slate-900 text-indigo-600 hover:text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-100"
                            >
                              <TableIcon size={14} /> Full Distribution
                            </button>
                          </div>

                          {/* Plus2AI Unique Deep Dives (Vertical Stack) */}
                          <div className="flex flex-col gap-3">
                            <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm group">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                                  <Brain size={16} />
                                </div>
                                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Brain Power</h5>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900 tracking-tighter">{aiSummary?.paperStats?.cognitiveLoad || '78'}</span>
                                <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest">{aiSummary?.paperStats?.cognitiveLabel || 'High Focus'}</span>
                              </div>
                            </div>

                            <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 shadow-xl group">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                  <Workflow size={16} />
                                </div>
                                <h5 className="text-[10px] font-black text-white/50 uppercase tracking-widest">Synergy</h5>
                              </div>
                              <div className="text-sm font-black text-white font-outfit truncate">
                                {aiSummary?.paperStats?.topicSynergy || 'Mixed Chapters'}
                              </div>
                            </div>

                            <div className="bg-indigo-600 border border-indigo-500 rounded-2xl p-4 shadow-xl group flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
                                    <Zap size={16} />
                                  </div>
                                  <h5 className="text-[10px] font-black text-white/70 uppercase tracking-widest">Speed advice</h5>
                                </div>
                                <div className="text-sm font-black text-white font-outfit uppercase tracking-tighter truncate">
                                  {aiSummary?.paperStats?.preparationVelocity || 'Pace Yourself'}
                                </div>
                              </div>
                              <div className="h-1 w-full bg-white/10 rounded-full mt-3">
                                <div className="h-full bg-white rounded-full w-2/3 shadow-[0_0_8px_white]" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Insights Board - Common for both modes */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-emerald-50/20 border-2 border-emerald-100/40 rounded-[2rem] p-7 group hover:bg-emerald-50/40 transition-colors">
                        <h3 className="text-sm font-black text-emerald-700 uppercase tracking-[0.2em] flex items-center gap-2 mb-7">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            {isVaultMode ? <TrendingUp size={18} /> : <Check size={18} />}
                          </div>
                          {isVaultMode ? 'Ways to Score Higher' : 'Your Main Strengths'}
                        </h3>
                        <div className="space-y-8">
                          {aiSummary.strengths.map((s, i) => (
                            <div key={i} className="flex flex-col gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40" />
                                <h4 className="text-lg font-black text-slate-900 leading-tight">{s.title}</h4>
                              </div>
                              <div className="space-y-6 pl-0 md:pl-5 mt-2">
                                {parsePoints(s.detail).map((point, idx) => (
                                  <AnalysisPoint key={idx} text={point} colorClass="bg-emerald-500" index={idx} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Weakness Board */}
                      <div className="bg-rose-50/20 border-2 border-rose-100/40 rounded-[2rem] p-7 group hover:bg-rose-50/40 transition-colors">
                        <h3 className="text-sm font-black text-rose-700 uppercase tracking-[0.2em] flex items-center gap-2 mb-7">
                          <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                            {isVaultMode ? <Target size={18} /> : <X size={18} />}
                          </div>
                          {isVaultMode ? 'Common Traps & Tricky Spots' : 'Things to Focus On'}
                        </h3>
                        <div className="space-y-8">
                          {aiSummary.weaknesses.map((w, i) => (
                            <div key={i} className="flex flex-col gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/40" />
                                <h4 className="text-lg font-black text-slate-900 leading-tight">{w.title}</h4>
                              </div>
                              <div className="space-y-6 pl-0 md:pl-5 mt-2">
                                {parsePoints(w.detail).map((point, idx) => (
                                  <AnalysisPoint key={idx} text={point} colorClass="bg-rose-500" index={idx} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Study Plan / Evolution Plan */}
                    <div className="bg-slate-950 text-white rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[80px] rounded-full pointer-events-none" />
                      <div className="relative z-10 flex flex-col md:flex-row items-start gap-5 md:gap-6">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-2xl">
                          <Lightbulb size={28} className="text-primary-400 md:hidden" />
                          <Lightbulb size={32} className="text-primary-400 hidden md:block" />
                        </div>
                        <div className="w-full">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400/80 mb-5">{isVaultMode ? 'Points-Based Strategy' : 'Evolution Plan'}</h3>
                          <div className="space-y-6">
                            {parsePoints(aiSummary.studyPlan).map((point, idx) => (
                              <AnalysisPoint key={idx} text={point} colorClass="bg-primary-400" isDark={true} index={idx} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Syllabus Table Modal */}
      {showSyllabusModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" onClick={() => setShowSyllabusModal(false)} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h4 className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-widest">
                <TableIcon size={16} className="text-indigo-500" /> Chapter Distribution ({aggregatedDomainsList.length} Units)
              </h4>
              <button
                onClick={() => setShowSyllabusModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chapter Name</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score Map</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">IQ Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(aggregatedDomainsList as any[]).map((domain: any) => (
                    <tr key={domain.name} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-5">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800 leading-tight">{domain.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 mt-1">{domain.questionCount} Questions</span>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 md:w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${(domain.questionCount / totalQuestions) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-700 w-8">{Math.round((domain.questionCount / totalQuestions) * 100)}%</span>
                        </div>
                      </td>
                      <td className="py-5 text-right">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${domain.difficultyDNA === 'Hard' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                          domain.difficultyDNA === 'Moderate' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                            'bg-emerald-50 border-emerald-100 text-emerald-600'
                          }`}>
                          {domain.difficultyDNA}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowSyllabusModal(false)}
                className="px-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
              >
                Close Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceAnalysis;
