import React, { useMemo, useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  FileText,
  X,
  Copy,
  Printer,
  Loader2,
  Sparkles,
  Lightbulb,
  PenTool,
  AlertCircle,
  Users,
  User,
  Search,
  ArrowLeft,
  LayoutDashboard,
  ChevronRight
} from 'lucide-react';
import { LessonContract, UserState } from '../types';

interface TeacherConsoleProps {
  userState: UserState;
  currentLesson: LessonContract;
}

interface StudentProfile {
  id: string;
  name: string;
  avatar: string;
  score: number;
  status: 'Mastered' | 'Learning' | 'Struggling';
  misconceptions: string[];
  lastActive: string;
}

const MOCK_NAMES = ["Aarav", "Vihaan", "Aditya", "Sai", "Reyansh", "Diya", "Ananya", "Myra", "Saanvi", "Aadhya", "Ishaan", "Vivaan", "Arjun", "Rohan", "Kabir", "Meera", "Zara", "Naira", "Kavya", "Jhanvi"];

const TeacherConsole: React.FC<TeacherConsoleProps> = ({ userState, currentLesson }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STUDENTS'>('OVERVIEW');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [worksheet, setWorksheet] = useState<any | null>(null);

  const classData = useMemo(() => {
    const students: StudentProfile[] = MOCK_NAMES.map((name, i) => {
      const score = Math.floor(Math.random() * 60) + 40;
      const possibleMisconceptions = ['tan_45_ratio', 'inverse_relation_tan', 'trig_values_memory'];
      const studentMisconceptions = [];
      if (score < 80) {
        if (Math.random() > 0.5) studentMisconceptions.push(possibleMisconceptions[0]);
        if (Math.random() > 0.5) studentMisconceptions.push(possibleMisconceptions[1]);
        if (Math.random() > 0.7) studentMisconceptions.push(possibleMisconceptions[2]);
      }

      return {
        id: `s-${i}`,
        name: name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        score: score,
        status: score >= 80 ? 'Mastered' : score >= 60 ? 'Learning' : 'Struggling',
        misconceptions: studentMisconceptions,
        lastActive: '10 min ago'
      };
    });

    students.unshift({
      id: 'current-user',
      name: 'YOU (Live Session)',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser`,
      score: userState.masteryScore,
      status: userState.masteryScore >= 80 ? 'Mastered' : userState.masteryScore >= 60 ? 'Learning' : 'Struggling',
      misconceptions: userState.misconceptions,
      lastActive: 'Now'
    });

    return students;
  }, [userState.masteryScore, userState.misconceptions]);

  const heatmapData = useMemo(() => {
    const counts: Record<string, number> = {};
    classData.forEach(s => {
      s.misconceptions.forEach(m => {
        counts[m] = (counts[m] || 0) + 1;
      });
    });

    return Object.keys(counts).map((key, index) => ({
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: counts[key],
      color: ['#6991ff', '#a855f7', '#0f4fff'][index % 3]
    }));
  }, [classData]);

  const statusDistribution = useMemo(() => {
    const counts = { Mastered: 0, Learning: 0, Struggling: 0 };
    classData.forEach(s => counts[s.status]++);
    return [
      { name: 'Mastered', value: counts.Mastered, color: '#10b981' },
      { name: 'Learning', value: counts.Learning, color: '#f59e0b' },
      { name: 'Struggling', value: counts.Struggling, color: '#ef4444' }
    ];
  }, [classData]);

  const filteredStudents = classData.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateWorksheet = async (student: StudentProfile) => {
    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `Create a diagnostic remedial worksheet for a student named ${student.name} who is struggling with ${student.misconceptions.join(', ')} in the context of ${currentLesson.title}.
        Return JSON format: {
          "topic": "...",
          "student_level": "...",
          "diagnostic_summary": "...",
          "clarifications": [ { "misconception": "...", "correction": "..." } ],
          "worked_example": { "problem": "...", "steps": ["..."] },
          "practice_questions": ["..."]
        }`;

      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text());
      setWorksheet(data);
    } catch (e) {
      console.error("Failed to generate worksheet", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5"><TrendingUp size={100} /></div>
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2.5 font-outfit uppercase tracking-tight">
            <TrendingUp className="text-primary-600" size={20} /> Skill Heatmap
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heatmapData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={32}>
                  {heatmapData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2.5 font-outfit uppercase tracking-tight">
            <Users className="text-primary-600" size={20} /> Mastery Distribution
          </h3>
          <div className="flex flex-col items-center gap-10">
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2.5">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-500 font-bold text-[9px] uppercase tracking-widest">{item.name}</span>
                  </div>
                  <span className="text-xl font-black text-slate-900 font-outfit">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStudentDetail = () => {
    if (!selectedStudent) return null;

    return (
      <div className="animate-in slide-in-from-right-8 duration-500">
        <button
          onClick={() => setSelectedStudent(null)}
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Class List
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg h-fit">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl scale-125"></div>
                <img src={selectedStudent.avatar} className="w-20 h-20 rounded-full border-4 border-white shadow-xl relative z-10 bg-slate-100" alt="avatar" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 font-outfit tracking-tight">{selectedStudent.name}</h2>
              <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest mt-3 shadow-sm border ${selectedStudent.status === 'Mastered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                selectedStudent.status === 'Learning' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                  'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                {selectedStudent.status}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Mastery Score</span>
                <span className="font-black text-slate-900 text-lg font-outfit">{selectedStudent.score}%</span>
              </div>
              <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Active Status</span>
                <span className="font-black text-slate-900 text-sm italic">{selectedStudent.lastActive}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2.5 font-outfit uppercase tracking-tight">
                <AlertCircle size={20} className="text-primary-600" /> Diagnostic Profile
              </h3>
              {selectedStudent.misconceptions.length > 0 ? (
                <div className="space-y-4">
                  {selectedStudent.misconceptions.map((m, i) => (
                    <div key={i} className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden group hover:border-primary-500/30 transition-all">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full"></div>
                      <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="text-rose-600 font-bold text-[10px] uppercase tracking-wider mb-1.5">{m.replace(/_/g, ' ')}</h4>
                        <p className="text-slate-500 font-medium italic leading-relaxed text-[13px]">System has flagged recurrent error patterns in this conceptual domain during adaptive drills.</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                  <CheckCircle2 size={64} className="text-emerald-400 mx-auto mb-6" />
                  <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No conceptual drift detected</p>
                </div>
              )}
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="absolute bottom-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                <Sparkles size={140} className="text-primary-400" />
              </div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-lg font-black text-white flex items-center gap-2.5 font-outfit uppercase tracking-tight">
                  <Sparkles className="text-primary-400" size={18} /> Pedagogical AI Architect
                </h3>
              </div>

              <button
                onClick={() => generateWorksheet(selectedStudent)}
                disabled={isGenerating || selectedStudent.misconceptions.length === 0}
                className="w-full py-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 relative z-10"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {isGenerating ? "Synthesizing Intervention..." : "Generate AI Remedial Plan"}
              </button>
              <p className="text-center text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-4 relative z-10">
                Drafts a personalized architectural intervention targeting error patterns.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentList = () => (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6 relative max-w-xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input
          type="text"
          placeholder="Filter students by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white text-slate-900 font-bold pl-12 pr-6 py-3.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 shadow-sm outline-none transition-all placeholder:text-slate-300 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredStudents.map(student => (
          <div
            key={student.id}
            onClick={() => setSelectedStudent(student)}
            className="bg-white p-5 rounded-xl border border-slate-100 hover:border-primary-500/30 cursor-pointer transition-all group hover:shadow-lg"
          >
            <div className="flex items-center gap-5">
              <div className="relative">
                <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 relative z-10" />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white z-20 ${student.status === 'Mastered' ? 'bg-emerald-500' : student.status === 'Learning' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors font-outfit text-base truncate">{student.name}</h4>
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Insight Pending • {student.lastActive}
                </div>
              </div>
              <div className="text-right">
                <span className="block text-xl font-black text-slate-900 font-outfit">{student.score}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-slate-50 font-instrument text-slate-900 scroller-hide selection:bg-primary-500 selection:text-white">
      <div className="max-w-7xl mx-auto p-8">

        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary-600 mb-2 font-bold text-[9px] uppercase tracking-widest font-outfit px-1">
              <LayoutDashboard size={16} /> Teacher Intelligence Hub
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight font-outfit mb-2 uppercase">
              Analytics <span className="text-primary-600">Console</span>
            </h1>
            <p className="text-slate-500 text-base font-medium italic">Real-time pedagogical oversight for "{currentLesson.title}"</p>
          </div>
          <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 shadow-lg overflow-hidden self-start md:self-auto">
            <button
              onClick={() => { setActiveTab('OVERVIEW'); setSelectedStudent(null); }}
              className={`px-6 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === 'OVERVIEW' && !selectedStudent ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}
            >
              Class Overview
            </button>
            <button
              onClick={() => { setActiveTab('STUDENTS'); setSelectedStudent(null); }}
              className={`px-6 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === 'STUDENTS' || selectedStudent ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}
            >
              Student Details
            </button>
          </div>
        </header>

        {selectedStudent ? renderStudentDetail() : activeTab === 'OVERVIEW' ? renderOverview() : renderStudentList()}

        {worksheet && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-8 bg-slate-900/40 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full h-[85vh] flex flex-col border border-white/20 relative overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 backdrop-blur-md">
                <h3 className="font-black text-lg flex items-center gap-2.5 text-slate-900 font-outfit tracking-tight uppercase">
                  <Sparkles size={20} className="text-primary-600" /> AI Remedial Architect
                </h3>
                <button onClick={() => setWorksheet(null)} className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition-all border border-transparent hover:border-rose-100">
                  <X size={20} />
                </button>
              </div>

              <div id="printable-worksheet" className="flex-1 overflow-y-auto p-10 bg-white text-slate-900 scroller-hide">
                <div className="border-b-4 border-slate-900 pb-8 mb-10 flex justify-between items-end">
                  <div>
                    <div className="text-[9px] font-bold text-primary-600 uppercase tracking-widest mb-3">Official Intervention Record</div>
                    <h1 className="text-4xl font-black text-slate-900 mb-1.5 font-outfit tracking-tight uppercase">REMEDIAL BLUEPRINT</h1>
                    <p className="text-slate-500 font-bold italic text-base">Personalized Strategic Plan for {worksheet.topic}</p>
                  </div>
                  <div className="text-right text-[9px] font-bold text-slate-400 uppercase tracking-widest space-y-1.5">
                    <p className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><strong>Student ID:</strong> {selectedStudent?.id}</p>
                    <p className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><strong>Profile:</strong> {worksheet.student_level}</p>
                  </div>
                </div>

                <section className="mb-10 bg-slate-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                    <TrendingUp size={100} />
                  </div>
                  <h2 className="text-[9px] font-bold text-primary-400 uppercase tracking-widest mb-4 flex items-center gap-2.5 relative z-10">
                    <TrendingUp size={18} /> Diagnostic Insight
                  </h2>
                  <p className="text-xl font-bold italic leading-relaxed relative z-10 text-slate-200">"{worksheet.diagnostic_summary}"</p>
                </section>

                <section className="mb-10">
                  <h2 className="text-xl font-black text-slate-900 border-b border-slate-200 pb-5 mb-6 flex items-center gap-2.5 font-outfit tracking-tight uppercase">
                    <Lightbulb size={24} className="text-amber-500" /> Concept Architectures
                  </h2>
                  <div className="grid gap-4">
                    {worksheet.clarifications?.map((item: any, i: number) => (
                      <div key={i} className="flex flex-col md:flex-row gap-4 p-6 bg-slate-50 border border-slate-200 rounded-xl group hover:border-primary-500/20 transition-all">
                        <div className="md:w-1/2 p-5 bg-rose-50/50 rounded-xl text-rose-900 font-bold italic border border-rose-100 shadow-inner text-[13px]">
                          <strong className="block text-rose-600 mb-2 uppercase text-[9px] font-bold tracking-widest">Broken Logic</strong> {item.misconception}
                        </div>
                        <div className="md:w-1/2 p-5 bg-emerald-50/50 rounded-xl text-emerald-900 font-bold italic border border-emerald-100 shadow-inner text-[13px]">
                          <strong className="block text-emerald-600 mb-2 uppercase text-[9px] font-bold tracking-widest">Corrective Anchor</strong> {item.correction}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mb-10">
                  <h2 className="text-xl font-black text-slate-900 border-b border-slate-200 pb-5 mb-6 flex items-center gap-2.5 font-outfit tracking-tight uppercase">
                    <BookOpen size={24} className="text-primary-600" /> Guided Derivation
                  </h2>
                  <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-inner">
                    <p className="text-xl font-black text-slate-900 mb-6 font-outfit leading-tight border-l-4 border-primary-600 pl-6 py-1.5">{worksheet.worked_example?.problem}</p>
                    <div className="space-y-4">
                      {worksheet.worked_example?.steps.map((step: string, i: number) => (
                        <div key={i} className="flex gap-4 items-start">
                          <span className="w-8 h-8 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center shrink-0 font-bold text-primary-600 text-[9px]">{i + 1}</span>
                          <p className="text-slate-700 font-bold italic text-base leading-relaxed pt-0.5">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="pb-16">
                  <h2 className="text-xl font-black text-slate-900 border-b border-slate-200 pb-5 mb-6 flex items-center gap-2.5 font-outfit tracking-tight uppercase">
                    <PenTool size={24} className="text-indigo-500" /> Mastery Drills
                  </h2>
                  <div className="space-y-8">
                    {worksheet.practice_questions?.map((q: string, i: number) => (
                      <div key={i} className="group">
                        <p className="text-lg font-bold text-slate-900 mb-8 leading-relaxed group-hover:text-primary-600 transition-colors">
                          <span className="text-slate-400 font-black mr-3 font-outfit">{String(i + 1).padStart(2, '0')}</span>
                          {q}
                        </p>
                        <div className="h-20 w-full border-b border-slate-100 border-dashed relative">
                          <div className="absolute top-0 right-0 text-[8px] font-bold text-slate-200 uppercase tracking-widest uppercase">Show architectural logic here</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/80 backdrop-blur-md flex justify-between items-center">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AI Synthesis Engine v2.5 • Official Transcript</div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2.5 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                >
                  <Printer size={18} className="text-primary-400" /> Export Intervention
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TeacherConsole;