import React from 'react';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
import TrajectorySelectionPage from './TrajectorySelectionPage';
import SubjectSelectionPage from './SubjectSelectionPage';
import TopicDashboardPage from './TopicDashboardPage';
import TopicDetailPage from './TopicDetailPage';
import TestInterface from './TestInterface';
import PerformanceAnalysis from './PerformanceAnalysis';
import { Loader2 } from 'lucide-react';

interface LearningJourneyAppProps {
  onBack: () => void;
}

const LearningJourneyApp: React.FC<LearningJourneyAppProps> = ({ onBack }) => {
  const {
    currentView,
    selectedTrajectory,
    selectedSubject,
    selectedTopicId,
    topics,
    subjectProgress,
    currentTest,
    currentTestQuestions,
    currentTestResponses,
    isLoading,
    error,
    selectTrajectory,
    selectSubject,
    selectTopic,
    goBack,
    startTest,
    submitTest,
    exitTest
  } = useLearningJourney();

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border-2 border-red-200 rounded-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="font-black text-xl text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-600 mb-6">{error}</p>
            <button
              onClick={goBack}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg text-sm font-black hover:bg-slate-800 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && currentView !== 'test') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render based on current view
  switch (currentView) {
    case 'trajectory':
      return (
        <TrajectorySelectionPage
          onSelectTrajectory={selectTrajectory}
          userProgress={undefined} // Will be loaded from API in future
        />
      );

    case 'subject':
      if (!selectedTrajectory) {
        goBack();
        return null;
      }
      return (
        <SubjectSelectionPage
          examContext={selectedTrajectory}
          onSelectSubject={selectSubject}
          onBack={goBack}
          subjectProgress={subjectProgress}
        />
      );

    case 'topic_dashboard':
      if (!selectedTrajectory || !selectedSubject) {
        goBack();
        return null;
      }
      return (
        <TopicDashboardPage
          subject={selectedSubject}
          examContext={selectedTrajectory}
          topics={topics}
          onSelectTopic={selectTopic}
          onBack={goBack}
          aiRecommendation={undefined} // TODO: AI service integration
          studyStreak={0} // TODO: Load from user activity
        />
      );

    case 'topic_detail':
      if (!selectedTrajectory || !selectedSubject || !selectedTopicId) {
        goBack();
        return null;
      }
      const selectedTopic = topics.find(t => t.topicId === selectedTopicId);
      if (!selectedTopic) {
        goBack();
        return null;
      }
      return (
        <TopicDetailPage
          topicResource={selectedTopic}
          subject={selectedSubject}
          examContext={selectedTrajectory}
          onBack={goBack}
          onStartQuiz={(topicId) => startTest('topic_quiz', topicId)}
        />
      );

    case 'test':
      if (!currentTest || !currentTestQuestions || currentTestQuestions.length === 0) {
        goBack();
        return null;
      }
      return (
        <TestInterface
          attempt={currentTest}
          questions={currentTestQuestions}
          onSubmit={submitTest}
          onExit={exitTest}
        />
      );

    case 'test_results':
      if (!currentTest || !currentTestResponses || !currentTestQuestions) {
        goBack();
        return null;
      }
      return (
        <PerformanceAnalysis
          attempt={currentTest}
          responses={currentTestResponses}
          questions={currentTestQuestions}
          onReviewQuestions={() => {
            // TODO: Implement question review mode
            console.log('Review questions clicked');
          }}
          onRetakeTest={() => {
            // Restart the same test
            if (selectedTopicId) {
              startTest(currentTest.testType, selectedTopicId);
            } else {
              startTest(currentTest.testType);
            }
          }}
          onBackToDashboard={goBack}
        />
      );

    default:
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="text-center">
            <h2 className="font-black text-xl text-slate-900 mb-2">Unknown View</h2>
            <p className="text-sm text-slate-600 mb-6">
              Current view: {currentView}
            </p>
            <button
              onClick={goBack}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg text-sm font-black hover:bg-slate-800 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      );
  }
};

export default LearningJourneyApp;
