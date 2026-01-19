import React, { useState, useMemo, useEffect } from 'react';
import {
  Scan,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Brain,
  Trophy,
  Clock,
  Zap,
  CheckCircle2,
  Bookmark,
  Share2,
  Loader2
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RenderWithMath } from './MathRenderer';
import { cache } from '../utils/cache';

interface Flashcard {
  term: string;
  def: string;
  extra?: string;
  domain?: string;
}

interface Scan {
  id: string;
  name: string;
  subject: string;
  grade: string;
  analysisData?: {
    questions?: any[];
  };
}

interface RapidRecallProps {
  recentScans?: Scan[];
}

const RapidRecall: React.FC<RapidRecallProps> = ({ recentScans = [] }) => {
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedScan, setSelectedScan] = useState<string>('');
  const [cardCount, setCardCount] = useState<number>(10);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isCached, setIsCached] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>('All');

  const groupedCards = useMemo(() => {
    const groups: Record<string, Flashcard[]> = { 'All': cards };
    cards.forEach(card => {
      const domain = card.domain || 'General';
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(card);
    });
    return groups;
  }, [cards]);

  const displayedCards = groupedCards[selectedDomain] || [];

  // Reset card index when domain changes
  useEffect(() => {
    setCurrentCard(0);
    setIsFlipped(false);
  }, [selectedDomain]);

  // Fetch cached cards when scan is selected
  React.useEffect(() => {
    const loadCachedCards = async () => {
      if (!selectedScan) {
        setCards([]);
        setIsCached(false);
        return;
      }

      // 1. Check local cache first
      const localCached = cache.get(`flashcards_${selectedScan}`);
      if (localCached && localCached.length > 0) {
        setCards(localCached);
        setIsCached(true);
        setCurrentCard(0);
        setIsFlipped(false);
        return;
      }

      // 2. Check server cache
      try {
        const res = await fetch(`/api/flashcards/${selectedScan}`);
        const data = await res.json();

        if (data.cards && data.cards.length > 0) {
          setCards(data.cards);
          setIsCached(true);
          setCurrentCard(0);
          setIsFlipped(false);
          // Sync to local cache
          cache.save(`flashcards_${selectedScan}`, data.cards, selectedScan, 'flashcard');
        } else {
          setCards([]);
          setIsCached(false);
        }
      } catch (err) {
        // ... err handling
      }
    };

    loadCachedCards();
  }, [selectedScan]);

  const fetchCards = async () => {
    if (!selectedScan) {
      alert('Please select an analysis from your vault first');
      return;
    }

    setIsGenerating(true);
    try {
      const scan = recentScans.find(s => s.id === selectedScan);
      if (!scan || !scan.analysisData?.questions) {
        throw new Error('No analysis data found');
      }

      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: "application/json" }
      });

      // Extract key concepts from questions with derivations
      const questionsWithDerivations = scan.analysisData.questions.filter(
        q => q.solutionSteps || q.masteryMaterial
      );

      const conceptsPrompt = `You are an elite academic specialist. Extract ${cardCount} high-yield flashcard concepts from these ${scan.subject} ${scan.grade} questions and their solutions.
      
      Questions Data:
      ${JSON.stringify(questionsWithDerivations.slice(0, 20).map(q => ({
        text: q.text,
        topic: q.topic,
        steps: q.solutionSteps,
        mastery: q.masteryMaterial
      })))}
      
      Generate ${cardCount} flashcards focusing on:
      - Key formulas and their applications
      - Core concepts and definitions
      - Memory triggers and mnemonics
      - Important derivation steps
      
      CRITICAL: You MUST output exactly ONE CONTINUOUS PARAGRAPH. Prohibited: No newlines, no breaks, no bullets.
      MATH FORMATTING: Use only single $ $ for ALL math (e.g., $E=hf$). NEVER use $$ $$. Ensure everything flows as a single sentence string.
      EXAMPLE: "The **photon Energy** is given by $E = h \nu$, where $h$ is **Planck's constant** and $\nu$ is the **frequency**."
      
      Return JSON ONLY: { "cards": [ { "term": "Short title ($ $ allowed)", "def": "A single continuous paragraph of pedagogical explanation with integrated $ $ for all variables. NO NEWLINES.", "extra": "Core numeric take-away ($ $ only)", "domain": "String" } ] }`;

      const result = await model.generateContent(conceptsPrompt);
      const response = await result.response;
      const data = JSON.parse(response.text() || "{}");

      if (data.cards && data.cards.length > 0) {
        setCards(data.cards);
        setCurrentCard(0);
        setIsFlipped(false);
        setIsCached(false);

        // Save to local cache
        cache.save(`flashcards_${selectedScan}`, data.cards, selectedScan, 'flashcard');

        // Save to server cache
        try {
          await fetch('/api/flashcards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scanId: selectedScan, cards: data.cards })
          });
        } catch (cacheErr) {
          console.error('Failed to cache flashcards on server:', cacheErr);
        }
      } else {
        throw new Error('No cards generated');
      }
    } catch (e) {
      console.error("Failed to generate cards", e);
      alert('Failed to generate flashcards. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (displayedCards.length === 0) return;
    setCurrentCard((prev) => (prev + 1) % displayedCards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (displayedCards.length === 0) return;
    setCurrentCard((prev) => (prev - 1 + displayedCards.length) % displayedCards.length);
  };

  return (
    <div className="flex-1 bg-slate-50 font-instrument text-slate-900 flex flex-col h-screen overflow-hidden selection:bg-primary-500 selection:text-white">
      {/* Top Navigation */}
      <header className="h-20 border-b border-slate-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-20 sticky top-0">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
              <Zap size={20} className="text-primary-400" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight font-outfit uppercase tracking-tighter">Rapid <span className="text-primary-600">Recall</span></h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] font-outfit leading-none">High Yield revision</p>
            </div>
          </div>

          <div className="h-8 w-[2px] bg-slate-100 mx-2"></div>

          <div className="flex gap-3">
            <select
              value={selectedScan}
              onChange={(e) => setSelectedScan(e.target.value)}
              className="bg-white border border-slate-200 text-[11px] font-bold text-slate-700 rounded-lg px-3 py-1.5 outline-none focus:ring-4 focus:ring-primary-500/10 shadow-sm transition-all cursor-pointer min-w-[200px]"
            >
              <option value="">Select Analysis...</option>
              {recentScans.map(scan => (
                <option key={scan.id} value={scan.id}>
                  {scan.name} ({scan.subject})
                </option>
              ))}
            </select>
            <select
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="bg-white border border-slate-200 text-[11px] font-bold text-slate-700 rounded-lg px-3 py-1.5 outline-none focus:ring-4 focus:ring-primary-500/10 shadow-sm transition-all cursor-pointer"
            >
              <option value={10}>10 Cards</option>
              <option value={20}>20 Cards</option>
              <option value={50}>50 Cards</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchCards}
          disabled={isGenerating || !selectedScan}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg flex items-center gap-2.5 disabled:opacity-50 transition-all font-outfit uppercase tracking-wider text-[10px]"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-primary-400" />}
          {isGenerating ? 'Synthesizing...' : isCached ? 'Regenerate Cards' : 'Generate Cards'}
        </button>
        {isCached && cards.length > 0 && (
          <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Cached ({cards.length} cards)
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Domain Filter Bar */}
        {cards.length > 0 && (
          <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center gap-3 overflow-x-auto scroller-hide shadow-sm z-10">
            {Object.keys(groupedCards).map(domain => (
              <button
                key={domain}
                onClick={() => setSelectedDomain(domain)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedDomain === domain
                  ? 'bg-slate-900 text-white shadow-lg scale-105'
                  : 'bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-100'
                  }`}
              >
                {domain} ({groupedCards[domain].length})
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          <div className="flex-1 p-10 flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
              <Brain size={600} className="text-slate-900" />
            </div>
            <div className="w-full max-w-2xl perspective-1000 relative z-10">
              {displayedCards.length > 0 ? (
                <>
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className={`relative w-full aspect-[16/10] transition-all duration-700 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                  >
                    {/* Card Front */}
                    <div className="absolute inset-0 backface-hidden bg-white rounded-2xl p-10 shadow-xl flex flex-col items-center text-center justify-center border border-slate-100 overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-primary-500 rounded-t-2xl"></div>
                      <div className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.3em] mb-4 font-outfit">{displayedCards[currentCard].domain || 'General Concept'}</div>
                      <div className="flex-1 flex items-center justify-center w-full max-h-[calc(100%-120px)] overflow-y-auto px-4">
                        <div className="text-xl md:text-2xl font-black text-slate-900 leading-tight font-outfit tracking-tight italic">
                          <RenderWithMath text={displayedCards[currentCard].term} showOptions={false} compact={true} serif={false} />
                        </div>
                      </div>
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-300 font-bold text-[9px] uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse"></div> Click to reveal intelligence
                      </div>
                    </div>

                    {/* Card Back */}
                    <div className="absolute inset-0 backface-hidden bg-slate-900 rounded-2xl shadow-xl flex flex-col border border-slate-800 rotate-y-180 overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 rounded-t-2xl"></div>

                      {/* Scrollable content area with proper padding */}
                      <div className="flex-1 w-full overflow-y-auto px-8 pt-10 pb-20 scroller-hide">
                        <div className="flex flex-col items-center justify-center min-h-full space-y-6">
                          {/* Main definition text */}
                          <div className="text-sm md:text-base font-bold text-white leading-relaxed font-outfit italic max-w-xl text-center">
                            <RenderWithMath text={displayedCards[currentCard].def} showOptions={false} autoSteps={true} dark={true} compact={true} serif={false} />
                          </div>

                          {/* Formula section */}
                          {displayedCards[currentCard].extra && (
                            <div className="w-full max-w-md">
                              <div className="bg-emerald-500/10 border border-emerald-500/30 px-6 py-4 rounded-2xl backdrop-blur-xl shadow-2xl relative overflow-hidden group/eqn">
                                <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/20 text-[7px] font-black text-emerald-400 uppercase tracking-widest rounded-bl-lg">Equation Vault</div>
                                <div className="text-emerald-300 font-bold text-base md:text-lg tracking-tight text-center relative z-10">
                                  <RenderWithMath text={displayedCards[currentCard].extra} showOptions={false} autoSteps={true} dark={true} compact={true} serif={false} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between px-4">
                    <div className="flex gap-3">
                      <button onClick={handlePrev} className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm">
                        <ChevronLeft size={24} />
                      </button>
                      <button onClick={handleNext} className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm">
                        <ChevronRight size={24} />
                      </button>
                    </div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-outfit">
                      Blueprint {currentCard + 1} <span className="text-slate-200 mx-1.5">/</span> {cards.length}
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full aspect-[16/10] bg-white border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 shadow-xl">
                  <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-center mb-8 text-slate-300">
                    <Brain size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4 font-outfit tracking-tight">Neural Sync Required</h3>
                  <p className="text-slate-500 max-w-xs mb-10 font-bold italic leading-relaxed">Select your domain and grade to synthesize high-yield pedagogical flashcards.</p>
                  <button
                    onClick={fetchCards}
                    disabled={isGenerating}
                    className="px-12 py-5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-[2rem] shadow-2xl transition-all active:scale-95 flex items-center gap-4 uppercase tracking-[0.2em] text-sm"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles className="text-primary-400" size={20} />}
                    {isGenerating ? 'Synthesizing...' : 'Sync AI Deck'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="w-full md:w-80 border-l border-slate-200 bg-white p-8 hidden xl:flex flex-col gap-8">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <Trophy size={60} className="text-slate-900" />
              </div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-1.5 bg-primary-50 rounded-lg"><Trophy size={16} className="text-primary-600" /></div>
                <h4 className="font-bold text-slate-900 uppercase text-[9px] tracking-wider">Strategic Drill</h4>
              </div>
              <p className="text-slate-500 font-medium text-xs leading-relaxed italic relative z-10">
                Peak cognitive drill Mode. Perfect for recall verification 15 minutes before high-stakes assessment.
              </p>
            </div>

            <div className="p-6 bg-slate-900 rounded-2xl text-center shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary-500/5 rotate-45 translate-x-10 translate-y-10 rounded-full blur-2xl group-hover:bg-primary-500/10 transition-all duration-1000"></div>
              <div className="w-12 h-12 bg-white/10 border border-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-white relative z-10">
                <Clock size={24} />
              </div>
              <h4 className="text-white/60 font-bold mb-0.5 uppercase text-[9px] tracking-wider relative z-10">Integration Progress</h4>
              <p className="text-4xl font-black text-primary-400 tabular-nums relative z-10 font-outfit">0%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RapidRecall;