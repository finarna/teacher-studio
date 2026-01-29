/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V2 - INDUSTRY-BEST AI ASSISTANT TYPE SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete type definitions for the enhanced Vidya AI assistant
 * with function calling, rich messages, and deep app integration
 */

import { Scan, LessonContract, UserState } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type VidyaMessageType =
  | 'text'           // Plain text message
  | 'insight_card'   // Data visualization card with metrics
  | 'action_prompt'  // Message with actionable buttons
  | 'quick_reply'    // Suggested response chips
  | 'progress'       // Progress indicator for long operations
  | 'image'          // Image message
  | 'system';        // System notification

export type VidyaMessageRole = 'user' | 'assistant' | 'system';

export interface VidyaAction {
  id: string;
  label: string;
  icon?: string;
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  handler: () => void | Promise<void>;
}

export interface VidyaInsightData {
  title: string;
  metrics?: Array<{
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    icon?: string;
  }>;
  chart?: {
    type: 'bar' | 'line' | 'pie' | 'doughnut';
    data: any;
  };
  summary?: string;
  actions?: VidyaAction[];
}

export interface VidyaMessageMetadata {
  // Action buttons to display
  actions?: VidyaAction[];

  // Quick reply chips for user
  quickReplies?: string[];

  // Insight/analytics data
  insightData?: VidyaInsightData;

  // Image URL or base64
  imageUrl?: string;

  // Progress percentage (0-100)
  progress?: number;
  progressLabel?: string;

  // Tool execution metadata
  toolCallId?: string;
  toolName?: string;
}

export interface VidyaMessage {
  id: string;
  role: VidyaMessageRole;
  type: VidyaMessageType;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  metadata?: VidyaMessageMetadata;

  // Tool calls and results
  toolCalls?: VidyaToolCall[];
  toolResults?: VidyaToolResult[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTION/TOOL CALLING
// ═══════════════════════════════════════════════════════════════════════════════

export interface VidyaToolParameter {
  type: string;
  description: string;
  enum?: string[];
  required?: boolean;
}

export interface VidyaTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, VidyaToolParameter>;
    required?: string[];
  };
  handler: (params: any, context: VidyaToolContext) => Promise<VidyaToolResult>;
  requiresConfirmation?: boolean; // For destructive actions
}

export interface VidyaToolCall {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  timestamp: Date;
}

export interface VidyaToolResult {
  toolCallId: string;
  success: boolean;
  result: any;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface VidyaToolContext {
  // App state
  appContext: VidyaAppContext;

  // Actions that can be performed
  actions: VidyaActions;

  // User profile
  userRole: UserRole;

  // Current session
  sessionId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP CONTEXT & INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = 'student' | 'teacher';

export interface VidyaAppContext {
  // Teacher Mode Context
  scannedPapers?: Scan[];
  selectedScan?: Scan | null;
  customLessons?: LessonContract[];
  currentView?: string;

  // Student Mode Context
  currentLesson?: LessonContract | null;
  userProgress?: {
    masteryScore: number;
    currentModule: string;
    quizHistory: any[];
    misconceptions: string[];
  };

  // Session metadata
  sessionDuration?: number;
  lastAction?: string;
  activityLog?: VidyaActivity[];
}

export interface VidyaActivity {
  type: 'scan' | 'create_lesson' | 'view_analysis' | 'navigate' | 'other';
  timestamp: Date;
  details?: string;
  metadata?: Record<string, any>;
}

export interface VidyaActions {
  // Navigation
  navigateTo: (view: string) => void;
  goBack: () => void;

  // Data actions
  scanPaper: () => void;
  createLesson: (prefill?: Partial<LessonContract>) => void;
  viewAnalysis: (scanId: string) => void;
  generateSketches: (scanId: string) => void;

  // Export actions
  exportData: (type: 'pdf' | 'json' | 'csv', data: any) => Promise<void>;

  // UI actions
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  confirmAction: (title: string, message: string, type?: 'danger' | 'warning' | 'info') => Promise<boolean>;
  openModal: (modalId: string, props?: any) => void;
  closeModal: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION & PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

export interface VidyaUserPreferences {
  tone: 'professional' | 'friendly' | 'concise';
  detailLevel: 'brief' | 'standard' | 'detailed';
  proactiveSuggestions: boolean;
  autoSave: boolean;
  theme: 'auto' | 'light' | 'dark';
}

export interface VidyaSession {
  id: string;
  version: number; // Schema version for migrations
  userRole: UserRole;
  startedAt: Date;
  lastActiveAt: Date;
  messages: VidyaMessage[];
  preferences: VidyaUserPreferences;
  metadata: {
    totalMessages: number;
    actionsTaken: number;
    toolsUsed: string[];
    insightsGenerated: number;
  };
}

export interface StoredVidyaSession {
  id: string;
  version: number;
  userRole: UserRole;
  startedAt: string;
  lastActiveAt: string;
  messages: SerializedVidyaMessage[];
  preferences: VidyaUserPreferences;
  metadata: {
    totalMessages: number;
    actionsTaken: number;
    toolsUsed: string[];
    insightsGenerated: number;
  };
}

export interface SerializedVidyaMessage {
  id: string;
  role: VidyaMessageRole;
  type: VidyaMessageType;
  content: string;
  timestamp: string;
  metadata?: Omit<VidyaMessageMetadata, 'actions'>; // Exclude functions
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROACTIVE SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type VidyaSuggestionTrigger =
  | 'inactivity'
  | 'pattern_detected'
  | 'milestone_reached'
  | 'error_occurred'
  | 'view_changed'
  | 'data_updated';

export type VidyaSuggestionPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface VidyaSuggestion {
  id: string;
  trigger: VidyaSuggestionTrigger;
  priority: VidyaSuggestionPriority;
  message: string;
  actions?: VidyaAction[];
  dismissible: boolean;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS & INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface VidyaAnalytics {
  // Usage metrics
  messagesCount: number;
  toolCallsCount: number;
  sessionDuration: number;
  averageResponseTime: number;

  // Effectiveness metrics
  userSatisfaction?: number; // 1-5 rating
  taskCompletionRate?: number; // 0-100%
  insightsGenerated: number;

  // Popular tools/actions
  mostUsedTools: Array<{
    toolName: string;
    count: number;
  }>;

  // Error tracking
  errors: Array<{
    timestamp: Date;
    type: string;
    message: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface VidyaChatState {
  // Core state
  session: VidyaSession | null;
  isOpen: boolean;
  isInitialized: boolean;

  // Interaction state
  isThinking: boolean;
  isProcessingTool: boolean;
  currentToolCall?: VidyaToolCall;

  // Error state
  error: string | null;

  // Suggestions
  activeSuggestions: VidyaSuggestion[];

  // Analytics
  analytics: VidyaAnalytics;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK RETURN TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseVidyaChatReturn {
  // State
  state: VidyaChatState;
  messages: VidyaMessage[];

  // Actions
  toggleChat: () => void;
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => void;
  updatePreferences: (prefs: Partial<VidyaUserPreferences>) => void;
  dismissSuggestion: (suggestionId: string) => void;
  executeTool: (toolName: string, params: any) => Promise<VidyaToolResult>;

  // Session management
  saveSession: () => void;
  loadSession: () => void;
  exportSession: () => Promise<Blob>;

  // UI helpers
  isVisible: boolean;
  hasUnreadMessages: boolean;
  canSendMessage: boolean;
}
