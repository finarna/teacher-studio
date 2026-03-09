import React, { useState } from 'react';
import type { TestAttempt, AnalyzedQuestion, TestResponse } from '../types';
import PerformanceAnalysis from './PerformanceAnalysis';
import TestInterface from './TestInterface';

interface TestResultsPageProps {
  attempt: TestAttempt;
  questions: AnalyzedQuestion[];
  responses: TestResponse[];
  onBack: () => void;
  onSubmitRetake?: (responses: TestResponse[]) => void;
  mode?: 'results' | 'vault';
  onStartPractice?: () => void;
}

type TabType = 'analysis' | 'review' | 'retake' | 'practice';

export const TestResultsPage: React.FC<TestResultsPageProps> = ({
  attempt,
  questions,
  responses,
  onBack,
  onSubmitRetake,
  mode = 'results',
  onStartPractice
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(mode === 'vault' ? 'analysis' : 'analysis');

  const handleRetakeTest = () => {
    if (mode === 'vault' && onStartPractice) {
      onStartPractice();
    } else {
      setActiveTab('retake');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-instrument">
      {activeTab === 'analysis' ? (
        <PerformanceAnalysis
          attempt={attempt}
          responses={responses}
          questions={questions}
          onReviewQuestions={() => setActiveTab('review')}
          onRetakeTest={handleRetakeTest}
          onBackToDashboard={onBack}
          mode={mode}
        />
      ) : activeTab === 'review' ? (
        <TestInterface
          attempt={attempt}
          questions={questions}
          completedResponses={responses}
          mode="review"
          onExit={() => setActiveTab('analysis')}
          onViewAnalysis={() => setActiveTab('analysis')}
          isVaultMode={mode === 'vault'}
        />
      ) : (
        <TestInterface
          attempt={attempt}
          questions={questions}
          mode="take"
          onSubmit={onSubmitRetake || (onStartPractice ? (res) => { console.log('Solved in Vault:', res); onBack(); } : undefined)}
          onExit={() => setActiveTab('analysis')}
          isVaultMode={mode === 'vault'}
        />
      )}
    </div>
  );
};

export default TestResultsPage;
