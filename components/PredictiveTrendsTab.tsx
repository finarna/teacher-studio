/**
 * Predictive Trends Tab for Exam Analysis
 * Shows historical patterns, topic evolution, and predictions
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Target,
  Zap,
  Clock,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PredictiveTrendsTabProps {
  examContext: string;
  subject: string;
  currentYear?: string | number;
}

interface TopicTrend {
  dataPoints: Array<{
    year: number;
    questionCount: number;
    easyCount: number;
    moderateCount: number;
    hardCount: number;
  }>;
  growthRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  importance: 'high' | 'medium' | 'low';
  avgQuestions: number;
  latest: number;
  change: number;
}

const PredictiveTrendsTab: React.FC<PredictiveTrendsTabProps> = ({
  examContext,
  subject,
  currentYear
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    loadTrendsData();
  }, [examContext, subject]);

  async function loadTrendsData() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/trends/historical/${examContext}/${subject}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load trends data');
      }

      setData(result.data);
    } catch (err: any) {
      console.error('Error loading trends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Loading historical trends...</p>
        </div>
      </div>
    );
  }

  if (error || !data || data.patterns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Historical Data Available</h3>
          <p className="text-sm text-slate-500 mb-4">
            {error || 'Upload past year papers to see predictive trends and year-over-year analysis.'}
          </p>
        </div>
      </div>
    );
  }

  const { patterns, topicTrends, predictions, yearsAvailable, latestYear } = data;

  // Get top topics by importance
  const topicsByImportance = Object.entries(topicTrends)
    .sort(([, a]: any, [, b]: any) => {
      // Sort by importance then by average questions
      const importanceOrder = { high: 3, medium: 2, low: 1 };
      if (importanceOrder[a.importance] !== importanceOrder[b.importance]) {
        return importanceOrder[b.importance] - importanceOrder[a.importance];
      }
      return b.avgQuestions - a.avgQuestions;
    });

  return (
    <div className="h-full overflow-y-auto scroller-hide p-8 space-y-8 bg-slate-50/50">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-sm">
              <Clock size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Years Analyzed</span>
          </div>
          <div className="text-4xl font-black text-slate-900 font-outfit tracking-tighter">{yearsAvailable.length}</div>
          <div className="text-xs font-bold text-slate-400 mt-2 bg-slate-50 inline-block px-2 py-1 rounded-lg">
            {Math.min(...yearsAvailable)} — {Math.max(...yearsAvailable)} Repository
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-sm">
              <Target size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Concepts Tracked</span>
          </div>
          <div className="text-4xl font-black text-slate-900 font-outfit tracking-tighter">{Object.keys(topicTrends).length}</div>
          <div className="text-xs font-bold text-slate-400 mt-2 bg-slate-50 inline-block px-2 py-1 rounded-lg">
            Framework Mastery
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Ascending Topics</span>
          </div>
          <div className="text-4xl font-black text-slate-900 font-outfit tracking-tighter">
            {Object.values(topicTrends).filter((t: any) => t.trend === 'increasing').length}
          </div>
          <div className="text-xs font-bold text-slate-400 mt-2 bg-slate-50 inline-block px-2 py-1 rounded-lg">
            High Growth Probability
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-sm">
              <Award size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">High Rigor</span>
          </div>
          <div className="text-4xl font-black text-slate-900 font-outfit tracking-tighter">
            {Object.values(topicTrends).filter((t: any) => t.importance === 'high').length}
          </div>
          <div className="text-xs font-bold text-slate-400 mt-2 bg-slate-50 inline-block px-2 py-1 rounded-lg">
            Critical Domain Items
          </div>
        </motion.div>
      </div>

      {/* Year-over-Year Overview */}
      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <TrendingUp size={120} strokeWidth={3} />
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-3 font-outfit">
          <div className="p-2 bg-slate-900 text-white rounded-xl">
            <TrendingUp size={18} />
          </div>
          Difficulty Evolution Matrix
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={patterns}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" stroke="#64748b" style={{ fontSize: '12px' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} label={{ value: 'Percentage', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="difficulty_easy_pct" name="Easy" fill="#10b981" stackId="a" />
            <Bar dataKey="difficulty_moderate_pct" name="Moderate" fill="#f59e0b" stackId="a" />
            <Bar dataKey="difficulty_hard_pct" name="Hard" fill="#ef4444" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Topic Evolution Table */}
      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-3 font-outfit">
          <div className="p-2 bg-indigo-600 text-white rounded-xl">
            <Target size={18} />
          </div>
          Topic Evolution & Predictions
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="text-left py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Framework Topic</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trend</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Priority</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{yearsAvailable[0]}</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{latestYear}</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{latestYear + 1} EXAM</th>
                <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Δ Change</th>
              </tr>
            </thead>
            <tbody>
              {topicsByImportance.map(([topicId, trend]: [string, any]) => {
                const prediction = predictions.topics[topicId];
                const TrendIcon = trend.trend === 'increasing' ? TrendingUp : trend.trend === 'decreasing' ? TrendingDown : Minus;
                const trendColor = trend.trend === 'increasing' ? 'text-emerald-600' : trend.trend === 'decreasing' ? 'text-rose-600' : 'text-slate-400';
                const trendBg = trend.trend === 'increasing' ? 'bg-emerald-50' : trend.trend === 'decreasing' ? 'bg-rose-50' : 'bg-slate-50';
                const importanceColor = trend.importance === 'high' ? 'bg-rose-600 text-white' : trend.importance === 'medium' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700';

                return (
                  <motion.tr
                    key={topicId}
                    whileHover={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}
                    className="border-b border-slate-50 last:border-0 cursor-pointer transition-colors"
                    onClick={() => setSelectedTopic(selectedTopic === topicId ? null : topicId)}
                  >
                    <td className="py-5 px-4">
                      <div className="font-black text-slate-900 capitalize text-base tracking-tight">
                        {topicId.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="py-5 px-4 text-center">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${trendBg} ${trendColor}`}>
                        <TrendIcon size={14} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{trend.trend}</span>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${importanceColor}`}>
                        {trend.importance}
                      </span>
                    </td>
                    <td className="py-5 px-4 text-center font-bold text-slate-400">
                      {trend.dataPoints.find((d: any) => d.year === yearsAvailable[0])?.questionCount || 0}
                    </td>
                    <td className="py-5 px-4 text-center font-black text-slate-700 text-lg">
                      {trend.dataPoints.find((d: any) => d.year === latestYear)?.questionCount || 0}
                    </td>
                    <td className="py-5 px-4 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 shadow-inner">
                        <span className="font-black text-indigo-700 text-lg">{prediction?.predicted || '—'}</span>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-center">
                      {trend.change > 0 && (
                        <span className="text-emerald-600 font-black text-sm">+{trend.change}</span>
                      )}
                      {trend.change < 0 && (
                        <span className="text-rose-600 font-black text-sm">{trend.change}</span>
                      )}
                      {trend.change === 0 && (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-100 bg-indigo-50/30">
              <tr>
                <td className="py-4 px-4 font-black text-slate-900 uppercase tracking-widest text-[10px]">Total Items</td>
                <td colSpan={2}></td>
                <td className="py-4 px-4 text-center font-black text-slate-500">
                  {topicsByImportance.reduce((sum, [, t]: any) => {
                    const dp = t.dataPoints.find((d: any) => d.year === yearsAvailable[0]);
                    return sum + (dp?.questionCount || 0);
                  }, 0)}
                </td>
                <td className="py-4 px-4 text-center font-black text-slate-900 text-lg">
                  {topicsByImportance.reduce((sum, [, t]: any) => {
                    const dp = t.dataPoints.find((d: any) => d.year === latestYear);
                    return sum + (dp?.questionCount || 0);
                  }, 0)}
                </td>
                <td className="py-4 px-4 text-center font-black text-indigo-700 text-lg">
                  {predictions.totalPredicted || topicsByImportance.reduce((sum, [topicId]) => {
                    return sum + (predictions.topics[topicId]?.predicted || 0);
                  }, 0)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Detailed Topic Chart (if selected) */}
      <AnimatePresence>
        {selectedTopic && topicTrends[selectedTopic] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black uppercase tracking-tight capitalize flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-500 rounded-full" />
                {selectedTopic.replace(/_/g, ' ')} Historical Depth
              </h3>
              <button
                onClick={() => setSelectedTopic(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Minus size={24} />
              </button>
            </div>

            <div className="bg-white/5 rounded-3xl p-6 backdrop-blur-sm border border-white/10">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={topicTrends[selectedTopic].dataPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="year" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '10px', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '10px', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }} />
                  <Line type="monotone" dataKey="questionCount" name="Frequency" stroke="#6366f1" strokeWidth={4} dot={{ fill: '#6366f1', r: 6, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="easyCount" name="Easy" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="hardCount" name="Hard" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-indigo-500 text-white rounded-lg">
                <Zap size={20} />
              </div>
              <p className="text-base font-medium text-slate-300 leading-relaxed">
                <span className="text-white font-black uppercase text-xs tracking-widest block mb-1">AI Logic Bias</span>
                {predictions.topics[selectedTopic]?.basis}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Study Recommendations */}
      <div className="bg-white border-2 border-slate-900 rounded-[2.5rem] p-10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 shadow-inner" />
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-10 flex items-center gap-4 font-outfit relative">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
            <Award size={24} />
          </div>
          Strategic Command Center
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative">
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-6 bg-rose-600 rounded-full" />
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">High Rigor Targets</h4>
            </div>
            <ul className="space-y-4">
              {topicsByImportance
                .filter(([, trend]: any) => trend.importance === 'high')
                .slice(0, 3)
                .map(([topicId, trend]: [string, any]) => {
                  const prediction = predictions.topics[topicId];
                  return (
                    <motion.li
                      whileHover={{ x: 4 }}
                      key={topicId}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                          <Target size={18} strokeWidth={2.5} />
                        </div>
                        <span className="capitalize font-black text-slate-900 text-sm tracking-tight">{topicId.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded tracking-tighter mb-1 whitespace-nowrap">PREDICTED {prediction?.predicted || 0}Q</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">High Priority</span>
                      </div>
                    </motion.li>
                  );
                })}
            </ul>
          </div>
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-6 bg-emerald-600 rounded-full" />
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Momentum Concepts</h4>
            </div>
            <ul className="space-y-4">
              {topicsByImportance
                .filter(([, trend]: any) => trend.trend === 'increasing')
                .slice(0, 3)
                .map(([topicId, trend]: [string, any]) => {
                  const latest = trend.dataPoints.find((d: any) => d.year === latestYear)?.questionCount || 0;
                  const predicted = predictions.topics[topicId]?.predicted || 0;
                  const diff = predicted - latest;

                  return (
                    <motion.li
                      whileHover={{ x: 4 }}
                      key={topicId}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <TrendingUp size={18} strokeWidth={2.5} />
                        </div>
                        <span className="capitalize font-black text-slate-900 text-sm tracking-tight">{topicId.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-emerald-600 mb-1">
                          <TrendingUp size={12} strokeWidth={3} />
                          <span className="text-[10px] font-black">Predicted Rise</span>
                        </div>
                        <span className="text-[11px] font-black text-slate-900">+{Math.max(0, diff)} Questions</span>
                      </div>
                    </motion.li>
                  );
                })}
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PredictiveTrendsTab;
