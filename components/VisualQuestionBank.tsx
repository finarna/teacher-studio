import React, { useState, useMemo } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeAiParse } from '../utils/aiParser';
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
  BookOpen,
  Lightbulb,
  Target,
  Brain,
  TrendingUp,
  AlertCircle,
  Award,
  Link2,
  Zap,
  BookmarkPlus,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { RenderWithMath, DerivationStep } from './MathRenderer';
import { Scan, AnalyzedQuestion } from '../types';
import { cache } from '../utils/cache';

interface Question {
  id: string;
  text: string;
  options: string[]; // Make this required, not optional
  marks: string;
  year: string;
  diff: string;
  topic: string;
  markingScheme: { step: string; mark: string }[];
  visualConcept?: string;
  domain?: string;
  hasVisualElement?: boolean;
  visualElementType?: 'diagram' | 'table' | 'graph' | 'illustration' | 'chart' | 'image';
  visualElementDescription?: string;
  visualElementPosition?: 'above' | 'below' | 'inline' | 'side';
  extractedImages?: string[];
  correctOptionIndex: number; // Make this required
  // AI fields
  bloomsTaxonomy?: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  pedagogy?: 'Conceptual' | 'Analytical' | 'Problem-Solving' | 'Application' | 'Critical-Thinking';
  relevanceScore?: number;
  sourceScans?: string[];
  whyItMatters?: string;
  keyConcepts?: { name: string; explanation: string }[]; // Enhanced with explanations
  commonMistakes?: { mistake: string; why: string; howToAvoid: string }[]; // Enhanced with details
  relatedQuestions?: string[];
  studyTip?: string;
  thingsToRemember?: string[]; // NEW: Key formulas, rules, principles
  // NEW: AI Reasoning
  aiReasoning?: string; // Why this question based on scanned papers
  historicalPattern?: string; // Pattern from past papers
  predictiveInsight?: string; // Why likely to appear
}

interface VisualQuestionBankProps {
  recentScans?: Scan[];
}

const VisualQuestionBank: React.FC<VisualQuestionBankProps> = ({ recentScans = [] }) => {
  const [activeTab, setActiveTab] = useState('Physics');
  const [selectedGrade, setSelectedGrade] = useState('Class 12');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const cached = localStorage.getItem('saved_questions');
    return new Set(cached ? JSON.parse(cached) : []);
  });
  const [trashedIds, setTrashedIds] = useState<Set<string>>(new Set());
  const [showInsights, setShowInsights] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'solution' | 'insights' | null>(null);
  const [activeModalQuestionId, setActiveModalQuestionId] = useState<string | null>(null);

  // Track user's selected answers (before validation)
  const [userAnswers, setUserAnswers] = useState<Map<string, number>>(new Map());
  // Track validated answers (after clicking Check Answer)
  const [validatedAnswers, setValidatedAnswers] = useState<Map<string, number>>(new Map());

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

  // Handle answer selection (can change before validation)
  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setUserAnswers(prev => {
      const next = new Map(prev);
      next.set(questionId, optionIndex);
      return next;
    });
  };

  // Validate answer
  const handleValidateAnswer = (questionId: string) => {
    const selectedAnswer = userAnswers.get(questionId);
    if (selectedAnswer !== undefined) {
      setValidatedAnswers(prev => {
        const next = new Map(prev);
        next.set(questionId, selectedAnswer);
        return next;
      });
    }
  };

  // Open modal
  const openModal = (type: 'solution' | 'insights', questionId: string) => {
    setModalType(type);
    setActiveModalQuestionId(questionId);
  };

  // Close modal
  const closeModal = () => {
    setModalType(null);
    setActiveModalQuestionId(null);
  };

  const paperStats = useMemo(() => {
    if (questions.length === 0) return null;

    const totalMarks = questions.reduce((acc, q) => acc + (parseInt(q.marks) || 0), 0);
    const domainCounts = Array.from(new Set(questions.map(q => q.domain))).filter(Boolean).length;

    // Difficulty distribution
    const diffCounts = {
      Easy: questions.filter(q => q.diff === 'Easy').length,
      Moderate: questions.filter(q => q.diff === 'Moderate').length,
      Hard: questions.filter(q => q.diff === 'Hard').length,
    };

    // Pedagogy distribution
    const pedagogyCounts = {
      'Conceptual': questions.filter(q => q.pedagogy === 'Conceptual').length,
      'Analytical': questions.filter(q => q.pedagogy === 'Analytical').length,
      'Problem-Solving': questions.filter(q => q.pedagogy === 'Problem-Solving').length,
      'Application': questions.filter(q => q.pedagogy === 'Application').length,
      'Critical-Thinking': questions.filter(q => q.pedagogy === 'Critical-Thinking').length,
    };

    const predictionCount = questions.filter(q => q.year?.includes('Prediction')).length;

    // Correlation to scanned papers - FIXED
    // Use relevanceScore which is actually being generated by AI
    const avgRelevanceScore = questions.length > 0
      ? questions.reduce((acc, q) => acc + (q.relevanceScore || 70), 0) / questions.length
      : 0;
    const highRelevanceCount = questions.filter(q => (q.relevanceScore || 0) >= 80).length;
    const mediumRelevanceCount = questions.filter(q => {
      const score = q.relevanceScore || 0;
      return score >= 60 && score < 80;
    }).length;

    // Correlation percentage based on average relevance
    const correlationPercentage = Math.round(avgRelevanceScore);

    // Bloom's taxonomy distribution
    const bloomsCounts = {
      'Remember': questions.filter(q => q.bloomsTaxonomy === 'Remember').length,
      'Understand': questions.filter(q => q.bloomsTaxonomy === 'Understand').length,
      'Apply': questions.filter(q => q.bloomsTaxonomy === 'Apply').length,
      'Analyze': questions.filter(q => q.bloomsTaxonomy === 'Analyze').length,
      'Evaluate': questions.filter(q => q.bloomsTaxonomy === 'Evaluate').length,
      'Create': questions.filter(q => q.bloomsTaxonomy === 'Create').length,
    };

    // Topic distribution - group by topic and count
    const topicDistribution = questions.reduce((acc, q) => {
      const topic = q.topic || 'Uncategorized';
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort topics by count (descending) and take top 8
    const topTopics = Object.entries(topicDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      totalMarks,
      domainCounts,
      diffCounts,
      pedagogyCounts,
      bloomsCounts,
      predictionCount,
      avgRelevanceScore: Math.round(avgRelevanceScore),
      highRelevanceCount,
      mediumRelevanceCount,
      correlationPercentage,
      topTopics
    };
  }, [questions, selectedAnalysisId]);

  const filteredVault = useMemo(() => {
    return recentScans.filter(s => s.grade === selectedGrade && s.subject === activeTab);
  }, [recentScans, selectedGrade, activeTab]);

  const selectedAnalysis = useMemo(() => {
    return filteredVault.find(s => s.id === selectedAnalysisId);
  }, [filteredVault, selectedAnalysisId]);

  React.useEffect(() => {
    if (!selectedAnalysisId && filteredVault.length > 0) {
      setSelectedAnalysisId(filteredVault[0].id);
    }
  }, [filteredVault, selectedAnalysisId]);

  React.useEffect(() => {
    const loadQuestions = async () => {
      const key = selectedAnalysisId ? `qbank_${selectedAnalysisId}` : `qbank_${activeTab}_${selectedGrade}`;

      try {
        const response = await fetch(`/api/questionbank/${key}`);
        if (response.ok) {
          const data = await response.json();
          if (data.questions && data.questions.length > 0) {
            setQuestions(data.questions);
            cache.save(key, data.questions, selectedAnalysisId || 'general', 'question');
            return;
          }
        }

        const cached = cache.get(key);
        if (cached) {
          setQuestions(cached);
        } else {
          setQuestions([]);
        }
      } catch (err) {
        const cached = cache.get(key);
        if (cached) {
          setQuestions(cached);
        } else {
          setQuestions([]);
        }
      }
    };

    loadQuestions();
  }, [selectedAnalysisId, activeTab, selectedGrade]);

  const avgQCount = useMemo(() => {
    if (!selectedAnalysis || !selectedAnalysis.analysisData?.questions) return 5;
    const qCount = selectedAnalysis.analysisData.questions.length;
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
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 16384,
          temperature: 0.3
        }
      });

      let analysisContext = "";
      let historicalData = "";

      if (selectedAnalysis) {
        const stats = selectedAnalysis.analysisData;
        if (stats) {
          analysisContext = `
          BASED ON ANALYSIS OF PAPER: "${selectedAnalysis.name}"
          DOMAIN DISTRIBUTION: ${JSON.stringify(stats.topicWeightage)}
          DIFFICULTY DISTRIBUTION: ${JSON.stringify(stats.difficultyDistribution)}
          PREDICTED TOPICS: ${JSON.stringify(stats.predictiveTopics)}
          EXAM TRENDS: ${JSON.stringify(stats.trends)}
          `;

          // Extract historical patterns
          const topTopics = stats.topicWeightage?.slice(0, 3).map(t => t.name).join(', ') || '';
          historicalData = `Top recurring topics: ${topTopics}`;
        }
      }

      const prompt = `Generate ${avgQCount} CBSE ${selectedGrade} ${activeTab} MCQ questions with comprehensive metadata and detailed AI insights.

      ${analysisContext}

      CRITICAL REQUIREMENTS:
      1. Each question MUST have exactly 4 options (A, B, C, D) - THIS IS MANDATORY
      2. Mark correctOptionIndex (0-3) for the correct answer
      3. All questions must be MCQs with 4 distinct options
      4. Use LaTeX for math: $...$ or $$...$$
      5. CRITICAL: Double backslash for LaTeX: "\\\\frac{1}{2}" not "\\frac{1}{2}"

      6. Include pedagogical metadata:
         - bloomsTaxonomy: Remember|Understand|Apply|Analyze|Evaluate|Create
         - pedagogy: Conceptual|Analytical|Problem-Solving|Application|Critical-Thinking
         - relevanceScore: 0-100 (how relevant to exam patterns)
         - whyItMatters: 1-2 sentence explanation of importance

      7. DETAILED INSIGHTS (make these rich and valuable):

         - keyConcepts: Array of 2-4 objects with:
           * name: Concept name (e.g., "Newton's Second Law")
           * explanation: 2-3 sentence explanation of the concept, why it's important, and how it applies (e.g., "This law states that F=ma, relating force, mass, and acceleration. It's fundamental to understanding motion and is one of the most frequently tested concepts in mechanics. Mastering this helps solve 30% of physics problems.")

         - commonMistakes: Array of 2-3 objects with:
           * mistake: The common error (e.g., "Confusing mass and weight")
           * why: 1-2 sentences explaining WHY students make this mistake (e.g., "Students often use these terms interchangeably because in everyday language they mean the same thing. However, mass is scalar (kg) while weight is a force (N).")
           * howToAvoid: Specific actionable advice to avoid the mistake (e.g., "Always check units: mass uses kg, weight uses Newtons. Remember Weight = mg, where g = 9.8 m/s². Practice converting between the two.")

         - studyTip: 3-5 sentences of detailed, step-by-step advice for mastering this concept. Include specific strategies, practice techniques, or memory aids. Make it actionable and practical.

         - thingsToRemember: Array of 3-5 key formulas, rules, or principles to memorize. Use LaTeX for formulas. Be specific and complete.

      8. AI REASONING fields:
         - aiReasoning: 2-3 sentences explaining WHY this specific question is important based on the scanned paper analysis. Reference specific patterns, topic weightage, and predictive insights from the analysis.
         - historicalPattern: 1 sentence about how this topic/concept has appeared in past papers (mention frequency, difficulty trends)
         - predictiveInsight: 1 sentence about why this is likely to appear in future exams based on trends

      Example aiReasoning: "This question on ${activeTab.toLowerCase()} is highly relevant because the analysis shows ${historicalData}. The difficulty distribution indicates a 40% emphasis on moderate-level problems in this domain. Based on predictive analytics, questions combining multiple concepts from this topic have a 85% likelihood of appearing."

      RETURN VALID JSON ONLY.
      Schema: {
        "questions": [{
          "text": "Question text...",
          "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
          "correctOptionIndex": 2,
          "marks": "1",
          "year": "2025 Prediction",
          "diff": "Moderate",
          "topic": "...",
          "domain": "...",
          "bloomsTaxonomy": "Apply",
          "pedagogy": "Problem-Solving",
          "relevanceScore": 85,
          "whyItMatters": "This tests...",
          "keyConcepts": [
            {
              "name": "Newton's Second Law",
              "explanation": "This law states that F=ma, relating force, mass, and acceleration. It's fundamental to understanding motion and appears in 30% of mechanics questions. Critical for solving dynamics problems."
            }
          ],
          "commonMistakes": [
            {
              "mistake": "Confusing mass and weight",
              "why": "Students use these terms interchangeably in everyday language, but in physics, mass is scalar (kg) while weight is force (N).",
              "howToAvoid": "Always check units: mass uses kg, weight uses N. Remember W = mg where g = 9.8 m/s². Practice unit conversions."
            }
          ],
          "studyTip": "Start by writing down all given values with proper units. Draw a free body diagram showing all forces. Apply Newton's second law: ΣF = ma. Solve for the unknown. Always verify your answer makes physical sense - check if the direction and magnitude are reasonable.",
          "thingsToRemember": [
            "$F = ma$ (Newton's Second Law)",
            "$W = mg$ (Weight formula where g = 9.8 m/s²)",
            "Force is a vector - direction matters",
            "Net force = sum of all forces",
            "Acceleration and net force are in same direction"
          ],
          "aiReasoning": "This question is important because...",
          "historicalPattern": "This concept appeared 3 times in last 5 years...",
          "predictiveInsight": "Based on trends, this has 80% probability to appear...",
          "markingScheme": [{ "step": "Step with LaTeX", "mark": "1" }]
        }]
      }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const data = safeAiParse<any>(text, { questions: [] }, true);

      if (!data.questions || data.questions.length === 0) {
        alert('⚠️ Failed to generate questions. Please try again.');
        throw new Error('No questions generated');
      }

      if (data.questions && Array.isArray(data.questions)) {
        const formatted = data.questions.map((q: any) => ({
          ...q,
          id: `Q${Math.floor(Math.random() * 10000)}`,
          // Ensure options exist
          options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correctOptionIndex: q.correctOptionIndex ?? 0,
          // Ensure default values for new fields
          bloomsTaxonomy: q.bloomsTaxonomy || 'Understand',
          pedagogy: q.pedagogy || 'Conceptual',
          relevanceScore: q.relevanceScore || 70,
          whyItMatters: q.whyItMatters || 'This question tests core concepts frequently appearing in exams.',
          // Enhanced keyConcepts with explanation
          keyConcepts: q.keyConcepts || [{
            name: q.topic,
            explanation: 'This concept is fundamental to understanding the subject and appears regularly in examinations.'
          }],
          // Enhanced commonMistakes with why and howToAvoid
          commonMistakes: q.commonMistakes || [
            {
              mistake: 'Calculation errors',
              why: 'Students rush through calculations without double-checking their work.',
              howToAvoid: 'Always verify your calculations step-by-step and check if the answer is reasonable.'
            }
          ],
          studyTip: q.studyTip || 'Break down the problem into smaller steps. Understand the theory first, then practice numerical problems. Review your mistakes and learn from them.',
          thingsToRemember: q.thingsToRemember || ['Key formula or principle', 'Important relationship', 'Critical condition or constraint'],
          aiReasoning: q.aiReasoning || `This ${q.topic} question aligns with the exam pattern analysis, appearing frequently in past papers with similar difficulty level.`,
          historicalPattern: q.historicalPattern || `This concept has appeared consistently in ${selectedGrade} ${activeTab} exams.`,
          predictiveInsight: q.predictiveInsight || 'Based on topic weightage trends, this has high probability to appear in upcoming exams.'
        }));
        const newQuestions = [...formatted, ...questions];
        setQuestions(newQuestions);
        const key = selectedAnalysisId ? `qbank_${selectedAnalysisId}` : `qbank_${activeTab}_${selectedGrade}`;

        try {
          await fetch('/api/questionbank', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, questions: newQuestions })
          });
        } catch (err) {
          console.error('Failed to save to Redis:', err);
        }

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

  const getPedagogyColor = (pedagogy?: string) => {
    switch (pedagogy) {
      case 'Conceptual': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Analytical': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Problem-Solving': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Application': return 'bg-green-50 text-green-700 border-green-200';
      case 'Critical-Thinking': return 'bg-pink-50 text-pink-700 border-pink-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getBloomsColor = (blooms?: string) => {
    switch (blooms) {
      case 'Remember': return 'bg-gray-100 text-gray-700';
      case 'Understand': return 'bg-blue-100 text-blue-700';
      case 'Apply': return 'bg-green-100 text-green-700';
      case 'Analyze': return 'bg-yellow-100 text-yellow-700';
      case 'Evaluate': return 'bg-orange-100 text-orange-700';
      case 'Create': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex h-full bg-slate-50/50 font-instrument text-slate-900 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <BookOpen size={16} />
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest font-outfit">Question Vault</h2>
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

          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Subject</h3>
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
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Source Paper</h3>

          <div className="space-y-2">
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

          {selectedAnalysis && (
            <div className="p-4 bg-primary-50 border border-primary-100 rounded-2xl mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} className="text-primary-600" />
                <span className="text-[9px] font-black text-primary-900 uppercase tracking-widest">AI Aligned</span>
              </div>
              <p className="text-[10px] text-primary-700 font-bold leading-relaxed italic">Questions aligned with {selectedAnalysis.name} patterns.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={generateNewQuestion}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-[1.25rem] text-[11px] font-black uppercase tracking-[0.2em] disabled:opacity-50 hover:bg-slate-800 transition-all shadow-xl active:scale-95 group"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-primary-400 group-hover:rotate-12 transition-transform" />}
            {isGenerating ? 'Generating...' : 'Generate Questions'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Header */}
        <div className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-6 flex-1">
            <h1 className="text-2xl font-black text-slate-900 font-outfit tracking-tighter">Question Bank</h1>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-full max-w-md">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search questions..."
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

        <div className="flex-1 overflow-y-auto p-6 scroller-hide bg-slate-50/20">
          <div className="max-w-7xl mx-auto space-y-4 pb-16">
            {paperStats && (
              <div className="space-y-4">
                {/* Row 1: Headline Stats */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Scan Correlation - HERO CARD */}
                  <div className="col-span-5 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16"></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <Link2 size={20} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white/90 uppercase tracking-wide">AI Relevance Score</h3>
                          {selectedAnalysis && (
                            <p className="text-xs text-white/70">{selectedAnalysis.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="text-6xl font-black text-white">{paperStats.correlationPercentage}%</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white/90">Avg Match</span>
                          <span className="text-xs text-white/70">based on AI analysis</span>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-white/80 mb-1">
                          <span>Relevance Distribution</span>
                          <span>{questions.length} questions</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                          <div
                            className="bg-emerald-400 h-full float-left"
                            style={{ width: `${(paperStats.highRelevanceCount / questions.length) * 100}%` }}
                            title={`${paperStats.highRelevanceCount} high-relevance (≥80%)`}
                          ></div>
                          <div
                            className="bg-blue-400 h-full float-left"
                            style={{ width: `${(paperStats.mediumRelevanceCount / questions.length) * 100}%` }}
                            title={`${paperStats.mediumRelevanceCount} medium-relevance (60-79%)`}
                          ></div>
                          <div
                            className="bg-amber-400 h-full float-left"
                            style={{ width: `${((questions.length - paperStats.highRelevanceCount - paperStats.mediumRelevanceCount) / questions.length) * 100}%` }}
                            title={`${questions.length - paperStats.highRelevanceCount - paperStats.mediumRelevanceCount} lower-relevance (<60%)`}
                          ></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                            <span className="text-xs text-white/80">High ≥80%</span>
                          </div>
                          <span className="text-lg font-black text-white">{paperStats.highRelevanceCount}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-xs text-white/80">Med 60-79%</span>
                          </div>
                          <span className="text-lg font-black text-white">{paperStats.mediumRelevanceCount}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                            <span className="text-xs text-white/80">Low &lt;60%</span>
                          </div>
                          <span className="text-lg font-black text-white">{questions.length - paperStats.highRelevanceCount - paperStats.mediumRelevanceCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Question Bank Overview */}
                  <div className="col-span-4 bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <FileQuestion size={20} className="text-slate-700" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Question Bank</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium text-slate-600">Total Questions</span>
                        <span className="text-3xl font-black text-slate-900">{questions.length}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium text-slate-600">Total Marks</span>
                        <span className="text-2xl font-black text-indigo-600">{paperStats.totalMarks}</span>
                      </div>
                      <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                        <span className="text-sm font-medium text-slate-600">Topic Coverage</span>
                        <span className="text-xl font-black text-purple-600">{paperStats.domainCounts} Domains</span>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Breakdown */}
                  <div className="col-span-3 bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Target size={20} className="text-slate-700" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Difficulty</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <span className="text-sm font-medium text-slate-600">Easy</span>
                        </div>
                        <span className="text-lg font-black text-emerald-600">{paperStats.diffCounts.Easy}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                          <span className="text-sm font-medium text-slate-600">Moderate</span>
                        </div>
                        <span className="text-lg font-black text-amber-600">{paperStats.diffCounts.Moderate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                          <span className="text-sm font-medium text-slate-600">Hard</span>
                        </div>
                        <span className="text-lg font-black text-rose-600">{paperStats.diffCounts.Hard}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Detailed Analytics */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Pedagogy Distribution */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Brain size={20} className="text-slate-700" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Pedagogy Distribution</h3>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${(paperStats.pedagogyCounts.Conceptual / questions.length) * 100}%` }}></div>
                        </div>
                        <div className="flex items-center gap-2 w-48">
                          <span className="text-sm font-medium text-slate-600">Conceptual</span>
                          <span className="text-lg font-black text-blue-600 ml-auto">{paperStats.pedagogyCounts.Conceptual}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${(paperStats.pedagogyCounts.Analytical / questions.length) * 100}%` }}></div>
                        </div>
                        <div className="flex items-center gap-2 w-48">
                          <span className="text-sm font-medium text-slate-600">Analytical</span>
                          <span className="text-lg font-black text-purple-600 ml-auto">{paperStats.pedagogyCounts.Analytical}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${(paperStats.pedagogyCounts['Problem-Solving'] / questions.length) * 100}%` }}></div>
                        </div>
                        <div className="flex items-center gap-2 w-48">
                          <span className="text-sm font-medium text-slate-600">Problem-Solving</span>
                          <span className="text-lg font-black text-orange-600 ml-auto">{paperStats.pedagogyCounts['Problem-Solving']}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${(paperStats.pedagogyCounts.Application / questions.length) * 100}%` }}></div>
                        </div>
                        <div className="flex items-center gap-2 w-48">
                          <span className="text-sm font-medium text-slate-600">Application</span>
                          <span className="text-lg font-black text-green-600 ml-auto">{paperStats.pedagogyCounts.Application}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-pink-500 h-full rounded-full transition-all" style={{ width: `${(paperStats.pedagogyCounts['Critical-Thinking'] / questions.length) * 100}%` }}></div>
                        </div>
                        <div className="flex items-center gap-2 w-48">
                          <span className="text-sm font-medium text-slate-600">Critical-Thinking</span>
                          <span className="text-lg font-black text-pink-600 ml-auto">{paperStats.pedagogyCounts['Critical-Thinking']}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloom's Taxonomy */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Sparkles size={20} className="text-slate-700" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Bloom's Taxonomy</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-gray-600 mb-1">{paperStats.bloomsCounts.Remember}</div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Remember</div>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-blue-600 mb-1">{paperStats.bloomsCounts.Understand}</div>
                        <div className="text-xs font-bold text-blue-700 uppercase">Understand</div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-green-600 mb-1">{paperStats.bloomsCounts.Apply}</div>
                        <div className="text-xs font-bold text-green-700 uppercase">Apply</div>
                      </div>
                      <div className="bg-yellow-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-yellow-600 mb-1">{paperStats.bloomsCounts.Analyze}</div>
                        <div className="text-xs font-bold text-yellow-700 uppercase">Analyze</div>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-orange-600 mb-1">{paperStats.bloomsCounts.Evaluate}</div>
                        <div className="text-xs font-bold text-orange-700 uppercase">Evaluate</div>
                      </div>
                      <div className="bg-red-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-red-600 mb-1">{paperStats.bloomsCounts.Create}</div>
                        <div className="text-xs font-bold text-red-700 uppercase">Create</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 3: Topic Distribution */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-200">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <BarChart3 size={20} className="text-slate-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Topic Distribution</h3>
                      <p className="text-xs text-slate-500">Top {paperStats.topTopics.length} most covered topics</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-indigo-600">{paperStats.topTopics.length}</div>
                      <div className="text-xs text-slate-500 font-medium">Top Topics</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {paperStats.topTopics.map(([topic, count], idx) => {
                      const percentage = Math.round((count / questions.length) * 100);
                      const colors = [
                        'from-blue-500 to-blue-600',
                        'from-purple-500 to-purple-600',
                        'from-indigo-500 to-indigo-600',
                        'from-violet-500 to-violet-600',
                        'from-pink-500 to-pink-600',
                        'from-rose-500 to-rose-600',
                        'from-orange-500 to-orange-600',
                        'from-amber-500 to-amber-600',
                      ];
                      const gradientClass = colors[idx % colors.length];

                      return (
                        <div key={topic} className="bg-slate-50 rounded-xl p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-md`}>
                              <span className="text-white font-black text-lg">{count}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-slate-400 uppercase">Coverage</div>
                              <div className="text-lg font-black text-slate-700">{percentage}%</div>
                            </div>
                          </div>
                          <div className="mb-2">
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`bg-gradient-to-r ${gradientClass} h-full rounded-full transition-all`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 truncate" title={topic}>
                            {topic}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">{count} question{count !== 1 ? 's' : ''}</p>
                        </div>
                      );
                    })}
                  </div>

                  {paperStats.topTopics.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-sm">No topics available yet. Generate questions to see topic distribution.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {filteredQuestions.length > 0 ? (
              filteredQuestions.map((q) => {
                const selectedAnswer = userAnswers.get(q.id);
                const validatedAnswer = validatedAnswers.get(q.id);
                const hasValidated = validatedAnswer !== undefined;
                const isCorrect = hasValidated && validatedAnswer === q.correctOptionIndex;
                const hasSelected = selectedAnswer !== undefined;

                return (
                  <div key={q.id}
                    className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all duration-300"
                  >
                    {/* Card Header - Clean & Organized */}
                    <div className="px-6 py-5 bg-gradient-to-br from-slate-50 to-white border-b-2 border-slate-100">
                      {/* Top Row - Question ID & Actions */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          {/* Question Number */}
                          {(() => {
                            const qNumMatch = q.id?.match(/Q(\d+)/i);
                            const qNum = qNumMatch ? qNumMatch[1] : null;
                            return qNum ? (
                              <div className="flex items-center gap-3">
                                <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                                  <div className="text-center">
                                    <div className="text-xs font-bold text-slate-400">Q</div>
                                    <div className="text-2xl font-black leading-none">{qNum}</div>
                                  </div>
                                </div>
                                <div className="h-10 w-px bg-slate-300"></div>
                              </div>
                            ) : null;
                          })()}

                          {/* Domain & Topic */}
                          {q.domain && (
                            <div>
                              <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wider">
                                {q.domain}
                              </span>
                              <p className="text-sm font-medium text-slate-500 mt-2">{q.topic}</p>
                            </div>
                          )}
                        </div>

                        {/* Save & Delete Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSave(q.id)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              savedIds.has(q.id)
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                            }`}
                            title={savedIds.has(q.id) ? "Saved" : "Save"}
                          >
                            <BookmarkPlus size={16} fill={savedIds.has(q.id) ? "currentColor" : "none"} />
                          </button>
                          <button
                            onClick={() => handleTrash(q.id)}
                            className="w-8 h-8 bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 rounded-lg flex items-center justify-center transition-all"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row - All Tags */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
                          {q.year}
                        </span>

                        <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                          q.diff === 'Hard' ? 'bg-rose-100 text-rose-700' :
                          q.diff === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {q.diff}
                        </span>

                        <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">
                          {q.marks} Mark{parseInt(q.marks) > 1 ? 's' : ''}
                        </span>

                        {q.pedagogy && (
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 ${getPedagogyColor(q.pedagogy)}`}>
                            <Brain size={13} />
                            {q.pedagogy}
                          </span>
                        )}

                        {q.bloomsTaxonomy && (
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${getBloomsColor(q.bloomsTaxonomy)}`}>
                            {q.bloomsTaxonomy}
                          </span>
                        )}

                        {q.relevanceScore && (
                          <span className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg flex items-center gap-1.5">
                            <Target size={13} />
                            {q.relevanceScore}% Match
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Body */}
                    <div className="px-5 py-6">
                      <div className="text-xl font-bold text-slate-900 leading-relaxed mb-6">
                        <RenderWithMath text={q.text} showOptions={false} />
                      </div>

                      {/* MCQ Options - 2 per row */}
                      {q.options && q.options.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {q.options.map((option, idx) => {
                            const isThisCorrect = q.correctOptionIndex === idx;
                            const isSelected = selectedAnswer === idx;
                            const isValidatedCorrect = hasValidated && validatedAnswer === idx && isThisCorrect;
                            const isValidatedWrong = hasValidated && validatedAnswer === idx && !isThisCorrect;
                            const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D

                            let bgColor = 'bg-white';
                            let shadowClass = 'shadow-sm';
                            let ringClass = '';

                            // Before validation - show selection with blue ring
                            if (isSelected && !hasValidated) {
                              bgColor = 'bg-blue-50';
                              shadowClass = 'shadow-md';
                              ringClass = 'ring-2 ring-blue-500';
                            }

                            // After validation - show correct/incorrect with subtle styling
                            if (hasValidated) {
                              if (isThisCorrect) {
                                bgColor = 'bg-emerald-50';
                                shadowClass = 'shadow-md';
                                ringClass = 'ring-2 ring-emerald-400';
                              } else if (isValidatedWrong) {
                                bgColor = 'bg-rose-50';
                                shadowClass = 'shadow-md';
                                ringClass = 'ring-2 ring-rose-400';
                              }
                            }

                            return (
                              <button
                                key={idx}
                                onClick={() => !hasValidated && handleAnswerSelect(q.id, idx)}
                                disabled={hasValidated}
                                className={`relative flex items-start gap-3.5 px-5 py-4 rounded-2xl border border-slate-200 transition-all text-left ${bgColor} ${shadowClass} ${ringClass} ${!hasValidated ? 'cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-slate-300 active:scale-[0.99]' : 'cursor-default'}`}
                              >
                                {/* Option Label */}
                                <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg transition-all ${
                                  isValidatedCorrect
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : isValidatedWrong
                                    ? 'bg-rose-500 text-white shadow-md'
                                    : isSelected && !hasValidated
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {optionLabel}
                                </div>

                                {/* Option Text */}
                                <div className="flex-1 text-base font-medium text-slate-800 pt-2">
                                  <RenderWithMath text={option} showOptions={false} />
                                </div>

                                {/* Floating Checkmark for Correct Answer */}
                                {isValidatedCorrect && (
                                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                                    <CheckCircle size={18} className="text-white" strokeWidth={3} />
                                  </div>
                                )}

                                {/* X mark for Wrong Answer */}
                                {isValidatedWrong && (
                                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                                    <XCircle size={18} className="text-white" strokeWidth={3} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        // Fallback for old questions without options
                        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="text-amber-600" size={16} />
                            <h4 className="text-xs font-bold text-amber-900">Legacy Question</h4>
                          </div>
                          <p className="text-xs text-slate-600">
                            Generate new questions to get MCQ options and AI insights.
                          </p>
                        </div>
                      )}


                      {/* Visual Element - Compact */}
                      {((q.hasVisualElement && q.visualElementDescription) || (q.extractedImages && q.extractedImages.length > 0)) && (
                        <div className="mb-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                <Eye size={14} className="text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-[10px] font-bold text-blue-900 uppercase mb-1">Visual Element</h4>
                                {q.visualElementDescription && (
                                  <div className="text-xs font-medium text-slate-700 mb-2">
                                    <RenderWithMath text={q.visualElementDescription} showOptions={false} />
                                  </div>
                                )}
                                {q.extractedImages && q.extractedImages.length > 0 && (
                                  <div className="grid grid-cols-1 gap-2 mt-2">
                                    {q.extractedImages.map((imgData, idx) => (
                                      <div key={idx} className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                                        <img
                                          src={imgData}
                                          alt={`Visual ${idx + 1}`}
                                          className="w-full h-auto object-contain max-h-[300px]"
                                          style={{
                                            imageRendering: 'high-quality',
                                            objectFit: 'contain'
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer - Action Buttons */}
                    <div className="px-6 py-5 bg-gradient-to-br from-slate-50 to-white border-t-2 border-slate-100">
                      <div className="flex items-center justify-center gap-3">
                        {/* Evaluate Answer Button (before validation) - Academic Style */}
                        {hasSelected && !hasValidated && (
                          <button
                            onClick={() => handleValidateAnswer(q.id)}
                            className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-amber-600 hover:to-orange-700 transition-all"
                            title="Get Answer Evaluated"
                          >
                            <Award size={20} />
                            <span className="text-sm font-bold">Get Evaluated</span>
                          </button>
                        )}

                        {/* Action Icons (after validation) */}
                        {hasValidated && (
                          <>
                            <button
                              onClick={() => openModal('solution', q.id)}
                              className="flex items-center gap-2.5 px-5 py-3 bg-slate-700 text-white rounded-xl shadow-md hover:shadow-lg hover:bg-slate-800 transition-all"
                              title="View Solution"
                            >
                              <Eye size={18} />
                              <span className="text-sm font-bold">Solution</span>
                            </button>
                            <button
                              onClick={() => openModal('insights', q.id)}
                              className="flex items-center gap-2.5 px-5 py-3 bg-slate-700 text-white rounded-xl shadow-md hover:shadow-lg hover:bg-slate-800 transition-all"
                              title="AI Insights"
                            >
                              <Lightbulb size={18} />
                              <span className="text-sm font-bold">Insights</span>
                            </button>
                          </>
                        )}

                        {/* Empty state message */}
                        {!hasSelected && !hasValidated && (
                          <p className="text-sm text-slate-400 italic font-medium">Select an option to get it evaluated</p>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center rounded-3xl border-4 border-dashed border-slate-200 bg-white">
                <div className="w-24 h-24 bg-slate-50 border-2 border-slate-100 rounded-3xl flex items-center justify-center mb-6 text-slate-200">
                  <FileQuestion size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 font-outfit uppercase tracking-tighter">No Questions Yet</h2>
                <p className="text-sm text-slate-500 font-bold max-w-md leading-relaxed">
                  Click "Generate Questions" to create AI-powered questions based on exam patterns.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modern Modal for Solution & Insights */}
      {modalType && activeModalQuestionId && (() => {
        const activeQuestion = questions.find(q => q.id === activeModalQuestionId);
        if (!activeQuestion) return null;

        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
              onClick={closeModal}
            />

            {/* Modal Panel - Slide in from right */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-5 border-b-4 border-primary-500 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Question Reference Badge */}
                    {(() => {
                      const qNumMatch = activeQuestion.id?.match(/Q(\d+)/i);
                      const qNum = qNumMatch ? qNumMatch[1] : null;
                      return qNum ? (
                        <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-600">
                          <div className="text-center">
                            <div className="text-xs font-bold text-slate-400">Q</div>
                            <div className="text-lg font-black text-white leading-none">{qNum}</div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        {modalType === 'solution' ? (
                          <PenTool size={20} className="text-primary-400" />
                        ) : (
                          <Lightbulb size={20} className="text-primary-400" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-black">
                          {modalType === 'solution' ? 'Solution Steps' : 'AI Insights'}
                        </h2>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {activeQuestion.topic} • {activeQuestion.domain}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {modalType === 'solution' && activeQuestion.markingScheme && activeQuestion.markingScheme.length > 0 ? (
                  <div className="space-y-5">
                    {/* Solution Steps */}
                    <div className="space-y-3">
                      {activeQuestion.markingScheme.map((item, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-7 h-7 bg-slate-800 text-white rounded-md flex items-center justify-center font-bold text-xs">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                  {item.mark} Mark{parseInt(item.mark) > 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="text-sm text-slate-700 leading-relaxed">
                                <RenderWithMath text={item.step} showOptions={false} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Extracted Images - Fit to Available Space */}
                    {activeQuestion.extractedImages && activeQuestion.extractedImages.length > 0 && (
                      <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                            Reference Diagrams ({activeQuestion.extractedImages.length})
                          </h4>
                        </div>
                        <div className="space-y-4">
                          {activeQuestion.extractedImages.map((imgData, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                              <img
                                src={imgData}
                                alt={`Diagram ${idx + 1}${activeQuestion.visualElementDescription ? ` - ${activeQuestion.visualElementDescription}` : ''}`}
                                className="w-full h-auto object-contain max-h-[500px] bg-white"
                                style={{
                                  imageRendering: 'high-quality',
                                  objectFit: 'contain'
                                }}
                              />
                              {activeQuestion.visualElementDescription && idx === 0 && (
                                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                                  <p className="text-xs text-slate-600">
                                    <RenderWithMath text={activeQuestion.visualElementDescription} showOptions={false} serif={false} />
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : modalType === 'insights' ? (
                  <div className="space-y-5">
                    {/* AI Reasoning - Professional Section */}
                    {activeQuestion.aiReasoning && (
                      <div className="bg-white border-2 border-slate-300 rounded-lg p-5 shadow-sm">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                            <BarChart3 size={18} className="text-slate-700" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">Why This Question Matters</h3>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {activeQuestion.aiReasoning}
                            </p>
                          </div>
                        </div>

                        {/* Historical & Predictive */}
                        {(activeQuestion.historicalPattern || activeQuestion.predictiveInsight) && (
                          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200">
                            {activeQuestion.historicalPattern && (
                              <div className="bg-slate-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Clock size={14} className="text-slate-600" />
                                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Historical</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">{activeQuestion.historicalPattern}</p>
                              </div>
                            )}
                            {activeQuestion.predictiveInsight && (
                              <div className="bg-slate-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <TrendingUp size={14} className="text-slate-600" />
                                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Predictive</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">{activeQuestion.predictiveInsight}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key Concepts - Professional List with Explanations */}
                    {activeQuestion.keyConcepts && activeQuestion.keyConcepts.length > 0 && (
                      <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <BookOpen size={18} className="text-slate-700" />
                          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Key Concepts</h4>
                        </div>
                        <div className="space-y-3">
                          {activeQuestion.keyConcepts.map((concept, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-lg p-3 border-l-4 border-slate-400">
                              <h5 className="text-sm font-bold text-slate-800 mb-1.5">
                                {typeof concept === 'string' ? concept : concept.name}
                              </h5>
                              {typeof concept !== 'string' && concept.explanation && (
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {concept.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Things to Remember - Professional List */}
                    {activeQuestion.thingsToRemember && activeQuestion.thingsToRemember.length > 0 && (
                      <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Brain size={18} className="text-slate-700" />
                          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Things to Remember</h4>
                        </div>
                        <ul className="space-y-2">
                          {activeQuestion.thingsToRemember.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                              <div className="w-5 h-5 bg-slate-700 text-white rounded flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                                {idx + 1}
                              </div>
                              <span className="leading-relaxed">
                                <RenderWithMath text={item} showOptions={false} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Study Tip - Professional */}
                    {activeQuestion.studyTip && (
                      <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                            <Zap size={18} className="text-slate-700" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">Study Strategy</h4>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {activeQuestion.studyTip}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Common Mistakes - Professional with Detailed Explanations */}
                    {activeQuestion.commonMistakes && activeQuestion.commonMistakes.length > 0 && (
                      <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertCircle size={18} className="text-slate-700" />
                          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Common Mistakes to Avoid</h4>
                        </div>
                        <div className="space-y-4">
                          {activeQuestion.commonMistakes.map((mistakeObj, idx) => {
                            const mistake = typeof mistakeObj === 'string' ? mistakeObj : mistakeObj.mistake;
                            const why = typeof mistakeObj !== 'string' ? mistakeObj.why : undefined;
                            const howToAvoid = typeof mistakeObj !== 'string' ? mistakeObj.howToAvoid : undefined;

                            return (
                              <div key={idx} className="bg-slate-50 rounded-lg p-4 border-l-4 border-slate-400">
                                <div className="flex items-start gap-2.5 mb-2">
                                  <div className="w-6 h-6 bg-slate-700 text-white rounded flex items-center justify-center shrink-0 text-xs font-bold">
                                    {idx + 1}
                                  </div>
                                  <h5 className="text-sm font-bold text-slate-800">{mistake}</h5>
                                </div>
                                {why && (
                                  <div className="ml-8 mb-2">
                                    <p className="text-xs font-semibold text-slate-600 mb-1">Why this happens:</p>
                                    <p className="text-xs text-slate-600 leading-relaxed">{why}</p>
                                  </div>
                                )}
                                {howToAvoid && (
                                  <div className="ml-8">
                                    <p className="text-xs font-semibold text-slate-600 mb-1">How to avoid:</p>
                                    <p className="text-xs text-slate-600 leading-relaxed">{howToAvoid}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fallback for old questions */}
                    {!activeQuestion.aiReasoning && !activeQuestion.keyConcepts && !activeQuestion.studyTip && !activeQuestion.commonMistakes && (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-center">
                        <AlertCircle size={32} className="text-amber-600 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-amber-900 mb-2">No Insights Available</h4>
                        <p className="text-xs text-slate-600">
                          This is a legacy question. Generate new questions to get AI-powered insights.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <AlertCircle size={48} className="mx-auto mb-3" />
                    <p>No content available</p>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default VisualQuestionBank;
