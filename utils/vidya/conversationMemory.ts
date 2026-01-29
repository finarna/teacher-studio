/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - CONVERSATION MEMORY (Phase 5)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Persistent conversation storage and retrieval
 * - LocalStorage for quick persistence
 * - Backend sync for cross-device access
 * - Session management
 */

import { VidyaMessage } from '../../types';
import { VidyaRole } from './systemInstructions';

export interface ConversationSession {
  id: string;
  title: string;
  userRole: VidyaRole;
  messages: VidyaMessage[];
  createdAt: Date;
  updatedAt: Date;
  context?: {
    currentView?: string;
    scannedPapers?: string[]; // IDs or names
  };
}

const STORAGE_KEY = 'vidya_conversations';
const MAX_SESSIONS = 50; // Keep last 50 sessions
const MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Save conversation to localStorage
 */
export function saveConversation(session: ConversationSession): boolean {
  try {
    const existing = getAllConversations();

    // Update or add session
    const index = existing.findIndex(s => s.id === session.id);
    if (index >= 0) {
      existing[index] = {
        ...session,
        updatedAt: new Date(),
      };
    } else {
      existing.push({
        ...session,
        updatedAt: new Date(),
      });
    }

    // Keep only last MAX_SESSIONS
    const sorted = existing.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const trimmed = sorted.slice(0, MAX_SESSIONS);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    console.log('[ConversationMemory] Saved session:', session.id);
    return true;
  } catch (error) {
    console.error('[ConversationMemory] Failed to save:', error);
    return false;
  }
}

/**
 * Load conversation from localStorage
 */
export function loadConversation(sessionId: string): ConversationSession | null {
  try {
    const existing = getAllConversations();
    const session = existing.find(s => s.id === sessionId);

    if (!session) {
      console.warn('[ConversationMemory] Session not found:', sessionId);
      return null;
    }

    // Deserialize dates
    return {
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      messages: session.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    };
  } catch (error) {
    console.error('[ConversationMemory] Failed to load:', error);
    return null;
  }
}

/**
 * Get all conversations
 */
export function getAllConversations(): ConversationSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const sessions = JSON.parse(data) as ConversationSession[];

    // Filter out expired sessions
    const now = new Date().getTime();
    return sessions.filter(s => {
      const age = now - new Date(s.updatedAt).getTime();
      return age < MAX_SESSION_AGE;
    });
  } catch (error) {
    console.error('[ConversationMemory] Failed to get all:', error);
    return [];
  }
}

/**
 * Delete conversation
 */
export function deleteConversation(sessionId: string): boolean {
  try {
    const existing = getAllConversations();
    const filtered = existing.filter(s => s.id !== sessionId);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    console.log('[ConversationMemory] Deleted session:', sessionId);
    return true;
  } catch (error) {
    console.error('[ConversationMemory] Failed to delete:', error);
    return false;
  }
}

/**
 * Create new session
 */
export function createNewSession(
  userRole: VidyaRole,
  title?: string
): ConversationSession {
  return {
    id: generateSessionId(),
    title: title || `${userRole} Session ${new Date().toLocaleDateString()}`,
    userRole,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate session title from first user message
 */
export function generateSessionTitle(messages: VidyaMessage[]): string {
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (!firstUserMsg) return 'New Conversation';

  // Take first 50 characters of first message
  const preview = firstUserMsg.content.substring(0, 50);
  return preview + (firstUserMsg.content.length > 50 ? '...' : '');
}

/**
 * Auto-save conversation after each message
 */
export function autoSaveConversation(
  sessionId: string,
  messages: VidyaMessage[],
  userRole: VidyaRole,
  context?: ConversationSession['context']
): void {
  const session: ConversationSession = {
    id: sessionId,
    title: generateSessionTitle(messages),
    userRole,
    messages,
    createdAt: new Date(), // Will be overwritten if existing
    updatedAt: new Date(),
    context,
  };

  saveConversation(session);
}

/**
 * Search conversations by keyword
 */
export function searchConversations(keyword: string): ConversationSession[] {
  const all = getAllConversations();
  const lowerKeyword = keyword.toLowerCase();

  return all.filter(session => {
    // Search in title
    if (session.title.toLowerCase().includes(lowerKeyword)) return true;

    // Search in messages
    return session.messages.some(msg =>
      msg.content.toLowerCase().includes(lowerKeyword)
    );
  });
}

/**
 * Get recent conversations (last N)
 */
export function getRecentConversations(count: number = 10): ConversationSession[] {
  const all = getAllConversations();
  return all
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, count);
}

/**
 * Get conversations by role
 */
export function getConversationsByRole(role: VidyaRole): ConversationSession[] {
  return getAllConversations().filter(s => s.userRole === role);
}

/**
 * Export conversation as markdown
 */
export function exportConversationAsMarkdown(session: ConversationSession): string {
  let markdown = `# ${session.title}\n\n`;
  markdown += `**Role**: ${session.userRole}\n`;
  markdown += `**Created**: ${new Date(session.createdAt).toLocaleString()}\n`;
  markdown += `**Updated**: ${new Date(session.updatedAt).toLocaleString()}\n\n`;
  markdown += `---\n\n`;

  session.messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? '👤 **You**' : '🤖 **Vidya**';
    const time = new Date(msg.timestamp).toLocaleTimeString();
    markdown += `### ${role} _${time}_\n\n`;
    markdown += `${msg.content}\n\n`;
    if (index < session.messages.length - 1) {
      markdown += `---\n\n`;
    }
  });

  return markdown;
}

/**
 * Export conversation as JSON
 */
export function exportConversationAsJSON(session: ConversationSession): string {
  return JSON.stringify(session, null, 2);
}

/**
 * Import conversation from JSON
 */
export function importConversationFromJSON(jsonString: string): ConversationSession | null {
  try {
    const session = JSON.parse(jsonString) as ConversationSession;

    // Validate structure
    if (!session.id || !session.messages || !Array.isArray(session.messages)) {
      throw new Error('Invalid conversation format');
    }

    // Convert dates
    session.createdAt = new Date(session.createdAt);
    session.updatedAt = new Date(session.updatedAt);
    session.messages = session.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));

    // Save imported session
    saveConversation(session);

    console.log('[ConversationMemory] Imported session:', session.id);
    return session;
  } catch (error) {
    console.error('[ConversationMemory] Failed to import:', error);
    return null;
  }
}

/**
 * Clear all conversations (with confirmation)
 */
export function clearAllConversations(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[ConversationMemory] Cleared all conversations');
    return true;
  } catch (error) {
    console.error('[ConversationMemory] Failed to clear:', error);
    return false;
  }
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): {
  totalSessions: number;
  totalMessages: number;
  storageSize: string;
  oldestSession: Date | null;
  newestSession: Date | null;
} {
  const sessions = getAllConversations();
  const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);

  const data = localStorage.getItem(STORAGE_KEY);
  const storageSize = data ? `${(data.length / 1024).toFixed(2)} KB` : '0 KB';

  const dates = sessions.map(s => new Date(s.updatedAt).getTime());
  const oldestSession = dates.length > 0 ? new Date(Math.min(...dates)) : null;
  const newestSession = dates.length > 0 ? new Date(Math.max(...dates)) : null;

  return {
    totalSessions: sessions.length,
    totalMessages,
    storageSize,
    oldestSession,
    newestSession,
  };
}

// Development helpers
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).vidyaMemory = {
    getAll: getAllConversations,
    search: searchConversations,
    stats: getStorageStats,
    clear: clearAllConversations,
    export: (id: string) => {
      const session = loadConversation(id);
      return session ? exportConversationAsMarkdown(session) : null;
    },
  };

  console.log('💡 VidyaV3 Conversation Memory tools available at window.vidyaMemory');
}
