/**
 * Voice Support Interfaces
 * 
 * Type definitions for frontend voice conversation system.
 */

/**
 * Voice conversation state
 */
export type VoiceState = 
  | 'idle'           // Not recording or playing
  | 'listening'      // Recording user audio
  | 'processing'     // Sending to server / waiting for response
  | 'speaking'       // Playing assistant audio
  | 'error';         // Error state

/**
 * Voice input event types
 */
export interface VoiceInputEvent {
  type: 'audio-chunk' | 'final' | 'error';
  data?: ArrayBuffer;
  error?: string;
}

/**
 * Voice output event types
 */
export interface VoiceOutputEvent {
  type: 'playing' | 'paused' | 'stopped' | 'ended' | 'error';
  error?: string;
}

/**
 * Voice input controller interface
 */
export interface IVoiceInputController {
  start(): Promise<void>;
  stop(): void;
  abort(): void;
  getState(): 'idle' | 'recording' | 'stopped';
  onEvent(callback: (event: VoiceInputEvent) => void): void;
}

/**
 * Voice output controller interface
 */
export interface IVoiceOutputController {
  play(audioStream: AsyncIterable<ArrayBuffer>): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  getState(): 'idle' | 'playing' | 'paused' | 'stopped';
}

/**
 * Voice mode manager interface
 */
export interface IVoiceModeManager {
  startConversation(): Promise<void>;
  stopConversation(): void;
  getState(): VoiceState;
  onStateChange(callback: (state: VoiceState) => void): void;
}

/**
 * Crisis resources structure
 */
export interface CrisisResources {
  kiran: string;
  vandrevala: string;
  emergency: string;
}
