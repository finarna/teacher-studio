/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V2 - MAIN HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Core chat logic with Gemini function calling, state management,
 * session persistence, and analytics tracking
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenerativeAI, ChatSession, FunctionCall } from '@google/generative-ai';
import {
  VidyaChatState,
  VidyaMessage,
  VidyaSession,
  VidyaAppContext,
  VidyaActions,
  UserRole,
  VidyaToolCall,
  VidyaToolResult,
  VidyaSuggestion,
  UseVidyaChatReturn,
  VidyaUserPreferences,
  VidyaActivity,
} from '../types/vidya';
import { getToolDeclarations, executeTool } from '../utils/vidyaTools';
import { VidyaContextEngine, createContextEngine } from '../utils/vidyaContext';
import { VidyaSessionManager, autoSaveSession } from '../utils/vidyaSession';
import { VidyaSuggestionEngine, createSuggestionEngine, filterExpiredSuggestions } from '../utils/vidyaSuggestions';
import { processVidyaRequest } from '../utils/vidyaV3Orchestrator';

/**
 * Main Vidya V2 Hook
 */
export function useVidyaV2(
  userRole: UserRole,
  appContext: VidyaAppContext,
  actions: VidyaActions
): UseVidyaChatReturn {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [state, setState] = useState<VidyaChatState>({
    session: null,
    isOpen: false,
    isInitialized: false,
    isThinking: false,
    isProcessingTool: false,
    error: null,
    activeSuggestions: [],
    analytics: {
      messagesCount: 0,
      toolCallsCount: 0,
      sessionDuration: 0,
      averageResponseTime: 0,
      insightsGenerated: 0,
      mostUsedTools: [],
      errors: [],
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════════════════

  const genAIRef = useRef<GoogleGenerativeAI | null>(null);
  const chatRef = useRef<ChatSession | null>(null);
  const contextEngineRef = useRef<VidyaContextEngine | null>(null);
  const suggestionEngineRef = useRef<VidyaSuggestionEngine | null>(null);
  const activityLogRef = useRef<VidyaActivity[]>([]);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize Vidya on first open
   */
  const initializeChat = useCallback(() => {
    if (state.isInitialized) return;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not found');
      }

      // Load or create session
      let session = VidyaSessionManager.loadSession();
      if (!session || session.userRole !== userRole) {
        session = VidyaSessionManager.createSession(userRole);
      }

      // Initialize Gemini AI
      genAIRef.current = new GoogleGenerativeAI(apiKey);

      // Create context engine
      contextEngineRef.current = createContextEngine(appContext, userRole, session);

      // Create suggestion engine
      suggestionEngineRef.current = createSuggestionEngine(appContext, userRole, activityLogRef.current);

      // Create Gemini model with function calling
      const model = genAIRef.current.getGenerativeModel({
        model: 'gemini-2.0-flash',
        tools: [{
          functionDeclarations: getToolDeclarations(),
        }],
        systemInstruction: contextEngineRef.current.generateSystemPrompt(),
      });

      // Start chat session
      chatRef.current = model.startChat({
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          topP: 0.95,
        },
      });

      // Generate initial suggestions
      const suggestions = suggestionEngineRef.current.generateSuggestions();

      setState((prev) => ({
        ...prev,
        session,
        isInitialized: true,
        activeSuggestions: suggestions,
        error: null,
      }));

      console.log('✅ Vidya V2 initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Vidya:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to initialize AI assistant. Please refresh.',
      }));
    }
  }, [userRole, appContext, state.isInitialized]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGE HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Send user message (V3 - with security and local handlers)
   */
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!state.session || !userMessage.trim()) return;

      const trimmedMessage = userMessage.trim();
      const startTime = Date.now();

      // Create user message
      const userMsg: VidyaMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        type: 'text',
        content: trimmedMessage,
        timestamp: new Date(),
      };

      // Update state with user message
      setState((prev) => ({
        ...prev,
        session: prev.session
          ? {
              ...prev.session,
              messages: [...prev.session.messages, userMsg],
              metadata: {
                ...prev.session.metadata,
                totalMessages: prev.session.metadata.totalMessages + 1,
              },
            }
          : prev.session,
        isThinking: true,
        error: null,
      }));

      try {
        // ═══════════════════════════════════════════════════════════════════════════
        // V3 PIPELINE: Security → Intent → Handler → Render
        // ═══════════════════════════════════════════════════════════════════════════

        const v3Response = await processVidyaRequest({
          userInput: trimmedMessage,
          userId: state.session.id,
          context: appContext,
        });

        // Check if request was blocked or errored
        if (!v3Response.success) {
          // Security violation or error
          const aiMsg: VidyaMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            type: 'text',
            content: v3Response.response.markdown,
            timestamp: new Date(),
          };

          setState((prev) => ({
            ...prev,
            session: prev.session
              ? {
                  ...prev.session,
                  messages: [...prev.session.messages, aiMsg],
                  lastActiveAt: new Date(),
                }
              : prev.session,
            isThinking: false,
            error: v3Response.error || null,
          }));

          return;
        }

        // Check if handled locally (no Gemini needed)
        if (!v3Response.usedGemini) {
          // Local handler processed it - instant response!
          const aiMsg: VidyaMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            type: 'text',
            content: v3Response.response.markdown,
            timestamp: new Date(),
            metadata: {
              intent: v3Response.intent?.intent,
              queryType: v3Response.intent?.subType,
              executionTime: v3Response.response.executionTime,
              handledLocally: true,
            },
          };

          const responseTime = Date.now() - startTime;

          setState((prev) => ({
            ...prev,
            session: prev.session
              ? {
                  ...prev.session,
                  messages: [...prev.session.messages, aiMsg],
                  lastActiveAt: new Date(),
                }
              : prev.session,
            isThinking: false,
            analytics: {
              ...prev.analytics,
              messagesCount: prev.analytics.messagesCount + 1,
              averageResponseTime:
                (prev.analytics.averageResponseTime * prev.analytics.messagesCount + responseTime) /
                (prev.analytics.messagesCount + 1),
            },
          }));

          // Auto-save session
          if (state.session) {
            autoSaveSession(state.session);
          }

          console.log(`✅ V3 Local Handler: ${v3Response.intent?.subType} query in ${responseTime}ms`);

          return;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // FALLBACK TO GEMINI for complex queries/conversations
        // ═══════════════════════════════════════════════════════════════════════════

        if (!chatRef.current) {
          throw new Error('Gemini chat not initialized');
        }

        // Send to Gemini
        const result = await chatRef.current.sendMessage(trimmedMessage);
        const response = result.response;

        // Check for function calls
        const functionCalls = response.functionCalls?.();

        if (functionCalls && functionCalls.length > 0) {
          // Process function calls
          await handleFunctionCalls(functionCalls, startTime);
        } else {
          // Regular text response
          const aiMsg: VidyaMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            type: 'text',
            content: response.text(),
            timestamp: new Date(),
            metadata: {
              intent: v3Response.intent?.intent,
              handledLocally: false,
            },
          };

          const responseTime = Date.now() - startTime;

          setState((prev) => ({
            ...prev,
            session: prev.session
              ? {
                  ...prev.session,
                  messages: [...prev.session.messages, aiMsg],
                  lastActiveAt: new Date(),
                }
              : prev.session,
            isThinking: false,
            analytics: {
              ...prev.analytics,
              messagesCount: prev.analytics.messagesCount + 1,
              averageResponseTime:
                (prev.analytics.averageResponseTime * prev.analytics.messagesCount + responseTime) /
                (prev.analytics.messagesCount + 1),
            },
          }));

          // Auto-save session
          if (state.session) {
            autoSaveSession(state.session);
          }

          console.log(`✅ V3 Gemini Handler: ${v3Response.intent?.intent} in ${responseTime}ms`);
        }
      } catch (error) {
        console.error('Error sending message:', error);

        setState((prev) => ({
          ...prev,
          isThinking: false,
          error: 'Failed to get response. Please try again.',
          analytics: {
            ...prev.analytics,
            errors: [
              ...prev.analytics.errors,
              {
                timestamp: new Date(),
                type: 'send_message',
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            ],
          },
        }));

        setTimeout(() => {
          setState((prev) => ({ ...prev, error: null }));
        }, 5000);
      }
    },
    [state.session, appContext]
  );

  /**
   * Handle function calls from Gemini
   */
  const handleFunctionCalls = async (
    functionCalls: FunctionCall[],
    startTime: number
  ) => {
    if (!chatRef.current || !state.session) return;

    setState((prev) => ({
      ...prev,
      isThinking: false,
      isProcessingTool: true,
    }));

    const toolResults: VidyaToolResult[] = [];

    // Execute each function call
    for (const call of functionCalls) {
      const toolCall: VidyaToolCall = {
        id: `tool-${Date.now()}`,
        toolName: call.name,
        parameters: call.args,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        currentToolCall: toolCall,
      }));

      // Execute tool
      const result = await executeTool(call.name, call.args, {
        appContext,
        actions,
        userRole,
        sessionId: state.session?.id || '',
      });

      toolResults.push(result);

      // Track activity
      trackActivity({
        type: 'other',
        timestamp: new Date(),
        details: `Tool executed: ${call.name}`,
        metadata: { toolName: call.name, success: result.success },
      });
    }

    // Send tool results back to Gemini
    try {
      const functionResponses = toolResults.map((result, idx) => ({
        functionResponse: {
          name: functionCalls[idx].name,
          response: result,
        },
      }));

      const finalResult = await chatRef.current.sendMessage(functionResponses as any);
      const finalResponse = finalResult.response;

      // Create AI message with tool results
      const aiMsg: VidyaMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        type: 'text',
        content: finalResponse.text(),
        timestamp: new Date(),
        toolCalls: functionCalls.map((call, idx) => ({
          id: `tool-${Date.now()}-${idx}`,
          toolName: call.name,
          parameters: call.args,
          timestamp: new Date(),
        })),
        toolResults,
      };

      const responseTime = Date.now() - startTime;

      setState((prev) => ({
        ...prev,
        session: prev.session
          ? {
              ...prev.session,
              messages: [...prev.session.messages, aiMsg],
              lastActiveAt: new Date(),
              metadata: {
                ...prev.session.metadata,
                actionsTaken: prev.session.metadata.actionsTaken + toolResults.length,
                toolsUsed: [
                  ...new Set([
                    ...prev.session.metadata.toolsUsed,
                    ...functionCalls.map((c) => c.name),
                  ]),
                ],
              },
            }
          : prev.session,
        isProcessingTool: false,
        currentToolCall: undefined,
        analytics: {
          ...prev.analytics,
          messagesCount: prev.analytics.messagesCount + 1,
          toolCallsCount: prev.analytics.toolCallsCount + toolResults.length,
          averageResponseTime:
            (prev.analytics.averageResponseTime * prev.analytics.messagesCount + responseTime) /
            (prev.analytics.messagesCount + 1),
        },
      }));

      // Auto-save
      if (state.session) {
        autoSaveSession(state.session);
      }
    } catch (error) {
      console.error('Error processing tool results:', error);
      setState((prev) => ({
        ...prev,
        isProcessingTool: false,
        error: 'Tool execution failed. Please try again.',
      }));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Toggle chat open/close
   */
  const toggleChat = useCallback(() => {
    setState((prev) => {
      const newIsOpen = !prev.isOpen;

      // Initialize on first open
      if (newIsOpen && !prev.isInitialized) {
        setTimeout(initializeChat, 0);
      }

      return { ...prev, isOpen: newIsOpen };
    });
  }, [initializeChat]);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    if (!state.session) return;

    const newSession = VidyaSessionManager.createSession(userRole);

    setState((prev) => ({
      ...prev,
      session: newSession,
    }));

    VidyaSessionManager.saveSession(newSession);
  }, [state.session, userRole]);

  /**
   * Update preferences
   */
  const updatePreferences = useCallback(
    (prefs: Partial<VidyaUserPreferences>) => {
      setState((prev) => ({
        ...prev,
        session: prev.session
          ? {
              ...prev.session,
              preferences: { ...prev.session.preferences, ...prefs },
            }
          : prev.session,
      }));

      if (state.session) {
        autoSaveSession({
          ...state.session,
          preferences: { ...state.session.preferences, ...prefs },
        });
      }
    },
    [state.session]
  );

  /**
   * Dismiss suggestion
   */
  const dismissSuggestion = useCallback((suggestionId: string) => {
    suggestionEngineRef.current?.dismissSuggestion(suggestionId);

    setState((prev) => ({
      ...prev,
      activeSuggestions: prev.activeSuggestions.filter((s) => s.id !== suggestionId),
    }));
  }, []);

  /**
   * Execute tool directly (for suggestion buttons)
   */
  const executeToolDirect = useCallback(
    async (toolName: string, params: any): Promise<VidyaToolResult> => {
      const result = await executeTool(toolName, params, {
        appContext,
        actions,
        userRole,
        sessionId: state.session?.id || '',
      });

      // Track activity
      trackActivity({
        type: 'other',
        timestamp: new Date(),
        details: `Direct tool execution: ${toolName}`,
        metadata: { toolName, success: result.success },
      });

      return result;
    },
    [appContext, actions, userRole, state.session]
  );

  /**
   * Save session manually
   */
  const saveSession = useCallback(() => {
    if (state.session) {
      VidyaSessionManager.saveSession(state.session);
    }
  }, [state.session]);

  /**
   * Load session manually
   */
  const loadSession = useCallback(() => {
    const loaded = VidyaSessionManager.loadSession();
    if (loaded && loaded.userRole === userRole) {
      setState((prev) => ({ ...prev, session: loaded }));
    }
  }, [userRole]);

  /**
   * Export session
   */
  const exportSession = useCallback(async (): Promise<Blob> => {
    if (!state.session) {
      throw new Error('No session to export');
    }
    return await VidyaSessionManager.exportSession(state.session);
  }, [state.session]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Track activity
   */
  const trackActivity = (activity: VidyaActivity) => {
    activityLogRef.current.push(activity);
    contextEngineRef.current?.trackActivity(activity);
  };

  /**
   * Update suggestions based on app context changes
   */
  useEffect(() => {
    if (!suggestionEngineRef.current) return;

    suggestionEngineRef.current.updateContext(appContext, activityLogRef.current);
    const newSuggestions = suggestionEngineRef.current.generateSuggestions();
    const filtered = filterExpiredSuggestions(newSuggestions);

    setState((prev) => ({
      ...prev,
      activeSuggestions: filtered,
    }));
  }, [appContext]);

  /**
   * Update context engine when app context changes
   */
  useEffect(() => {
    if (!contextEngineRef.current) return;

    contextEngineRef.current.updateContext(appContext);

    if (state.session) {
      contextEngineRef.current.updateSession(state.session);
    }
  }, [appContext, state.session]);

  /**
   * Reinitialize Gemini chat when critical context changes (e.g., selected scan)
   * This ensures Gemini has fresh context with updated data
   */
  useEffect(() => {
    if (!state.isInitialized || !genAIRef.current || !contextEngineRef.current) return;

    // Recreate the Gemini chat with updated system instruction
    try {
      const model = genAIRef.current.getGenerativeModel({
        model: 'gemini-2.0-flash',
        tools: [{
          functionDeclarations: getToolDeclarations(),
        }],
        systemInstruction: contextEngineRef.current.generateSystemPrompt(), // Fresh context!
      });

      chatRef.current = model.startChat({
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          topP: 0.95,
        },
      });

      console.log('✅ Gemini chat reinitialized with updated context');
    } catch (error) {
      console.error('❌ Failed to reinitialize Gemini chat:', error);
    }
  }, [appContext.selectedScan, state.isInitialized]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    state,
    messages: state.session?.messages || [],
    toggleChat,
    sendMessage,
    clearHistory,
    updatePreferences,
    dismissSuggestion,
    executeTool: executeToolDirect,
    saveSession,
    loadSession,
    exportSession,
    isVisible: state.isOpen,
    hasUnreadMessages: false, // TODO: Implement unread tracking
    canSendMessage: !state.isThinking && !state.isProcessingTool,
  };
}
