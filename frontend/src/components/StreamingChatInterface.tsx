/**
 * Streaming Chat Interface Component
 * 
 * Displays chat messages with real-time streaming responses using SSE
 */

import React, { useState, useEffect, useRef } from 'react';
import { streamingChatService } from '../services/StreamingChatService';
import { ChatInputBar } from './ChatInputBar';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface StreamingChatInterfaceProps {
  sessionId: string;
  language?: string;
  initialMessage?: string | null;
  voiceState?: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  onVoiceToggle?: () => void;
  isVoiceSupported?: boolean;
  voiceError?: string | null;
}

export const StreamingChatInterface: React.FC<StreamingChatInterfaceProps> = ({
  sessionId,
  language = 'en',
  initialMessage = null,
  voiceState = 'idle',
  onVoiceToggle,
  isVoiceSupported = false,
  voiceError = null,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false); // Track if initial message was sent

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamingMessage]);

  // Auto-send initial message if provided
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current && sessionId) {
      initialMessageSentRef.current = true; // Mark as sent immediately
      
      // Add the user message to UI first
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: initialMessage,
        timestamp: Date.now(),
      };
      setMessages([userMessage]);
      
      // Then send it to backend (without adding to UI again)
      sendMessageToBackend(initialMessage);
    }
  }, [initialMessage, sessionId]);

  const sendMessageToBackend = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    setIsLoading(true);
    setCurrentStreamingMessage('');

    // Track the streaming message content
    let streamedContent = '';

    try {
      // Start streaming response
      await streamingChatService.sendMessageStreaming(
        sessionId,
        messageText,
        language,
        {
          onToken: (token: string) => {
            streamedContent += token;
            setCurrentStreamingMessage(streamedContent);
          },
          onMetadata: (metadata: any) => {
            console.log('Metadata:', metadata);
            // Handle risk level, citations, etc.
          },
          onError: (error: string) => {
            console.error('Stream error:', error);
            setIsLoading(false);
            // Show error message
            const errorMessage: Message = {
              id: Date.now().toString(),
              role: 'system',
              content: `Error: ${error}`,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorMessage]);
            setCurrentStreamingMessage('');
          },
          onComplete: () => {
            // Save completed message
            const assistantMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: streamedContent,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setCurrentStreamingMessage('');
            setIsLoading(false);
          },
        }
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      setCurrentStreamingMessage('');
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    
    // Send to backend
    await sendMessageToBackend(messageText);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 border-b">
        <h1 className="text-xl font-semibold text-gray-800">
          Mental Health Support Chat
        </h1>
        <p className="text-sm text-gray-500">
          Streaming responses powered by SSE
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.role === 'system'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-white text-gray-800 shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {currentStreamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-lg p-3 bg-white text-gray-800 shadow-sm">
              <p className="whitespace-pre-wrap">{currentStreamingMessage}</p>
              <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pb-24">
        {/* Voice error message */}
        {voiceError && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-600">Voice error: {voiceError}</p>
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <ChatInputBar
        onSendMessage={sendMessage}
        disabled={isLoading}
        voiceState={voiceState}
        onVoiceToggle={onVoiceToggle}
        isVoiceSupported={isVoiceSupported}
      />
    </div>
  );
};
