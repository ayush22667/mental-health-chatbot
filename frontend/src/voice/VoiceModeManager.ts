/**
 * VoiceModeManager
 * 
 * Orchestrates voice conversation by coordinating input, output, and WebSocket communication.
 * Manages state machine for voice conversation flow.
 */

import { IVoiceModeManager, VoiceState, CrisisResources } from './interfaces';
import { VoiceInputController } from './VoiceInputController';
import { VoiceOutputController } from './VoiceOutputController';

interface VoiceModeManagerOptions {
  sessionId: string;
  language: 'en-IN' | 'hi-IN';
  onCrisisDetected?: (resources: CrisisResources) => void;
  onError?: (error: string) => void;
}

export class VoiceModeManager implements IVoiceModeManager {
  private inputController: VoiceInputController;
  private outputController: VoiceOutputController;
  private websocket: WebSocket | null = null;
  private state: VoiceState = 'idle';
  private stateCallback: ((state: VoiceState) => void) | null = null;
  private options: VoiceModeManagerOptions;

  constructor(options: VoiceModeManagerOptions) {
    this.options = options;
    this.inputController = new VoiceInputController();
    this.outputController = new VoiceOutputController();
  }

  /**
   * Start voice conversation
   */
  async startConversation(): Promise<void> {
    try {
      this.setState('listening');

      // Connect WebSocket
      await this.connectWebSocket();

      // Start audio input
      await this.inputController.start();

      // Wire input events to WebSocket
      this.inputController.onEvent((event) => {
        if (event.type === 'audio-chunk' && event.data) {
          this.sendAudioChunk(event.data);
        } else if (event.type === 'error') {
          this.handleError(event.error || 'Audio input error');
        }
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to start conversation');
    }
  }

  /**
   * Stop voice conversation
   */
  stopConversation(): void {
    this.inputController.stop();
    this.outputController.stop();

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.setState('idle');
  }

  /**
   * Get current state
   */
  getState(): VoiceState {
    return this.state;
  }

  /**
   * Register state change callback
   */
  onStateChange(callback: (state: VoiceState) => void): void {
    this.stateCallback = callback;
  }

  /**
   * Connect to WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.getWebSocketUrl();
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Voice WebSocket connected');
        resolve();
      };

      this.websocket.onmessage = async (event) => {
        await this.handleWebSocketMessage(event);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handleError('WebSocket connection failed');
        reject(error);
      };

      this.websocket.onclose = () => {
        console.log('Voice WebSocket closed');
        this.setState('idle');
      };
    });
  }

  /**
   * Handle WebSocket message
   */
  private async handleWebSocketMessage(event: MessageEvent): Promise<void> {
    // Check if it's a JSON message (error or control message)
    if (typeof event.data === 'string') {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'connected') {
          console.log('Voice conversation ready:', message);
          return;
        }

        if (message.type === 'error') {
          this.handleError(message.message || 'Server error');
          return;
        }

        // Check for crisis detection
        if (message.type === 'crisis') {
          this.handleCrisisDetected(message.resources);
          return;
        }
      } catch (error) {
        // Not JSON, ignore
      }
    }

    // Binary audio data
    if (event.data instanceof Blob) {
      this.setState('speaking');
      const arrayBuffer = await event.data.arrayBuffer();
      await this.playAudioChunk(arrayBuffer);
    }
  }

  /**
   * Send audio chunk to server
   */
  private sendAudioChunk(chunk: ArrayBuffer): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(chunk);
      this.setState('processing');
    }
  }

  /**
   * Play audio chunk
   */
  private async playAudioChunk(chunk: ArrayBuffer): Promise<void> {
    try {
      // Create async iterable from single chunk
      const audioStream = async function* () {
        yield chunk;
      };

      await this.outputController.play(audioStream());
      this.setState('listening');
    } catch (error) {
      console.error('Audio playback error:', error);
      this.handleError('Audio playback failed');
    }
  }

  /**
   * Handle crisis detection
   */
  private handleCrisisDetected(resources: CrisisResources): void {
    console.warn('Crisis detected in voice conversation');
    this.stopConversation();

    if (this.options.onCrisisDetected) {
      this.options.onCrisisDetected(resources);
    }
  }

  /**
   * Handle error
   */
  private handleError(error: string): void {
    console.error('Voice mode error:', error);
    this.setState('error');

    if (this.options.onError) {
      this.options.onError(error);
    }
  }

  /**
   * Set state and notify callback
   */
  private setState(state: VoiceState): void {
    this.state = state;

    if (this.stateCallback) {
      this.stateCallback(state);
    }
  }

  /**
   * Get WebSocket URL
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = (import.meta as any).env?.VITE_API_URL || 'localhost:3000';
    const cleanHost = host.replace(/^https?:\/\//, '');
    
    return `${protocol}//${cleanHost}/api/voice/conversation?sessionId=${this.options.sessionId}&language=${this.options.language}`;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopConversation();
    this.outputController.dispose();
  }
}
