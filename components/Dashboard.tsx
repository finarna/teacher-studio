import React, { useState } from 'react';
import {
  BookOpen,
  Activity,
  Zap,
  Dna,
  ArrowRight,
  Play,
  Lock,
  Clock,
  BarChart,
  Search,
  Sparkles,
  Wand2,
  Plus,
  LayoutDashboard
} from 'lucide-react';
import { COURSE_CATALOG } from '../data/lessonContract';
import { LessonPreview, Subject, LessonContract } from '../types';

interface DashboardProps {
  onSelectLesson: (lessonId: string) => void;
  customLessons: LessonContract[];
  onOpenCreator: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectLesson, customLessons, onOpenCreator }) => {
  const [activeSubject, setActiveSubject] = useState<Subject | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const subjects = [
    {
      name: 'All',
      icon: Sparkles,
      color: 'text-slate-600',
      activeColor: 'text-slate-900',
      bg: 'bg-white',
      activeBg: 'bg-slate-50',
      border: 'border-slate-200',
      activeBorder: 'border-slate-300'
    },
    {
      name: 'Math',
      icon: BookOpen,
      color: 'text-blue-500',
      activeColor: 'text-blue-900',
      bg: 'bg-blue-50',
      activeBg: 'bg-blue-100',
      border: 'border-blue-100',
      activeBorder: 'border-blue-300'
    },
    {
      name: 'Physics',
      icon: Zap,
      color: 'text-amber-500',
      activeColor: 'text-amber-900',
      bg: 'bg-amber-50',
      activeBg: 'bg-amber-100',
      border: 'border-amber-100',
      activeBorder: 'border-amber-300'
    },
    {
      name: 'Chemistry',
      icon: Activity,
      color: 'text-rose-500',
      activeColor: 'text-rose-900',
      bg: 'bg-rose-50',
      activeBg: 'bg-rose-100',
      border: 'border-rose-100',
      activeBorder: 'border-rose-300'
    },
    {
      name: 'Biology',
      icon: Dna,
      color: 'text-emerald-500',
      activeColor: 'text-emerald-900',
      bg: 'bg-emerald-50',
      activeBg: 'bg-emerald-100',
      border: 'border-emerald-100',
      activeBorder: 'border-emerald-300'
    },
  ];

  const dynamicLessonPreviews: LessonPreview[] = customLessons.map(cl => ({
    id: cl.lesson_id,
    title: cl.title,
    subject: cl.subject,
    grade: cl.grade,
    description: cl.description,
    durationMinutes: 45,
    difficulty: 'Moderate' as const,
    simulationCount: 1,
    locked: false,
    tags: ['AI Generated', 'Interactive']
  }));

  const staticLessonsFiltered = COURSE_CATALOG.filter(sl => {
    const hasReplacement = dynamicLessonPreviews.some(dl =>
      dl.title.toLowerCase().includes(sl.title.toLowerCase()) ||
      sl.title.toLowerCase().includes(dl.title.toLowerCase())
    );
    return !hasReplacement;
  });

  const allLessons: LessonPreview[] = [
    ...dynamicLessonPreviews,
    ...staticLessonsFiltered
  ];

  const filteredLessons = allLessons.filter(lesson => {
    const matchesSubject = activeSubject === 'All' || lesson.subject === activeSubject;
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const featuredLesson = allLessons[0] || null;

  return (
    <div className="min-h-screen bg-slate-50/50 font-instrument text-slate-900 selection:bg-primary-500 selection:text-white pb-20 overflow-x-hidden">

      {/* Compact Desktop Navbar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 h-14">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center text-white font-black text-[10px] tracking-widest shadow-lg transform -rotate-3">EDU</div>
            <span className="font-black text-lg tracking-tight text-slate-900 font-outfit uppercase italic">Edu<span className="text-primary-600">Journey</span></span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <Search size={12} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 outline-none text-[10px] font-black text-slate-900 w-32 placeholder:text-slate-400 uppercase tracking-widest"
              />
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <button
              onClick={onOpenCreator}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-[10px] font-black transition-all shadow-sm uppercase tracking-widest hover:bg-slate-900"
            >
              <Plus size={14} /> Studio
            </button>
          </div>
        </div>
      </nav>

      {/* Simplified Hero */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
                <div>
                  <div className="inline-flex items-center gap-2 text-primary-600 font-black text-[9px] uppercase tracking-widest mb-3">
                    <Sparkles size={12} className="animate-pulse" /> Neural Pedagogy Interface
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tightest font-outfit uppercase leading-none">
                    Master with <span className="text-slate-400">Precision.</span>
                  </h1>
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                  {subjects.map((s) => {
                    const Icon = s.icon;
                    const isActive = activeSubject === s.name;

                    // Define complete class strings for Tailwind JIT
                    let buttonClasses = 'flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest border ';

                    if (isActive) {
                      buttonClasses += 'bg-white shadow-md ';
                      // Active state colors per subject
                      if (s.name === 'All') buttonClasses += 'text-slate-900 border-slate-300';
                      else if (s.name === 'Math') buttonClasses += 'text-blue-900 border-blue-300';
                      else if (s.name === 'Physics') buttonClasses += 'text-amber-900 border-amber-300';
                      else if (s.name === 'Chemistry') buttonClasses += 'text-rose-900 border-rose-300';
                      else if (s.name === 'Biology') buttonClasses += 'text-emerald-900 border-emerald-300';
                    } else {
                      buttonClasses += 'bg-transparent border-transparent ';
                      // Inactive state colors per subject
                      if (s.name === 'All') buttonClasses += 'text-slate-600 hover:bg-slate-50';
                      else if (s.name === 'Math') buttonClasses += 'text-blue-500 hover:bg-blue-100';
                      else if (s.name === 'Physics') buttonClasses += 'text-amber-500 hover:bg-amber-100';
                      else if (s.name === 'Chemistry') buttonClasses += 'text-rose-500 hover:bg-rose-100';
                      else if (s.name === 'Biology') buttonClasses += 'text-emerald-500 hover:bg-emerald-100';
                    }

                    return (
                      <button
                        key={s.name}
                        onClick={() => setActiveSubject(s.name as Subject | 'All')}
                        className={buttonClasses}
                      >
                        <Icon size={14} className={`transition-all ${isActive ? 'scale-110' : ''}`} />
                        <span>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dense Grid Area */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredLessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => !lesson.locked && onSelectLesson(lesson.id)}
              className={`group bg-white rounded-2xl border border-slate-200 p-5 transition-all duration-300 ${lesson.locked ? 'opacity-80' : 'hover:shadow-xl hover:border-primary-400 cursor-pointer'
                } shadow-sm flex flex-col`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                  <Play size={16} fill="currentColor" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${lesson.difficulty === 'Hard' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    lesson.difficulty === 'Moderate' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                    {lesson.difficulty}
                  </span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{lesson.subject}</span>
                </div>
              </div>
              <h3 className="text-sm font-black text-slate-900 mb-1 group-hover:text-primary-600 transition-colors font-outfit uppercase tracking-tight leading-tight">{lesson.title}</h3>
              <p className="text-slate-500 text-[10px] font-bold mb-6 line-clamp-2 leading-relaxed uppercase tracking-wide italic">{lesson.description}</p>

              <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <Clock size={12} className="text-primary-500" /> {lesson.durationMinutes}M
                  </div>
                  <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <BarChart size={12} className="text-amber-500" /> {lesson.simulationCount} SIM
                  </div>
                </div>
                {lesson.locked ? (
                  <Lock size={12} className="text-slate-300" />
                ) : (
                  <ArrowRight size={14} className="text-slate-200 group-hover:text-primary-600 transform group-hover:translate-x-1 transition-all" />
                )}
              </div>
            </div>
          ))}

          <button
            onClick={onOpenCreator}
            className="group aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 hover:border-primary-400 hover:bg-white transition-all transition-all"
          >
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 text-slate-300 border border-slate-100 shadow-sm group-hover:scale-110 transition-transform">
              <Plus size={20} />
            </div>
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">New Curriculum</h4>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">Initialize AI Studio</p>
          </button>
        </div>
      </div>
    </div >
  );
};

export default Dashboard;