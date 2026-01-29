/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V2 - MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete AI assistant UI with FAB, glassmorphism chat window,
 * rich message rendering, and proactive suggestions
 */

import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  Trash2,
  Sparkles,
  Download,
  Settings,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useVidyaV2 } from '../hooks/useVidyaV2';
import { VidyaAppContext, VidyaActions, UserRole } from '../types/vidya';
import VidyaMessageBubble from './vidya/VidyaMessageBubble';
import { downloadSession } from '../utils/vidyaSession';

interface VidyaV2Props {
  userRole: UserRole;
  appContext: VidyaAppContext;
  actions: VidyaActions;
}

/**
 * Vidya V2 - Industry-Best AI Assistant
 */
const VidyaV2: React.FC<VidyaV2Props> = ({ userRole, appContext, actions }) => {
  const {
    state,
    messages,
    toggleChat,
    sendMessage,
    clearHistory,
    dismissSuggestion,
    saveSession,
    exportSession,
    canSendMessage,
  } = useVidyaV2(userRole, appContext, actions);

  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (messagesEndRef.current && state.isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, state.isOpen]);

  /**
   * Focus input when chat opens
   */
  useEffect(() => {
    if (state.isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [state.isOpen]);

  /**
   * Handle send message
   */
  const handleSend = () => {
    if (!inputValue.trim() || !canSendMessage) return;

    sendMessage(inputValue);
    setInputValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  /**
   * Handle Enter key
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Auto-resize textarea
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  /**
   * Handle quick reply
   */
  const handleQuickReply = (reply: string) => {
    setInputValue(reply);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  /**
   * Handle export
   */
  const handleExport = async () => {
    try {
      if (state.session) {
        await downloadSession(state.session);
        actions.showNotification('Session exported successfully!', 'success');
      }
    } catch (error) {
      actions.showNotification('Failed to export session', 'error');
    }
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FLOATING ACTION BUTTON */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-[998] w-14 h-14 rounded-2xl bg-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center group border border-slate-200/50"
        aria-label="Open Vidya AI Assistant"
      >
        <img
          src="/assets/vidya-avatar.gif"
          alt="Vidya AI"
          className="w-10 h-10 rounded-xl object-cover"
        />
        {/* Glow effect */}
        <span className="absolute inset-0 rounded-2xl bg-blue-500 blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300" />

        {/* Notification badge (if suggestions) */}
        {state.activeSuggestions.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
            {state.activeSuggestions.length}
          </span>
        )}
      </button>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CHAT WINDOW PORTAL */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {state.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-end justify-end p-6 pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-md h-[700px] max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white"
            >
              {/* ────────────────────────────────────────────────────────── */}
              {/* HEADER */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/vidya-avatar.gif"
                    alt="Vidya AI"
                    className="w-10 h-10 rounded-xl object-cover shadow-sm"
                  />
                  <div>
                    <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
                      Vidya
                    </h3>
                    <p className="text-xs text-slate-500">
                      {state.isProcessingTool
                        ? 'Executing action...'
                        : state.isThinking
                        ? 'Thinking...'
                        : 'AI Teaching Assistant'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Export button */}
                  <button
                    onClick={handleExport}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                    title="Export conversation"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Clear history */}
                  <button
                    onClick={clearHistory}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                    title="Clear history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {/* Close */}
                  <button
                    onClick={toggleChat}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* SUGGESTIONS BAR */}
              {/* ────────────────────────────────────────────────────────── */}
              {state.activeSuggestions.length > 0 && !showSettings && (
                <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-900 mb-2">
                        Suggestions for you
                      </p>
                      <div className="space-y-2">
                        {state.activeSuggestions.slice(0, 2).map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-blue-100 shadow-sm hover:shadow transition-shadow"
                          >
                            <p className="text-xs text-slate-700 flex-1">
                              {suggestion.message}
                            </p>
                            <button
                              onClick={() => dismissSuggestion(suggestion.id)}
                              className="text-slate-400 hover:text-slate-600 ml-3 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────── */}
              {/* MESSAGES */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50/30">
                {messages.length === 0 && !state.isThinking && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <img
                      src="/assets/vidya-avatar.gif"
                      alt="Vidya AI"
                      className="w-16 h-16 rounded-2xl object-cover mb-5 shadow-lg"
                    />
                    <h4 className="font-semibold text-slate-900 text-lg mb-2">
                      Hi! I'm Vidya 👋
                    </h4>
                    <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
                      I can help you navigate the app, analyze your data, create lessons,
                      and generate insights. What would you like to do?
                    </p>
                  </div>
                )}

                {messages.map((message) => (
                  <VidyaMessageBubble
                    key={message.id}
                    message={message}
                    onQuickReply={handleQuickReply}
                  />
                ))}

                {/* Thinking indicator */}
                {state.isThinking && (
                  <div className="flex items-start gap-3 mb-4">
                    <img
                      src="/assets/vidya-avatar.gif"
                      alt="Vidya AI"
                      className="flex-shrink-0 w-8 h-8 rounded-xl object-cover shadow-sm"
                    />
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-slate-200 shadow-sm">
                      <div className="flex gap-1">
                        <span
                          className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tool processing indicator */}
                {state.isProcessingTool && state.currentToolCall && (
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-blue-200 shadow-sm">
                      <p className="text-xs font-medium text-blue-900">
                        Executing: {state.currentToolCall.toolName}
                      </p>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {state.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{state.error}</span>
                  </div>
                )}

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* INPUT AREA */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="px-6 py-4 bg-white border-t border-slate-100">
                <div className="flex items-end gap-3">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about the app..."
                    className="flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px] max-h-[120px] bg-white transition-shadow hover:border-slate-300"
                    rows={1}
                    disabled={!canSendMessage}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || !canSendMessage}
                    className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm hover:shadow-md active:scale-95"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Press Enter to send • Shift+Enter for new line
                </p>

                {/* Session stats */}
                {state.session && (
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                    <span>{state.analytics.messagesCount} messages</span>
                    <span>{state.analytics.toolCallsCount} actions taken</span>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default VidyaV2;
