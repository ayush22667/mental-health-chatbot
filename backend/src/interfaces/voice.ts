/**
 * Voice Support Interfaces
 * 
 * Type definitions for Amazon Nova Sonic voice conversation system.
 * These interfaces define the contracts for voice input/output and tool invocation.
 */

import { Message } from '../models';

/**
 * Supported voice language codes for Amazon Nova Sonic
 */
export type VoiceLanguageCode = 'en-IN' | 'hi-IN';

/**
 * Options for initiating a voice conversation with Nova Sonic
 */
export interface VoiceConversationOptions {
  sessionId: string;
  language: VoiceLanguageCode;
  systemPrompt: string;
  tools: NovaSonicTool[];
  conversationHistory: Message[];
}

/**
 * Tool definition for Nova Sonic tool invocation
 * Nova Sonic can call these tools during conversation to access
 * safety checks, RAG retrieval, and session management
 */
export interface NovaSonicTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Audio chunk for streaming audio data
 */
export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  isFinal: boolean;
}

/**
 * Result of a voice conversation turn
 */
export interface VoiceConversationResult {
  audioStream: AsyncGenerator<AudioChunk>;
  transcript?: string;
  toolCalls: ToolCall[];
}

/**
 * Record of a tool invocation by Nova Sonic
 */
export interface ToolCall {
  toolName: string;
  input: Record<string, any>;
  output: any;
  timestamp: number;
}

/**
 * Options for transcribing audio (legacy interface for fallback)
 */
export interface TranscriptionOptions {
  audioBuffer: Buffer;
  languageCode: VoiceLanguageCode;
  sessionId: string;
}

/**
 * Result of audio transcription
 */
export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  language: VoiceLanguageCode;
  isFinal: boolean;
  durationMs: number;
}

/**
 * Options for synthesizing speech (legacy interface for fallback)
 */
export interface SynthesisOptions {
  text: string;
  language: VoiceLanguageCode;
  voiceId?: string;
  speakingRate?: number;
  outputFormat: 'mp3' | 'ogg_vorbis' | 'pcm';
}

/**
 * Result of speech synthesis
 */
export interface SynthesisResult {
  audioBuffer: Buffer;
  durationMs: number;
  format: string;
}
