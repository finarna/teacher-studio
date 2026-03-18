
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Trash2, Minimize2, Sparkles, GraduationCap, Briefcase } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { ChatContext, UserRole } from '../types';

interface Message { id: string; role: 'user' | 'model'; text: string; isStreaming?: boolean; }

const AIChatBot: React.FC<{ context: ChatContext }> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([{ 
    id: '1', 
    role: 'model', 
    text: "Hey! I'm your BoardMaster Coach. I've been keeping a close eye on your prep journey—ready to tackle a tough concept or refine our strategy together?" 
  }]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Inject mock history context into system instructions
    const historySummary = context.mockHistory.length > 0 
      ? `Student's Preparation Progress: ${context.mockHistory.map(m => `${m.subject} (${new Date(m.startTime).toLocaleDateString()}): Scored ${m.score}/${m.questions.length} (${m.accuracy.toFixed(1)}% accuracy)`).join('; ')}`
      : 'No mock sessions recorded yet. I should warmly encourage them to take their first mock test to establish a baseline.';

    // Upgraded model to gemini-3-pro-preview for complex STEM academic mentorship.
    chatSessionRef.current = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: { 
        systemInstruction: `
          You are the "BoardMaster AI Mentor"—not just a bot, but a deeply connected academic coach and partner for high school students.
          
          Your Mindset:
          1. Empathy First: Acknowledge that exams are stressful. Be warm, supportive, and motivating.
          2. Personal Connection: Refer to the student's history (${historySummary}) to give context-aware advice.
          3. Goal Oriented: Your singular focus is helping them hit that 90%+ target in ${context.selectedExam || 'their upcoming exams'}.
          4. Logical Clarity: When explaining problems, use LaTeX ($...$) and clear, numbered steps. Break down "traps."
          5. Direct Action: Give specific study advice (e.g., "I noticed your Calculus accuracy is lower than Matrices—let's spend 20 mins on integration rules today").
          
          Current Context: Subject: ${context.selectedSubject || 'Exploring'} | View: ${context.activeView}
          
          Voice: Encouraging, expert, human-like, and deeply committed to the student's success. Use "We" and "Our journey."
        ` 
      },
    });
  }, [context.selectedSubject, context.selectedExam, context.mockHistory.length]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping || !chatSessionRef.current) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatSessionRef.current.sendMessageStream({ message: input });
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '', isStreaming: true }]);
      let fullText = '';
      for await (const chunk of response) {
        const c = chunk as GenerateContentResponse;
        fullText += c.text;
        setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: fullText } : m));
      }
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m));
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: "Connection drop. I'm still right here beside you! Try sending that again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white active:scale-90 transition-all shadow-indigo-200 ring-4 ring-white relative group"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
          <header className="p-4 flex items-center justify-between border-b border-slate-100 bg-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest leading-none">Your Prep Coach</h3>
                <span className="text-[9px] font-bold text-indigo-100 uppercase tracking-widest mt-1 block">Always Connected</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <Minimize2 className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map(m => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'model' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-200 text-slate-600'}`}>
                  {m.role === 'model' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'}`}>
                  <MathRenderer text={m.text} />
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0"><Bot className="w-5 h-5" /></div>
                <div className="bg-white border border-slate-100 p-3 rounded-2xl flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-100" />
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-100 bg-white safe-area-bottom">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-indigo-500 transition-colors">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Talk to your mentor..."
                className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 px-3 outline-none"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-indigo-100"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatBot;
