/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - CLEAN CHAT HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { getGeminiClient, withGeminiRetry } from '../utils/geminiClient';
import { AI_CONFIG } from '../config/aiConfigs';
import { VidyaMessage, VidyaAppContext } from '../types';
import {
  getSystemInstruction,
  getRoleTransitionMessage,
  getWelcomeMessage,
  VidyaRole
} from '../utils/vidya/systemInstructions';
import { buildContextPayload, formatContextForGemini } from '../utils/vidya/contextBuilder';
import { trackMessagePerformance, estimateTokenCount } from '../utils/vidya/performanceMonitor';
import { formatMathInResponse } from '../utils/vidya/mathFormatter';

interface VidyaChatV3State {
  messages: VidyaMessage[];
  isOpen: boolean;
  isTyping: boolean;
  error: string | null;
}

export interface UseVidyaChatV3Return {
  messages: VidyaMessage[];
  isOpen: boolean;
  isTyping: boolean;
  error: string | null;
  userRole: VidyaRole;
  setUserRole: (role: VidyaRole) => void;
  toggleChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

export function useVidyaChatV3(
  appContext?: VidyaAppContext
): UseVidyaChatV3Return {

  const [userRole, setUserRole] = useState<VidyaRole>('student');
  const [state, setState] = useState<VidyaChatV3State>({
    messages: [{
      id: 'init-1',
      role: 'assistant',
      content: getWelcomeMessage('student'),
      timestamp: new Date(),
    }],
    isOpen: false,
    isTyping: false,
    error: null,
  });

  const initializedRef = useRef(false);

  /**
   * Initialize or reinitialize chat when role changes
   */
  useEffect(() => {
    // Add role transition message if not first initialization
    if (initializedRef.current) {
        const transitionMsg: VidyaMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: getRoleTransitionMessage(userRole),
          timestamp: new Date(),
        };
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, transitionMsg],
        }));
    }
    initializedRef.current = true;
  }, [userRole]);

  /**
   * Toggle chat window
   */
  const toggleChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  /**
   * Send message with manual history management and new SDK
   */
  const sendMessage = useCallback(async (textToSend: string) => {
    if (!textToSend.trim() || state.isTyping) {
      return;
    }

    const userMsg: VidyaMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isTyping: true,
      error: null,
    }));

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const ai = getGeminiClient(apiKey);
      const perfStartTime = performance.now();

      // Build context
      const contextPayload = buildContextPayload({
        currentView: appContext?.currentView,
        scannedPapers: appContext?.scannedPapers,
        selectedScan: appContext?.selectedScan,
      }, userRole);

      const contextSize = JSON.stringify(contextPayload).length;

      // Prepare history for Gemini format
      const history = state.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const promptWithContext = formatContextForGemini(contextPayload, textToSend);

      // Call streaming API
      const result = await withGeminiRetry(() => ai.models.generateContentStream({
        model: AI_CONFIG.defaultModel,
        contents: [
            ...history,
            { role: 'user', parts: [{ text: promptWithContext }] }
        ],
        config: {
          systemInstruction: getSystemInstruction(userRole),
          temperature: 0.65,
          maxOutputTokens: 2048,
          topP: 0.92,
          topK: 32
        }
      }));

      const botMsgId = (Date.now() + 1).toString();

      // Add placeholder
      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: botMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
          },
        ],
      }));

      let fullText = '';
      let lastUpdateTime = Date.now();
      const UPDATE_INTERVAL = 150;

      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          const now = Date.now();
          if (now - lastUpdateTime > UPDATE_INTERVAL) {
            const formattedText = formatMathInResponse(fullText);
            setState(prev => ({
              ...prev,
              messages: prev.messages.map(m =>
                m.id === botMsgId ? { ...m, content: formattedText } : m
              ),
            }));
            lastUpdateTime = now;
          }
        }
      }

      // Final complete update
      const formattedFinalText = formatMathInResponse(fullText);
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === botMsgId ? { ...m, content: formattedFinalText, isStreaming: false } : m
        ),
        isTyping: false,
      }));

      // Track performance
      const perfEndTime = performance.now();
      trackMessagePerformance({
        messageId: botMsgId,
        intent: 'unclear',
        userRole,
        contextSize,
        questionCount: contextPayload.questions.length,
        responseTime: perfEndTime - perfStartTime,
        streamingDuration: perfEndTime - perfStartTime,
        tokenCount: estimateTokenCount(fullText),
        cacheHit: false,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error('Chat error:', error);
      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'I encountered a issue with the AI assistant. Please try again.',
            timestamp: new Date(),
          },
        ],
        isTyping: false,
        error: 'Communication failure.',
      }));
    }
  }, [state.messages, state.isTyping, appContext, userRole]);

  /**
   * Clear chat
   */
  const clearChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [{
        id: Date.now().toString(),
        role: 'assistant',
        content: userRole === 'student'
          ? "Fresh start! 🌟 What's next?"
          : "Context cleared. Ready for new instructions.",
        timestamp: new Date(),
      }],
    }));
    initializedRef.current = false;
  }, [userRole]);

  return {
    messages: state.messages,
    isOpen: state.isOpen,
    isTyping: state.isTyping,
    error: state.error,
    userRole,
    setUserRole,
    toggleChat,
    sendMessage,
    clearChat,
  };
}
