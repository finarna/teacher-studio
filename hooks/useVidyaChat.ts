import { useState, useRef, useCallback, useEffect } from 'react';
import { getGeminiClient, withGeminiRetry } from '../utils/geminiClient';
import { VidyaMessage, VidyaChatState, UserRole, VidyaAppContext } from '../types';
import { getContextualPrompt, getWelcomeMessage, generateAppContextSummary } from '../utils/vidyaPrompts';
import { AI_CONFIG } from '../config/aiConfigs';

/**
 * Custom hook for managing Vidya AI chatbot state and streaming responses
 * Handles Gemini API integration with real-time token streaming
 */
export function useVidyaChat(userRole: UserRole, currentView?: string, appContext?: VidyaAppContext) {
  const [state, setState] = useState<VidyaChatState>({
    messages: [],
    isOpen: false,
    isThinking: false,
    error: null,
  });

  // Refs to persist across renders
  const aiRef = useRef<any>(null);
  const initializedRef = useRef(false);

  /**
   * Initialize Gemini AI client
   */
  const initializeChat = useCallback(() => {
    if (initializedRef.current) return;

    try {
      // Use centralized client (Vertex AI)
      aiRef.current = getGeminiClient();

      // Add welcome message
      const welcomeMessage: VidyaMessage = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: getWelcomeMessage(userRole),
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [welcomeMessage],
        error: null,
      }));

      initializedRef.current = true;
    } catch (error) {
      console.error('Failed to initialize Vidya chat:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to initialize AI assistant. Please refresh the page.',
      }));
    }
  }, [userRole]);

  /**
   * Toggle chat window open/closed
   */
  const toggleChat = useCallback(() => {
    setState((prev) => {
      const newIsOpen = !prev.isOpen;

      // Initialize chat on first open
      if (newIsOpen && !initializedRef.current) {
        setTimeout(initializeChat, 0);
      }

      return {
        ...prev,
        isOpen: newIsOpen,
      };
    });
  }, [initializeChat]);

  /**
   * Send user message and handle state updates
   */
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!aiRef.current || !userMessage.trim()) return;

      const trimmedMessage = userMessage.trim();

      // Add user message to state
      const userMsg: VidyaMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmedMessage,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        isThinking: true,
        error: null,
      }));

      try {
        // Create placeholder for AI response
        const aiMessageId = `assistant-${Date.now()}`;
        const aiMsg: VidyaMessage = {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        };

        // Add placeholder message
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, aiMsg],
          isThinking: false,
        }));

        // Context injection
        const appContextData = generateAppContextSummary(appContext);
        const enhancedMessage = appContextData
          ? `${trimmedMessage}\n\n---\nCURRENT APP STATE (use this to answer):${appContextData}`
          : trimmedMessage;

        // System Instruction update
        const systemPrompt = getContextualPrompt(userRole, currentView, appContext);

        // Prepare conversation history for generateContent
        const history = state.messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

        // Vertex AI Generation via Centralized Utility
        const result = await withGeminiRetry(() => aiRef.current.models.generateContent({
          model: AI_CONFIG.defaultModel,
          contents: [
            ...history,
            { role: "user", parts: [{ text: enhancedMessage }] }
          ],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 0.95
          }
        })) as any;

        const fullText = result.text || "Sorry, I couldn't generate a response.";

        // Finalize state
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: fullText, isStreaming: false }
              : msg
          ),
        }));

      } catch (error) {
        console.error('Error sending message to Vidya:', error);

        // Clear placeholder and show error
        setState((prev) => ({
          ...prev,
          messages: prev.messages.slice(0, -1),
          isThinking: false,
          error: 'Failed to get response. Please try again.',
        }));

        setTimeout(() => {
          setState((prev) => ({ ...prev, error: null }));
        }, 5000);
      }
    },
    [appContext, userRole, currentView, state.messages]
  );

  /**
   * Clear chat history
   */
  const clearHistory = useCallback(() => {
    const welcomeMessage: VidyaMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: getWelcomeMessage(userRole),
      timestamp: new Date(),
    };

    setState((prev) => ({
      ...prev,
      messages: [welcomeMessage],
      error: null,
    }));
  }, [userRole]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      aiRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  return {
    messages: state.messages,
    isOpen: state.isOpen,
    isThinking: state.isThinking,
    error: state.error,
    toggleChat,
    sendMessage,
    clearHistory,
  };
}
