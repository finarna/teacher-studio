import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Target,
  Brain,
  History,
  TrendingUp,
  TrendingDown,
  Clock,
  Layout,
  BookOpen,
  Filter,
  CheckCircle2,
  CheckCircle,
  Check,
  AlertCircle,
  PlayCircle,
  Play,
  Loader2,
  PieChart as PieChartIcon,
  Crown,
  Lock,
  ArrowRight,
  ShieldCheck,
  Shield,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  FileQuestion,
  Info,
  ExternalLink,
  Save,
  Rocket,
  ArrowUpRight,
  Calendar,
  Layers,
  HelpCircle,
  Cpu,
  Dna,
  X,
  XCircle,
  Activity,
  Trophy,
  BarChart2,
  Signal,
  Settings,
  Database,
  Compass,
  Hash,
  MinusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ComplexityMatrix from './ComplexityMatrix';
import type { Subject, ExamContext, TopicResource, TestAttempt, AnalyzedQuestion } from '../types';
import { supabase } from '../lib/supabase';
import { cache } from '../utils/cache';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
import { AI_CONFIG } from '../config/aiConfigs';
import ExplainForecastModal from './ExplainForecastModal';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { getApiUrl } from '../lib/api';
import { EXAM_CONFIGS } from '../config/exams';
import { getForecastedCalibration, type ForecastedCalibration } from '../lib/reiEvolutionEngine';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';

interface MockTestBuilderPageProps {
  subject: Subject;
  examContext: ExamContext;
  topics: TopicResource[];
  onBack: () => void;
  onStartTest: (attempt: TestAttempt, questions: AnalyzedQuestion[]) => void;
  onViewTestResults: (attemptId: string) => Promise<void>;
  userId: string;
}

type StrategyMode = 'predictive_mock' | 'adaptive_growth' | 'hybrid';

interface WeakTopic {
  topicId: string;
  topicName: string;
  masteryLevel: number;
  practiceAccuracy: number;
  weaknessScore: number;
  reason: string;
}

interface TestTemplate {
  id: string;
  templateName: string;
  topicIds: string[];
  difficultyMix: { easy: number; moderate: number; hard: number };
  questionCount: number;
  durationMinutes: number;
  lastUsed: string;
}

interface TopicAnalysisEntry {
  topicId: string;
  topicName: string;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  percentage: number;
}

interface PastTestAttempt {
  id: string;
  testName: string;
  subject: string;
  examContext: string;
  percentage: number | null;
  rawScore: number | null;
  marksObtained: number | null;
  marksTotal: number | null;
  totalQuestions: number;
  questionsAttempted: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  durationMinutes: number;
  totalDuration: number | null;
  topicAnalysis: TopicAnalysisEntry[] | null;
  timeAnalysis: Record<string, number> | null;
}

// REI v3.0 UI THEME MAPPINGS
const EXAM_UI_THEMES: Record<string, any> = {
  JEE: {
    oracleLabel: 'Assess 2026 Predictive Blueprint',
    oracleActive: '✨ 2026 Premium Rigor Active',
    signature: 'THE ANALYST',
    protocol: 'SYLLABUS-MAX',
    description: 'Advanced cross-topic conceptual synthesis',
    strategyNote: {
      predictive_mock: 'REI-v3 Neural Simulation: Mimics exact JEE trends, linguistic traps, and Assertion-Reasoning complexity for maximum score predictability.',
      hybrid: 'Precision Growth Engine: Fuses your personal accuracy gaps with high-yield exam patterns to bridge the score gap effectively.',
      adaptive_growth: 'Surgical Score Recovery: Targeted AI intervention focused on flipping your lowest-rigor chapters into scoring strengths.'
    }
  },
  NEET: {
    oracleLabel: 'NTA Standard Blueprint',
    oracleActive: '✨ NTA Pattern Synthesis Active',
    signature: 'THE SPECIALIST',
    protocol: 'ACCURACY-PRECISION',
    description: 'Focus on NCERT-based logic and trap detection',
    strategyNote: {
      predictive_mock: 'NCERT Pattern Simulation: Targets linguistic traps and Assertion-Reasoning speed with AI-predicted high-rigor drills.',
      hybrid: 'Adaptive Skill Synthesis: NCERT-plus trends fused with your personal accuracy gaps for holistic score improvement.',
      adaptive_growth: 'Vulnerability Elimination: Focuses AI generation on rapid-fire conceptual recall to secure easy marks first.'
    }
  },
  KCET: {
    oracleLabel: 'Assess 2026 Peak Pattern',
    oracleActive: '✨ 2026 Standard Calibration Active',
    signature: 'THE SYNTHESIZER',
    protocol: 'PATTERN-RECOGNITION',
    description: 'Heuristic pattern calibration and fast recall',
    strategyNote: {
      predictive_mock: 'Heuristic Exam Simulation: 1:1 real exam pattern logic with AI-predicted trending properties and recall traps.',
      hybrid: 'Pattern Growth Bridge: Fuses official trends with your personal property-solving speed gaps for optimized performance.',
      adaptive_growth: 'Property Mastery Recovery: Prioritizes AI drills for your specific property-recall vulnerabilities to recover lost marks.'
    }
  },
  CBSE: {
    oracleLabel: 'Board Blueprint Replicator',
    oracleActive: '✨ Official Blueprint Match Active',
    signature: 'THE ARCHITECT',
    protocol: 'STAGING-CORE',
    description: 'High-fidelity alignment with Board standards',
    strategyNote: {
      predictive_mock: 'Board Standard Simulation: High-fidelity blueprint replication with AI-generated step-wise credit verification questions.',
      hybrid: 'Conceptual Stability Bridge: Board pattern stability fused with your individual conceptual gaps for peak assurance.',
      adaptive_growth: 'Success-Buffer Mode: Ensures guaranteed mastery of high-yield annual patterns and recurring board topics.'
    }
  }
};

const MockTestBuilderPage: React.FC<MockTestBuilderPageProps> = ({
  subject,
  examContext,
  topics,
  onBack,
  onStartTest,
  onViewTestResults,
  userId
}) => {
  const theme = React.useMemo(() => EXAM_UI_THEMES[examContext] || EXAM_UI_THEMES.CBSE, [examContext]);
  const { subjectProgress } = useLearningJourney();
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('Creating test...');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [showForecastExplanation, setShowForecastExplanation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<PastTestAttempt[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showAllTests, setShowAllTests] = useState(false);

  // Test configuration state
  const [testName, setTestName] = useState('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(25);
  const [difficultyMix, setDifficultyMix] = useState({ easy: 30, moderate: 50, hard: 20 });
  const [isAutoComplexity, setIsAutoComplexity] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [availableQuestionCount, setAvailableQuestionCount] = useState(0);
  const [strategyMode, setStrategyMode] = useState<StrategyMode>('predictive_mock');
  const [oracleModeEnabled, setOracleModeEnabled] = useState(false);
  const [oracleDirectives, setOracleDirectives] = useState<string[]>([]);
  const [boardSignature, setBoardSignature] = useState<'SYNTHESIZER' | 'LOGICIAN' | 'INTIMIDATOR' | 'DEFAULT'>('DEFAULT');
  const [isPeakMode, setIsPeakMode] = useState(false);
  const [forecast, setForecast] = useState<ForecastedCalibration | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [userRole, setUserRole] = useState<string>('student');
  const calibrationRef = React.useRef<HTMLDivElement>(null);

  const scrollToCalibration = () => {
    calibrationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const subjectConfig = SUBJECT_CONFIGS[subject];

  useEffect(() => {
    fetchWeakTopics();
    fetchTestHistory();
    fetchForecast();
    fetchUserRole();
  }, [subject, examContext, userId]);

  useEffect(() => {
    if (selectedTopicIds.length > 0) {
      calculateAvailableQuestions();
    } else {
      setAvailableQuestionCount(0);
    }
  }, [selectedTopicIds, difficultyMix]);

  const fetchForecast = async () => {
    setIsLoadingForecast(true);
    try {
      const data = await getForecastedCalibration(examContext, subject);
      setForecast(data);
      console.log(`📡 [REI ENGINE] Forecast received for ${examContext}: Velocity=${data.rigorVelocity}`);
    } catch (err) {
      console.error('Failed to fetch REI forecast:', err);
    } finally {
      setIsLoadingForecast(false);
    }
  };

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (data?.role) setUserRole(data.role);
      }
    } catch (err) {
      console.error('Error fetching role:', err);
    }
  };

  const fetchWeakTopics = async () => {
    setIsLoadingRecommendations(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl(`/api/learning-journey/weak-topics?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(subject)}&examContext=${encodeURIComponent(examContext)}`);
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (response.ok) {
        const result = await response.json();
        setWeakTopics(result.data?.weakTopics || []);
      } else {
        console.error('Failed to fetch weak topics');
        setWeakTopics([]);
      }
    } catch (error) {
      console.error('Error fetching weak topics:', error);
      setWeakTopics([]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };


  const fetchTestHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl(`/api/learning-journey/mock-history?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(subject)}&examContext=${encodeURIComponent(examContext)}&limit=50`);
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (response.ok) {
        const result = await response.json();
        setTestHistory(result.data?.attempts || []);
      } else {
        console.error('❌ Failed to fetch test history:', response.status);
      }
    } catch (error) {
      console.error('Error fetching test history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const calculateAvailableQuestions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl('/api/learning-journey/count-available-questions');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          subject,
          examContext,
          topicIds: selectedTopicIds,
          difficultyMix
        })
      });

      if (response.ok) {
        const result = await response.json();
        const serverTotal = result.data?.total || 0;
        setAvailableQuestionCount(serverTotal > 0 ? serverTotal : selectedTopicIds.length * 300);
      } else {
        setAvailableQuestionCount(selectedTopicIds.length * 300);
      }
    } catch (error) {
      console.error('Error counting available questions:', error);
      setAvailableQuestionCount(selectedTopicIds.length * 300);
    }
  };

  const applyRecommendations = () => {
    if (weakTopics.length > 0) {
      const recommendedTopicIds = weakTopics.slice(0, 5).map(wt => wt.topicId);
      setSelectedTopicIds(recommendedTopicIds);
      setShowRecommendations(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const selectAllTopics = () => {
    setSelectedTopicIds(topics.map(t => t.topicId));
  };

  const clearTopics = () => {
    setSelectedTopicIds([]);
  };

  const loadTemplate = (template: TestTemplate) => {
    setTestName(template.templateName);
    setSelectedTopicIds(template.topicIds);
    setDifficultyMix(template.difficultyMix);
    setQuestionCount(template.questionCount);
    setDurationMinutes(template.durationMinutes);
  };

  const handleDifficultyChange = (easy: number, moderate: number, hard: number) => {
    setDifficultyMix({ easy, moderate, hard });
  };

  const matrixStats = React.useMemo(() => {
    const progress = subjectProgress?.[subject];
    return {
      learning: progress ? Math.min(100, (progress.topicsMastered / (progress.topicsTotal || 1)) * 100) : 20,
      solve: progress?.overallAccuracy ?? 0,
      master: progress?.overallMastery ?? 0,
      recall: progress ? Math.min(100, (progress.totalQuestionsAttempted / 50) * 100) : 0
    };
  }, [subjectProgress, subject]);

  useEffect(() => {
    if (isAutoComplexity && strategyMode !== 'predictive_mock' && subjectProgress?.[subject]) {
      const mastery = subjectProgress[subject].overallMastery;
      if (mastery < 30) {
        setDifficultyMix({ easy: 70, moderate: 25, hard: 5 });
      } else if (mastery < 60) {
        setDifficultyMix({ easy: 40, moderate: 40, hard: 20 });
      } else if (mastery < 85) {
        setDifficultyMix({ easy: 20, moderate: 40, hard: 40 });
      } else {
        setDifficultyMix({ easy: 10, moderate: 30, hard: 60 });
      }
    }
  }, [isAutoComplexity, strategyMode, subjectProgress, subject]);

  // Sync scale with official Exam Spec
  useEffect(() => {
    const config = EXAM_CONFIGS[examContext];
    if (config) {
      setQuestionCount(config.pattern.totalQuestions);

      // Calculate per-subject duration for competitive exams
      let duration = config.pattern.duration;
      if (examContext === 'JEE') duration = 60; // 180m total / 3 subjects
      if (examContext === 'NEET') duration = 65; // 200m total / 3 subjects

      setDurationMinutes(duration);
    }
  }, [examContext, subject]);

  // Handle specialized Predictive Mock blueprint locking (chained from REI Engine)
  useEffect(() => {
    if (strategyMode === 'predictive_mock' && forecast) {
      setDifficultyMix({ ...forecast.difficultyProfile });
    } else if (strategyMode === 'predictive_mock') {
      const config = EXAM_CONFIGS[examContext];
      if (config?.difficultyProfile) {
        setDifficultyMix({ ...config.difficultyProfile });
      }
    }
  }, [strategyMode, examContext, forecast]);

  // Sync Syllabus for Simulation/Oracle protocol
  useEffect(() => {
    let newTopicIds: string[] = [];
    if (strategyMode === 'predictive_mock' || oracleModeEnabled) {
      newTopicIds = topics.map(t => t.topicId);
    } else if (strategyMode === 'hybrid' && weakTopics.length > 0) {
      // Balanced: Auto-select top 5 weak topics for student
      newTopicIds = weakTopics.slice(0, 5).map(wt => wt.topicId);
    } else if (strategyMode === 'adaptive_growth' && weakTopics.length > 0) {
      // Recovery: Auto-select top 3 most critical weak topics
      newTopicIds = weakTopics.slice(0, 3).map(wt => wt.topicId);
    }

    // ONLY update if the selection actually changed to avoid infinite re-render loops
    if (newTopicIds.length > 0) {
      const currentIdsStr = [...selectedTopicIds].sort().join(',');
      const newIdsStr = [...newTopicIds].sort().join(',');
      if (currentIdsStr !== newIdsStr) {
        setSelectedTopicIds(newTopicIds);
      }
    }
  }, [strategyMode, oracleModeEnabled, topics, weakTopics]);

  const handleTogglePeakMode = () => {
    const newPeakStatus = !isPeakMode;
    setIsPeakMode(newPeakStatus);

    if (newPeakStatus) {
      setOracleModeEnabled(true);
      setStrategyMode('predictive_mock');
      setBoardSignature(forecast?.boardSignature || theme.signature);
      setOracleDirectives(forecast?.directives || []);

      setTestName(`${examContext} ${forecast?.targetYear || 2026} Oracle ${theme.protocol} Simulation`);
      setQuestionCount(examContext === 'KCET' ? 60 : examContext === 'JEE' ? 30 : 50);
      setDurationMinutes(examContext === 'KCET' ? 80 : 120);
    } else {
      setOracleModeEnabled(false);
      setBoardSignature('DEFAULT');
      setOracleDirectives([]);
    }
  };

  const difficultyTotal = difficultyMix.easy + difficultyMix.moderate + difficultyMix.hard;
  const isDifficultyValid = difficultyTotal === 100;

  const canCreateTest =
    testName.trim() !== '' &&
    selectedTopicIds.length > 0 &&
    isDifficultyValid;

  const handleCreateTest = async () => {
    if (!canCreateTest) return;

    setIsCreatingTest(true);
    setError(null);
    setProgressMessage('Initializing AI test generation...');
    setProgressPercentage(5);

    let pollInterval: NodeJS.Timeout | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl('/api/learning-journey/create-custom-test');

      const payload = {
        userId,
        testName,
        subject,
        examContext,
        topicIds: selectedTopicIds,
        questionCount,
        difficultyMix,
        durationMinutes,
        strategyMode,
        oracleMode: oracleModeEnabled ? {
          enabled: true,
          idsTarget: 0.95,
          directives: oracleDirectives,
          boardSignature: boardSignature
        } : undefined
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create test' }));
        throw new Error(errorData.error || 'Failed to create test');
      }

      const result = await response.json();
      const { progressId } = result.data;

      if (!progressId) {
        throw new Error('No progress ID returned from server');
      }

      await new Promise<void>((resolve, reject) => {
        const safetyTimer = setTimeout(() => {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          reject(new Error('Test generation timed out. Please try again.'));
        }, 5 * 60 * 1000);

        pollInterval = setInterval(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const progressUrl = getApiUrl(`/api/learning-journey/generation-progress/${progressId}`);
            const progressRes = await fetch(progressUrl, {
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              credentials: 'include'
            });

            if (!progressRes.ok) return;

            const progressData = await progressRes.json();
            setProgressMessage(progressData.message || 'Generating questions...');
            setProgressPercentage(progressData.percentage || 0);

            if (progressData.step === 'complete' && progressData.result) {
              clearTimeout(safetyTimer);
              clearInterval(pollInterval!);
              pollInterval = null;
              setProgressMessage('✅ Test ready! Redirecting...');
              setProgressPercentage(100);
              setTimeout(() => {
                onStartTest(progressData.result.attempt, progressData.result.questions);
              }, 500);
              resolve();
            } else if (progressData.step === 'error') {
              clearTimeout(safetyTimer);
              clearInterval(pollInterval!);
              pollInterval = null;
              reject(new Error(progressData.message || 'Test generation failed'));
            }
          } catch (err) {
            console.warn('Progress poll failed:', err);
          }
        }, 1500);
      });

    } catch (error) {
      console.error('Error creating test:', error);
      setError(error instanceof Error ? error.message : 'Failed to create test. Please try again.');
    } finally {
      if (pollInterval) clearInterval(pollInterval);
      setTimeout(() => {
        setIsCreatingTest(false);
        setProgressPercentage(0);
      }, 600);
    }
  };

  const [activeTab, setActiveTab] = useState<'builder' | 'history'>('builder');

  const completed = testHistory.filter(a => a.status === 'completed' && a.percentage != null);
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, a) => s + (a.percentage ?? 0), 0) / completed.length)
    : null;
  const bestScore = completed.length > 0
    ? Math.max(...completed.map(a => a.percentage ?? 0))
    : null;

  // Memoize sorted history to avoid in-render mutation and improve performance
  const sortedHistory = React.useMemo(() => {
    return [...testHistory].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [testHistory]);

  return (
    <div className="min-h-screen bg-[#fafbfc] font-inter pb-20 relative overflow-hidden">
      {/* Professional Educational Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#F8FAFC]">
        <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #E2E8F0 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-indigo-50/50 to-transparent" />
      </div>

      <div className="relative z-10">
        <LearningJourneyHeader
          showBack
          onBack={onBack}
          icon={<Zap size={24} className="text-yellow-400" fill="currentColor" />}
          title="Mock Test Builder"
          subtitle={`Create a customized practice exam for ${subject}`}
          subject={subject}
          trajectory={examContext}
          mastery={subjectProgress?.[subject]?.overallMastery}
          accuracy={subjectProgress?.[subject]?.overallAccuracy ?? 0}
        />
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[1400px] mx-auto px-6 pt-4"
        >
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-sm shadow-sm">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
              <AlertCircle size={18} />
            </div>
            <span className="flex-1 text-rose-900 font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600 transition-colors p-1">
              <X size={20} />
            </button>
          </div>
        </motion.div>
      )}

      <div className="max-w-[1440px] mx-auto px-4 pt-2">
        <div className="flex items-center gap-8 mb-8 border-b border-slate-200 sticky top-[72px] bg-[#F8FAFC]/80 backdrop-blur-md z-40 py-2">
          {[
            { id: 'builder', label: 'Create New Test', icon: <Target size={20} className="text-indigo-600" />, badge: null },
            { id: 'history', label: 'My Past Tests', icon: <History size={20} className="text-emerald-600" />, badge: testHistory.length }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'builder' | 'history')}
                className={`relative pb-4 flex items-center gap-3 text-sm font-bold transition-all ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge !== null && tab.badge > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-6">
          {activeTab === 'builder' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <section id="builder-section" className="scroll-mt-32 pt-2">
                <div className="max-w-[1100px] mx-auto space-y-6">
                  {/* Card Container - Phase 01: Intent */}
                  <div className="relative">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-[0_20px_40px_rgba(0,0,0,0.02)] relative overflow-hidden"
                    >
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                            <Play size={20} fill="currentColor" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 font-outfit">Set Test Strategy</h2>
                            <p className="text-sm text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px]">Define the goal and focus of your practice session</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 inline-flex items-center gap-1">
                              Test Name (Codename) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={testName}
                              onChange={(e) => setTestName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                              placeholder="e.g. KCET Mathematics Mock #01"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                              {
                                id: 'predictive_mock',
                                label: 'Ultimate Simulation',
                                tagline: 'Real-Exam Rigor',
                                icon: <Sparkles size={20} />,
                                desc: 'Master the official pattern',
                                impact: 'EXAM-READY PRECISION',
                                color: 'indigo'
                              },
                              {
                                id: 'hybrid',
                                label: 'Mastery Mix',
                                tagline: 'Balanced Growth',
                                icon: <Target size={20} />,
                                desc: 'Weak Spots + Exam Trends',
                                impact: 'MAX SCORE VELOCITY',
                                color: 'emerald'
                              },
                              {
                                id: 'adaptive_growth',
                                label: 'Rapid Recovery',
                                tagline: 'Targeted Fixes',
                                icon: <Zap size={20} />,
                                desc: 'Turn weakness into strength',
                                impact: 'STOP SCORE LEAKS',
                                color: 'rose'
                              }
                            ].map(s => {
                              const isSelected = strategyMode === s.id && !oracleModeEnabled;
                              const colorMap = {
                                indigo: 'bg-indigo-600 shadow-indigo-100',
                                emerald: 'bg-emerald-600 shadow-emerald-100',
                                rose: 'bg-rose-600 shadow-rose-100'
                              };

                              return (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    setStrategyMode(s.id as StrategyMode);
                                    setOracleModeEnabled(false);
                                    // AUTOMATIC SYNC: If entering Simulation mode, lock to official pattern immediately
                                    if (s.id === 'predictive_mock') {
                                      const config = EXAM_CONFIGS[examContext];
                                      if (config) {
                                        setQuestionCount(config.pattern.totalQuestions);
                                        setDurationMinutes(examContext === 'KCET' ? 80 : examContext === 'JEE' ? 60 : examContext === 'NEET' ? 65 : config.pattern.duration);
                                      }
                                    }
                                  }}
                                  className={`relative group p-5 rounded-3xl border-2 transition-all text-left flex flex-col gap-4 overflow-hidden ${isSelected ? 'bg-white border-slate-900 shadow-[0_20px_40px_rgba(0,0,0,0.08)] ring-4 ring-slate-900/5' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                >
                                  {/* AI Badge */}
                                  <div className="absolute top-0 right-0">
                                    <div className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-xl ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                      AI POWERED
                                    </div>
                                  </div>

                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110 ${isSelected ? colorMap[s.color as keyof typeof colorMap] + ' text-white' : 'bg-slate-50 text-slate-400'}`}>
                                    {s.icon}
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex flex-col">
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>{s.tagline}</span>
                                      <span className={`text-base font-bold block leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{s.label}</span>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-400 leading-snug line-clamp-1">{s.desc}</p>
                                  </div>

                                  {/* Impact Bar */}
                                  <div className="mt-auto pt-2">
                                    <div className={`px-2 py-1 rounded-lg inline-flex items-center gap-1.5 ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-400 animate-pulse' : 'bg-slate-300'}`} />
                                      <span className="text-[9px] font-bold uppercase tracking-tight">{s.impact}</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={handleTogglePeakMode}
                            className={`w-full p-6 rounded-[2.5rem] border-2 transition-all flex items-center justify-between group overflow-hidden relative ${oracleModeEnabled ? 'bg-slate-900 border-slate-900 shadow-2xl scale-[1.02]' : 'bg-white border-indigo-100 hover:border-indigo-200'}`}
                          >
                            {/* Oracle Mode Background Pattern */}
                            {oracleModeEnabled && (
                              <div className="absolute inset-0 opacity-20 pointer-events-none">
                                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] -mr-32 -mt-32" />
                              </div>
                            )}

                            <div className="flex items-center gap-6 relative z-10 text-left">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${oracleModeEnabled ? 'bg-white text-slate-900 rotate-12 shadow-[0_0_30px_rgba(255,255,255,0.4)]' : 'bg-indigo-50 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-12'}`}>
                                <Sparkles size={28} fill={oracleModeEnabled ? "currentColor" : "none"} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${oracleModeEnabled ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>Ultimate Core</span>
                                  {oracleModeEnabled && <span className="animate-pulse flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />}
                                </div>
                                <span className={`text-xl font-black block font-outfit ${oracleModeEnabled ? 'text-white' : 'text-slate-900'}`}>Premium REI Oracle v3.0</span>
                                <span className={`text-xs font-bold block ${oracleModeEnabled ? 'text-indigo-200' : 'text-slate-400'}`}>Full Autonomous Calibration & Score Projection</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 relative z-10">
                              <div className={`flex flex-col items-end hidden md:flex mr-4 ${oracleModeEnabled ? 'text-indigo-200' : 'text-slate-300'}`}>
                                <span className="text-[10px] font-bold uppercase tracking-widest">Neural Mode</span>
                                <span className="text-xs font-bold uppercase">{oracleModeEnabled ? 'Fully Active' : 'Standby'}</span>
                              </div>
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${oracleModeEnabled ? 'bg-white text-slate-900 shadow-lg scale-110' : 'bg-slate-50 text-slate-300'}`}>
                                {oracleModeEnabled ? <Check size={24} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-slate-200" />}
                              </div>
                            </div>
                          </button>

                          <motion.div
                            key={oracleModeEnabled ? 'oracle' : strategyMode}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className={`p-6 rounded-[2rem] border-2 flex gap-6 items-center transition-all duration-500 ${oracleModeEnabled ? 'bg-slate-900 border-slate-800 text-white shadow-2xl' : 'bg-indigo-50/50 border-indigo-100 text-slate-900'}`}
                          >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${oracleModeEnabled ? 'bg-indigo-600 text-white animate-pulse' : 'bg-white text-indigo-600 border border-indigo-100'}`}>
                              {oracleModeEnabled ? <Sparkles size={28} /> : strategyMode === 'predictive_mock' ? <Cpu size={28} /> : strategyMode === 'hybrid' ? <Activity size={28} /> : <TrendingDown size={28} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1.5">
                                <h4 className={`text-sm font-black uppercase tracking-[0.15em] ${oracleModeEnabled ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                  {oracleModeEnabled ? 'Autonomous Oracle Protocol' : strategyMode === 'predictive_mock' ? 'Ultimate Simulation' : strategyMode === 'hybrid' ? 'Mastery Mix' : 'Rapid Recovery'}
                                </h4>
                                <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${oracleModeEnabled ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white border-indigo-100'}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${oracleModeEnabled ? 'bg-emerald-400' : 'bg-indigo-500'} shadow-[0_0_8px_rgba(99,102,241,0.6)]`} />
                                  <span className={`text-[10px] font-bold uppercase tracking-tight ${oracleModeEnabled ? 'text-indigo-200' : 'text-indigo-600'}`}>Engine Calibrated</span>
                                </div>
                              </div>
                              <p className={`text-sm font-medium leading-relaxed ${oracleModeEnabled ? 'text-indigo-100/80' : 'text-slate-500'}`}>
                                {oracleModeEnabled
                                  ? "Full autonomous synthesis enabled. The REI Oracle is now managing all topic weightages, difficulty profiling, and pattern replication for maximum score impact."
                                  : theme.strategyNote?.[strategyMode === 'predictive_mock' ? 'predictive_mock' : strategyMode === 'hybrid' ? 'hybrid' : 'adaptive_growth'] || "Your assessment is being optimized based on selected intelligence parameters."
                                }
                              </p>
                            </div>
                            <div className={`hidden lg:flex flex-col items-end shrink-0 gap-1 border-l pl-6 py-1 ${oracleModeEnabled ? 'border-slate-700' : 'border-indigo-100'}`}>
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${oracleModeEnabled ? 'text-slate-500' : 'text-slate-400'}`}>Status</span>
                              <span className={`text-xs font-black uppercase ${oracleModeEnabled ? 'text-emerald-400' : 'text-indigo-600'}`}>
                                {oracleModeEnabled || strategyMode === 'predictive_mock' ? 'Ready for Deployment' : 'Optimization Active'}
                              </span>
                            </div>
                          </motion.div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={scrollToCalibration}
                            disabled={!testName.trim()}
                            className={`px-12 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-3 ${!testName.trim() ? 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed' : 'bg-slate-900 text-white shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-1 active:scale-95'}`}
                          >
                            {strategyMode === 'predictive_mock' || oracleModeEnabled ? 'Review Deployment Matrix' : 'Initialize Calibration'}
                            <ArrowRight size={20} className={!testName.trim() ? '' : 'animate-pulse'} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Phase 02: Calibration */}
                  <div ref={calibrationRef} className={`scroll-mt-24 transition-all duration-700 ${!testName.trim() ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-[0_32px_64px_rgba(0,0,0,0.03)] relative overflow-hidden"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-6 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                              <Settings size={22} />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-slate-900 font-outfit">Customize Topics & Difficulty</h2>
                              <p className="text-sm text-slate-500 font-medium">Fine-tune exactly what will appear in your test</p>
                            </div>
                          </div>
                          <div className="hidden md:flex bg-slate-50 border border-slate-200 text-slate-900 px-5 py-2 rounded-2xl items-center gap-4 shadow-sm">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Strategy</span>
                              <span className="text-xs font-bold uppercase tracking-tight text-slate-900">
                                {oracleModeEnabled ? 'Intelligence Oracle Control' : strategyMode === 'predictive_mock' ? 'Ultimate Simulation' : strategyMode === 'hybrid' ? 'Mastery Mix' : 'Rapid Recovery'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {(oracleModeEnabled || strategyMode === 'predictive_mock') && (
                          <div className="mx-6 mb-8 p-5 bg-slate-50 border border-slate-200 rounded-[2rem] flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm shrink-0">
                              <Shield size={22} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-900 mb-0.5">Official Standard Simulation Mode</p>
                              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                                This assessment follows the official board exam properties. All parameters including topic weightage, difficulty balance, and duration are auto-managed.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                  {strategyMode === 'predictive_mock' || oracleModeEnabled ? 'Fixed Subject Topics' : 'Choose Chapters for this test'}
                                </label>
                                {!oracleModeEnabled && strategyMode !== 'predictive_mock' && (
                                  <div className="flex gap-4">
                                    <button onClick={() => setSelectedTopicIds(topics.map(t => t.topicId))} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Select All</button>
                                    <button onClick={() => setSelectedTopicIds([])} className="text-xs font-bold text-slate-400 hover:text-slate-500 transition-colors">Clear All</button>
                                  </div>
                                )}
                                {(oracleModeEnabled || strategyMode === 'predictive_mock') && (
                                  <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full">
                                    <ShieldCheck size={14} className="text-indigo-600" />
                                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Board Standard Locked</span>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar p-0.5">
                                {topics.map(topic => {
                                  const isSelected = selectedTopicIds.includes(topic.topicId);
                                  const isSimulation = strategyMode === 'predictive_mock' || oracleModeEnabled;
                                  return (
                                    <div
                                      key={topic.topicId}
                                      onClick={() => !isSimulation && toggleTopic(topic.topicId)}
                                      className={`p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 group relative overflow-hidden ${isSelected ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-100 hover:border-slate-300'} ${!isSimulation ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
                                    >
                                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 text-white active:scale-95' : 'bg-slate-100 text-slate-300'}`}>
                                        {isSelected ? <Check size={14} strokeWidth={4} /> : null}
                                      </div>
                                      <span className={`text-sm font-bold transition-all ${isSelected ? 'text-slate-900 translate-x-1' : 'text-slate-500'}`}>{topic.topicName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>


                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                  {strategyMode === 'predictive_mock' || oracleModeEnabled ? 'Exam Difficulty Balance' : 'Adjust Difficulty Balance'}
                                </label>
                                {(oracleModeEnabled || strategyMode === 'predictive_mock') && (
                                  <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full">
                                    <ShieldCheck size={14} className="text-indigo-600" />
                                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Standard Balanced</span>
                                  </div>
                                )}
                              </div>

                              <ComplexityMatrix
                                easy={difficultyMix.easy}
                                moderate={difficultyMix.moderate}
                                hard={difficultyMix.hard}
                                isAuto={isAutoComplexity}
                                locked={oracleModeEnabled || strategyMode === 'predictive_mock'}
                                onAdjust={handleDifficultyChange}
                                onToggleAuto={setIsAutoComplexity}
                                stats={matrixStats}
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* REI v3.0 Neural Forecast Panel */}
                            {(oracleModeEnabled || strategyMode === 'predictive_mock') && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden group border border-slate-800"
                              >
                                <div className="absolute inset-0 opacity-10">
                                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                                </div>

                                <div className="relative z-10 space-y-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 cursor-pointer hover:bg-indigo-500/30 transition-all" onClick={() => setShowForecastExplanation(true)}>
                                        <Cpu size={20} />
                                      </div>
                                      <div className="cursor-pointer" onClick={() => setShowForecastExplanation(true)}>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">REI-v3 Forecast <Info size={10} /></span>
                                        <h3 className="text-sm font-bold font-outfit">Predictive Analytics</h3>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                      <div className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none">Live Sync</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                      <span className="text-[9px] font-black text-indigo-300/80 uppercase tracking-wider block mb-1">Rigor Velocity</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl font-black font-mono text-white italic">{forecast?.rigorVelocity || '1.02'}x</span>
                                        <TrendingUp size={14} className="text-emerald-400" />
                                      </div>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                      <span className="text-[9px] font-black text-indigo-300/80 uppercase tracking-wider block mb-1">Score Accuracy</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl font-black font-mono text-white italic">ULTRA-HIGH</span>
                                        <ShieldCheck size={14} className="text-indigo-400" />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-black text-indigo-300/80 uppercase tracking-widest">Neural Intent Signatures</span>
                                      <Dna size={14} className="text-indigo-400 opacity-50" />
                                    </div>
                                    <div className="space-y-3">
                                      {[
                                        { label: 'Synthesis', value: forecast?.intentSignature?.synthesis || 0.85, color: 'bg-indigo-500' },
                                        { label: 'Trap Density', value: forecast?.intentSignature?.trapDensity || 0.72, color: 'bg-rose-500' },
                                        { label: 'Speed Requirement', value: forecast?.intentSignature?.speedRequirement || 0.90, color: 'bg-amber-500' }
                                      ].map(sig => (
                                        <div key={sig.label} className="space-y-1">
                                          <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tight">
                                            <span className="text-indigo-200/70">{sig.label}</span>
                                            <span className="text-white">{Math.round(sig.value * 100)}%</span>
                                          </div>
                                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                              initial={{ width: 0 }}
                                              animate={{ width: `${sig.value * 100}%` }}
                                              className={`h-full ${sig.color} shadow-[0_0_8px_rgba(255,255,255,0.1)]`}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <p className="text-[11px] font-bold text-slate-200 leading-relaxed">
                                    Generated questions will target linguistic traps and multivariable logic gaps based on latest {examContext} trends.
                                  </p>
                                </div>
                              </motion.div>
                            )}

                            <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-xl space-y-8 flex flex-col">
                              <div className="flex items-center justify-between border-b pb-4 border-slate-100 gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
                                    <Target size={18} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Test Overview</span>
                                </div>
                                {(oracleModeEnabled || strategyMode === 'predictive_mock') && (
                                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Standardized</span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-6">
                                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Subject</span>
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                                    <span className="text-base font-bold text-slate-900">{subject}</span>
                                  </div>
                                </div>

                                <div className="space-y-6">
                                  <div className="group">
                                    <div className="flex items-center justify-between mb-4 px-1">
                                      <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Number of Questions</span>
                                        {(oracleModeEnabled || strategyMode === 'predictive_mock') && (
                                          <span className="text-[9px] font-bold text-indigo-500 uppercase">Fixed to Exam Pattern</span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-2xl font-bold text-slate-900 font-mono italic">{questionCount}</span>
                                  </div>
                                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${((questionCount - 5) / 95) * 100}%` }}
                                      className="absolute inset-0 bg-slate-900 rounded-full"
                                    />
                                    <input
                                      type="range" min="5" max="100" step="5" value={questionCount}
                                      disabled={oracleModeEnabled || strategyMode === 'predictive_mock'}
                                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                      className={`absolute inset-0 w-full h-full opacity-0 z-10 ${oracleModeEnabled || strategyMode === 'predictive_mock' ? 'cursor-default pointer-events-none' : 'cursor-pointer'}`}
                                    />
                                  </div>
                                </div>

                                <div className="group">
                                  <div className="flex items-center justify-between mb-4 px-1">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                                        <Clock size={18} />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time Duration (mins)</span>
                                        {(oracleModeEnabled || strategyMode === 'predictive_mock') && (
                                          <span className="text-[9px] font-bold text-amber-600 uppercase">Fixed to Exam Pattern</span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-2xl font-bold text-slate-900 font-mono italic">{durationMinutes}</span>
                                  </div>
                                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${((durationMinutes - 10) / 170) * 100}%` }}
                                      className="absolute inset-0 bg-slate-400 rounded-full"
                                    />
                                    <input
                                      type="range" min="10" max="180" step="5" value={durationMinutes}
                                      disabled={oracleModeEnabled || strategyMode === 'predictive_mock'}
                                      onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                                      className={`absolute inset-0 w-full h-full opacity-0 z-10 ${oracleModeEnabled || strategyMode === 'predictive_mock' ? 'cursor-default pointer-events-none' : 'cursor-pointer'}`}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-4 mt-2">
                            <motion.button
                              whileHover={canCreateTest && !isCreatingTest ? { y: -4, scale: 1.01 } : {}}
                              whileTap={canCreateTest && !isCreatingTest ? { scale: 0.98 } : {}}
                              onClick={handleCreateTest}
                              disabled={!canCreateTest || isCreatingTest}
                              className={`w-full py-6 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-4 relative overflow-hidden ${canCreateTest && !isCreatingTest ? 'bg-slate-900 text-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] group' : 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed'}`}
                            >
                              {canCreateTest && !isCreatingTest && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_100%] animate-gradient-x" />
                              )}

                              {isCreatingTest ? (
                                <>
                                  <div className="relative">
                                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                                    <div className="absolute inset-0 animate-ping opacity-20 bg-indigo-400 rounded-full" />
                                  </div>
                                  <span className="relative z-10 uppercase tracking-widest text-sm">Synthesizing Neural Blueprint...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={24} className={canCreateTest ? 'text-indigo-400' : 'text-slate-300'} />
                                  <span className="relative z-10">Confirm & Deploy Assessment</span>
                                </>
                              )}
                            </motion.button>

                            {!canCreateTest && !isCreatingTest && (
                              <div className="flex items-center justify-center gap-2 text-rose-500 bg-rose-50/50 py-3 rounded-2xl border border-rose-100">
                                <AlertCircle size={16} />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Select Chapters & Name Assessment</p>
                              </div>
                            )}

                            {isCreatingTest && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-slate-900 rounded-[2rem] p-5 border border-slate-800 shadow-2xl space-y-4"
                              >
                                <div className="flex justify-between items-end">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">{progressMessage}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                      <span className="text-xs font-bold text-slate-400">REI-v3 Engine Active</span>
                                    </div>
                                  </div>
                                  <span className="text-2xl font-black text-white font-mono">{progressPercentage}%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div
                                    animate={{ width: `${progressPercentage}%` }}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                  <span>Pattern Matching</span>
                                  <span>Question Synthesis</span>
                                  <span>Rigor Calibration</span>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <section id="history-section" className="scroll-mt-32 pt-4">
                <div className="space-y-10">
                  {/* Global Analytics Dashboard */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: 'Tests Completed', value: completed.length, icon: <CheckCircle2 size={28} />, color: 'emerald' },
                      { label: 'Average Score', value: `${avgScore || 0}%`, icon: <Activity size={28} />, color: 'indigo' },
                      { label: 'Best Performance', value: `${bestScore || 0}%`, icon: <Trophy size={28} />, color: 'amber' }
                    ].map((stat, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={stat.label}
                        className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl transition-shadow"
                      >
                        <div className={`w-16 h-16 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 shadow-inner`}>
                          {stat.icon}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">{stat.label}</span>
                          <span className="text-3xl font-bold text-slate-900 font-outfit">{stat.value}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Historical Records Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-2xl font-bold text-slate-900 font-outfit">Detailed History</h3>
                      <span className="px-4 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-500 uppercase tracking-widest border border-slate-200">{testHistory.length} Records Found</span>
                    </div>

                    {isLoadingHistory ? (
                      <div className="py-24 flex flex-col items-center justify-center gap-4">
                        <Loader2 size={32} className="animate-spin text-indigo-600" />
                        <span className="text-sm font-bold text-slate-400">Loading Assessment History...</span>
                      </div>
                    ) : sortedHistory.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedHistory.map((attempt) => {
                          const isCompleted = attempt.status === 'completed';
                          const pct = attempt.percentage ?? 0;
                          const scoreColor = pct >= 80 ? 'emerald' : pct >= 50 ? 'amber' : 'rose';

                          return (
                            <motion.button
                              whileHover={{ y: -4 }}
                              key={attempt.id}
                              onClick={() => isCompleted && onViewTestResults(attempt.id)}
                              disabled={!isCompleted}
                              className={`group p-6 rounded-[2rem] border transition-all text-left flex flex-col gap-6 ${isCompleted ? 'bg-white border-slate-100 hover:border-indigo-600 shadow-sm hover:shadow-xl' : 'bg-slate-50 border-transparent opacity-60'}`}
                            >
                              <div className="flex items-start justify-between w-full">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{attempt.examContext || 'MOCK'}</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{attempt.subject}</span>
                                  </div>
                                  <h4 className="text-lg font-bold text-slate-900 leading-tight line-clamp-2">{attempt.testName}</h4>
                                </div>
                                {isCompleted ? (
                                  <div className={`text-3xl font-bold font-mono text-${scoreColor}-600`}>{Math.round(pct)}%</div>
                                ) : (
                                  <div className="flex items-center gap-3 text-xs font-bold text-amber-500 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 animate-pulse">
                                    <Loader2 size={14} className="animate-spin" />
                                    PREPARING
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl">
                                  <Clock size={14} className="text-slate-400" />
                                  <span className="text-xs font-bold text-slate-600">{attempt.durationMinutes}m</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl">
                                  <Target size={14} className="text-slate-400" />
                                  <span className="text-xs font-bold text-slate-600">{attempt.totalQuestions} Questions</span>
                                </div>
                              </div>

                              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Completed On</span>
                                  <span className="text-xs font-bold text-slate-500">{attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Processing...'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                  View Report
                                  <ArrowRight size={16} />
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-32 flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mb-8 border-4 border-white shadow-xl">
                          <History size={48} />
                        </div>
                        <h4 className="text-2xl font-bold text-slate-900 mb-3">No Mock Tests Generated Yet</h4>
                        <p className="text-base font-medium text-slate-500 max-w-md mb-10 leading-relaxed">
                          Complete your first mock assessment to unlock detailed performance analytics, topic mastery breakdowns, and historical score tracking.
                        </p>
                        <button
                          onClick={() => setActiveTab('builder')}
                          className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                        >
                          Build Your First Test Now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {showForecastExplanation && (
          <ExplainForecastModal onClose={() => setShowForecastExplanation(false)} examContext={examContext} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MockTestBuilderPage;
