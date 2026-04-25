import React, { useState, useEffect } from 'react';
import { UserState, Scan } from './types';
import Sidebar from './components/Sidebar';
import ExamAnalysis from './components/ExamAnalysis';
import SketchGallery from './components/SketchGallery';
import RapidRecall from './components/RapidRecall';
import VisualQuestionBank from './components/VisualQuestionBank';
import BoardMastermind from './components/BoardMastermind';
import VidyaV3 from './components/VidyaV3';
import SettingsPanel from './components/SettingsPanel';
import TrainingStudio from './components/TrainingStudio';
import TrainingViewer from './components/TrainingViewer';
import { ToastProvider, useToast } from './components/ToastNotification';
import { ConfirmProvider, useConfirm } from './components/ConfirmDialog';
import { AuthProvider, useAuth, AuthLoading } from './components/AuthProvider';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { supabase } from './lib/supabase';
import { ProfessorTrainingContract } from './types';
import { Home, LayoutDashboard, GraduationCap, Bell, Search, User, CheckCircle2, Menu, Map, ScanLine, Sparkles, FileText, ChevronRight, Library, ChevronLeft, LayoutGrid, Zap, Clock, TrendingUp, CheckCircle } from 'lucide-react';
import { useLearningJourney } from './contexts/LearningJourneyContext';
import { useIsMobile } from './hooks/useIsMobile';
import { AppContextProvider } from './contexts/AppContext';
import { SubjectSwitcher } from './components/SubjectSwitcher';
import { checkAndClearOldCache } from './utils/cacheRefresh';
import LandingPage from './components/landing/LandingPage';
import PaymentGate from './components/PaymentGate';
import UserProfile from './components/UserProfile';
import { getApiUrl } from './lib/api';
import { LearningJourneyProvider } from './contexts/LearningJourneyContext';
import LearningJourneyApp from './components/LearningJourneyApp';
import AdminScanApproval from './components/AdminScanApproval';
import { MockTestDashboard } from './components/MockTestDashboard';

interface AuthGateProps {
  onBackToLanding?: () => void;
}

const AuthGate: React.FC<AuthGateProps> = ({ onBackToLanding }) => {
  const [showLogin, setShowLogin] = useState(true);

  return showLogin ? (
    <LoginForm
      onSwitchToSignup={() => setShowLogin(false)}
      onBackToLanding={onBackToLanding}
      onSuccess={() => {
        // Success is handled by AuthProvider's state change
      }}
    />
  ) : (
    <SignupForm
      onSwitchToLogin={() => setShowLogin(true)}
      onBackToLanding={onBackToLanding}
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
  const { user, session, userProfile, loading: authLoading, signOut } = useAuth();

  // App State
  // Navigation State
  const [godModeView, setGodModeView] = useState('mastermind');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // God Mode Feature State
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [scanRefreshKey, setScanRefreshKey] = useState(0);

  const [userState, setUserState] = useState<UserState>({
    currentModuleIndex: 0,
    masteryScore: 0,
    masteryState: 'NEW',
    quizHistory: [],
    misconceptions: [],
    examUnlocked: false
  });

  const [currentTraining, setCurrentTraining] = useState<ProfessorTrainingContract | null>(null);

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

  // Mobile Menu Global Listener
  useEffect(() => {
    const handleOpenMenu = () => setIsMobileMenuOpen(true);
    window.addEventListener('openMobileMenu', handleOpenMenu);
    return () => window.removeEventListener('openMobileMenu', handleOpenMenu);
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

        const res = await fetch(getApiUrl('/api/scans'), { headers });
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
  }, [user?.id, scanRefreshKey]); // scanRefreshKey increments when admin publishes a scan

  // Listen for admin publish events to refresh scan data in appContext
  useEffect(() => {
    const handler = () => setScanRefreshKey(k => k + 1);
    window.addEventListener('scansUpdated', handler);
    return () => window.removeEventListener('scansUpdated', handler);
  }, []);

  // Auto-select latest scan when switching to analysis view
  useEffect(() => {
    if (godModeView === 'analysis' && !selectedScan && recentScans.length > 0) {
      setSelectedScan(recentScans[0]);
    }
  }, [godModeView, selectedScan, recentScans]);

  // Lazy-fetch full scan data when selectedScan has no questions (list endpoint strips analysis_data)
  useEffect(() => {
    if (!selectedScan?.id || (selectedScan.analysisData?.questions?.length ?? 0) > 0) return;
    const controller = new AbortController();
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(getApiUrl(`/api/scans/${selectedScan.id}`), {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (controller.signal.aborted || !res.ok) return;
        const full = await res.json();
        if (controller.signal.aborted) return;
        if (full?.analysisData?.questions?.length > 0) {
          setSelectedScan(full);
          setRecentScans(prev => prev.map(s => s.id === full.id ? full : s));
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error('Failed to lazy-fetch scan detail:', err);
      }
    })();
    return () => controller.abort();
  }, [selectedScan?.id]);

  // Handle RBAC View Defaults
  useEffect(() => {
    if (userProfile?.role === 'student') {
      const allowedStudentViews = ['learning_journey', 'profile'];
      if (!allowedStudentViews.includes(godModeView)) {
        setGodModeView('learning_journey');
      }
    }
  }, [userProfile?.role, godModeView]);

  // Check subscription status when user is authenticated
  useEffect(() => {
    if (!user) {
      setSubscriptionStatus({ hasActiveSubscription: false, loading: false });
      return;
    }

    const checkSubscription = async () => {
      // Admin and Teacher users automatically bypass subscription check
      if (userProfile?.role === 'admin' || userProfile?.role === 'teacher') {
        setSubscriptionStatus({ hasActiveSubscription: true, loading: false });
        return;
      }

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
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
            console.warn('Subscription API returned error - blocking access');
            setSubscriptionStatus({
              hasActiveSubscription: false,
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
          // Block access on fetch error
          setSubscriptionStatus({
            hasActiveSubscription: false,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Failed to check subscription status:', error);
        // Block access on error
        setSubscriptionStatus({
          hasActiveSubscription: false,
          loading: false,
        });
      }
    };

    checkSubscription();
  }, [user?.id, refreshTrigger, userProfile?.role]); // Use user.id instead of full user object

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
    return (
      <AuthGate
        onBackToLanding={() => {
          localStorage.removeItem('edujourney_landing_seen');
          setShowLanding(true);
        }}
      />
    );
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
        questionsWithSketches: scan.analysisData?.questions?.filter(q => q.sketchSvg || (q.extractedImages && q.extractedImages.length > 0)).length || 0
      });

      // CRITICAL: Strip large topic sketch data to avoid 413 Content Too Large errors
      // These will be saved separately via the dedicated /api/topic-sketches endpoint
      const scanToSync = {
        ...scan,
        analysisData: scan.analysisData ? {
          ...scan.analysisData,
          topicBasedSketches: undefined, // Strip the large SVG bundles
          // Strip base64 sketchSvg to avoid 413 — visuals are persisted separately via /api/scan-visuals
          questions: scan.analysisData.questions.map(q => {
            const isHttp = typeof q.sketchSvg === 'string' && q.sketchSvg.startsWith('http');
            return {
              ...q,
              sketchSvgUrl: isHttp ? q.sketchSvg : q.sketchSvgUrl,
              sketchSvg: isHttp ? q.sketchSvg : undefined
            };
          })
        } : undefined
      };

      // Use latest session to prevent stale closures over long operations
      const { data: authData } = await supabase.auth.getSession();
      const token = authData?.session?.access_token || session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add auth token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Always POST - backend has upsert logic
      console.log(`📝 Upserting stripped scan ${scan.id}`);

      const doFetch = () => fetch(getApiUrl('/api/scans'), {
        method: 'POST',
        headers,
        body: JSON.stringify(scanToSync)
      });

      let response: Response;
      try {
        response = await doFetch();
      } catch (fetchErr: any) {
        // ERR_NETWORK_CHANGED happens after long Gemini calls — retry once after 3s
        const isNetworkChange = fetchErr?.message?.includes('fetch') || fetchErr?.message?.includes('network');
        if (isNetworkChange) {
          console.warn(`⚠️ Network changed during sync, retrying in 3s...`);
          await new Promise(r => setTimeout(r, 3000));
          response = await doFetch();
        } else {
          throw fetchErr;
        }
      }

      if (!response.ok) {
        const result = await response.json();
        console.error(`❌ Failed to sync scan: HTTP ${response.status}`, result);
      } else {
        console.log(`✅ Scan (metadata + analysis) upserted in Supabase`);
      }
    } catch (err) {
      console.error('❌ Failed to sync scan to Supabase:', err);
    }
  };

  // Determine if user is student for conditional rendering logic
  const isStudent = userProfile?.role === 'student';

  // Force student view if they are a student (immediate RBAC check for rendering)
  const activeView = isStudent && !['learning_journey', 'profile'].includes(godModeView)
    ? 'learning_journey'
    : godModeView;

  return (
    <LearningJourneyProvider userId={user?.id || ''}>
      <AppShell
        activeView={activeView}
        setGodModeView={setGodModeView}
        isStudent={isStudent}
        user={user}
        userProfile={userProfile}
        recentScans={recentScans}
        setRecentScans={setRecentScans}
        selectedScan={selectedScan}
        setSelectedScan={setSelectedScan}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        syncScanToSupabase={syncScanToSupabase}
        currentTraining={currentTraining}
        setCurrentTraining={setCurrentTraining}
        signOut={signOut}
        confirm={confirm}
        showToast={showToast}
      />
    </LearningJourneyProvider>
  );
};

// New AppShell component that consumes LearningJourneyContext
const AppShell: React.FC<{
  activeView: string;
  setGodModeView: (view: string) => void;
  isStudent: boolean;
  user: any;
  userProfile: any;
  recentScans: Scan[];
  setRecentScans: React.Dispatch<React.SetStateAction<Scan[]>>;
  selectedScan: Scan | null;
  setSelectedScan: (scan: Scan | null) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  syncScanToSupabase: (scan: Scan) => Promise<void>;
  currentTraining: ProfessorTrainingContract | null;
  setCurrentTraining: (training: ProfessorTrainingContract | null) => void;
  signOut: () => Promise<void>;
  confirm: (options: any) => Promise<boolean>;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}> = ({
  activeView,
  setGodModeView,
  isStudent,
  user,
  userProfile,
  recentScans,
  setRecentScans,
  selectedScan,
  setSelectedScan,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  syncScanToSupabase,
  currentTraining,
  setCurrentTraining,
  signOut,
  confirm,
  showToast
}) => {
    const { isFocusMode, isDrilledDown, currentView, navigateToView, goBack: ljGoBack, selectedSubject, resetToTrajectory } = useLearningJourney();
    const isMobile = useIsMobile();

    // Unified History Management (Nested Sub-Views)
    useEffect(() => {
      const handlePopState = (event: PopStateEvent) => {
        // 1. If mobile menu is open, close it first and stay on page
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
          window.history.pushState({ view: activeView, subView: currentView }, '');
          return;
        }

        // 2. Handle history state
        if (event.state) {
          const { view: targetView, subView: targetSubView } = event.state;

          // Handle Top-Level view change
          if (targetView && targetView !== activeView) {
            setGodModeView(targetView);
          }

          // Handle Internal Learning Journey view change
          if (targetView === 'learning_journey' && targetSubView && targetSubView !== currentView) {
            navigateToView(targetSubView);
          }
        } else {
          // No state (reached entry point). Prevent leaving app if at root.
          // If we are at root, we might want to stay here.
          if (activeView === (isStudent ? 'learning_journey' : 'mastermind') && (!isDrilledDown)) {
            window.history.pushState({ view: activeView, subView: currentView }, '');
          }
        }
      };

      window.addEventListener('popstate', handlePopState);

      // Replace initial state to trap the 'Back to Login' journey
      if (!window.history.state || !window.history.state.view) {
        window.history.replaceState({ view: activeView, subView: currentView }, '');
      }

      return () => window.removeEventListener('popstate', handlePopState);
    }, [activeView, currentView, isMobileMenuOpen, isDrilledDown]);

    // Sync state to history on ANY relevant change
    useEffect(() => {
      const currentState = window.history.state;
      if (currentState?.view !== activeView || currentState?.subView !== currentView) {
        window.history.pushState({ view: activeView, subView: currentView }, '');
      }
    }, [activeView, currentView]);

    // Navigation Intents
    const handleHomeClick = () => {
      if (isStudent) {
        setGodModeView('learning_journey');
      } else {
        setGodModeView('mastermind');
      }
    };

    // Sidebar controls
    const handleNavigate = (view: string) => {
      setGodModeView(view);
      setIsMobileMenuOpen(false);
    };

    // --- PRIMARY APP ROUTER ---
    return (
      <div className="flex h-screen bg-white text-slate-900 font-instrument overflow-hidden">
        {/* Sidebar - Hidden during focus mode or tests */}
        {!isFocusMode && (
          <Sidebar
            activeView={activeView}
            onNavigate={handleNavigate}
            userName={user?.email?.split('@')[0] || 'User'}
            isMobileMenuOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
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
        )}


        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50/50">
          {/* Global Compact Header - Hidden during focus mode, mobile LJ, and ALL learning journey sub-views
              (each LJ page has its own back button + header, so this bar is redundant there) */}
          {!isFocusMode && activeView !== 'learning_journey' && !isMobile && (
            <header className={`h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-50 shrink-0 sticky top-0 transition-all duration-300 no-print ${isDrilledDown && isStudent && activeView === 'learning_journey' ? 'bg-primary-50/30' : ''}`}>
              <div className="flex items-center gap-3">
                {/* Contextual Action: Back vs Hamburger */}
                <button
                  className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  onClick={() => {
                    if (activeView === 'learning_journey' && isDrilledDown) {
                      ljGoBack();
                    } else {
                      setIsMobileMenuOpen(true);
                    }
                  }}
                >
                  {activeView === 'learning_journey' && isDrilledDown ? (
                    <ChevronLeft size={22} className="text-primary-600" />
                  ) : (
                    <Menu size={20} className="md:block" />
                  )}
                </button>

                {/* Logo / Context Label */}
                <div className="flex items-center gap-2 overflow-hidden">
                  {!isDrilledDown || activeView !== 'learning_journey' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
                        <GraduationCap className="text-white" size={16} />
                      </div>
                      <h1 className="text-sm font-black text-slate-900 font-outfit uppercase tracking-tight hidden sm:block">plus<span className="text-primary-600">2AI</span></h1>
                    </div>
                  ) : null}

                  <span className={`text-xs font-black text-slate-900 font-outfit uppercase tracking-tight truncate ${isDrilledDown && activeView === 'learning_journey' ? 'text-primary-700 bg-primary-100/50 px-2.5 py-1 rounded-full' : 'text-slate-400'}`}>
                    {activeView === 'learning_journey' && isDrilledDown ? 'Back to Journey' : activeView.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                {/* GLOBAL Subject Switcher - Staff Only */}
                {!isStudent && activeView !== 'learning_journey' && (
                  <div className="hidden sm:flex items-center gap-2">
                    <SubjectSwitcher />
                    <div className="h-6 w-px bg-slate-200" />
                  </div>
                )}

                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors relative">
                  <Bell size={18} />
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary-500 rounded-full border border-white" />
                </button>
              </div>
            </header>
          )}

          <main className={`flex-1 overflow-hidden relative ${!isFocusMode ? 'pb-16 md:pb-0' : ''}`}>
            <div className="h-full overflow-y-auto scroller-hide">
              {activeView === 'mastermind' && (
                <div className="p-8 bg-slate-50/50">
                  <div className="max-w-7xl mx-auto space-y-6">
                    {/* Dashboard Header */}
                    <div>
                      <h1 className="text-3xl font-black text-slate-900 font-outfit uppercase tracking-tight">Teacher Dashboard</h1>
                      <p className="text-sm text-slate-500 font-bold mt-1">Central command for all teaching operations</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 rounded-lg md:rounded-xl flex items-center justify-center">
                            <LayoutDashboard size={18} className="text-blue-600" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scans</span>
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-slate-900 font-outfit">{recentScans.length}</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-50 rounded-lg md:rounded-xl flex items-center justify-center">
                            <GraduationCap size={18} className="text-emerald-600" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</span>
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-slate-900 font-outfit">24</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-50 rounded-lg md:rounded-xl flex items-center justify-center">
                            <Search size={18} className="text-amber-600" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</span>
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-slate-900 font-outfit">
                          {recentScans.reduce((acc, scan) => acc + (scan.analysisData?.questions?.length || 0), 0)}
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-rose-50 rounded-lg md:rounded-xl flex items-center justify-center">
                            <Bell size={18} className="text-rose-600" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alerts</span>
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-slate-900 font-outfit">3</div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                        onClick={() => setGodModeView('approval')}
                        className="bg-white border-2 border-emerald-200 rounded-2xl p-6 hover:border-emerald-400 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <CheckCircle2 size={24} className="text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 font-outfit uppercase mb-1">Review & Publish</h3>
                        <p className="text-xs text-slate-500 font-bold">Approve scans to make them available system-wide</p>
                      </button>
                      <button
                        onClick={() => setGodModeView('recall')}
                        className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-primary-400 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Sparkles size={24} className="text-amber-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 font-outfit uppercase mb-1">Rapid Recall</h3>
                        <p className="text-xs text-slate-500 font-bold">Generate flashcards for quick revision</p>
                      </button>
                      <button
                        onClick={() => setGodModeView('training_studio')}
                        className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-primary-400 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <FileText size={24} className="text-indigo-600" />
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
                              <FileText size={18} className="text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-black text-slate-900 truncate">{scan.name}</h4>
                              <p className="text-xs text-slate-500 font-bold">{scan.subject} • {scan.grade}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300" />
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

              {activeView === 'learning_journey' && (
                <LearningJourneyApp onBack={handleHomeClick} />
              )}

              {activeView === 'scanning' && (
                <div className="h-full scroller-hide pb-20 md:pb-0">
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

              {activeView === 'approval' && <AdminScanApproval />}
              {activeView === 'mock_downloads' && <MockTestDashboard onBack={() => setGodModeView('mastermind')} />}

              {activeView === 'analysis' && (
                <ExamAnalysis
                  onBack={handleHomeClick}
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
              )}

              {activeView === 'training_studio' && (
                <TrainingStudio
                  onClose={handleHomeClick}
                  selectedScan={selectedScan}
                  onTrainingCreated={(training) => {
                    setCurrentTraining(training);
                    setGodModeView('training_viewer');
                  }}
                />
              )}

              {activeView === 'training_viewer' && currentTraining && (
                <TrainingViewer
                  training={currentTraining}
                  onBack={() => setGodModeView('training_studio')}
                />
              )}

              {activeView === 'questions' && <VisualQuestionBank recentScans={recentScans} />}
              {activeView === 'recall' && <RapidRecall recentScans={recentScans} />}
              {activeView === 'gallery' && (
                <SketchGallery
                  onBack={handleHomeClick}
                  scan={selectedScan}
                  recentScans={recentScans}
                  onUpdateScan={(updatedScan) => {
                    setRecentScans(prev => prev.map(s => s.id === updatedScan.id ? updatedScan : s));
                    setSelectedScan(updatedScan);
                    syncScanToSupabase(updatedScan);
                  }}
                />
              )}

              {activeView === 'profile' && (
                <UserProfile onBack={() => {
                  if (isStudent) setGodModeView('learning_journey');
                  else setGodModeView('mastermind');
                }} />
              )}

              {activeView === 'settings' && <SettingsPanel onBack={handleHomeClick} />}
            </div>
          </main>

          {/* Mobile Bottom Navigation Bar - Adaptive & Contextual */}
          {!isFocusMode && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around px-2 z-40 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
              {isStudent && selectedSubject ? (
                <>
                  {/* Subject Context: Quick toggle between subject pillars */}
                  <button
                    onClick={() => navigateToView('topic_dashboard')}
                    className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-all ${currentView === 'topic_dashboard' || currentView === 'topic_detail' ? 'text-primary-600 scale-105' : 'text-slate-400'}`}
                  >
                    <LayoutGrid size={20} className={currentView === 'topic_dashboard' || currentView === 'topic_detail' ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Nodes</span>
                  </button>

                  <button
                    onClick={() => navigateToView('past_year_exams')}
                    className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-all ${currentView === 'past_year_exams' || currentView === 'vault_detail' ? 'text-primary-600 scale-105' : 'text-slate-400'}`}
                  >
                    <Library size={20} className={currentView === 'past_year_exams' || currentView === 'vault_detail' ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Vault</span>
                  </button>

                  <button
                    onClick={() => navigateToView('mock_builder')}
                    className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-all ${currentView === 'mock_builder' ? 'text-primary-600 scale-105' : 'text-slate-400'}`}
                  >
                    <Zap size={20} className={currentView === 'mock_builder' ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Missions</span>
                  </button>

                  <button
                    onClick={() => setGodModeView('profile')}
                    className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-all ${activeView === 'profile' ? 'text-primary-600 scale-105' : 'text-slate-400'}`}
                  >
                    <User size={20} className={activeView === 'profile' ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Profile</span>
                  </button>
                </>
              ) : isStudent ? (
                <>
                  {/* Global Student HUD: Dashboard, Journey (Subject Pick), Profile */}
                  <button
                    onClick={() => {
                      setGodModeView('learning_journey');
                      resetToTrajectory();
                    }}
                    className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-all ${activeView === 'learning_journey' && currentView === 'trajectory' ? 'text-primary-600 scale-105' : 'text-slate-400'}`}
                  >
                    <Home size={20} className={activeView === 'learning_journey' && currentView === 'trajectory' ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Home</span>
                  </button>
                  <button
                    onClick={() => setGodModeView('learning_journey')}
                    className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-all ${activeView === 'learning_journey' && (currentView === 'subject' || currentView === 'subject_menu') ? 'text-primary-600 scale-105' : 'text-slate-400'}`}
                  >
                    <Map size={20} className={activeView === 'learning_journey' && (currentView === 'subject' || currentView === 'subject_menu') ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Journey</span>
                  </button>
                  <button
                    onClick={() => setGodModeView('profile')}
                    className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-all ${activeView === 'profile' ? 'text-primary-600 scale-105' : 'text-slate-400'}`}
                  >
                    <User size={20} className={activeView === 'profile' ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Account</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Staff HUD: Admin, Scan, Journey Preview, Profile */}
                  <button onClick={() => setGodModeView('mastermind')} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-all ${activeView === 'mastermind' ? 'text-primary-600 scale-105' : 'text-slate-400'}`}>
                    <LayoutDashboard size={20} className={activeView === 'mastermind' ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Admin</span>
                  </button>
                  <button onClick={() => setGodModeView('scanning')} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-all ${activeView === 'scanning' ? 'text-primary-600 scale-105' : 'text-slate-400'}`}>
                    <ScanLine size={20} className={activeView === 'scanning' ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Scan</span>
                  </button>
                  <button onClick={() => setGodModeView('mock_downloads')} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-all ${activeView === 'mock_downloads' ? 'text-primary-600 scale-105' : 'text-slate-400'}`}>
                    <FileText size={20} className={activeView === 'mock_downloads' ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">PDFs</span>
                  </button>
                  <button onClick={() => setGodModeView('learning_journey')} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-all ${activeView === 'learning_journey' ? 'text-primary-600 scale-105' : 'text-slate-400'}`}>
                    <Map size={20} className={activeView === 'learning_journey' ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Journey</span>
                  </button>
                  <button onClick={() => setGodModeView('profile')} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-all ${activeView === 'profile' ? 'text-primary-600 scale-105' : 'text-slate-400'}`}>
                    <User size={20} className={activeView === 'profile' ? 'fill-primary-50' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Account</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Global Assistant overlay - Vidya V3 */}
          {!isFocusMode && activeView !== 'profile' && (
            <VidyaV3
              appContext={{
                scannedPapers: recentScans,
                selectedScan: selectedScan,
                currentView: activeView,
              }}
            />
          )}
        </div>
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