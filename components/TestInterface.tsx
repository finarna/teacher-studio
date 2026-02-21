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
  onSubmit?: (responses: TestResponse[]) => void;
  onExit: () => void;
  mode?: 'take' | 'review'; // 'take' for taking test, 'review' for viewing results
  completedResponses?: TestResponse[]; // For review mode
  onViewAnalysis?: () => void; // Optional callback to view detailed analysis (PerformanceAnalysis)
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
  onExit,
  mode = 'take',
  completedResponses = [],
  onViewAnalysis
}) => {
  const isReviewMode = mode === 'review';

  // Initialize responses from completedResponses in review mode
  const initializeResponses = (): Map<string, QuestionResponse> => {
    if (isReviewMode && completedResponses.length > 0) {
      const map = new Map<string, QuestionResponse>();
      completedResponses.forEach(resp => {
        map.set(resp.questionId, {
          questionId: resp.questionId,
          selectedOption: resp.selectedOption,
          markedForReview: resp.markedForReview,
          timeSpent: resp.timeSpent || 0
        });
      });
      return map;
    }
    return new Map();
  };

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, QuestionResponse>>(initializeResponses());
  const [showNavigator, setShowNavigator] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(attempt.durationMinutes * 60); // in seconds
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const currentQuestion = questions[currentQuestionIndex];

  // Guard: If no current question, show error state
  if (!currentQuestion) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white border-2 border-red-200 rounded-xl">
          <div className="text-red-600 mb-4">
            <AlertTriangle size={48} className="mx-auto" />
          </div>
          <h2 className="font-black text-xl text-slate-900 mb-2">No Questions Available</h2>
          <p className="text-slate-600 mb-4">Unable to load test questions.</p>
          <button
            onClick={onExit}
            className="px-6 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Timer effect - only in take mode
  useEffect(() => {
    if (isReviewMode) return; // No timer in review mode

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
  }, [isReviewMode]);

  // Track time spent on current question - only in take mode
  useEffect(() => {
    if (isReviewMode) return; // No time tracking in review mode

    setQuestionStartTime(Date.now());

    return () => {
      if (currentQuestion) {
        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
        updateResponse(currentQuestion.id, { timeSpent });
      }
    };
  }, [currentQuestionIndex, isReviewMode]);

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
    if (isReviewMode) return; // Prevent selection in review mode
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
    if (!onSubmit) return; // No submission in review mode
    const testResponses = convertResponsesToTestResponses();
    onSubmit(testResponses);
  };

  const handleSubmitClick = () => {
    if (isReviewMode) return; // No submission in review mode
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    if (!onSubmit) return; // No submission in review mode
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
  const getQuestionStatus = (questionId: string): 'answered' | 'marked' | 'unattempted' | 'correct' | 'incorrect' | 'skipped' => {
    const response = responses.get(questionId);

    // Review mode: show correct/incorrect/skipped
    if (isReviewMode) {
      const question = questions.find(q => q.id === questionId);
      if (!question) return 'unattempted';

      if (response?.selectedOption === undefined) return 'skipped';
      return response.selectedOption === question.correctOptionIndex ? 'correct' : 'incorrect';
    }

    // Take mode: show answered/marked/unattempted (combines not-answered and not-visited)
    if (!response || response.selectedOption === undefined) {
      // If marked for review but not answered, show as marked
      if (response?.markedForReview) return 'marked';
      // Otherwise show as unattempted (grey)
      return 'unattempted';
    }
    // Has an answer - check if also marked
    if (response.markedForReview) return 'marked';
    return 'answered';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      // Review mode statuses
      case 'correct': return 'bg-emerald-500 text-white border-emerald-600';
      case 'incorrect': return 'bg-red-500 text-white border-red-600';
      case 'skipped': return 'bg-slate-300 text-slate-700 border-slate-400';

      // Take mode statuses
      case 'answered': return 'bg-emerald-500 text-white border-emerald-600';
      case 'marked': return 'bg-white text-slate-900 border-2 border-amber-500'; // No background, flag icon shown
      case 'unattempted': return 'bg-slate-200 text-slate-700 border-slate-300'; // Grey for all unattempted
      default: return 'bg-slate-200 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="h-screen bg-slate-50 font-instrument text-slate-900 flex flex-col overflow-hidden">
      {/* Compact Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            {/* Test Info */}
            <div className="flex items-center gap-3">
              {/* Back Button - Show in Review Mode */}
              {isReviewMode && (
                <button
                  onClick={onExit}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-md text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}
              <div>
                <h1 className="font-bold text-sm text-slate-900">{attempt.testName}</h1>
                <p className="text-[10px] text-slate-500 font-medium">
                  {attempt.subject} • {attempt.examContext}
                </p>
              </div>
            </div>

            {/* Compact Timer or Review Mode Indicator */}
            <div className="flex items-center gap-2">
              {isReviewMode ? (
                <>
                  <div className="px-4 py-1.5 rounded-lg font-sans text-sm font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Review Mode
                  </div>
                  {onViewAnalysis && (
                    <button
                      onClick={onViewAnalysis}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-bold hover:bg-purple-700 transition-all"
                    >
                      <Brain size={14} className="inline mr-1.5" />
                      Detailed Analysis
                    </button>
                  )}
                </>
              ) : (
                <div className={`px-4 py-1.5 rounded-lg font-mono text-lg font-black ${getTimerColor()} border`}>
                  <Clock size={16} className="inline mr-1.5" />
                  {formatTime(timeRemaining)}
                </div>
              )}
            </div>

            {/* Navigator Toggle */}
            <button
              onClick={() => setShowNavigator(!showNavigator)}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-bold hover:bg-slate-800 transition-all"
            >
              <Grid3x3 size={14} className="inline mr-1.5" />
              Navigator
            </button>
          </div>

          {/* Compact Progress Bar */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                  Progress
                </span>
                <span className="text-[10px] font-bold text-slate-900">
                  {answeredCount}/{questions.length} answered
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              <div className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="font-bold">{answeredCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Flag size={12} className="text-amber-500" />
                <span className="font-bold">{markedCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Circle size={12} className="text-slate-400" />
                <span className="font-bold">{unansweredCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Main Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-3 py-3 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Compact Question Card */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {/* Compact Question Header */}
              <div className="px-3 py-2.5 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                {/* Top Row - Question Number & Actions */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {/* Compact Question Number Badge */}
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-lg flex items-center justify-center shadow-md">
                        <div className="text-center">
                          <div className="text-[9px] font-bold text-slate-400">Q</div>
                          <div className="text-lg font-black leading-none">{currentQuestionIndex + 1}</div>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-slate-300"></div>
                    </div>

                    {/* Topic */}
                    {currentQuestion.topic && (
                      <div>
                        <p className="text-xs font-medium text-slate-500">{currentQuestion.topic}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row - All Metadata Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Difficulty */}
                  {currentQuestion.difficulty && (
                    <span className={`px-2 py-1 text-[10px] font-bold rounded ${
                      currentQuestion.difficulty === 'Hard' ? 'bg-rose-100 text-rose-700' :
                      currentQuestion.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {currentQuestion.difficulty}
                    </span>
                  )}

                  {/* Marks */}
                  {currentQuestion.marks && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">
                      {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
                    </span>
                  )}

                  {/* Bloom's Taxonomy */}
                  {currentQuestion.blooms && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded flex items-center gap-1">
                      <Brain size={11} />
                      {currentQuestion.blooms}
                    </span>
                  )}
                </div>
              </div>

              {/* Compact Question Body */}
              <div className="px-3 py-3">
                {/* Question Text */}
                <div className="text-base font-bold text-slate-900 leading-relaxed mb-4">
                  <RenderWithMath text={currentQuestion.text} showOptions={false} />
                </div>

                {/* Diagram (if present) */}
                {currentQuestion.hasVisualElement && currentQuestion.diagramUrl && (
                  <div className="mb-3 p-2 bg-slate-50 rounded border border-slate-200">
                    <img
                      src={currentQuestion.diagramUrl}
                      alt="Question diagram"
                      className="max-w-full h-auto mx-auto"
                    />
                  </div>
                )}

                {/* Compact MCQ Options - 2 Column Grid */}
                {currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {currentQuestion.options.map((option, idx) => {
                      const isSelected = responses.get(currentQuestion.id)?.selectedOption === idx;
                      const isCorrect = currentQuestion.correctOptionIndex === idx;
                      const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D

                      // Review mode styling
                      const getReviewModeStyle = () => {
                        if (!isReviewMode) {
                          return isSelected
                            ? 'bg-blue-50 shadow-md ring-2 ring-blue-500 border-blue-500'
                            : 'bg-white shadow-sm hover:shadow-md hover:ring-1 hover:ring-slate-300 border-slate-200';
                        }

                        // Review mode: highlight correct answer in green
                        if (isCorrect) {
                          return 'bg-emerald-50 border-2 border-emerald-500 shadow-md';
                        }
                        // Review mode: highlight selected wrong answer in red
                        if (isSelected && !isCorrect) {
                          return 'bg-red-50 border-2 border-red-500 shadow-md';
                        }
                        // Other options in review mode
                        return 'bg-white border border-slate-200';
                      };

                      const getLabelStyle = () => {
                        if (!isReviewMode) {
                          return isSelected
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700';
                        }

                        // Review mode label colors
                        if (isCorrect) {
                          return 'bg-emerald-500 text-white shadow-sm';
                        }
                        if (isSelected && !isCorrect) {
                          return 'bg-red-500 text-white shadow-sm';
                        }
                        return 'bg-slate-100 text-slate-700';
                      };

                      return (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(idx)}
                          disabled={isReviewMode}
                          className={`relative flex items-start gap-2 px-3 py-2.5 rounded-lg border transition-all text-left ${
                            getReviewModeStyle()
                          } ${!isReviewMode ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'}`}
                        >
                          {/* Option Label */}
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                            getLabelStyle()
                          }`}>
                            {optionLabel}
                          </div>

                          {/* Option Text */}
                          <div className="flex-1 text-sm font-medium text-slate-800 pt-1">
                            <RenderWithMath text={option} showOptions={false} />
                          </div>

                          {/* Review mode indicators */}
                          {isReviewMode && (
                            <>
                              {isCorrect && (
                                <Check size={18} className="flex-shrink-0 text-emerald-600 mt-1" />
                              )}
                              {isSelected && !isCorrect && (
                                <X size={18} className="flex-shrink-0 text-red-600 mt-1" />
                              )}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Solution Section - Review Mode Only */}
                {isReviewMode && currentQuestion.solutionSteps && currentQuestion.solutionSteps.length > 0 && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
                      <Brain size={16} className="text-indigo-600" />
                      Solution & Explanation
                    </h4>
                    <div className="space-y-3">
                      {currentQuestion.solutionSteps.map((step: any, idx: number) => (
                        <div key={idx} className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            {step.title && (
                              <div className="text-xs font-bold text-slate-900 mb-1">{step.title}</div>
                            )}
                            <div className="text-sm text-slate-700">
                              <RenderWithMath text={step.content || step} showOptions={false} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mastery Material */}
                    {currentQuestion.masteryMaterial && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                        {currentQuestion.masteryMaterial.coreConcept && (
                          <div>
                            <div className="text-xs font-black text-emerald-700 mb-1">Core Concept</div>
                            <div className="text-sm text-slate-700">
                              <RenderWithMath text={currentQuestion.masteryMaterial.coreConcept} showOptions={false} />
                            </div>
                          </div>
                        )}
                        {currentQuestion.masteryMaterial.logicReasoning && (
                          <div>
                            <div className="text-xs font-black text-blue-700 mb-1">Logic & Reasoning</div>
                            <div className="text-sm text-slate-700">
                              <RenderWithMath text={currentQuestion.masteryMaterial.logicReasoning} showOptions={false} />
                            </div>
                          </div>
                        )}
                        {currentQuestion.masteryMaterial.memoryTrigger && (
                          <div>
                            <div className="text-xs font-black text-purple-700 mb-1">Memory Trigger</div>
                            <div className="text-sm text-slate-700">
                              <RenderWithMath text={currentQuestion.masteryMaterial.memoryTrigger} showOptions={false} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Exam Tips */}
                    {currentQuestion.examTip && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                        <div className="text-xs font-black text-amber-800 mb-1">Exam Tip</div>
                        <div className="text-sm text-amber-900">
                          <RenderWithMath text={currentQuestion.examTip} showOptions={false} />
                        </div>
                      </div>
                    )}

                    {/* Key Formulas */}
                    {currentQuestion.keyFormulas && currentQuestion.keyFormulas.length > 0 && (
                      <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded">
                        <div className="text-xs font-black text-indigo-800 mb-2">Key Formulas</div>
                        <div className="space-y-1">
                          {currentQuestion.keyFormulas.map((formula: string, idx: number) => (
                            <div key={idx} className="text-sm text-indigo-900 font-mono">
                              <RenderWithMath text={formula} showOptions={false} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Common Pitfalls */}
                    {currentQuestion.pitfalls && currentQuestion.pitfalls.length > 0 && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <div className="text-xs font-black text-red-800 mb-2">Common Pitfalls</div>
                        <ul className="space-y-1 list-disc list-inside">
                          {currentQuestion.pitfalls.map((pitfall: string, idx: number) => (
                            <li key={idx} className="text-sm text-red-900">
                              <RenderWithMath text={pitfall} showOptions={false} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Compact Action Buttons */}
            <div className="flex items-center justify-between gap-2">
              {!isReviewMode && (
                <>
                  <button
                    onClick={handleMarkForReview}
                    className={`px-3 py-2 rounded-md text-xs font-bold transition-all ${
                      responses.get(currentQuestion.id)?.markedForReview
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-white border border-slate-200 text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <Flag size={13} className="inline mr-1.5" />
                    {responses.get(currentQuestion.id)?.markedForReview ? 'Unmark' : 'Mark for Review'}
                  </button>

                  <button
                    onClick={handleClearResponse}
                    disabled={!responses.get(currentQuestion.id)?.selectedOption}
                    className="px-3 py-2 bg-white border border-slate-200 text-slate-900 rounded-md text-xs font-bold hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X size={13} className="inline mr-1.5" />
                    Clear Response
                  </button>
                </>
              )}

              {isReviewMode && (
                <button
                  onClick={onExit}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-md text-xs font-bold transition-all"
                >
                  <ChevronLeft size={13} className="inline mr-1.5" />
                  Exit Review
                </button>
              )}

              <div className="flex-1" />

              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="px-3 py-2 bg-white border border-slate-200 text-slate-900 rounded-md text-xs font-bold hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={13} className="inline mr-1.5" />
                Previous
              </button>

              {!isReviewMode && currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={handleSubmitClick}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md text-xs font-bold hover:bg-emerald-700 transition-all"
                >
                  Submit Test
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="px-3 py-2 bg-slate-900 text-white rounded-md text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={13} className="inline ml-1.5" />
                </button>
              )}
            </div>
          </div>

          {/* Compact Question Navigator Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-lg p-3 sticky top-20">
              <h3 className="font-bold text-xs text-slate-900 mb-3 uppercase tracking-wide">
                Question Navigator
              </h3>

              {/* Compact Legend */}
              {isReviewMode ? (
                <div className="grid grid-cols-2 gap-1.5 mb-3 pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-emerald-500 rounded" />
                    <span className="text-[10px] font-medium text-slate-600">Correct</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span className="text-[10px] font-medium text-slate-600">Incorrect</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-slate-300 rounded" />
                    <span className="text-[10px] font-medium text-slate-600">Skipped</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 mb-3 pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-emerald-500 rounded" />
                    <span className="text-[10px] font-medium text-slate-600">Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-amber-500 rounded flex items-center justify-center">
                      <Flag size={8} className="text-amber-500" strokeWidth={3} />
                    </div>
                    <span className="text-[10px] font-medium text-slate-600">Marked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-slate-200 rounded" />
                    <span className="text-[10px] font-medium text-slate-600">Unattempted</span>
                  </div>
                </div>
              )}

              {/* Compact Question Grid */}
              <div className="grid grid-cols-5 gap-1.5 mb-3">
                {questions.map((q, idx) => {
                  const status = getQuestionStatus(q.id);
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => handleQuestionJump(idx)}
                      className={`aspect-square rounded-md text-sm font-bold transition-all relative ${
                        isCurrent
                          ? 'ring-2 ring-primary-500 ring-offset-1'
                          : ''
                      } ${getStatusColor(status)}`}
                    >
                      {status === 'marked' && (
                        <Flag size={10} className="absolute top-0.5 right-0.5 text-amber-500" strokeWidth={3} />
                      )}
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Compact Submit Button - Only in Take Mode */}
              {!isReviewMode && (
                <button
                  onClick={handleSubmitClick}
                  className="w-full px-3 py-2 bg-emerald-600 text-white rounded-md text-xs font-bold hover:bg-emerald-700 transition-all"
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal - Only in Take Mode */}
      {!isReviewMode && showSubmitConfirm && (
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
