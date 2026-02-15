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
  Map,
  CheckCircle2
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useSubjectTheme } from '../hooks/useSubjectTheme';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/api';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  userName?: string;
  onStudentView?: () => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, userName, onStudentView, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [planBadge, setPlanBadge] = useState<string>('');
  const { subjectConfig, examConfig } = useAppContext();
  const theme = useSubjectTheme();

  useEffect(() => {
    fetchUserPlan();
  }, []);

  const fetchUserPlan = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl('/api/subscription/status'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.subscription?.plan) {
          // Extract plan name abbreviation (NEET, JEE, KCET, Ultimate)
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
    { id: 'recall', label: 'Rapid Recall', icon: BrainCircuit },
    { id: 'gallery', label: 'Sketch Notes', icon: Palette },
    { id: 'training_studio', label: 'Pedagogy Studio', icon: GraduationCap },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-white border-r border-slate-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative z-30 font-instrument`}>
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-primary-600 shadow-sm z-40 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo Section */}
      <div className={`p-6 flex flex-col ${isCollapsed ? 'items-center' : ''} mb-4`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-slate-900 rounded-[14px] flex items-center justify-center shadow-xl shadow-slate-900/10 shrink-0 border border-slate-800">
            <GraduationCap className="text-white" size={22} />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in duration-500">
              <h1 className="font-black text-slate-900 tracking-tight font-outfit text-xl leading-none uppercase italic">Edu<span className="text-accent-600">Journey</span></h1>
              <span className="text-[9px] font-black text-slate-400 tracking-[0.25em] uppercase mt-1 block">Coach Assistant</span>
            </div>
          )}
        </div>

        {/* Subject Badge */}
        {!isCollapsed && (
          <div
            className="mt-3 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-center animate-in fade-in duration-500"
            style={{
              backgroundColor: theme.colorLight,
              color: theme.colorDark
            }}
          >
            {theme.iconEmoji} {subjectConfig.name} • {examConfig.name}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 space-y-1.5 overflow-y-auto scroller-hide">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={isCollapsed ? item.label : ''}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3.5 rounded-2xl transition-all duration-300 group relative ${activeView === item.id
              ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            style={activeView === item.id ? {
              boxShadow: `0 0 20px ${theme.color}40`
            } : undefined}
          >
            <item.icon size={19} className={`shrink-0 transition-all duration-300 ${activeView === item.id ? 'text-accent-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
            {!isCollapsed && (
              <span className={`text-[13px] font-bold tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300`}>{item.label}</span>
            )}
            {activeView === item.id && !isCollapsed && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            )}
          </button>
        ))}
      </div>

      {/* Footer Section - User Info */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        {!isCollapsed ? (
          <>
            {/* User Info with Plan Badge - Clickable */}
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
                {/* Logout Icon Button */}
                {onLogout && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLogout();
                    }}
                    title="Logout"
                    className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all shrink-0"
                  >
                    <LogOut size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Student View Button */}
            {onStudentView && (
              <button
                onClick={onStudentView}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[10px] font-black transition-all shadow-sm uppercase tracking-wider"
              >
                <GraduationCap size={14} /> Student View
              </button>
            )}
          </>
        ) : (
          <>
            {/* Collapsed View - Icons Only */}
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
            {onStudentView && (
              <button
                onClick={onStudentView}
                title="Student View"
                className="w-full flex items-center justify-center p-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <GraduationCap size={18} />
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Logout"
                className="w-full flex items-center justify-center p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"
              >
                <LogOut size={18} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;