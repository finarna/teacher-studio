
import React, { useState, useEffect } from 'react';
import { Question, SubjectType, MockTestSession, StrategyCorrection } from '../types';
import QuizCard from './QuizCard';
import { 
  Timer, 
  ArrowRight, 
  ChevronLeft,
  Brain,
  Zap,
  Target,
  Trophy,
  Loader2,
  Sparkles,
  MessageCircle,
  BookOpen,
  LayoutGrid
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface MockTestPortalProps {
  subject: SubjectType;
  questions: Question[];
  onFinish: (session: MockTestSession) => void;
  onCancel: () => void;
}

const MockTestPortal: React.FC<MockTestPortalProps> = ({ subject, questions, onFinish, onCancel }) => {
  const [mode, setMode] = useState<'intro' | 'test' | 'results' | 'review'>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0); 
  const [startTime, setStartTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [strategy, setStrategy] = useState<StrategyCorrection | null>(null);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (mode === 'intro' && questions.length > 0) {
      const selected = [...questions].sort(() => 0.5 - Math.random()).slice(0, 10);
      setTestQuestions(selected);
    }
  }, [questions, mode]);

  useEffect(() => {
    let timer: number;
    if (mode === 'test' && timeLeft > 0) {
      timer = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && mode === 'test') {
      handleFinish();
    }
    return () => clearInterval(timer);
  }, [mode, timeLeft]);

  const startTest = () => {
    setStartTime(Date.now());
    setTimeLeft(testQuestions.length * 60);
    setMode('test');
  };

  const handleFinish = async () => {
    setIsAnalyzing(true);
    setMode('results');
    const correctCount = testQuestions.filter(q => answers[q.id] === q.options.find(o => o.isCorrect)?.id).length;
    const accuracy = (correctCount / testQuestions.length) * 100;
    const session: MockTestSession = {
      id: `mt-${Date.now()}`,
      subject,
      questions: testQuestions,
      answers,
      startTime,
      endTime: Date.now(),
      durationLimit: testQuestions.length * 60,
      score: correctCount,
      accuracy: accuracy
    };

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `You are an academic coach. Analyze these Mock Test results for ${subject}: Correct: ${correctCount}/${testQuestions.length}, Accuracy: ${accuracy}%, Topics: ${Array.from(new Set(testQuestions.map(q => q.metadata?.topic))).join(', ')}. Format as JSON.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              timeManagement: { type: Type.STRING },
              accuracyStrategy: { type: Type.STRING },
              nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["summary", "timeManagement", "accuracyStrategy", "nextSteps"]
          }
        }
      });
      const analysis = JSON.parse(response.text || "{}");
      setStrategy(analysis);
      onFinish({ ...session, strategyCorrection: analysis });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (mode === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-indigo-100 border-4 border-indigo-50">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Timed Simulation</h2>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mb-10">Subject: {subject}</p>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-12">
          <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-left">
            <Timer className="w-5 h-5 text-indigo-500 mb-3" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Window</p>
            <p className="text-sm font-black text-slate-900">{testQuestions.length} Mins</p>
          </div>
          <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-left">
            <Target className="w-5 h-5 text-emerald-500 mb-3" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inventory</p>
            <p className="text-sm font-black text-slate-900">{testQuestions.length} Items</p>
          </div>
        </div>

        <div className="space-y-4 w-full max-w-sm">
          <button 
            onClick={startTest}
            className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            Launch Track
            <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={onCancel} className="text-slate-400 font-black uppercase text-[10px] tracking-widest pt-4">
            Exit Hub
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'results') {
    const correctCount = testQuestions.filter(q => answers[q.id] === q.options.find(o => o.isCorrect)?.id).length;
    const accuracy = (correctCount / testQuestions.length) * 100;

    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 bg-slate-50 h-full">
        <div className="max-w-xl mx-auto space-y-8 pb-32">
          <div className="text-center space-y-2 pt-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-indigo-100 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 shadow-sm">
               <Sparkles className="w-3 h-3" /> Neural Analysis Complete
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Performance Hub</h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Raw</p>
              <p className="text-2xl font-black text-slate-900">{correctCount}/{testQuestions.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Score</p>
              <p className="text-2xl font-black text-indigo-600">{accuracy.toFixed(0)}%</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tier</p>
              <p className={`text-2xl font-black ${accuracy > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {accuracy > 80 ? 'S+' : accuracy > 50 ? 'A' : 'B-'}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-3">
                <Brain className="w-7 h-7 text-indigo-400" />
                <h3 className="text-lg font-black uppercase tracking-tight">Personal Strategy Audit</h3>
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                  <p className="text-sm font-black uppercase tracking-widest text-slate-500 animate-pulse">Running Neural Analytics...</p>
                </div>
              ) : strategy ? (
                <div className="space-y-6 animate-in fade-in duration-700">
                  <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Overall Context</p>
                    <p className="text-[13px] text-slate-200 leading-relaxed font-medium">{strategy.summary}</p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Growth Plan</p>
                    {strategy.nextSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-indigo-600/20 border border-indigo-500/20 rounded-2xl">
                        <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
                        <span className="text-[13px] font-bold text-indigo-100">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => { setMode('review'); setCurrentIndex(0); }}
              className="w-full py-5 bg-white border border-slate-200 text-slate-900 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <BookOpen className="w-4 h-4" /> Review Solution Log
            </button>
            <button 
              onClick={onCancel}
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl active:scale-95 transition-all"
            >
              Dismiss Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'review') {
    const question = testQuestions[currentIndex];
    const userAnsId = answers[question.id];
    const correctAns = question.options.find(o => o.isCorrect);

    return (
      <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
        <header className="px-5 h-16 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-30">
          <button onClick={() => setMode('results')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:scale-90">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Audit Mode</h3>
            <p className="text-[11px] font-bold text-slate-400">Question {currentIndex + 1} of {testQuestions.length}</p>
          </div>
          <div className="w-9" />
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-32">
          <div className="max-w-xl mx-auto space-y-6">
            <QuizCard 
              key={question.id}
              question={question}
              selectedOptionId={userAnsId}
              onSelectOption={() => {}} 
              isSubmitted={true}
              autoExpandSolution={true}
            />
            
            <div className="bg-white border border-slate-200 p-6 rounded-3xl flex gap-4 shadow-sm">
               <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
               </div>
               <div className="flex-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Mentor's Perspective</h4>
                  <p className="text-[13px] font-bold text-slate-700 leading-relaxed italic">
                    {userAnsId === correctAns?.id 
                      ? "Perfect execution. Your mental model for this topic is mature." 
                      : `Logic gap detected. You marked ${userAnsId || 'none'}, but the target was ${correctAns?.id}. Re-evaluate the core integration rule.`}
                  </p>
               </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-8 inset-x-0 z-[60] flex justify-center px-6 pointer-events-none">
          <div className="bg-slate-900 rounded-full p-1.5 flex items-center gap-2 shadow-2xl border border-white/10 pointer-events-auto">
            <button 
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all ${currentIndex === 0 ? 'opacity-20' : 'hover:bg-white/10 active:scale-90'}`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="px-4 border-x border-white/10 min-w-[80px] text-center">
              <span className="text-white font-black text-sm">{currentIndex + 1} / {testQuestions.length}</span>
            </div>
            <button 
              onClick={() => setCurrentIndex(prev => Math.min(testQuestions.length - 1, prev + 1))}
              disabled={currentIndex === testQuestions.length - 1}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all ${currentIndex === testQuestions.length - 1 ? 'opacity-20' : 'hover:bg-white/10 active:scale-90'}`}
            >
              <ChevronLeft className="w-6 h-6 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <header className="px-5 h-16 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xs">M</div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none mb-1">Live Track</h3>
            <p className="text-[8px] font-bold text-rose-500 uppercase tracking-widest">Strict Mode</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-mono text-sm font-black ${timeLeft < 60 ? 'bg-rose-50 text-rose-600 border-rose-100 border animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
            <Timer className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
          <button 
            onClick={handleFinish}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
          >
            End
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="max-w-xl mx-auto">
          {testQuestions.length > 0 && (
            <QuizCard 
              key={testQuestions[currentIndex].id}
              question={testQuestions[currentIndex]}
              selectedOptionId={answers[testQuestions[currentIndex].id]}
              onSelectOption={(oid) => setAnswers(prev => ({ ...prev, [testQuestions[currentIndex].id]: oid }))}
              isSubmitted={false}
            />
          )}
        </div>
      </div>

      <div className="fixed bottom-8 inset-x-0 z-[60] flex justify-center px-6 pointer-events-none">
        <div className="bg-slate-900 rounded-full p-1.5 flex items-center gap-2 shadow-2xl border border-white/10 pointer-events-auto">
          <button 
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all ${currentIndex === 0 ? 'opacity-20' : 'hover:bg-white/10 active:scale-90'}`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="px-4 border-x border-white/10 min-w-[100px] text-center">
            <span className="text-white font-black text-sm">{currentIndex + 1} / {testQuestions.length}</span>
            <div className="w-full bg-white/10 h-1 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-300" 
                style={{ width: `${((currentIndex + 1) / testQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          <button 
            onClick={() => setCurrentIndex(prev => Math.min(testQuestions.length - 1, prev + 1))}
            disabled={currentIndex === testQuestions.length - 1}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all ${currentIndex === testQuestions.length - 1 ? 'opacity-20' : 'hover:bg-white/10 active:scale-90'}`}
          >
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockTestPortal;
