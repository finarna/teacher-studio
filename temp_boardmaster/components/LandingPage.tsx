
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Globe, Lock, Activity, Zap, BookOpen, ShieldCheck, User } from 'lucide-react';
import { UserRole } from '../types';

interface LandingPageProps {
  onEnter: (role: UserRole) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);
  const [exiting, setExiting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const { left, top, width, height } = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - left) / width;
        const y = (e.clientY - top) / height;
        setMousePos({ x, y });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleEnter = (role: UserRole) => {
    setExiting(true);
    setTimeout(() => {
      onEnter(role);
    }, 800);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative min-h-screen w-full bg-[#030712] overflow-hidden transition-all duration-1000 ease-in-out ${
        exiting ? 'opacity-0 scale-110 blur-xl' : 'opacity-100 scale-100'
      }`}
    >
      <div 
        className="absolute inset-0 transition-transform duration-500 pointer-events-none"
        style={{ 
          transform: `translate(${(mousePos.x - 0.5) * -40}px, ${(mousePos.y - 0.5) * -40}px)`,
          background: `radial-gradient(circle at ${50 + (mousePos.x - 0.5) * 10}% ${50 + (mousePos.y - 0.5) * 10}%, rgba(99, 102, 241, 0.1), transparent 60%)`
        }} 
      />

      <div className="relative z-10 min-h-screen flex flex-col p-6 md:p-12">
        <header className="flex justify-between items-center animate-in slide-in-from-top-4 duration-1000">
          <div className="flex items-center gap-3 md:gap-4 group">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white text-slate-950 flex items-center justify-center rounded-xl md:rounded-2xl font-black text-xl md:text-2xl shadow-xl group-hover:rotate-12 transition-transform">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="font-sans font-black text-xl md:text-2xl tracking-tighter text-white uppercase group-hover:tracking-wider transition-all">BoardMaster AI</h1>
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                <span className="font-mono text-[8px] md:text-[9px] text-indigo-400 uppercase tracking-widest">Global Node Active</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center text-center py-12 md:py-0">
          <div className="relative mb-8 md:mb-12 group">
            <div className="absolute inset-0 bg-indigo-600/10 blur-[100px] md:blur-[120px] rounded-full animate-pulse" />
            <h2 className="relative text-5xl md:text-[10rem] font-black text-white leading-[0.9] md:leading-[0.8] tracking-tighter uppercase animate-in zoom-in-95 duration-1000 px-4">
              <span className="block opacity-40 text-xl md:text-6xl mb-2 md:mb-4 tracking-[0.2em] font-light">The Ultimate</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-500 drop-shadow-[0_0_50px_rgba(129,140,248,0.2)]">
                PREP CENTER
              </span>
            </h2>
          </div>
          
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 mb-10 md:mb-16 px-6">
            <p className="text-slate-400 font-medium text-base md:text-2xl leading-relaxed">
              Launch your specialized AI prep track to unlock high-yield mock tests and deep subject analysis.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full max-w-4xl px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
             <button 
               onClick={() => handleEnter('student')}
               onMouseEnter={() => setHoveredRole('student')}
               onMouseLeave={() => setHoveredRole(null)}
               className="group relative flex-1 bg-white hover:bg-indigo-600 rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 text-left transition-all duration-500 hover:scale-105 active:scale-95 shadow-2xl overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-6 md:p-8 text-slate-100 group-hover:text-white/20 transition-colors">
                   <User className="w-16 h-16 md:w-24 md:h-24" />
                </div>
                <div className="relative z-10">
                   <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-indigo-600 group-hover:text-white/80 mb-2">Student Portal</p>
                   <h3 className="text-3xl md:text-4xl font-black text-slate-900 group-hover:text-white uppercase tracking-tighter">Enter Hub</h3>
                   <div className="mt-6 md:mt-8 flex items-center gap-3 md:gap-4 text-slate-400 group-hover:text-white">
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Access Mock Tests</span>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-3 transition-transform" />
                   </div>
                </div>
             </button>

             <button 
               onClick={() => handleEnter('admin')}
               onMouseEnter={() => setHoveredRole('admin')}
               onMouseLeave={() => setHoveredRole(null)}
               className="group relative flex-1 bg-slate-900 hover:bg-rose-600 rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 text-left transition-all duration-500 hover:scale-105 active:scale-95 shadow-2xl border border-white/5 overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-6 md:p-8 text-white/5 group-hover:text-white/20 transition-colors">
                   <ShieldCheck className="w-16 h-16 md:w-24 md:h-24" />
                </div>
                <div className="relative z-10">
                   <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-rose-500 group-hover:text-white/80 mb-2">Administrator</p>
                   <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Forge Hub</h3>
                   <div className="mt-6 md:mt-8 flex items-center gap-3 md:gap-4 text-slate-500 group-hover:text-white">
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Digitize Content</span>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-3 transition-transform" />
                   </div>
                </div>
             </button>
          </div>
        </main>

        <footer className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 text-[8px] md:text-[10px] font-mono text-slate-600 uppercase tracking-widest pt-8 md:pt-12 border-t border-white/5 animate-in slide-in-from-bottom-4 duration-1000 delay-500">
          <div className="flex flex-col gap-1.5 md:gap-2">
            <span className="text-slate-400 font-black">AI Core</span>
            <span className="flex items-center gap-2">Gemini Pro <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-indigo-500" /></span>
          </div>
          <div className="flex flex-col gap-1.5 md:gap-2">
            <span className="text-slate-400 font-black">Data Shield</span>
            <span className="flex items-center gap-2"><Lock className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-500" /> Secure Hub</span>
          </div>
          <div className="hidden lg:flex flex-col gap-1.5 md:gap-2">
            <span className="text-slate-400 font-black">Region</span>
            <span className="flex items-center gap-2"><Globe className="w-3 h-3 text-fuchsia-500" /> ASIA-SOUTH-1</span>
          </div>
          <div className="flex flex-col gap-1.5 md:gap-2 text-right">
             <span className="text-slate-400 font-black">Build</span>
             <span>v4.0.1 Stable</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
