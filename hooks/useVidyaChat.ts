import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import { VidyaMessage, VidyaChatState, UserRole, VidyaAppContext } from '../types';
import { getContextualPrompt, getWelcomeMessage, generateAppContextSummary } from '../utils/vidyaPrompts';

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
  const genAIRef = useRef<GoogleGenerativeAI | null>(null);
  const chatRef = useRef<ChatSession | null>(null);
  const initializedRef = useRef(false);

  /**
   * Initialize Gemini AI and create chat session with system instruction
   */
  const initializeChat = useCallback(() => {
    if (initializedRef.current) return;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not found in environment variables');
      }

      // Initialize Gemini AI
      genAIRef.current = new GoogleGenerativeAI(apiKey);
      const model = genAIRef.current.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: {
          parts: [{ text: getContextualPrompt(userRole, currentView, appContext) }],
          role: 'user',
        },
      });

      // Create chat session
      chatRef.current = model.startChat({
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.95,
          topK: 40,
        },
      });

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
  }, [userRole, currentView, appContext]);

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
   * Send user message and stream AI response token-by-token
   */
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!chatRef.current || !userMessage.trim()) return;

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
        // Create placeholder for streaming AI response
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

        // Inject current app context with EVERY message for real-time data
        const appContextData = generateAppContextSummary(appContext);
        const enhancedMessage = appContextData
          ? `${trimmedMessage}\n\n---\nCURRENT APP STATE (use this to answer):${appContextData}`
          : trimmedMessage;

        // Send message and stream response
        const result = await chatRef.current.sendMessageStream(enhancedMessage);
        let fullText = '';

        // Stream chunks token-by-token
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullText += chunkText;

          // Update message content in real-time
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: fullText }
                : msg
            ),
          }));
        }

        // Finalize streaming (remove streaming flag)
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, isStreaming: false }
              : msg
          ),
        }));
      } catch (error) {
        console.error('Error sending message to Vidya:', error);

        // Remove placeholder message and show error
        setState((prev) => ({
          ...prev,
          messages: prev.messages.slice(0, -1),
          isThinking: false,
          error: 'Failed to get response. Please try again.',
        }));

        // Auto-clear error after 5 seconds
        setTimeout(() => {
          setState((prev) => ({ ...prev, error: null }));
        }, 5000);
      }
    },
    [appContext]
  );

  /**
   * Clear chat history and reset to welcome message
   */
  const clearHistory = useCallback(() => {
    if (!genAIRef.current) return;

    try {
      // Reinitialize chat session
      const model = genAIRef.current.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: {
          parts: [{ text: getContextualPrompt(userRole, currentView, appContext) }],
          role: 'user',
        },
      });

      chatRef.current = model.startChat({
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.95,
          topK: 40,
        },
      });

      // Reset to welcome message only
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
    } catch (error) {
      console.error('Failed to clear Vidya chat history:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to clear history. Please refresh the page.',
      }));
    }
  }, [userRole, currentView, appContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chatRef.current = null;
      genAIRef.current = null;
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
