import React, { useState } from 'react';
import { BarChart3, BookOpen, ChevronLeft } from 'lucide-react';
import type { TestAttempt, AnalyzedQuestion, TestResponse } from '../types';
import PerformanceAnalysis from './PerformanceAnalysis';
import TestInterface from './TestInterface';

interface TestResultsPageProps {
  attempt: TestAttempt;
  questions: AnalyzedQuestion[];
  responses: TestResponse[];
  onBack: () => void;
  onSubmitRetake?: (responses: TestResponse[]) => void;
}

type TabType = 'analysis' | 'review' | 'retake';

const TestResultsPage: React.FC<TestResultsPageProps> = ({
  attempt,
  questions,
  responses,
  onBack,
  onSubmitRetake
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('analysis');

  // Handler for retaking the test
  const handleRetakeTest = () => {
    setActiveTab('retake');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-instrument">
      {/* Tab Content */}
      {activeTab === 'analysis' ? (
        <PerformanceAnalysis
          attempt={attempt}
          responses={responses}
          questions={questions}
          onReviewQuestions={() => setActiveTab('review')}
          onRetakeTest={handleRetakeTest}
          onBackToDashboard={onBack}
        />
      ) : activeTab === 'review' ? (
        <TestInterface
          attempt={attempt}
          questions={questions}
          completedResponses={responses}
          mode="review"
          onExit={() => setActiveTab('analysis')}
        />
      ) : (
        <TestInterface
          attempt={attempt}
          questions={questions}
          mode="take"
          onSubmit={onSubmitRetake}
          onExit={() => setActiveTab('analysis')}
        />
      )}
    </div>
  );
};

export default TestResultsPage;
