import React, { useEffect, useState } from 'react';
import { Award, RefreshCw, BarChart2, Loader2, FileText, Download, Printer, ChevronDown, ChevronUp, Sparkles, Lightbulb, BookOpen } from 'lucide-react';
import { LessonContract } from '../types';
import { RenderWithMath } from './MathRenderer';

interface MasteryReportProps {
  score: number;
  misconceptions: string[];
  currentLesson: LessonContract;
  onRestart: () => void;
  onShowTeacherView: () => void;
}

const MasteryReport: React.FC<MasteryReportProps> = ({ score, misconceptions, currentLesson, onRestart, onShowTeacherView }) => {
  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPlan, setShowPlan] = useState(true);

  useEffect(() => {
    const generatePlan = async () => {
      setLoading(true);
      try {
        const genAI = new (window as any).GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `
          Generate a personalized post-lesson feedback plan for a student who just finished "${currentLesson.title}" (${currentLesson.subject}, ${currentLesson.grade}).
          Score: ${score}%.
          Detected Weak Areas (Misconception IDs): ${misconceptions.length > 0 ? misconceptions.join(', ') : "None, perfect score"}.

          Return JSON:
          {
            "praise": "Brief encouraging sentence",
            "focus_area": "The main concept to review",
            "action_items": ["Action 1", "Action 2"],
            "review_concept": { "title": "Concept Name", "explanation": "Simple explanation" }
          }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        setPlan(JSON.parse(text || "{}"));
      } catch (e) {
        console.error("Plan generation failed", e);
      } finally {
        setLoading(false);
      }
    };

    generatePlan();
  }, [score, misconceptions, currentLesson]);

  return (
    <div className="w-full h-full bg-slate-50 overflow-y-auto font-instrument selection:bg-primary-500 selection:text-white">
      <div className="max-w-4xl mx-auto p-8 md:p-10 pb-24">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center border-t-8 border-primary-500 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-primary-50 to-transparent opacity-50 pointer-events-none"></div>

          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-inner">
            <Award size={40} className="text-primary-600" />
          </div>

          <h2 className="text-3xl font-black text-slate-900 mb-2 font-outfit">Lesson Complete!</h2>
          <p className="text-slate-500 mb-8 text-base font-medium">You have successfully navigated {currentLesson.title}.</p>

          <div className="grid grid-cols-2 gap-6 mb-8 max-w-md mx-auto">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Score</span>
              <span className="block text-4xl font-black text-slate-800">{score}%</span>
            </div>
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rank</span>
              <span className={`block text-xl font-bold mt-1 ${score > 80 ? 'text-emerald-500' : score > 50 ? 'text-amber-500' : 'text-slate-600'}`}>
                {score > 90 ? 'Grandmaster' : score > 75 ? 'Scholar' : score > 50 ? 'Apprentice' : 'Novice'}
              </span>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={onRestart}
              className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} /> Restart
            </button>
            <button
              onClick={onShowTeacherView}
              className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/20"
            >
              <BarChart2 size={18} /> Teacher Dashboard
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div
            className="bg-slate-900 p-5 cursor-pointer flex justify-between items-center"
            onClick={() => setShowPlan(!showPlan)}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="text-primary-400" size={18} />
              <h3 className="text-lg font-bold text-white font-outfit tracking-tight">AI Personalized Action Plan</h3>
            </div>
            {showPlan ? <ChevronUp className="text-slate-400" size={18} /> : <ChevronDown className="text-slate-400" size={18} />}
          </div>

          {showPlan && (
            <div className="p-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 size={48} className="animate-spin text-primary-500 mb-4" />
                  <p>Analyzing your performance...</p>
                </div>
              ) : plan ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 font-medium flex gap-3 items-start">
                    <Sparkles size={20} className="mt-1 shrink-0" />
                    <div>
                      <p className="font-bold mb-1">AI Tutor says:</p>
                      "{plan.praise}"
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Lightbulb size={16} /> Focus Concept
                      </h4>
                      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 h-full">
                        <h5 className="font-bold text-amber-900 text-lg mb-2">{plan.review_concept?.title}</h5>
                        <div className="text-amber-800 leading-relaxed text-sm">
                          <RenderWithMath text={plan.review_concept?.explanation} showOptions={false} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BookOpen size={16} /> Recommended Actions
                      </h4>
                      <ul className="space-y-3">
                        {plan.action_items?.map((item: string, i: number) => (
                          <li key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 text-sm font-medium">
                            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <RenderWithMath text={item} showOptions={false} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors text-sm font-bold" onClick={() => window.print()}>
                      <Printer size={16} /> Print Plan
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-bold shadow-lg shadow-primary-900/10">
                      <Download size={16} /> Download PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">Evaluation complete. Keep practicing!</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasteryReport;