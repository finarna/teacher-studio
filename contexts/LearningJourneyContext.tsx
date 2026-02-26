import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type {
  ExamContext,
  Subject,
  TopicResource,
  TestAttempt,
  TestResponse,
  AnalyzedQuestion,
  SubjectProgress,
  Scan
} from '../types';
import { getApiUrl } from '../lib/api';
import { supabase } from '../lib/supabase';

type ViewType = 'trajectory' | 'subject' | 'subject_menu' | 'topic_dashboard' | 'topic_detail' | 'test' | 'test_results' | 'past_year_exams' | 'vault_detail' | 'mock_builder' | 'overall_performance';

interface LearningJourneyState {
  // Navigation state
  currentView: ViewType;
  selectedTrajectory: ExamContext | null;
  selectedSubject: Subject | null;
  selectedTopicId: string | null;
  selectedScan: Scan | null;
  selectedScanId: string | null;

  // Data state
  topics: TopicResource[];
  subjectProgress: Record<Subject, SubjectProgress>;
  currentTest: TestAttempt | null;
  currentTestQuestions: AnalyzedQuestion[];
  currentTestResponses: TestResponse[];

  // Loading state
  isLoading: boolean;
  error: string | null;

  // User info
  userId: string | null;
  studyStreak: number;
}

interface LearningJourneyContextType extends LearningJourneyState {
  // Navigation actions
  selectTrajectory: (trajectory: ExamContext) => void;
  selectSubject: (subject: Subject) => void;
  selectSubjectOption: (option: 'past_exams' | 'topicwise' | 'mock_builder') => void;
  selectTopic: (topicId: string) => void;
  openVault: (scan: Scan) => void;
  goBack: () => void;
  resetToTrajectory: () => void;
  navigateToView: (view: ViewType) => void;

  // Test actions
  startTest: (testType: 'topic_quiz' | 'subject_test' | 'full_mock', topicId?: string, totalQuestions?: number) => Promise<void>;
  startCustomTest: (attempt: TestAttempt, questions: AnalyzedQuestion[]) => void;
  submitTest: (responses: TestResponse[]) => Promise<void>;
  exitTest: () => void;
  viewPastTestResults: (attemptId: string) => Promise<void>;

  // Data actions
  loadTopics: () => Promise<void>;
  loadSubjectProgress: () => Promise<void>;
  loadStudyStreak: () => Promise<void>;
  refreshData: (silent?: boolean) => Promise<void>;
  clearError: () => void;
  reportError: (errorMessage: string) => Promise<void>;

  // Derived state for Global UI
  isFocusMode: boolean;
  isDrilledDown: boolean;
}

const LearningJourneyContext = createContext<LearningJourneyContextType | undefined>(undefined);

export const useLearningJourney = () => {
  const context = useContext(LearningJourneyContext);
  if (!context) {
    throw new Error('useLearningJourney must be used within LearningJourneyProvider');
  }
  return context;
};

interface LearningJourneyProviderProps {
  children: ReactNode;
  userId: string;
}

export const LearningJourneyProvider: React.FC<LearningJourneyProviderProps> = ({
  children,
  userId
}) => {
  const [state, setState] = useState<LearningJourneyState>({
    currentView: 'trajectory',
    selectedTrajectory: null,
    selectedSubject: null,
    selectedTopicId: null,
    selectedScan: null,
    selectedScanId: null,
    topics: [],
    subjectProgress: {} as Record<Subject, SubjectProgress>,
    currentTest: null,
    currentTestQuestions: [],
    currentTestResponses: [],
    isLoading: false,
    error: null,
    userId,
    studyStreak: 0
  });

  // Navigation history for back button
  const [viewHistory, setViewHistory] = useState<ViewType[]>(['trajectory']);

  // Navigate to specific view (External sync)
  const navigateToView = (view: ViewType) => {
    if (state.currentView === view) return;

    setState(prev => ({
      ...prev,
      currentView: view
    }));
    // We don't push to viewHistory here because popstate handles history
  };

  // Select trajectory
  const selectTrajectory = (trajectory: ExamContext) => {
    setState(prev => ({
      ...prev,
      selectedTrajectory: trajectory,
      currentView: 'subject'
    }));
    setViewHistory(prev => [...prev, 'subject']);
  };

  // Auto-load subject progress when trajectory changes
  useEffect(() => {
    if (state.selectedTrajectory && state.currentView === 'subject') {
      loadSubjectProgress(true);
      loadStudyStreak();
    }
  }, [state.selectedTrajectory, state.currentView]);

  // Select subject
  const selectSubject = async (subject: Subject) => {
    setState(prev => ({
      ...prev,
      selectedSubject: subject,
      currentView: 'subject_menu',
      isLoading: true
    }));
    setViewHistory(prev => [...prev, 'subject_menu']);

    try {
      if (state.selectedTrajectory) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const url = getApiUrl(`/api/learning-journey/topics?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(subject)}&examContext=${encodeURIComponent(state.selectedTrajectory)}`);
        const response = await fetch(url, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        if (!response.ok) throw new Error('Failed to load topics');
        const result = await response.json();
        setState(prev => ({
          ...prev,
          topics: result.data || [],
          isLoading: false,
          error: null
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load topics'
      }));
    }
  };

  // Select topic
  const selectTopic = (topicId: string) => {
    setState(prev => ({
      ...prev,
      selectedTopicId: topicId,
      currentView: 'topic_detail'
    }));
    setViewHistory(prev => [...prev, 'topic_detail']);
  };

  // Select sub-option
  const selectSubjectOption = (option: 'past_exams' | 'topicwise' | 'mock_builder') => {
    const viewMap = {
      past_exams: 'past_year_exams' as ViewType,
      topicwise: 'topic_dashboard' as ViewType,
      mock_builder: 'mock_builder' as ViewType
    };
    const targetView = viewMap[option];
    setState(prev => ({ ...prev, currentView: targetView }));
    setViewHistory(prev => [...prev, targetView]);
  };

  // Open Vault
  const openVault = (scan: Scan) => {
    setState(prev => ({
      ...prev,
      selectedScan: scan,
      selectedScanId: scan.id,
      currentView: 'vault_detail'
    }));
    setViewHistory(prev => [...prev, 'vault_detail']);
  };

  // Go back
  const goBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop();
      const previousView = newHistory[newHistory.length - 1];

      setState(prev => ({
        ...prev,
        currentView: previousView,
        ...(previousView === 'trajectory' && {
          selectedTrajectory: null,
          selectedSubject: null,
          selectedTopicId: null,
          selectedScan: null,
          topics: []
        }),
        ...(previousView === 'subject' && {
          selectedSubject: null,
          selectedTopicId: null,
          selectedScan: null,
          topics: []
        }),
        ...(previousView === 'subject_menu' && {
          selectedTopicId: null,
          selectedScan: null,
          selectedScanId: null
        })
      }));
      setViewHistory(newHistory);
    }
  };

  // Reset
  const resetToTrajectory = () => {
    setState(prev => ({
      ...prev,
      currentView: 'trajectory',
      selectedTrajectory: null,
      selectedSubject: null,
      selectedTopicId: null,
      selectedScan: null,
      topics: [],
      currentTest: null,
      currentTestQuestions: [],
      currentTestResponses: []
    }));
    setViewHistory(['trajectory']);
  };

  // Test Actions
  const startTest = async (testType: 'topic_quiz' | 'subject_test' | 'full_mock', topicId?: string, totalQuestions: number = 10) => {
    if (!state.selectedTrajectory || !state.selectedSubject) return;
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const url = getApiUrl('/api/tests/generate');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          testType,
          subject: state.selectedSubject,
          examContext: state.selectedTrajectory,
          topics: topicId ? [topicId] : undefined,
          totalQuestions
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to generate test');
      }
      const result = await response.json();
      setState(prev => ({
        ...prev,
        currentView: 'test',
        currentTest: result.attempt,
        currentTestQuestions: result.questions,
        currentTestResponses: [],
        isLoading: false
      }));
      setViewHistory(prev => [...prev, 'test']);
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: (error as Error).message }));
    }
  };

  const submitTest = async (responses: TestResponse[]) => {
    if (!state.currentTest) return;
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const url = getApiUrl(`/api/tests/${state.currentTest.id}/submit`);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ responses })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to submit test');
      }
      const result = await response.json();
      setState(prev => ({
        ...prev,
        currentView: 'test_results',
        currentTest: result.attempt,
        currentTestResponses: responses,
        isLoading: false
      }));
      setViewHistory(prev => {
        const h = [...prev];
        h[h.length - 1] = 'test_results';
        return h;
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: (error as Error).message }));
    }
  };

  const exitTest = () => {
    setState(prev => ({
      ...prev,
      currentView: 'topic_detail',
      currentTest: null,
      currentTestQuestions: [],
      currentTestResponses: []
    }));
  };

  const viewPastTestResults = async (attemptId: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const url = getApiUrl(`/api/tests/${attemptId}/results`);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load results');
      const result = await response.json();
      setState(prev => ({
        ...prev,
        currentView: 'test_results',
        currentTest: result.attempt,
        currentTestQuestions: result.questions,
        currentTestResponses: result.responses,
        isLoading: false
      }));
      setViewHistory(prev => [...prev, 'test_results']);
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: (error as Error).message }));
    }
  };

  const startCustomTest = (attempt: TestAttempt, questions: AnalyzedQuestion[]) => {
    setState(prev => ({
      ...prev,
      currentView: 'test',
      currentTest: attempt,
      currentTestQuestions: questions,
      currentTestResponses: []
    }));
    setViewHistory(prev => [...prev, 'test']);
  };

  // Data Loading
  const loadTopics = async (silent = false) => {
    if (!state.selectedTrajectory || !state.selectedSubject) return;
    if (!silent) setState(prev => ({ ...prev, isLoading: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl(`/api/learning-journey/topics?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(state.selectedSubject)}&examContext=${encodeURIComponent(state.selectedTrajectory)}`);
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) throw new Error('Failed to load topics');
      const result = await response.json();
      setState(prev => ({ ...prev, topics: result.data || [], isLoading: false, error: null }));
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: (error as Error).message }));
    }
  };

  const loadSubjectProgress = async (silent = false) => {
    if (!state.selectedTrajectory) return;
    if (!silent) setState(prev => ({ ...prev, isLoading: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl(`/api/learning-journey/subjects/${state.selectedTrajectory}?userId=${encodeURIComponent(userId)}`);
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to load progress');
      }
      const { data } = await response.json();
      const progressMap = {} as Record<Subject, SubjectProgress>;
      (data || []).forEach((item: any) => {
        progressMap[item.subject as Subject] = {
          overallMastery: item.overallMastery,
          topicsTotal: item.totalTopics,
          topicsMastered: item.topicsWithQuestions, // Set B aggregator uses topicsWithQuestions
          totalQuestionsAttempted: item.totalQuestions,
          overallAccuracy: item.overallAccuracy ?? 0
        } as any;
      });
      setState(prev => ({ ...prev, subjectProgress: progressMap, isLoading: false }));
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: (error as Error).message }));
    }
  };

  const loadStudyStreak = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = getApiUrl(`/api/progress/streak`);
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) throw new Error('Failed to load streak');
      const { streak } = await response.json();
      setState(prev => ({ ...prev, studyStreak: streak || 0 }));
    } catch (error) {
      console.error('Failed to load streak:', error);
    }
  };

  const refreshData = async (silent = false) => {
    await Promise.all([loadTopics(silent), loadSubjectProgress(silent), loadStudyStreak()]);
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const reportError = async (errorMessage: string) => {
    try {
      const url = getApiUrl('/api/ops/report-error');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId,
          error: errorMessage,
          context: {
            currentView: state.currentView,
            trajectory: state.selectedTrajectory,
            subject: state.selectedSubject,
            timestamp: new Date().toISOString()
          }
        })
      });
      console.log('Error reported to ops team');
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  };

  const contextValue: LearningJourneyContextType = {
    ...state,
    selectTrajectory,
    selectSubject,
    selectSubjectOption,
    selectTopic,
    openVault,
    goBack,
    resetToTrajectory,
    navigateToView,
    startTest,
    startCustomTest,
    submitTest,
    exitTest,
    viewPastTestResults,
    loadTopics,
    loadSubjectProgress,
    loadStudyStreak,
    refreshData,
    clearError,
    reportError,
    isFocusMode: state.currentView === 'test',
    isDrilledDown: state.currentView !== 'trajectory'
  };

  return (
    <LearningJourneyContext.Provider value={contextValue}>
      {children}
    </LearningJourneyContext.Provider>
  );
};

export default LearningJourneyContext;
