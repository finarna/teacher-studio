import React, { useState, useEffect } from 'react';
import {
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
  Leaf
} from 'lucide-react';
import type { Subject, ExamContext, Scan } from '../types';
import { SUBJECT_CONFIGS } from '../config/subjects';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import LearningJourneyHeader from './learning-journey/LearningJourneyHeader';

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
    bloomsDistribution: { name: string; percentage: number }[];
    topDomains: { name: string; marks: number }[];
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
        const { data: scansData, error: scansError } = await supabase
          .from('scans')
          .select('id, name, created_at, status, subject, grade, exam_context, year, analysis_data')
          .eq('subject', subject)
          .eq('exam_context', examContext)
          .not('year', 'is', null); // Only scans with year field

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
      }, {} as Record<string, typeof mappedScans>);

      console.log('📅 [PAST YEAR] Years found:', Object.keys(scansByYear));

      // Process all years
      const yearDataPromises = Object.entries(scansByYear).map(([year, scans]) => {
        let totalQuestions = 0;
        let solvedQuestions = 0;

        // Process each scan and get questions from analysis_data
        const scansWithAnalysis: ScanWithAnalysis[] = scans.map(scan => {
          const scanQuestions = scan.analysis_data?.questions || [];
          const scanSolvedCount = scanQuestions.filter((q: any) =>
            solvedQuestionIds.has(`${scan.id}-${q.id}`)
          ).length;

          totalQuestions += scanQuestions.length;
          solvedQuestions += scanSolvedCount;

          // Calculate insights from analysis_data
          const totalMarks = scanQuestions.reduce((sum: number, q: any) => sum + (Number(q.marks) || 1), 0);

          // Blooms distribution
          const bloomsCounts: Record<string, number> = {};
          scanQuestions.forEach((q: any) => {
            const blooms = q.blooms || 'Understanding';
            bloomsCounts[blooms] = (bloomsCounts[blooms] || 0) + 1;
          });
          const bloomsDistribution = Object.entries(bloomsCounts).map(([name, count]) => ({
            name,
            percentage: Math.round((count / scanQuestions.length) * 100)
          })).sort((a, b) => b.percentage - a.percentage);

          // Domain distribution
          const domainMarks: Record<string, number> = {};
          scanQuestions.forEach((q: any) => {
            const domain = q.domain || 'General';
            domainMarks[domain] = (domainMarks[domain] || 0) + (Number(q.marks) || 1);
          });
          const topDomains = Object.entries(domainMarks)
            .map(([name, marks]) => ({ name, marks }))
            .sort((a, b) => b.marks - a.marks)
            .slice(0, 3);

          return {
            ...scan,
            questionsCount: scanQuestions.length,
            solvedCount: scanSolvedCount,
            analysisInsights: {
              totalMarks,
              avgDifficulty: 0, // Can calculate from difficulty distribution if needed
              bloomsDistribution,
              topDomains
            }
          };
        });

        const progress = totalQuestions > 0 ? (solvedQuestions / totalQuestions) * 100 : 0;

        return {
          year,
          scans: scansWithAnalysis,
          totalQuestions,
          solvedQuestions,
          progress
        };
      });

      // OPTIMIZATION: All processing is now synchronous, no await needed
      const resolvedYearData = yearDataPromises;

      // Sort by year descending
      resolvedYearData.sort((a, b) => parseInt(b.year) - parseInt(a.year));

      setYearData(resolvedYearData);

      // Trigger confetti for 100% complete years
      resolvedYearData.forEach(yd => {
        if (yd.progress === 100 && yd.totalQuestions > 0) {
          // Small confetti burst
          confetti({
            particleCount: 30,
            spread: 60,
            origin: { y: 0.7 }
          });
        }
      });
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
  const overallProgress = totalQuestions > 0 ? (totalSolved / totalQuestions) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Unified Header */}
      <LearningJourneyHeader
        showBack
        onBack={onBack}
        icon={<Calendar size={24} className="text-white" />}
        title="Past Year Exams"
        subtitle={`${subject} • ${examContext}`}
        description="Browse and solve previous exam papers with detailed explanations"
        subject={subject}
        trajectory={examContext}
        actions={
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wide font-bold">
              Overall Progress
            </div>
            <div className="text-lg font-black text-slate-900 font-outfit">
              {totalSolved}/{totalQuestions}
            </div>
          </div>
        }
      />

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Combined Filter & Stats Bar */}
        {yearData.length > 0 && (
          <div className="mb-6 bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-6 flex-wrap">
              {/* Left - Filter */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-outfit">Filter:</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-instrument"
                >
                  <option value="all">All Years</option>
                  {yearData.map(yd => (
                    <option key={yd.year} value={yd.year}>
                      {yd.year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-slate-200"></div>

              {/* Right - Stats */}
              <div className="flex items-center gap-6 ml-auto">
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-900 font-outfit">
                    {yearData.length}
                  </div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    Years
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-900 font-outfit">
                    {totalQuestions}
                  </div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    Questions
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-blue-600 font-outfit">
                    {Math.round(overallProgress)}%
                  </div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    Progress
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={48} className="text-blue-600 animate-spin" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredYearData.flatMap((yd) =>
              yd.scans.map((scan) => {
                const progressPercent = scan.questionsCount > 0
                  ? (scan.solvedCount / scan.questionsCount) * 100
                  : 0;
                const isCompleted = progressPercent === 100;

                return (
                  <button
                    key={scan.id}
                    onClick={() => onOpenVault(scan)}
                    className="group relative bg-white rounded-xl border border-slate-200/60 hover:border-slate-300 transition-all duration-200 text-left shadow-sm hover:shadow-lg overflow-hidden"
                  >
                    {/* Card Content - Compact Stat-Card Style */}
                    <div className="p-4">
                      {/* Year Badge - Top Left */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
                          <Calendar size={14} className="text-blue-600" />
                          <span className="text-sm font-black text-blue-900">{yd.year}</span>
                        </div>
                        {isCompleted && (
                          <div className="text-green-600 text-lg">✓</div>
                        )}
                      </div>

                      {/* Stats - Large Numbers */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-center">
                          <div className="text-2xl font-black text-slate-900 font-outfit transition-colors duration-300 group-hover:text-blue-600">
                            {scan.questionsCount}
                          </div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            Questions
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-black font-outfit transition-colors duration-300 ${
                            isCompleted ? 'text-green-600' : 'text-slate-900 group-hover:text-blue-600'
                          }`}>
                            {scan.solvedCount}
                          </div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            Solved
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-slate-900 font-outfit transition-colors duration-300 group-hover:text-blue-600">
                            {scan.analysisInsights?.totalMarks || 0}M
                          </div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            Marks
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCompleted
                                ? 'bg-gradient-to-r from-green-500 to-green-600'
                                : 'bg-gradient-to-r from-blue-500 to-blue-600'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* View Button */}
                      <div className="flex items-center justify-center gap-2 text-blue-600 font-bold text-sm transition-colors duration-200 group-hover:text-blue-700">
                        <span>View Vault</span>
                        <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default PastYearExamsPage;
