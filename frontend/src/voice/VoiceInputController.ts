/**
 * VoiceInputController
 * 
 * Handles microphone access and audio capture using MediaRecorder API.
 * Captures audio at 16kHz mono with noise suppression for optimal quality.
 */

import { IVoiceInputController, VoiceInputEvent } from './interfaces';

export class VoiceInputController implements IVoiceInputController {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private state: 'idle' | 'recording' | 'stopped' = 'idle';
  private eventCallback: ((event: VoiceInputEvent) => void) | null = null;

  /**
   * Start audio capture
   */
  async start(): Promise<void> {
    try {
      // Request microphone permission with audio constraints
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono
          sampleRate: 16000, // 16kHz
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      // Handle audio data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Convert Blob to ArrayBuffer
          event.data.arrayBuffer().then((buffer) => {
            this.emitEvent({
              type: 'audio-chunk',
              data: buffer,
            });
          });
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        this.state = 'stopped';
        this.emitEvent({ type: 'final' });
      };

      // Handle errors
      this.mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        this.emitEvent({
          type: 'error',
          error: event.error?.message || 'Recording failed',
        });
      };

      // Start recording with 100ms chunks
      this.mediaRecorder.start(100);
      this.state = 'recording';
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      this.emitEvent({
        type: 'error',
        error: error instanceof Error ? error.message : 'Microphone access denied',
      });
      throw error;
    }
  }

  /**
   * Stop audio capture
   */
  stop(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.stop();
    }

    this.cleanup();
  }

  /**
   * Abort audio capture
   */
  abort(): void {
    this.cleanup();
    this.state = 'stopped';
  }

  /**
   * Get current state
   */
  getState(): 'idle' | 'recording' | 'stopped' {
    return this.state;
  }

  /**
   * Register event callback
   */
  onEvent(callback: (event: VoiceInputEvent) => void): void {
    this.eventCallback = callback;
  }

  /**
   * Emit event to callback
   */
  private emitEvent(event: VoiceInputEvent): void {
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    this.mediaRecorder = null;
  }
}
