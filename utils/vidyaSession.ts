/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V2 - SESSION MANAGER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Manages session persistence, localStorage save/load, session cleanup,
 * and conversation export
 */

import {
  VidyaSession,
  StoredVidyaSession,
  VidyaMessage,
  SerializedVidyaMessage,
  VidyaUserPreferences,
  UserRole,
} from '../types/vidya';

const STORAGE_KEY = 'vidya_v2_session';
const CURRENT_VERSION = 2;
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB (leave 1MB buffer from 5MB limit)

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_PREFERENCES: VidyaUserPreferences = {
  tone: 'friendly',
  detailLevel: 'standard',
  proactiveSuggestions: true,
  autoSave: true,
  theme: 'auto',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class VidyaSessionManager {
  /**
   * Create a new session
   */
  static createSession(userRole: UserRole): VidyaSession {
    return {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      version: CURRENT_VERSION,
      userRole,
      startedAt: new Date(),
      lastActiveAt: new Date(),
      messages: [],
      preferences: { ...DEFAULT_PREFERENCES },
      metadata: {
        totalMessages: 0,
        actionsTaken: 0,
        toolsUsed: [],
        insightsGenerated: 0,
      },
    };
  }

  /**
   * Save session to localStorage
   */
  static saveSession(session: VidyaSession): boolean {
    try {
      // Update last active timestamp
      session.lastActiveAt = new Date();

      // Serialize session
      const storedSession = this.serializeSession(session);
      const serialized = JSON.stringify(storedSession);

      // Check size
      if (serialized.length > MAX_STORAGE_SIZE) {
        console.warn('Session size exceeds limit, trimming old messages...');
        // Keep only last 50 messages
        session.messages = session.messages.slice(-50);
        return this.saveSession(session); // Retry with trimmed session
      }

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, serialized);
      return true;
    } catch (error) {
      console.error('Failed to save Vidya session:', error);

      // If quota exceeded, clear old data and retry
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing and retrying...');
        this.clearSession();
        return this.saveSession(session);
      }

      return false;
    }
  }

  /**
   * Load session from localStorage
   */
  static loadSession(): VidyaSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return null;
      }

      const storedSession: StoredVidyaSession = JSON.parse(stored);

      // Version migration if needed
      const migrated = this.migrateSession(storedSession);

      // Deserialize session
      return this.deserializeSession(migrated);
    } catch (error) {
      console.error('Failed to load Vidya session:', error);
      // If corrupted, clear and start fresh
      this.clearSession();
      return null;
    }
  }

  /**
   * Clear session from localStorage
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear Vidya session:', error);
    }
  }

  /**
   * Export session as JSON blob
   */
  static async exportSession(session: VidyaSession): Promise<Blob> {
    const storedSession = this.serializeSession(session);

    // Create readable export format
    const exportData = {
      exportedAt: new Date().toISOString(),
      sessionId: session.id,
      userRole: session.userRole,
      startedAt: session.startedAt.toISOString(),
      duration: Date.now() - session.startedAt.getTime(),
      statistics: session.metadata,
      preferences: session.preferences,
      conversation: storedSession.messages.map((msg) => ({
        timestamp: msg.timestamp,
        role: msg.role,
        type: msg.type,
        content: msg.content,
      })),
    };

    const json = JSON.stringify(exportData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Import session from JSON
   */
  static async importSession(file: File): Promise<VidyaSession | null> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate import data
      if (!data.sessionId || !data.userRole || !data.conversation) {
        throw new Error('Invalid session file format');
      }

      // Create new session from imported data
      const session: VidyaSession = {
        id: `imported-${Date.now()}`,
        version: CURRENT_VERSION,
        userRole: data.userRole,
        startedAt: new Date(data.startedAt),
        lastActiveAt: new Date(),
        messages: data.conversation.map((msg: any, idx: number) => ({
          id: `imported-${idx}`,
          role: msg.role,
          type: msg.type || 'text',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        })),
        preferences: data.preferences || DEFAULT_PREFERENCES,
        metadata: data.statistics || {
          totalMessages: data.conversation.length,
          actionsTaken: 0,
          toolsUsed: [],
          insightsGenerated: 0,
        },
      };

      return session;
    } catch (error) {
      console.error('Failed to import session:', error);
      return null;
    }
  }

  /**
   * Get storage usage info
   */
  static getStorageInfo(): {
    used: number;
    max: number;
    percentage: number;
    canStore: boolean;
  } {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const used = stored ? stored.length : 0;
      const percentage = (used / MAX_STORAGE_SIZE) * 100;

      return {
        used,
        max: MAX_STORAGE_SIZE,
        percentage: Math.round(percentage),
        canStore: used < MAX_STORAGE_SIZE * 0.9, // 90% threshold
      };
    } catch {
      return {
        used: 0,
        max: MAX_STORAGE_SIZE,
        percentage: 0,
        canStore: true,
      };
    }
  }

  /**
   * Clean up old sessions (if multiple exist)
   */
  static cleanup(): void {
    // For now, we only store one session
    // In future, could implement multi-session storage with cleanup
    const storageInfo = this.getStorageInfo();

    if (!storageInfo.canStore) {
      console.warn('Storage near limit, clearing session...');
      this.clearSession();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERIALIZATION / DESERIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Serialize session for storage
   */
  private static serializeSession(session: VidyaSession): StoredVidyaSession {
    return {
      id: session.id,
      version: session.version,
      userRole: session.userRole,
      startedAt: session.startedAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
      messages: session.messages.map(this.serializeMessage),
      preferences: session.preferences,
      metadata: session.metadata,
    };
  }

  /**
   * Deserialize session from storage
   */
  private static deserializeSession(stored: StoredVidyaSession): VidyaSession {
    return {
      id: stored.id,
      version: stored.version,
      userRole: stored.userRole,
      startedAt: new Date(stored.startedAt),
      lastActiveAt: new Date(stored.lastActiveAt),
      messages: stored.messages.map(this.deserializeMessage),
      preferences: stored.preferences,
      metadata: stored.metadata,
    };
  }

  /**
   * Serialize a single message
   */
  private static serializeMessage(message: VidyaMessage): SerializedVidyaMessage {
    return {
      id: message.id,
      role: message.role,
      type: message.type,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      // Exclude metadata.actions (functions can't be serialized)
      metadata: message.metadata
        ? {
            quickReplies: message.metadata.quickReplies,
            insightData: message.metadata.insightData,
            imageUrl: message.metadata.imageUrl,
            progress: message.metadata.progress,
            progressLabel: message.metadata.progressLabel,
            toolCallId: message.metadata.toolCallId,
            toolName: message.metadata.toolName,
          }
        : undefined,
    };
  }

  /**
   * Deserialize a single message
   */
  private static deserializeMessage(
    serialized: SerializedVidyaMessage
  ): VidyaMessage {
    return {
      id: serialized.id,
      role: serialized.role,
      type: serialized.type,
      content: serialized.content,
      timestamp: new Date(serialized.timestamp),
      metadata: serialized.metadata,
      // Actions will be re-created by UI components as needed
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSION MIGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Migrate session from older versions
   */
  private static migrateSession(stored: StoredVidyaSession): StoredVidyaSession {
    let migrated = { ...stored };

    // Version 1 → 2 migration
    if (migrated.version < 2) {
      console.log('Migrating Vidya session from v1 to v2...');

      // Add new fields with defaults
      migrated = {
        ...migrated,
        version: 2,
        preferences: {
          ...(migrated.preferences || {}),
          theme: 'auto', // New field in v2
        } as VidyaUserPreferences,
        metadata: {
          ...(migrated.metadata || {
            totalMessages: 0,
            actionsTaken: 0,
            toolsUsed: [],
            insightsGenerated: 0,
          }),
        },
      };
    }

    return migrated;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Auto-save session (debounced)
 */
let saveTimeout: NodeJS.Timeout | null = null;

export function autoSaveSession(session: VidyaSession, debounceMs: number = 1000): void {
  if (!session.preferences.autoSave) return;

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    VidyaSessionManager.saveSession(session);
    saveTimeout = null;
  }, debounceMs);
}

/**
 * Download session as file
 */
export async function downloadSession(session: VidyaSession): Promise<void> {
  try {
    const blob = await VidyaSessionManager.exportSession(session);
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `vidya-session-${session.id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download session:', error);
  }
}
