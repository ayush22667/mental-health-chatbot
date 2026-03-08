/**
 * VoiceOutputController
 * 
 * Handles audio playback using Web Audio API.
 * Supports streaming audio playback with queuing for smooth playback.
 */

import { IVoiceOutputController } from './interfaces';

export class VoiceOutputController implements IVoiceOutputController {
  private audioContext: AudioContext | null = null;
  // private audioQueue: AudioBuffer[] = [];
  private currentSource: AudioBufferSourceNode | null = null;
  private state: 'idle' | 'playing' | 'paused' | 'stopped' = 'idle';
  private isPlaying = false;
  private nextStartTime = 0;

  constructor() {
    // Initialize AudioContext
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /**
   * Play audio stream
   */
  async play(audioStream: AsyncIterable<ArrayBuffer>): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    this.state = 'playing';
    this.isPlaying = true;
    this.nextStartTime = this.audioContext.currentTime;

    try {
      for await (const chunk of audioStream) {
        if (!this.isPlaying) {
          break;
        }

        await this.playChunk(chunk);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      throw error;
    } finally {
      this.state = 'idle';
      this.isPlaying = false;
    }
  }

  /**
   * Play a single audio chunk
   */
  private async playChunk(chunk: ArrayBuffer): Promise<void> {
    if (!this.audioContext || !this.isPlaying) {
      return;
    }

    try {
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(chunk.slice(0));

      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      // Schedule playback
      const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.currentSource = source;
    } catch (error) {
      console.error('Failed to decode/play audio chunk:', error);
    }
  }

  /**
   * Pause audio playback
   */
  pause(): void {
    if (this.audioContext && this.state === 'playing') {
      this.audioContext.suspend();
      this.state = 'paused';
    }
  }

  /**
   * Resume audio playback
   */
  resume(): void {
    if (this.audioContext && this.state === 'paused') {
      this.audioContext.resume();
      this.state = 'playing';
    }
  }

  /**
   * Stop audio playback
   */
  stop(): void {
    this.isPlaying = false;

    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Ignore errors if already stopped
      }
      this.currentSource = null;
    }

    // this.audioQueue = [];
    this.state = 'stopped';
  }

  /**
   * Get current state
   */
  getState(): 'idle' | 'playing' | 'paused' | 'stopped' {
    return this.state;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
