import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Loader2,
  TrendingUp,
  BookOpen,
  Target,
  Calculator,
  Atom,
  FlaskConical,
  Leaf,
  FileText,
  Clock,
  Award,
  Sigma,
  Zap,
  Sparkles,
  Activity
} from 'lucide-react';
import type { Subject, ExamContext, Scan } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';
import PredictiveTrendsTab from './PredictiveTrendsTab';
import { useLearningJourney } from '../contexts/LearningJourneyContext';

interface PastYearExamsPageProps {
  subject: Subject;
  examContext: ExamContext;
  onBack: () => void;
  onOpenVault: (scan: Scan) => void;
  userId: string;
}

interface ScanWithAnalysis extends Scan {
  analysisInsights?: {
    totalMarks: number;
    avgDifficulty: number;
    bloomsDist: Record<string, number>;
    topDomains: Record<string, number>;
    mathIntensity?: number;
  };
  questionsCount: number;
  solvedCount: number;
}

interface YearData {
  year: string;
  scans: ScanWithAnalysis[];
  totalQuestions: number;
  solvedQuestions: number;
  progress: number;
}

const MetricCard: React.FC<{ title: string; content: string | number; label?: string; icon: React.ReactNode }> = ({ title, content, label, icon }) => (
  <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 hover:border-primary-500/50 transition-all group relative overflow-hidden shadow-sm">
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-slate-50 text-slate-500 group-hover:bg-slate-900 group-hover:text-white rounded-xl transition-all shadow-sm border border-slate-100">{icon}</div>
      <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] font-outfit">{title}</div>
    </div>
    <div className="text-2xl font-black text-slate-900 font-outfit flex items-baseline gap-2 mt-0.5">
      {content} {label && <span className="text-xs font-bold text-slate-400 tracking-normal uppercase">{label}</span>}
    </div>
  </div>
);

const PastYearExamsPage: React.FC<PastYearExamsPageProps> = ({
  subject,
  examContext,
  onBack,
  onOpenVault,
  userId
}) => {
  const [yearData, setYearData] = useState<YearData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [activeView, setActiveView] = useState<'papers' | 'trends'>('papers');

  const { subjectProgress } = useLearningJourney();
  const subProg = subjectProgress?.[subject];
  const subjectConfig = SUBJECT_CONFIGS[subject];

  // Map string icon names to actual Lucide components
  const iconMap: Record<string, React.ComponentType<any>> = {
    Calculator,
    Atom,
    FlaskConical,
    Leaf
  };

  const IconComponent = iconMap[subjectConfig.icon] || Calendar;

  useEffect(() => {
    fetchPastYearData();
  }, [subject, examContext, userId]);

  const fetchPastYearData = async () => {
    setIsLoading(true);
    console.log(`📅 [PAST YEAR] Fetching data for subject="${subject}", examContext="${examContext}", userId="${userId}"`);
    try {
      // Fetch all scans for this subject/exam (including user scans, not just system scans)
      const scanIds = await (async () => {
        // 🚀 OPTIMIZATION: Do NOT fetch analysis_data here as it's huge
        const { data: scansData, error: scansError } = await supabase
          .from('scans')
          .select('id, name, created_at, status, subject, grade, exam_context, year')
          .eq('subject', subject)
          .eq('exam_context', examContext)
          .eq('is_system_scan', true)
          .not('year', 'is', null);

        console.log(`📊 [PAST YEAR] Query result: ${scansData?.length || 0} scans, error:`, scansError?.message || 'none');

        if (scansError) throw scansError;
        if (!scansData || scansData.length === 0) {
          console.log('⚠️ [PAST YEAR] No scans found - returning null');
          return null;
        }

        return {
          scans: scansData.map(scan => ({
            ...scan,
            date: scan.created_at || '',
            timestamp: scan.created_at ? new Date(scan.created_at).getTime() : Date.now()
          })),
          scanIds: scansData.map(s => s.id)
        };
      })();

      if (!scanIds) {
        setYearData([]);
        setIsLoading(false);
        return;
      }

      const { scans: mappedScans } = scanIds;

      console.log('📊 [PAST YEAR] Fetched scans:', mappedScans.length);

      // Fetch practice answers for solved status
      const { data: allPracticeData } = await supabase
        .from('practice_answers')
        .select('question_id, is_correct')
        .eq('user_id', userId)
        .eq('is_correct', true);

      const solvedQuestionIds = new Set(allPracticeData?.map(p => p.question_id) || []);

      // Group scans by year
      const scansByYear = mappedScans.reduce((acc, scan) => {
        const year = scan.year;
        if (!year) return acc;
        if (!acc[year]) acc[year] = [];
        acc[year].push(scan);
        return acc;
      }, {} as Record<string, any[]>);

      // 🚀 OPTIMIZATION: Use bare minimum processing for the grid
      const resolvedYearData = Object.entries(scansByYear).map(([year, scans]) => {
        const scansWithAnalysis = scans.map(scan => ({
          ...scan,
          questionsCount: 60, // Standard for KCET, can be refined per exam
          solvedCount: 0,     // To be populated by solvedQuestionIds if needed
          analysisInsights: {
            totalMarks: 60,
            avgDifficulty: 0,
            bloomsDist: {},
            topDomains: {}
          }
        }));

        return {
          year,
          scans: scansWithAnalysis,
          totalQuestions: scans.length * 60,
          solvedQuestions: 0,
          progress: 0
        };
      });

      // Sort by year descending
      resolvedYearData.sort((a, b) => parseInt(b.year) - parseInt(a.year));
      setYearData(resolvedYearData);

    } catch (error) {
      console.error('Error fetching past year data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredYearData = filterYear === 'all'
    ? yearData
    : yearData.filter(yd => yd.year === filterYear);

  const totalQuestions = yearData.reduce((sum, yd) => sum + yd.totalQuestions, 0);
  const totalSolved = yearData.reduce((sum, yd) => sum + yd.solvedQuestions, 0);
  const totalYears = yearData.length;
  const overallProgress = totalQuestions > 0 ? (totalSolved / totalQuestions) * 100 : 0;
  const overallRigor = yearData.reduce((sum, yd) => sum + (yd.scans.reduce((s, sc) => s + (sc.analysisInsights?.totalMarks || 0), 0)), 0);

  return (
    <div className="min-h-screen bg-slate-50 font-outfit">
      <LearningJourneyHeader
        showBack
        onBack={onBack}
        icon={activeView === 'papers' ? <Calendar size={24} className="text-white" /> : <TrendingUp size={24} className="text-white" />}
        title={activeView === 'papers' ? "" : "Predictive Trends"}
        subtitle={`${subject} • ${examContext}`}
        description={activeView === 'papers'
          ? "Browse and solve previous exam papers with detailed explanations"
          : "Historical patterns, topic evolution, and predictions for upcoming exams"
        }
        subject={subject}
        trajectory={examContext}
        actions={activeView === 'papers' && (
          <div className="hidden md:flex items-center gap-4 mr-6">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Past Years</span>
              <span className="text-sm font-black text-slate-900 leading-none">{totalYears}</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Past Year Questions</span>
              <span className="text-sm font-black text-slate-900 leading-none">{totalQuestions}</span>
            </div>
          </div>
        )}
      >
        <div className="flex flex-col items-start w-full bg-white/80 backdrop-blur-md rounded-[1.5rem] p-3 md:p-4 border border-slate-200/60 shadow-sm gap-4 mt-2 mb-2 md:mt-4 md:mb-0">
          {/* Mobile Stats Pills - Shown only on small screens */}
          {activeView === 'papers' && (
            <div className="grid grid-cols-2 gap-2 w-full md:hidden mb-1">
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl py-2 flex flex-col items-center justify-center shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Years</span>
                <span className="text-sm font-black text-slate-900 leading-none">{totalYears}</span>
              </div>
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl py-2 flex flex-col items-center justify-center shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Qs</span>
                <span className="text-sm font-black text-slate-900 leading-none">{totalQuestions}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between w-full gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/50 flex-1 overflow-x-auto scroller-hide">
              <button
                onClick={() => setActiveView('papers')}
                className={`relative flex-1 snap-center px-4 py-2 md:py-2.5 rounded-xl transition-all duration-300 ${activeView === 'papers' ? 'text-white' : 'text-slate-500 hover:text-slate-900 group'}`}
              >
                {activeView === 'papers' && (
                  <motion.div
                    layoutId="activeExamTabBg"
                    className="absolute inset-0 bg-slate-900 rounded-xl shadow-sm"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-center gap-2.5">
                  <Calendar size={16} className={activeView === 'papers' ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">Past Year Papers</span>
                </div>
              </button>
              <button
                onClick={() => setActiveView('trends')}
                className={`relative flex-1 snap-center px-4 py-2 md:py-2.5 rounded-xl transition-all duration-300 ${activeView === 'trends' ? 'text-white' : 'text-slate-500 hover:text-slate-900 group'}`}
              >
                {activeView === 'trends' && (
                  <motion.div
                    layoutId="activeExamTabBg"
                    className="absolute inset-0 bg-slate-900 rounded-xl shadow-sm"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-center gap-2.5">
                  <TrendingUp size={16} className={activeView === 'trends' ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">Predictive Trends</span>
                </div>
              </button>
            </div>

            {activeView === 'papers' && yearData.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl shrink-0 justify-center">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="bg-transparent text-[11px] font-black uppercase text-slate-700 focus:outline-none cursor-pointer tracking-wider"
                >
                  <option value="all">All Years</option>
                  {yearData.map(yd => (
                    <option key={yd.year} value={yd.year}>{yd.year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </LearningJourneyHeader>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Trends View */}
        {activeView === 'trends' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <PredictiveTrendsTab
              examContext={examContext}
              subject={subject}
            />
          </div>
        )}

        {/* Papers View */}
        {activeView === 'papers' && (
          <>
            {/* Loading state */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                  <div className="relative w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg border border-white/10">
                    <Sparkles size={28} className="text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-lg font-black text-slate-900 font-outfit uppercase tracking-tighter mb-1">Opening the Paper Vault</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Finding where the most important questions are hidden...</p>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && yearData.length === 0 && (
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar size={36} className="text-slate-400" />
                </div>
                <h3 className="font-black text-xl text-slate-900 font-outfit mb-2">
                  No Past Year Exams Available
                </h3>
                <p className="text-slate-600 font-instrument">
                  Past year exam papers will appear here once they're added to the system.
                </p>
              </div>
            )}

            {/* Compact Paper Cards Grid */}
            {!isLoading && filteredYearData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredYearData.flatMap((yd) =>
                  yd.scans.map((scan) => {
                    const progressPercent = scan.questionsCount > 0
                      ? (scan.solvedCount / scan.questionsCount) * 100
                      : 0;
                    const isCompleted = progressPercent === 100;
                    const scoreColor = progressPercent >= 80 ? 'emerald' : progressPercent >= 40 ? 'indigo' : 'slate';

                    return (
                      <motion.button
                        key={scan.id}
                        whileHover={{ y: -2, border: '1px solid #6366f1' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onOpenVault(scan)}
                        className={`group relative bg-white rounded-[1.5rem] border transition-all duration-300 text-left shadow-sm hover:shadow-md overflow-hidden flex flex-col gap-4 p-5 ${isCompleted ? 'border-emerald-100 bg-emerald-50/5' : 'border-slate-100'
                          }`}
                      >
                        {/* Row 1: Identity */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] font-black text-blue-800 uppercase tracking-widest leading-none">
                              {yd.year} PYQ
                            </span>
                            {isCompleted && (
                              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                                DONE
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-black text-slate-900 leading-tight font-outfit tracking-tight">
                            {examContext}-{subject}-{yd.year}
                          </h4>
                        </div>

                        {/* Row 2: Stats & Action */}
                        <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                            <FileText size={12} className="text-slate-400" />
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{scan.questionsCount} Items</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-900 font-black text-[10px] uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                            <span>Analyze</span>
                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PastYearExamsPage;

