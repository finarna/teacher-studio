"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Activity
} from "lucide-react";

/**
 * Utility for combining Tailwind classes
 */
function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

interface MetricProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color: string;
  light?: boolean;
}

const MetricBadge = ({ label, value, icon, trend, color, light }: MetricProps) => (
  <div className={cn(
    "flex flex-col gap-0.5 p-2 rounded-xl border grow transition-all duration-300",
    light 
      ? "bg-white border-slate-100 shadow-sm" 
      : "bg-slate-900/40 border-white/5 shadow-inner"
  )}>
    <div className="flex items-center justify-between">
      <div className={cn("w-5 h-5 rounded flex items-center justify-center bg-opacity-20", color)}>
        {React.isValidElement(icon) ? React.cloneElement(icon as any, { size: 10 } as any) : icon}
      </div>
      {trend != null && (
        <div className={cn(
          "flex items-center text-[7px] font-black uppercase px-1 rounded-full", 
          trend >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
        )}>
          {trend >= 0 ? <TrendingUp size={7} className="mr-0.5" /> : <TrendingDown size={7} className="mr-0.5" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{label}</span>
    <span className={cn(
      "text-sm font-black font-outfit tracking-tight leading-none",
      light ? "text-slate-900" : "text-white"
    )}>{value}</span>
  </div>
);

interface BreakdownItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

interface MasteryDashboardCardProps {
  mainMetric: { label: string, value: string, trend?: number, icon: any, color: string };
  stats: { label: string, value: string | number, icon: any, color: string }[];
  history: number[]; 
  historyLabel?: string;
  breakdown: BreakdownItem[];
  breakdownLabel?: string;
  observation?: string;
  className?: string;
  title?: string;
  light?: boolean;
}

export const DetailedTestCard = ({
  mainMetric,
  stats = [],
  history = [],
  historyLabel = "Trajectory",
  breakdown = [],
  breakdownLabel = "Breakdown",
  observation,
  className,
  title = "Intelligence Architecture",
  light = true
}: MasteryDashboardCardProps) => {
  const activeHistory = history.filter(v => v > 0);

  return (
    <div
      className={cn(
        "w-full rounded-[1.5rem] border transition-all duration-500 p-4 pb-3 relative overflow-hidden group",
        light 
          ? "bg-white border-slate-100 shadow-sm" 
          : "bg-slate-950 border-white/10 text-white shadow-2xl",
        className
      )}
    >
      {/* Background Subtle Sparkle */}
      <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none hover:opacity-10 transition-opacity">
         <Sparkles size={40} className={light ? "text-indigo-600" : "text-white"} />
      </div>

      <div className="relative z-10 flex flex-col gap-5">
        {/* Compact Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <div className={cn(
                "w-4 h-4 rounded-md flex items-center justify-center",
                light ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"
              )}>
                <Activity size={10} />
              </div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em]">{title}</span>
            </div>
            <h2 className={cn("text-lg font-black font-outfit tracking-tight leading-none", light ? "text-slate-950" : "text-white")}>
              Mastery <span className="text-indigo-600">Analytics</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 items-stretch gap-2 w-full lg:w-auto">
             <MetricBadge light={light} {...mainMetric} />
             {stats.slice(0, 3).map((stat, i) => <MetricBadge key={i} light={light} {...stat} />)}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Main Chart Container */}
          <div className={cn(
            "lg:col-span-8 p-4 rounded-xl border relative overflow-hidden h-40 flex flex-col group/container",
            light ? "bg-slate-50 border-slate-100" : "bg-slate-900/50 border-white/5"
          )}>
            <div className="flex justify-between items-center mb-4">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{historyLabel}</span>
               {activeHistory.length > 0 && <span className="text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full uppercase">{activeHistory.length} Test Samples</span>}
            </div>

            <div className="flex-1 flex items-end gap-1.5 relative group/chart justify-start">
               {/* Fixed Guide Lines & Values */}
               <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-0.5">
                  {[100, 75, 50, 25, 0].map(v => (
                    <div key={v} className={cn("h-px border-t w-full relative", light ? "border-slate-200/50" : "border-white/5")}>
                       <span className="absolute -left-6 -top-1 text-[7px] font-black text-slate-400">{v}%</span>
                    </div>
                  ))}
               </div>

               {activeHistory.length > 0 ? activeHistory.map((score, i) => {
                 const barColor = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-indigo-500" : "bg-rose-500";
                 return (
                   <motion.div
                     key={i}
                     initial={{ height: 0 }}
                     animate={{ height: `${Math.max(4, score)}%` }}
                     className={cn("w-5 md:w-6 lg:w-7 rounded-t relative group transition-all", barColor)}
                   >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-black pointer-events-none transition-opacity">
                         {score}%
                      </div>
                   </motion.div>
                 );
               }) : (
                 <div className="flex-1 h-full flex items-center justify-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Awaiting records</div>
               )}
            </div>
            
            <div className="flex justify-between mt-3 text-[7.5px] font-black text-slate-400 uppercase tracking-[0.2em]">
               <span>Initial Baseline</span>
               <span>Improvement Phase</span>
               <span>Current Peak</span>
            </div>
          </div>

          {/* Compact Sidebar (AI & Subject Deck) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
             {/* Strategy Briefing (AI) */}
             {observation && (
               <div className={cn(
                 "p-3 rounded-xl border relative overflow-hidden group/ai",
                 light ? "bg-indigo-50/50 border-indigo-100" : "bg-indigo-600/10 border-indigo-500/20"
               )}>
                  <div className="absolute -top-1 -right-1 opacity-10 rotate-12 transition-transform group-hover/ai:rotate-0"><Sparkles size={20} className="text-indigo-600" /></div>
                  <span className="block text-[8px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">AI Strategic Insight</span>
                  <p className={cn("text-[11px] font-medium leading-[1.3] italic", light ? "text-slate-800" : "text-indigo-100")}>
                    &ldquo;{observation}&rdquo;
                  </p>
               </div>
             )}

             {/* Functional Deck */}
             <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">{breakdownLabel}</span>
                <div className="flex flex-col gap-1.5">
                   {breakdown.slice(0, 3).map((item, idx) => (
                     <div key={idx} className={cn(
                       "flex items-center justify-between p-2 rounded-lg border transition-colors",
                       light ? "bg-white border-slate-100" : "bg-white/5 border-white/5"
                     )}>
                        <div className="flex items-center gap-2">
                           <div className={cn("w-4 h-4 rounded flex items-center justify-center bg-opacity-20", item.color)}>
                              {React.isValidElement(item.icon) ? React.cloneElement(item.icon as any, { size: 9 } as any) : item.icon}
                           </div>
                           <span className={cn("text-[10px] font-black uppercase tracking-tight truncate w-24", light ? "text-slate-700" : "text-slate-200")}>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.value}%` }} 
                                  className={cn("h-full", item.color.split(' ')[0])} 
                                />
                            </div>
                            <span className="text-[9px] font-black text-slate-900 w-6 text-right">{item.value}%</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Small Progress Label (Replacement Footer) */}
        <div className="flex items-center justify-between gap-4 pt-1">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Strategy Mode: Optimization</span>
           </div>
           <span className="text-[8px] font-bold text-slate-400">BoardMaster Certified Performance Reporting</span>
        </div>
      </div>
    </div>
  );
};
