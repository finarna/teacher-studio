import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type {
  ExamContext,
  Subject,
  TopicResource,
  TestAttempt,
  TestResponse,
  AnalyzedQuestion,
  SubjectProgress
} from '../types';
import { getApiUrl } from '../lib/api';

type ViewType = 'trajectory' | 'subject' | 'topic_dashboard' | 'topic_detail' | 'test' | 'test_results';

interface LearningJourneyState {
  // Navigation state
  currentView: ViewType;
  selectedTrajectory: ExamContext | null;
  selectedSubject: Subject | null;
  selectedTopicId: string | null;

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
}

interface LearningJourneyContextType extends LearningJourneyState {
  // Navigation actions
  selectTrajectory: (trajectory: ExamContext) => void;
  selectSubject: (subject: Subject) => void;
  selectTopic: (topicId: string) => void;
  goBack: () => void;
  resetToTrajectory: () => void;

  // Test actions
  startTest: (testType: 'topic_quiz' | 'subject_test' | 'full_mock', topicId?: string) => Promise<void>;
  submitTest: (responses: TestResponse[]) => Promise<void>;
  exitTest: () => void;

  // Data actions
  loadTopics: () => Promise<void>;
  loadSubjectProgress: () => Promise<void>;
  refreshData: () => Promise<void>;
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
    topics: [],
    subjectProgress: {} as Record<Subject, SubjectProgress>,
    currentTest: null,
    currentTestQuestions: [],
    currentTestResponses: [],
    isLoading: false,
    error: null,
    userId
  });

  // Navigation history for back button
  const [viewHistory, setViewHistory] = useState<ViewType[]>(['trajectory']);

  // Select trajectory
  const selectTrajectory = (trajectory: ExamContext) => {
    setState(prev => ({
      ...prev,
      selectedTrajectory: trajectory,
      currentView: 'subject'
    }));
    setViewHistory(prev => [...prev, 'subject']);
  };

  // Select subject
  const selectSubject = async (subject: Subject) => {
    setState(prev => ({
      ...prev,
      selectedSubject: subject,
      currentView: 'topic_dashboard',
      isLoading: true
    }));
    setViewHistory(prev => [...prev, 'topic_dashboard']);

    // Load topics for this subject via API (uses SERVICE_ROLE_KEY on server)
    try {
      if (state.selectedTrajectory) {
        const url = getApiUrl(`/api/learning-journey/topics?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(subject)}&examContext=${encodeURIComponent(state.selectedTrajectory)}`);
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load topics');
        }

        const result = await response.json();
        const topics = result.data;

        console.log(`[Learning Journey] Loaded ${topics.length} topics for ${subject} (${result.meta.totalQuestions} questions)`);

        // DEBUG: Log first question metadata from API response
        if (topics.length > 0 && topics[0].questions && topics[0].questions.length > 0) {
          const firstQ = topics[0].questions[0];
          console.log('📡 [Context] First Question from API:', {
            topicName: topics[0].topicName,
            questionId: firstQ.id?.substring(0, 8),
            marks: firstQ.marks,
            diff: firstQ.diff,
            bloomsTaxonomy: firstQ.bloomsTaxonomy,
            year: firstQ.year,
            domain: firstQ.domain,
            pedagogy: firstQ.pedagogy
          });
        }

        setState(prev => ({
          ...prev,
          topics,
          isLoading: false,
          error: null
        }));
      }
    } catch (error) {
      console.error('[Learning Journey] Error loading topics:', error);
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

  // Go back
  const goBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop(); // Remove current view
      const previousView = newHistory[newHistory.length - 1];

      setState(prev => ({
        ...prev,
        currentView: previousView,
        // Clear relevant state based on view
        ...(previousView === 'trajectory' && {
          selectedTrajectory: null,
          selectedSubject: null,
          selectedTopicId: null,
          topics: []
        }),
        ...(previousView === 'subject' && {
          selectedSubject: null,
          selectedTopicId: null,
          topics: []
        }),
        ...(previousView === 'topic_dashboard' && {
          selectedTopicId: null
        })
      }));

      setViewHistory(newHistory);
    }
  };

  // Reset to trajectory selection
  const resetToTrajectory = () => {
    setState(prev => ({
      ...prev,
      currentView: 'trajectory',
      selectedTrajectory: null,
      selectedSubject: null,
      selectedTopicId: null,
      topics: [],
      currentTest: null,
      currentTestQuestions: [],
      currentTestResponses: []
    }));
    setViewHistory(['trajectory']);
  };

  // Start test
  const startTest = async (
    testType: 'topic_quiz' | 'subject_test' | 'full_mock',
    topicId?: string
  ) => {
    if (!state.selectedTrajectory || !state.selectedSubject) {
      throw new Error('Trajectory and subject must be selected');
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Call API to generate test and select questions
      const url = getApiUrl('/api/tests/generate');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include auth cookies
        body: JSON.stringify({
          userId,
          testType,
          subject: state.selectedSubject,
          examContext: state.selectedTrajectory,
          topics: topicId ? [topicId] : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate test');
      }

      const result = await response.json();
      const { attempt, questions, metadata } = result;

      console.log(`[Learning Journey] Generated ${testType} with ${questions.length} questions`, metadata);

      setState(prev => ({
        ...prev,
        currentView: 'test',
        currentTest: attempt,
        currentTestQuestions: questions,
        currentTestResponses: [],
        isLoading: false
      }));
      setViewHistory(prev => [...prev, 'test']);
    } catch (error) {
      console.error('[Learning Journey] Error starting test:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start test'
      }));
    }
  };

  // Submit test
  const submitTest = async (responses: TestResponse[]) => {
    if (!state.currentTest) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Call API to save test responses
      const url = getApiUrl(`/api/tests/${state.currentTest.id}/submit`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ responses })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit test');
      }

      const result = await response.json();
      const { attempt: updatedAttempt, results } = result;

      console.log(`[Learning Journey] Test submitted - Score: ${updatedAttempt.percentage}%`, results);

      setState(prev => ({
        ...prev,
        currentView: 'test_results',
        currentTest: updatedAttempt,
        currentTestResponses: responses,
        isLoading: false
      }));
      setViewHistory(prev => [...prev, 'test_results']);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to submit test'
      }));
    }
  };

  // Exit test
  const exitTest = () => {
    setState(prev => ({
      ...prev,
      currentView: 'topic_detail',
      currentTest: null,
      currentTestQuestions: [],
      currentTestResponses: []
    }));
  };

  // Load topics
  const loadTopics = async () => {
    if (!state.selectedTrajectory || !state.selectedSubject) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Call API endpoint instead of direct function call
      const url = getApiUrl(`/api/learning-journey/topics?userId=${encodeURIComponent(userId)}&subject=${encodeURIComponent(state.selectedSubject)}&examContext=${encodeURIComponent(state.selectedTrajectory)}`);
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load topics');
      }

      const { data: topics } = await response.json();

      setState(prev => ({
        ...prev,
        topics,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load topics'
      }));
    }
  };

  // Load subject progress
  const loadSubjectProgress = async () => {
    if (!state.selectedTrajectory) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // TODO: API call to fetch subject progress
      // For now, return empty
      setState(prev => ({
        ...prev,
        subjectProgress: {} as Record<Subject, SubjectProgress>,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load progress'
      }));
    }
  };

  // Refresh all data
  const refreshData = async () => {
    await Promise.all([loadTopics(), loadSubjectProgress()]);
  };

  const contextValue: LearningJourneyContextType = {
    ...state,
    selectTrajectory,
    selectSubject,
    selectTopic,
    goBack,
    resetToTrajectory,
    startTest,
    submitTest,
    exitTest,
    loadTopics,
    loadSubjectProgress,
    refreshData
  };

  return (
    <LearningJourneyContext.Provider value={contextValue}>
      {children}
    </LearningJourneyContext.Provider>
  );
};

export default LearningJourneyContext;
