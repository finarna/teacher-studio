/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - MODERN PROFESSIONAL CHATBOT (Full Featured)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useEffect, useState } from 'react';
import { X, Send, Trash2, User } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useVidyaChatV3 } from '../hooks/useVidyaChatV3';
import { VidyaAppContext } from '../types';
import RichMarkdownRenderer from './RichMarkdownRenderer';
import VidyaQuickActions from './vidya/VidyaQuickActions';
import { getQuickActions, getDefaultQuickActions } from '../utils/vidya/quickActions';
import { buildContextPayload } from '../utils/vidya/contextBuilder';
import { useAppContext } from '../contexts/AppContext';
import { useSubjectTheme } from '../hooks/useSubjectTheme';

interface VidyaV3Props {
  appContext?: VidyaAppContext;
}

const VidyaV3: React.FC<VidyaV3Props> = ({ appContext }) => {
  const { activeSubject, subjectConfig, examConfig } = useAppContext();
  const theme = useSubjectTheme();

  const {
    messages,
    isOpen,
    isTyping,
    error,
    userRole,
    setUserRole,
    toggleChat,
    sendMessage,
    clearChat,
  } = useVidyaChatV3(appContext);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Compute quick actions based on context
  const quickActions = React.useMemo(() => {
    if (!appContext?.scannedPapers || appContext.scannedPapers.length === 0) {
      return getDefaultQuickActions(userRole);
    }

    const contextPayload = buildContextPayload({
      currentView: appContext.currentView,
      scannedPapers: appContext.scannedPapers,
      selectedScan: appContext.selectedScan,
      activeSubject,
      activeExamContext: examConfig.name,
    }, userRole);

    return getQuickActions(userRole, contextPayload);
  }, [userRole, appContext]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isTyping) return;
    setInput('');
    await sendMessage(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return createPortal(
    <div className="fixed bottom-5 right-5 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[420px] h-[650px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">

          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between shrink-0"
            style={{
              background: `linear-gradient(to right, ${theme.color}, ${theme.colorDark})`
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                <img src="/assets/vidya-avatar.gif" alt="Vidya" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Vidya AI</h3>
                <div className="flex items-center gap-2">
                  <p className="text-white/80 text-xs">{userRole === 'teacher' ? 'Teacher Mode' : 'Student Mode'}</p>
                  <span className="text-white/50 text-xs">•</span>
                  <div className="flex items-center gap-1 text-xs text-white/90">
                    <span>{subjectConfig.iconEmoji}</span>
                    <span>{subjectConfig.displayName}</span>
                    <span className="text-white/50">|</span>
                    <span>{examConfig.name}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setUserRole(userRole === 'teacher' ? 'student' : 'teacher')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title={`Switch to ${userRole === 'teacher' ? 'Student' : 'Teacher'} Mode`}
              >
                <User className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={clearChat}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Clear Chat"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={toggleChat}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {msg.role === 'assistant' ? (
                    <img src="/assets/vidya-avatar.gif" alt="AI" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-indigo-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Message */}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                  }`}
                >
                  <RichMarkdownRenderer
                    text={msg.content}
                    className={msg.role === 'user' ? 'text-white' : 'text-gray-800'}
                  />
                  {msg.isStreaming && (
                    <span className="inline-block w-[3px] h-4 ml-1 bg-current animate-pulse" />
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && !messages[messages.length - 1]?.isStreaming && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0">
                  <img src="/assets/vidya-avatar.gif" alt="AI" className="w-full h-full object-cover rounded-full" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm shrink-0">
              {error}
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white border-t border-gray-100 shrink-0">
            <VidyaQuickActions
              actions={quickActions}
              onActionClick={handleSend}
              disabled={isTyping}
              userRole={userRole}
            />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200 shrink-0">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-h-32 scrollbar-thin"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              Powered by Gemini 2.0 Flash • Context-Aware AI
            </p>
          </div>
        </div>
      )}

      {/* FAB Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group relative"
        >
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center overflow-hidden">
            <img src="/assets/vidya-avatar.gif" alt="Vidya" className="w-full h-full object-cover" />
          </div>
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-indigo-400 opacity-75 animate-ping" />
        </button>
      )}
    </div>,
    document.body
  );
};

export default VidyaV3;
