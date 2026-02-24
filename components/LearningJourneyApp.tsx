import React from 'react';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
import { motion, AnimatePresence } from 'framer-motion';
import TrajectorySelectionPage from './TrajectorySelectionPage';
import SubjectSelectionPage from './SubjectSelectionPage';
import SubjectMenuPage from './SubjectMenuPage';
import PastYearExamsPage from './PastYearExamsPage';
import MockTestBuilderPage from './MockTestBuilderPage';
import TopicDashboardPage from './TopicDashboardPage';
import TopicDetailPage from './TopicDetailPage';
import TestInterface from './TestInterface';
import PerformanceAnalysis from './PerformanceAnalysis';
import VaultDetailPage from './VaultDetailPage';
import TestResultsPage from './TestResultsPage';
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
    selectedScan,
    selectedScanId,
    topics,
    subjectProgress,
    currentTest,
    currentTestQuestions,
    currentTestResponses,
    isLoading,
    error,
    userId,
    selectTrajectory,
    selectSubject,
    selectSubjectOption,
    selectTopic,
    openVault,
    goBack,
    startTest,
    startCustomTest,
    submitTest,
    exitTest,
    viewPastTestResults,
    refreshData
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

  // Animation variants for page transitions
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };

  const pageTransition = {
    type: "tween" as const,
    ease: "anticipate" as const,
    duration: 0.3
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const renderView = () => {
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

        // Simple Recommendation Engine
        const getAiRecommendation = () => {
          if (!topics || topics.length === 0) return undefined;

          // 1. Find a topic that is active but not mastered
          const activeTopic = topics.find(t => t.masteryLevel > 0 && t.masteryLevel < 85);
          if (activeTopic) {
            return {
              topicId: activeTopic.topicId,
              topicName: activeTopic.topicName,
              reason: `You've already started this topic. Finishing it will boost your global ${selectedSubject} command significantly.`,
              urgency: 'high' as const
            };
          }

          // 2. Find a high-yield unstarted topic (just pick first unstarted for now)
          const unstartedTopic = topics.find(t => t.masteryLevel === 0);
          if (unstartedTopic) {
            return {
              topicId: unstartedTopic.topicId,
              topicName: unstartedTopic.topicName,
              reason: `Identifying this as a core foundation for ${selectedSubject}. Mastering this early will simplify advanced concepts later.`,
              urgency: 'medium' as const
            };
          }

          return undefined;
        };

        return (
          <TopicDashboardPage
            subject={selectedSubject}
            examContext={selectedTrajectory}
            topics={topics}
            onSelectTopic={selectTopic}
            onBack={goBack}
            aiRecommendation={getAiRecommendation()}
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
            onRefreshData={refreshData}
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
          // Return loading state while data is being fetched
          return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="text-center">
                <Loader2 size={48} className="text-primary-600 animate-spin mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-600">Loading test results...</p>
              </div>
            </div>
          );
        }
        return (
          <TestResultsPage
            attempt={currentTest}
            questions={currentTestQuestions}
            responses={currentTestResponses}
            onBack={goBack}
            onSubmitRetake={submitTest}
          />
        );

      case 'subject_menu':
        if (!selectedTrajectory || !selectedSubject) {
          goBack();
          return null;
        }
        return (
          <SubjectMenuPage
            subject={selectedSubject}
            examContext={selectedTrajectory}
            onSelectOption={selectSubjectOption}
            onBack={goBack}
          />
        );

      case 'past_year_exams':
        if (!selectedTrajectory || !selectedSubject || !userId) {
          goBack();
          return null;
        }
        return (
          <PastYearExamsPage
            subject={selectedSubject}
            examContext={selectedTrajectory}
            onBack={goBack}
            onOpenVault={openVault}
            userId={userId}
          />
        );

      case 'vault_detail':
        if (!selectedTrajectory || !selectedSubject || !selectedScanId) {
          goBack();
          return null;
        }
        return (
          <VaultDetailPage
            scanId={selectedScanId}
            onBack={goBack}
          />
        );

      case 'mock_builder':
        if (!selectedTrajectory || !selectedSubject || !userId) {
          goBack();
          return null;
        }
        return (
          <MockTestBuilderPage
            subject={selectedSubject}
            examContext={selectedTrajectory}
            topics={topics}
            onBack={goBack}
            onStartTest={startCustomTest}
            onViewTestResults={viewPastTestResults}
            userId={userId}
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        drag={currentView !== 'trajectory' && currentView !== 'test' ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, { offset, velocity }) => {
          const swipe = swipePower(offset.x, velocity.x);
          if (swipe > swipeConfidenceThreshold && offset.x > 100) {
            goBack();
          }
        }}
        className="w-full min-h-screen bg-[#fcfdfe] touch-pan-y"
      >
        {renderView()}
      </motion.div>
    </AnimatePresence>
  );
};

export default LearningJourneyApp;
