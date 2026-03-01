
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { EXAM_DATA } from './constants';
import { Question, TopicMastery, ExamType, SubjectType, UserRole, MockTestSession } from './types';
import QuizCard from './components/QuizCard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import LandingPage from './components/LandingPage';
import AIChatBot from './components/AIChatBot';
import SmartNotesModal from './components/SmartNotesModal';
import Dashboard from './components/Dashboard';
import SubjectHub from './components/SubjectHub';
import AdminPortal from './components/AdminPortal';
import SolvedPaperLibrary from './components/SolvedPaperLibrary';
import MockTestPortal from './components/MockTestPortal';
import TrajectoryPath from './components/TrajectoryPath';
import { 
  Home, BookOpen, BarChart2, Menu, X, 
  ChevronLeft, LogOut, Bell, 
  User, LayoutDashboard, PlusCircle, ArrowRight,
  Trophy
} from 'lucide-react';

type View = 'selection' | 'hub' | 'quiz' | 'analytics' | 'admin' | 'landing' | 'archives' | 'mock-test-active';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('landing');
  const [userRole, setUserRole] = useState<UserRole>('student');
  const [selectedExam, setSelectedExam] = useState<ExamType | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [hubQuestions, setHubQuestions] = useState<Question[]>(() => {
    try {
      const saved = localStorage.getItem('bm_hub_v11');
      return saved ? JSON.parse(saved) : EXAM_DATA;
    } catch (e) { return EXAM_DATA; }
  });

  const [mockHistory, setMockHistory] = useState<MockTestSession[]>(() => {
    try {
      const saved = localStorage.getItem('bm_mock_v11');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [isPracticeFinished, setIsPracticeFinished] = useState(false);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [selectedQuestionForNotes, setSelectedQuestionForNotes] = useState<Question | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem('bm_hub_v11', JSON.stringify(hubQuestions));
    } catch (e) { console.error("Sync error"); }
  }, [hubQuestions]);

  const activeQuestions = useMemo(() => {
    if (!selectedSubject) return [];
    return hubQuestions.filter(q => q.subject.toLowerCase() === selectedSubject.toLowerCase());
  }, [hubQuestions, selectedSubject]);

  const navigateBack = useCallback(() => {
    const prevMap: Record<string, View> = {
      'archives': 'hub', 'quiz': 'hub', 'mock-test-active': 'hub', 'analytics': 'hub',
      'hub': 'selection', 'selection': 'landing', 'admin': 'landing'
    };
    setActiveView(prevMap[activeView] || 'landing');
  }, [activeView]);

  const handleLandingEnter = (role: UserRole) => {
    setUserRole(role);
    setActiveView(role === 'admin' ? 'admin' : 'selection');
  };

  const showHeader = !['landing', 'mock-test-active', 'quiz'].includes(activeView);
  const showBottomNav = showHeader && activeView !== 'admin';

  if (activeView === 'landing') return <LandingPage onEnter={handleLandingEnter} />;

  return (
    <div className="fixed inset-0 bg-white flex flex-col font-sans overflow-hidden select-none text-slate-950">
      {/* MINIMAL DRAWER */}
      <div className={`fixed inset-0 z-[110] transition-opacity duration-500 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
        <div className={`absolute inset-y-0 left-0 w-[280px] bg-white transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full p-10 space-y-12">
            <div className="flex items-center gap-5 border-b border-slate-50 pb-10">
              <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-2xl"><User className="w-7 h-7" /></div>
              <div>
                <h2 className="font-black text-[11px] uppercase tracking-[0.2em] leading-none">IDENTIFIER</h2>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-2">{userRole} AUTH</p>
              </div>
            </div>
            <nav className="flex-1 space-y-3">
              <button onClick={() => { setActiveView('selection'); setIsDrawerOpen(false); }} className="w-full flex items-center gap-5 p-5 rounded-2xl hover:bg-slate-50 text-slate-500 hover:text-slate-950 font-black uppercase text-[11px] tracking-widest transition-all">
                <LayoutDashboard className="w-6 h-6" /> DASHBOARD
              </button>
              <button onClick={() => { setActiveView('analytics'); setIsDrawerOpen(false); }} className="w-full flex items-center gap-5 p-5 rounded-2xl hover:bg-slate-50 text-slate-500 hover:text-slate-950 font-black uppercase text-[11px] tracking-widest transition-all">
                <BarChart2 className="w-6 h-6" /> ANALYTICS
              </button>
            </nav>
            <button onClick={() => setActiveView('landing')} className="py-5 text-slate-300 font-black uppercase text-[10px] tracking-[0.4em] hover:text-rose-600 transition-all flex items-center justify-center gap-4">
              <LogOut className="w-5 h-5" /> EXIT HUB
            </button>
          </div>
        </div>
      </div>

      {showHeader && (
        <header className="px-8 h-20 bg-white flex items-center justify-between shrink-0 z-50 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <button onClick={navigateBack} className="p-4 rounded-2xl hover:bg-slate-50 active:scale-90 transition-all"><ChevronLeft className="w-6 h-6 text-slate-400" /></button>
            <button onClick={() => setIsDrawerOpen(true)} className="p-4 rounded-2xl hover:bg-slate-50 active:scale-90 transition-all"><Menu className="w-6 h-6 text-slate-400" /></button>
          </div>
          <div className="text-center">
            <h1 className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-200 mb-0.5">{selectedSubject || 'NEURAL CORE'}</h1>
            <p className="text-[14px] font-black uppercase tracking-tight">STRATEGY HUB</p>
          </div>
          <button className="p-4 rounded-2xl relative hover:bg-slate-50 group">
            <Bell className="w-6 h-6 text-slate-300 group-hover:text-indigo-600 transition-colors" />
            <span className="absolute top-4 right-4 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white" />
          </button>
        </header>
      )}

      {showHeader && activeView !== 'admin' && (
        <TrajectoryPath currentView={activeView} selectedExam={selectedExam} selectedSubject={selectedSubject} />
      )}

      <main className={`flex-1 overflow-y-auto bg-white ${!showBottomNav ? 'pb-safe' : 'pb-24'}`}>
        <div className="max-w-4xl mx-auto h-full px-6">
          {activeView === 'selection' && (
            <div className="space-y-12 py-10">
              <Dashboard selectedExam={selectedExam} onSelectExam={setSelectedExam} onSelectSubject={(s) => { setSelectedSubject(s); setActiveView('hub'); }} onBack={() => setSelectedExam(null)} mockHistory={mockHistory} />
              {userRole === 'admin' && !selectedExam && (
                <button onClick={() => setActiveView('admin')} className="w-full bg-slate-50 border border-slate-100 rounded-[2.5rem] p-10 flex items-center justify-between group active:scale-95 transition-all">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-rose-100"><PlusCircle className="w-8 h-8" /></div>
                    <div className="text-left">
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">CONTENT FORGE</h4>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">DIGITIZE CURRICULUM</p>
                    </div>
                  </div>
                  <ArrowRight className="w-8 h-8 text-slate-300 group-hover:translate-x-4 transition-all" />
                </button>
              )}
            </div>
          )}
          {activeView === 'hub' && <SubjectHub exam={selectedExam} subject={selectedSubject} onStartSimulation={() => { setQuizIndex(0); setIsPracticeFinished(false); setActiveView('quiz'); }} onStartMockTest={() => setActiveView('mock-test-active')} onViewArchives={() => setActiveView('archives')} onViewAnalytics={() => setActiveView('analytics')} topicMastery={[]} />}
          {activeView === 'archives' && <SolvedPaperLibrary subject={selectedSubject} questions={activeQuestions} />}
          {activeView === 'quiz' && (
            <div className="h-full flex flex-col bg-white">
              {!isPracticeFinished ? (
                <>
                  <header className="px-8 h-16 flex items-center justify-between border-b border-slate-50">
                    <button onClick={() => setActiveView('hub')} className="p-2"><ChevronLeft className="w-5 h-5" /></button>
                    <div className="text-center font-black uppercase text-[10px] tracking-widest text-indigo-600">{quizIndex + 1} <span className="text-slate-200 mx-1">/</span> {activeQuestions.length}</div>
                    <div className="w-10" />
                  </header>
                  <div className="flex-1 overflow-y-auto px-4 py-8 pb-48"><QuizCard key={activeQuestions[quizIndex]?.id} question={activeQuestions[quizIndex]} selectedOptionId={practiceAnswers[activeQuestions[quizIndex]?.id]} onSelectOption={(id) => setPracticeAnswers(p => ({ ...p, [activeQuestions[quizIndex].id]: id }))} isSubmitted={false} onShowNotes={setSelectedQuestionForNotes} /></div>
                  <div className="fixed bottom-10 inset-x-0 flex justify-center px-6 z-[100]">
                    <div className="bg-slate-950 rounded-full p-2 flex items-center gap-6 shadow-2xl border border-white/10">
                      <button onClick={() => setQuizIndex(p => Math.max(0, p - 1))} className="w-12 h-12 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all"><ChevronLeft className="w-5 h-5" /></button>
                      <div className="w-px h-6 bg-white/10" />
                      {quizIndex === activeQuestions.length - 1 ? <button onClick={() => setIsPracticeFinished(true)} className="px-10 h-12 bg-indigo-600 text-white rounded-full font-black uppercase text-[10px] tracking-widest">FINISH SESSION</button> : <button onClick={() => setQuizIndex(p => Math.min(activeQuestions.length - 1, p + 1))} className="w-12 h-12 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all rotate-180"><ChevronLeft className="w-5 h-5" /></button>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-10 animate-in zoom-in-95 duration-700">
                  <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-100"><Trophy className="w-8 h-8 text-white" /></div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">SIMULATION COMPLETE</h2>
                  <button onClick={() => setActiveView('analytics')} className="w-full max-w-sm py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl">VIEW ANALYTICS</button>
                </div>
              )}
            </div>
          )}
          {activeView === 'admin' && <AdminPortal onPushToHub={(qs) => { setHubQuestions(p => [...p, ...qs]); setActiveView('selection'); }} currentHubSize={hubQuestions.length} />}
        </div>
      </main>

      {showBottomNav && (
        <nav className="fixed bottom-0 inset-x-0 h-20 bg-white/80 backdrop-blur-xl border-t border-slate-50 flex items-center justify-around px-10 pb-safe z-50">
          <button onClick={() => setActiveView('selection')} className={`flex flex-col items-center gap-2 transition-all ${activeView === 'selection' ? 'text-indigo-600 scale-105' : 'text-slate-300'}`}><Home className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">HOME</span></button>
          <button onClick={() => selectedExam && setActiveView('hub')} className={`flex flex-col items-center gap-2 transition-all ${activeView === 'hub' ? 'text-indigo-600 scale-105' : 'text-slate-300'}`}><BookOpen className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">HUB</span></button>
          <button onClick={() => setActiveView('analytics')} className={`flex flex-col items-center gap-2 transition-all ${activeView === 'analytics' ? 'text-indigo-600 scale-105' : 'text-slate-300'}`}><BarChart2 className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">STATS</span></button>
        </nav>
      )}

      {activeView !== 'landing' && <div className="fixed bottom-24 right-8 z-[120]"><AIChatBot context={{ allQuestions: activeQuestions, userAnswers: practiceAnswers, masteryData: {}, isSubmitted: false, activeView, selectedSubject: selectedSubject || undefined, mockHistory }} /></div>}
      {selectedQuestionForNotes && <SmartNotesModal question={selectedQuestionForNotes} onClose={() => setSelectedQuestionForNotes(null)} />}
    </div>
  );
};

export default App;
