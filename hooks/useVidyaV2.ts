/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V2 - MAIN HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Core chat logic with Gemini function calling, state management,
 * session persistence, and analytics tracking
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { getGeminiClient, withGeminiRetry } from '../utils/geminiClient';
import { AI_CONFIG } from '../config/aiConfigs';
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

// Define locally to avoid missing types from @google/generative-ai
export interface FunctionCall {
  name: string;
  args: any;
}

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

  const aiRef = useRef<any>(null);
  const initializedRef = useRef<boolean>(false);
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

      // Initialize Gemini AI with Vertex support
      aiRef.current = getGeminiClient(apiKey);
      initializedRef.current = true;

      // Create context engine
      contextEngineRef.current = createContextEngine(appContext, userRole, session);

      // Create suggestion engine
      suggestionEngineRef.current = createSuggestionEngine(appContext, userRole, activityLogRef.current);

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
  }, [state.isInitialized, userRole, appContext]);

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

        if (!aiRef.current) {
          throw new Error('Gemini chat not initialized');
        }

        // Prepare history for manual chat management
        const history = (state.session?.messages || []).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        // Send to Gemini with Vertex AI billing and common retry
        const aiResponse = await withGeminiRetry(async () => {
          return await aiRef.current.models.generateContent({
            model: AI_CONFIG.defaultModel,
            contents: [...history, { role: "user", parts: [{ text: trimmedMessage }] }],
            config: {
              tools: [{ functionDeclarations: getToolDeclarations() }],
              systemInstruction: contextEngineRef.current?.generateSystemPrompt() || "",
              temperature: 0.7,
              maxOutputTokens: 2048,
              topP: 0.95
            }
          });
        });

        const responseText = (aiResponse as any).text || "";
        const functionCalls = aiResponse.candidates?.[0]?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

        if (functionCalls && functionCalls.length > 0) {
          // Process function calls
          await handleFunctionCalls(functionCalls, startTime);
        } else {
          // Regular text response
          const aiMsg: VidyaMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            type: 'text',
            content: responseText,
            timestamp: new Date(),
            metadata: {
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
    [state.session, appContext, actions, userRole]
  );

  /**
   * Handle function calls from Gemini
   */
  const handleFunctionCalls = async (
    functionCalls: any[],
    startTime: number
  ) => {
    if (!aiRef.current || !state.session) return;

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

      // Send tool results back using manual history
      const history = (state.session?.messages || []).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const finalResult = await withGeminiRetry(async () => {
        return await aiRef.current.models.generateContent({
          model: AI_CONFIG.defaultModel,
          contents: [
            ...history,
            { role: 'user', parts: functionCalls.map(c => ({ functionCall: c })) },
            { role: 'user', parts: functionResponses }
          ],
          config: {
            tools: [{ functionDeclarations: getToolDeclarations() }],
            systemInstruction: contextEngineRef.current?.generateSystemPrompt() || "",
            temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 0.95
          }
        });
      });

      const finalContent = (finalResult as any).text || "";

      // Create AI message with tool results
      const aiMsg: VidyaMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        type: 'text',
        content: finalContent,
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
   * Reinitialize Gemini chat when critical context changes
   */
  useEffect(() => {
    if (!state.isInitialized || !aiRef.current || !contextEngineRef.current) return;

    try {
      // With the new SDK and manual history, we don't need to recreate "chat" sessions
      // The context engine prompt will be picked up in the next generateContent call
      console.log('✅ Gemini context refreshed for next interaction');
    } catch (error) {
      console.error('❌ Failed to refresh context:', error);
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
    exportSession: exportSession,
    isVisible: state.isOpen,
    hasUnreadMessages: false, // TODO: Implement unread tracking
    canSendMessage: !state.isThinking && !state.isProcessingTool,
  };
}
