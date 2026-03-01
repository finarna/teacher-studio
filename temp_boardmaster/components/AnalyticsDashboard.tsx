
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import React, { useState, useEffect, useMemo } from 'react';
import { TopicMastery, SessionMetrics, Question, MockTestSession, SubjectType } from '../types';
import QuizCard from './QuizCard';
import { 
  TrendingUp, 
  Target, 
  Brain, 
  History, 
  GraduationCap, 
  ChevronRight, 
  Loader2, 
  ChevronLeft, 
  Zap, 
  Activity, 
  Sparkles, 
  Award,
  CircleCheck,
  LayoutGrid,
  Lightbulb,
  ShieldCheck,
  Star,
  Info,
  Clock,
  BookOpen,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import MathRenderer from './MathRenderer';

interface AuditReport {
  performanceStatus: string;
  statusColor: 'rose' | 'amber' | 'emerald' | 'indigo';
  executiveSummary: string;
  interventions: {
    category: string;
    icon: string;
    advice: string;
  }[];
  strategicSecret: string;
}

interface AnalyticsDashboardProps {
  questions: Question[];
  type: 'practice' | 'prediction';
  masteryData: Record<string, TopicMastery>;
  sessionMetrics: SessionMetrics;
  mockHistory?: MockTestSession[];
  currentSubject?: SubjectType;
  onStartNewMock?: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  masteryData, 
  mockHistory = [],
  currentSubject,
  onStartNewMock
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'coach'>('overview');
  const [selectedSession, setSelectedSession] = useState<MockTestSession | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isCoaching, setIsCoaching] = useState(false);

  const sortedTopics = useMemo(() => (Object.values(masteryData) as TopicMastery[]).sort((a, b) => b.masteryScore - a.masteryScore), [masteryData]);

  const stats = useMemo(() => {
    if (mockHistory.length === 0) return { avgAccuracy: 0, totalTests: 0, bestSubject: 'None' };
    const avg = mockHistory.reduce((acc, curr) => acc + curr.accuracy, 0) / mockHistory.length;
    
    const counts: Record<string, number> = {};
    mockHistory.forEach(m => { counts[m.subject] = (counts[m.subject] || 0) + m.accuracy; });
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    return { avgAccuracy: avg, totalTests: mockHistory.length, bestSubject: best };
  }, [mockHistory]);

  const fetchCoachingAnalysis = async () => {
    if (mockHistory.length === 0 || auditReport) return;
    setIsCoaching(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const context = mockHistory.map(m => `Subject: ${m.subject}, Accuracy: ${m.accuracy.toFixed(1)}% on ${new Date(m.startTime).toLocaleDateString()}`).join('\n');
    
    const prompt = `
      Act as an elite CBSE Class 12th Mentor. Analyze the following student performance data:
      ${context}

      Generate a deep **STRATEGIC AUDIT REPORT**.
      
      Return ONLY a JSON object with this schema:
      {
        "performanceStatus": "Short high-level status like 'Mastery Track' or 'Critical Red Zone'",
        "statusColor": "rose" | "amber" | "emerald" | "indigo",
        "executiveSummary": "A punchy, mentor-voiced 3-sentence diagnostic overview.",
        "interventions": [
          {"category": "Logic", "icon": "Brain", "advice": "Detailed mathematical advice using LaTeX if needed."},
          {"category": "Time", "icon": "Clock", "advice": "Specific board exam speed/pattern strategy."},
          {"category": "Revision", "icon": "BookOpen", "advice": "Which exact topics to rebrush now."}
        ],
        "strategicSecret": "One powerful, slightly secret Board exam hack related to their performance."
      }

      Voice: Encouraging but uncompromising on excellence. Use "We" and "Mentor".
    `;

    try {
      // Upgraded model to gemini-3-pro-preview for complex performance auditing.
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });
      const data = JSON.parse(response.text || "{}");
      setAuditReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCoaching(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'coach') fetchCoachingAnalysis();
  }, [activeTab]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      
      {/* NAVIGATION SUB-TABS */}
      <div className="bg-slate-100/60 backdrop-blur-lg p-1.5 rounded-[2.5rem] flex items-center justify-between shrink-0 mb-6 border border-slate-200/50">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 px-2 rounded-[1.75rem] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Activity className="w-4 h-4" /> Overview
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-2 rounded-[1.75rem] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <History className="w-4 h-4" /> History
        </button>
        <button 
          onClick={() => setActiveTab('coach')}
          className={`flex-1 py-3 px-2 rounded-[1.75rem] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'coach' ? 'bg-[#0a0f2b] text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Sparkles className="w-4 h-4" /> Coach
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1 scroll-smooth">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[120px] rounded-full" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-12">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em]">Global Audit</p>
                    <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Intelligence</h2>
                  </div>
                  <div className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400">
                    <Award className="w-7 h-7" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg. Precision</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black text-white leading-none">{stats.avgAccuracy.toFixed(0)}</span>
                      <span className="text-2xl font-black text-indigo-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Tier</p>
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                      <span className="text-xl font-black text-white uppercase tracking-tight">{stats.avgAccuracy > 80 ? 'Elite' : 'Stabilizing'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-sm font-black flex items-center gap-3 uppercase tracking-widest text-slate-900">
                  <LayoutGrid className="w-5 h-5 text-indigo-600" /> Syllabus Heatmap
                </h3>
              </div>
              <div className="space-y-10">
                {sortedTopics.map((topic, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between items-end mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${topic.masteryScore > 80 ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                        <span className="font-black text-slate-900 text-[13px] uppercase tracking-tight">{topic.topic}</span>
                      </div>
                      <span className="text-[14px] font-black text-slate-950">{topic.masteryScore.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-50 h-3.5 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${topic.masteryScore > 80 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]'}`} 
                        style={{ width: `${topic.masteryScore}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
            {!selectedSession ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center px-4 mb-8">
                   <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Session Archive</h3>
                   <div className="px-4 py-1.5 bg-slate-100 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
                     {mockHistory.length} Cycles
                   </div>
                </div>
                {mockHistory.map((session) => (
                  <button 
                    key={session.id} 
                    onClick={() => setSelectedSession(session)}
                    className="w-full bg-white rounded-[2.5rem] border border-slate-100 p-8 flex items-center gap-8 shadow-sm active:scale-[0.98] transition-all hover:border-indigo-300"
                  >
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center font-black text-3xl bg-[#0a0f2b] text-white shadow-2xl">
                      {session.score}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                          {session.subject}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {new Date(session.startTime).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 uppercase truncate">
                        Baseline Track #{session.id.slice(-4)}
                      </h4>
                    </div>
                    <ChevronRight className="w-7 h-7 text-slate-200" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-8 pb-20">
                <button onClick={() => setSelectedSession(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 bg-slate-50 px-6 py-4 rounded-2xl active:scale-95 transition-all mb-4">
                  <ChevronLeft className="w-4 h-4" /> Back to Archives
                </button>
                <div className="bg-[#0a0f2b] rounded-[3rem] p-12 text-white shadow-2xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400 mb-4">Neural Data Audit</p>
                  <div className="flex items-baseline gap-4">
                     <span className="text-7xl font-black">{selectedSession.accuracy.toFixed(0)}</span>
                     <span className="text-2xl font-black text-indigo-500 uppercase tracking-widest">Accuracy %</span>
                  </div>
                </div>
                <div className="space-y-8">
                   {selectedSession.questions.map((q) => (
                      <QuizCard key={q.id} question={q} selectedOptionId={selectedSession.answers[q.id]} isSubmitted={true} autoExpandSolution={true} />
                   ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'coach' && (
          <div className="max-w-2xl mx-auto space-y-8 pb-32 animate-in zoom-in-95 duration-700">
            {/* STRATEGIC AUDIT CONTAINER */}
            <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100">
               {/* MENTOR HEADER */}
               <header className="px-10 py-16 bg-[#0a0f2b] text-white relative flex items-center gap-8 overflow-hidden">
                 <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full -mr-20 -mt-20" />
                 
                 <div className="w-20 h-20 bg-[#4f46e5] rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10 border-2 border-white/10">
                    <Star className="w-10 h-10 text-white fill-white animate-pulse" />
                 </div>

                 <div className="relative z-10 space-y-2">
                   <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">Strategic Audit</h3>
                   <p className="text-[12px] font-bold text-indigo-300 uppercase tracking-[0.5em]">Personal AI Mentorship</p>
                 </div>
               </header>

               {/* STATUS BAR */}
               <div className="px-12 py-8 bg-white border-b border-slate-50 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                       <CircleCheck className="w-4 h-4" strokeWidth={3} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Intelligence Verified</span>
                 </div>
                 <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest">CBSE Class 12-B Track</span>
                 </div>
               </div>

               {/* CONTENT BOX */}
               <div className="p-12 md:p-16 space-y-16">
                 {isCoaching ? (
                   <div className="py-32 flex flex-col items-center gap-8 text-center">
                     <div className="relative">
                        <Loader2 className="w-20 h-20 text-indigo-600 animate-spin" />
                        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse" />
                     </div>
                     <div className="space-y-2">
                       <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400">Synthesizing Diagnostic...</p>
                       <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Analyzing Logic Patterns & Time Signatures</p>
                     </div>
                   </div>
                 ) : auditReport ? (
                   <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 space-y-16">
                      
                      {/* REPORT METADATA CARDS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Status</p>
                            <div className="flex items-center gap-4">
                               <div className={`w-4 h-4 rounded-full bg-${auditReport.statusColor}-500 shadow-lg shadow-${auditReport.statusColor}-500/40`} />
                               <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{auditReport.performanceStatus}</h4>
                            </div>
                         </div>
                         <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Context</p>
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-[#0a0f2b] text-white rounded-xl flex items-center justify-center text-sm font-black shadow-lg">
                                  {stats.avgAccuracy.toFixed(0)}%
                               </div>
                               <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{currentSubject || 'General'}</h4>
                            </div>
                         </div>
                      </div>

                      {/* EXECUTIVE SUMMARY */}
                      <div className="space-y-6">
                         <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                            <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em]">Executive Summary</h4>
                         </div>
                         <div className="p-10 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                               <Info className="w-24 h-24" />
                            </div>
                            <p className="text-lg text-slate-800 font-bold leading-relaxed selection:bg-indigo-100">
                               {auditReport.executiveSummary}
                            </p>
                         </div>
                      </div>

                      {/* TACTICAL INTERVENTIONS */}
                      <div className="space-y-8">
                         <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                            <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em]">Tactical Intervention</h4>
                         </div>
                         <div className="grid grid-cols-1 gap-4">
                            {auditReport.interventions.map((item, i) => {
                               const Icon = item.category === 'Logic' ? Brain : item.category === 'Time' ? Clock : BookOpen;
                               return (
                                  <div key={i} className="flex gap-8 p-10 bg-slate-50 border border-slate-100 rounded-[2.5rem] items-start hover:bg-white hover:shadow-xl hover:border-indigo-100 transition-all group">
                                     <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <Icon className="w-7 h-7" />
                                     </div>
                                     <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                           <h5 className="text-[11px] font-black uppercase text-indigo-600 tracking-[0.3em]">{item.category} Focus</h5>
                                           <div className="h-px flex-1 bg-slate-200" />
                                        </div>
                                        <div className="text-[16px] text-slate-700 font-bold leading-relaxed pt-1">
                                           <MathRenderer text={item.advice} />
                                        </div>
                                     </div>
                                  </div>
                               );
                            })}
                         </div>
                      </div>

                      {/* MENTOR SECRET */}
                      <div className="pt-10">
                         <div className="bg-[#0a0f2b] p-10 rounded-[3rem] border border-white/10 flex gap-8 items-start shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-3xl rounded-full" />
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md shrink-0 border border-white/5">
                               <ShieldAlert className="w-10 h-10 text-amber-400" />
                            </div>
                            <div>
                               <p className="text-[11px] font-black text-indigo-300 uppercase tracking-[0.5em] mb-3 flex items-center gap-3">
                                  <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" /> Mentor's Exam Secret
                               </p>
                               <p className="text-lg text-white font-bold italic leading-relaxed selection:bg-indigo-900">
                                 "{auditReport.strategicSecret}"
                               </p>
                            </div>
                         </div>
                      </div>

                      {/* VERIFICATION FOOTER */}
                      <div className="pt-10 flex items-center justify-between opacity-40">
                         <div className="flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Diagnostic Protocol Verified • Board Ready</span>
                         </div>
                         <span className="text-[9px] font-black uppercase tracking-widest">AS-Node {stats.totalTests}</span>
                      </div>
                   </div>
                 ) : (
                   <div className="text-center py-32 opacity-50 flex flex-col items-center gap-10">
                     <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-slate-100 shadow-inner">
                        <GraduationCap className="w-12 h-12 text-slate-200" />
                     </div>
                     <div className="space-y-4">
                        <p className="text-[14px] font-black uppercase tracking-[0.3em] text-slate-900">Diagnostic Missing</p>
                        <p className="text-sm font-medium text-slate-400 max-w-[320px] leading-relaxed mx-auto">Establish a baseline session record to allow the Mentor to construct your detailed Strategic Audit.</p>
                     </div>
                     {mockHistory.length > 0 && (
                        <button 
                          onClick={fetchCoachingAnalysis} 
                          className="px-16 py-6 bg-[#0a0f2b] text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all hover:bg-indigo-600 border-b-4 border-indigo-900"
                        >
                          Synthesize Audit
                        </button>
                     )}
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
