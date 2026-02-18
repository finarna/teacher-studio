import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Zap,
  Brain,
  CreditCard,
  TrendingUp,
  Target,
  Clock,
  CheckCircle2,
  Play,
  FileQuestion,
  Sparkles,
  BarChart3,
  Calendar,
  BookmarkPlus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Lightbulb,
  RefreshCw,
  Loader2,
  Award,
  Trophy,
  History,
  X
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { safeAiParse } from '../utils/aiParser';
import type { TopicResource, Subject, ExamContext, AnalyzedQuestion } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from './AuthProvider';
import { RenderWithMath } from './MathRenderer';
import PracticeSolutionModal from './PracticeSolutionModal';
import PracticeInsightsModal from './PracticeInsightsModal';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { supabase } from '../lib/supabase';
import { cache } from '../utils/cache';

interface TopicDetailPageProps {
  topicResource: TopicResource;
  subject: Subject;
  examContext: ExamContext;
  onBack: () => void;
  onStartQuiz: (topicId: string) => void;
}

type TabType = 'learn' | 'practice' | 'quiz' | 'flashcards' | 'progress';

const TopicDetailPage: React.FC<TopicDetailPageProps> = ({
  topicResource,
  subject,
  examContext,
  onBack,
  onStartQuiz
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('learn');
  const [totalQuestionsIncludingAI, setTotalQuestionsIncludingAI] = useState(topicResource.totalQuestions);
  const subjectConfig = SUBJECT_CONFIGS[subject];

  // Shared questions state that persists across tab switches
  const [sharedQuestions, setSharedQuestions] = useState<any[]>([]);

  const tabs = [
    { id: 'learn' as TabType, label: 'Learn', icon: BookOpen, description: 'Study notes & concepts' },
    { id: 'practice' as TabType, label: 'Practice', icon: Zap, description: 'Solve questions' },
    { id: 'quiz' as TabType, label: 'Quiz', icon: Brain, description: 'Test yourself' },
    { id: 'flashcards' as TabType, label: 'Flashcards', icon: CreditCard, description: 'Quick revision' },
    { id: 'progress' as TabType, label: 'Progress', icon: TrendingUp, description: 'Track analytics' }
  ];

  const getMasteryColor = (mastery: number): string => {
    if (mastery >= 85) return 'emerald';
    if (mastery >= 70) return 'lime';
    if (mastery >= 50) return 'yellow';
    if (mastery >= 30) return 'orange';
    return 'red';
  };

  const masteryColor = getMasteryColor(topicResource.masteryLevel);

  return (
    <div className="bg-slate-50/50 font-instrument text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft size={20} />
              <span className="text-xs font-black uppercase tracking-wider">Topics</span>
            </button>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              {topicResource.topicName}
            </span>
          </div>

          {/* Premium Topic Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4 flex-1 group">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
                  style={{ background: `linear-gradient(135deg, ${subjectConfig.color} 0%, ${subjectConfig.colorDark} 100%)` }}
                >
                  <span className="text-3xl transition-all duration-500 group-hover:scale-110">{subjectConfig.iconEmoji}</span>
                </div>
                {/* Glow effect */}
                <div
                  className="absolute top-0 left-0 w-16 h-16 rounded-xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500"
                  style={{ background: `linear-gradient(135deg, ${subjectConfig.color} 0%, ${subjectConfig.colorDark} 100%)` }}
                />
              </div>
              <div>
                <h1 className="font-black text-2xl tracking-tight text-slate-900">
                  {topicResource.topicName}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-medium text-slate-500">
                    {subject} • {examContext}
                  </span>
                  <div className={`px-2.5 py-1 bg-${masteryColor}-100 text-${masteryColor}-700 rounded-lg text-xs font-black uppercase tracking-wider`}>
                    <span>{topicResource.masteryLevel}</span><span className="text-[10px]">%</span> Mastery
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Quick Stats */}
            <div className="flex items-center gap-3">
              <div className="text-center group cursor-pointer">
                <div className="text-2xl font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">{totalQuestionsIncludingAI}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Questions</div>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="text-center group cursor-pointer">
                <div className="text-2xl font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">{topicResource.sketchPages?.length || 0}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Visual Notes</div>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="text-center group cursor-pointer">
                <div className="text-2xl font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">
                  <span>{topicResource.averageAccuracy.toFixed(0)}</span><span className="text-lg">%</span>
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Accuracy</div>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="text-center group cursor-pointer">
                <div className="text-2xl font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-600">{topicResource.quizzesTaken}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quizzes</div>
              </div>
            </div>
          </div>

          {/* Premium Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-white text-slate-600 hover:bg-purple-50 hover:text-purple-600 border-2 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <Icon size={16} className={`transition-all duration-300 ${isActive ? '' : 'group-hover:scale-110 group-hover:rotate-6'}`} />
                  <div className="text-left">
                    <div className="text-xs font-black uppercase tracking-wider">{tab.label}</div>
                    {!isActive && (
                      <div className="text-[10px] font-medium opacity-70">{tab.description}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'learn' && <LearnTab topicResource={topicResource} subject={subject} examContext={examContext} />}
        {activeTab === 'practice' && (
          <PracticeTab
            topicResource={topicResource}
            subject={subject}
            examContext={examContext}
            onQuestionCountChange={setTotalQuestionsIncludingAI}
            sharedQuestions={sharedQuestions}
            setSharedQuestions={setSharedQuestions}
          />
        )}
        {activeTab === 'quiz' && (
          <QuizTab
            topicResource={topicResource}
            subject={subject}
            examContext={examContext}
            sharedQuestions={sharedQuestions}
            setSharedQuestions={setSharedQuestions}
          />
        )}
        {activeTab === 'flashcards' && (
          <FlashcardsTab
            topicResource={topicResource}
            sharedQuestions={sharedQuestions}
          />
        )}
        {activeTab === 'progress' && <ProgressTab topicResource={topicResource} />}
      </div>
    </div>
  );
};

// ========== TAB 1: LEARN ==========
const LearnTab: React.FC<{
  topicResource: TopicResource;
  subject: Subject;
  examContext: ExamContext;
}> = ({ topicResource, subject, examContext }) => {
  const { user } = useAuth();
  const [visualSketches, setVisualSketches] = useState<Array<{ questionId: string; sketchSvg: string; questionText: string; }>>([]);
  const [loadingSketches, setLoadingSketches] = useState(true);

  // Sketch viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentSketchIndex, setCurrentSketchIndex] = useState(0);
  const [completedSketches, setCompletedSketches] = useState<Set<string>>(new Set());
  const [sketchStartTime, setSketchStartTime] = useState<number | null>(null);
  const [totalDurations, setTotalDurations] = useState<Map<string, number>>(new Map());

  // Load visual sketch notes for this topic from user's scans
  useEffect(() => {
    const loadVisualSketches = async () => {
      if (!user) {
        setLoadingSketches(false);
        return;
      }

      try {
        // Fetch all user's scans for this subject and examContext
        const { data: scans, error } = await supabase
          .from('scans')
          .select('id, name, analysis_data')
          .eq('user_id', user.id)
          .eq('subject', subject)
          .eq('exam_context', examContext)
          .eq('status', 'Complete');

        if (error) {
          console.error('❌ Failed to load scans:', error);
          setLoadingSketches(false);
          return;
        }

        if (!scans || scans.length === 0) {
          setLoadingSketches(false);
          return;
        }

        // Extract visual sketches from all scans matching this topic
        const sketches: Array<{ questionId: string; sketchSvg: string; questionText: string }> = [];

        for (const scan of scans) {
          // 1. Check for topic-based sketches (from Sketch Gallery)
          if (scan.analysis_data?.topicBasedSketches) {
            const topicBasedSketches = scan.analysis_data.topicBasedSketches;

            // Look for exact topic match or partial match
            for (const [topicKey, topicSketch] of Object.entries(topicBasedSketches)) {
              const isExactMatch = topicKey === topicResource.topicName;
              const isPartialMatch = topicKey.includes(topicResource.topicName) || topicResource.topicName.includes(topicKey);

              if (isExactMatch || isPartialMatch) {

                // Topic-based sketches have multiple pages
                if (topicSketch && typeof topicSketch === 'object' && 'pages' in topicSketch) {
                  const pages = topicSketch.pages || [];

                  pages.forEach((page: any, idx: number) => {
                    // Topic-based sketches use 'imageData' not 'imageUrl'
                    const imageData = page.imageData || page.imageUrl;
                    if (imageData) {
                      sketches.push({
                        questionId: `${scan.id}-topic-${topicKey}-page-${idx}`,
                        sketchSvg: imageData,
                        questionText: page.title || `${topicKey} - Page ${idx + 1}`
                      });
                    }
                  });
                }
              }
            }
          }

          // 2. Check for per-question sketches
          if (scan.analysis_data?.questions) {
            for (const question of scan.analysis_data.questions) {
              // Match topic (exact or partial match for sub-topics)
              if (question.topic === topicResource.topicName ||
                  question.topic?.includes(topicResource.topicName) ||
                  topicResource.topicName?.includes(question.topic)) {

                // Check if this question has a visual sketch (database uses sketch_svg_url)
                const sketchData = question.sketch_svg_url || question.sketchSvg || question.diagram_url || question.diagramUrl;
                if (sketchData) {
                  sketches.push({
                    questionId: question.id,
                    sketchSvg: sketchData,
                    questionText: question.text?.substring(0, 100) || 'Question'
                  });
                }
              }
            }
          }
        }

        setVisualSketches(sketches);
      } catch (err) {
        console.error('❌ Error loading visual sketches:', err);
      } finally {
        setLoadingSketches(false);
      }
    };

    loadVisualSketches();
  }, [user, subject, examContext, topicResource.topicName]);

  // Track time spent on current sketch
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (viewerOpen && sketchStartTime && visualSketches[currentSketchIndex]) {
      interval = setInterval(() => {
        const currentSketch = visualSketches[currentSketchIndex];
        const elapsed = Math.floor((Date.now() - sketchStartTime) / 1000);

        setTotalDurations(prev => {
          const newMap = new Map(prev);
          const existingDuration = newMap.get(currentSketch.questionId) || 0;
          newMap.set(currentSketch.questionId, existingDuration + 1);
          return newMap;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [viewerOpen, sketchStartTime, currentSketchIndex, visualSketches]);

  // Load saved progress from database
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (!user || visualSketches.length === 0) return;

      try {
        const sketchIds = visualSketches.map(s => s.questionId);

        const { data, error } = await supabase
          .from('sketch_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('topic_name', topicResource.topicName)
          .eq('subject', subject)
          .eq('exam_context', examContext)
          .in('sketch_id', sketchIds);

        if (error) {
          console.error('Failed to load sketch progress:', error);
          return;
        }

        if (data && data.length > 0) {
          // Load completed sketches
          const completed = new Set<string>();
          const durations = new Map<string, number>();

          data.forEach(record => {
            if (record.completed) {
              completed.add(record.sketch_id);
            }
            durations.set(record.sketch_id, record.duration_seconds || 0);
          });

          setCompletedSketches(completed);
          setTotalDurations(durations);

          console.log(`📊 [SKETCH PROGRESS] Loaded ${completed.size} completed, ${data.length} total records`);
        }
      } catch (err) {
        console.error('Error loading sketch progress:', err);
      }
    };

    loadSavedProgress();
  }, [user, visualSketches, topicResource.topicName, subject, examContext]);

  const openViewer = (index: number) => {
    setCurrentSketchIndex(index);
    setViewerOpen(true);
    setSketchStartTime(Date.now());
  };

  const closeViewer = async () => {
    // Save final duration before closing
    if (sketchStartTime && visualSketches[currentSketchIndex]) {
      await saveSketchProgress();
    }
    setViewerOpen(false);
    setSketchStartTime(null);
  };

  const goToNextSketch = async () => {
    if (currentSketchIndex < visualSketches.length - 1) {
      // Save current sketch progress
      await saveSketchProgress();

      setCurrentSketchIndex(currentSketchIndex + 1);
      setSketchStartTime(Date.now());
    }
  };

  const goToPrevSketch = async () => {
    if (currentSketchIndex > 0) {
      // Save current sketch progress
      await saveSketchProgress();

      setCurrentSketchIndex(currentSketchIndex - 1);
      setSketchStartTime(Date.now());
    }
  };

  const markAsCompleted = async () => {
    const currentSketch = visualSketches[currentSketchIndex];
    const newCompleted = new Set(completedSketches);
    newCompleted.add(currentSketch.questionId);
    setCompletedSketches(newCompleted);

    // Save to database
    await saveSketchProgress(true);
  };

  const saveSketchProgress = async (markCompleted = false) => {
    if (!user || !visualSketches[currentSketchIndex]) return;

    const currentSketch = visualSketches[currentSketchIndex];
    const duration = totalDurations.get(currentSketch.questionId) || 0;

    try {
      const { error } = await supabase
        .from('sketch_progress')
        .upsert({
          user_id: user.id,
          sketch_id: currentSketch.questionId,
          topic_name: topicResource.topicName,
          subject: subject,
          exam_context: examContext,
          duration_seconds: duration,
          completed: markCompleted || completedSketches.has(currentSketch.questionId),
          last_viewed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,sketch_id'
        });

      if (error) {
        console.error('Failed to save sketch progress:', error);
      }
    } catch (err) {
      console.error('Error saving sketch progress:', err);
    }
  };

  const [showInsights, setShowInsights] = useState(false);

  return (
    <div className="space-y-4">
      {/* Compact AI Study Guide Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-white/80 uppercase tracking-wider">AI Study Guide</div>
            <div className="text-sm font-black">Recommended: 45-60 min study time</div>
          </div>
        </div>
        {topicResource.chapterInsights && topicResource.chapterInsights.length > 0 && (
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-black flex items-center gap-2 transition-all backdrop-blur-sm"
          >
            {showInsights ? 'Hide' : 'View'} Key Concepts
            {showInsights ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Collapsible Chapter Insights */}
      {showInsights && topicResource.chapterInsights && topicResource.chapterInsights.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <h2 className="font-black text-base text-slate-900 mb-4 flex items-center gap-2">
            <Lightbulb size={18} className="text-amber-500" />
            Key Concepts
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {topicResource.chapterInsights.map((insight, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="font-black text-sm text-slate-800 mb-2">{insight.topic}</h3>
                <p className="text-xs text-slate-600 font-medium mb-3 line-clamp-2">{insight.description}</p>

                {/* Key Concepts */}
                {insight.keyConcepts && insight.keyConcepts.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Core Concepts
                    </div>
                    <ul className="space-y-1">
                      {insight.keyConcepts.slice(0, 3).map((concept, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs">
                          <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-700 font-medium line-clamp-2">{concept}</span>
                        </li>
                      ))}
                      {insight.keyConcepts.length > 3 && (
                        <li className="text-[10px] text-slate-500 font-bold ml-5">
                          +{insight.keyConcepts.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Important Formulas */}
                {insight.importantFormulas && insight.importantFormulas.length > 0 && (
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Key Formulas
                    </div>
                    <div className="space-y-1">
                      {insight.importantFormulas.slice(0, 2).map((formula, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded p-2">
                          <code className="text-[11px] font-mono text-slate-900">{formula}</code>
                        </div>
                      ))}
                      {insight.importantFormulas.length > 2 && (
                        <div className="text-[10px] text-slate-500 font-bold">
                          +{insight.importantFormulas.length - 2} more formulas
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Sketch Notes - Compact */}
      {loadingSketches ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-600 font-medium">Loading sketches...</p>
        </div>
      ) : visualSketches.length > 0 ? (
        <div>
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Eye size={16} className="text-white" />
              </div>
              <div>
                <h2 className="font-black text-base text-slate-900">Visual Sketches</h2>
                <p className="text-[10px] text-slate-500 font-medium">
                  {visualSketches.length} AI-generated notes • {completedSketches.size} completed
                </p>
              </div>
            </div>
          </div>

          {/* Compact Sketch Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visualSketches.map((sketch, idx) => {
              const isCompleted = completedSketches.has(sketch.questionId);
              const duration = totalDurations.get(sketch.questionId) || 0;

              return (
              <div
                key={sketch.questionId}
                onClick={() => openViewer(idx)}
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-blue-300 hover:scale-[1.02] transition-all duration-200 cursor-pointer relative"
              >
                {/* Completion Badge */}
                {isCompleted && (
                  <div className="absolute top-2 right-2 z-10 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                    <CheckCircle size={14} />
                  </div>
                )}

                {/* Sketch Image */}
                <div className="bg-slate-50 p-3 aspect-video flex items-center justify-center overflow-hidden">
                  {sketch.sketchSvg.startsWith('data:image') ? (
                    <img
                      src={sketch.sketchSvg}
                      alt={sketch.questionText}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div
                      dangerouslySetInnerHTML={{ __html: sketch.sketchSvg }}
                      className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                    />
                  )}
                </div>

                {/* Compact Footer */}
                <div className="p-3 bg-white border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                      Sketch {idx + 1}
                    </span>
                    {duration > 0 && (
                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock size={10} />
                        {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-snug line-clamp-2 mb-2">
                    {sketch.questionText}
                  </p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-bold">From scan</span>
                    <span className="text-blue-600 font-black flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      View <Eye size={10} />
                    </span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Empty State - Compact */}
      {!loadingSketches &&
       (!topicResource.chapterInsights || topicResource.chapterInsights.length === 0) &&
       (!topicResource.sketchPages || topicResource.sketchPages.length === 0) &&
       visualSketches.length === 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-dashed border-slate-300 rounded-xl p-8 text-center">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
            <BookOpen size={24} className="text-slate-400" />
          </div>
          <h3 className="font-black text-base text-slate-900 mb-1">No Study Materials</h3>
          <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">
            Scan your first exam paper to generate personalized visual sketches and study notes.
          </p>
        </div>
      )}

      {/* Sketch Player Modal */}
      {viewerOpen && visualSketches.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 font-instrument">
          <div className="w-full max-w-7xl h-[96vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-400" />
                  <h2 className="text-sm font-black uppercase tracking-wider truncate max-w-md">
                    {visualSketches[currentSketchIndex].questionText.split(' - ')[0] || 'Solved Examples'}
                  </h2>
                </div>
                <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full">
                  {currentSketchIndex + 1} of {visualSketches.length}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Duration Display */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
                  <Clock size={14} className="text-blue-400" />
                  <span className="text-xs font-bold tabular-nums">
                    {Math.floor((totalDurations.get(visualSketches[currentSketchIndex].questionId) || 0) / 60)}:
                    {String((totalDurations.get(visualSketches[currentSketchIndex].questionId) || 0) % 60).padStart(2, '0')}
                  </span>
                </div>

                {/* Mark Complete Button */}
                {!completedSketches.has(visualSketches[currentSketchIndex].questionId) ? (
                  <button
                    onClick={markAsCompleted}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-black flex items-center gap-2 transition-all shadow-lg hover:shadow-green-600/50"
                  >
                    <CheckCircle size={14} />
                    Mark Complete
                  </button>
                ) : (
                  <div className="px-4 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-black flex items-center gap-2">
                    <CheckCircle size={14} />
                    Completed
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={closeViewer}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Close (ESC)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Main Image Area with Navigation - Fixed Height */}
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden min-h-0">
              {/* Previous Button */}
              <button
                onClick={goToPrevSketch}
                disabled={currentSketchIndex === 0}
                className="absolute left-4 z-10 p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl hover:scale-110"
                title="Previous (←)"
              >
                <ChevronLeft size={24} />
              </button>

              {/* Image Container - Proper fit */}
              <div className="w-full h-full flex items-center justify-center px-20 py-4">
                {visualSketches[currentSketchIndex].sketchSvg.startsWith('data:image') ? (
                  <img
                    src={visualSketches[currentSketchIndex].sketchSvg}
                    alt={visualSketches[currentSketchIndex].questionText}
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl shadow-2xl bg-white"
                  />
                ) : (
                  <div
                    dangerouslySetInnerHTML={{ __html: visualSketches[currentSketchIndex].sketchSvg }}
                    className="max-w-full max-h-full w-auto h-auto [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:object-contain [&>svg]:rounded-xl [&>svg]:shadow-2xl [&>svg]:bg-white"
                  />
                )}
              </div>

              {/* Next Button */}
              <button
                onClick={goToNextSketch}
                disabled={currentSketchIndex === visualSketches.length - 1}
                className="absolute right-4 z-10 p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl hover:scale-110"
                title="Next (→)"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Footer - Progress Bar */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Progress
                </div>
                <div className="text-xs font-bold text-slate-500">
                  {completedSketches.size} of {visualSketches.length} completed
                </div>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-2 justify-center">
                {visualSketches.map((sketch, idx) => {
                  const isCompleted = completedSketches.has(sketch.questionId);
                  const isCurrent = idx === currentSketchIndex;

                  return (
                    <button
                      key={sketch.questionId}
                      onClick={() => {
                        saveSketchProgress();
                        setCurrentSketchIndex(idx);
                        setSketchStartTime(Date.now());
                      }}
                      className={`relative transition-all ${
                        isCurrent
                          ? 'w-12 h-3 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/50'
                          : isCompleted
                          ? 'w-3 h-3 bg-green-500 hover:bg-green-600'
                          : 'w-3 h-3 bg-slate-300 hover:bg-slate-400'
                      } rounded-full`}
                      title={`${sketch.questionText.substring(0, 50)}...${isCompleted ? ' ✓' : ''}`}
                    >
                      {isCompleted && !isCurrent && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CheckCircle size={10} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== TAB 2: PRACTICE ==========
const PracticeTab: React.FC<{
  topicResource: TopicResource;
  subject: Subject;
  examContext: ExamContext;
  onQuestionCountChange?: (count: number) => void;
  sharedQuestions: any[];
  setSharedQuestions: React.Dispatch<React.SetStateAction<any[]>>;
}> = ({ topicResource, subject, examContext, onQuestionCountChange, sharedQuestions, setSharedQuestions }) => {
  // Use shared questions state that persists across tab switches
  const [questions, setQuestions] = useState<AnalyzedQuestion[]>(sharedQuestions.length > 0 ? sharedQuestions : (topicResource.questions || []));

  // Persistent practice session hook
  const {
    savedAnswers,
    validatedAnswers,
    bookmarkedIds,
    saveAnswer,
    toggleBookmark,
    startQuestionTimer,
    stopQuestionTimer,
    getSessionStats,
    clearProgress,
    reload: reloadPracticeSession,
    isLoading: sessionLoading
  } = usePracticeSession({
    topicResourceId: topicResource.id,
    topicName: topicResource.topicName,
    subject,
    examContext,
    questions: questions  // Use local state instead of topicResource.questions
  });

  // Local UI state (for immediate feedback before DB save)
  const [userAnswers, setUserAnswers] = useState<Map<string, number>>(new Map());
  const [trashedIds, setTrashedIds] = useState<Set<string>>(new Set());
  const [showStats, setShowStats] = useState(false);

  // Modal state
  const [solutionModalQuestion, setSolutionModalQuestion] = useState<AnalyzedQuestion | null>(null);
  const [insightsModalQuestion, setInsightsModalQuestion] = useState<AnalyzedQuestion | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(5);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

  // Get authenticated user from AuthProvider
  const { user } = useAuth();

  // Load AI-generated questions from database on mount
  useEffect(() => {
    const loadAIGeneratedQuestions = async () => {
      if (!user) return;

      try {
        // Fetch AI-generated questions for this topic from Supabase
        const { data: aiQuestions, error } = await supabase
          .from('questions')
          .select('*')
          .eq('subject', subject)
          .eq('exam_context', examContext)
          .eq('topic', topicResource.topicName)
          .in('scan_id', (await supabase
            .from('scans')
            .select('id')
            .eq('user_id', user.id)
            .filter('metadata->>is_ai_practice_placeholder', 'eq', 'true')
          ).data?.map(s => s.id) || []);

        if (error) {
          console.error('❌ Failed to load AI-generated questions:', error);
          return;
        }

        if (aiQuestions && aiQuestions.length > 0) {
          console.log(`📥 Loaded ${aiQuestions.length} AI-generated questions from database`);

          // Transform database questions to AnalyzedQuestion format
          const formattedAIQuestions: AnalyzedQuestion[] = aiQuestions.map(q => ({
            id: q.id,
            text: q.text,
            options: q.options || [],
            correctOptionIndex: q.correct_option_index,
            marks: q.marks?.toString() || '1',
            difficulty: q.difficulty,
            diff: q.difficulty,
            topic: q.topic,
            domain: q.domain || q.topic,
            bloomsTaxonomy: q.blooms || '',
            pedagogy: q.pedagogy || '',
            year: q.year || '',
            solutionSteps: q.solution_steps || [],
            examTip: q.exam_tip || '',
            visualConcept: q.visual_concept || '',
            keyFormulas: q.key_formulas || [],
            pitfalls: q.pitfalls || [],
            masteryMaterial: q.mastery_material || {},
            hasVisualElement: q.has_visual_element || false,
            visualElementDescription: q.visual_element_description || '',
            extractedImages: [],
            // Extract AI fields from mastery_material JSONB
            keyConcepts: q.mastery_material?.keyConcepts || [],
            aiReasoning: q.mastery_material?.aiReasoning || '',
            historicalPattern: q.mastery_material?.historicalPattern || '',
            predictiveInsight: q.mastery_material?.predictiveInsight || '',
            whyItMatters: q.mastery_material?.whyItMatters || '',
            relevanceScore: q.mastery_material?.relevanceScore || 0,
            commonMistakes: q.pitfalls || [],
            studyTip: q.exam_tip || '',
            thingsToRemember: q.key_formulas || []
          }));

          // Merge with existing questions (avoid duplicates by ID)
          setQuestions(prev => {
            const existingIds = new Set(prev.map(q => q.id));
            const newQuestions = formattedAIQuestions.filter(q => !existingIds.has(q.id));
            const updated = [...prev, ...newQuestions];

            // Update parent component's question count
            if (onQuestionCountChange) {
              onQuestionCountChange(updated.length);
            }

            // Update shared state so QuizTab can access these questions
            setSharedQuestions(updated);

            return updated;
          });
        }
      } catch (err) {
        console.error('❌ Error loading AI-generated questions:', err);
      }
    };

    loadAIGeneratedQuestions();
  }, [user, subject, examContext, topicResource.topicName, onQuestionCountChange]);

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    // Update local state for immediate UI feedback
    setUserAnswers(prev => {
      const next = new Map(prev);
      next.set(questionId, optionIndex);
      return next;
    });

    // Start timer when user first interacts with question
    if (!savedAnswers.has(questionId)) {
      startQuestionTimer(questionId);
    }
  };

  const handleValidateAnswer = async (questionId: string, correctOptionIndex: number) => {
    const selectedAnswer = userAnswers.get(questionId);
    if (selectedAnswer === undefined) return;

    const isCorrect = selectedAnswer === correctOptionIndex;

    // Save to database (persists across sessions)
    await saveAnswer(questionId, selectedAnswer, isCorrect);

    // Stop timer for this question
    stopQuestionTimer(questionId);
  };

  const handleSave = async (id: string) => {
    await toggleBookmark(id);
  };

  const handleTrash = (id: string) => {
    setTrashedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleGenerateQuestions = async () => {
    if (!user) {
      setGenerateError('Please sign in to generate questions');
      return;
    }

    // Clear previous messages
    setGenerateError(null);
    setGenerateSuccess(null);
    setIsGenerating(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;
      if (!apiKey) {
        setGenerateError("API Key Missing. Please check your environment configuration.");
        setIsGenerating(false);
        return;
      }

      // Use NEW @google/genai library
      const ai = new GoogleGenAI({ apiKey });

      // Get model from Settings
      const selectedModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
      const temperature = parseFloat(localStorage.getItem('ai_temperature') || '0.7');

      // Topic-specific context
      const topicContext = `Focus EXCLUSIVELY on topic: "${topicResource.topicName}" for ${subject} ${examContext} exam.`;

      // EXACT PROMPT from VisualQuestionBank (adapted for topic)
      const prompt = `Generate ${generateCount} ${subject} MCQ questions with comprehensive metadata and detailed AI insights.

      ${topicContext}

      CRITICAL REQUIREMENTS:
      1. Each question MUST have exactly 4 options (A, B, C, D) - THIS IS MANDATORY
      2. Mark correctOptionIndex (0-3) for the EXACT correct answer per ${examContext} ${subject} syllabus
      3. All questions must be MCQs with 4 distinct options

      🚨 STRICT CORRECTNESS POLICY FOR CORRECT ANSWER (ZERO TOLERANCE):
      - The correctOptionIndex MUST point to the EXACT correct answer according to ${examContext} official syllabus
      - DO NOT accept "technically close" or "approximately correct" answers
      - DO NOT use answers that are "correct in general" but wrong per ${examContext} standards
      - For ${examContext === 'NEET' ? 'NEET: Follow NCERT textbook standards exactly (taxonomy, nomenclature, formulas)' : ''}
      ${examContext === 'JEE' ? '- For JEE: Use rigorous mathematical notation and exact numerical values per JEE standards' : ''}
      ${examContext === 'KCET' ? '- For KCET: Follow PUC (Pre-University College) Karnataka state board standards' : ''}
      ${examContext === 'CBSE' ? '- For CBSE: Follow NCERT textbooks and CBSE marking scheme exactly' : ''}
      - Only ONE option can be marked as correct - the one that matches ${examContext} examination standards EXACTLY
      - If multiple options seem close, choose the one using ${examContext}-standard notation and conventions
      - The correct answer must give FULL MARKS in ${examContext} examination

      4. Use LaTeX for math: $...$ or $$...$$
      5. CRITICAL: Double backslash for LaTeX: "\\\\frac{1}{2}" not "\\frac{1}{2}"

      6. Include pedagogical metadata:
         - bloomsTaxonomy: Remember|Understand|Apply|Analyze|Evaluate|Create
         - pedagogy: Conceptual|Analytical|Problem-Solving|Application|Critical-Thinking
         - relevanceScore: 0-100 (how relevant to exam patterns)
         - whyItMatters: 1-2 sentence explanation of importance

      7. DETAILED INSIGHTS (make these rich and valuable):
         - keyConcepts: Array of 2-4 objects with name and explanation
         - commonMistakes: Array of 2-3 objects with mistake, why, howToAvoid
         - studyTip: 3-5 sentences of detailed advice
         - thingsToRemember: Array of 3-5 key formulas/rules with LaTeX

      8. AI REASONING fields:
         - aiReasoning: 2-3 sentences explaining importance
         - historicalPattern: Past paper frequency
         - predictiveInsight: Future likelihood

      9. SOLUTION STEPS (CRITICAL - Make these VERY DETAILED):
         - markingScheme: Array of detailed step-by-step solutions
         - Each step should be 2-4 sentences with complete explanations
         - Include WHY each step is performed, not just WHAT
         - Use LaTeX for all mathematical expressions
         - Format: { "step": "Detailed explanation with $$formula$$ and reasoning", "mark": "1" }
         - Example: "First, identify the given data: mass $$m = 2kg$$, velocity $$v = 5m/s$$. We use these values because kinetic energy depends on both mass and velocity according to the formula $$KE = \\\\frac{1}{2}mv^2$$. This is a fundamental relationship from classical mechanics."

      RETURN VALID JSON ONLY.
      Schema: {
        "questions": [{
          "text": "Question text...",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctOptionIndex": 2,
          "marks": "1",
          "year": "2025 Prediction",
          "diff": "Moderate",
          "topic": "${topicResource.topicName}",
          "domain": "${topicResource.topicName}",
          "bloomsTaxonomy": "Apply",
          "pedagogy": "Problem-Solving",
          "relevanceScore": 85,
          "whyItMatters": "This tests...",
          "keyConcepts": [{"name": "Concept", "explanation": "Explanation..."}],
          "commonMistakes": [{"mistake": "Error", "why": "Reason", "howToAvoid": "Solution"}],
          "studyTip": "Detailed tip...",
          "thingsToRemember": ["Formula 1", "Rule 2"],
          "aiReasoning": "Important because...",
          "historicalPattern": "Appeared X times...",
          "predictiveInsight": "Likely to appear...",
          "markingScheme": [
            { "step": "Identify given data and explain what we need to find. State the relevant formula with LaTeX $$formula$$ and explain why this formula applies to this problem.", "mark": "1" },
            { "step": "Substitute the values into the formula, showing each substitution step clearly with LaTeX. Explain what each variable represents and why we use these specific values.", "mark": "1" },
            { "step": "Perform the calculation step-by-step with intermediate results. Show the final answer with correct units and explain the physical meaning of the result.", "mark": "1" }
          ]
        }]
      }`;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: {
          temperature,
          maxOutputTokens: 16384,
          responseMimeType: 'application/json'
        }
      });

      const text = response.text;
      const data = safeAiParse<any>(text, { questions: [] }, true);

      if (!data.questions || data.questions.length === 0) {
        setGenerateError('Failed to generate questions. Please try again.');
        setIsGenerating(false);
        return;
      }

      console.log('✅ Generated', data.questions.length, 'questions');

      // Format questions with proper structure
      const formatted: AnalyzedQuestion[] = data.questions.map((q: any) => ({
        ...q,
        id: crypto.randomUUID(), // Proper UUID
        options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
        correctOptionIndex: q.correctOptionIndex ?? 0,
        bloomsTaxonomy: q.bloomsTaxonomy || 'Understand',
        pedagogy: q.pedagogy || 'Conceptual',
        relevanceScore: q.relevanceScore || 70,
        whyItMatters: q.whyItMatters || 'This question tests core concepts frequently appearing in exams.',
        keyConcepts: q.keyConcepts || [{
          name: q.topic || topicResource.topicName,
          explanation: 'This concept is fundamental to understanding the subject.'
        }],
        commonMistakes: q.commonMistakes || [{
          mistake: 'Calculation errors',
          why: 'Students rush through calculations.',
          howToAvoid: 'Always verify calculations step-by-step.'
        }],
        studyTip: q.studyTip || 'Break down the problem into smaller steps. Understand the theory first, then practice problems.',
        thingsToRemember: q.thingsToRemember || ['Key formula or principle'],
        aiReasoning: q.aiReasoning || `This ${q.topic || topicResource.topicName} question aligns with exam patterns.`,
        historicalPattern: q.historicalPattern || `This concept appears consistently in ${examContext} exams.`,
        predictiveInsight: q.predictiveInsight || 'High probability to appear in upcoming exams.',
        marks: q.marks || '1',
        difficulty: q.diff || 'Moderate',
        diff: q.diff || 'Moderate',
        blooms: q.bloomsTaxonomy || 'Understand',
        topic: q.topic || topicResource.topicName,
        domain: q.domain || topicResource.topicName,
        year: q.year || '2025 Prediction',
        solutionSteps: q.markingScheme?.map((s: any) => `${s.step}`) || [],
        markingScheme: q.markingScheme || [],
        extractedImages: q.extractedImages || [],
        hasVisualElement: q.hasVisualElement || false
      }));

      // ========== STEP 1: SAVE TO SUPABASE DATABASE ==========
      console.log('💾 Saving to Supabase...');

      // Step 1a: Create or get placeholder scan for AI-generated questions
      // Questions table requires scan_id (NOT NULL), so we create a system scan
      const placeholderScanName = `AI Practice - ${topicResource.topicName}`;

      let scanId: string;

      // Check if placeholder scan exists (RLS ensures user_id isolation)
      const { data: existingScans } = await supabase
        .from('scans')
        .select('id, metadata')
        .eq('user_id', user.id)
        .eq('name', placeholderScanName)
        .eq('subject', subject)
        .eq('status', 'Complete')
        .filter('metadata->>is_ai_practice_placeholder', 'eq', 'true')
        .limit(1);

      if (existingScans && existingScans.length > 0) {
        scanId = existingScans[0].id;
        console.log('Using existing placeholder scan:', scanId);
      } else {
        // Create placeholder scan (hidden from main scans list)
        // NOTE: This is a system scan used ONLY to satisfy questions.scan_id foreign key
        // RLS ensures user_id isolation - each user only sees their own placeholder scans
        const { data: newScan, error: scanError } = await supabase
          .from('scans')
          .insert({
            user_id: user.id,
            name: placeholderScanName,
            grade: '12', // Default grade
            subject: subject,
            status: 'Complete',
            summary: `AI-generated practice questions for ${topicResource.topicName}`,
            exam_context: examContext,
            metadata: {
              is_ai_practice_placeholder: true, // FILTER THIS OUT in scans list queries
              type: 'ai_generated',
              topic_resource_id: topicResource.id,
              topic_name: topicResource.topicName,
              hidden_from_scans_list: true // Explicit flag for filtering
            }
          })
          .select('id')
          .single();

        if (scanError || !newScan) {
          console.error('❌ Failed to create placeholder scan:', scanError);
          setGenerateError(`Failed to create placeholder scan: ${scanError?.message || 'Unknown error'}`);
          setIsGenerating(false);
          return;
        }

        scanId = newScan.id;
        console.log('Created new placeholder scan:', scanId);
      }

      // Map to actual database columns (from migrations/001_initial_schema.sql and 009_add_question_metadata.sql)
      const questionsToInsert = formatted.map(q => ({
        id: q.id,
        scan_id: scanId, // Reference to placeholder scan (required field)
        // NOTE: questions table does NOT have user_id column - user ownership tracked via scan_id -> scans.user_id
        text: q.text,  // Column is 'text', not 'question_text'
        options: q.options,
        correct_option_index: q.correctOptionIndex,
        marks: parseInt(q.marks) || 1,
        difficulty: q.difficulty,
        topic: q.topic,
        blooms: q.bloomsTaxonomy, // Column is 'blooms', not 'blooms_taxonomy'
        domain: q.domain,
        year: q.year,
        subject: subject,
        exam_context: examContext,
        pedagogy: q.pedagogy,
        // Map AI fields to existing columns
        solution_steps: q.solutionSteps,
        exam_tip: q.studyTip, // Map studyTip to exam_tip
        visual_concept: q.visualConcept,
        key_formulas: q.thingsToRemember, // Map thingsToRemember to key_formulas
        pitfalls: q.commonMistakes, // Map commonMistakes to pitfalls
        has_visual_element: q.hasVisualElement || false,
        visual_element_description: q.visualElementDescription,
        // Store remaining AI data in mastery_material JSONB column
        mastery_material: {
          keyConcepts: q.keyConcepts,
          aiReasoning: q.aiReasoning,
          historicalPattern: q.historicalPattern,
          predictiveInsight: q.predictiveInsight,
          whyItMatters: q.whyItMatters,
          relevanceScore: q.relevanceScore
        }
      }));

      const { error: dbError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (dbError) {
        console.error('❌ Supabase error:', dbError);
        // Set error in state instead of throwing
        setGenerateError(`Failed to save to database: ${dbError.message}`);
        setIsGenerating(false);
        return; // Don't throw, just return
      }

      console.log('✅ Saved to Supabase');

      // ========== STEP 2: SAVE TO REDIS/API ==========
      const newQuestions = [...formatted, ...questions];
      const cacheKey = `qbank_${topicResource.topicName}_${subject}_${examContext}`;

      try {
        const token = localStorage.getItem('sb-auth-token');
        await fetch('/api/questionbank', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ key: cacheKey, questions: newQuestions })
        });
        console.log('✅ Saved to Redis/API');
      } catch (err) {
        console.warn('⚠️ Redis save failed (non-critical):', err);
      }

      // ========== STEP 3: UPDATE LOCAL STATE ==========
      setQuestions(newQuestions);
      console.log('✅ Updated local state');

      // Update parent component's question count
      if (onQuestionCountChange) {
        onQuestionCountChange(newQuestions.length);
      }

      // ========== STEP 4: RELOAD PRACTICE SESSION ==========
      // This will re-fetch saved answers for new questions
      await reloadPracticeSession();
      console.log('✅ Reloaded practice session');

      // ========== STEP 5: SUCCESS NOTIFICATION ==========
      setGenerateSuccess(`Successfully generated ${formatted.length} new practice questions! They're ready for you to solve.`);
      setIsGenerating(false);

      // Auto-close modal after 2 seconds
      setTimeout(() => {
        setShowGenerateModal(false);
        setGenerateSuccess(null);
      }, 2000);

    } catch (error: any) {
      console.error('❌ Generation error:', error);
      setGenerateError(`Failed to generate questions: ${error.message || 'Unknown error'}. Please try again.`);
      setIsGenerating(false);
    }
  };

  const getPedagogyColor = (pedagogy?: string) => {
    switch (pedagogy) {
      case 'Conceptual': return 'bg-gradient-to-br from-blue-50 to-blue-100/80 text-blue-700 border-blue-200/50';
      case 'Analytical': return 'bg-gradient-to-br from-purple-50 to-purple-100/80 text-purple-700 border-purple-200/50';
      case 'Problem-Solving': return 'bg-gradient-to-br from-orange-50 to-orange-100/80 text-orange-700 border-orange-200/50';
      case 'Application': return 'bg-gradient-to-br from-green-50 to-green-100/80 text-green-700 border-green-200/50';
      case 'Critical-Thinking': return 'bg-gradient-to-br from-pink-50 to-pink-100/80 text-pink-700 border-pink-200/50';
      default: return 'bg-gradient-to-br from-slate-50 to-slate-100/80 text-slate-700 border-slate-200/50';
    }
  };

  const getBloomsColor = (level?: string) => {
    switch (level) {
      case 'Remember':
      case 'Remembering': return 'bg-gradient-to-br from-slate-50 to-slate-100/80 text-slate-700 border border-slate-200/50';
      case 'Understand':
      case 'Understanding': return 'bg-gradient-to-br from-blue-50 to-blue-100/80 text-blue-700 border border-blue-200/50';
      case 'Apply':
      case 'Application': return 'bg-gradient-to-br from-green-50 to-green-100/80 text-green-700 border border-green-200/50';
      case 'Analyze':
      case 'Analyzing': return 'bg-gradient-to-br from-yellow-50 to-yellow-100/80 text-yellow-700 border border-yellow-200/50';
      case 'Evaluate':
      case 'Evaluating': return 'bg-gradient-to-br from-orange-50 to-orange-100/80 text-orange-700 border border-orange-200/50';
      case 'Create':
      case 'Creating': return 'bg-gradient-to-br from-purple-50 to-purple-100/80 text-purple-700 border border-purple-200/50';
      default: return 'bg-gradient-to-br from-slate-50 to-slate-100/80 text-slate-700 border border-slate-200/50';
    }
  };

  const filteredQuestions = questions?.filter(q => !trashedIds.has(q.id)) || [];

  // Get real-time session statistics
  const sessionStats = getSessionStats();

  // Track analytics visibility
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Load saved answers into local state ONCE when session is loaded
  useEffect(() => {
    if (!sessionLoading && savedAnswers.size > 0 && userAnswers.size === 0) {
      setUserAnswers(new Map(savedAnswers));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading]);

  // Calculate comprehensive analytics
  const calculateAnalytics = () => {
    // Topic breakdown
    const topicStats = new Map<string, { correct: number; total: number; timeSpent: number }>();
    filteredQuestions.forEach(q => {
      if (validatedAnswers.has(q.id)) {
        const stats = topicStats.get(q.topic) || { correct: 0, total: 0, timeSpent: 0 };
        stats.total++;
        if (validatedAnswers.get(q.id)) stats.correct++;
        topicStats.set(q.topic, stats);
      }
    });

    // Difficulty breakdown
    const difficultyStats = {
      Easy: { correct: 0, total: 0 },
      Moderate: { correct: 0, total: 0 },
      Hard: { correct: 0, total: 0 }
    };
    filteredQuestions.forEach(q => {
      if (validatedAnswers.has(q.id)) {
        const diff = (q.difficulty || q.diff || 'Moderate') as 'Easy' | 'Moderate' | 'Hard';
        if (difficultyStats[diff]) {
          difficultyStats[diff].total++;
          if (validatedAnswers.get(q.id)) difficultyStats[diff].correct++;
        }
      }
    });

    // Weak topics (accuracy < 60%)
    const weakTopics = Array.from(topicStats.entries())
      .map(([topic, stats]) => ({
        topic,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        correct: stats.correct,
        total: stats.total
      }))
      .filter(t => t.accuracy < 60)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    // Strong topics (accuracy >= 80%)
    const strongTopics = Array.from(topicStats.entries())
      .map(([topic, stats]) => ({
        topic,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        correct: stats.correct,
        total: stats.total
      }))
      .filter(t => t.accuracy >= 80)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3);

    return { topicStats, difficultyStats, weakTopics, strongTopics };
  };

  const analytics = calculateAnalytics();

  // DEBUG: Log first question metadata to verify data flow (only once)
  // Questions loaded - debug logs removed

  // Show loading state while fetching saved data
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-600 font-medium">Loading your practice session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Practice Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-white/80 uppercase tracking-wider">Practice</div>
            <div className="text-sm font-black text-white">{filteredQuestions.length} questions • {sessionStats.attempted} attempted</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-black text-white flex items-center gap-2 transition-all backdrop-blur-sm"
          >
            <Sparkles size={12} />
            Generate
          </button>
          {sessionStats.attempted > 0 && (
            <>
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-black text-white flex items-center gap-2 transition-all backdrop-blur-sm"
              >
                {showStats ? 'Hide' : 'View'} Stats
                {showStats ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <button
                onClick={async () => {
                  if (confirm('⚠️ Reset all progress?')) {
                    await clearProgress();
                    setUserAnswers(new Map());
                    setTrashedIds(new Set());
                  }
                }}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-all backdrop-blur-sm"
                title="Reset Progress"
              >
                <RefreshCw size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapsible Stats */}
      {showStats && sessionStats.attempted > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-lg p-3">
              <div className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Accuracy</div>
              <div className={`text-xl font-black ${
                sessionStats.accuracy >= 80 ? 'text-emerald-600' :
                sessionStats.accuracy >= 60 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {sessionStats.accuracy}%
              </div>
              <div className="text-[10px] text-slate-600">{sessionStats.correct}/{sessionStats.attempted}</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-3">
              <div className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Progress</div>
              <div className="text-xl font-black text-slate-900">
                {((sessionStats.attempted / filteredQuestions.length) * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-600">{sessionStats.attempted}/{filteredQuestions.length}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-lg p-3">
              <div className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Bookmarked</div>
              <div className="text-xl font-black text-purple-600">{sessionStats.bookmarked}</div>
              <div className="text-[10px] text-slate-600">For review</div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-lg p-3">
              <div className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Avg Time</div>
              <div className="text-xl font-black text-amber-600">
                {sessionStats.avgTime > 0 ? `${Math.floor(sessionStats.avgTime)}s` : '—'}
              </div>
              <div className="text-[10px] text-slate-600">Per question</div>
            </div>
          </div>

          {analytics.weakTopics.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-rose-600" />
                <div>
                  <div className="text-xs font-black text-rose-900">Focus: {analytics.weakTopics[0].topic}</div>
                  <div className="text-[10px] text-slate-600">{analytics.weakTopics[0].accuracy}% accuracy</div>
                </div>
              </div>
              <div className="text-[9px] font-black text-rose-600">
                Practice {Math.max(3, 10 - analytics.weakTopics[0].total)} more
              </div>
            </div>
          )}
        </div>
      )}


      {/* Questions List - Same format as Question Bank */}
      {filteredQuestions.length > 0 ? (
        <div className="space-y-6">
          {filteredQuestions.map((q) => {
            // Check local state first (for immediate feedback), then fall back to saved answers
            const selectedAnswer = userAnswers.get(q.id) ?? savedAnswers.get(q.id);
            const hasValidated = validatedAnswers.has(q.id);
            const isCorrect = validatedAnswers.get(q.id) ?? false;
            const validatedAnswer = savedAnswers.get(q.id);

            // Button logic (debug logs removed)

            return (
              <div key={q.id} className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all duration-300">
                {/* Card Header - Sophisticated Premium Design */}
                <div className="px-7 py-5 bg-gradient-to-r from-white via-slate-50/50 to-white border-b border-slate-200/60">
                  <div className="flex items-center justify-between gap-6">
                    {/* Left: Q Badge + Topic + Metadata */}
                    <div className="flex items-center gap-5 flex-1 min-w-0">
                      {/* Question Number Badge - Premium Style */}
                      {(() => {
                        const qNumMatch = q.id?.match(/Q(\d+)/i) || q.id?.match(/(\d+)/);
                        const qNum = qNumMatch ? qNumMatch[1] : filteredQuestions.indexOf(q) + 1;
                        return (
                          <div className="relative flex-shrink-0">
                            <div className="w-16 h-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/25 ring-1 ring-slate-900/10">
                              <div className="text-center">
                                <div className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Q</div>
                                <div className="text-2xl font-black leading-none text-white">{qNum}</div>
                              </div>
                            </div>
                            {/* Subtle glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-sm -z-10"></div>
                          </div>
                        );
                      })()}

                      {/* Topic + Tags Container */}
                      <div className="flex-1 min-w-0">
                        {/* Topic Name + Time Tracker */}
                        <div className="flex items-center gap-3 mb-2.5">
                          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                            {q.topic}
                          </h3>
                          {/* Time Spent Badge */}
                          {hasValidated && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                              <Clock size={12} className="text-blue-600" />
                              <span className="text-[11px] font-bold text-blue-700">
                                {Math.floor((sessionStats.avgTime || 0))}s
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Metadata Tags Row - Refined */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Year */}
                          {q.year && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-br from-blue-50 to-blue-100/80 text-blue-700 text-[11px] font-bold rounded-md border border-blue-200/50 shadow-sm">
                              {q.year}
                            </span>
                          )}

                          {/* Difficulty */}
                          {q.diff && (
                            <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-md border shadow-sm ${
                              q.diff === 'Hard'
                                ? 'bg-gradient-to-br from-rose-50 to-rose-100/80 text-rose-700 border-rose-200/50' :
                              q.diff === 'Moderate'
                                ? 'bg-gradient-to-br from-amber-50 to-amber-100/80 text-amber-700 border-amber-200/50' :
                                'bg-gradient-to-br from-emerald-50 to-emerald-100/80 text-emerald-700 border-emerald-200/50'
                            }`}>
                              {q.diff}
                            </span>
                          )}

                          {/* Marks */}
                          {q.marks && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-br from-indigo-50 to-indigo-100/80 text-indigo-700 text-[11px] font-bold rounded-md border border-indigo-200/50 shadow-sm">
                              {q.marks} Mark{parseInt(q.marks) > 1 ? 's' : ''}
                            </span>
                          )}

                          {/* Pedagogy */}
                          {q.pedagogy && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md border shadow-sm ${getPedagogyColor(q.pedagogy)}`}>
                              <Brain size={11} className="flex-shrink-0" />
                              <span>{q.pedagogy}</span>
                            </span>
                          )}

                          {/* Bloom's Taxonomy */}
                          {q.bloomsTaxonomy && (
                            <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-md shadow-sm ${getBloomsColor(q.bloomsTaxonomy)}`}>
                              {q.bloomsTaxonomy}
                            </span>
                          )}

                          {/* Domain */}
                          {q.domain && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white text-[11px] font-bold rounded-md shadow-md border border-slate-700/50">
                              {q.domain}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Buttons - Refined */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleSave(q.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                          bookmarkedIds.has(q.id)
                            ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-200/50'
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 hover:shadow-sm'
                        }`}
                        title={bookmarkedIds.has(q.id) ? "Remove bookmark" : "Bookmark question"}
                      >
                        <BookmarkPlus size={16} fill={bookmarkedIds.has(q.id) ? "currentColor" : "none"} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => handleTrash(q.id)}
                        className="w-9 h-9 bg-slate-50 text-slate-400 hover:bg-gradient-to-br hover:from-rose-100 hover:to-rose-50 hover:text-rose-600 rounded-xl flex items-center justify-center transition-all duration-200 hover:shadow-sm"
                        title="Remove from list"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Question Body */}
                <div className="px-5 py-6">
                  {/* Question Text */}
                  <div className="text-xl font-bold text-slate-900 leading-relaxed mb-6">
                    <RenderWithMath text={q.text} showOptions={false} />
                  </div>

                  {/* Diagram (if present) */}
                  {q.hasVisualElement && q.extractedImages && q.extractedImages.length > 0 && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <img
                        src={q.extractedImages[0]}
                        alt="Question diagram"
                        className="max-w-full h-auto mx-auto"
                      />
                    </div>
                  )}

                  {/* MCQ Options - 2 Column Grid - EXACT Question Bank Format */}
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {q.options.map((option, idx) => {
                        // Only apply highlighting if correctOptionIndex is defined
                        const hasCorrectAnswer = q.correctOptionIndex !== undefined && q.correctOptionIndex !== null;
                        const isThisCorrect = hasCorrectAnswer && q.correctOptionIndex === idx;
                        const isSelected = selectedAnswer === idx;
                        const isUserSelection = validatedAnswer === idx; // User's validated choice
                        const isValidatedCorrect = hasValidated && isUserSelection && isThisCorrect;
                        const isValidatedWrong = hasValidated && isUserSelection && !isThisCorrect && hasCorrectAnswer;
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

                        // After validation - show BOTH user's choice (red) AND correct answer (green)
                        if (hasValidated && hasCorrectAnswer) {
                          // First, highlight the correct answer in green
                          if (isThisCorrect) {
                            bgColor = 'bg-emerald-50';
                            shadowClass = 'shadow-md';
                            ringClass = 'ring-2 ring-emerald-400';
                          }
                          // ALSO highlight user's wrong choice in red (both visible simultaneously)
                          if (isValidatedWrong) {
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
                            className={`group relative flex items-start gap-3.5 px-5 py-4 rounded-2xl border border-slate-200 transition-all text-left ${bgColor} ${shadowClass} ${ringClass} ${!hasValidated ? 'cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-purple-300 hover:border-purple-200 hover:bg-purple-50 active:scale-[0.99]' : 'cursor-default'}`}
                          >
                            {/* Option Label */}
                            <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg transition-all ${
                              isValidatedCorrect
                                ? 'bg-emerald-500 text-white shadow-md'
                                : isValidatedWrong
                                ? 'bg-rose-500 text-white shadow-md'
                                : isSelected && !hasValidated
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'bg-slate-100 text-slate-700 group-hover:bg-purple-100 group-hover:text-purple-700 group-hover:scale-110'
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
                  )}

                  {/* Action Buttons - Matching QuestionBank Flow */}
                  <div className="flex items-center justify-center gap-3 mt-6">
                    {/* Empty State Message - When no answer selected */}
                    {!hasValidated && selectedAnswer === undefined && (
                      <p className="text-sm text-slate-400 italic font-medium">
                        Select an option to get it evaluated
                      </p>
                    )}

                    {/* Get Evaluated Button - When answer selected but not validated */}
                    {!hasValidated && selectedAnswer !== undefined && q.correctOptionIndex !== undefined && (
                      <button
                        onClick={() => {
                          handleValidateAnswer(q.id, q.correctOptionIndex!);
                        }}
                        className="group flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-purple-800 transition-all"
                        title="Get Answer Evaluated"
                      >
                        <Award size={20} className="transition-transform group-hover:scale-110 group-hover:rotate-6" />
                        <span className="text-sm font-bold uppercase tracking-wide">Get Evaluated</span>
                      </button>
                    )}

                    {/* Warning: Correct answer missing */}
                    {!hasValidated && selectedAnswer !== undefined && q.correctOptionIndex === undefined && (
                      <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                        ⚠️ Correct answer not available for this question
                      </div>
                    )}

                    {/* Action Buttons - After Validation */}
                    {hasValidated && (
                      <>
                        <button
                          onClick={() => setSolutionModalQuestion(q)}
                          className="group flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all"
                          title="View Solution"
                        >
                          <Eye size={18} className="transition-transform group-hover:scale-110" />
                          <span className="text-sm font-bold uppercase tracking-wide">Solution</span>
                        </button>
                        <button
                          onClick={() => setInsightsModalQuestion(q)}
                          className="group flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all"
                          title="AI Insights"
                        >
                          <Lightbulb size={18} className="transition-transform group-hover:scale-110 group-hover:rotate-12" />
                          <span className="text-sm font-bold uppercase tracking-wide">Insights</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Validation Message (full width at bottom) - Animated */}
                {hasValidated && (
                  <div
                    className={`px-6 py-4 ${isCorrect ? 'bg-emerald-50' : 'bg-rose-50'} animate-fadeIn`}
                    style={{
                      animation: 'fadeIn 0.3s ease-in-out'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {isCorrect ? (
                        <>
                          <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                            <CheckCircle size={18} className="text-white" strokeWidth={3} />
                          </div>
                          <div>
                            <p className="font-black text-sm text-emerald-900">Excellent! That's correct! 🎉</p>
                            <p className="text-xs text-emerald-700 mt-0.5">You're building strong mastery of this concept.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-shrink-0 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center">
                            <XCircle size={18} className="text-white" strokeWidth={3} />
                          </div>
                          <div>
                            <p className="font-black text-sm text-rose-900">Not quite right - but that's part of learning!</p>
                            <p className="text-xs text-rose-700 mt-0.5">Review the correct answer above and check the solution for detailed steps.</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-dashed border-slate-300 rounded-2xl p-16 text-center">
          <div className="max-w-md mx-auto">
            {/* Animated Icon */}
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto">
                <FileQuestion size={48} className="text-primary-600" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-purple-500/20 rounded-full blur-xl -z-10 animate-pulse"></div>
            </div>

            <h3 className="font-black text-2xl text-slate-900 mb-3">Ready to Start Practicing?</h3>
            <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed">
              No questions available yet for this topic. Generate AI-powered practice questions tailored to your exam pattern, or scan past papers to build your question bank.
            </p>

            {/* Action Button */}
            <button
              onClick={() => setShowGenerateModal(true)}
              className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-purple-800 transition-all"
            >
              <Sparkles size={20} className="transition-transform group-hover:rotate-12 group-hover:scale-110" />
              <span className="uppercase tracking-wide">Generate Practice Questions</span>
            </button>

            {/* Help Text */}
            <p className="text-xs text-slate-500 mt-4">
              ✨ AI will create exam-style questions with detailed solutions and insights
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {solutionModalQuestion && (
        <PracticeSolutionModal
          question={solutionModalQuestion}
          onClose={() => setSolutionModalQuestion(null)}
        />
      )}

      {insightsModalQuestion && (
        <PracticeInsightsModal
          question={insightsModalQuestion}
          onClose={() => setInsightsModalQuestion(null)}
        />
      )}

      {/* Generate Questions Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-4">Generate Practice Questions</h3>
            <p className="text-sm text-slate-600 mb-6">
              AI will generate new MCQ questions for <span className="font-bold text-primary-600">{topicResource.topicName}</span>
            </p>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Number of Questions</label>
              <select
                value={generateCount}
                onChange={(e) => setGenerateCount(parseInt(e.target.value))}
                disabled={isGenerating}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-medium focus:border-primary-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
              </select>
            </div>

            {/* Error Message */}
            {generateError && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-900 mb-1">Generation Failed</p>
                  <p className="text-xs text-red-700">{generateError}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {generateSuccess && (
              <div className="mb-4 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-start gap-3 animate-fadeIn">
                <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-900 mb-1">Success!</p>
                  <p className="text-xs text-emerald-700">{generateSuccess}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateQuestions}
                disabled={isGenerating}
                className="group flex-1 px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold disabled:opacity-50 hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span className="uppercase tracking-wide">Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="transition-transform group-hover:rotate-12 group-hover:scale-110" />
                    <span className="uppercase tracking-wide">Generate</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={isGenerating}
                className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== TAB 3: QUIZ (AI-POWERED) ==========
const QuizTab: React.FC<{
  topicResource: TopicResource;
  subject: Subject;
  examContext: ExamContext;
  sharedQuestions: any[];
  setSharedQuestions: React.Dispatch<React.SetStateAction<any[]>>;
}> = ({
  topicResource,
  subject,
  examContext,
  sharedQuestions,
  setSharedQuestions
}) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]); // Generated quiz questions
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Quiz state
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Map<number, number>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [quizSaved, setQuizSaved] = useState(false);

  // Past quizzes
  const [pastQuizzes, setPastQuizzes] = useState<any[]>([]);
  const [showPastQuizzes, setShowPastQuizzes] = useState(false);
  const [loadingPastQuizzes, setLoadingPastQuizzes] = useState(false);

  // Timer for active quiz
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isQuizActive && quizStartTime && !showResults) {
      interval = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - quizStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isQuizActive, quizStartTime, showResults]);

  // Parse JSON helper (from RapidRecall)
  const parseGeminiJSON = (responseText: string) => {
    try {
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      jsonText = jsonText.trim();
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      throw new Error('Invalid JSON response from AI');
    }
  };

  const generateQuiz = async () => {
    if (!user) {
      alert('Please log in to generate quiz');
      return;
    }

    setIsGenerating(true);

    try {
      // Get topic-specific questions from shared state
      const topicQuestions = sharedQuestions || [];

      if (topicQuestions.length === 0) {
        alert('No questions available for this topic yet. Please generate practice questions first from the Practice tab.');
        setIsGenerating(false);
        return;
      }

      // Adaptive quiz logic based on student performance
      const masteryLevel = topicResource.masteryLevel || 0;
      const averageScore = topicResource.averageQuizScore || 0;

      // Determine difficulty distribution based on mastery
      let difficultyDistribution = "";
      if (masteryLevel < 30) {
        difficultyDistribution = "70% Easy, 25% Medium, 5% Hard - Focus on fundamentals";
      } else if (masteryLevel < 60) {
        difficultyDistribution = "30% Easy, 50% Medium, 20% Hard - Balanced practice";
      } else {
        difficultyDistribution = "10% Easy, 40% Medium, 50% Hard - Challenge mode";
      }

      // Get weak areas from question bank performance
      const weakConcepts = topicQuestions
        .filter(q => q.userAttempted && q.userCorrect === false)
        .slice(0, 3)
        .map(q => q.concept || q.topic)
        .filter(Boolean);

      const selectedModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `You are an expert ${subject} teacher creating an ADAPTIVE MCQ quiz for ${examContext} students on "${topicResource.topicName}".

STUDENT PERFORMANCE DATA:
- Mastery Level: ${masteryLevel}%
- Average Quiz Score: ${averageScore}%
- Weak Areas: ${weakConcepts.length > 0 ? weakConcepts.join(', ') : 'No data yet'}

Generate ${questionCount} high-quality MCQ questions with this difficulty distribution:
${difficultyDistribution}

${weakConcepts.length > 0 ? `PRIORITY: Include questions on these weak concepts: ${weakConcepts.join(', ')}` : ''}

REQUIREMENTS:
- Focus on key concepts from ${topicResource.topicName}
- Include clear, concise explanations with learning tips
- Use proper ${subject} terminology
- Progressively increase difficulty within the quiz
- Each explanation should teach the concept, not just state the answer

MATH FORMATTING: Use $ $ for ALL math (e.g., $\\\\frac{1}{2}$, $\\\\pi$).
IMPORTANT: All backslashes in LaTeX must be properly escaped in JSON (use double backslashes: \\\\frac not \\frac).

Return ONLY valid JSON array:
[
  {
    "id": "q1",
    "question": "Question text with $\\\\frac{1}{2}$",
    "options": ["$\\\\frac{\\\\pi}{6}$", "$\\\\frac{\\\\pi}{3}$", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Brief explanation with learning tip",
    "concept": "Key concept tested",
    "topic": "${topicResource.topicName}",
    "domain": "${subject}",
    "difficulty": "Easy/Medium/Hard"
  }
]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const parsed = parseGeminiJSON(response.text() || "[]");

      if (!Array.isArray(parsed)) {
        throw new Error('Invalid response format');
      }

      setQuizQuestions(parsed);
    } catch (error) {
      console.error('Quiz generation error:', error);
      alert('Failed to generate quiz. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const startQuiz = () => {
    if (quizQuestions.length === 0) return;
    setIsQuizActive(true);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnsweredQuestions(new Map());
    setShowResults(false);
    setQuizStartTime(Date.now());
    setTimeElapsed(0);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (!isQuizActive || showResults) return;
    setSelectedAnswer(optionIndex);
  };

  const submitAnswer = () => {
    if (selectedAnswer === null) return;

    const newAnswers = new Map(answeredQuestions);
    newAnswers.set(currentQuestion, selectedAnswer);
    setAnsweredQuestions(newAnswers);
    // User must manually click "Next Question" button to continue
  };

  const exitQuiz = () => {
    setIsQuizActive(false);
    setShowResults(false);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnsweredQuestions(new Map());
  };

  const retakeQuiz = () => {
    startQuiz();
    setQuizSaved(false);
  };

  // Save quiz attempt to database
  const saveQuizAttempt = async () => {
    if (!user || quizSaved) return;

    try {
      const wrongCount = answeredQuestions.size - correctCount;

      const questionsData = questions.map((q, idx) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        userAnswer: answeredQuestions.get(idx),
        isCorrect: answeredQuestions.get(idx) === q.correctIndex,
        difficulty: q.difficulty,
        concept: q.concept,
        explanation: q.explanation
      }));

      const { error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          topic_resource_id: topicResource.id,
          subject,
          exam_context: examContext,
          topic_name: topicResource.topicName,
          question_count: questions.length,
          questions_data: questionsData,
          correct_count: correctCount,
          wrong_count: wrongCount,
          accuracy_percentage: accuracy,
          time_spent_seconds: timeElapsed
        });

      if (error) {
        console.error('Failed to save quiz attempt:', error);
      } else {
        console.log('✅ Quiz attempt saved successfully');
        setQuizSaved(true);
      }
    } catch (err) {
      console.error('Error saving quiz:', err);
    }
  };

  // Load past quiz attempts
  const loadPastQuizzes = async () => {
    if (!user) return;

    setLoadingPastQuizzes(true);
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_resource_id', topicResource.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to load past quizzes:', error);
      } else {
        setPastQuizzes(data || []);
      }
    } catch (err) {
      console.error('Error loading past quizzes:', err);
    } finally {
      setLoadingPastQuizzes(false);
    }
  };

  // Save quiz when results are shown
  useEffect(() => {
    if (showResults && isQuizActive && !quizSaved) {
      saveQuizAttempt();
    }
  }, [showResults, isQuizActive, quizSaved]);

  // Calculate results
  const correctCount = Array.from(answeredQuestions.entries()).filter(
    ([idx, answer]) => quizQuestions[idx]?.correctIndex === answer
  ).length;

  const accuracy = answeredQuestions.size > 0
    ? Math.round((correctCount / answeredQuestions.size) * 100)
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Results Screen - Expert Side-by-Side Design
  if (showResults && isQuizActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-4">
        <div className="max-w-[1400px] mx-auto px-4">
          {/* Minimal Header Score Bar */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-xl px-6 py-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  accuracy >= 80 ? 'bg-emerald-100' : accuracy >= 60 ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  <Trophy size={28} className={
                    accuracy >= 80 ? 'text-emerald-600' : accuracy >= 60 ? 'text-amber-600' : 'text-red-600'
                  } />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-900">{accuracy}%</div>
                  <div className="text-xs text-slate-500 font-medium">Score</div>
                </div>
              </div>

              <div className="h-12 w-px bg-slate-200"></div>

              <div className="flex items-center gap-6">
                <div>
                  <div className="text-2xl font-black text-emerald-600">{correctCount}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-red-600">{answeredQuestions.size - correctCount}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Wrong</div>
                </div>
                <div>
                  <div className="text-2xl font-black font-mono text-blue-600">{formatTime(timeElapsed)}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Time</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={retakeQuiz}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all flex items-center gap-2 text-sm"
              >
                <RefreshCw size={14} />
                Retake
              </button>
              <button
                onClick={exitQuiz}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-bold transition-all text-sm"
              >
                Exit
              </button>
            </div>
          </div>

          {/* Questions - TRUE Side-by-Side Layout */}
          <div className="space-y-4">
            {quizQuestions.map((q, idx) => {
              const userAnswer = answeredQuestions.get(idx);
              const isCorrect = userAnswer === q.correctIndex;

              return (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Minimal Question Number Header */}
                  <div className={`px-4 py-2 border-b flex items-center gap-3 ${
                    isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                      isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className={`text-xs font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </div>
                  </div>

                  {/* TRUE 50/50 Split - No Stacking */}
                  <div className="grid grid-cols-2 divide-x divide-slate-200">
                    {/* LEFT PANEL: Question + Options */}
                    <div className="p-6 bg-white">
                      <div className="text-sm font-bold text-slate-900 mb-4 leading-relaxed">
                        <RenderWithMath text={q.question} showOptions={false} serif={false} />
                      </div>

                      <div className="space-y-2">
                        {q.options.map((option: string, optIdx: number) => {
                          const isUserSelection = userAnswer === optIdx;
                          const isCorrectOpt = q.correctIndex === optIdx;

                          return (
                            <div
                              key={optIdx}
                              className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                                isCorrectOpt
                                  ? 'border-emerald-400 bg-emerald-50'
                                  : isUserSelection && !isCorrect
                                  ? 'border-red-400 bg-red-50'
                                  : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
                                isCorrectOpt
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : isUserSelection && !isCorrect
                                  ? 'bg-red-500 text-white shadow-sm'
                                  : 'bg-white text-slate-700 border-2 border-slate-300'
                              }`}>
                                {String.fromCharCode(65 + optIdx)}
                              </div>
                              <div className="flex-1 text-sm font-medium text-slate-800 pt-0.5">
                                <RenderWithMath text={option} showOptions={false} serif={false} />
                              </div>
                              {isCorrectOpt && (
                                <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" strokeWidth={2.5} />
                              )}
                              {isUserSelection && !isCorrect && (
                                <XCircle size={20} className="text-red-600 flex-shrink-0" strokeWidth={2.5} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT PANEL: Solution + Explanation */}
                    <div className="p-6 bg-gradient-to-br from-slate-50 to-white">
                      {/* Correct Answer Section */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center">
                            <CheckCircle2 size={14} className="text-white" strokeWidth={3} />
                          </div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Correct Answer</h4>
                        </div>
                        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg px-4 py-3">
                          <div className="text-base font-black text-emerald-700">
                            {String.fromCharCode(65 + q.correctIndex)}
                          </div>
                          <div className="text-sm font-medium text-emerald-800 mt-1">
                            <RenderWithMath text={q.options[q.correctIndex]} showOptions={false} serif={false} />
                          </div>
                        </div>
                      </div>

                      {/* Explanation Section */}
                      {q.explanation && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Lightbulb size={16} className="text-blue-600" />
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Explanation</h4>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 leading-relaxed">
                            <RenderWithMath text={q.explanation} showOptions={false} serif={false} />
                          </div>
                        </div>
                      )}

                      {/* Your Wrong Answer */}
                      {!isCorrect && (
                        <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={14} className="text-amber-600" />
                            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Your Answer</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center font-black text-xs text-white">
                              {String.fromCharCode(65 + userAnswer!)}
                            </div>
                            <div className="text-xs font-medium text-amber-800">
                              <RenderWithMath text={q.options[userAnswer!]} showOptions={false} serif={false} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Active Quiz Screen
  if (isQuizActive && !showResults && quizQuestions.length > 0) {
    const currentQ = quizQuestions[currentQuestion];
    const isAnswered = answeredQuestions.has(currentQuestion);
    const userAnswer = answeredQuestions.get(currentQuestion);
    const isCorrect = userAnswer === currentQ?.correctIndex;

    // Difficulty badge color
    const getDifficultyColor = (diff: string) => {
      switch (diff?.toLowerCase()) {
        case 'easy': return 'bg-green-100 text-green-700';
        case 'medium': return 'bg-yellow-100 text-yellow-700';
        case 'hard': return 'bg-red-100 text-red-700';
        default: return 'bg-slate-100 text-slate-700';
      }
    };

    return (
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Ultra-Compact Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg px-3 py-1.5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
              <div className="text-white font-black text-xs">{currentQuestion + 1}</div>
            </div>
            <span className="text-[11px] font-black text-white">
              {currentQuestion + 1}/{quizQuestions.length}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getDifficultyColor(currentQ?.difficulty)}`}>
              {currentQ?.difficulty || 'Med'}
            </span>
            <div className="flex-1 mx-2">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/90 transition-all duration-500 rounded-full"
                  style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] font-bold text-white">
              <Clock size={10} />
              {formatTime(timeElapsed)}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-white">
              {correctCount}/{answeredQuestions.size}
            </div>
            <button
              onClick={exitQuiz}
              className="ml-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] font-bold text-white transition-all"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Compact Question Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
          <div className="text-sm font-bold text-slate-900 mb-3 leading-snug">
            <RenderWithMath text={currentQ?.question || ''} showOptions={false} serif={false} />
          </div>

          {/* 2x2 Grid Layout for Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            {currentQ?.options.map((option: string, idx: number) => {
              let buttonClass = "text-left p-2 rounded-lg border transition-all duration-200 flex items-center gap-2 ";

              if (isAnswered) {
                if (idx === currentQ.correctIndex) {
                  buttonClass += "border-green-400 bg-green-50 text-green-900";
                } else if (idx === userAnswer) {
                  buttonClass += "border-red-400 bg-red-50 text-red-900";
                } else {
                  buttonClass += "border-slate-200 bg-slate-50 text-slate-400";
                }
              } else {
                if (idx === selectedAnswer) {
                  buttonClass += "border-purple-400 bg-purple-50 text-purple-900 shadow-sm";
                } else {
                  buttonClass += "border-slate-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(idx)}
                  disabled={isAnswered}
                  className={buttonClass}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] flex-shrink-0 ${
                    isAnswered
                      ? idx === currentQ.correctIndex
                        ? 'bg-green-500 text-white'
                        : idx === userAnswer
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                      : idx === selectedAnswer
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-xs font-medium flex-1">
                    <RenderWithMath text={option} showOptions={false} serif={false} />
                  </span>
                  {isAnswered && idx === currentQ.correctIndex && (
                    <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                  )}
                  {isAnswered && idx === userAnswer && idx !== currentQ.correctIndex && (
                    <XCircle size={14} className="text-red-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Compact Explanation */}
          {isAnswered && currentQ?.explanation && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-black text-[10px] text-blue-900 mb-1 flex items-center gap-1">
                <Lightbulb size={10} />
                Explanation
              </h4>
              <div className="text-[11px] text-blue-800 leading-snug">
                <RenderWithMath text={currentQ.explanation} showOptions={false} serif={false} />
              </div>
            </div>
          )}

          {/* Inline Action Button */}
          {!isAnswered ? (
            <button
              onClick={submitAnswer}
              disabled={selectedAnswer === null}
              className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-bold hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-sm text-xs"
            >
              <CheckCircle2 size={14} />
              Submit Answer
            </button>
          ) : (
            <button
              onClick={() => {
                if (currentQuestion < quizQuestions.length - 1) {
                  setCurrentQuestion(currentQuestion + 1);
                  setSelectedAnswer(null);
                } else {
                  setShowResults(true);
                }
              }}
              className="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-1 shadow-sm text-xs"
            >
              {currentQuestion < quizQuestions.length - 1 ? (
                <>
                  Next Question
                  <ChevronRight size={14} />
                </>
              ) : (
                <>
                  <Trophy size={14} />
                  View Results
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main Quiz Setup Screen
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {/* Inline Quiz Stats - Single Line */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <Brain size={12} className="text-white" />
          </div>
          <span className="text-xs font-black text-blue-900">Adaptive Quiz</span>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
            {topicResource.masteryLevel}% mastery
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-700">
          <span className="bg-white/60 px-2 py-0.5 rounded">✓ {topicResource.masteryLevel < 30 ? '70% Easy' : topicResource.masteryLevel < 60 ? '50% Med' : '50% Hard'}</span>
          <span className="bg-white/60 px-2 py-0.5 rounded">✓ Weak areas</span>
          <span className="bg-white/60 px-2 py-0.5 rounded">✓ Tips</span>
        </div>
      </div>

      {/* Compact Quiz Controls */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3">
        <div className="flex items-center gap-4">
          {/* Question Count Slider */}
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Questions: <span className="text-blue-600">{questionCount}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="5"
                max="20"
                step="5"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="flex-1 accent-blue-600 h-1.5"
              />
              <div className="flex gap-1 text-[9px] text-slate-400 font-medium">
                <span>5</span>
                <span>•</span>
                <span>10</span>
                <span>•</span>
                <span>15</span>
                <span>•</span>
                <span>20</span>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateQuiz}
            disabled={isGenerating}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md text-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Zap size={14} />
                <span>Generate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Start Quiz Card - Compact */}
      {quizQuestions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Play size={18} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-black text-white">
                {quizQuestions.length} Questions Ready
              </div>
              <div className="text-[10px] text-white/80 font-medium">
                {topicResource.topicName}
              </div>
            </div>
          </div>
          <button
            onClick={startQuiz}
            className="px-4 py-2 bg-white text-blue-700 rounded-lg font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md text-sm"
          >
            <Play size={14} />
            <span>Start</span>
          </button>
        </div>
      )}

      {/* Past Quizzes Section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
            <History size={12} />
            Past Quizzes
          </h3>
          <button
            onClick={() => {
              setShowPastQuizzes(!showPastQuizzes);
              if (!showPastQuizzes && pastQuizzes.length === 0) {
                loadPastQuizzes();
              }
            }}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {showPastQuizzes ? 'Hide' : 'View All'}
          </button>
        </div>

        {showPastQuizzes && (
          <>
            {loadingPastQuizzes ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              </div>
            ) : pastQuizzes.length > 0 ? (
              <div className="space-y-1.5">
                {pastQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded flex items-center justify-center font-black text-xs ${
                          quiz.accuracy_percentage >= 80
                            ? 'bg-green-100 text-green-700'
                            : quiz.accuracy_percentage >= 60
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {quiz.accuracy_percentage}%
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-900">
                            {quiz.correct_count}/{quiz.question_count} correct
                          </div>
                          <div className="text-[9px] text-slate-500">
                            {new Date(quiz.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock size={10} />
                        {Math.floor(quiz.time_spent_seconds / 60)}:{String(quiz.time_spent_seconds % 60).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-[11px] text-slate-500">
                No past quizzes yet. Complete a quiz to see your history here.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ========== TAB 4: FLASHCARDS ==========
const FlashcardsTab: React.FC<{
  topicResource: TopicResource;
  sharedQuestions: any[];
}> = ({ topicResource, sharedQuestions }) => {
  const { user } = useAuth();
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cards, setCards] = useState(topicResource.flashcards || []);

  const hasCards = cards.length > 0;

  const handleNext = () => {
    setIsFlipped(false);
    if (cards.length === 0) return;
    setCurrentCard((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (cards.length === 0) return;
    setCurrentCard((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const generateFlashcards = async () => {
    if (!user) {
      alert('Please log in to generate flashcards.');
      return;
    }

    setIsGenerating(true);

    try {
      const selectedModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        alert('Gemini API key not configured. Please contact administrator.');
        setIsGenerating(false);
        return;
      }

      // Prepare context from questions
      const questionContext = sharedQuestions.length > 0
        ? sharedQuestions.map((q, idx) => `Q${idx + 1}: ${q.text}\nCorrect Answer: ${q.options?.[q.correct_option_index || q.correctOptionIndex] || 'N/A'}\n${q.solution_steps?.length > 0 ? 'Solution: ' + q.solution_steps.join(' ') : ''}`).join('\n\n')
        : 'No practice questions available yet.';

      const prompt = `You are an expert educator creating comprehensive flashcards for ${topicResource.topicName} (${topicResource.subject} - ${topicResource.examContext}).

CONTEXT:
- Topic: ${topicResource.topicName}
- Subject: ${topicResource.subject}
- Exam: ${topicResource.examContext}
- Total Questions Available: ${sharedQuestions.length}

QUESTIONS ANALYZED:
${questionContext.substring(0, 3000)}

TASK: Create 12-15 comprehensive flashcards covering:
1. **Key Concepts** from official ${topicResource.examContext} ${topicResource.subject} syllabus for ${topicResource.topicName}
2. **Important Formulas** and their applications
3. **Common Exam Patterns** seen in questions
4. **Critical Definitions** students must memorize
5. **Problem-Solving Techniques** for this topic
6. **Common Mistakes** to avoid

Each flashcard should:
- Have a clear, concise question/term (front)
- Have a complete, exam-focused answer (back)
- Be directly useful for ${topicResource.examContext} exam preparation
- Cover different difficulty levels (easy concepts to advanced applications)

Return ONLY a JSON array with this EXACT format:
[
  {
    "term": "What is the determinant of a 2x2 matrix?",
    "definition": "For matrix [[a,b],[c,d]], determinant = ad - bc. This value determines if the matrix is invertible (non-zero determinant means invertible).",
    "context": "Core Definition"
  },
  {
    "term": "Properties of determinants",
    "definition": "1) det(AB) = det(A)×det(B)\\n2) det(A^T) = det(A)\\n3) If any row/column is zero, det = 0\\n4) Swapping rows changes sign\\n5) det(kA) = k^n × det(A) for n×n matrix",
    "context": "Key Properties"
  }
]

Generate 12-15 flashcards covering all important aspects of ${topicResource.topicName} for ${topicResource.examContext}.`;

      console.log('🎴 Generating AI-powered flashcards for', topicResource.topicName);

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      jsonText = jsonText.trim();

      const generatedCards = JSON.parse(jsonText);

      if (!Array.isArray(generatedCards) || generatedCards.length === 0) {
        throw new Error('Invalid flashcard format received');
      }

      console.log(`✅ Generated ${generatedCards.length} AI-powered flashcards`);

      setCards(generatedCards);
      setCurrentCard(0);
      setIsFlipped(false);
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
      alert('Failed to generate flashcards. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Flashcards Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <CreditCard size={16} className="text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/80 uppercase tracking-wider">RapidRecall</div>
            <div className="text-xs font-black text-white">{cards.length} flashcards • {topicResource.topicName}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasCards && (
            <>
              <div className="text-[10px] font-black text-white/90 bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">
                Card {currentCard + 1} / {cards.length}
              </div>
              <button
                onClick={generateFlashcards}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 text-[10px] backdrop-blur-sm"
                title="Regenerate flashcards with fresh AI insights"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={12} />
                    Regenerate
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Flashcard Viewer */}
      {hasCards ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-3">
            <div className="w-full max-w-xl mx-auto perspective-1000 relative">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
                className={`select-none relative w-full h-64 transition-all duration-700 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Card Front */}
                <div
                  className="absolute inset-0 backface-hidden bg-gradient-to-br from-white to-purple-50 rounded-lg p-4 shadow-md flex flex-col items-center text-center justify-center border-2 border-purple-200 overflow-hidden"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-t-lg"></div>
                  <div className="text-purple-600 font-black text-[9px] uppercase tracking-wider mb-3 bg-purple-100 px-2.5 py-0.5 rounded-full">{topicResource.topicName}</div>
                  <div className="flex-1 flex items-center justify-center w-full overflow-y-auto px-3">
                    <div className="text-base md:text-lg font-black text-slate-900 leading-tight">
                      <RenderWithMath text={cards[currentCard].term} showOptions={false} compact={false} serif={false} />
                    </div>
                  </div>
                  <div className="text-[8px] font-bold text-purple-500 uppercase tracking-wider flex items-center gap-1 mt-3 bg-purple-100/50 px-2.5 py-1 rounded-full">
                    <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse"></div> Click to reveal
                  </div>
                </div>

                {/* Card Back */}
                <div
                  className="absolute inset-0 backface-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-md flex flex-col border-2 border-slate-700 overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-t-lg"></div>

                  {/* Scrollable content area */}
                  <div className="flex-1 w-full overflow-y-auto px-4 pt-4 pb-10 scroller-hide">
                    <div className="flex flex-col items-center justify-center min-h-full space-y-3">
                      <div className="text-emerald-400 font-black text-[9px] uppercase tracking-wider bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">Answer</div>
                      <div className="text-xs md:text-sm font-bold text-white leading-relaxed text-center px-3">
                        <RenderWithMath text={cards[currentCard].definition} showOptions={false} autoSteps={true} dark={true} compact={false} serif={false} />
                      </div>
                      {cards[currentCard].context && (
                        <div className="text-[10px] text-emerald-200 font-medium italic bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                          {cards[currentCard].context}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom hint */}
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <div className="text-[8px] font-bold text-emerald-300 uppercase tracking-wider flex items-center justify-center gap-1 bg-emerald-500/20 px-2.5 py-1 rounded-full mx-auto w-fit">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div> Click to flip
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="group w-9 h-9 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-purple-700 hover:border-purple-500 hover:bg-purple-50 transition-all shadow-sm hover:shadow-md"
                >
                  <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="group w-9 h-9 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-purple-700 hover:border-purple-500 hover:bg-purple-50 transition-all shadow-sm hover:shadow-md"
                >
                  <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
            <CreditCard size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-600 font-medium mb-2">
              No flashcards available for this topic yet
            </p>
            <p className="text-[10px] text-slate-500 mb-4 max-w-md mx-auto">
              AI will create comprehensive flashcards covering key concepts, formulas, exam patterns, and problem-solving techniques from the official {topicResource.examContext} syllabus
            </p>
            <button
              onClick={generateFlashcards}
              disabled={isGenerating}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center gap-2 mx-auto text-sm shadow-md hover:shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating AI Flashcards...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate AI Flashcards
                </>
              )}
            </button>
            {sharedQuestions.length > 0 && (
              <p className="text-[9px] text-slate-400 mt-3">
                Using {sharedQuestions.length} questions + official syllabus
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ========== TAB 5: PROGRESS ==========
const ProgressTab: React.FC<{ topicResource: TopicResource }> = ({ topicResource }) => {
  return (
    <div className="space-y-6">
      {/* Mastery Overview */}
      <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
        <h2 className="font-black text-lg text-slate-900 mb-6">Mastery Overview</h2>
        <div className="flex items-center justify-center mb-6">
          <div className="group relative w-48 h-48">
            <svg className="transform -rotate-90 w-48 h-48 transition-transform duration-500 group-hover:scale-110">
              <circle cx="96" cy="96" r="88" stroke="#e2e8f0" strokeWidth="12" fill="none" />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="url(#purpleGradient)"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(topicResource.masteryLevel / 100) * 552.92} 552.92`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
              <defs>
                <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#7e22ce" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-700">{topicResource.masteryLevel}%</div>
              <div className="text-sm font-medium text-slate-600 transition-colors duration-300 group-hover:text-purple-600">Mastery</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="group text-center p-4 bg-slate-50 rounded-lg hover:bg-purple-50 hover:border hover:border-purple-200 transition-all duration-300 cursor-pointer">
            <div className="text-2xl font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-700">{topicResource.questionsAttempted}</div>
            <div className="text-xs font-medium text-slate-600 transition-colors duration-300 group-hover:text-purple-600">Questions Attempted</div>
          </div>
          <div className="group text-center p-4 bg-slate-50 rounded-lg hover:bg-purple-50 hover:border hover:border-purple-200 transition-all duration-300 cursor-pointer">
            <div className="text-2xl font-black text-slate-900 transition-colors duration-300 group-hover:text-purple-700">{topicResource.questionsCorrect}</div>
            <div className="text-xs font-medium text-slate-600 transition-colors duration-300 group-hover:text-purple-600">Questions Correct</div>
          </div>
        </div>
      </div>

      {/* Study Timeline */}
      <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
        <h2 className="font-black text-lg text-slate-900 mb-4">Study Timeline</h2>
        {topicResource.lastPracticed ? (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <Calendar size={20} className="text-slate-400" />
            <div>
              <div className="text-sm font-black text-slate-900">Last Practiced</div>
              <div className="text-xs text-slate-600">
                {new Date(topicResource.lastPracticed).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm font-medium">
            No practice history yet
          </div>
        )}
      </div>

      {/* Performance Insights */}
      <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
        <h2 className="font-black text-lg text-slate-900 mb-4">Performance Insights</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="font-black text-sm text-slate-900 mb-1">Strength</div>
              <div className="text-sm text-slate-600 font-medium">
                {topicResource.averageAccuracy >= 70
                  ? 'You have a strong grasp of this topic. Focus on maintaining consistency.'
                  : 'Continue practicing to improve your understanding.'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="font-black text-sm text-slate-900 mb-1">Recommendation</div>
              <div className="text-sm text-slate-600 font-medium">
                {topicResource.masteryLevel < 50
                  ? 'Review study notes and practice more questions to build foundation.'
                  : topicResource.masteryLevel < 85
                  ? 'Take adaptive quizzes to identify and strengthen weak areas.'
                  : 'Excellent work! Focus on maintaining mastery with periodic revision.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicDetailPage;
