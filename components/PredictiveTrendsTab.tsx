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
    <div className="h-full overflow-y-auto scroller-hide p-6 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock size={18} />
            </div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Years Analyzed</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{yearsAvailable.length}</div>
          <div className="text-xs text-slate-500 mt-1">
            {Math.min(...yearsAvailable)} - {Math.max(...yearsAvailable)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Target size={18} />
            </div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Topics Tracked</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{Object.keys(topicTrends).length}</div>
          <div className="text-xs text-slate-500 mt-1">
            Across all years
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp size={18} />
            </div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Increasing Topics</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {Object.values(topicTrends).filter((t: any) => t.trend === 'increasing').length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Growing in importance
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Award size={18} />
            </div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">High Priority</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {Object.values(topicTrends).filter((t: any) => t.importance === 'high').length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            12+ questions consistently
          </div>
        </div>
      </div>

      {/* Year-over-Year Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp size={16} />
          Year-over-Year Difficulty Distribution
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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target size={16} />
          Topic Evolution & Predictions
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Topic</th>
                <th className="text-center py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Trend</th>
                <th className="text-center py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Importance</th>
                <th className="text-center py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">{yearsAvailable[0]}</th>
                <th className="text-center py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">{latestYear}</th>
                <th className="text-center py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">{latestYear + 1} Prediction</th>
                <th className="text-center py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Change</th>
              </tr>
            </thead>
            <tbody>
              {topicsByImportance.map(([topicId, trend]: [string, any]) => {
                const prediction = predictions.topics[topicId];
                const TrendIcon = trend.trend === 'increasing' ? TrendingUp : trend.trend === 'decreasing' ? TrendingDown : Minus;
                const trendColor = trend.trend === 'increasing' ? 'text-green-600' : trend.trend === 'decreasing' ? 'text-red-600' : 'text-slate-400';
                const importanceColor = trend.importance === 'high' ? 'bg-red-100 text-red-700' : trend.importance === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600';
                const firstYear = trend.dataPoints[0]?.questionCount || 0;

                return (
                  <tr
                    key={topicId}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTopic(selectedTopic === topicId ? null : topicId)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 capitalize">
                        {topicId.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className={`inline-flex items-center gap-1 ${trendColor}`}>
                        <TrendIcon size={16} />
                        <span className="text-xs font-bold capitalize">{trend.trend}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase ${importanceColor}`}>
                        {trend.importance}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {firstYear}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {trend.latest}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Zap size={14} className="text-accent-600" />
                        <span className="font-bold text-accent-600">{prediction?.predicted || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {trend.change > 0 && (
                        <span className="text-green-600 font-bold">+{trend.change}</span>
                      )}
                      {trend.change < 0 && (
                        <span className="text-red-600 font-bold">{trend.change}</span>
                      )}
                      {trend.change === 0 && (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Topic Chart (if selected) */}
      {selectedTopic && topicTrends[selectedTopic] && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 capitalize">
            {selectedTopic.replace(/_/g, ' ')} - Detailed Evolution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={topicTrends[selectedTopic].dataPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} label={{ value: 'Questions', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="questionCount" name="Total Questions" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} />
              <Line type="monotone" dataKey="easyCount" name="Easy" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="moderateCount" name="Moderate" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="hardCount" name="Hard" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              <strong>Prediction for {latestYear + 1}:</strong> {predictions.topics[selectedTopic]?.basis}
            </p>
          </div>
        </div>
      )}

      {/* Study Recommendations */}
      <div className="bg-gradient-to-br from-accent-50 to-white border border-accent-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Award size={16} />
          Smart Study Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-bold text-red-700 uppercase mb-2">🔥 High Priority Topics</h4>
            <ul className="space-y-2">
              {topicsByImportance
                .filter(([, trend]: any) => trend.importance === 'high')
                .slice(0, 3)
                .map(([topicId, trend]: [string, any]) => (
                  <li key={topicId} className="text-sm text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="capitalize font-medium">{topicId.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-slate-500">({trend.avgQuestions}Q avg)</span>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-green-700 uppercase mb-2">📈 Growing Topics</h4>
            <ul className="space-y-2">
              {topicsByImportance
                .filter(([, trend]: any) => trend.trend === 'increasing')
                .slice(0, 3)
                .map(([topicId, trend]: [string, any]) => (
                  <li key={topicId} className="text-sm text-slate-700 flex items-center gap-2">
                    <TrendingUp size={14} className="text-green-600" />
                    <span className="capitalize font-medium">{topicId.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-slate-500">(+{Math.abs(trend.change)} questions)</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveTrendsTab;
