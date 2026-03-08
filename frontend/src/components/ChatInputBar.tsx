/**
 * ChatInputBar Component
 * Bottom input bar for sending messages with accessibility support
 * Includes voice mode toggle button
 */

import React, { useState, useRef, KeyboardEvent } from 'react';
import { SendIcon } from './icons/SendIcon';
import { MicIcon } from './icons/MicIcon';

const PLACEHOLDER_TEXT = "Share what's on your mind…";
const HELPER_TEXT = 'Take your time • Enter to send';

interface ChatInputBarProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
  voiceState?: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  onVoiceToggle?: () => void;
  isVoiceSupported?: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({ 
  onSendMessage, 
  disabled = false,
  voiceState = 'idle',
  onVoiceToggle,
  isVoiceSupported = false,
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isVoiceActive = voiceState !== 'idle';
  const isInputDisabled = disabled || isVoiceActive;

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    // Log message for now (can be replaced with actual send logic)
    console.log('Sending message:', trimmedMessage);
    
    // Call optional callback
    onSendMessage?.(trimmedMessage);

    // Clear input
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift sends the message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const isDisabled = !message.trim() || isInputDisabled;

  const getVoiceButtonStyle = () => {
    if (!isVoiceSupported) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }

    switch (voiceState) {
      case 'listening':
        return 'bg-red-500 text-white animate-pulse';
      case 'processing':
        return 'bg-yellow-500 text-white';
      case 'speaking':
        return 'bg-blue-500 text-white';
      case 'error':
        return 'bg-red-100 text-red-600';
      case 'idle':
      default:
        return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    }
  };

  const getVoiceButtonLabel = () => {
    switch (voiceState) {
      case 'listening':
        return 'Stop recording';
      case 'processing':
        return 'Processing...';
      case 'speaking':
        return 'Assistant speaking';
      case 'idle':
      default:
        return 'Start voice conversation';
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[#f5f5f3] via-[#f5f5f3] to-transparent pb-safe">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-6 pt-4">
        {/* Input Container */}
        <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-gray-300 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
          <label htmlFor="chat-input" className="sr-only">
            Message input
          </label>
          
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isVoiceActive ? 'Voice mode active...' : PLACEHOLDER_TEXT}
            rows={1}
            disabled={isInputDisabled}
            className="w-full px-5 py-4 pr-28 bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-400 text-base leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ maxHeight: '120px' }}
          />

          {/* Voice Button */}
          {isVoiceSupported && (
            <button
              onClick={onVoiceToggle}
              disabled={!isVoiceSupported}
              aria-label={getVoiceButtonLabel()}
              className={`absolute right-16 bottom-3 p-2.5 rounded-full transition-all ${getVoiceButtonStyle()}`}
            >
              <MicIcon size={18} state={voiceState} />
            </button>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isDisabled}
            aria-label="Send message"
            className={`absolute right-3 bottom-3 p-2.5 rounded-full transition-all ${
              isDisabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-teal-500 text-white hover:bg-teal-600 active:scale-95 shadow-sm'
            }`}
          >
            <SendIcon size={18} />
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-400 text-center mt-2">
          {isVoiceActive ? (
            <span className="text-teal-600 font-medium">
              {voiceState === 'listening' && '🎤 Listening...'}
              {voiceState === 'processing' && '⏳ Processing...'}
              {voiceState === 'speaking' && '🔊 Speaking...'}
              {voiceState === 'error' && '❌ Voice error'}
            </span>
          ) : (
            HELPER_TEXT
          )}
        </p>
      </div>
    </footer>
  );
};
