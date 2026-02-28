import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
  Play,
  Target,
  Clock,
  FileQuestion,
  Sparkles,
  TrendingDown,
  X,
  History,
  Trophy,
  TrendingUp,
  BarChart2,
  CheckCircle,
  XCircle,
  MinusCircle,
  BookOpen,
  Signal,
  Check,
  ArrowRight,
  Settings,
  Activity,
  Cpu,
  ShieldCheck,
  Dna,
  Database,
  Compass,
  Hash,
  Shield,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ComplexityMatrix from './ComplexityMatrix';
import type { Subject, ExamContext, TopicResource, TestAttempt, AnalyzedQuestion } from '../types';
import { supabase } from '../lib/supabase';
import { cache } from '../utils/cache';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
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
      predictive_mock: 'Targets multivariable synthesis and analytical depth.',
      hybrid: 'Balances JEE trends with your personal weak links.',
      adaptive_growth: 'Surgical focus on your lowest-rigor chapters.'
    }
  },
  NEET: {
    oracleLabel: 'NTA Standard Blueprint',
    oracleActive: '✨ NTA Pattern Synthesis Active',
    signature: 'THE SPECIALIST',
    protocol: 'ACCURACY-PRECISION',
    description: 'Focus on NCERT-based logic and trap detection',
    strategyNote: {
      predictive_mock: 'Targets linguistic traps and Assertion-Reasoning speed.',
      hybrid: 'NCERT-plus trends fused with your accuracy gaps.',
      adaptive_growth: 'Focuses on rapid-fire conceptual recall vulnerabilities.'
    }
  },
  KCET: {
    oracleLabel: 'Assess 2026 Peak Pattern',
    oracleActive: '✨ 2026 Standard Calibration Active',
    signature: 'THE SYNTHESIZER',
    protocol: 'PATTERN-RECOGNITION',
    description: 'Heuristic pattern calibration and fast recall',
    strategyNote: {
      predictive_mock: 'Targets 1:1 real exam pattern property logic.',
      hybrid: 'Trends + personal property-solving speed gaps.',
      adaptive_growth: 'Prioritizes your specific property-recall vulnerabilities.'
    }
  },
  CBSE: {
    oracleLabel: 'Board Blueprint Replicator',
    oracleActive: '✨ Official Blueprint Match Active',
    signature: 'THE ARCHITECT',
    protocol: 'STAGING-CORE',
    description: 'High-fidelity alignment with Board standards',
    strategyNote: {
      predictive_mock: 'Targets blueprint replication and step-wise credit.',
      hybrid: 'Pattern stability fused with your conceptual gaps.',
      adaptive_growth: 'Ensures mastery of high-yield annual patterns.'
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
    if (strategyMode === 'predictive_mock' || oracleModeEnabled) {
      setSelectedTopicIds(topics.map(t => t.topicId));
    } else if (strategyMode === 'hybrid' && weakTopics.length > 0) {
      // Balanced: Auto-select top 5 weak topics for student
      const recommended = weakTopics.slice(0, 5).map(wt => wt.topicId);
      setSelectedTopicIds(recommended);
    } else if (strategyMode === 'adaptive_growth' && weakTopics.length > 0) {
      // Recovery: Auto-select top 3 most critical weak topics
      const recommended = weakTopics.slice(0, 3).map(wt => wt.topicId);
      setSelectedTopicIds(recommended);
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
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                              { id: 'predictive_mock', label: 'Full Simulation', icon: <Cpu size={18} />, desc: 'Real exam pattern', color: 'indigo' },
                              { id: 'hybrid', label: 'Balanced Mix', icon: <Cpu size={18} />, desc: 'Weak + Strong topics', color: 'emerald' },
                              { id: 'adaptive_growth', label: 'Recovery Mode', icon: <TrendingDown size={18} />, desc: 'Focus on weak areas', color: 'rose' }
                            ].map(s => {
                              const isSelected = strategyMode === s.id && !oracleModeEnabled;
                              const colorMap = {
                                indigo: 'text-indigo-600 bg-indigo-50',
                                emerald: 'text-emerald-600 bg-emerald-50',
                                rose: 'text-rose-600 bg-rose-50'
                              };
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => { setStrategyMode(s.id as StrategyMode); setOracleModeEnabled(false); }}
                                  className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${isSelected ? 'bg-white border-slate-900 shadow-md ring-4 ring-slate-900/5' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                >
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                    {s.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <span className={`text-sm font-bold block truncate ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{s.label}</span>
                                    <span className="text-[10px] font-medium text-slate-400 leading-none truncate block">{s.desc}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={handleTogglePeakMode}
                            className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group overflow-hidden relative ${oracleModeEnabled ? 'bg-white border-slate-900 shadow-md ring-4 ring-slate-900/5' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                          >
                            <div className="flex items-center gap-4 relative z-10 text-left">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${oracleModeEnabled ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-600 group-hover:text-white'}`}>
                                <Sparkles size={20} fill={oracleModeEnabled ? "currentColor" : "none"} />
                              </div>
                              <div>
                                <span className="text-base font-bold block text-slate-900">Premium REI Oracle v3.0</span>
                                <span className={`text-[10px] font-medium block ${oracleModeEnabled ? 'text-slate-600' : 'text-slate-400'}`}>Advanced AI Autonomous Calibration</span>
                              </div>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${oracleModeEnabled ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-300'}`}>
                              {oracleModeEnabled ? <Check size={16} strokeWidth={3} /> : <Settings size={16} />}
                            </div>
                          </button>

                          <motion.div
                            key={oracleModeEnabled ? 'oracle' : strategyMode}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`p-6 rounded-2xl border-2 flex gap-5 items-center bg-slate-50 border-slate-200`}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-900`}>
                              {oracleModeEnabled ? <Sparkles size={24} /> : strategyMode === 'predictive_mock' ? <Cpu size={24} /> : strategyMode === 'hybrid' ? <Settings size={24} /> : <TrendingDown size={24} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                                  Intelligent Strategy: {oracleModeEnabled ? 'Oracle Mode' : strategyMode === 'predictive_mock' ? 'Simulation' : strategyMode === 'hybrid' ? 'Balanced' : 'Recovery'}
                                </h4>
                                <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">System Optimized</span>
                                </div>
                              </div>
                              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                {oracleModeEnabled
                                  ? "Autonomous high-rigor synthesis enabled. All topics and difficulty parameters are being managed by the Oracle v3.0 logic."
                                  : theme.strategyNote?.[strategyMode === 'predictive_mock' ? 'predictive_mock' : strategyMode === 'hybrid' ? 'hybrid' : 'adaptive_growth'] || "Your test is being optimized based on your selection."
                                }
                              </p>
                            </div>
                            <div className="hidden lg:flex flex-col items-end shrink-0 gap-1 border-l border-slate-200 pl-6 py-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assessment Flow</span>
                              <span className="text-xs font-bold text-slate-900">
                                {oracleModeEnabled || strategyMode === 'predictive_mock' ? 'Ready for Deployment' : 'Calibration Recommended'}
                              </span>
                            </div>
                          </motion.div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={scrollToCalibration}
                            disabled={!testName.trim()}
                            className={`px-12 py-4 rounded-2xl font-bold text-sm transition-all flex items-center gap-3 ${!testName.trim() ? 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed' : 'bg-white text-slate-900 border-2 border-slate-200 hover:border-slate-900 shadow-sm hover:shadow-xl active:scale-95'}`}
                          >
                            {strategyMode === 'predictive_mock' || oracleModeEnabled ? 'Review Assessment Profile' : 'Configure Test Chapters'}
                            <ArrowRight size={20} />
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
                                {oracleModeEnabled ? 'Intelligence Oracle Control' : strategyMode === 'predictive_mock' ? 'Expert Simulation' : strategyMode === 'hybrid' ? 'Balanced' : 'Recovery'}
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

                          <div className="flex flex-col gap-3">
                            <motion.button
                              whileHover={canCreateTest && !isCreatingTest ? { scale: 1.01, y: -1 } : {}}
                              whileTap={canCreateTest && !isCreatingTest ? { scale: 0.98 } : {}}
                              onClick={handleCreateTest}
                              disabled={!canCreateTest || isCreatingTest}
                              className={`w-full py-5 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 ${canCreateTest && !isCreatingTest ? 'bg-white text-slate-900 border-2 border-slate-900 shadow-xl' : 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed shadow-none'}`}
                            >
                              {isCreatingTest ? (
                                <>
                                  <Loader2 size={24} className="animate-spin text-slate-400" />
                                  Generating Assessment...
                                </>
                              ) : (
                                <>
                                  <Play size={24} />
                                  Confirm & Start Mock Test
                                </>
                              )}
                            </motion.button>
                            {!canCreateTest && !isCreatingTest && (
                              <div className="flex items-center justify-center gap-2 text-rose-500 bg-rose-50 py-2 rounded-lg border border-rose-100">
                                <AlertCircle size={14} />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Please Select Topics & Name Test</p>
                              </div>
                            )}

                            {isCreatingTest && (
                              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-3 border border-indigo-100 shadow-lg">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{progressMessage}</span>
                                  <span className="text-sm font-black text-indigo-600 font-mono">{progressPercentage}%</span>
                                </div>
                                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div animate={{ width: `${progressPercentage}%` }} className="h-full bg-indigo-600 rounded-full" />
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
                    ) : testHistory.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {testHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((attempt) => {
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
    </div>
  );
};

export default MockTestBuilderPage;
