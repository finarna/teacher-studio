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
import { TestResultsPage } from './TestResultsPage';
import PerformanceDashboardPage from './PerformanceDashboardPage';
import { Loader2, AlertTriangle, Send, RefreshCcw, ChevronLeft, Target, Sparkles, Brain, TrendingUp } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

// Mobile Versions
import MobileTrajectorySelectionPage from './MobileTrajectorySelectionPage';
import MobileSubjectSelectionPage from './MobileSubjectSelectionPage';
import MobileSubjectMenuPage from './MobileSubjectMenuPage';
import MobileTopicDashboardPage from './MobileTopicDashboardPage';
import MobileTopicDetailPage from './MobileTopicDetailPage';

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
    studyStreak,
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
    refreshData,
    navigateToView,
    clearError,
    reportError
  } = useLearningJourney();

  const isMobile = useIsMobile();

  // Error state
  if (error) {
    const handleGoBack = () => {
      clearError();
      goBack();
    };

    const handleReport = async () => {
      await reportError(error);
      alert('Error reported to our engineering team. Thank you!');
    };

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-8 relative">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center animate-pulse">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border-4 border-red-50 rounded-full flex items-center justify-center shadow-sm"
          >
            <RefreshCcw size={16} className="text-red-400" />
          </motion.div>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-2 leading-tight">Something went wrong</h2>
        <p className="text-slate-600 mb-10 max-w-xs text-sm font-medium leading-relaxed">
          {error || 'An unexpected error occurred while processing your request.'}
        </p>

        <div className="flex flex-col w-full max-w-xs gap-3">
          <button
            onClick={handleGoBack}
            className="flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl text-base font-black shadow-lg shadow-slate-200 active:scale-95 transition-all"
          >
            <ChevronLeft size={20} />
            Go Back
          </button>

          <button
            onClick={handleReport}
            className="flex items-center justify-center gap-2 w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold active:scale-95 transition-all border border-slate-100"
          >
            <Send size={16} />
            Report to Ops Team
          </button>

          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 active:scale-95 transition-all"
          >
            Full Page Refresh
          </button>
        </div>
      </div>
    );
  }

  // Full-screen loading only for major view transitions
  if (isLoading && !['test', 'topic_detail', 'mock_builder'].includes(currentView)) {
    const isMissionStart = currentView === 'subject' || currentView === 'subject_menu';

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="max-w-xs w-full">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping" />
            <div className="relative bg-slate-900 rounded-[2rem] w-20 h-20 flex items-center justify-center shadow-2xl border border-white/10">
              {isMissionStart ? (
                <Target size={32} className="text-primary-400 animate-pulse" />
              ) : (
                <Sparkles size={32} className="text-indigo-400 animate-pulse" />
              )}
            </div>
          </div>
          <h2 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tighter mb-2">
            {isMissionStart ? `Entering ${selectedSubject || 'Subject'} HQ` : 'Checking Your Progress'}
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
            {isMissionStart
              ? 'Finding your next big challenge...'
              : "Wait until we see what you've achieved..."}
          </p>
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
        if (isMobile) {
          return <MobileTrajectorySelectionPage onSelectTrajectory={selectTrajectory} />;
        }
        return (
          <TrajectorySelectionPage
            onSelectTrajectory={selectTrajectory}
            userProgress={undefined}
          />
        );

      case 'subject':
        if (!selectedTrajectory) return null;
        if (isMobile) {
          return (
            <MobileSubjectSelectionPage
              examContext={selectedTrajectory}
              onSelectSubject={selectSubject}
              onBack={goBack}
              subjectProgress={subjectProgress}
              onViewGlobalPerformance={() => navigateToView('overall_performance')}
              onSelectOption={async (s, opt) => {
                await selectSubject(s);
                selectSubjectOption(opt);
              }}
            />
          );
        }
        return (
          <SubjectSelectionPage
            examContext={selectedTrajectory}
            onSelectSubject={selectSubject}
            onBack={goBack}
            subjectProgress={subjectProgress}
            onViewGlobalPerformance={() => navigateToView('overall_performance')}
            onSelectOption={async (s, opt) => {
              await selectSubject(s);
              selectSubjectOption(opt);
            }}
          />
        );

      case 'topic_dashboard':
        if (!selectedTrajectory || !selectedSubject) return null;

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

        const recommendation = getAiRecommendation();

        if (isMobile) {
          return (
            <MobileTopicDashboardPage
              subject={selectedSubject}
              examContext={selectedTrajectory}
              topics={topics}
              onSelectTopic={selectTopic}
              onBack={goBack}
              aiRecommendation={recommendation}
              studyStreak={studyStreak}
            />
          );
        }

        return (
          <TopicDashboardPage
            subject={selectedSubject}
            examContext={selectedTrajectory}
            topics={topics}
            onSelectTopic={selectTopic}
            onBack={goBack}
            aiRecommendation={recommendation}
            studyStreak={studyStreak}
          />
        );

      case 'topic_detail':
        if (!selectedTrajectory || !selectedSubject || !selectedTopicId) return null;
        const selectedTopic = topics.find(t => t.topicId === selectedTopicId);
        if (!selectedTopic) return null;

        if (isMobile) {
          return (
            <MobileTopicDetailPage
              topicResource={selectedTopic}
              subject={selectedSubject}
              examContext={selectedTrajectory}
              onBack={goBack}
              onStartQuiz={(topicId, totalQuestions) => { void startTest('topic_quiz', topicId, totalQuestions); }}
              onRefreshData={refreshData}
            />
          );
        }

        return (
          <TopicDetailPage
            topicResource={selectedTopic}
            subject={selectedSubject}
            examContext={selectedTrajectory}
            onBack={goBack}
            onStartQuiz={(topicId, totalQuestions) => { void startTest('topic_quiz', topicId, totalQuestions); }}
            onRefreshData={refreshData}
          />
        );

      case 'test':
        // Show loading while questions populate (async setState after API call)
        if (!currentTest || !currentTestQuestions || currentTestQuestions.length === 0) {
          return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
              <div className="max-w-xs w-full">
                <div className="relative w-20 h-20 mx-auto mb-8">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                  <div className="relative bg-slate-900 rounded-[2rem] w-20 h-20 flex items-center justify-center shadow-2xl border border-white/10">
                    <Brain size={32} className="text-blue-400 animate-pulse" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tighter mb-2">Building Your Challenge</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Picking the perfect questions for you...</p>
              </div>
            </div>
          );
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
          return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
              <div className="max-w-xs w-full">
                <div className="relative w-20 h-20 mx-auto mb-8">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                  <div className="relative bg-slate-900 rounded-[2rem] w-20 h-20 flex items-center justify-center shadow-2xl border border-white/10">
                    <TrendingUp size={32} className="text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tighter mb-2">Calculating Your Impact</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Wait until you see how you did...</p>
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
        if (!selectedTrajectory || !selectedSubject) return null;

        if (isMobile) {
          return (
            <MobileSubjectMenuPage
              subject={selectedSubject}
              examContext={selectedTrajectory}
              onBack={goBack}
              onSelectOption={selectSubjectOption}
            />
          );
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
        if (!selectedTrajectory || !selectedSubject || !userId) return null;
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
        if (!selectedTrajectory || !selectedSubject || !selectedScanId) return null;
        return (
          <VaultDetailPage
            scanId={selectedScanId}
            onBack={goBack}
            filterSubject={selectedSubject}
          />
        );

      case 'mock_builder':
        if (!selectedTrajectory || !selectedSubject || !userId) return null;
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

      case 'overall_performance':
        if (!selectedTrajectory) return null;
        return (
          <PerformanceDashboardPage
            examContext={selectedTrajectory}
            subjectProgress={subjectProgress}
            onBack={goBack}
            onSelectSubject={selectSubject}
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
        drag={!['trajectory', 'test', 'mock_builder'].includes(currentView) ? "x" : false}
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
