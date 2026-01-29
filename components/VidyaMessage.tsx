import React from 'react';
import { Bot, User } from 'lucide-react';
import { VidyaMessage as VidyaMessageType } from '../types';
import SimpleMathRenderer from './SimpleMathRenderer';

interface VidyaMessageProps {
  message: VidyaMessageType;
}

/**
 * Individual message bubble component for Vidya chatbot
 * Handles both user and AI messages with different styling
 * Uses SimpleMathRenderer for LaTeX rendering in AI responses
 */
const VidyaMessage: React.FC<VidyaMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-primary-600'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-sm'
            : 'bg-slate-100 text-slate-800 rounded-tl-sm'
        }`}
      >
        {isUser ? (
          // User messages: plain text
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        ) : (
          // AI messages: render with math support
          <div className="text-sm leading-relaxed">
            <SimpleMathRenderer text={message.content} />
            {/* Streaming cursor */}
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-slate-800 ml-1 animate-pulse" />
            )}
          </div>
        )}

        {/* Timestamp (optional, for debugging) */}
        {/* <p className="text-xs mt-1 opacity-60">
          {message.timestamp.toLocaleTimeString()}
        </p> */}
      </div>
    </div>
  );
};

export default VidyaMessage;
