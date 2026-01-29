/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - CLEAN CHAT HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * AI-First architecture inspired by clean math chat pattern:
 * - Clean system instructions (~30 lines)
 * - Structured JSON context injection
 * - Trust Gemini to be intelligent
 * - Minimal rules, maximum AI capability
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VidyaMessage, VidyaAppContext } from '../types';
import {
  getSystemInstruction,
  getRoleTransitionMessage,
  getWelcomeMessage,
  VidyaRole
} from '../utils/vidya/systemInstructions';
import { buildContextPayload, formatContextForGemini } from '../utils/vidya/contextBuilder';
import { getRoutingDecision, classifyIntent } from '../utils/vidya/intentClassifier';
import { classifyIntentHybrid } from '../utils/vidya/semanticIntentClassifier';
import { validateChatSecurity } from '../utils/vidya/rbacValidator';
import { trackMessagePerformance, estimateTokenCount } from '../utils/vidya/performanceMonitor';
import { executeTool, formatToolResult, isToolAvailable, ToolName } from '../utils/vidya/toolHandlers';
import { formatMathInResponse } from '../utils/vidya/mathFormatter';

interface Chat {
  sendMessageStream(params: { message: string }): Promise<AsyncIterable<{ text: string }>>;
}

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

/**
 * VidyaV3 Chat Hook - Clean, AI-first design
 */
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

  const chatSessionRef = useRef<Chat | null>(null);
  const genAIRef = useRef<GoogleGenerativeAI | null>(null);

  /**
   * Initialize or reinitialize chat when role changes
   */
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setState(prev => ({
        ...prev,
        error: 'Gemini API key not found. Please check environment variables.',
      }));
      return;
    }

    try {
      // Initialize Gemini
      if (!genAIRef.current) {
        genAIRef.current = new GoogleGenerativeAI(apiKey);
      }

      const ai = genAIRef.current;

      // Create new chat session with clean system instruction
      const model = (ai as any).getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: {
          parts: [{ text: getSystemInstruction(userRole) }],
          role: 'user',
        },
      });

      chatSessionRef.current = model.startChat({
        generationConfig: {
          temperature: 0.65,      // Slightly lower for faster, more focused responses (Phase 4 optimization)
          maxOutputTokens: 700,   // Optimized for balance between quality and speed
          topP: 0.92,            // Slightly lower for faster token sampling
          topK: 32,              // Reduced for faster generation
          candidateCount: 1,     // Only generate 1 response (faster)
        },
      });

      // Add role transition message if not first initialization
      if (state.messages.length > 1) {
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

    } catch (error) {
      console.error('Failed to initialize Vidya V3:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize AI. Please refresh the page.',
      }));
    }
  }, [userRole]);

  /**
   * Toggle chat window
   */
  const toggleChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  /**
   * Send message with intelligent routing
   * Phase 2: Intent classification → route to Gemini or tools
   */
  const sendMessage = useCallback(async (textToSend: string) => {
    if (!textToSend.trim() || state.isTyping || !chatSessionRef.current) {
      return;
    }

    // Add user message
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
      // PERFORMANCE TRACKING START
      const perfStartTime = performance.now();

      // BUILD STRUCTURED CONTEXT PAYLOAD
      const contextPayload = buildContextPayload({
        currentView: appContext?.currentView,
        scannedPapers: appContext?.scannedPapers,
        selectedScan: appContext?.selectedScan,
      }, userRole);

      const contextSize = JSON.stringify(contextPayload).length;

      // PHASE 2: HYBRID INTENT CLASSIFICATION & ROUTING
      // Step 1: Fast keyword classification
      const keywordIntent = classifyIntent(textToSend, contextPayload);

      // Step 2: Hybrid classification (semantic if low confidence)
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const finalIntent = await classifyIntentHybrid(
        textToSend,
        state.messages,  // Pass conversation history
        keywordIntent,
        apiKey
      );

      // Step 3: Get routing decision with final intent
      const routing = getRoutingDecision(textToSend, contextPayload);
      // Override routing with hybrid intent
      routing.intent = finalIntent;

      // Log intent for analytics
      console.log('[VidyaV3] Intent:', routing.intent.type, 'Confidence:', routing.intent.confidence);

      // PHASE 3: RBAC SECURITY VALIDATION
      const securityValidation = validateChatSecurity(
        userRole,
        routing.intent.type,
        contextPayload,
        textToSend
      );

      // Log security warnings if any
      if (securityValidation.warnings.length > 0) {
        console.warn('[VidyaV3] Security warnings:', securityValidation.warnings);
      }

      // Use filtered context (students get restricted data removed)
      const safeContext = securityValidation.filteredContext;

      // PHASE 5: DIRECT TOOL EXECUTION
      if (routing.route === 'tool' && routing.toolName) {
        console.log('[VidyaV3] Executing tool directly:', routing.toolName);

        // Check if tool is available for user role
        if (!isToolAvailable(routing.toolName as ToolName, userRole)) {
          setState(prev => ({
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: `❌ Tool "${routing.toolName}" is not available for ${userRole}s.`,
                timestamp: new Date(),
              },
            ],
            isTyping: false,
          }));
          return;
        }

        // Execute tool
        const toolResult = await executeTool(
          routing.toolName as ToolName,
          routing.toolParams || {}
        );

        // Add tool result as message
        setState(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: formatToolResult(toolResult),
              timestamp: new Date(),
            },
          ],
          isTyping: false,
        }));

        // Track performance for tool execution
        const perfEndTime = performance.now();
        trackMessagePerformance({
          messageId: Date.now().toString(),
          intent: routing.intent.type,
          userRole,
          contextSize,
          questionCount: contextPayload.questions.length,
          responseTime: perfEndTime - perfStartTime,
          streamingDuration: 0,
          tokenCount: estimateTokenCount(toolResult.message),
          cacheHit: false,
          timestamp: new Date(),
        });

        return; // Exit early - don't send to Gemini
      }

      // SEND TO GEMINI (default route)
      // FORMAT WITH JSON DELIMITERS (like math chat pattern)
      const promptWithContext = formatContextForGemini(safeContext, textToSend);

      // Stream response from Gemini
      const result = await chatSessionRef.current.sendMessageStream(promptWithContext);

      const botMsgId = (Date.now() + 1).toString();

      // Add bot message placeholder
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

      // Stream chunks with debouncing (Phase 4 optimization)
      let fullText = '';
      let lastUpdateTime = Date.now();
      const UPDATE_INTERVAL = 150; // Update UI every 150ms (optimal balance)

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullText += text;

          const now = Date.now();
          // Debounce: only update UI every UPDATE_INTERVAL ms
          if (now - lastUpdateTime > UPDATE_INTERVAL) {
            setState(prev => ({
              ...prev,
              messages: prev.messages.map(m =>
                m.id === botMsgId ? { ...m, content: fullText } : m
              ),
            }));
            lastUpdateTime = now;
          }
        }
      }

      // Final update with complete text
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === botMsgId ? { ...m, content: fullText } : m
        ),
      }));

      // Mark streaming complete
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === botMsgId ? { ...m, isStreaming: false } : m
        ),
        isTyping: false,
      }));

      // PERFORMANCE TRACKING END
      const perfEndTime = performance.now();
      const responseTime = perfEndTime - perfStartTime;
      const streamingDuration = perfEndTime - perfStartTime; // Approximate
      const tokenCount = estimateTokenCount(fullText);

      trackMessagePerformance({
        messageId: botMsgId,
        intent: routing.intent.type,
        userRole,
        contextSize,
        questionCount: contextPayload.questions.length,
        responseTime,
        streamingDuration,
        tokenCount,
        cacheHit: false, // Will be set by context builder logs
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
            content: 'I encountered a network issue. Please try again.',
            timestamp: new Date(),
          },
        ],
        isTyping: false,
        error: 'Failed to send message. Please check your connection.',
      }));
    }
  }, [state.isTyping, appContext, userRole]);

  /**
   * Clear chat history
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

    // Reinitialize chat session
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey && genAIRef.current) {
      const ai = genAIRef.current;
      const model = (ai as any).getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: {
          parts: [{ text: getSystemInstruction(userRole) }],
          role: 'user',
        },
      });

      chatSessionRef.current = model.startChat({
        generationConfig: {
          temperature: 0.65,      // Slightly lower for faster, more focused responses (Phase 4 optimization)
          maxOutputTokens: 700,   // Optimized for balance between quality and speed
          topP: 0.92,            // Slightly lower for faster token sampling
          topK: 32,              // Reduced for faster generation
          candidateCount: 1,     // Only generate 1 response (faster)
        },
      });
    }
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
