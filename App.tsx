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
import VidyaV2 from './components/VidyaV2';
import VidyaV3 from './components/VidyaV3';
import SettingsPanel from './components/SettingsPanel';
import { ToastProvider, useToast } from './components/ToastNotification';
import { ConfirmProvider, useConfirm } from './components/ConfirmDialog';
import { AuthProvider, useAuth, AuthLoading } from './components/AuthProvider';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { supabase } from './lib/supabase';
import { ProfessorTrainingContract } from './types';
import { VidyaActions } from './types/vidya';
import { useAdaptiveLogic } from './hooks/useAdaptiveLogic';
import { isFeatureEnabled } from './utils/featureFlags';
import { Home, LayoutDashboard, GraduationCap, ArrowLeft, Bell, Search, User, LogOut } from 'lucide-react';
import { AppContextProvider } from './contexts/AppContext';
import { SubjectSwitcher } from './components/SubjectSwitcher';
import { checkAndClearOldCache } from './utils/cacheRefresh';
import LandingPage from './components/landing/LandingPage';
import PaymentGate from './components/PaymentGate';
import UserProfile from './components/UserProfile';
import { getApiUrl } from './lib/api';
import { LearningJourneyProvider } from './contexts/LearningJourneyContext';
import LearningJourneyApp from './components/LearningJourneyApp';

/**
 * Authentication Gate Component
 * Shows login/signup screens when user is not authenticated
 */
const AuthGate: React.FC = () => {
  const [showLogin, setShowLogin] = useState(true);

  return showLogin ? (
    <LoginForm
      onSwitchToSignup={() => setShowLogin(false)}
      onSuccess={() => {
        // Success is handled by AuthProvider's state change
      }}
    />
  ) : (
    <SignupForm
      onSwitchToLogin={() => setShowLogin(true)}
      onSuccess={() => {
        // Success is handled by AuthProvider's state change
      }}
    />
  );
};

const AppContent: React.FC = () => {
  // ===== ALL HOOKS MUST BE AT THE TOP (before any conditional returns) =====
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { user, loading: authLoading, signOut } = useAuth();

  // App State
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

  // Landing Page State
  const [showLanding, setShowLanding] = useState(() => {
    const hasSeenLanding = localStorage.getItem('edujourney_landing_seen') === 'true';
    return !hasSeenLanding; // Will be checked with !user condition in render
  });

  // Subscription Status State
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasActiveSubscription: boolean;
    loading: boolean;
  }>({
    hasActiveSubscription: false,
    loading: true,
  });

  // Subscription refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ===== EFFECTS (must be before conditional returns) =====
  // Clear old cache after migration (runs once on mount)
  useEffect(() => {
    checkAndClearOldCache();
  }, []);

  // State persistence - Save critical state to localStorage
  useEffect(() => {
    if (!user) return;

    const stateToSave = {
      godModeView,
      selectedScanId: selectedScan?.id || null,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(`edujourney_app_state_${user.id}`, JSON.stringify(stateToSave));
    } catch (err) {
      console.error('Failed to save app state:', err);
    }
  }, [godModeView, selectedScan?.id, user?.id]);

  // Restore state on mount/user change
  useEffect(() => {
    if (!user) return;

    try {
      const savedState = localStorage.getItem(`edujourney_app_state_${user.id}`);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Only restore if saved within last hour (prevent stale state)
        if (Date.now() - parsed.timestamp < 3600000) {
          if (parsed.godModeView && parsed.godModeView !== godModeView) {
            setGodModeView(parsed.godModeView);
          }
          // selectedScan will be restored after scans are fetched
        }
      }
    } catch (err) {
      console.error('Failed to restore app state:', err);
    }
  }, [user?.id]);

  // Page Visibility API - Prevent disruptions when switching tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Tab became visible - maintaining state');
        // Tab is now visible - do NOT reset state
        // Just ensure auth session is still valid (Supabase handles this automatically)
      } else {
        console.log('💤 Tab hidden - preserving state');
        // Tab is hidden - state is automatically preserved
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Supabase Backend Sync Logic (Port 9001)
  useEffect(() => {
    if (!user) return; // Only fetch when user is authenticated

    const fetchScans = async () => {
      try {
        // Get auth token from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Add auth token if available
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('http://localhost:9001/api/scans', { headers });
        if (res.ok) {
          const data = await res.json();
          setRecentScans(data);

          // Try to restore previously selected scan from localStorage
          try {
            const savedState = localStorage.getItem(`edujourney_app_state_${user.id}`);
            if (savedState) {
              const parsed = JSON.parse(savedState);
              if (parsed.selectedScanId && Date.now() - parsed.timestamp < 3600000) {
                const savedScan = data.find((s: Scan) => s.id === parsed.selectedScanId);
                if (savedScan) {
                  setSelectedScan(savedScan);
                  return;
                }
              }
            }
          } catch (err) {
            console.error('Failed to restore selected scan:', err);
          }

          // Auto-select the latest scan if none is selected
          if (data.length > 0 && !selectedScan) {
            setSelectedScan(data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to sync with Supabase backend:', err);
      }
    };
    fetchScans();
  }, [user?.id]); // Use user.id instead of full user object to prevent unnecessary re-runs

  // Auto-select latest scan when switching to analysis view
  useEffect(() => {
    if (godModeView === 'analysis' && !selectedScan && recentScans.length > 0) {
      setSelectedScan(recentScans[0]);
    }
  }, [godModeView, selectedScan, recentScans]);

  // Check subscription status when user is authenticated
  useEffect(() => {
    if (!user) {
      setSubscriptionStatus({ hasActiveSubscription: false, loading: false });
      return;
    }

    const checkSubscription = async () => {
      try {
        setSubscriptionStatus(prev => ({ ...prev, loading: true }));

        // Get auth token from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        try {
          const response = await fetch(getApiUrl('/api/subscription/status'), {
            headers,
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            setSubscriptionStatus({
              hasActiveSubscription: data.hasActiveSubscription,
              loading: false,
            });
          } else {
            console.warn('Subscription API returned error, bypassing in development');
            // In development, bypass subscription check if API fails
            setSubscriptionStatus({
              hasActiveSubscription: import.meta.env.DEV ? true : false,
              loading: false,
            });
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.warn('Subscription check timed out - bypassing in development mode');
          } else {
            console.error('Subscription check failed:', fetchError);
          }
          // In development mode, bypass subscription gate
          setSubscriptionStatus({
            hasActiveSubscription: import.meta.env.DEV ? true : false,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Failed to check subscription status:', error);
        // In development mode, bypass subscription gate
        setSubscriptionStatus({
          hasActiveSubscription: import.meta.env.DEV ? true : false,
          loading: false,
        });
      }
    };

    checkSubscription();
  }, [user?.id, refreshTrigger]); // Use user.id instead of full user object

  // ===== CONDITIONAL RENDERING (after all hooks) =====
  // Show loading screen while auth is initializing
  if (authLoading) {
    return <AuthLoading />;
  }

  // Show landing page for first-time visitors
  if (showLanding && !user) {
    return (
      <LandingPage
        onGetStarted={() => {
          localStorage.setItem('edujourney_landing_seen', 'true');
          setShowLanding(false);
        }}
      />
    );
  }

  // Show login/signup if not authenticated
  if (!user) {
    return <AuthGate />;
  }

  // Check subscription status for authenticated users
  if (subscriptionStatus.loading) {
    return <AuthLoading />;
  }

  // Show payment gate if user has no active subscription
  if (!subscriptionStatus.hasActiveSubscription) {
    return (
      <PaymentGate
        onRefresh={() => setRefreshTrigger(prev => prev + 1)}
      />
    );
  }

  const syncScanToSupabase = async (scan: Scan) => {
    try {
      console.log(`🔄 Syncing scan to Supabase: ${scan.id}`, {
        subject: scan.subject,
        questionCount: scan.analysisData?.questions?.length,
        questionsWithSketches: scan.analysisData?.questions?.filter(q => q.sketchSvg).length || 0
      });

      // Get auth token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add auth token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Always POST - backend has upsert logic (checks if scan exists and updates/creates accordingly)
      console.log(`📝 Upserting scan ${scan.id}`);

      const response = await fetch('http://localhost:9001/api/scans', {
        method: 'POST',
        headers,
        body: JSON.stringify(scan)
      });

      const result = await response.json();
      console.log(`✅ Scan upserted in Supabase:`, result);

      if (!response.ok) {
        console.error(`❌ Failed to sync scan: HTTP ${response.status}`, result);
      }
    } catch (err) {
      console.error('❌ Failed to sync scan to Supabase:', err);
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
      <div className="flex h-screen bg-white text-slate-900 font-instrument">
        <Sidebar
          activeView={godModeView}
          onNavigate={setGodModeView}
          userName={user?.email?.split('@')[0] || 'User'}
          onStudentView={() => setViewMode('STUDENT')}
          onLogout={async () => {
            const confirmed = await confirm({
              title: 'Sign Out',
              message: 'Are you sure you want to sign out?',
              type: 'warning',
            });
            if (confirmed) {
              await signOut();
              showToast('Signed out successfully', 'success');
            }
          }}
        />

        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50/50">

          {/* Global Compact Header for Desktop */}
          <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 z-40 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2.5 py-1">
                <Search size={12} className="text-slate-400" />
                <input type="text" placeholder="Global Search..." className="bg-transparent border-0 outline-none text-[10px] font-black text-slate-900 w-32 placeholder:text-slate-400 uppercase tracking-widest" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* GLOBAL Subject Switcher - Primary Control */}
              <SubjectSwitcher />
              <div className="h-6 w-px bg-slate-200" />
              <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors relative">
                <Bell size={18} />
                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary-500 rounded-full border border-white" />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto relative">
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
                    syncScanToSupabase(updatedScan);
                  }}
                  recentScans={recentScans}
                  onSelectScan={setSelectedScan}
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
                    syncScanToSupabase(updatedScan);
                  }}
                />
              </div>
            )}
            {godModeView === 'recall' && <div className="h-full overflow-y-auto scroller-hide"><RapidRecall recentScans={recentScans} /></div>}
            {godModeView === 'learning_journey' && (
              <div className="h-full overflow-y-auto scroller-hide">
                <LearningJourneyProvider userId={user?.id || ''}>
                  <LearningJourneyApp onBack={() => setGodModeView('mastermind')} />
                </LearningJourneyProvider>
              </div>
            )}
            {godModeView === 'questions' && <div className="h-full overflow-y-auto scroller-hide"><VisualQuestionBank recentScans={recentScans} /></div>}
            {godModeView === 'profile' && (
              <div className="h-full overflow-hidden">
                <UserProfile onBack={() => setGodModeView('mastermind')} />
              </div>
            )}
            {godModeView === 'settings' && (
              <div className="h-full">
                <SettingsPanel onBack={() => setGodModeView('mastermind')} />
              </div>
            )}
            {godModeView === 'scanning' && (
              <div className="h-full overflow-y-auto scroller-hide">
                <BoardMastermind
                  onNavigate={setGodModeView}
                  recentScans={recentScans}
                  onAddScan={(scan) => {
                    setRecentScans(prev => [...prev, scan]);
                    syncScanToSupabase(scan);
                  }}
                  onSelectScan={(scan) => setSelectedScan(scan)}
                />
              </div>
            )}
          </main>

          {/* Vidya AI Assistant - Feature Flag: V2 or V3 */}
          {isFeatureEnabled('useVidyaV3') ? (
            <VidyaV3
              appContext={{
                scannedPapers: recentScans,
                selectedScan: selectedScan,
                currentView: godModeView,
              }}
            />
          ) : (
            <VidyaV2
              userRole="teacher"
              appContext={{
                scannedPapers: recentScans,
                selectedScan: selectedScan,
                customLessons: customLessons,
                currentView: godModeView,
              }}
              actions={{
                navigateTo: (view) => setGodModeView(view),
                goBack: () => setGodModeView('mastermind'),
                scanPaper: () => setGodModeView('mastermind'),
                createLesson: () => setIsCreatorOpen(true),
                viewAnalysis: (scanId) => {
                  const scan = recentScans.find((s) => s.id === scanId);
                  if (scan) setSelectedScan(scan);
                  setGodModeView('analysis');
                },
                generateSketches: (scanId) => {
                  const scan = recentScans.find((s) => s.id === scanId);
                  if (scan) setSelectedScan(scan);
                  setGodModeView('sketches');
                },
                exportData: async (type, data) => {
                  console.log(`Exporting as ${type}:`, data);
                  // TODO: Implement actual export logic
                },
                showNotification: (message, type) => {
                  showToast(message, type);
                },
                confirmAction: async (title, message, type = 'danger') => {
                  return await confirm({ title, message, type });
                },
                openModal: (modalId, props) => {
                  console.log('Open modal:', modalId, props);
                  // TODO: Implement modal system
                },
                closeModal: () => {
                  console.log('Close modal');
                },
              }}
            />
          )}
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

      {/* Vidya AI Assistant - Feature Flag: V2 or V3 */}
      {isFeatureEnabled('useVidyaV3') ? (
        <VidyaV3
          appContext={{
            currentView: currentModule?.type,
          }}
        />
      ) : (
        <VidyaV2
          userRole="student"
          appContext={{
            currentLesson: currentLesson,
            userProgress: {
              masteryScore: userState.masteryScore,
              currentModule: currentModule?.title || '',
              quizHistory: userState.quizHistory,
              misconceptions: userState.misconceptions,
            },
            currentView: currentModule?.type,
          }}
          actions={{
            navigateTo: (view) => {
              console.log('Navigate to:', view);
              // Student mode navigation (limited)
            },
            goBack: handleBackToDashboard,
            scanPaper: () => {
              console.log('Students cannot scan papers');
            },
            createLesson: () => {
              console.log('Students cannot create lessons');
            },
            viewAnalysis: (scanId) => {
              console.log('View analysis:', scanId);
            },
            generateSketches: (scanId) => {
              console.log('Generate sketches:', scanId);
            },
            exportData: async (type, data) => {
              console.log(`Export as ${type}:`, data);
            },
            showNotification: (message, type) => {
              showToast(message, type);
            },
            confirmAction: async (title, message, type = 'danger') => {
              return await confirm({ title, message, type });
            },
            openModal: (modalId, props) => {
              console.log('Open modal:', modalId, props);
            },
            closeModal: () => {
              console.log('Close modal');
            },
          }}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContextProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppContent />
          </ConfirmProvider>
        </ToastProvider>
      </AppContextProvider>
    </AuthProvider>
  );
};

export default App;