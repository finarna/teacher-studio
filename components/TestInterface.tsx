import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  Grid3x3,
  CheckCircle2,
  Circle,
  AlertTriangle,
  X,
  Check,
  Brain
} from 'lucide-react';
import type { AnalyzedQuestion, TestAttempt, TestResponse, ExamContext } from '../types';
import { RenderWithMath } from './MathRenderer';

interface TestInterfaceProps {
  attempt: TestAttempt;
  questions: AnalyzedQuestion[];
  onSubmit: (responses: TestResponse[]) => void;
  onExit: () => void;
}

interface QuestionResponse {
  questionId: string;
  selectedOption?: number;
  markedForReview: boolean;
  timeSpent: number;
}

const TestInterface: React.FC<TestInterfaceProps> = ({
  attempt,
  questions,
  onSubmit,
  onExit
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, QuestionResponse>>(new Map());
  const [showNavigator, setShowNavigator] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(attempt.durationMinutes * 60); // in seconds
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const currentQuestion = questions[currentQuestionIndex];

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Track time spent on current question
  useEffect(() => {
    setQuestionStartTime(Date.now());

    return () => {
      if (currentQuestion) {
        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
        updateResponse(currentQuestion.id, { timeSpent });
      }
    };
  }, [currentQuestionIndex]);

  const updateResponse = useCallback((questionId: string, updates: Partial<QuestionResponse>) => {
    setResponses(prev => {
      const newResponses = new Map(prev);
      const existing = newResponses.get(questionId) || {
        questionId,
        markedForReview: false,
        timeSpent: 0
      };
      newResponses.set(questionId, { ...existing, ...updates });
      return newResponses;
    });
  }, []);

  const handleOptionSelect = (optionIndex: number) => {
    updateResponse(currentQuestion.id, { selectedOption: optionIndex });
  };

  const handleMarkForReview = () => {
    const current = responses.get(currentQuestion.id);
    updateResponse(currentQuestion.id, {
      markedForReview: !(current?.markedForReview || false)
    });
  };

  const handleClearResponse = () => {
    updateResponse(currentQuestion.id, { selectedOption: undefined });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleQuestionJump = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowNavigator(false);
  };

  const handleAutoSubmit = () => {
    const testResponses = convertResponsesToTestResponses();
    onSubmit(testResponses);
  };

  const handleSubmitClick = () => {
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    const testResponses = convertResponsesToTestResponses();
    onSubmit(testResponses);
  };

  const convertResponsesToTestResponses = (): TestResponse[] => {
    return questions.map(q => {
      const response = responses.get(q.id);
      return {
        id: crypto.randomUUID(),
        attemptId: attempt.id,
        questionId: q.id,
        selectedOption: response?.selectedOption,
        isCorrect: response?.selectedOption === q.correctOptionIndex,
        timeSpent: response?.timeSpent || 0,
        markedForReview: response?.markedForReview || false,
        topic: q.topic,
        difficulty: q.difficulty,
        marks: q.marks,
        createdAt: new Date()
      };
    });
  };

  // Calculate stats
  const answeredCount = Array.from(responses.values()).filter(r => r.selectedOption !== undefined).length;
  const unansweredCount = questions.length - answeredCount;
  const markedCount = Array.from(responses.values()).filter(r => r.markedForReview).length;

  // Format time
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer color based on remaining time
  const getTimerColor = (): string => {
    const totalSeconds = attempt.durationMinutes * 60;
    const percentRemaining = (timeRemaining / totalSeconds) * 100;
    if (percentRemaining <= 10) return 'text-red-600 bg-red-50';
    if (percentRemaining <= 25) return 'text-orange-600 bg-orange-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  // Question status
  const getQuestionStatus = (questionId: string): 'answered' | 'marked' | 'not-visited' | 'not-answered' => {
    const response = responses.get(questionId);
    if (!response) return 'not-visited';
    if (response.markedForReview) return 'marked';
    if (response.selectedOption !== undefined) return 'answered';
    return 'not-answered';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'answered': return 'bg-emerald-500 text-white border-emerald-600';
      case 'marked': return 'bg-amber-500 text-white border-amber-600';
      case 'not-answered': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="h-screen bg-slate-50 font-instrument text-slate-900 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white border-b-2 border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Test Info */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="font-black text-lg text-slate-900">{attempt.testName}</h1>
                <p className="text-xs text-slate-500 font-medium">
                  {attempt.subject} • {attempt.examContext}
                </p>
              </div>
            </div>

            {/* Timer */}
            <div className={`px-6 py-3 rounded-xl font-mono text-2xl font-black ${getTimerColor()} border-2`}>
              <Clock size={20} className="inline mr-2" />
              {formatTime(timeRemaining)}
            </div>

            {/* Navigator Toggle */}
            <button
              onClick={() => setShowNavigator(!showNavigator)}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-black hover:bg-slate-800 transition-all"
            >
              <Grid3x3 size={16} className="inline mr-2" />
              Navigator
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Progress
                </span>
                <span className="text-xs font-black text-slate-900">
                  {answeredCount}/{questions.length} answered
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="font-black">{answeredCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flag size={14} className="text-amber-500" />
                <span className="font-black">{markedCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Circle size={14} className="text-slate-400" />
                <span className="font-black">{unansweredCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Question Card */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
              {/* Question Header - Matching VisualQuestionBank */}
              <div className="px-6 py-5 bg-gradient-to-br from-slate-50 to-white border-b-2 border-slate-100">
                {/* Top Row - Question Number & Actions */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {/* Question Number Badge - Prominent like in VisualQuestionBank */}
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                        <div className="text-center">
                          <div className="text-xs font-bold text-slate-400">Q</div>
                          <div className="text-2xl font-black leading-none">{currentQuestionIndex + 1}</div>
                        </div>
                      </div>
                      <div className="h-10 w-px bg-slate-300"></div>
                    </div>

                    {/* Topic */}
                    <div>
                      <p className="text-sm font-medium text-slate-500">{currentQuestion.topic}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Row - All Metadata Tags */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Difficulty */}
                  <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                    currentQuestion.difficulty === 'Hard' ? 'bg-rose-100 text-rose-700' :
                    currentQuestion.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {currentQuestion.difficulty}
                  </span>

                  {/* Marks */}
                  <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">
                    {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
                  </span>

                  {/* Bloom's Taxonomy */}
                  {currentQuestion.blooms && (
                    <span className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg flex items-center gap-1.5">
                      <Brain size={13} />
                      {currentQuestion.blooms}
                    </span>
                  )}
                </div>
              </div>

              {/* Question Body */}
              <div className="px-5 py-6">
                {/* Question Text */}
                <div className="text-xl font-bold text-slate-900 leading-relaxed mb-6">
                  <RenderWithMath text={currentQuestion.text} showOptions={false} />
                </div>

                {/* Diagram (if present) */}
                {currentQuestion.hasVisualElement && currentQuestion.diagramUrl && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <img
                      src={currentQuestion.diagramUrl}
                      alt="Question diagram"
                      className="max-w-full h-auto mx-auto"
                    />
                  </div>
                )}

                {/* MCQ Options - 2 Column Grid like VisualQuestionBank */}
                {currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {currentQuestion.options.map((option, idx) => {
                      const isSelected = responses.get(currentQuestion.id)?.selectedOption === idx;
                      const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D

                      return (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(idx)}
                          className={`relative flex items-start gap-3.5 px-5 py-4 rounded-2xl border border-slate-200 transition-all text-left ${
                            isSelected
                              ? 'bg-blue-50 shadow-md ring-2 ring-blue-500'
                              : 'bg-white shadow-sm hover:shadow-lg hover:ring-2 hover:ring-slate-300'
                          } cursor-pointer active:scale-[0.99]`}
                        >
                          {/* Option Label */}
                          <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg transition-all ${
                            isSelected
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {optionLabel}
                          </div>

                          {/* Option Text */}
                          <div className="flex-1 text-base font-medium text-slate-800 pt-2">
                            <RenderWithMath text={option} showOptions={false} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleMarkForReview}
                className={`px-4 py-3 rounded-lg text-sm font-black transition-all ${
                  responses.get(currentQuestion.id)?.markedForReview
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-white border-2 border-slate-200 text-slate-900 hover:border-slate-300'
                }`}
              >
                <Flag size={16} className="inline mr-2" />
                {responses.get(currentQuestion.id)?.markedForReview ? 'Unmark' : 'Mark for Review'}
              </button>

              <button
                onClick={handleClearResponse}
                disabled={!responses.get(currentQuestion.id)?.selectedOption}
                className="px-4 py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-lg text-sm font-black hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={16} className="inline mr-2" />
                Clear Response
              </button>

              <div className="flex-1" />

              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-lg text-sm font-black hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} className="inline mr-2" />
                Previous
              </button>

              {currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={handleSubmitClick}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg text-sm font-black hover:bg-emerald-700 transition-all"
                >
                  Submit Test
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-4 py-3 bg-slate-900 text-white rounded-lg text-sm font-black hover:bg-slate-800 transition-all"
                >
                  Next
                  <ChevronRight size={16} className="inline ml-2" />
                </button>
              )}
            </div>
          </div>

          {/* Question Navigator Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-slate-200 rounded-xl p-5 sticky top-24">
              <h3 className="font-black text-sm text-slate-900 mb-4 uppercase tracking-wider">
                Question Navigator
              </h3>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 mb-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-500 rounded" />
                  <span className="text-xs font-medium text-slate-600">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-500 rounded" />
                  <span className="text-xs font-medium text-slate-600">Marked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
                  <span className="text-xs font-medium text-slate-600">Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-100 border border-slate-300 rounded" />
                  <span className="text-xs font-medium text-slate-600">Not Visited</span>
                </div>
              </div>

              {/* Question Grid */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((q, idx) => {
                  const status = getQuestionStatus(q.id);
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => handleQuestionJump(idx)}
                      className={`aspect-square rounded-lg text-xs font-black transition-all ${
                        isCurrent
                          ? 'ring-2 ring-primary-500 ring-offset-2'
                          : ''
                      } ${getStatusColor(status)}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitClick}
                className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-black hover:bg-emerald-700 transition-all"
              >
                Submit Test
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={24} className="text-amber-600" />
              </div>
              <h2 className="font-black text-xl text-slate-900">Confirm Submission</h2>
            </div>

            <p className="text-slate-600 font-medium mb-6">
              Are you sure you want to submit the test? You won't be able to change your answers after submission.
            </p>

            <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Answered:</span>
                <span className="font-black text-slate-900">{answeredCount}/{questions.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Unanswered:</span>
                <span className="font-black text-red-600">{unansweredCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Marked for review:</span>
                <span className="font-black text-amber-600">{markedCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-lg text-sm font-black hover:border-slate-300 transition-all"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-black hover:bg-emerald-700 transition-all"
              >
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestInterface;
