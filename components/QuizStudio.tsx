import React, { useState, useMemo, useEffect } from 'react';
import {
  Brain,
  Zap,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  Play,
  RotateCw,
  BarChart3
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RenderWithMath } from './MathRenderer';
import { cache } from '../utils/cache';
import { useFilteredScans } from '../hooks/useFilteredScans';
import { useAppContext } from '../contexts/AppContext';
import { useSubjectTheme } from '../hooks/useSubjectTheme';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  topic?: string;
  domain?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

interface Scan {
  id: string;
  name: string;
  subject: string;
  grade: string;
  analysisData?: {
    questions?: any[];
  };
}

interface QuizStudioProps {
  recentScans?: Scan[];
}

const QuizStudio: React.FC<QuizStudioProps> = ({ recentScans = [] }) => {
  const { subjectConfig } = useAppContext();
  const theme = useSubjectTheme();
  const { scans: filteredScans } = useFilteredScans(recentScans);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedScan, setSelectedScan] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isCached, setIsCached] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('All');

  // Quiz state
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Map<number, number>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);

  // Group questions by topic
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, QuizQuestion[]> = { 'All': questions };
    questions.forEach(q => {
      const category = q.topic || q.domain || 'General';
      if (!groups[category]) groups[category] = [];
      groups[category].push(q);
    });
    return groups;
  }, [questions]);

  const displayedQuestions = groupedQuestions[selectedTopic] || [];

  // Helper function to safely parse JSON from Gemini response (copied from RapidRecall)
  const parseGeminiJSON = (responseText: string) => {
    try {
      // Remove markdown code blocks if present
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '');
      }

      jsonText = jsonText.trim();

      // Try parsing directly first
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      console.error('Response text:', responseText);
      throw new Error('Invalid JSON response from AI');
    }
  };

  // Auto-clear selectedScan when subject changes
  useEffect(() => {
    const selectedScanObj = filteredScans.find(s => s.id === selectedScan);
    if (selectedScan && !selectedScanObj) {
      setSelectedScan('');
      setQuestions([]);
    }
  }, [subjectConfig.name, filteredScans, selectedScan]);

  // Timer for active quiz
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isQuizActive && quizStartTime && !showResults) {
      interval = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - quizStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isQuizActive, quizStartTime, showResults]);

  const generateQuiz = async () => {
    if (!selectedScan) {
      alert('Please select a scan to generate quiz questions');
      return;
    }

    setIsGenerating(true);
    setIsCached(false);

    const cacheKey = `quiz_${selectedScan}_${questionCount}_${subjectConfig.name}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      setQuestions(cached);
      setIsCached(true);
      setIsGenerating(false);
      return;
    }

    try {
      const scan = filteredScans.find(s => s.id === selectedScan);
      if (!scan || !scan.analysisData?.questions) {
        throw new Error('Scan data not found');
      }

      const scanQuestions = scan.analysisData.questions;
      const topicsList = Array.from(new Set(scanQuestions.map((q: any) => q.topic).filter(Boolean)));

      // Use model from settings (same as RapidRecall)
      const selectedModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';

      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `You are an expert ${subjectConfig.name} teacher creating MCQ quiz questions for ${scan.grade} students.

TOPICS FROM EXAM: ${topicsList.join(', ')}

Generate ${questionCount} high-quality MCQ questions covering these topics:
- Mix difficulty levels (Easy, Medium, Hard)
- Cover different topics proportionally
- Include clear, concise explanations
- Use proper ${subjectConfig.name} terminology

MATH FORMATTING: Use $ $ for ALL math (e.g., $\\\\frac{1}{2}$, $\\\\pi$).
IMPORTANT: All backslashes in LaTeX must be properly escaped in JSON (use double backslashes: \\\\frac not \\frac).

Return ONLY valid JSON array:
[
  {
    "id": "q1",
    "question": "Question text with $\\\\frac{1}{2}$",
    "options": ["$\\\\frac{\\\\pi}{6}$", "$\\\\frac{\\\\pi}{3}$", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Brief explanation with $\\\\sin(\\\\frac{\\\\pi}{6}) = \\\\frac{1}{2}$",
    "topic": "Topic name",
    "domain": "${subjectConfig.name}",
    "difficulty": "Medium"
  }
]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const parsed = parseGeminiJSON(response.text() || "[]");

      if (!Array.isArray(parsed)) {
        throw new Error('Invalid response format - expected array');
      }

      cache.save(cacheKey, parsed, selectedScan, 'question'); // Save with scanId and type
      setQuestions(parsed);

    } catch (error) {
      console.error('Quiz generation error:', error);
      alert('Failed to generate quiz. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const startQuiz = () => {
    setIsQuizActive(true);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnsweredQuestions(new Map());
    setShowResults(false);
    setQuizStartTime(Date.now());
    setTimeElapsed(0);
    setSelectedTopic('All');
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (!isQuizActive || showResults) return;
    setSelectedAnswer(optionIndex);
  };

  const submitAnswer = () => {
    if (selectedAnswer === null) return;

    const newAnswers = new Map(answeredQuestions);
    newAnswers.set(currentQuestion, selectedAnswer);
    setAnsweredQuestions(newAnswers);

    // Move to next question after short delay
    setTimeout(() => {
      if (currentQuestion < displayedQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        setShowResults(true);
      }
    }, 1000);
  };

  const retakeQuiz = () => {
    startQuiz();
  };

  const exitQuiz = () => {
    setIsQuizActive(false);
    setShowResults(false);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnsweredQuestions(new Map());
  };

  // Calculate results
  const correctCount = useMemo(() => {
    let correct = 0;
    answeredQuestions.forEach((answer, questionIndex) => {
      if (displayedQuestions[questionIndex]?.correctIndex === answer) {
        correct++;
      }
    });
    return correct;
  }, [answeredQuestions, displayedQuestions]);

  const accuracy = answeredQuestions.size > 0
    ? Math.round((correctCount / answeredQuestions.size) * 100)
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Results Screen
  if (showResults && isQuizActive) {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-8 py-6">
          <h1 className="text-3xl font-black text-slate-900 font-outfit">
            {theme.iconEmoji} Quiz Results
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Score Card */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-8 text-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-4xl font-black mb-2">{accuracy}%</h2>
                  <p className="text-white/90 font-medium">Overall Accuracy</p>
                </div>
                <Trophy size={64} className="text-white/30" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-2xl font-black">{correctCount}</div>
                  <div className="text-xs text-white/80 mt-1">Correct</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-2xl font-black">{answeredQuestions.size - correctCount}</div>
                  <div className="text-xs text-white/80 mt-1">Wrong</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-2xl font-black">{formatTime(timeElapsed)}</div>
                  <div className="text-xs text-white/80 mt-1">Time</div>
                </div>
              </div>
            </div>

            {/* Question Review */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
              <h3 className="font-black text-lg text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Question Review
              </h3>

              <div className="space-y-3">
                {displayedQuestions.map((q, idx) => {
                  const userAnswer = answeredQuestions.get(idx);
                  const isCorrect = userAnswer === q.correctIndex;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 ${
                        isCorrect
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isCorrect ? (
                          <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 mb-2">
                            <RenderWithMath text={q.question} showOptions={false} serif={false} />
                          </div>
                          {!isCorrect && (
                            <p className="text-xs text-slate-600">
                              <span className="font-bold">Correct:</span> {q.options[q.correctIndex]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={retakeQuiz}
                className="flex-1 px-6 py-4 bg-primary-600 text-white rounded-xl font-black hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
              >
                <RotateCw size={20} />
                Retake Quiz
              </button>
              <button
                onClick={exitQuiz}
                className="flex-1 px-6 py-4 bg-slate-200 text-slate-900 rounded-xl font-black hover:bg-slate-300 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft size={20} />
                Exit Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Quiz Screen
  if (isQuizActive && !showResults) {
    const currentQ = displayedQuestions[currentQuestion];
    const isAnswered = answeredQuestions.has(currentQuestion);
    const userAnswer = answeredQuestions.get(currentQuestion);
    const isCorrect = userAnswer === currentQ?.correctIndex;

    return (
      <div className="h-full flex flex-col bg-slate-50">
        {/* Quiz Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={exitQuiz}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <ChevronLeft size={20} className="text-slate-600" />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Question {currentQuestion + 1} of {displayedQuestions.length}
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  {currentQ?.topic || 'General'} • {currentQ?.difficulty || 'Medium'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock size={18} />
                <span className="font-mono text-sm font-bold">{formatTime(timeElapsed)}</span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {correctCount}/{answeredQuestions.size} correct
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / displayedQuestions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 mb-6">
              <div className="text-xl font-bold text-slate-900 mb-8 leading-relaxed">
                <RenderWithMath text={currentQ?.question || ''} showOptions={false} serif={false} />
              </div>

              <div className="space-y-3">
                {currentQ?.options.map((option, idx) => {
                  let buttonClass = "w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ";

                  if (isAnswered) {
                    if (idx === currentQ.correctIndex) {
                      buttonClass += "border-green-500 bg-green-50 text-green-900";
                    } else if (idx === userAnswer) {
                      buttonClass += "border-red-500 bg-red-50 text-red-900";
                    } else {
                      buttonClass += "border-slate-200 bg-slate-50 text-slate-400";
                    }
                  } else {
                    if (idx === selectedAnswer) {
                      buttonClass += "border-primary-500 bg-primary-50 text-primary-900";
                    } else {
                      buttonClass += "border-slate-200 hover:border-slate-300 hover:bg-slate-50";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(idx)}
                      disabled={isAnswered}
                      className={buttonClass}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                          isAnswered
                            ? idx === currentQ.correctIndex
                              ? 'bg-green-600 text-white'
                              : idx === userAnswer
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-300 text-slate-600'
                            : idx === selectedAnswer
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="font-medium">
                          <RenderWithMath text={option} showOptions={false} serif={false} />
                        </span>
                      </div>
                      {isAnswered && idx === currentQ.correctIndex && (
                        <CheckCircle2 size={20} className="text-green-600" />
                      )}
                      {isAnswered && idx === userAnswer && idx !== currentQ.correctIndex && (
                        <XCircle size={20} className="text-red-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAnswered && currentQ?.explanation && (
                <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <h4 className="font-black text-sm text-blue-900 mb-2">Explanation</h4>
                  <p className="text-sm text-blue-800">
                    <RenderWithMath text={currentQ.explanation} showOptions={false} serif={false} />
                  </p>
                </div>
              )}
            </div>

            {!isAnswered ? (
              <button
                onClick={submitAnswer}
                disabled={selectedAnswer === null}
                className="w-full px-6 py-4 bg-primary-600 text-white rounded-xl font-black hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {currentQuestion < displayedQuestions.length - 1 ? 'Submit & Next' : 'Submit & Finish'}
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (currentQuestion < displayedQuestions.length - 1) {
                    setCurrentQuestion(currentQuestion + 1);
                    setSelectedAnswer(null);
                  } else {
                    setShowResults(true);
                  }
                }}
                className="w-full px-6 py-4 bg-primary-600 text-white rounded-xl font-black hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
              >
                {currentQuestion < displayedQuestions.length - 1 ? 'Next Question' : 'View Results'}
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Quiz Setup Screen
  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex items-center gap-4 mb-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: theme.colorLight }}
          >
            <Brain size={24} style={{ color: theme.colorDark }} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 font-outfit">
              {theme.iconEmoji} Quiz Studio
            </h1>
            <p className="text-sm text-slate-600 font-medium">
              Generate and take topic-based quizzes • {subjectConfig.name}
            </p>
          </div>
        </div>

        {isCached && questions.length > 0 && (
          <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs font-bold text-blue-700">
            <Sparkles size={14} />
            Using cached quiz (generated recently)
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Quiz Generation Controls */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
            <h2 className="font-black text-lg text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles size={20} />
              Generate New Quiz
            </h2>

            <div className="space-y-4">
              {/* Scan Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Select Exam/Scan
                </label>
                <select
                  value={selectedScan}
                  onChange={(e) => setSelectedScan(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg font-medium focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  <option value="">Choose a scan...</option>
                  {filteredScans.map(scan => (
                    <option key={scan.id} value={scan.id}>
                      {scan.name} ({scan.subject})
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Count */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Number of Questions: {questionCount}
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="5"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 font-medium mt-1">
                  <span>5</span>
                  <span>10</span>
                  <span>15</span>
                  <span>20</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateQuiz}
                disabled={isGenerating || !selectedScan}
                className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-black hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate Quiz
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Quiz Preview */}
          {questions.length > 0 && (
            <>
              {/* Topic Filter */}
              <div className="flex gap-2 flex-wrap">
                {Object.keys(groupedQuestions).map(topic => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedTopic === topic
                        ? 'bg-primary-600 text-white'
                        : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {topic} ({groupedQuestions[topic].length})
                  </button>
                ))}
              </div>

              {/* Start Quiz Button */}
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-black mb-2">
                      {displayedQuestions.length} Questions Ready
                    </h3>
                    <p className="text-white/90 font-medium">
                      {selectedTopic === 'All' ? 'All topics' : selectedTopic}
                    </p>
                  </div>
                  <Zap size={48} className="text-white/30" />
                </div>

                <button
                  onClick={startQuiz}
                  className="w-full px-6 py-4 bg-white text-primary-600 rounded-xl font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Play size={20} />
                  Start Quiz
                </button>
              </div>

              {/* Question Preview */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
                <h3 className="font-black text-lg text-slate-900 mb-4">Preview Questions</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {displayedQuestions.map((q, idx) => (
                    <div key={q.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-6 h-6 bg-slate-700 text-white rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900 mb-1">
                            <RenderWithMath text={q.question} showOptions={false} serif={false} />
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">
                              {q.topic || 'General'}
                            </span>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-bold">
                              {q.difficulty || 'Medium'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
          {questions.length === 0 && !isGenerating && (
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
              <Brain size={64} className="text-slate-300 mx-auto mb-4" />
              <h3 className="font-black text-xl text-slate-900 mb-2">No Quiz Generated Yet</h3>
              <p className="text-slate-600 font-medium">
                Select a scan and click "Generate Quiz" to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizStudio;
