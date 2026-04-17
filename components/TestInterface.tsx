import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Brain,
  LogOut,
  Zap,
  TrendingUp,
  Target,
  CircleAlert,
  CircleMinus,
  Sparkles,
  CircleX,
  RefreshCcw,
  BarChart3,
  Lightbulb,
  Maximize2,
  Info
} from 'lucide-react';
import type { AnalyzedQuestion, TestAttempt, TestResponse, ExamContext } from '../types';
import { RenderWithMath } from './MathRenderer';
import RichMarkdownRenderer from './RichMarkdownRenderer';
import { getExamConfig } from '../config/exams';

interface TestInterfaceProps {
  attempt: TestAttempt;
  questions: AnalyzedQuestion[];
  onSubmit?: (responses: TestResponse[]) => void;
  onExit: () => void;
  mode?: 'take' | 'review'; // 'take' for taking test, 'review' for viewing results
  completedResponses?: TestResponse[]; // For review mode
  onViewAnalysis?: () => void; // Optional callback to view detailed analysis (PerformanceAnalysis)
  isVaultMode?: boolean; // NEW: Force vault mode UI
}

interface QuestionResponse {
  questionId: string;
  selectedOption?: number;
  isCorrect?: boolean;
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
  onViewAnalysis,
  isVaultMode: isVaultModeProp
}) => {
  const isReviewMode = mode === 'review';
  const isVaultMode = isVaultModeProp ?? ((attempt as any).isOfficialBlueprint || (attempt as any).isBlueprint || (attempt as any).aiReport?.isBlueprint || (attempt as any).isVaultPractice || false);

  // Initialize responses from completedResponses in review mode
  const initializeResponses = (): Map<string, QuestionResponse> => {
    if (isReviewMode && completedResponses.length > 0) {
      const map = new Map<string, QuestionResponse>();
      completedResponses.forEach(resp => {
        map.set(resp.questionId, {
          questionId: resp.questionId,
          selectedOption: resp.selectedOption,
          isCorrect: resp.isCorrect,
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
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  
  // Failsafe: Default to 80 minutes if durationMinutes is missing or NaN
  const initialDuration = Number(attempt.durationMinutes) || (attempt as any).duration_minutes || 80;
  const [timeRemaining, setTimeRemaining] = useState(initialDuration * 60);
  
  const [showMasteryBriefing, setShowMasteryBriefing] = useState(false);
  const [showEnlargedSketch, setShowEnlargedSketch] = useState(false);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const mainScrollRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const testYear = currentQuestion?.year || currentQuestion?.exam_year || (attempt.createdAt ? new Date(attempt.createdAt).getFullYear().toString() : '');

  // Diagnostics: Log attempt data to identify mapping issues
  useEffect(() => {
    console.log('🧪 [TestInterface] Attempt Data:', {
      id: attempt.id,
      durationMinutes: attempt.durationMinutes,
      duration_minutes: (attempt as any).duration_minutes,
      status: attempt.status,
      testName: attempt.testName,
      isReviewMode,
      initialDurationCalculated: initialDuration
    });
  }, [attempt.id, isReviewMode]);

  // Sync timer if duration becomes available later (e.g. state update)
  useEffect(() => {
    if (isNaN(timeRemaining) || timeRemaining === 0) {
      const newDuration = Number(attempt.durationMinutes) || (attempt as any).duration_minutes;
      if (newDuration && !isNaN(newDuration)) {
        setTimeRemaining(newDuration * 60);
      }
    }
  }, [attempt.durationMinutes, (attempt as any).duration_minutes]);

  // Debug: Log current question fields (only first question to avoid spam)
  if (currentQuestion && currentQuestionIndex === 0) {
    console.log('[TestInterface] Question 1 Fields:', {
      id: currentQuestion.id,
      aiReasoning: currentQuestion.aiReasoning,
      historicalPattern: currentQuestion.historicalPattern,
      examTip: currentQuestion.examTip,
      masteryMaterial: currentQuestion.masteryMaterial,
      allKeys: Object.keys(currentQuestion)
    });
  }

  // Guard: If no current question, show error state
  if (!currentQuestion) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white border-2 border-amber-200 rounded-2xl max-w-md shadow-lg">
          <div className="text-amber-500 mb-4">
            <AlertTriangle size={48} className="mx-auto" />
          </div>
          <h2 className="font-black text-xl text-slate-900 mb-2">
            {isReviewMode ? 'Review Unavailable' : 'No Questions Available'}
          </h2>
          <p className="text-slate-600 mb-2 text-sm leading-relaxed">
            {isReviewMode
              ? 'This test was generated before question snapshots were introduced. Questions from older AI-generated tests cannot be recovered for review.'
              : 'Unable to load test questions. Please try again.'}
          </p>
          {isReviewMode && (
            <p className="text-slate-500 text-xs mb-5 bg-slate-50 rounded-lg p-3">
              💡 All <strong>new</strong> tests you create will support full review & re-engagement.
            </p>
          )}
          <button
            onClick={onExit}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            ← Go Back
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

  // Auto-scroll navigator to current question
  useEffect(() => {
    const activeBtn = document.getElementById(`nav-q-${currentQuestionIndex}`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentQuestionIndex]);

  // Scroll to top when walkthrough modal opens
  useEffect(() => {
    if (showMasteryBriefing) {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      modalScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [showMasteryBriefing]);

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

    // NEET Section B limit check
    if (attempt.examContext === 'NEET' && currentQuestion.section === 'Section B') {
      const subject = currentQuestion.subject;
      const responsesInSubjectSectionB = questions
        .filter(q => q.subject === subject && q.section === 'Section B')
        .filter(q => {
          const r = responses.get(q.id);
          // Don't count current question if it's already answered (we're just changing the answer)
          if (q.id === currentQuestion.id && r?.selectedOption !== undefined) return false;
          return r?.selectedOption !== undefined;
        }).length;

      if (responsesInSubjectSectionB >= 10 && responses.get(currentQuestion.id)?.selectedOption === undefined) {
        alert("Section B Limit Reached: You can only attempt 10 questions in this section for this subject. Please unselect another question in Section B to answer this one.");
        return;
      }
    }

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
      setShowMasteryBriefing(false); // close solution panel when moving away
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setShowMasteryBriefing(false); // close solution panel when moving away
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleQuestionJump = (index: number) => {
    setShowMasteryBriefing(false); // close solution panel when jumping to a different question
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
        marks: typeof q.marks === 'number' ? q.marks : parseInt(q.marks || '0'),
        createdAt: new Date()
      };
    });
  };

  // Calculate stats
  const responseArray = Array.from(responses.values());
  const answeredCount = responseArray.filter(r => r.selectedOption !== undefined).length;
  const unansweredCount = questions.length - answeredCount;
  const markedCount = responseArray.filter(r => r.markedForReview).length;

  // Review mode stats
  const correctCount = isReviewMode ? questions.filter(q => {
    const r = responses.get(q.id);
    return r?.isCorrect === true;
  }).length : 0;

  const incorrectCount = isReviewMode ? questions.filter(q => {
    const r = responses.get(q.id);
    return r?.isCorrect === false && r?.selectedOption !== undefined;
  }).length : 0;

  const skippedCount = isReviewMode ? questions.filter(q => {
    const r = responses.get(q.id);
    return !r || r.selectedOption === undefined;
  }).length : 0;

  // Format time
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes} min ${secs.toString().padStart(2, '0')} sec`;
  };

  // Enhanced Timer Colors & UI States
  const getTimerStyles = () => {
    const totalSeconds = attempt.durationMinutes * 60;
    const percentRemaining = (timeRemaining / totalSeconds) * 100;

    if (percentRemaining <= 10) return {
      container: 'border-rose-200 shadow-rose-100/50',
      iconSection: 'bg-rose-500 text-white',
      timeSection: 'bg-white text-rose-600',
      pulse: 'animate-pulse'
    };
    if (percentRemaining <= 25) return {
      container: 'border-amber-200 shadow-amber-100/50',
      iconSection: 'bg-amber-500 text-white',
      timeSection: 'bg-white text-amber-600',
      pulse: ''
    };
    return {
      container: 'border-emerald-100 shadow-emerald-100/30',
      iconSection: 'bg-emerald-500 text-white',
      timeSection: 'bg-white text-emerald-600',
      pulse: ''
    };
  };

  // Question status
  const getQuestionStatus = (questionId: string): 'answered' | 'marked' | 'unattempted' | 'correct' | 'incorrect' | 'skipped' => {
    const response = responses.get(questionId);

    // Review mode: show correct/incorrect/skipped
    if (isReviewMode) {
      const question = questions.find(q => q.id === questionId);
      if (!question) return 'unattempted';

      if (response?.selectedOption === undefined) return 'skipped';
      return response.isCorrect ? 'correct' : 'incorrect';
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
      {/* Ultra-Premium Dense Top Bar */}
      <div className="bg-white/90 backdrop-blur-2xl border-b border-slate-200 sticky top-0 z-50">
        {/* Slim Dynamic Progress Line */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>

        <div className="max-w-[1600px] mx-auto px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            {/* High-Visibility Branding */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={isReviewMode ? onExit : () => setShowQuitConfirm(true)}
                className={`flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-sm border-2
                  ${isReviewMode ? 'bg-white text-slate-900 border-slate-100' : 'bg-rose-50 text-rose-600 border-rose-100'}
                `}
              >
                {isReviewMode ? <ChevronLeft size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
              </button>

              <div className="flex flex-col min-w-0 flex-1">
                <h1 className="font-bold text-[14px] sm:text-[17px] text-slate-700 tracking-tight leading-none mb-1 sm:mb-1.5 truncate">
                  {isVaultMode && isReviewMode ? `Official Paper Walkthrough: ${attempt.testName}` : attempt.testName}
                </h1>
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className="px-2 py-0.5 bg-slate-900 text-white rounded text-[8px] font-black uppercase tracking-widest border border-white/10 shrink-0 shadow-sm">
                    {attempt.subject}-{attempt.examContext}
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                    <CheckCircle2 size={10} className="text-emerald-500 font-bold" />
                    <span className="text-[8px] font-black text-emerald-600 tracking-wider">
                      {answeredCount}/{questions.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Timer & Global Actions */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-4 flex-shrink-0">
              {isReviewMode ? (
                <button
                  onClick={onViewAnalysis || onExit}
                  className="px-3 sm:px-6 py-1.5 sm:py-3 bg-slate-900 hover:bg-slate-800 text-indigo-100 rounded-lg sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10 shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
                >
                  <BarChart3 size={14} className="text-indigo-400" />
                  View Analysis
                </button>
              ) : (
                (() => {
                  const styles = getTimerStyles();
                  return (
                    <div className={`flex items-center rounded-lg sm:rounded-2xl border overflow-hidden shadow-lg transition-all duration-500 bg-white ${styles.container} ${styles.pulse}`}>
                      <div className={`px-2 sm:px-3 py-1.5 sm:py-3 ${styles.iconSection} flex items-center justify-center`}>
                        <Clock size={15} strokeWidth={3} />
                      </div>
                      <div className={`px-2.5 sm:px-5 py-1.5 sm:py-3 font-mono text-[12px] sm:text-[16px] font-black ${styles.timeSection} tracking-tight sm:tracking-normal`}>
                        {formatTime(timeRemaining)}
                      </div>
                    </div>
                  );
                })()
              )}

              {!isReviewMode && (
                <button
                  onClick={handleSubmitClick}
                  className="group relative flex px-3 sm:px-6 py-1.5 sm:py-3 bg-slate-900 overflow-hidden rounded-lg sm:rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-slate-900/10 border border-white/5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center gap-2 sm:gap-2.5">
                    <CheckCircle2 size={12} strokeWidth={3} className="text-white sm:hidden" />
                    <div className="hidden sm:flex items-center justify-center w-6 h-6 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                      <CheckCircle2 size={14} strokeWidth={3} className="text-white" />
                    </div>
                    <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] text-white">
                      Finish<span className="hidden sm:inline"> Test</span>
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compact Main Content */}
      <div
        ref={mainScrollRef}
        className="flex-1 max-w-[1600px] mx-auto w-full px-3 py-3 lg:pb-3 pb-32 space-y-4 overflow-auto no-scrollbar"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Question Card Optimized for Content Height */}
            <div className="bg-white border-x-0 sm:border-2 border-slate-100 sm:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/20 -mx-4 sm:mx-0 relative group/card flex flex-col min-h-[500px]">
              {/* Enhanced Question Header */}
              <div className="px-5 py-4 bg-gradient-to-br from-slate-50/80 to-white border-b border-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    {/* Compact Badge */}
                    <div className="relative w-10 h-10 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.1)] group-hover/card:scale-105 transition-transform duration-500">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-indigo-500" />
                      <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">QUEST</span>
                      <span className="text-lg font-black leading-none">{currentQuestionIndex + 1}</span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[10px] font-extrabold text-primary-500 uppercase tracking-[0.2em]">{currentQuestion.topic || 'General Assessment'}</h3>
                        {(currentQuestion.subject || currentQuestion.section) && (
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all duration-300 ${(currentQuestion.section || '').includes('Section B')
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-slate-900 text-slate-100 border-slate-700'
                            }`}>
                            {currentQuestion.subject ? `${currentQuestion.subject.toUpperCase().substring(0, 3)}-` : ''}
                            {currentQuestion.section?.replace(/Section\s*/i, '') || 'A'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {currentQuestion.difficulty && (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border
                            ${currentQuestion.difficulty === 'Hard' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                              currentQuestion.difficulty === 'Moderate' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                'bg-emerald-50 border-emerald-100 text-emerald-600'
                            }`}>
                            {currentQuestion.difficulty === 'Hard' ? 'Hard' : currentQuestion.difficulty === 'Moderate' ? 'Medium' : 'Easy'}
                          </span>
                        )}
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{currentQuestion.marks} MARKS</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isReviewMode && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={handleMarkForReview}
                          className={`px-3 sm:px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border-2 ${responses.get(currentQuestion.id)?.markedForReview
                            ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                            }`}
                        >
                          <Flag size={12} strokeWidth={3} className={responses.get(currentQuestion.id)?.markedForReview ? 'fill-white' : ''} />
                          <span className="hidden xs:inline-block sm:inline-block">{responses.get(currentQuestion.id)?.markedForReview ? 'Flagged' : 'Flag'}</span>
                        </button>

                        <button
                          onClick={handleClearResponse}
                          disabled={!responses.get(currentQuestion.id)?.selectedOption && !responses.get(currentQuestion.id)?.markedForReview}
                          className="px-3 sm:px-4 py-2 bg-white border-2 border-slate-100 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-slate-600 hover:border-slate-200 transition-all disabled:opacity-30 disabled:grayscale flex items-center gap-1.5"
                        >
                          <RefreshCcw size={12} strokeWidth={3} />
                          <span className="hidden xs:inline-block sm:inline-block">Clear</span>
                        </button>
                      </div>
                    )}

                    {/* Status Indicator */}
                    {isReviewMode && (!isVaultMode || getQuestionStatus(currentQuestion.id) !== 'skipped') && (
                      <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 border shadow-sm ${getQuestionStatus(currentQuestion.id) === 'correct'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : getQuestionStatus(currentQuestion.id) === 'incorrect'
                          ? 'bg-rose-50 border-rose-100 text-rose-700'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                        {getQuestionStatus(currentQuestion.id) === 'correct' ? <CheckCircle2 size={12} strokeWidth={3} /> :
                          getQuestionStatus(currentQuestion.id) === 'incorrect' ? <CircleX size={12} strokeWidth={3} /> : <CircleMinus size={12} strokeWidth={3} />}
                        <span className="text-[8px] font-black uppercase tracking-widest">
                          {getQuestionStatus(currentQuestion.id) === 'correct' ? 'Correct' : getQuestionStatus(currentQuestion.id) === 'incorrect' ? 'Incorrect' : 'Skipped'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pro-Clean Question Body */}
              <div className="px-5 py-4 flex-1">
                <div className="bg-slate-50/40 border border-slate-100/50 rounded-[2rem] p-5 mb-5 group-hover/card:bg-slate-50/60 transition-colors duration-500">
                  <div className="text-lg sm:text-xl font-bold text-slate-700 leading-relaxed tracking-tight font-outfit">
                    <RichMarkdownRenderer text={currentQuestion.text} textSize="text-lg sm:text-xl" />
                  </div>
                </div>

                {/* Diagrams + Options — computed together to share image-classification logic.
                     Heuristic (applied per question):
                       extractedImages.length === options.length     → all images are option diagrams
                       extractedImages.length === options.length + 1 → [0] is question diagram, rest are option diagrams
                       otherwise                                      → all images are question diagrams */}
                {(() => {
                  const allImgs: string[] = (currentQuestion as any).extractedImages || [];
                  const opts: string[] = currentQuestion.options || [];
                  const optCount = opts.length;

                  let questionImgs: string[] = [];
                  let optionImgs: string[] = [];
                  if (allImgs.length > 0 && optCount > 0 && allImgs.length === optCount) {
                    optionImgs = allImgs;
                  } else if (allImgs.length > 0 && optCount > 0 && allImgs.length === optCount + 1) {
                    questionImgs = [allImgs[0]];
                    optionImgs = allImgs.slice(1);
                  } else {
                    questionImgs = allImgs;
                  }

                  const hasQuestionDiagram = !!(currentQuestion.diagramUrl || currentQuestion.imageUrl || questionImgs.length > 0);

                  return (
                    <>
                      {/* Diagram area */}
                      {hasQuestionDiagram && (
                        <div className="mb-4 p-3 bg-white/50 border border-slate-200 rounded-2xl shadow-sm space-y-2">
                          {(currentQuestion.diagramUrl || currentQuestion.imageUrl) && (
                            <img
                              src={currentQuestion.diagramUrl || currentQuestion.imageUrl}
                              alt="Question diagram"
                              className="max-w-full h-auto mx-auto rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                              onClick={() => setEnlargedImageUrl(currentQuestion.diagramUrl || currentQuestion.imageUrl || null)}
                            />
                          )}
                          {questionImgs.map((imgSrc, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={imgSrc}
                              alt={`Question diagram${questionImgs.length > 1 ? ` ${imgIdx + 1}` : ''}`}
                              className="max-w-full h-auto mx-auto rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                              onClick={() => setEnlargedImageUrl(imgSrc)}
                            />
                          ))}
                          {currentQuestion.visualElementDescription && (
                            <p className="mt-2 text-[10px] text-slate-500 italic text-center font-instrument">
                              {currentQuestion.visualElementDescription}
                            </p>
                          )}
                        </div>
                      )}

                      {/* MCQ Options */}
                      {opts.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 mb-6">
                          {opts.map((option, idx) => {
                            const resp = responses.get(currentQuestion.id);
                            const isSelected = resp?.selectedOption === idx;
                            const isCorrect = (resp?.isCorrect === true && isSelected) || (currentQuestion.correctOptionIndex === idx);
                            const optionLabel = String.fromCharCode(65 + idx);
                            const optImg: string | undefined = optionImgs[idx];

                            const getReviewModeStyle = () => {
                              if (!isReviewMode) {
                                return isSelected
                                  ? 'bg-primary-50/50 ring-4 ring-primary-500/10 border-primary-500 shadow-xl shadow-primary-500/5 z-10'
                                  : 'bg-white hover:bg-slate-50 hover:border-slate-300 border-slate-200 shadow-sm';
                              }
                              if (isCorrect) return 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-500/10 shadow-lg z-10';
                              if (isSelected && !isCorrect) return 'bg-rose-50 border-rose-500 ring-4 ring-rose-500/10 shadow-md grayscale-[0.2]';
                              return 'bg-white border-slate-100 opacity-60';
                            };

                            const getLabelStyle = () => {
                              if (!isReviewMode) {
                                return isSelected
                                  ? 'bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.3)] scale-110'
                                  : 'bg-white text-slate-400 border-2 border-slate-100 group-hover:border-slate-200 group-hover:bg-slate-50';
                              }
                              if (isCorrect) return 'bg-emerald-500 text-white shadow-emerald-500/30 shadow-lg scale-110';
                              if (isSelected && !isCorrect) return 'bg-rose-500 text-white shadow-rose-500/30';
                              return 'bg-white text-slate-300 border-2 border-slate-100';
                            };

                            return (
                              <button
                                key={idx}
                                onClick={() => handleOptionSelect(idx)}
                                disabled={isReviewMode}
                                className={`relative flex items-start gap-4 px-4 py-2.5 rounded-[1.25rem] border-2 transition-all text-left group ${getReviewModeStyle()
                                  } ${!isReviewMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
                              >
                                {/* Option Label */}
                                <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-base transition-all mt-0.5 ${getLabelStyle()}`}>
                                  {optionLabel}
                                </div>

                                {/* Option Image or Text */}
                                {optImg ? (
                                  <div className="flex-1 flex flex-col gap-1">
                                    <img
                                      src={optImg}
                                      alt={`Option ${optionLabel}`}
                                      className="max-w-full h-auto max-h-40 object-contain rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                                      onClick={(e) => { e.stopPropagation(); setEnlargedImageUrl(optImg); }}
                                    />
                                    {option && option.trim() && option.trim() !== optionLabel && (
                                      <div className={`text-xs font-outfit ${!isReviewMode ? 'text-slate-500' : (isCorrect || isSelected ? 'text-slate-600' : 'text-slate-400')}`}>
                                        <RichMarkdownRenderer text={option} />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className={`flex-1 font-outfit font-semibold text-[15px] sm:text-[16px] tracking-tight ${!isReviewMode ? 'text-slate-600' : (isCorrect || isSelected ? 'text-slate-700' : 'text-slate-400')}`}>
                                    <RichMarkdownRenderer text={option} />
                                  </div>
                                )}

                                {/* Review mode indicators */}
                                {isReviewMode && (isCorrect || isSelected) && (
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {isCorrect && (
                                      <div className="p-2 bg-emerald-100/50 text-emerald-600 rounded-xl">
                                        <Check size={20} className="stroke-[4]" />
                                      </div>
                                    )}
                                    {isSelected && !isCorrect && (
                                      <div className="p-2 bg-rose-100/50 text-rose-600 rounded-xl">
                                        <X size={20} className="stroke-[4]" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Mastery Briefing Trigger - Desktop & Mobile */}
                {isReviewMode && (
                  <div className="mt-8 flex flex-col items-center gap-6">
                    {/* Visual Solution Sketch - Archive Exclusive */}
                    {(currentQuestion.sketchSvgUrl || currentQuestion.sketchSvg) && (
                      <div className="w-full max-w-2xl mx-auto">
                        <div className="relative group/sketch">
                          {/* Premium Background Glow */}
                          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-primary-500/20 to-indigo-500/20 rounded-[2.5rem] blur-xl opacity-0 group-hover/sketch:opacity-100 transition-opacity duration-700 pointer-events-none" />

                          <button
                            onClick={() => setShowEnlargedSketch(true)}
                            className="relative w-full bg-white/40 backdrop-blur-md border-2 border-slate-200/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-900/5 transition-all duration-500 group-hover/sketch:border-primary-500/30 group-hover/sketch:shadow-primary-500/10 cursor-zoom-in text-left"
                          >
                            {/* Sketch Header Badge */}
                            <div className="absolute top-4 left-4 z-10 flex items-center justify-between w-[calc(100%-32px)]">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-full shadow-lg">
                                <Sparkles size={10} className="text-amber-400 fill-amber-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Visual Solution</span>
                              </div>

                              <div className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-400 opacity-0 group-hover/sketch:opacity-100 transition-opacity shadow-sm border border-slate-100">
                                <Maximize2 size={14} />
                              </div>
                            </div>

                            {/* The Actual Sketch/Diagram */}
                            <div className="p-8 pt-14 bg-gradient-to-b from-slate-50/50 to-white flex items-center justify-center min-h-[300px]">
                              {currentQuestion.sketchSvgUrl ? (
                                <img
                                  src={currentQuestion.sketchSvgUrl}
                                  alt="Solution visual logic"
                                  className="max-w-full h-auto drop-shadow-2xl transition-transform duration-500 group-hover/sketch:scale-[1.02]"
                                />
                              ) : currentQuestion.sketchSvg ? (
                                <div
                                  dangerouslySetInnerHTML={{ __html: currentQuestion.sketchSvg }}
                                  className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:h-auto drop-shadow-2xl transition-transform duration-500 group-hover/sketch:scale-[1.02]"
                                />
                              ) : null}
                            </div>

                            {/* Contextual Insight Footer */}
                            {(currentQuestion.visualConcept || currentQuestion.visualConcept) && (
                              <div className="px-6 py-4 bg-slate-900/5 border-t border-slate-200/50 flex items-center gap-3 group-hover/sketch:bg-primary-500/5 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                                  <Lightbulb size={14} className="text-amber-500" />
                                </div>
                                <p className="text-[11px] font-bold text-slate-500 leading-tight">
                                  {currentQuestion.visualConcept || "Strategic layout of the solution's core logic."}
                                </p>
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setShowMasteryBriefing(true)}
                      className="group/trigger relative px-8 py-4 bg-slate-900 text-white rounded-full font-black text-[11px] uppercase tracking-[0.25em] flex items-center gap-3 overflow-hidden shadow-2xl shadow-slate-900/40 border border-white/10 active:scale-95 transition-all"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/trigger:translate-x-full transition-transform duration-1000" />
                      <div className="relative flex animate-pulse">
                        <Brain size={14} className="text-indigo-400 relative z-10" />
                        <div className="absolute inset-0 bg-indigo-400/40 blur-md" />
                      </div>
                      {isVaultMode ? 'View Detailed Steps' : "See Mentor's Walkthrough"}
                      <ChevronRight size={14} className="opacity-40 group-hover/trigger:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </div>

              {/* Cognitive Curtain Overlay - Strategic Briefing */}
              {isReviewMode && (
                <div
                  className={`absolute inset-0 bg-white/95 backdrop-blur-xl z-[100] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform flex flex-col
                    ${showMasteryBriefing ? 'translate-y-0 opacity-100' : 'translate-y-[10%] opacity-0 pointer-events-none'}
                  `}
                >
                  {/* Premium Curtain Header - Fixed */}
                  <div className="flex-shrink-0 bg-white/50 border-b border-slate-100 px-6 py-5 flex items-center justify-between shadow-sm z-20">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/10">
                        <Brain size={20} className="text-indigo-400 animate-pulse" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-500 leading-none mb-1.5">Expert Walkthrough</span>
                        <div className="flex items-center gap-3">
                          <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-widest leading-none font-outfit">Strategic Briefing</h2>
                          <span className="px-3 py-1 bg-slate-900 rounded-lg text-xs font-black text-white tracking-widest shadow">Question {currentQuestionIndex + 1}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowMasteryBriefing(false)}
                      className="group/close w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 hover:bg-slate-900 hover:text-white transition-all duration-300 shadow-sm active:scale-90"
                      title="Close Briefing"
                    >
                      <X size={24} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>

                  {/* Curtain Content Area - Separately Scrollable */}
                  <div ref={modalScrollRef} className="flex-1 overflow-y-auto no-scrollbar relative">
                    {/* Ambient Glows */}
                    <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-50/30 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-emerald-50/20 blur-[150px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/4" />

                    <div className="max-w-4xl mx-auto px-5 pt-4 pb-8 sm:px-8 sm:pt-5 space-y-6 relative z-10">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/40 blur-[120px] rounded-full pointer-events-none" />

                      {/* Solution Steps - High-Contrast Timeline */}
                      {(() => {
                        const steps = currentQuestion.solutionSteps || (currentQuestion as any).solution_steps || [];
                        if (!steps || steps.length === 0) return null;
                        return (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                          <div className="space-y-1 sm:space-y-1.5">
                            {steps.map((step: any, idx: number) => (
                              <div key={idx} className="group flex gap-3 sm:gap-4 relative">
                                {idx < steps.length - 1 && (
                                  <div className="absolute top-9 sm:top-10 bottom-[-4px] sm:bottom-[-6px] left-[16px] sm:left-[20px] w-[2px] bg-gradient-to-b from-slate-100 via-white/0 to-transparent group-hover:from-indigo-200 transition-all duration-500" />
                                )}
                                <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-[0.85rem] sm:rounded-[1rem] bg-white border-2 border-slate-100 flex items-center justify-center text-xs font-black text-slate-900 shadow-sm group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-800 transition-all duration-500">
                                  {String(idx + 1).padStart(2, '0')}
                                </div>
                                <div className="flex-1 pt-0.5 sm:pt-1">
                                  {step.title && (
                                    <div className="text-[11px] sm:text-[12px] font-black text-indigo-700/80 font-outfit uppercase tracking-widest mb-0.5 group-hover:translate-x-1 transition-transform duration-500">
                                      {step.title}
                                    </div>
                                  )}
                                  <div className="text-[14px] sm:text-[15px] text-slate-800 leading-[1.6] font-instrument font-medium bg-white p-2.5 sm:p-3 rounded-[1.25rem] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:border-slate-200 group-hover:shadow-md transition-all duration-500">
                                    <RenderWithMath text={step.content || step} showOptions={false} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        );
                      })()}

                      {/* AI Intelligence Matrix - Enhanced Mastery Material */}
                      {(() => {
                        let mastery = currentQuestion.masteryMaterial || (currentQuestion as any).mastery_material;
                        if (typeof mastery === 'string') {
                          try {
                            mastery = JSON.parse(mastery);
                          } catch (e) {
                            mastery = null;
                          }
                        }

                        // Collect all available intelligence fields
                        const aiReasoning = currentQuestion.aiReasoning || mastery?.logic || mastery?.ai_reasoning || mastery?.aiReasoning;
                        const coreConcept = mastery?.coreConcept || mastery?.core_concept;
                        const memoryTrigger = mastery?.memoryTrigger || mastery?.memory_trigger;
                        const historicalPattern = currentQuestion.historicalPattern || mastery?.historicalPattern || mastery?.historical_pattern;
                        const visualPrompt = mastery?.visualPrompt || mastery?.visual_prompt;
                        const commonTrap = mastery?.commonTrap || mastery?.common_trap;
                        const whyItMatters = currentQuestion.whyItMatters || mastery?.whyItMatters || mastery?.why_it_matters;
                        const predictiveInsight = currentQuestion.predictiveInsight || mastery?.predictiveInsight || mastery?.predictive_insight;

                        const hasAnyContent = aiReasoning || coreConcept || memoryTrigger || historicalPattern || visualPrompt || commonTrap || whyItMatters || predictiveInsight;
                        if (!hasAnyContent) return null;

                        return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                          {coreConcept && (
                            <div className="relative p-4 sm:p-5 rounded-[1.5rem] bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-100/50 group overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                                <Target size={60} />
                              </div>
                              <div className="flex items-center gap-2.5 mb-2.5 text-emerald-800">
                                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                                  <Target size={12} className="fill-emerald-500 text-emerald-600" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-900/60">Core Mental Model</span>
                              </div>
                              <div className="text-[14px] font-black text-emerald-950 mb-1.5 font-outfit">Teacher's Insight</div>
                              <div className="text-[12px] text-emerald-900/70 leading-relaxed font-instrument font-medium">
                                <RenderWithMath text={coreConcept} showOptions={false} />
                              </div>
                            </div>
                          )}

                          {aiReasoning && (
                            <div className="relative p-4 sm:p-5 rounded-[1.5rem] bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100/50 group overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                                <Brain size={60} />
                              </div>
                              <div className="flex items-center gap-2.5 mb-2.5 text-indigo-800">
                                <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                                  <Brain size={12} className="text-indigo-600" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-900/60">AI Strategy</span>
                              </div>
                              <div className="text-[14px] font-black text-indigo-950 mb-1.5 font-outfit">Intelligent Reasoning</div>
                              <div className="text-[12px] text-indigo-900/70 leading-relaxed font-instrument font-medium">
                                <RenderWithMath text={aiReasoning} showOptions={false} />
                              </div>
                            </div>
                          )}

                          {memoryTrigger && (
                            <div className="relative p-4 sm:p-5 rounded-[1.5rem] bg-gradient-to-br from-purple-50/50 to-white border border-purple-100/50 group overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                                <Zap size={60} />
                              </div>
                              <div className="flex items-center gap-2.5 mb-2.5 text-purple-800">
                                <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                                  <Zap size={12} className="fill-purple-500 text-purple-600" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-900/60">Memory Trick</span>
                              </div>
                              <div className="text-[14px] font-black text-purple-950 mb-1.5 font-outfit">Quick Recall</div>
                              <div className="text-[12px] text-purple-900/70 leading-relaxed font-instrument font-medium">
                                <RenderWithMath text={memoryTrigger} showOptions={false} />
                              </div>
                            </div>
                          )}

                          {historicalPattern && (
                            <div className="relative p-4 sm:p-5 rounded-[1.5rem] bg-gradient-to-br from-blue-50/50 to-white border border-blue-100/50 group overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                                <TrendingUp size={60} />
                              </div>
                              <div className="flex items-center gap-2.5 mb-2.5 text-blue-800">
                                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <TrendingUp size={12} className="text-blue-600" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-900/60">Pattern Recognition</span>
                              </div>
                              <div className="text-[14px] font-black text-blue-950 mb-1.5 font-outfit">Historical Trend</div>
                              <div className="text-[12px] text-blue-900/70 leading-relaxed font-instrument font-medium">
                                <RenderWithMath text={historicalPattern} showOptions={false} />
                              </div>
                            </div>
                          )}

                          {visualPrompt && (
                            <div className="relative p-4 sm:p-5 rounded-[1.5rem] bg-gradient-to-br from-pink-50/50 to-white border border-pink-100/50 group overflow-hidden">
                              <div className="flex items-center gap-2.5 mb-2.5 text-pink-800">
                                <div className="w-6 h-6 rounded-lg bg-pink-100 flex items-center justify-center">
                                  <Sparkles size={12} className="text-pink-600" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-900/60">Visual Aid</span>
                              </div>
                              <div className="text-[14px] font-black text-pink-950 mb-1.5 font-outfit">Mental Picture</div>
                              <div className="text-[12px] text-pink-900/70 leading-relaxed font-instrument font-medium">
                                <RenderWithMath text={visualPrompt} showOptions={false} />
                              </div>
                            </div>
                          )}

                          {commonTrap && (
                            <div className="relative p-4 sm:p-5 rounded-[1.5rem] bg-gradient-to-br from-orange-50/50 to-white border border-orange-100/50 group overflow-hidden">
                              <div className="flex items-center gap-2.5 mb-2.5 text-orange-800">
                                <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
                                  <AlertTriangle size={12} className="text-orange-600" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-900/60">Common Trap</span>
                              </div>
                              <div className="text-[14px] font-black text-orange-950 mb-1.5 font-outfit">Watch Out!</div>
                              <div className="text-[12px] text-orange-900/70 leading-relaxed font-instrument font-medium">
                                <RenderWithMath text={commonTrap} showOptions={false} />
                              </div>
                            </div>
                          )}

                          {whyItMatters && (
                            <div className="relative p-4 sm:p-5 rounded-[1.5rem] bg-gradient-to-br from-cyan-50/50 to-white border border-cyan-100/50 group overflow-hidden">
                              <div className="flex items-center gap-2.5 mb-2.5 text-cyan-800">
                                <div className="w-6 h-6 rounded-lg bg-cyan-100 flex items-center justify-center">
                                  <Info size={12} className="text-cyan-600" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-900/60">Relevance</span>
                              </div>
                              <div className="text-[14px] font-black text-cyan-950 mb-1.5 font-outfit">Why It Matters</div>
                              <div className="text-[12px] text-cyan-900/70 leading-relaxed font-instrument font-medium">
                                <RenderWithMath text={whyItMatters} showOptions={false} />
                              </div>
                            </div>
                          )}

                          {predictiveInsight && (
                            <div className="relative p-4 sm:p-5 rounded-[1.5rem] bg-gradient-to-br from-violet-50/50 to-white border border-violet-100/50 group overflow-hidden">
                              <div className="flex items-center gap-2.5 mb-2.5 text-violet-800">
                                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                                  <Sparkles size={12} className="text-violet-600" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-900/60">Prediction</span>
                              </div>
                              <div className="text-[14px] font-black text-violet-950 mb-1.5 font-outfit">Future Insight</div>
                              <div className="text-[12px] text-violet-900/70 leading-relaxed font-instrument font-medium">
                                <RenderWithMath text={predictiveInsight} showOptions={false} />
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })()}

                      {/* Tactical Insights Hub - Balanced Sizing */}
                      {(() => {
                        const tip = currentQuestion.examTip || (currentQuestion as any).exam_tip || currentQuestion.studyTip || (currentQuestion as any).study_tip;
                        const pitfalls = currentQuestion.pitfalls || [];
                        const commonMistakes = currentQuestion.commonMistakes || (currentQuestion as any).common_mistakes || [];
                        const keyFormulas = currentQuestion.keyFormulas || (currentQuestion as any).key_formulas || [];
                        const thingsToRemember = currentQuestion.thingsToRemember || (currentQuestion as any).things_to_remember || [];

                        const hasAnyTactical = tip || pitfalls.length > 0 || commonMistakes.length > 0 || keyFormulas.length > 0 || thingsToRemember.length > 0;
                        if (!hasAnyTactical) return null;

                        return (
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 pb-12">
                          {tip && (
                            <div className="relative p-3.5 bg-gradient-to-br from-amber-50 to-white rounded-[1.25rem] border border-amber-200/40 shadow-xl shadow-amber-900/5 overflow-hidden group">
                              <div className="absolute top-2.5 right-2.5 text-amber-500 opacity-20 group-hover:scale-125 transition-all duration-500">
                                <Sparkles size={16} />
                              </div>
                              <div className="flex items-center gap-2 mb-2 text-amber-900 font-black text-[9px] uppercase tracking-[0.25em]">
                                <div className="w-5 h-5 bg-amber-100 rounded-lg flex items-center justify-center">
                                  <TrendingUp size={10} className="text-amber-600" />
                                </div>
                                Pro Strategy for Exam Day
                              </div>
                              <div className="text-[12px] text-amber-950 font-instrument font-black leading-snug">
                                <RenderWithMath text={tip} showOptions={false} />
                              </div>
                            </div>
                          )}

                          {keyFormulas.length > 0 && (
                            <div className="relative p-3.5 bg-gradient-to-br from-green-50 to-white rounded-[1.25rem] border border-green-200/40 shadow-xl shadow-green-900/5 overflow-hidden group">
                              <div className="flex items-center gap-2 mb-3 text-green-900 font-black text-[9px] uppercase tracking-[0.25em]">
                                <div className="w-5 h-5 bg-green-100 rounded-lg flex items-center justify-center">
                                  <Zap size={10} className="text-green-600 fill-green-600" />
                                </div>
                                Key Formulas
                              </div>
                              <div className="space-y-2">
                                {keyFormulas.map((formula: string, idx: number) => (
                                  <div key={idx} className="p-2.5 bg-white/60 rounded-lg border border-green-100/50 text-[11px] font-bold text-green-950">
                                    <RenderWithMath text={formula} showOptions={false} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {thingsToRemember.length > 0 && (
                            <div className="relative p-3.5 bg-gradient-to-br from-purple-50 to-white rounded-[1.25rem] border border-purple-200/40 shadow-xl shadow-purple-900/5 overflow-hidden group">
                              <div className="flex items-center gap-2 mb-3 text-purple-900 font-black text-[9px] uppercase tracking-[0.25em]">
                                <div className="w-5 h-5 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <Lightbulb size={10} className="text-purple-600" />
                                </div>
                                Things to Remember
                              </div>
                              <div className="space-y-2">
                                {thingsToRemember.map((item: string, idx: number) => (
                                  <div key={idx} className="flex gap-2">
                                    <div className="shrink-0 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center text-[9px] font-black mt-0.5">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1 text-[11px] font-bold text-purple-950 leading-tight">
                                      <RenderWithMath text={item} showOptions={false} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(pitfalls.length > 0 || commonMistakes.length > 0) && (
                            <div className="relative p-3.5 bg-gradient-to-br from-rose-50 to-white rounded-[1.25rem] border border-rose-200/40 shadow-xl shadow-rose-900/5 overflow-hidden group">
                              <div className="flex items-center gap-2 mb-3 text-rose-900 font-black text-[9px] uppercase tracking-[0.25em]">
                                <div className="w-5 h-5 bg-rose-100 rounded-lg flex items-center justify-center">
                                  <CircleAlert size={10} className="text-rose-600" />
                                </div>
                                Common Exam Pitfalls
                              </div>
                              <div className="space-y-3">
                                {commonMistakes.length > 0 ? (
                                  commonMistakes.slice(0, 3).map((mistake: any, idx: number) => (
                                    <div key={idx} className="relative p-2.5 bg-white/50 backdrop-blur-sm rounded-xl border border-rose-100/50 group-hover:bg-white transition-colors duration-500">
                                      <div className="space-y-2">
                                        <div className="flex gap-2.5">
                                          <div className="shrink-0 w-4 h-4 bg-rose-500 text-white rounded flex items-center justify-center text-[8px] font-black">X</div>
                                          <div className="text-[11px] font-black text-rose-950 leading-tight">
                                            <RenderWithMath text={mistake.mistake} showOptions={false} />
                                          </div>
                                        </div>
                                        {mistake.why && (
                                          <div className="pl-6 text-[10px] text-rose-800/70 font-medium italic">
                                            <RenderWithMath text={mistake.why} showOptions={false} />
                                          </div>
                                        )}
                                        <div className="pl-6 text-[9px] text-emerald-700 font-black uppercase tracking-widest flex items-center gap-2">
                                          <div className="w-3 h-[1px] bg-emerald-300" />
                                          Fix: <RenderWithMath text={mistake.howToAvoid} showOptions={false} />
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  pitfalls.slice(0, 3).map((pitfall: any, idx: number) => (
                                    <div key={idx} className="relative p-2.5 bg-white/50 backdrop-blur-sm rounded-xl border border-rose-100/50 group-hover:bg-white transition-colors duration-500">
                                      {typeof pitfall === 'string' ? (
                                        <div className="text-[11px] font-bold text-rose-950 font-instrument">
                                          <RenderWithMath text={pitfall} showOptions={false} />
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="flex gap-2.5">
                                            <div className="shrink-0 w-4 h-4 bg-rose-500 text-white rounded flex items-center justify-center text-[8px] font-black">X</div>
                                            <div className="text-[11px] font-black text-rose-950 leading-tight"><RenderWithMath text={pitfall.mistake} showOptions={false} /></div>
                                          </div>
                                          <div className="pl-6 text-[9px] text-rose-900/60 font-black uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-3 h-[1px] bg-rose-200" />
                                            Fix: {pitfall.howToAvoid}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Premium Question Navigator Sidebar - Hidden on Mobile */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-[#f8fafc]/80 backdrop-blur-xl border-2 border-slate-200/50 rounded-[2.5rem] p-5 sm:p-7 sticky top-20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] flex flex-col max-h-[calc(100vh-100px)] overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/[0.03] blur-[80px] rounded-full pointer-events-none" />

              {/* Header with Stats Tracking */}
              <div className="flex items-center justify-between mb-6 px-1 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
                    <Grid3x3 size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 tracking-tight leading-none">Navigator</h3>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{questions.length} Pathmarks</p>
                  </div>
                </div>
                {!isVaultMode && (
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-slate-900 leading-none">{answeredCount}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Done</span>
                  </div>
                )}
              </div>

              {/* Progress Track - Hidden in Vault Mode */}
              {!isVaultMode && (
                <div className="mb-8 px-1 shrink-0">
                  <div className="justify-between items-end mb-2 flex">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mastery Progress</span>
                    <span className="text-[10px] font-black text-primary-600">{Math.round((answeredCount / questions.length) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 transition-all duration-700 ease-out"
                      style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sophisticated Status Bar (Legend) - Hidden in Vault Mode */}
              {!isVaultMode && (
                <div className="mb-8 grid grid-cols-3 gap-2 shrink-0">
                  {isReviewMode ? (
                    <>
                      <div className="flex flex-col items-center p-2 rounded-2xl bg-emerald-50 border border-emerald-100/50">
                        <span className="text-[10px] font-black text-emerald-600 leading-none mb-1">{correctCount}</span>
                        <span className="text-[7px] font-black uppercase text-emerald-400 tracking-widest">Correct</span>
                      </div>
                      <div className="flex flex-col items-center p-2 rounded-2xl bg-rose-50 border border-rose-100/50">
                        <span className="text-[10px] font-black text-rose-600 leading-none mb-1">{incorrectCount}</span>
                        <span className="text-[7px] font-black uppercase text-rose-400 tracking-widest">Wrong</span>
                      </div>
                      <div className="flex flex-col items-center p-2 rounded-2xl bg-slate-50 border border-slate-200/50">
                        <span className="text-[10px] font-black text-slate-600 leading-none mb-1">{skippedCount}</span>
                        <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Null</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col items-center p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                        <span className="text-[10px] font-black text-white leading-none mb-1">{answeredCount}</span>
                        <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Done</span>
                      </div>
                      <div className="flex flex-col items-center p-2 rounded-2xl bg-white border border-amber-200 shadow-sm">
                        <span className="text-[10px] font-black text-amber-600 leading-none mb-1">{markedCount}</span>
                        <span className="text-[7px] font-black uppercase text-amber-500 tracking-widest">Flag</span>
                      </div>
                      <div className="flex flex-col items-center p-2 rounded-2xl bg-white border border-slate-100 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 leading-none mb-1">{questions.length - answeredCount}</span>
                        <span className="text-[7px] font-black uppercase text-slate-300 tracking-widest">Idle</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Grid with Premium Styling - Scrollable for long tests */}
              <div className="flex-1 overflow-y-auto pr-1 -mr-2 no-scrollbar custom-scrollbar">
                <div className="grid grid-cols-5 gap-3 pb-4 px-1">
                  {questions.map((q, idx) => {
                    const status = getQuestionStatus(q.id);
                    const isCurrent = idx === currentQuestionIndex;

                    const getBaseStyles = () => {
                      switch (status) {
                        case 'correct': return 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10 border-emerald-400/30';
                        case 'incorrect': return 'bg-rose-500 text-white shadow-lg shadow-rose-500/10 border-rose-400/30';
                        case 'answered': return 'bg-slate-900 text-white shadow-lg border-white/5';
                        case 'marked': return 'bg-white border-2 border-amber-500 text-amber-600 hover:bg-amber-50 shadow-sm shadow-amber-200/50';
                        default: return 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:shadow-sm';
                      }
                    };

                    return (
                      <button
                        key={q.id}
                        id={`nav-q-${idx}`}
                        onClick={() => handleQuestionJump(idx)}
                        className={`aspect-square rounded-[1.2rem] text-[13px] font-black transition-all relative flex items-center justify-center border-2 group
                          ${getBaseStyles()}
                          ${isCurrent
                            ? 'scale-110 z-10 shadow-[0_0_25px_-5px_rgba(79,70,229,0.5)] border-primary-500 ring-[6px] ring-primary-500/15'
                            : 'active:scale-95 hover:scale-105'
                          }`}
                      >
                        {isCurrent && (
                          <div className="absolute inset-x-0 -bottom-1 h-1 bg-primary-500 rounded-full w-1/2 mx-auto shadow-[0_0_10px_rgba(79,70,229,0.8)]" />
                        )}

                        {status === 'marked' && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-md">
                            <Flag size={8} strokeWidth={4} fill="currentColor" />
                          </div>
                        )}
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal - Only in Take Mode */}
      {!isReviewMode && showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20 border border-white/10">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Ready to Finish?</h2>
              <p className="text-slate-500 font-medium text-sm">
                Take a moment to review your progress before sealing the journey.
              </p>
            </div>

            <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Answered</span>
                </div>
                <span className="text-lg font-black text-slate-900">{answeredCount}/{questions.length}</span>
              </div>
              <div className="h-px bg-slate-200/50 mx-2" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Unanswered</span>
                </div>
                <span className={`text-lg font-black ${unansweredCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {unansweredCount}
                </span>
              </div>
              <div className="h-px bg-slate-200/50 mx-2" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">For Review</span>
                </div>
                <span className={`text-lg font-black ${markedCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {markedCount}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmSubmit}
                className="w-full py-4 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-indigo-50 rounded-2xl text-[13px] font-black uppercase tracking-widest hover:brightness-110 shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Submit Now
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="w-full py-4 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:text-slate-900 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
              >
                Keep Solving
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quit Test Confirmation Modal - Only in Take Mode */}
      {!isReviewMode && showQuitConfirm && (() => {
        const pct = Math.round((answeredCount / questions.length) * 100);
        type MotivationEntry = { range: [number, number]; icon: React.ReactNode; color: string; title: string; msg: string };
        const motivations: MotivationEntry[] = [
          {
            range: [0, 20], color: 'amber',
            icon: <Zap size={28} className="text-amber-500" />,
            title: "You're Just Getting Started!",
            msg: "Every champion starts somewhere. The questions ahead could be the ones that make the difference. Don't quit — your future self will thank you for pushing through!"
          },
          {
            range: [21, 50], color: 'blue',
            icon: <TrendingUp size={28} className="text-blue-500" />,
            title: "You're Building Momentum!",
            msg: `You're almost halfway through. Elite performers don't stop when it's hard — they stop when it's done. Keep going and finish what you started!`
          },
          {
            range: [51, 80], color: 'indigo',
            icon: <Target size={28} className="text-indigo-500" />,
            title: "So Close to the Finish!",
            msg: `You've answered ${answeredCount} questions — only ${unansweredCount} left. The final stretch is where champions separate from the rest. Push through!`
          },
          {
            range: [81, 100], color: 'emerald',
            icon: <CheckCircle2 size={28} className="text-emerald-500" />,
            title: "Almost Done — Don't Stop Now!",
            msg: `You've conquered ${answeredCount} out of ${questions.length} questions. You are THIS close. Finish strong and see how well you really know this!`
          },
        ];
        const m = motivations.find(entry => pct >= entry.range[0] && pct <= entry.range[1]) || motivations[0];
        const accentMap: Record<string, string> = {
          amber: 'bg-amber-50 border-amber-200 text-amber-900',
          blue: 'bg-blue-50 border-blue-200 text-blue-900',
          indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
          emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        };
        const accentClass = accentMap[m.color] || accentMap.amber;
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              {/* Dark header */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-5 text-white relative">
                <button
                  onClick={() => setShowQuitConfirm(false)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                >
                  <X size={14} />
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <LogOut size={16} className="text-red-400" />
                  <h2 className="font-black text-lg">Quit Test?</h2>
                </div>
                <p className="text-slate-400 text-xs font-medium">{attempt.testName} &bull; {attempt.subject} &bull; {attempt.examContext}</p>
              </div>

              {/* Motivational card */}
              <div className={`mx-5 mt-5 p-4 rounded-xl border ${accentClass} flex items-start gap-3`}>
                {m.icon}
                <div>
                  <div className="font-black text-sm mb-1">{m.title}</div>
                  <div className="text-xs font-medium leading-relaxed opacity-90">{m.msg}</div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="mx-5 mt-4 grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <div className="text-2xl font-black text-emerald-600">{answeredCount}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Answered</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <div className="text-2xl font-black text-slate-400">{unansweredCount}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Remaining</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <div className="text-2xl font-black text-amber-500">{markedCount}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Flagged</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mx-5 mt-4">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                  <span>Completion</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Warning note */}
              <div className="mx-5 mt-3 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                <AlertTriangle size={11} className="text-amber-500 flex-shrink-0" />
                <span>Your progress will be lost if you exit without submitting.</span>
              </div>

              {/* Action buttons */}
              <div className="p-5 flex gap-3 mt-1">
                <button
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-slate-800 transition-all"
                >
                  Continue Test
                </button>
                <button
                  onClick={onExit}
                  className="px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
                >
                  Exit Anyway
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mobile Compact Sticky Navigation Bar */}
      <div className="lg:hidden fixed bottom-10 left-5 right-5 z-[60] animate-in slide-in-from-bottom-full duration-500">
        <div className="bg-white/90 backdrop-blur-xl border-2 border-slate-100 rounded-[2rem] p-3 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.3)] flex items-center justify-between gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex-1 py-4 bg-slate-50 text-slate-700 rounded-[1.5rem] border border-slate-100 text-[10px] font-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30 uppercase tracking-widest"
          >
            <ChevronLeft size={16} strokeWidth={3} />
            Prev
          </button>

          <button
            onClick={() => setShowNavigator(true)}
            className={`shrink-0 w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-lg active:scale-90 transition-all border-2
              ${markedCount > 0 && !isReviewMode
                ? 'bg-amber-500 border-amber-400 text-white shadow-amber-500/20'
                : 'bg-slate-900 border-slate-800 text-white shadow-slate-900/20'}
            `}
          >
            <Grid3x3 size={24} strokeWidth={2.5} />
          </button>

          {currentQuestionIndex === questions.length - 1 && !isReviewMode ? (
            <button
              onClick={handleSubmitClick}
              className="flex-1 py-4 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-600 text-white rounded-[1.5rem] text-[10px] font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-emerald-900/20 border border-white/10 uppercase tracking-widest animate-pulse"
            >
              Finish
              <CheckCircle2 size={16} strokeWidth={3} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={currentQuestionIndex === questions.length - 1}
              className="flex-1 py-4 bg-slate-50 text-slate-700 rounded-[1.5rem] border border-slate-100 text-[10px] font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-slate-100/10 disabled:opacity-30 uppercase tracking-widest"
            >
              Next
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigator Overlay */}
      {showNavigator && (
        <div className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] animate-in fade-in duration-300 flex items-end">
          <div className="bg-white w-full rounded-t-[3rem] shadow-2xl animate-in slide-in-from-bottom duration-500 h-[94vh] flex flex-col border-t border-white/20">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />

            <div className="px-8 pb-4 shrink-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-black text-2xl text-slate-900 tracking-tight">Questions</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">{questions.length} Total Pathmarks</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNavigator(false)}
                  className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 active:scale-90 transition-all shadow-sm"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Legend - Micro Style for Mobile */}
              <div className="bg-slate-50/80 p-3 rounded-[1.5rem] border border-slate-100 flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-slate-900 rounded-sm" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Done</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 border-2 border-amber-500 bg-white rounded-sm" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-white border border-slate-200 rounded-sm" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Idle</span>
                </div>
              </div>
            </div>

            {/* Scrollable Question Grid */}
            <div className="flex-1 overflow-y-auto px-8 pb-20 no-scrollbar">
              <div className="grid grid-cols-5 xs:grid-cols-6 gap-3 pt-2">
                {questions.map((q, idx) => {
                  const status = getQuestionStatus(q.id);
                  const isCurrent = idx === currentQuestionIndex;

                  const getBaseStyles = () => {
                    switch (status) {
                      case 'correct': return 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10 border-emerald-500';
                      case 'incorrect': return 'bg-rose-500 text-white shadow-lg shadow-rose-500/10 border-rose-500';
                      case 'answered': return 'bg-slate-900 text-white shadow-lg border-white/10';
                      case 'skipped': return 'bg-slate-300 text-slate-700 border-slate-300';
                      case 'marked': return 'bg-white border-2 border-amber-500 text-amber-600';
                      default: return 'bg-slate-50 text-slate-400 border border-slate-100';
                    }
                  };

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        handleQuestionJump(idx);
                        setShowNavigator(false);
                      }}
                      className={`aspect-square rounded-2xl text-sm font-black transition-all relative flex items-center justify-center border-2
                        ${getBaseStyles()}
                        ${isCurrent
                          ? 'ring-[6px] ring-primary-500/20 scale-110 z-10 !bg-white !text-primary-600 border-primary-500'
                          : 'active:scale-90'}
                      `}
                    >
                      {isCurrent && (
                        <div className="absolute inset-0 rounded-[0.8rem] border-[3.5px] border-primary-500/15 animate-pulse pointer-events-none" />
                      )}
                      {status === 'marked' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm">
                          <Flag size={8} strokeWidth={4} fill="currentColor" />
                        </div>
                      )}
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Sticky Action */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-10 pointer-events-none">
              <button
                onClick={() => setShowNavigator(false)}
                className="pointer-events-auto w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Resume Experience
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Enlarged Sketch Viewer */}
      {showEnlargedSketch && (currentQuestion.sketchSvgUrl || currentQuestion.sketchSvg) && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex flex-col p-4 sm:p-10 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5 shadow-2xl">
                <Sparkles size={20} className="text-amber-400 fill-amber-400" />
              </div>
              <div>
                <h3 className="text-white font-black text-xl tracking-tight leading-none mb-1">Visual Architecture</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">{currentQuestion.topic} • Phase Insight</p>
              </div>
            </div>
            <button
              onClick={() => setShowEnlargedSketch(false)}
              className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all border border-white/10 active:scale-90"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center bg-white/5 rounded-[3rem] border border-white/5 p-4 sm:p-12 shadow-inner">
            <div className="max-w-full max-h-full">
              {currentQuestion.sketchSvgUrl ? (
                <img
                  src={currentQuestion.sketchSvgUrl}
                  alt="Enlarged solution visual"
                  className="max-w-full max-h-[70vh] w-auto h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                />
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: currentQuestion.sketchSvg! }}
                  className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-[70vh] [&>svg]:w-auto [&>svg]:h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                />
              )}
            </div>
          </div>

          {currentQuestion.visualConcept && (
            <div className="mt-8 max-w-2xl mx-auto text-center">
              <p className="text-slate-300 text-lg font-medium leading-relaxed italic">
                "{currentQuestion.visualConcept}"
              </p>
            </div>
          )}
        </div>
      )}
      {/* Enlarged Image Viewer (Generic) */}
      {enlargedImageUrl && (
        <div
          className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-2xl flex flex-col p-4 sm:p-10 animate-in fade-in zoom-in duration-300 cursor-pointer"
          onClick={() => setEnlargedImageUrl(null)}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5 shadow-2xl">
                <Maximize2 size={20} className="text-primary-400" />
              </div>
              <div>
                <h3 className="text-white font-black text-xl tracking-tight leading-none mb-1">Visual Context</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Source Material • High Fidelity</p>
              </div>
            </div>
            <button
              onClick={() => setEnlargedImageUrl(null)}
              className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all border border-white/10 active:scale-90"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center bg-white/5 rounded-[3rem] border border-white/5 p-4 sm:p-12 shadow-inner">
            <img
              src={enlargedImageUrl}
              alt="Enlarged diagram"
              className="max-w-full max-h-[80vh] w-auto h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TestInterface;
