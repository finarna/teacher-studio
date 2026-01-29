/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V2 - INSIGHT CARD COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Rich data visualization card for displaying analytics and insights
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, PieChart, LineChart } from 'lucide-react';
import { VidyaInsightData } from '../../types/vidya';

interface InsightCardProps {
  data: VidyaInsightData;
}

const InsightCard: React.FC<InsightCardProps> = ({ data }) => {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4 mt-2 shadow-sm">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        {getChartIcon(data.chart?.type)}
        <h4 className="font-bold text-slate-900 text-sm">{data.title}</h4>
      </div>

      {/* Metrics Grid */}
      {data.metrics && data.metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          {data.metrics.map((metric, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg p-3 border border-slate-200"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500 font-medium">
                  {metric.label}
                </span>
                {metric.trend && getTrendIcon(metric.trend)}
              </div>
              <div className="text-lg font-black text-slate-900">
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart Visualization */}
      {data.chart && (
        <div className="bg-white rounded-lg p-3 border border-slate-200 mb-3">
          {renderChart(data.chart)}
        </div>
      )}

      {/* Summary Text */}
      {data.summary && (
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          {data.summary}
        </p>
      )}

      {/* Action Buttons */}
      {data.actions && data.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.actions.map((action) => (
            <button
              key={action.id}
              onClick={action.handler}
              disabled={action.disabled}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                ${getActionButtonStyles(action.variant)}
                ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
              `}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Get chart icon based on type
 */
function getChartIcon(type?: 'bar' | 'line' | 'pie' | 'doughnut') {
  switch (type) {
    case 'bar':
      return <BarChart3 className="w-4 h-4 text-primary-600" />;
    case 'line':
      return <LineChart className="w-4 h-4 text-primary-600" />;
    case 'pie':
    case 'doughnut':
      return <PieChart className="w-4 h-4 text-primary-600" />;
    default:
      return <BarChart3 className="w-4 h-4 text-primary-600" />;
  }
}

/**
 * Get trend icon
 */
function getTrendIcon(trend: 'up' | 'down' | 'neutral') {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-3 h-3 text-green-600" />;
    case 'down':
      return <TrendingDown className="w-3 h-3 text-red-600" />;
    case 'neutral':
      return <Minus className="w-3 h-3 text-slate-400" />;
  }
}

/**
 * Get action button styles based on variant
 */
function getActionButtonStyles(variant: 'primary' | 'secondary' | 'ghost' | 'danger'): string {
  switch (variant) {
    case 'primary':
      return 'bg-primary-600 text-white hover:bg-primary-700';
    case 'secondary':
      return 'bg-slate-200 text-slate-900 hover:bg-slate-300';
    case 'ghost':
      return 'bg-transparent text-primary-600 hover:bg-primary-50 border border-primary-300';
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700';
  }
}

/**
 * Render chart visualization
 */
function renderChart(chart: { type: string; data: any }) {
  // Simple text-based visualization for now
  // In production, could integrate Chart.js or similar library

  if (chart.type === 'bar' && Array.isArray(chart.data)) {
    const max = Math.max(...chart.data.map((d: any) => d.marks || d.count || d.value || 0));

    return (
      <div className="space-y-2">
        {chart.data.slice(0, 5).map((item: any, idx: number) => {
          const value = item.marks || item.count || item.value || 0;
          const percentage = max > 0 ? (value / max) * 100 : 0;

          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700">{item.name}</span>
                <span className="font-bold text-slate-900">{value}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (chart.type === 'pie' && typeof chart.data === 'object') {
    const entries = Object.entries(chart.data as Record<string, number>);
    const total = entries.reduce((sum, [, value]) => sum + (value as number), 0);

    return (
      <div className="space-y-2">
        {entries.map(([key, value], idx) => {
          const percentage = total > 0 ? ((value as number / total) * 100).toFixed(1) : 0;
          const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500'];

          return (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`} />
                <span className="text-xs font-medium text-slate-700">{key}</span>
              </div>
              <span className="text-xs font-bold text-slate-900">{percentage}%</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: display as JSON
  return (
    <pre className="text-xs text-slate-600 overflow-x-auto">
      {JSON.stringify(chart.data, null, 2)}
    </pre>
  );
}

export default InsightCard;
