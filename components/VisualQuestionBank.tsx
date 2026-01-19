import React, { useState, useMemo } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  Search,
  Plus,
  Eye,
  CheckCircle2,
  Atom,
  FlaskConical,
  Dna,
  PenTool,
  Loader2,
  Sparkles,
  FileQuestion,
  ChevronRight,
  Filter,
  Save,
  Trash2,
  Printer,
  Layout,
  BookOpen
} from 'lucide-react';
import { RenderWithMath, DerivationStep } from './MathRenderer';
import { Scan, AnalyzedQuestion } from '../types';
import { cache } from '../utils/cache';

interface Question {
  id: string;
  text: string;
  options?: string[];
  marks: string;
  year: string;
  diff: string;
  topic: string;
  markingScheme: { step: string; mark: string }[];
  visualConcept?: string;
  domain?: string;
}

interface VisualQuestionBankProps {
  recentScans?: Scan[];
}

const VisualQuestionBank: React.FC<VisualQuestionBankProps> = ({ recentScans = [] }) => {
  const [activeTab, setActiveTab] = useState('Physics');
  const [selectedGrade, setSelectedGrade] = useState('Class 12');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>('');
  const [numQuestionsToGen, setNumQuestionsToGen] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const cached = localStorage.getItem('saved_questions');
    return new Set(cached ? JSON.parse(cached) : []);
  });
  const [trashedIds, setTrashedIds] = useState<Set<string>>(new Set());

  const handleSave = (id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('saved_questions', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleTrash = (id: string) => {
    setTrashedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (expandedId === id) setExpandedId(null);
  };

  const paperStats = useMemo(() => {
    if (questions.length === 0) return null;
    const totalMarks = questions.reduce((acc, q) => acc + (parseInt(q.marks) || 0), 0);
    const domainCounts = Array.from(new Set(questions.map(q => q.domain))).filter(Boolean).length;
    const diffCounts = {
      Easy: questions.filter(q => q.diff === 'Easy').length,
      Moderate: questions.filter(q => q.diff === 'Moderate').length,
      Hard: questions.filter(q => q.diff === 'Hard').length,
    };
    const predictionCount = questions.filter(q => q.year?.includes('Prediction')).length;

    return { totalMarks, domainCounts, diffCounts, predictionCount };
  }, [questions]);

  const filteredVault = useMemo(() => {
    return recentScans.filter(s => s.grade === selectedGrade && s.subject === activeTab);
  }, [recentScans, selectedGrade, activeTab]);

  const selectedAnalysis = useMemo(() => {
    return filteredVault.find(s => s.id === selectedAnalysisId);
  }, [filteredVault, selectedAnalysisId]);

  // Default selection for vault
  React.useEffect(() => {
    if (!selectedAnalysisId && filteredVault.length > 0) {
      setSelectedAnalysisId(filteredVault[0].id);
    }
  }, [filteredVault, selectedAnalysisId]);

  // Load cached questions
  React.useEffect(() => {
    const key = selectedAnalysisId ? `qbank_${selectedAnalysisId}` : `qbank_${activeTab}_${selectedGrade}`;
    const cached = cache.get(key);
    if (cached) {
      setQuestions(cached);
    } else {
      setQuestions([]);
    }
  }, [selectedAnalysisId, activeTab, selectedGrade]);

  const avgQCount = useMemo(() => {
    if (!selectedAnalysis || !selectedAnalysis.analysisData?.questions) return 5;
    const qCount = selectedAnalysis.analysisData.questions.length;
    // Calculate number of unique sources/papers
    const sources = Array.from(new Set(selectedAnalysis.analysisData.questions.map(q => q.source))).filter(Boolean);
    const numPapers = sources.length || 1;
    return Math.max(5, Math.round(qCount / numPapers));
  }, [selectedAnalysis]);

  const generateNewQuestion = async () => {
    setIsGenerating(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key Missing");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: "application/json" }
      });

      // Extract characteristics from selected analysis if available
      let analysisContext = "";
      if (selectedAnalysis) {
        const stats = selectedAnalysis.analysisData;
        if (stats) {
          analysisContext = `
          BASED ON ANALYSIS OF PAPER: "${selectedAnalysis.name}"
          DOMAIN DISTRIBUTION: ${JSON.stringify(stats.topicWeightage)}
          DIFFICULTY DISTRIBUTION: ${JSON.stringify(stats.difficultyDistribution)}
          PREDICTED TOPICS: ${JSON.stringify(stats.predictiveTopics)}
          
          TASK: Generate a question that fits the pattern of this paper.
          Ensure domain alignment and pedagogical consistency.
          `;
        }
      }

      const prompt = `Elite Academic Researcher: Generate a COMPREHENSIVE set of ${avgQCount} high-yield CBSE ${selectedGrade} ${activeTab} questions with professional marking schemes.

      ${analysisContext}

      GOALS:
      1. COVERAGE: Ensure questions cover ALL major domains mentioned in the analysis.
      2. PREDICTION: Include at least 2 questions based on the "PREDICTED TOPICS" from the analysis.
      3. VARIETY: Mix MCQs, Short Answer (2-3M), and Long Answer (5M) following the standard CBSE pattern.
      4. RIGOR: Match the "OVERALL DIFFICULTY" and "DIFFICULTY DISTRIBUTION" of the analyzed vault.

      RULES:
      1. LaTeX formatting for all math ($...$ or $$...$$).
      2. Logical marking scheme steps for every question.
      3. Year should be "2025 Prediction" for predicted topics, or similar to analyzed ones.

      RETURN JSON ONLY.
      Schema: { "questions": [{ "text": "...", "marks": "...", "year": "2025 Prediction", "diff": "Hard", "topic": "...", "domain": "...", "markingScheme": [{ "step": "Logic step with LaTeX $...$", "mark": "1" }] }] }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const data = JSON.parse(text || "{}");

      if (data.questions && Array.isArray(data.questions)) {
        const formatted = data.questions.map((q: any) => ({
          ...q,
          id: `Q${Math.floor(Math.random() * 10000)}`
        }));
        const newQuestions = [...formatted, ...questions];
        setQuestions(newQuestions);
        const key = selectedAnalysisId ? `qbank_${selectedAnalysisId}` : `qbank_${activeTab}_${selectedGrade}`;
        cache.save(key, newQuestions, selectedAnalysisId || 'general', 'question');
      } else if (data.question) {
        const newQuestions = [{ ...data.question, id: `Q${Math.floor(Math.random() * 10000)}` }, ...questions];
        setQuestions(newQuestions);
        const key = selectedAnalysisId ? `qbank_${selectedAnalysisId}` : `qbank_${activeTab}_${selectedGrade}`;
        cache.save(key, newQuestions, selectedAnalysisId || 'general', 'question');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredQuestions = questions.filter(q =>
    !trashedIds.has(q.id) && (
      q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="flex h-full bg-slate-50/50 font-instrument text-slate-900 overflow-hidden">

      {/* Dense Sidebar */}
      <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <BookOpen size={16} />
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest font-outfit">Fragment Vault</h2>
          </div>

          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Grade Context</h3>
          <div className="flex gap-2 mb-6">
            {['Class 10', 'Class 12'].map(g => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${selectedGrade === g ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Discipline DNA</h3>
          <div className="space-y-1">
            {[
              { name: 'Physics', icon: Atom, color: 'indigo' },
              { name: 'Chemistry', icon: FlaskConical, color: 'amber' },
              { name: 'Biology', icon: Dna, color: 'emerald' },
              { name: 'Math', icon: PenTool, color: 'rose' },
            ].map((sub) => (
              <button
                key={sub.name}
                onClick={() => {
                  setActiveTab(sub.name);
                  setSelectedAnalysisId('');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${activeTab === sub.name ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className={`p-1.5 rounded-lg ${activeTab === sub.name ? 'bg-primary-400 text-slate-900' : 'bg-slate-100 text-slate-400'}`}>
                  <sub.icon size={14} />
                </div>
                {sub.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto scroller-hide">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Vault Intelligence</h3>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider px-1">Source Analysis</label>
              <select
                value={selectedAnalysisId}
                onChange={(e) => setSelectedAnalysisId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-primary-500/10 shadow-sm outline-none cursor-pointer"
              >
                <option value="">Fresh Generation</option>
                {filteredVault.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider px-1">Difficulty Weights</label>
              <div className="flex flex-wrap gap-2">
                {['Easy', 'Moderate', 'Hard'].map(d => (
                  <button key={d} className="px-3 py-1.5 rounded-lg border border-slate-200 text-[9px] font-bold text-slate-600 hover:border-primary-400 transition-all bg-white">
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {selectedAnalysis && (
              <div className="p-4 bg-primary-50 border border-primary-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={12} className="text-primary-600" />
                  <span className="text-[9px] font-black text-primary-900 uppercase tracking-widest">DNA Mapped</span>
                </div>
                <p className="text-[10px] text-primary-700 font-bold leading-relaxed italic">Generating fragments that match the {selectedAnalysis.name} pattern.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={generateNewQuestion}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-[1.25rem] text-[11px] font-black uppercase tracking-[0.2em] disabled:opacity-50 hover:bg-slate-800 transition-all shadow-xl active:scale-95 group"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-primary-400 group-hover:rotate-12 transition-transform" />}
            {isGenerating ? 'Synthesizing...' : 'Trigger Expert Fragment'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Internal Tool Bar */}
        <div className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-6 flex-1">
            <h1 className="text-2xl font-black text-slate-900 font-outfit tracking-tighter">Question Bank</h1>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-full max-w-md">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search vault fragments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 outline-none text-[12px] font-bold text-slate-900 w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
              <Filter size={18} />
            </button>
            <button className="flex items-center gap-3 px-6 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-900 transition-all shadow-sm">
              <Printer size={16} /> Export Paper
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scroller-hide bg-slate-50/20">
          <div className="max-w-6xl mx-auto space-y-8 pb-32">
            {paperStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Blueprint Payload</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{questions.length}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">Fragments / {paperStats.totalMarks}M</span>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Domain Coverage</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-indigo-600">{paperStats.domainCounts}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">Branches Indexed</span>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rigor Spectrum</span>
                  <div className="flex gap-2 mt-1">
                    <div className="flex-1 h-2 bg-emerald-500 rounded-full" style={{ flexGrow: paperStats.diffCounts.Easy }} title="Easy" />
                    <div className="flex-1 h-2 bg-amber-500 rounded-full" style={{ flexGrow: paperStats.diffCounts.Moderate }} title="Moderate" />
                    <div className="flex-1 h-2 bg-rose-500 rounded-full" style={{ flexGrow: paperStats.diffCounts.Hard }} title="Hard" />
                  </div>
                  <div className="flex justify-between mt-2 text-[8px] font-bold text-slate-500 uppercase">
                    <span>{paperStats.diffCounts.Easy}E</span>
                    <span>{paperStats.diffCounts.Moderate}M</span>
                    <span>{paperStats.diffCounts.Hard}H</span>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prediction Yield</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-primary-600">{paperStats.predictionCount}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">High Yield Targets</span>
                  </div>
                </div>
              </div>
            )}

            {filteredQuestions.length > 0 ? (
              filteredQuestions.map((q) => (
                <div key={q.id}
                  className={`bg-white border transition-all duration-300 group relative overflow-hidden ${expandedId === q.id
                    ? 'rounded-[2rem] p-8 shadow-xl border-primary-500/30'
                    : 'rounded-2xl p-6 shadow-sm border-slate-200 hover:border-primary-400 cursor-pointer'
                    }`}
                  onClick={() => expandedId !== q.id && setExpandedId(q.id)}
                >
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-slate-900 pointer-events-none group-hover:scale-110 transition-transform">
                    <FileQuestion size={expandedId === q.id ? 160 : 80} />
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-lg tracking-widest border border-slate-200 shadow-sm">{q.year}</span>
                      <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg tracking-widest border shadow-sm ${q.diff === 'Hard' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        q.diff === 'Moderate' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>{q.diff}</span>
                      <span className="px-3 py-1 bg-primary-50 text-primary-700 text-[9px] font-black uppercase rounded-lg tracking-widest border border-primary-100 shadow-sm">{q.marks} Marks</span>
                      {expandedId !== q.id && q.domain && (
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 border-l border-slate-100 ml-2">{q.domain}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSave(q.id); }}
                        className={`p-2 rounded-lg transition-colors ${savedIds.has(q.id) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 hover:text-primary-600'}`}
                        title={savedIds.has(q.id) ? "Saved to Vault" : "Save for Revision"}
                      >
                        <Save size={16} fill={savedIds.has(q.id) ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTrash(q.id); }}
                        className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Remove from List"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
                      {expandedId === q.id ? (
                        <button onClick={(e) => { e.stopPropagation(); setExpandedId(null); }} className="p-2 text-slate-400 hover:text-slate-900"><Plus size={18} className="rotate-45" /></button>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] font-black text-primary-600 uppercase tracking-widest pl-2">
                          Inspect Logic <ChevronRight size={14} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`font-bold text-slate-900 leading-relaxed font-outfit border-slate-50 transition-all ${expandedId === q.id
                    ? 'text-2xl mb-10 border-l-8 pl-10 py-2'
                    : 'text-base mb-2 border-l-4 pl-6 line-clamp-1'
                    }`}>
                    <RenderWithMath text={q.text} showOptions={false} />
                  </div>

                  {expandedId === q.id && (
                    <>
                      {q.domain && (
                        <div className="mt-4 flex items-center gap-2 mb-10 pl-10">
                          <div className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">{q.domain}</div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{q.topic}</span>
                        </div>
                      )}

                      <div className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100 p-10 relative overflow-hidden group/mks">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.02] transform rotate-12 group-hover/mks:scale-110 transition-transform"><Atom size={180} /></div>
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3 font-outfit">
                            <PenTool size={16} className="text-primary-500" /> Pedagogical Illustration & Step-Logic
                          </h3>
                          <button className="flex items-center gap-2 text-[10px] font-black text-primary-600 uppercase tracking-widest hover:gap-3 transition-all">
                            Edit Strategy <ChevronRight size={14} />
                          </button>
                        </div>
                        <div className="space-y-6">
                          {q.markingScheme?.map((item, mIdx) => (
                            <DerivationStep
                              key={mIdx}
                              index={mIdx + 1}
                              title={`Logic Phase ${mIdx + 1} [${item.mark} Mark]`}
                              content={item.step}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center rounded-[3rem] border-4 border-dashed border-slate-100 bg-white shadow-inner mx-auto max-w-2xl">
                <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-center mb-10 text-slate-200 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <FileQuestion size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 font-outfit uppercase tracking-tighter">Vault Offline</h2>
                <p className="text-[12px] text-slate-400 font-bold uppercase tracking-[0.2em] italic max-w-[320px] leading-relaxed">
                  Select an analysis from the vault to initialize the logic engine and curate expert fragments.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default VisualQuestionBank;
