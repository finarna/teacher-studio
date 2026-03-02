import React, { useState, useEffect } from 'react';
import {
    Brain,
    Zap,
    Target,
    Trophy,
    FileQuestion,
    Lightbulb,
    CheckCircle,
    Clock,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    ArrowRight,
    Bookmark,
    History,
    Info,
    Play,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    BookOpen,
    ArrowLeft,
    TrendingUp,
    Eye,
    BarChart3,
    Calendar,
    X,
    Loader2
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion, AnimatePresence } from 'framer-motion';
import { RenderWithMath } from './MathRenderer';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { useLearningJourney } from '../contexts/LearningJourneyContext';
import type { TopicResource, Subject, ExamContext, AnalyzedQuestion } from '../types';

interface MobilePracticeTabProps {
    topicResource: TopicResource;
    subject: Subject;
    examContext: ExamContext;
    onQuestionCountChange?: (count: number) => void;
    sharedQuestions: AnalyzedQuestion[];
    setSharedQuestions: React.Dispatch<React.SetStateAction<AnalyzedQuestion[]>>;
    onProgressUpdate?: (silent?: boolean) => void;
}

export const MobilePracticeTab: React.FC<MobilePracticeTabProps> = ({
    topicResource,
    subject,
    examContext,
    onQuestionCountChange,
    sharedQuestions,
    setSharedQuestions,
    onProgressUpdate
}) => {
    const [questions, setQuestions] = useState<AnalyzedQuestion[]>(sharedQuestions.length > 0 ? sharedQuestions : (topicResource.questions || []));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showSolution, setShowSolution] = useState(false);
    const [showInsights, setShowInsights] = useState(false);
    const [showQuestNavigator, setShowQuestNavigator] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const { user } = useAuth();

    const {
        savedAnswers,
        validatedAnswers,
        bookmarkedIds,
        saveAnswer,
        toggleBookmark,
        startQuestionTimer,
        stopQuestionTimer,
        isLoading: sessionLoading
    } = usePracticeSession({
        topicResourceId: topicResource.id,
        topicId: topicResource.topicId,
        topicName: topicResource.topicName,
        subject,
        examContext,
        questions: questions,
        onProgressUpdate
    });

    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const currentQuestion = questions[currentIndex];

    useEffect(() => {
        if (currentQuestion && !savedAnswers.has(currentQuestion.id)) {
            startQuestionTimer(currentQuestion.id);
        }
        if (currentQuestion && savedAnswers.has(currentQuestion.id)) {
            setSelectedOption(savedAnswers.get(currentQuestion.id) ?? null);
        } else {
            setSelectedOption(null);
        }
        setShowSolution(false);
        setShowInsights(false);
    }, [currentIndex, currentQuestion, savedAnswers]);

    const handleOptionSelect = (index: number) => {
        if (validatedAnswers.has(currentQuestion.id)) return;
        setSelectedOption(index);
    };

    const handleValidate = async () => {
        if (selectedOption === null || !currentQuestion) return;
        const isCorrect = selectedOption === currentQuestion.correctOptionIndex;
        await saveAnswer(currentQuestion.id, selectedOption, isCorrect);
        stopQuestionTimer(currentQuestion.id);
        setShowInsights(true);
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const prevQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const generateAISolution = async () => {
        if (!currentQuestion || isGenerating) return;

        setIsGenerating(true);
        try {
            const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
            if (!GEMINI_KEY) {
                alert('AI generation not configured. Please contact admin.');
                return;
            }

            const genAI = new GoogleGenerativeAI(GEMINI_KEY);
            const model = genAI.getGenerativeModel({
                model: 'gemini-3-flash-preview',
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.7,
                    maxOutputTokens: 20000
                }
            });

            const prompt = `You are an expert educator. Generate a COMPLETE solution and deep insights for this ${subject} question from ${examContext} exam.

Question: ${currentQuestion.text}

Options:
${currentQuestion.options?.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

Correct Answer: ${currentQuestion.options?.[currentQuestion.correctOptionIndex]}

🚨 CRITICAL: Generate COMPLETE, IN-DEPTH educational content. NO generic placeholders!

Return ONLY valid JSON with this EXACT structure:
{
  "solutionSteps": [
    "Step 1: Title ::: Detailed mathematical reasoning with calculations and LaTeX",
    "Step 2: Title ::: Show exact working with formulas",
    "Step 3: Title ::: Continue with complete explanation",
    "Step 4: Title ::: Final answer derivation"
  ],
  "examTip": "Specific time-saving strategy for this question type in ${examContext} exams, mentioning common traps",
  "keyFormulas": [
    "$formula_1$ - context on when to use this formula",
    "$formula_2$ - context on when to use this formula",
    "$formula_3$ - context on when to use this formula"
  ],
  "pitfalls": [
    "EXACT mistake students make ::: WHY they make it ::: HOW to avoid with specific technique",
    "EXACT mistake students make ::: WHY they make it ::: HOW to avoid with specific technique",
    "EXACT mistake students make ::: WHY they make it ::: HOW to avoid with specific technique"
  ],
  "masteryMaterial": {
    "aiReasoning": "2-3 sentences explaining the EXACT conceptual skills being tested in this question",
    "whyItMatters": "2-3 sentences on how this concept connects to other ${subject} topics and real applications",
    "historicalPattern": "Specific exam frequency data with actual years where this pattern appeared",
    "predictiveInsight": "Based on recent trends, predict what variation will appear in upcoming ${examContext} exams with probability",
    "keyConcepts": [
      {
        "name": "Core Concept Name",
        "explanation": "Complete explanation: (1) Definition with LaTeX, (2) Key theorem, (3) Worked example, (4) Connection to THIS question. Minimum 3-4 sentences."
      },
      {
        "name": "Second Concept",
        "explanation": "Complete explanation with definition, theorem, example, and question connection"
      },
      {
        "name": "Third Concept",
        "explanation": "Complete explanation with definition, theorem, example, and question connection"
      }
    ]
  }
}`;

            const result = await model.generateContent(prompt);
            const raw = result.response.text().trim();
            const jsonStr = raw.includes('```json')
                ? raw.match(/```json\n([\s\S]*?)\n```/)?.[1] || raw
                : raw;
            const generated = JSON.parse(jsonStr);

            // Update question in database
            const { error: updateError } = await supabase
                .from('questions')
                .update({
                    solution_steps: generated.solutionSteps || [],
                    exam_tip: generated.examTip || null,
                    key_formulas: generated.keyFormulas || [],
                    pitfalls: generated.pitfalls || [],
                    mastery_material: generated.masteryMaterial || null
                })
                .eq('id', currentQuestion.id);

            if (updateError) {
                console.error('Failed to save generated solution:', updateError);
                alert('Generated solution but failed to save. Please try again.');
                return;
            }

            // Update local state
            const updatedQuestion = {
                ...currentQuestion,
                solutionSteps: generated.solutionSteps || [],
                examTip: generated.examTip || null,
                keyFormulas: generated.keyFormulas || [],
                pitfalls: generated.pitfalls || [],
                commonMistakes: (generated.pitfalls || []).map((p: string) => {
                    const [mistake, ...rest] = p.split(':::');
                    return {
                        mistake: mistake?.trim() || p,
                        why: rest.join(':::').split('HOW TO AVOID')[0]?.replace('WHY:', '')?.trim() || '',
                        howToAvoid: rest.join(':::').split('HOW TO AVOID')[1]?.trim() || ''
                    };
                }),
                masteryMaterial: generated.masteryMaterial || null
            };

            setQuestions(prev => prev.map(q => q.id === currentQuestion.id ? updatedQuestion : q));
            setSharedQuestions(prev => prev.map(q => q.id === currentQuestion.id ? updatedQuestion : q));

            console.log('✅ AI solution generated and saved successfully');
        } catch (error) {
            console.error('Error generating AI solution:', error);
            alert('Failed to generate solution. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (sessionLoading || !currentQuestion) {
        return <div className="p-12 text-center text-slate-400">Initializing Session...</div>;
    }

    const isValidated = validatedAnswers.has(currentQuestion.id);
    const isCorrect = isValidated && savedAnswers.get(currentQuestion.id) === currentQuestion.correctOptionIndex;

    const mastery = currentQuestion.masteryMaterial;

    return (
        <div className="flex flex-col h-full space-y-3 pb-24">
            {/* Redesigned Minimal Progress Indicator (Clickable to open navigator) */}
            <button
                onClick={() => setShowQuestNavigator(true)}
                className="w-full flex items-center justify-between bg-white/60 backdrop-blur-xl py-2.5 px-6 rounded-full border border-slate-100 shadow-sm active:scale-[0.98] transition-all"
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider">Quest Progress</span>
                </div>
                <div className="flex items-center gap-1">
                    {questions.slice(0, 12).map((q, i) => (
                        <div
                            key={q.id}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? 'bg-slate-900 w-3' :
                                validatedAnswers.has(q.id) ? (savedAnswers.get(q.id) === q.correctOptionIndex ? 'bg-emerald-400' : 'bg-rose-400') :
                                    'bg-slate-200'
                                }`}
                        />
                    ))}
                    {questions.length > 12 && <span className="text-[8px] font-bold text-slate-400 ml-1">+{questions.length - 12}</span>}
                </div>
                <ChevronRight size={14} className="text-slate-400" />
            </button>

            {/* Question Card */}
            <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[2.5rem] p-5 shadow-xl border border-slate-100 flex flex-col"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black uppercase text-slate-500 tracking-tighter">NODE {currentIndex + 1}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${currentQuestion.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600' : currentQuestion.difficulty === 'Hard' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                            {currentQuestion.difficulty}
                        </span>
                    </div>
                    <button
                        onClick={() => toggleBookmark(currentQuestion.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${Array.isArray(bookmarkedIds) && bookmarkedIds.includes(currentQuestion.id) ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}
                    >
                        <Bookmark size={16} fill={(Array.isArray(bookmarkedIds) && bookmarkedIds.includes(currentQuestion.id)) ? 'currentColor' : 'none'} />
                    </button>
                </div>

                <div className="text-xl font-bold text-slate-900 leading-relaxed mb-4 font-instrument">
                    <RenderWithMath text={currentQuestion.text} showOptions={false} />
                </div>

                <div className="space-y-2">
                    {(currentQuestion.options || []).map((option, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrectOption = isValidated && idx === Number(currentQuestion.correctOptionIndex);
                        const isWrongSelection = isValidated && isSelected && !isCorrect;

                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionSelect(idx)}
                                disabled={isValidated}
                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${isCorrectOption ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-[0_8px_20px_-10px_rgba(16,185,129,0.3)]' :
                                    isWrongSelection ? 'bg-rose-50 border-rose-500 text-rose-900' :
                                        isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-xl translate-y-[-2px]' :
                                            'bg-white border-slate-100 text-slate-700 active:bg-slate-50'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 font-black text-xs transition-colors ${isSelected || isCorrectOption || isWrongSelection ? 'border-transparent bg-white/20' : 'border-slate-100 text-slate-300'}`}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <div className="flex-1 font-bold text-sm">
                                    <RenderWithMath
                                        text={option.replace(/^\s*([A-D1-4][\.\)]|\([A-D1-4]\))\s*/i, '')}
                                        showOptions={false}
                                        compact={true}
                                        dark={isSelected && !isValidated}
                                    />
                                </div>
                                {isCorrectOption && <CheckCircle size={18} className="text-emerald-500" />}
                                {isWrongSelection && <AlertTriangle size={18} className="text-rose-500" />}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Post-Validation AI & Solution Layers */}
            <AnimatePresence>
                {isValidated && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        {/* AI Strategy Pill */}
                        <div className={`p-4 rounded-[2.5rem] border-2 shadow-lg relative overflow-hidden ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                {isCorrect ? <Sparkles size={64} /> : <AlertTriangle size={64} />}
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                    {isCorrect ? <Trophy size={20} /> : <Brain size={20} />}
                                </div>
                                <div>
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {isCorrect ? 'Strategic Alignment' : 'Diagnostic Pivot'}
                                    </h4>
                                    <h3 className="text-lg font-black text-slate-900 font-outfit uppercase tracking-tighter leading-none italic">
                                        {isCorrect ? 'Elite Execution' : 'Refine the Logic'}
                                    </h3>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm font-bold text-slate-800 leading-relaxed italic">
                                        <RenderWithMath text={currentQuestion.studyTip || mastery?.aiReasoning || "Master this concept by reviewing the core principles in the Learn tab."} showOptions={false} compact={true} />
                                    </div>
                                </div>

                                {mastery?.commonTrap && (
                                    <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-rose-200">
                                        <div className="flex items-center gap-2 mb-1 text-rose-600">
                                            <Zap size={14} className="fill-rose-600" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">The Trap</span>
                                        </div>
                                        <p className="text-xs font-bold text-red-900/80">{mastery.commonTrap}</p>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowSolution(!showSolution)}
                                        className="flex-1 h-12 bg-white rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <HelpCircle size={16} />
                                        {showSolution ? 'Hide Solution' : 'View Solution'}
                                    </button>
                                    <button
                                        onClick={() => setShowInsights(!showInsights)}
                                        className="flex-1 h-12 bg-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                                    >
                                        <Sparkles size={16} />
                                        AI Deep Dive
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Expandable Solution Section */}
                        {showSolution && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl overflow-hidden"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <BookOpen size={20} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 font-outfit uppercase tracking-tighter">Solution Blueprint</h3>
                                </div>
                                <div className="space-y-6">
                                    {/* Key Formulas (if available) */}
                                    {currentQuestion.keyFormulas && currentQuestion.keyFormulas.length > 0 && (
                                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                                            <h4 className="text-[8px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1">
                                                <span className="text-amber-500">⚡</span> Key Formulas
                                            </h4>
                                            <div className="space-y-2">
                                                {currentQuestion.keyFormulas.map((formula, idx) => (
                                                    <div key={idx} className="text-xs font-bold text-slate-800 bg-white rounded-lg p-2 border border-amber-100">
                                                        <RenderWithMath text={formula} showOptions={false} compact={true} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Solution Steps */}
                                    <div className="relative ml-4 border-l-2 border-slate-50 pl-6 py-2 space-y-6">
                                        {currentQuestion.solutionSteps?.map((step, idx) => (
                                            <div key={idx} className="relative">
                                                <div className="absolute top-0 left-[-31px] w-4 h-4 rounded-full bg-white border-4 border-indigo-500 z-10" />
                                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Step {idx + 1}</span>
                                                    <div className="text-xs font-bold text-slate-800 leading-relaxed">
                                                        <RenderWithMath text={step} showOptions={false} compact={true} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {!currentQuestion.solutionSteps?.length && (
                                            <div className="text-slate-400 italic text-sm">Step-by-step reasoning is being synthesized for this node.</div>
                                        )}
                                    </div>

                                    {/* Marking Scheme (if available) */}
                                    {currentQuestion.markingScheme && currentQuestion.markingScheme.length > 0 && (
                                        <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
                                            <h4 className="text-[8px] font-black text-green-600 uppercase tracking-[0.2em] mb-2">
                                                📝 Marking Scheme
                                            </h4>
                                            <div className="space-y-2">
                                                {currentQuestion.markingScheme.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 text-xs">
                                                        <span className="font-black text-green-600 min-w-[2rem]">{item.mark}</span>
                                                        <span className="text-slate-700">{item.step}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Common Mistakes (if available) */}
                                    {currentQuestion.commonMistakes && currentQuestion.commonMistakes.length > 0 && (
                                        <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200">
                                            <h4 className="text-[8px] font-black text-rose-600 uppercase tracking-[0.2em] mb-3">
                                                ⚠️ Common Mistakes to Avoid
                                            </h4>
                                            <div className="space-y-3">
                                                {currentQuestion.commonMistakes.map((mistake, idx) => (
                                                    <div key={idx} className="bg-white rounded-lg p-3 border border-rose-100">
                                                        <div className="text-[10px] font-black text-rose-600 mb-1">{mistake.mistake}</div>
                                                        <div className="text-[9px] text-slate-600 mb-1"><strong>Why:</strong> {mistake.why}</div>
                                                        <div className="text-[9px] text-green-600"><strong>How to Avoid:</strong> {mistake.howToAvoid}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Expandable AI Insights Section */}
                        {showInsights && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl overflow-hidden"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center">
                                        <Sparkles size={20} />
                                    </div>
                                    <h3 className="text-lg font-black text-white font-outfit uppercase tracking-tighter">AI Knowledge Pivot</h3>
                                </div>

                                <div className="space-y-6">
                                    {mastery?.logic && (
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                            <h4 className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Brain size={12} /> The Logic Model
                                            </h4>
                                            <p className="text-sm font-medium leading-relaxed text-white/80">
                                                <RenderWithMath text={mastery.logic} showOptions={false} dark={true} compact={true} />
                                            </p>
                                        </div>
                                    )}
                                    {mastery?.memoryTrigger && (
                                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                            <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Zap size={12} className="fill-amber-400" /> Memory Trigger
                                            </h4>
                                            <p className="text-sm font-bold italic leading-relaxed text-amber-50">
                                                <RenderWithMath text={mastery.memoryTrigger} showOptions={false} dark={true} compact={true} />
                                            </p>
                                        </div>
                                    )}
                                    {mastery?.whyItMatters && (
                                        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Target size={12} /> Strategic Relevance
                                            </h4>
                                            <p className="text-sm font-medium leading-relaxed text-indigo-50/80">
                                                <RenderWithMath text={mastery.whyItMatters} showOptions={false} dark={true} compact={true} />
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer Selection & Navigation Control (Redesigned) */}
            <div className="fixed bottom-[84px] left-0 right-0 px-6 flex flex-col items-center gap-4 z-40 pb-safe">


                {/* Logic Control Dock (Floating Action Pill) */}
                <div className="flex items-center gap-3 w-full max-w-[360px]">
                    <button
                        onClick={prevQuestion}
                        disabled={currentIndex === 0}
                        className="w-14 h-14 rounded-[1.75rem] bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform disabled:opacity-30 shrink-0"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <button
                        onClick={!isValidated ? handleValidate : nextQuestion}
                        disabled={!isValidated && selectedOption === null}
                        className={`flex-1 h-14 rounded-full shadow-2xl flex items-center justify-center gap-3 active:scale-[0.96] transition-all px-6 relative overflow-hidden ${!isValidated ? 'bg-slate-950 text-white' :
                            (isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white')
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${!isValidated ? (selectedOption !== null ? 'bg-primary-400 animate-pulse' : 'bg-slate-700') :
                            (isCorrect ? 'bg-emerald-300 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-rose-300')
                            }`} />
                        <span className="text-[10px] font-black uppercase tracking-[0.12em] whitespace-nowrap">
                            {isValidated
                                ? `${validatedAnswers.size}/${questions.length} SOLVED`
                                : selectedOption !== null ? 'Secure Path' : 'Select Logic'}
                        </span>
                        <ChevronRight size={14} className={`transition-transform ${isValidated ? 'translate-x-0' : 'translate-x-4 opacity-0'}`} />
                    </button>

                    <button
                        onClick={nextQuestion}
                        disabled={currentIndex === questions.length - 1}
                        className="w-14 h-14 rounded-[1.75rem] bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform disabled:opacity-30 shrink-0"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>

            {/* Quest Navigator Modal */}
            <AnimatePresence>
                {showQuestNavigator && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end justify-center p-6 bg-slate-900/40 backdrop-blur-md"
                        onClick={() => setShowQuestNavigator(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 100, opacity: 0, scale: 0.95 }}
                            className="w-full max-w-[400px] bg-[#0F172A] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Quest Progress</h3>
                                </div>
                                <button
                                    onClick={() => setShowQuestNavigator(false)}
                                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:scale-90"
                                >
                                    <ChevronDown size={20} />
                                </button>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto max-h-[60vh] scroller-hide">
                                <div className="grid grid-cols-6 gap-3">
                                    {questions.map((q, i) => {
                                        const isSolved = validatedAnswers.has(q.id);
                                        const isCorrectAns = isSolved && savedAnswers.get(q.id) === q.correctOptionIndex;
                                        const isCurrent = i === currentIndex;

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => {
                                                    setCurrentIndex(i);
                                                    setShowQuestNavigator(false);
                                                }}
                                                className={`aspect-square rounded-2xl flex items-center justify-center text-[10px] font-black transition-all border-2 ${isCurrent ? 'bg-white text-slate-900 border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' :
                                                    isSolved ? (isCorrectAns ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/20 border-rose-500/50 text-rose-400') :
                                                        'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                    }`}
                                            >
                                                {i + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="p-6 bg-slate-900/80 border-t border-white/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Accuracy</p>
                                        <p className="text-xl font-black text-white">
                                            {validatedAnswers.size > 0
                                                ? Math.round((Array.from(validatedAnswers.values()).filter(v => v).length / validatedAnswers.size) * 100)
                                                : 0}%
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Remaining</p>
                                        <p className="text-xl font-black text-white">{questions.length - validatedAnswers.size}</p>
                                    </div>
                                </div>
                                <div className="mt-6 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-emerald-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(validatedAnswers.size / questions.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const MobileLearnTab: React.FC<{
    topicResource: TopicResource;
    subject: Subject;
    examContext: ExamContext;
    onProgressUpdate?: (silent?: boolean) => void;
    poolCount: number;
}> = ({ topicResource, subject, examContext, onProgressUpdate, poolCount }) => {
    const { user } = useAuth();
    const [viewingSketchIndex, setViewingSketchIndex] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const saveNotesProgress = async (completed: boolean) => {
        if (!user) return;
        setIsSaving(true);
        try {
            // Standard Mastery Formula Recalculation (Simplified for mobile)
            const quizzesTaken = topicResource.quizzesTaken || 0;
            const totalAttempted = topicResource.questionsAttempted || 0;
            const accuracy = topicResource.averageAccuracy || 0;

            const accuracyWeight = 0.60;
            const coverageTarget = Math.min(poolCount, 20);
            const coverageWeight = Math.min(1, totalAttempted / Math.max(1, coverageTarget));

            const newMastery = Math.min(100, Math.round(
                (accuracy * accuracyWeight * coverageWeight) +
                Math.min(20, quizzesTaken * 10) +
                Math.min(10, Math.floor(totalAttempted / 10) * 5) +
                (completed ? 10 : 0)
            ));

            await supabase
                .from('topic_resources')
                .upsert({
                    user_id: user.id,
                    topic_id: topicResource.topicId,
                    subject: subject,
                    exam_context: examContext,
                    study_stage: completed ? 'practicing' : 'studying_notes',
                    notes_completed: completed,
                    mastery_level: newMastery,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,topic_id,exam_context' });

            onProgressUpdate?.(true);
        } catch (e) {
            console.error('Failed to sync notes progress:', e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4 pb-20">
            <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Brain size={20} className="text-primary-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black font-outfit uppercase italic tracking-tighter">Prime Concepts</h3>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Neural Foundation Layer</p>
                        </div>
                    </div>
                    {topicResource.notesCompleted ? (
                        <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center gap-2">
                            <CheckCircle size={10} className="text-emerald-400" />
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Mastered</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => saveNotesProgress(true)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-primary-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all shadow-lg"
                        >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} className="fill-white" />}
                            Mark Complete
                        </button>
                    )}
                </div>
                <p className="text-sm text-white/70 italic leading-relaxed">
                    Visual schemas and strategic conceptual breakdowns for <span className="text-primary-400 font-bold">{topicResource.topicName}</span>.
                </p>
            </div>

            {topicResource.chapterInsights?.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Core Insights</h3>
                    {topicResource.chapterInsights.map((insight, idx) => (
                        <div key={idx} className="bg-white rounded-[1.75rem] p-5 border border-slate-100 shadow-sm relative overflow-hidden group active:bg-slate-50 transition-colors">
                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-active:bg-primary-500 transition-colors" />
                            <h4 className="text-base font-black text-slate-900 font-outfit uppercase mb-2 tracking-tight flex items-center justify-between">
                                {insight.topic}
                                <ChevronRight size={16} className="text-slate-300" />
                            </h4>
                            <p className="text-sm text-slate-500 leading-relaxed mb-4">{insight.description}</p>

                            {(insight.importantFormulas?.length > 0 || insight.preparationChecklist?.length > 0) && (
                                <div className="space-y-3 mb-4">
                                    {insight.importantFormulas?.length > 0 && (
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <Zap size={10} className="text-amber-500" /> Core Equation
                                            </p>
                                            <div className="text-xs font-bold text-slate-900 leading-none">
                                                <RenderWithMath text={insight.importantFormulas[0]} showOptions={false} compact={true} />
                                            </div>
                                        </div>
                                    )}
                                    {insight.preparationChecklist?.length > 0 && (
                                        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50">
                                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <Target size={10} /> Preparation Target
                                            </p>
                                            <p className="text-xs font-bold text-slate-700 leading-tight">{insight.preparationChecklist[0]}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {insight.keyConcepts?.map((c, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-50 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">{c}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Mobile Sketch Grid */}
            <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Visual DNA Units</h3>
                <div className="grid grid-cols-2 gap-4">
                    {topicResource.sketchPages?.map((sketch, idx) => (
                        <button
                            key={idx}
                            onClick={() => setViewingSketchIndex(idx)}
                            className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm aspect-[4/5] flex flex-col active:scale-95 transition-all text-left group"
                        >
                            <div className="flex-1 bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-instrument transition-all">
                                <img src={sketch.imageUrl} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform" />
                                <div className="absolute inset-0 bg-slate-900/0 active:bg-slate-900/10 transition-colors" />
                            </div>
                            <div className="p-4 bg-white">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Schema {idx + 1}</span>
                                <span className="text-xs font-bold text-slate-900 truncate block">{sketch.title}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Sketch Viewer Overlay */}
            <AnimatePresence>
                {viewingSketchIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col p-6"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <button
                                onClick={() => setViewingSketchIndex(null)}
                                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white"
                            >
                                <X size={24} />
                            </button>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Schema {viewingSketchIndex + 1}</p>
                                <p className="text-lg font-black text-white font-outfit uppercase tracking-tighter italic">{topicResource.sketchPages?.[viewingSketchIndex].title}</p>
                            </div>
                            <div className="w-12" />
                        </div>

                        <div className="flex-1 bg-white rounded-[3rem] p-8 flex items-center justify-center shadow-2xl relative overflow-hidden">
                            <img
                                src={topicResource.sketchPages?.[viewingSketchIndex].imageUrl}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>

                        <div className="mt-8 space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6">
                                <h4 className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-3">Conceptual Synthesis</h4>
                                <p className="text-sm font-medium text-white/80 leading-relaxed italic">
                                    {topicResource.sketchPages?.[viewingSketchIndex].content || "This visual schema represents the core structural logic of the concept. Study the relationships between components for deep recall."}
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    disabled={viewingSketchIndex === 0}
                                    onClick={() => setViewingSketchIndex(prev => prev! - 1)}
                                    className="w-16 h-16 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-30"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    onClick={() => setViewingSketchIndex(null)}
                                    className="flex-1 h-16 bg-white text-slate-900 rounded-[2rem] font-black uppercase tracking-widest text-xs"
                                >
                                    Finish Review
                                </button>
                                <button
                                    disabled={viewingSketchIndex === (topicResource.sketchPages?.length || 0) - 1}
                                    onClick={() => setViewingSketchIndex(prev => prev! + 1)}
                                    className="w-16 h-16 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-30"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Enhanced Mobile Quiz Tab
interface MobileQuizTabProps {
    topicResource: TopicResource;
    subject: Subject;
    examContext: ExamContext;
    onStartQuiz?: (topicId: string, totalQuestions?: number) => void;
    sharedQuestions: AnalyzedQuestion[];
    setSharedQuestions: React.Dispatch<React.SetStateAction<AnalyzedQuestion[]>>;
    onProgressUpdate?: (silent?: boolean) => void;
}

export const MobileQuizTab: React.FC<MobileQuizTabProps> = ({
    topicResource,
    subject,
    examContext,
    onStartQuiz,
    sharedQuestions,
    setSharedQuestions,
    onProgressUpdate
}) => {
    const [questionCount, setQuestionCount] = useState(10);
    const { isLoading } = useLearningJourney();
    const { user } = useAuth();

    const steps = ['Analysing syllabus…', 'Predicting exam patterns…', 'Generating questions…', 'Calibrating difficulty…'];
    const [stepIndex, setStepIndex] = useState(0);

    // Past quizzes
    const [pastQuizzes, setPastQuizzes] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Fetch past quizzes from test_attempts on mount
    React.useEffect(() => {
        if (!user || !topicResource.topicId) return;
        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const { data } = await supabase
                    .from('test_attempts')
                    .select('id, created_at, percentage, raw_score, total_questions, duration_minutes, status')
                    .eq('user_id', user.id)
                    .eq('topic_id', topicResource.topicId)
                    .eq('test_type', 'topic_quiz')
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(5);
                setPastQuizzes((data || []).map(q => ({
                    id: q.id,
                    createdAt: q.created_at,
                    percentage: q.percentage ?? 0,
                    score: q.raw_score ?? 0,
                    totalQuestions: q.total_questions ?? 0,
                    durationMinutes: q.duration_minutes ?? 0,
                })));
            } finally {
                setLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [user, topicResource.topicId]);


    // Cycle through generation steps while loading
    React.useEffect(() => {
        if (!isLoading) { setStepIndex(0); return; }
        const interval = setInterval(() => {
            setStepIndex(prev => (prev + 1) % steps.length);
        }, 1800);
        return () => clearInterval(interval);
    }, [isLoading]);

    return (
        <div className="flex flex-col items-center justify-center space-y-8 py-8 px-2 text-center">
            <div className={`w-20 h-20 rounded-[2rem] shadow-2xl flex items-center justify-center relative overflow-hidden transition-all duration-500 ${isLoading ? 'bg-primary-600' : 'bg-slate-900'}`}>
                <div className="absolute top-0 right-0 w-10 h-10 bg-white/20 rounded-full blur-xl -mr-5 -mt-5" />
                {isLoading
                    ? <Loader2 size={36} className="text-white relative z-10 animate-spin" />
                    : <Target size={40} className="text-white relative z-10" />
                }
            </div>

            <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tighter italic leading-none">Exam Protocol</h2>
                {isLoading ? (
                    <p className="text-xs text-primary-600 font-bold max-w-[260px] mx-auto leading-relaxed animate-pulse">
                        {steps[stepIndex]}
                    </p>
                ) : (
                    <p className="text-xs text-slate-500 font-bold max-w-[260px] mx-auto leading-relaxed">
                        AI-proctored simulation module. No instant validation. Full-spectrum performance analysis.
                    </p>
                )}
            </div>

            {/* Question Count Selector — hidden while loading */}
            {!isLoading && (
                <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                        <span className="flex items-center gap-1.5"><Brain size={12} className="text-primary-500" /> Volume</span>
                        <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-full">{questionCount} Qs</span>
                    </div>

                    <input
                        type="range"
                        min="5"
                        max="20"
                        step="5"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />

                    <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                        <span>5</span>
                        <span>10</span>
                        <span>15</span>
                        <span>20</span>
                    </div>
                </div>
            )}

            {!isLoading && (
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                        <Clock size={16} className="text-slate-400 mb-2" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Timer</span>
                        <span className="text-sm font-black text-slate-900 italic">{Math.max(15, questionCount * 1.5)} MIN</span>
                    </div>
                    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                        <Zap size={16} className="text-slate-400 mb-2" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mode</span>
                        <span className="text-sm font-black text-slate-900 italic">ADAPTIVE</span>
                    </div>
                </div>
            )}

            {/* AI Generation Progress Bar */}
            {isLoading && (
                <div className="w-full max-w-sm space-y-3">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full animate-pulse" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%`, transition: 'width 1.8s ease' }} />
                    </div>
                    <div className="flex justify-between">
                        {steps.map((s, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-500 ${i <= stepIndex ? 'bg-primary-500' : 'bg-slate-200'}`} />
                        ))}
                    </div>
                </div>
            )}

            <button
                onClick={() => !isLoading && onStartQuiz?.(topicResource.topicId, questionCount)}
                disabled={isLoading}
                className={`w-full h-16 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-2xl flex items-center justify-center gap-3 transition-all duration-300 ${isLoading
                    ? 'bg-primary-600/90 text-white cursor-not-allowed scale-[0.98]'
                    : 'bg-slate-900 text-white active:scale-95'
                    }`}
            >
                {isLoading ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        AI Generating Questions…
                    </>
                ) : (
                    <>
                        <Play size={18} fill="currentColor" />
                        Initialize Simulation
                    </>
                )}
            </button>

            {!isLoading && (
                <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 flex gap-3 text-left">
                    <Info size={18} className="text-primary-600 shrink-0" />
                    <p className="text-[10px] font-bold text-primary-900/60 leading-normal italic">
                        Note: Your Mastery Level will be recalibrated based on this simulation's performance matrix.
                    </p>
                </div>
            )}

            {/* ── Past Quiz History ─────────────────────────────── */}
            {!isLoading && (
                <div className="w-full max-w-sm">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <History size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Past Simulations</span>
                    </div>

                    {loadingHistory ? (
                        <div className="flex justify-center py-4">
                            <Loader2 size={20} className="text-slate-300 animate-spin" />
                        </div>
                    ) : pastQuizzes.length === 0 ? (
                        <div className="text-center py-5 bg-slate-50 rounded-3xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No history yet</p>
                            <p className="text-[9px] text-slate-300 mt-1">Complete a simulation to see it here</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pastQuizzes.map((quiz) => {
                                const pct = quiz.percentage ?? 0;
                                const scoreColor = pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                                return (
                                    <div key={quiz.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                                        {/* Score badge */}
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${scoreColor}`}>
                                            {pct}%
                                        </div>
                                        {/* Details */}
                                        <div className="flex-1 text-left">
                                            <div className="text-xs font-black text-slate-900">
                                                {quiz.score}/{quiz.totalQuestions} correct
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                {new Date(quiz.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                        {/* Duration */}
                                        <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 shrink-0">
                                            <Clock size={10} />
                                            {quiz.durationMinutes}m
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Enhanced Mobile Flashcards Tab
export const MobileFlashcardsTab: React.FC<{
    topicResource: TopicResource;
    sharedQuestions: AnalyzedQuestion[];
}> = ({ topicResource, sharedQuestions }) => {
    const { user } = useAuth();
    const [currentCard, setCurrentCard] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [cards, setCards] = useState<any[]>(topicResource.flashcards || []);

    const hasCards = cards.length > 0;

    const generateFlashcards = async () => {
        if (!user) return;
        setIsGenerating(true);
        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const prompt = `Create 12-15 comprehensive flashcards for ${topicResource.topicName} (${topicResource.subject}). 
            Return a JSON array of objects with keys: "term", "definition", "context". 
            Include mathematical expressions in $ $ if needed. 
            Focus on core definitions, formulas, and conceptual relationships.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();
            if (text.includes('```json')) {
                text = text.match(/```json\n([\s\S]*?)\n```/)?.[1] || text;
            }
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                setCards(parsed);
                setCurrentCard(0);
                setIsFlipped(false);

                // Save to DB
                await supabase
                    .from('topic_resources')
                    .update({ flashcards: parsed })
                    .eq('id', topicResource.id);
            }
        } catch (e) {
            console.error('Flashcard Error:', e);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!hasCards) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-8">
                <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-amber-200/20 blur-2xl animate-pulse" />
                    <Brain size={48} className="text-amber-500 relative z-10" />
                </div>
                <div className="space-y-3">
                    <h3 className="text-2xl font-black text-slate-900 font-outfit uppercase tracking-tighter italic leading-none">Neural Nodes Latent</h3>
                    <p className="text-sm text-slate-500 font-bold max-w-xs mx-auto leading-relaxed">
                        Space-repetition nodes are not yet synthesized for this topic. Initialize the AI synapse to begin.
                    </p>
                </div>
                <button
                    onClick={generateFlashcards}
                    disabled={isGenerating}
                    className="w-full h-16 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isGenerating ? 'Synthesizing...' : 'Initialize Synapse'}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24">
            {/* Header */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Zap size={20} className="text-amber-400 fill-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black font-outfit uppercase italic tracking-tighter">Recall Engine</h3>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{cards.length} Active Nodes</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3D Flip Card */}
            <div
                className="perspective-1000 relative w-full h-[400px]"
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <motion.div
                    className="w-full h-full relative preserve-3d"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                    {/* Front */}
                    <div className="absolute inset-0 backface-hidden bg-white rounded-[3rem] p-8 border-2 border-slate-100 shadow-2xl flex flex-col items-center justify-center text-center">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
                        <span className="text-[12px] font-black text-amber-500 uppercase tracking-[0.2em] mb-8 px-4 py-1.5 bg-amber-50 rounded-full border border-amber-100">Node {currentCard + 1}</span>
                        <div className="text-2xl font-black text-slate-900 font-instrument leading-tight">
                            <RenderWithMath text={cards[currentCard].term} showOptions={false} compact={true} />
                        </div>
                        <div className="mt-auto flex items-center gap-2 text-slate-400">
                            <Eye size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Tap to reveal depth</span>
                        </div>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute inset-0 backface-hidden bg-slate-900 rounded-[3rem] p-8 border-2 border-slate-800 shadow-2xl flex flex-col items-center justify-center text-center"
                        style={{ transform: 'rotateY(180deg)' }}
                    >
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 to-cyan-500" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-8 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">Synthesis</span>
                        <div className="flex-1 overflow-y-auto w-full px-2 scroller-hide flex flex-col items-center justify-center">
                            <div className="text-lg font-bold text-white leading-relaxed">
                                <RenderWithMath text={cards[currentCard].definition} showOptions={false} dark={true} compact={true} />
                            </div>
                            {cards[currentCard].context && (
                                <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 w-full text-left">
                                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Contextual Bridge</p>
                                    <p className="text-[11px] font-bold text-emerald-100 italic leading-relaxed">{cards[currentCard].context}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-6 px-4">
                <button
                    onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCurrentCard(prev => (prev - 1 + cards.length) % cards.length); }}
                    className="w-16 h-16 rounded-[2rem] bg-white border border-slate-100 shadow-lg flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
                >
                    <ChevronLeft size={28} />
                </button>

                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Syllabus Index</p>
                    <p className="text-xl font-black text-slate-900">{currentCard + 1}<span className="text-slate-200"> / {cards.length}</span></p>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCurrentCard(prev => (prev + 1) % cards.length); }}
                    className="w-16 h-16 rounded-[2rem] bg-slate-900 shadow-xl flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                    <ChevronRight size={28} />
                </button>
            </div>
        </div>
    );
};

// Enhanced Mobile Progress Tab
export const MobileProgressTab: React.FC<{
    topicResource: TopicResource,
    pastQuizzes?: any[],
    isLoadingQuizzes?: boolean
}> = ({ topicResource, pastQuizzes = [], isLoadingQuizzes = false }) => {
    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <BarChart3 size={20} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black font-outfit uppercase italic tracking-tighter">Helix Metrics</h3>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Performance Intelligence</p>
                    </div>
                </div>
            </div>

            {/* Global Mastery Ring */}
            <div className="bg-white border border-slate-100 rounded-[3rem] p-8 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Mastery Quotient</h3>

                <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="70" strokeWidth="10" stroke="currentColor" fill="transparent" className="text-slate-50" />
                        <motion.circle
                            cx="80" cy="80" r="70" strokeWidth="10"
                            strokeDasharray={440}
                            initial={{ strokeDashoffset: 440 }}
                            animate={{ strokeDashoffset: 440 - (440 * topicResource.masteryLevel) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            strokeLinecap="round" stroke="currentColor" fill="transparent" className="text-indigo-600"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{topicResource.masteryLevel}%</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase mt-1">Syllabus Command</span>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                        <div className="text-lg font-black text-slate-900">{topicResource.questionsAttempted}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase">Attempted</div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                        <div className="text-lg font-black text-emerald-600">{topicResource.questionsCorrect}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase">Correct</div>
                    </div>
                </div>
            </div>

            {/* Strategic Intelligence Cards */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label: 'Precision', val: `${topicResource.averageAccuracy.toFixed(0)}%`, icon: Target, color: 'text-rose-500', bg: 'bg-rose-50' },
                    { label: 'Latency', val: 'Low', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Consistency', val: 'High', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Last Sync', val: topicResource.lastPracticed ? new Date(topicResource.lastPracticed).toLocaleDateString() : 'Never', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' }
                ].map((insight, i) => (
                    <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className={`w-10 h-10 ${insight.bg} rounded-xl flex items-center justify-center`}>
                            <insight.icon size={18} className={insight.color} />
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{insight.label}</div>
                            <div className="text-base font-black text-slate-900">{insight.val}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Simulation History */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <History size={16} className="text-slate-400" />
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Simulation Log</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{pastQuizzes.length} Sessions</span>
                </div>

                {isLoadingQuizzes ? (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 flex items-center justify-center">
                        <Loader2 size={24} className="text-slate-300 animate-spin" />
                    </div>
                ) : pastQuizzes.length > 0 ? (
                    <div className="space-y-3">
                        {pastQuizzes.slice(0, 5).map((quiz, idx) => (
                            <div key={quiz.id || idx} className="bg-white border border-slate-100 rounded-3xl p-4 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${quiz.accuracy_percentage >= 80 ? 'bg-emerald-50 text-emerald-600' :
                                        quiz.accuracy_percentage >= 50 ? 'bg-amber-50 text-amber-600' :
                                            'bg-rose-50 text-rose-600'
                                        }`}>
                                        {quiz.accuracy_percentage}%
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                            {quiz.correct_count} / {quiz.question_count} Correct
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400">
                                            {new Date(quiz.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {Math.floor(quiz.time_spent_seconds / 60)}m {quiz.time_spent_seconds % 60}s
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-50 text-slate-400">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        ))}
                        {pastQuizzes.length > 5 && (
                            <button className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all">
                                Load Full Archive
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 text-center space-y-3">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                            <History size={20} className="text-slate-200" />
                        </div>
                        <p className="text-[11px] font-bold text-slate-400">No simulation data salvaged yet.</p>
                    </div>
                )}
            </div>

            {/* Agentic Recommendation */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles size={14} /> Agentic Recommendation
                </h3>
                <p className="text-white text-sm font-medium leading-relaxed mb-6 italic">
                    {topicResource.masteryLevel < 50
                        ? `System detects fundamental gaps in ${topicResource.topicName}. PRIORITY: Review primary conceptual schemas and complete Foundational Node Practice.`
                        : topicResource.masteryLevel < 85
                            ? `Current mastery is stable but optimization is required. PRIORITY: Initiate "Adaptive Quiz" mode to target moderate-to-hard latent concepts.`
                            : `Elite stage reached. PRIORITY: Maintenance sync every 72 hours to sustain 90%+ percentile performance.`}
                </p>
                <div className="flex flex-col gap-2">
                    <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase active:bg-white/10 transition-all text-center">Deep Dive Analysis</button>
                    <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase active:bg-white/10 transition-all text-center">Curated Weak Areas</button>
                </div>
            </div>
        </div>
    );
};
