import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Trash2, Loader2 } from 'lucide-react';
import { useVidyaChat } from '../hooks/useVidyaChat';
import { UserRole, VidyaAppContext } from '../types';
import VidyaMessage from './VidyaMessage';

interface VidyaProps {
  userRole: UserRole;
  currentView?: string;
  appContext?: VidyaAppContext;
}

/**
 * Vidya AI Chatbot - Main Component
 * Floating Action Button + Glassmorphism Chat Window
 * Real-time streaming responses with math rendering
 */
const Vidya: React.FC<VidyaProps> = ({ userRole, currentView, appContext }) => {
  const {
    messages,
    isOpen,
    isThinking,
    error,
    toggleChat,
    sendMessage,
    clearHistory,
  } = useVidyaChat(userRole, currentView, appContext);

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  /**
   * Focus input when chat opens
   */
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  /**
   * Handle send message
   */
  const handleSend = () => {
    if (!inputValue.trim() || isThinking) return;

    sendMessage(inputValue);
    setInputValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  /**
   * Handle Enter key (send message) and Shift+Enter (new line)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Auto-resize textarea as user types
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-[998] w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        aria-label="Open Vidya AI Assistant"
      >
        <img
          src="/assets/vidya-avatar.gif"
          alt="Vidya AI"
          className="w-12 h-12 rounded-full object-cover"
        />
        {/* Pulse animation ring */}
        <span className="absolute inset-0 rounded-full bg-primary-600 animate-ping opacity-20 group-hover:opacity-0" />
      </button>

      {/* Chat Window Portal */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-end justify-end p-6 pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-md h-[600px] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl glass"
              style={{
                backdropFilter: 'blur(20px) saturate(180%)',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/vidya-avatar.gif"
                    alt="Vidya"
                    className="w-10 h-10 rounded-full border-2 border-white/30"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">Vidya</h3>
                    <p className="text-xs text-white/80">AI Teaching Assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Clear History Button */}
                  <button
                    onClick={clearHistory}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    aria-label="Clear chat history"
                    title="Clear chat history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {/* Close Button */}
                  <button
                    onClick={toggleChat}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    aria-label="Close chat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
                {messages.map((message) => (
                  <VidyaMessage key={message.id} message={message} />
                ))}

                {/* Thinking Indicator */}
                {isThinking && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-100">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="px-5 py-4 bg-white/50 backdrop-blur-sm border-t border-slate-200/50">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me about the app..."
                    className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px] max-h-[120px]"
                    rows={1}
                    disabled={isThinking}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isThinking}
                    className="flex-shrink-0 w-11 h-11 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    aria-label="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Press Enter to send • Shift+Enter for new line
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Vidya;
