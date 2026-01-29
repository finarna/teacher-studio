/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V2 - MESSAGE BUBBLE COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Enhanced message rendering with support for rich content types
 */

import React from 'react';
import { Bot, User, Loader2, Sparkles } from 'lucide-react';
import { VidyaMessage } from '../../types/vidya';
import RichMarkdownRenderer from '../RichMarkdownRenderer';
import InsightCard from './InsightCard';

interface VidyaMessageBubbleProps {
  message: VidyaMessage;
  onQuickReply?: (reply: string) => void;
}

const VidyaMessageBubble: React.FC<VidyaMessageBubbleProps> = ({
  message,
  onQuickReply,
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // System messages (centered, gray)
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-xs font-medium">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {isUser ? (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
          <User className="w-4 h-4 text-white" />
        </div>
      ) : (
        <img
          src="/assets/vidya-avatar.gif"
          alt="Vidya AI"
          className="flex-shrink-0 w-8 h-8 rounded-xl object-cover shadow-sm"
        />
      )}

      {/* Message Content Container */}
      <div className={`flex-1 max-w-[75%] ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200'
          }`}
        >
          {/* Text Content */}
          {message.type === 'text' && (
            <div className="text-sm leading-relaxed">
              {isUser ? (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              ) : (
                <>
                  <RichMarkdownRenderer text={message.content} />
                  {/* Streaming cursor */}
                  {message.isStreaming && (
                    <span className="inline-block w-0.5 h-4 bg-slate-800 ml-1 animate-pulse" />
                  )}
                </>
              )}
            </div>
          )}

          {/* Insight Card */}
          {message.type === 'insight_card' && message.metadata?.insightData && (
            <div className="text-sm">
              <RichMarkdownRenderer text={message.content} />
              <InsightCard data={message.metadata.insightData} />
            </div>
          )}

          {/* Action Prompt */}
          {message.type === 'action_prompt' && (
            <div className="text-sm">
              <RichMarkdownRenderer text={message.content} />
              {message.metadata?.actions && message.metadata.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {message.metadata.actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={action.handler}
                      disabled={action.disabled}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                        ${getActionButtonStyles(action.variant, isUser)}
                        ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                      `}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress Indicator */}
          {message.type === 'progress' && (
            <div className="text-sm">
              <p className="mb-2">{message.content}</p>
              <div className="bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all duration-300"
                  style={{ width: `${message.metadata?.progress || 0}%` }}
                />
              </div>
              {message.metadata?.progressLabel && (
                <p className="text-xs text-slate-500 mt-1">
                  {message.metadata.progressLabel}
                </p>
              )}
            </div>
          )}

          {/* Image Message */}
          {message.type === 'image' && message.metadata?.imageUrl && (
            <div className="text-sm">
              {message.content && <p className="mb-2">{message.content}</p>}
              <img
                src={message.metadata.imageUrl}
                alt="Vidya generated image"
                className="rounded-lg max-w-full h-auto"
              />
            </div>
          )}

          {/* Quick Reply Chips (only for AI messages) */}
          {!isUser && message.metadata?.quickReplies && message.metadata.quickReplies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.metadata.quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => onQuickReply?.(reply)}
                  className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-full text-xs font-medium transition-all hover:scale-105"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp (optional) */}
        {/* <p className="text-xs text-slate-400 mt-1 px-1">
          {message.timestamp.toLocaleTimeString()}
        </p> */}
      </div>
    </div>
  );
};

/**
 * Get action button styles
 */
function getActionButtonStyles(
  variant: 'primary' | 'secondary' | 'ghost' | 'danger',
  isUser: boolean
): string {
  if (isUser) {
    // User messages always have white background
    return 'bg-white text-primary-600 hover:bg-slate-50';
  }

  switch (variant) {
    case 'primary':
      return 'bg-primary-600 text-white hover:bg-primary-700';
    case 'secondary':
      return 'bg-white text-slate-900 hover:bg-slate-50 border border-slate-300';
    case 'ghost':
      return 'bg-transparent text-primary-600 hover:bg-white border border-primary-300';
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700';
  }
}

export default VidyaMessageBubble;
