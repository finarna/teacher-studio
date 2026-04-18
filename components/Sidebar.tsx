import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ScanLine,
  Palette,
  Library,
  BrainCircuit,
  Settings,
  GraduationCap,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  FileText,
  Map,
  CheckCircle2,
  X,
  Target,
  BookOpen,
  Calendar,
  Zap,
  FlaskConical,
  BarChart2,
  ChevronDown,
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useSubjectTheme } from '../hooks/useSubjectTheme';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/api';
import { useAuth } from './AuthProvider';
import { useLearningJourney } from '../contexts/LearningJourneyContext';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  userName?: string;
  onLogout?: () => void;
  isMobileMenuOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, userName, onLogout, isMobileMenuOpen = false, onCloseMobile }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [planBadge, setPlanBadge] = useState<string>('');
  const { subjectConfig, examConfig } = useAppContext();
  const theme = useSubjectTheme();
  const { userProfile } = useAuth();

  const role = userProfile?.role || 'student';

  // Learning Journey context — safe to use because Sidebar is inside LearningJourneyProvider
  const {
    currentView,
    selectedTrajectory,
    selectedSubject,
    selectedTopicId,
    selectedScan,
    topics,
    navigateToView,
    resetToTrajectory,
  } = useLearningJourney();

  useEffect(() => {
    fetchUserPlan();
  }, []);

  const fetchUserPlan = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(getApiUrl('/api/subscription/status'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.subscription?.plan) {
          const planName = data.subscription.plan.name;
          if (planName.includes('NEET')) setPlanBadge('NEET');
          else if (planName.includes('JEE')) setPlanBadge('JEE');
          else if (planName.includes('KCET')) setPlanBadge('KCET');
          else if (planName.includes('Ultimate')) setPlanBadge('PRO');
          else setPlanBadge('PRO');
        }
      }
    } catch (error) {
      console.error('Error fetching user plan:', error);
    }
  };

  const menuItems = [
    { id: 'mastermind', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'learning_journey', label: 'Learning Journey', icon: Map },
    { id: 'scanning', label: 'Paper Scan', icon: ScanLine },
    { id: 'approval', label: 'Review & Publish', icon: CheckCircle2 },
    { id: 'analysis', label: 'Exam Intelligence', icon: Library },
    { id: 'questions', label: 'Question Bank', icon: FileQuestion },
    { id: 'mock_downloads', label: 'Official Papers', icon: FileText },
    { id: 'recall', label: 'Rapid Recall', icon: BrainCircuit },
    { id: 'gallery', label: 'Sketch Notes', icon: Palette },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (role === 'admin') return true;
    if (role === 'teacher') return item.id !== 'settings';
    if (role === 'student') return ['learning_journey', 'profile'].includes(item.id);
    return false;
  });

  // Build breadcrumb levels based on current LJ state
  const topicName = selectedTopicId
    ? (topics.find(t => t.id === selectedTopicId)?.name || topics.find(t => t.topicId === selectedTopicId)?.name || 'Topic')
    : null;

  const sectionLabel: Record<string, { label: string; icon: React.ReactNode }> = {
    past_year_exams: { label: 'Past Year Papers', icon: <Calendar size={12} /> },
    topic_dashboard:  { label: 'Topic Mastery',    icon: <BookOpen size={12} /> },
    topic_detail:     { label: 'Topic Mastery',    icon: <BookOpen size={12} /> },
    mock_builder:     { label: 'Practice Tests',   icon: <Zap size={12} /> },
    vault_detail:     { label: 'Past Year Papers', icon: <Calendar size={12} /> },
    test:             { label: 'Test in Progress', icon: <FlaskConical size={12} /> },
    test_results:     { label: 'Test Results',     icon: <BarChart2 size={12} /> },
    overall_performance: { label: 'My Performance', icon: <BarChart2 size={12} /> },
  };

  type BreadcrumbItem = {
    label: string;
    icon: React.ReactNode;
    onClick: (() => void) | null;
    isCurrent: boolean;
  };

  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const crumbs: BreadcrumbItem[] = [];
    if (!selectedTrajectory || currentView === 'trajectory') return crumbs;

    // Level 1: Exam
    crumbs.push({
      label: selectedTrajectory,
      icon: <Target size={12} />,
      onClick: () => { navigateToView('subject'); if (onCloseMobile) onCloseMobile(); },
      isCurrent: currentView === 'subject',
    });

    // overall_performance is exam-level (no subject selected), show it directly under trajectory
    if (currentView === 'overall_performance') {
      crumbs.push({
        label: 'My Performance',
        icon: <BarChart2 size={12} />,
        onClick: null,
        isCurrent: true,
      });
      return crumbs;
    }

    if (!selectedSubject) return crumbs;

    // Level 2: Subject
    crumbs.push({
      label: selectedSubject,
      icon: <BookOpen size={12} />,
      onClick: () => { navigateToView('subject_menu'); if (onCloseMobile) onCloseMobile(); },
      isCurrent: currentView === 'subject_menu',
    });

    const section = sectionLabel[currentView];
    if (!section) return crumbs;

    // Level 3: Section (Past Papers / Topics / Mock Tests / Performance)
    // topic_detail and vault_detail have a level 4 child, so they are not the leaf.
    // test_results is the final leaf — no level 4 — so it gets the HERE badge.
    const isLeafSection = !['topic_detail', 'vault_detail'].includes(currentView);
    crumbs.push({
      label: section.label,
      icon: section.icon,
      onClick: isLeafSection ? null : (() => {
        if (currentView === 'topic_detail') { navigateToView('topic_dashboard'); if (onCloseMobile) onCloseMobile(); }
        else if (currentView === 'vault_detail') { navigateToView('past_year_exams'); if (onCloseMobile) onCloseMobile(); }
      }),
      isCurrent: isLeafSection,
    });

    // Level 4: Topic name or scan name
    if (currentView === 'topic_detail' && topicName) {
      crumbs.push({ label: topicName, icon: <ChevronRight size={10} />, onClick: null, isCurrent: true });
    }
    if (currentView === 'vault_detail' && selectedScan) {
      crumbs.push({ label: selectedScan.name || 'Paper', icon: <ChevronRight size={10} />, onClick: null, isCurrent: true });
    }

    return crumbs;
  };

  const breadcrumbs = buildBreadcrumbs();
  const showJourneyNav = activeView === 'learning_journey' && breadcrumbs.length > 0 && !isCollapsed;

  const navigate = (fn: () => void) => {
    fn();
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] md:hidden"
          onClick={onCloseMobile}
        />
      )}
      <div className={`
        fixed md:relative top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out z-[90] font-instrument no-print
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        w-64 md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Collapse Toggle (Desktop only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 hover:text-primary-600 shadow-sm z-40 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-100 rounded-full"
        >
          <X size={20} />
        </button>

        {/* Logo Section */}
        <div className={`p-6 flex flex-col ${isCollapsed ? 'items-center' : ''} mb-4`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-10 h-10 bg-slate-900 rounded-[14px] flex items-center justify-center shadow-xl shadow-slate-900/10 shrink-0 border border-slate-800">
              <GraduationCap className="text-white" size={22} />
            </div>
            {!isCollapsed && (
              <div className="animate-in fade-in duration-500">
                <h1 className="font-black tracking-tight font-outfit text-xl leading-none uppercase italic">
                  <span style={{ color: '#0a1a16' }}>plus2</span>
                  <span style={{ color: '#ff7f50' }}>AI</span>
                </h1>
                <span className="text-[9px] font-black text-slate-400 tracking-[0.25em] uppercase mt-1 block">Learning Platform</span>
              </div>
            )}
          </div>

          {!isCollapsed && role !== 'student' && (
            <div
              className="mt-3 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-center animate-in fade-in duration-500"
              style={{ backgroundColor: theme.colorLight, color: theme.colorDark }}
            >
              {theme.iconEmoji} {subjectConfig.name} • {examConfig.name}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 space-y-1.5 overflow-y-auto scroller-hide">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); if (onCloseMobile) onCloseMobile(); }}
              title={isCollapsed ? item.label : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center md:px-0' : 'gap-3 px-4'} py-3.5 rounded-2xl transition-all duration-300 group relative ${
                activeView === item.id
                  ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              style={activeView === item.id ? { boxShadow: `0 0 20px ${theme.color}40` } : undefined}
            >
              <item.icon size={19} className={`shrink-0 transition-all duration-300 ${activeView === item.id ? 'text-accent-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className={`text-[13px] font-bold tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300 ${isCollapsed ? 'md:hidden' : ''}`}>
                {item.label}
              </span>
              {activeView === item.id && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] md:block hidden" />
              )}
            </button>
          ))}

          {/* ── Journey Navigation ── */}
          {showJourneyNav && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              {/* Section header */}
              <div className="flex items-center gap-2 px-2 mb-2">
                <Map size={11} className="text-slate-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Where You Are</span>
              </div>

              {/* Breadcrumb tree */}
              <div className="space-y-0.5">
                {breadcrumbs.map((crumb, idx) => (
                  <div key={idx} className="flex items-stretch">
                    {/* Tree line */}
                    <div className="flex flex-col items-center w-5 shrink-0 mr-1">
                      {idx > 0 && <div className="w-px flex-1 bg-slate-200" />}
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${crumb.isCurrent ? 'bg-primary-500' : 'bg-slate-300'}`} />
                      {idx < breadcrumbs.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                    </div>

                    {/* Crumb button or label */}
                    {crumb.onClick ? (
                      <button
                        onClick={crumb.onClick}
                        className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-left hover:bg-slate-50 transition-colors group"
                      >
                        <span className="text-slate-400 group-hover:text-primary-500 transition-colors shrink-0">{crumb.icon}</span>
                        <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 truncate transition-colors">{crumb.label}</span>
                        <ChevronRight size={10} className="ml-auto text-slate-300 group-hover:text-primary-400 shrink-0" />
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5">
                        <span className="text-primary-500 shrink-0">{crumb.icon}</span>
                        <span className="text-[11px] font-black text-slate-900 truncate">{crumb.label}</span>
                        <span className="ml-auto text-[8px] font-bold text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded-full shrink-0">HERE</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick jump: Change exam */}
              <button
                onClick={() => navigate(resetToTrajectory)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-all"
              >
                <Target size={11} />
                Change Exam
              </button>
            </div>
          )}
        </div>

        {/* Footer Section - User Info */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {!isCollapsed ? (
            <>
              <div
                onClick={() => onNavigate('profile')}
                className="w-full p-2 border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-black text-white shrink-0 border border-white shadow-md">
                    <User size={16} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="text-[11px] font-black text-slate-900 truncate font-outfit uppercase">{userName || 'User'}</h4>
                    {planBadge && (
                      <span className="inline-block text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 uppercase tracking-wider">
                        {planBadge}
                      </span>
                    )}
                  </div>
                  {onLogout && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onLogout(); }}
                      title="Logout"
                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all shrink-0"
                    >
                      <LogOut size={14} />
                    </button>
                  )}
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-black transition-all shadow-sm uppercase tracking-wider"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => onNavigate('profile')}
                title="User Profile"
                className="w-full flex items-center justify-center p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity relative"
              >
                <User size={18} className="text-white" />
                {planBadge && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                    <span className="text-[7px] font-black text-slate-900">★</span>
                  </div>
                )}
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="w-full flex items-center justify-center p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                >
                  <LogOut size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
