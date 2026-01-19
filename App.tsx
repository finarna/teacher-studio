import React, { useState, useEffect } from 'react';
import { TRIGONOMETRY_LESSON, MOCK_EXAM_ANALYSIS } from './data/lessonContract';
import { ModuleType, UserState, LessonContract, Scan } from './types';
import Dashboard from './components/Dashboard';
import VisualHook from './components/VisualHook';
import ConceptExplainer from './components/ConceptExplainer';
import SimulationStage from './components/SimulationStage';
import LessonSummary from './components/LessonSummary';
import QuizModule from './components/QuizModule';
import ExamModule from './components/ExamModule';
import TeacherConsole from './components/TeacherConsole';
import MasteryReport from './components/MasteryReport';
import LessonCreator from './components/LessonCreator';
import Sidebar from './components/Sidebar';
import BoardMastermind from './components/BoardMastermind';
import ExamAnalysis from './components/ExamAnalysis';
import SketchGallery from './components/SketchGallery';
import RapidRecall from './components/RapidRecall';
import VisualQuestionBank from './components/VisualQuestionBank';
import TrainingStudio from './components/TrainingStudio';
import TrainingViewer from './components/TrainingViewer';
import { ProfessorTrainingContract } from './types';
import { useAdaptiveLogic } from './hooks/useAdaptiveLogic';
import { Home, LayoutDashboard, GraduationCap, ArrowLeft, Bell, Search, User } from 'lucide-react';

const App: React.FC = () => {
  const [onBoarding, setOnBoarding] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [customLessons, setCustomLessons] = useState<LessonContract[]>([]);

  // Navigation State for God Mode
  const [godModeView, setGodModeView] = useState('mastermind');
  const [viewMode, setViewMode] = useState<'STUDENT' | 'GOD_MODE'>('GOD_MODE');

  // God Mode Feature State
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [currentTraining, setCurrentTraining] = useState<ProfessorTrainingContract | null>(null);

  const [userState, setUserState] = useState<UserState>({
    currentModuleIndex: 0,
    masteryScore: 0,
    masteryState: 'NEW',
    quizHistory: [],
    misconceptions: [],
    examUnlocked: false
  });

  const { shouldUnlockExam } = useAdaptiveLogic();

  // Redis Sync Logic
  useEffect(() => {
    const fetchScans = async () => {
      try {
        const res = await fetch('/api/scans');
        if (res.ok) {
          const data = await res.json();
          setRecentScans(data);
        }
      } catch (err) {
        console.error('Failed to initial sync with Redis:', err);
      }
    };
    fetchScans();
  }, []);

  const syncScanToRedis = async (scan: Scan) => {
    try {
      await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scan)
      });
    } catch (err) {
      console.error('Failed to sync scan to Redis:', err);
    }
  };

  const currentLesson: LessonContract | null =
    customLessons.find(l => l.lesson_id === activeLessonId) || null;

  const currentModule = currentLesson?.modules[userState.currentModuleIndex];

  const handleLessonSelection = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setOnBoarding(false);
    setUserState({
      currentModuleIndex: 0,
      masteryScore: 0,
      masteryState: 'NEW',
      quizHistory: [],
      misconceptions: [],
      examUnlocked: false
    });
  };

  const handleBackToDashboard = () => {
    setOnBoarding(true);
    setActiveLessonId(null);
  };

  const handleNext = () => {
    if (currentLesson && userState.currentModuleIndex < currentLesson.modules.length - 1) {
      setUserState(prev => ({ ...prev, currentModuleIndex: prev.currentModuleIndex + 1 }));
    }
  };

  const updateMastery = (points: number) => {
    setUserState(prev => ({ ...prev, masteryScore: Math.min(100, prev.masteryScore + points) }));
  };

  const handleQuizComplete = (score: number, failedIds: string[]) => {
    const unlocked = shouldUnlockExam(score);
    setUserState(prev => ({
      ...prev,
      masteryScore: Math.floor((prev.masteryScore + score) / 2),
      misconceptions: [...prev.misconceptions, ...failedIds],
      examUnlocked: unlocked,
    }));
    handleNext();
  };

  const renderModule = () => {
    if (!currentModule) return <div className="p-10">Loading module...</div>;

    switch (currentModule.type) {
      case ModuleType.HOOK:
        return <VisualHook
          title={currentModule.title}
          scenario={currentModule.content.scenario}
          imageUrl={currentLesson?.bannerImageUrl || ''}
          onNext={handleNext}
        />;

      case ModuleType.CONCEPT:
        return <ConceptExplainer
          content={currentModule.content}
          onNext={handleNext}
        />;

      case ModuleType.SIMULATION:
        return <SimulationStage
          content={currentModule.content}
          onNext={handleNext}
          onUpdateScore={updateMastery}
        />;

      case ModuleType.GUIDED_PRACTICE:
        return <ConceptExplainer
          content={{
            slides: [{
              id: 'guided-practice-1',
              type: 'guided_solution',
              title: "Guided Challenge",
              content: `Practice: ${currentModule.content.problem || 'Solve for the missing value.'}`,
              bulletPoints: currentModule.content.steps || [],
              highlight: `Expected Answer: ${currentModule.content.solution || '...'}`,
              imageUrl: currentModule.content.imageUrl
            }]
          }}
          onNext={handleNext}
        />;

      case ModuleType.LESSON_SUMMARY:
        return <LessonSummary
          title={currentModule.title}
          content={currentModule.content}
          onNext={handleNext}
        />;

      case ModuleType.ADAPTIVE_QUIZ:
        return <QuizModule
          questions={currentModule.content.questions || []}
          onComplete={handleQuizComplete}
        />;

      case ModuleType.EXAM_MODE:
        if (!userState.examUnlocked) {
          return <div className="p-10 text-center flex flex-col items-center justify-center h-full bg-slate-50">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <Home size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Final Exam Locked</h2>
            <p className="mb-6 text-slate-500 max-w-sm">Achieve over 80% in the assessment to attempt the official board-level exam.</p>
            <button onClick={handleNext} className="bg-primary-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-primary-200">Skip to Progress Report</button>
          </div>
        }
        return <ExamModule
          durationMinutes={currentModule.content.durationMinutes || 10}
          questions={currentModule.content.questions || []}
          onComplete={(score) => {
            updateMastery(score);
            handleNext();
          }}
        />

      case ModuleType.MASTERY_REPORT:
        return <MasteryReport
          score={userState.masteryScore}
          misconceptions={userState.misconceptions}
          currentLesson={currentLesson!}
          onRestart={() => setUserState({
            currentModuleIndex: 0,
            masteryScore: 0,
            masteryState: 'NEW',
            quizHistory: [],
            misconceptions: [],
            examUnlocked: false
          })}
          onShowTeacherView={() => { }} // Placeholder, logic handled via God Mode
        />;

      default:
        return <div className="p-10">Module Ready...</div>;
    }
  };

  // --- GOD MODE ROUTER ---
  if (viewMode === 'GOD_MODE') {
    return (
      <div className="flex h-screen bg-white text-slate-900 font-instrument overflow-hidden">
        <Sidebar activeView={godModeView} onNavigate={setGodModeView} />

        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50/50">

          {/* Global Compact Header for Desktop */}
          <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 z-40 shrink-0">
            <div className="flex items-center gap-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Teacher Panel <span className="opacity-30">/</span> <span className="text-primary-600 italic">Central Intelligence</span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2.5 py-1">
                <Search size={12} className="text-slate-400" />
                <input type="text" placeholder="Global Search..." className="bg-transparent border-0 outline-none text-[10px] font-black text-slate-900 w-32 placeholder:text-slate-400 uppercase tracking-widest" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors relative">
                <Bell size={18} />
                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary-500 rounded-full border border-white" />
              </button>
              <div className="h-6 w-px bg-slate-200" />
              <button
                onClick={() => setViewMode('STUDENT')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white hover:bg-primary-600 rounded-lg text-[10px] font-black transition-all shadow-sm uppercase tracking-widest"
              >
                <GraduationCap size={14} /> Student View
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-hidden relative">
            {godModeView === 'mastermind' && (
              <div className="h-full overflow-y-auto scroller-hide p-8 bg-slate-50/50">
                <div className="max-w-7xl mx-auto space-y-6">
                  {/* Dashboard Header */}
                  <div>
                    <h1 className="text-3xl font-black text-slate-900 font-outfit uppercase tracking-tight">Teacher Dashboard</h1>
                    <p className="text-sm text-slate-500 font-bold mt-1">Central command for all teaching operations</p>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                          <LayoutDashboard size={20} className="text-blue-600" />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Scans</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900 font-outfit">{recentScans.length}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                          <GraduationCap size={20} className="text-emerald-600" />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Students</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900 font-outfit">24</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                          <Search size={20} className="text-amber-600" />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Questions</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900 font-outfit">{recentScans.reduce((acc, scan) => acc + (scan.analysisData?.questions?.length || 0), 0)}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                          <Bell size={20} className="text-rose-600" />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Alerts</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900 font-outfit">3</div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setGodModeView('scanning')}
                      className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-primary-400 hover:shadow-lg transition-all text-left group"
                    >
                      <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Home size={24} className="text-primary-600" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 font-outfit uppercase mb-1">Scan New Paper</h3>
                      <p className="text-xs text-slate-500 font-bold">Upload and analyze exam papers with AI</p>
                    </button>
                    <button
                      onClick={() => setGodModeView('recall')}
                      className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-primary-400 hover:shadow-lg transition-all text-left group"
                    >
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <User size={24} className="text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 font-outfit uppercase mb-1">Rapid Recall</h3>
                      <p className="text-xs text-slate-500 font-bold">Generate flashcards for quick revision</p>
                    </button>
                    <button
                      onClick={() => setGodModeView('training_studio')}
                      className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-primary-400 hover:shadow-lg transition-all text-left group"
                    >
                      <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <ArrowLeft size={24} className="text-amber-600" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 font-outfit uppercase mb-1">Pedagogy Studio</h3>
                      <p className="text-xs text-slate-500 font-bold">Create custom training materials</p>
                    </button>
                  </div>

                  {/* Recent Scans */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-black text-slate-900 font-outfit uppercase">Recent Scans</h2>
                      <button
                        onClick={() => setGodModeView('scanning')}
                        className="text-xs font-black text-primary-600 uppercase tracking-widest hover:text-primary-700"
                      >
                        View All →
                      </button>
                    </div>
                    <div className="space-y-3">
                      {recentScans.slice(0, 5).map(scan => (
                        <button
                          key={scan.id}
                          onClick={() => {
                            setSelectedScan(scan);
                            setGodModeView('analysis');
                          }}
                          className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-left"
                        >
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            <Home size={18} className="text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-slate-900 truncate">{scan.name}</h4>
                            <p className="text-xs text-slate-500 font-bold">{scan.subject} • {scan.grade}</p>
                          </div>
                          <ArrowLeft size={16} className="text-slate-300" />
                        </button>
                      ))}
                      {recentScans.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-sm text-slate-400 font-bold">No scans yet. Start by scanning a paper!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {godModeView === 'analysis' && (
              <div className="h-full overflow-y-auto scroller-hide">
                <ExamAnalysis
                  onBack={() => setGodModeView('mastermind')}
                  scan={selectedScan}
                  onGenerateTraining={() => setGodModeView('training_studio')}
                  onUpdateScan={(updatedScan) => {
                    setRecentScans(prev => prev.map(s => s.id === updatedScan.id ? updatedScan : s));
                    setSelectedScan(updatedScan);
                    syncScanToRedis(updatedScan);
                  }}
                />
              </div>
            )}
            {godModeView === 'training_studio' && (
              <div className="h-full overflow-y-auto scroller-hide">
                <TrainingStudio
                  onClose={() => setGodModeView('mastermind')}
                  selectedScan={selectedScan}
                  onTrainingCreated={(training) => {
                    setCurrentTraining(training);
                    setGodModeView('training_viewer');
                  }}
                />
              </div>
            )}
            {godModeView === 'training_viewer' && currentTraining && (
              <div className="h-full overflow-y-auto scroller-hide">
                <TrainingViewer
                  training={currentTraining}
                  onBack={() => setGodModeView('training_studio')}
                />
              </div>
            )}
            {godModeView === 'gallery' && (
              <div className="h-full">
                <SketchGallery
                  onBack={() => setGodModeView('mastermind')}
                  scan={selectedScan}
                  recentScans={recentScans}
                  onUpdateScan={(updatedScan) => {
                    setRecentScans(prev => prev.map(s => s.id === updatedScan.id ? updatedScan : s));
                    setSelectedScan(updatedScan);
                    syncScanToRedis(updatedScan);
                  }}
                />
              </div>
            )}
            {godModeView === 'recall' && <div className="h-full overflow-y-auto scroller-hide"><RapidRecall recentScans={recentScans} /></div>}
            {godModeView === 'questions' && <div className="h-full overflow-y-auto scroller-hide"><VisualQuestionBank recentScans={recentScans} /></div>}
            {godModeView === 'scanning' && (
              <div className="h-full overflow-y-auto scroller-hide">
                <BoardMastermind
                  onNavigate={setGodModeView}
                  recentScans={recentScans}
                  onAddScan={(scan) => {
                    setRecentScans(prev => [...prev, scan]);
                    syncScanToRedis(scan);
                  }}
                  onSelectScan={(scan) => setSelectedScan(scan)}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // --- STUDENT MODE ---

  if (isCreatorOpen) {
    return (
      <LessonCreator
        onClose={() => setIsCreatorOpen(false)}
        onLessonCreated={(newLesson) => {
          setCustomLessons(prev => [newLesson, ...prev]);
          setIsCreatorOpen(false);
          handleLessonSelection(newLesson.lesson_id);
        }}
      />
    );
  }

  if (onBoarding) {
    return (
      <div className="relative">
        <button
          onClick={() => setViewMode('GOD_MODE')}
          className="fixed bottom-6 right-6 z-[100] px-6 py-3 bg-slate-900 text-white font-black rounded-full transition-all shadow-2xl hover:scale-105 flex items-center gap-2 border border-slate-700 text-xs uppercase tracking-widest font-outfit"
          title="Enter Teacher God Mode"
        >
          <LayoutDashboard size={18} /> Master Console
        </button>

        <Dashboard
          onSelectLesson={handleLessonSelection}
          customLessons={customLessons}
          onOpenCreator={() => setIsCreatorOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden font-instrument text-slate-900 bg-[#f8fafc] flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-50 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={handleBackToDashboard} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <Home size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-950 rounded-lg flex items-center justify-center text-white font-black text-[10px] tracking-widest shadow-lg transform -rotate-3 hover:rotate-0 transition-transform">EDU</div>
            <span className="font-extrabold text-slate-900 text-sm tracking-tight font-outfit uppercase">{currentLesson?.title || 'Lesson'}</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] font-outfit">Neural Mastery</span>
          <div className="flex items-center gap-3">
            <div className="w-40 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(20,184,166,0.5)]" style={{ width: `${userState.masteryScore}%` }}></div>
            </div>
            <span className="text-[10px] font-black text-slate-700 mt-1">{userState.masteryScore}%</span>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-hidden relative">
        {renderModule()}
      </main>
    </div>
  );
};

export default App;