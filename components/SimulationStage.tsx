import React, { useState, useMemo } from 'react';
import { Sliders, Maximize, Calculator, LineChart as ChartIcon, Triangle, FlaskConical, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SimulationInput {
  name: string;
  label: string;
  min: number;
  max: number;
  unit: string;
}

interface SimulationStageProps {
  initialParams?: any;
  content: {
    formula: string;
    inputs: SimulationInput[];
    outputLabel: string;
    imageUrl?: string;
    visualMode?: 'chart' | 'geometry' | 'science_lab';
    visualPrompt?: string;
  };
  onNext: () => void;
  onUpdateScore: (points: number) => void;
}

const SimulationStage: React.FC<SimulationStageProps> = ({ content, onNext, onUpdateScore }) => {
  const [params, setParams] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    if (content.inputs) {
      content.inputs.forEach(input => {
        defaults[input.name] = (input.min + input.max) / 2;
      });
    }
    return defaults;
  });

  const calculateResult = (p: Record<string, number>) => {
    try {
      if (!content.formula) return 0;

      const keys = Object.keys(p);
      const values = keys.map(k => p[k]);

      const positionalKeys = ['x', 'y', 'z', 'w'];
      const positionalValues = values.slice(0, positionalKeys.length);

      const allKeys = [...keys, ...positionalKeys.slice(0, values.length)];
      const allValues = [...values, ...positionalValues];

      const mathConstants = `
        const sin = Math.sin;
        const cos = Math.cos;
        const tan = Math.tan;
        const PI = Math.PI;
        const toRad = (deg) => deg * Math.PI / 180;
        const exp = Math.exp;
        const log = Math.log;
        const sqrt = Math.sqrt;
        const pow = Math.pow;
        const abs = Math.abs;
      `;

      const fn = new Function(...allKeys, `${mathConstants} return (${content.formula});`);
      const res = fn(...allValues);
      return typeof res === 'number' && !isNaN(res) ? Number(res.toFixed(2)) : 0;
    } catch (e) {
      console.error("Simulation Eval Error:", e);
      return 0;
    }
  };

  const result = useMemo(() => calculateResult(params), [params, content.formula]);

  const renderChart = () => {
    const chartData = useMemo(() => {
      if (!content.inputs || content.inputs.length === 0) return [];
      const mainVar = content.inputs[0];
      const data = [];
      const step = (mainVar.max - mainVar.min) / 10;
      for (let i = 0; i <= 10; i++) {
        const val = mainVar.min + (i * step);
        const testParams = { ...params, [mainVar.name]: val };
        data.push({
          name: val.toFixed(1),
          value: calculateResult(testParams)
        });
      }
      return data;
    }, [params, content]);

    return (
      <div className="flex-1 min-h-[350px] bg-white rounded-2xl p-6 border border-slate-100 shadow-lg group/chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" tick={{ fontWeight: 800 }} axisLine={false} tickLine={false} />
            <YAxis fontSize={10} stroke="#94a3b8" tick={{ fontWeight: 800 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ backgroundColor: '#fff', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={32}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value < 0 ? '#f43f5e' : '#6991ff'} opacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderGeometry = () => {
    const inputs = content.inputs;
    if (!inputs || inputs.length < 2) return <div className="text-slate-400">Geometry requires 2 inputs</div>;

    const baseVal = params[inputs[0].name] || 50;
    const angleVal = params[inputs[1].name] || 45;

    const MAX_WIDTH = 450;
    const MAX_HEIGHT = 350;
    const PADDING_BOTTOM = 380;
    const PADDING_LEFT = 50;

    const virtualBase = baseVal;
    const angleRad = (angleVal * Math.PI) / 180;
    const virtualHeight = virtualBase * Math.tan(angleRad);

    const scaleX = MAX_WIDTH / Math.max(virtualBase, 1);
    const scaleY = MAX_HEIGHT / Math.max(virtualHeight, 1);
    const scale = Math.min(scaleX, scaleY);

    const drawBase = virtualBase * scale;
    const drawHeight = virtualHeight * scale;

    const v1 = { x: PADDING_LEFT, y: PADDING_BOTTOM };
    const v2 = { x: PADDING_LEFT + drawBase, y: PADDING_BOTTOM };
    const v3 = { x: PADDING_LEFT, y: PADDING_BOTTOM - drawHeight };

    const arcRadius = 50;
    const hypotenuseLen = Math.sqrt(drawBase * drawBase + drawHeight * drawHeight);
    const effectiveArcRadius = Math.min(arcRadius, drawBase * 0.6, hypotenuseLen * 0.4);

    const arcStart = { x: v2.x - effectiveArcRadius, y: v2.y };
    const arcEnd = {
      x: v2.x - effectiveArcRadius * Math.cos(angleRad),
      y: v2.y - effectiveArcRadius * Math.sin(angleRad)
    };

    const labelDist = effectiveArcRadius + 30;
    const halfAngle = angleRad / 2;
    const labelPos = {
      x: v2.x - labelDist * Math.cos(halfAngle),
      y: v2.y - labelDist * Math.sin(halfAngle)
    };

    return (
      <div className="flex-1 min-h-[400px] flex items-center justify-center relative bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden bg-[linear-gradient(#f1f5f9_1px,transparent_1px),linear-gradient(90deg,#f1f5f9_1px,transparent_1px)] bg-[size:30px_30px]">
        <svg width="100%" height="100%" viewBox="0 0 600 500" className="overflow-visible drop-shadow-2xl">
          <line x1="0" y1={v1.y} x2="600" y2={v1.y} stroke="#e2e8f0" strokeWidth="4" />
          <path
            d={`M ${v1.x} ${v1.y} L ${v2.x} ${v2.y} L ${v3.x} ${v3.y} Z`}
            fill="rgba(105, 145, 255, 0.05)"
            stroke="#6991ff"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          {drawBase > 20 && drawHeight > 20 && (
            <path d={`M ${v1.x} ${v1.y - 30} L ${v1.x + 30} ${v1.y - 30} L ${v1.x + 30} ${v1.y}`} fill="none" stroke="#94a3b8" strokeWidth="2" />
          )}
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${effectiveArcRadius} ${effectiveArcRadius} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <text x={labelPos.x} y={labelPos.y} fill="#f43f5e" fontSize="18" fontWeight="900" textAnchor="end" dominantBaseline="middle" className="font-outfit">
            {angleVal.toFixed(1)}°
          </text>
          <line x1={v2.x} y1={v2.y} x2={v3.x} y2={v3.y} stroke="#6991ff" strokeWidth="3" strokeDasharray="10 6" strokeOpacity="0.3" />
          <text x={v1.x - 20} y={v1.y - drawHeight / 2} fill="#0f172a" fontSize="14" fontWeight="900" textAnchor="end" className="font-outfit uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>
            {content.outputLabel}: {result}
          </text>
          <text x={v1.x + drawBase / 2} y={v1.y + 30} fill="#0f172a" fontSize="14" fontWeight="900" textAnchor="middle" className="font-outfit uppercase tracking-widest">
            {inputs[0].label}: {baseVal}
          </text>
        </svg>
      </div>
    );
  };

  const renderScienceLab = () => {
    return (
      <div className="flex-1 min-h-[400px] relative rounded-2xl overflow-hidden shadow-xl border border-slate-100 group">
        {content.imageUrl ? (
          <img
            src={content.imageUrl}
            alt="Simulation Background"
            className="w-full h-full object-cover transition-transform duration-2000 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200">
            <FlaskConical size={120} className="opacity-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>

        <div className="absolute bottom-8 left-8 right-8 flex gap-4 items-end">
          <div className="bg-white/95 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/50 flex-1 transition-transform group-hover:translate-y-[-5px] duration-500">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">{content.outputLabel}</span>
            <div className="text-4xl font-black text-primary-600 font-outfit tracking-tighter tabular-nums">
              {result}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {content.inputs.map(input => (
              <div key={input.name} className="bg-slate-900/90 backdrop-blur-xl text-white p-4 rounded-2xl border border-white/10 w-40 shadow-xl">
                <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2 truncate">{input.label}</div>
                <div className="text-2xl font-black font-outfit leading-none">{params[input.name]}<span className="text-[10px] ml-1 opacity-50">{input.unit}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!content.inputs || !content.formula) {
    return <div className="p-8 text-center text-red-500 font-black uppercase tracking-widest">Invalid Simulation Configuration</div>;
  }

  const mode = content.visualMode || 'chart';
  const modeIcon = mode === 'geometry' ? <Triangle size={24} /> : mode === 'science_lab' ? <FlaskConical size={24} /> : <ChartIcon size={24} />;

  return (
    <div className="flex flex-col h-full bg-slate-50 font-instrument scroller-hide selection:bg-primary-500 selection:text-white">
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 shadow-sm border border-primary-100">
            <Maximize size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 font-outfit uppercase text-[10px] tracking-widest">Interactive Lab</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{content.outputLabel} Analysis</p>
          </div>
        </div>
        <button onClick={onNext} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 uppercase tracking-wider text-[10px]">
          Proceed to Mastery <ChevronRight size={14} className="inline ml-1" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-[#f8fafc] p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:28px:28px]"></div>

          <div className="z-10 w-full h-full max-w-6xl flex flex-col gap-8">
            <div className="flex-1 flex flex-col">
              {mode === 'geometry' && renderGeometry()}
              {mode === 'science_lab' && renderScienceLab()}
              {mode === 'chart' && renderChart()}
            </div>

            {mode !== 'science_lab' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg flex items-center justify-between group transition-all hover:border-primary-500/20">
                <div className="flex gap-8 border-r border-slate-100 pr-10">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Architectural Result</span>
                    <div className="text-3xl font-black text-slate-900 font-outfit tracking-tighter group-hover:text-primary-600 transition-colors">{result}</div>
                  </div>
                  {mode === 'geometry' && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Model Tension</span>
                      <div className="text-3xl font-black text-rose-500 font-outfit tracking-tighter">{(result * 0.12).toFixed(1)}</div>
                    </div>
                  )}
                </div>
                <div className="flex-1 pl-10">
                  <p className="text-slate-500 font-bold italic leading-relaxed text-base">
                    "Adjust the architecture to see how <strong className="text-slate-900 border-b-2 border-primary-200">{content.outputLabel}</strong> recalibrates in real-time."
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-2xl z-30 transition-all duration-700">
          <div className="p-8 flex-1 overflow-y-auto scroller-hide">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-[9px] font-bold text-primary-600 uppercase tracking-widest flex items-center gap-2.5">
                <Sliders size={16} /> Model Parameters
              </h3>
              <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[8px] font-bold uppercase tracking-widest shadow-md">Live Sync</span>
            </div>

            <div className="space-y-10">
              {content.inputs.map(input => (
                <div key={input.name} className="group">
                  <div className="flex justify-between items-end mb-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{input.label}</span>
                      <span className="text-lg font-black text-slate-900 font-outfit tracking-tight group-hover:text-primary-600 transition-colors uppercase">{input.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-black text-primary-600 font-outfit tabular-nums">{params[input.name]?.toFixed(1)}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{input.unit}</span>
                    </div>
                  </div>
                  <div className="relative h-12 flex items-center px-2">
                    <div className="absolute inset-x-0 h-2 bg-slate-100 rounded-full border border-slate-200 shadow-inner"></div>
                    <div
                      className="absolute h-2 bg-slate-900 rounded-full transition-all duration-300 pointer-events-none"
                      style={{ width: `${((params[input.name] - input.min) / (input.max - input.min)) * 100}%`, left: '8px', right: '8px' }}
                    ></div>
                    <input
                      type="range" min={input.min} max={input.max} step={(input.max - input.min) / 100}
                      value={params[input.name] || input.min}
                      onChange={e => {
                        setParams(prev => ({ ...prev, [input.name]: parseFloat(e.target.value) }));
                        onUpdateScore(5);
                      }}
                      className="w-full relative z-10 opacity-0 cursor-pointer h-full"
                    />
                    <div
                      className="absolute w-6 h-6 bg-white border-4 border-slate-900 rounded-full shadow-2xl transition-all duration-100 pointer-events-none"
                      style={{ left: `calc(${((params[input.name] - input.min) / (input.max - input.min)) * 100}% + 8px)`, transform: 'translateX(-50%)' }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] font-black text-slate-300 mt-4 uppercase tracking-widest">
                    <span>min: {input.min}</span>
                    <span>max: {input.max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-200">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group/logic">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover/logic:rotate-45 transition-transform">
                <Calculator size={32} />
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-wider">
                <Calculator size={14} className="text-primary-500" /> Architectural Logic
              </div>
              <div className="bg-slate-900 p-4 rounded-xl shadow-lg">
                <code className="text-[9px] font-mono text-primary-400 break-all block leading-relaxed opacity-80 group-hover/logic:opacity-100 transition-opacity">
                  {content.formula}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationStage;