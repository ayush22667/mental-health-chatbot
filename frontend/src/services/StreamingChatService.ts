/**
 * Streaming Chat Service for SSE
 * 
 * Handles Server-Sent Events for real-time chat response streaming
 */

import { fetchAuthSession } from 'aws-amplify/auth';

export interface StreamEvent {
  type: 'token' | 'metadata' | 'error' | 'done';
  data: any;
  rayId?: string;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onMetadata?: (metadata: any) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export class StreamingChatService {
  private baseUrl: string;
  private activeStreams: Map<string, EventSource> = new Map();

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get authentication headers with Cognito JWT token
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    try {
      // Get current auth session from Cognito
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      // User not authenticated - backend will treat as anonymous
      console.log('No auth token available, using anonymous access');
    }

    return headers;
  }

  /**
   * Send a message and start streaming the response
   */
  async sendMessageStreaming(
    sessionId: string,
    message: string,
    language: string = 'en',
    callbacks: StreamCallbacks
  ): Promise<string> {
    try {
      // 1. Initiate streaming chat
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/api/stream/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          message,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { rayId, streamUrl } = await response.json();

      // 2. Subscribe to SSE stream
      this.subscribeToStream(rayId, streamUrl, callbacks);

      return rayId;

    } catch (error: any) {
      console.error('Streaming chat error:', error);
      callbacks.onError?.(error.message || 'Failed to send message');
      throw error;
    }
  }

  /**
   * Subscribe to SSE stream for a specific Ray ID
   */
  private subscribeToStream(
    rayId: string,
    streamUrl: string,
    callbacks: StreamCallbacks
  ): void {
    const fullUrl = `${this.baseUrl}${streamUrl}`;
    const eventSource = new EventSource(fullUrl);

    // Store active stream
    this.activeStreams.set(rayId, eventSource);

    // Handle incoming messages
    eventSource.onmessage = (event) => {
      try {
        const streamEvent: StreamEvent = JSON.parse(event.data);

        switch (streamEvent.type) {
          case 'token':
            callbacks.onToken?.(streamEvent.data.token);
            break;

          case 'metadata':
            callbacks.onMetadata?.(streamEvent.data);
            break;

          case 'error':
            callbacks.onError?.(streamEvent.data.error);
            this.closeStream(rayId);
            break;

          case 'done':
            callbacks.onComplete?.();
            this.closeStream(rayId);
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };

    // Handle errors
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      callbacks.onError?.('Connection error');
      this.closeStream(rayId);
    };
  }

  /**
   * Close a specific stream
   */
  closeStream(rayId: string): void {
    const eventSource = this.activeStreams.get(rayId);
    if (eventSource) {
      eventSource.close();
      this.activeStreams.delete(rayId);
    }
  }

  /**
   * Close all active streams
   */
  closeAllStreams(): void {
    for (const [, eventSource] of this.activeStreams.entries()) {
      eventSource.close();
    }
    this.activeStreams.clear();
  }

  /**
   * Check if a stream is active
   */
  isStreamActive(rayId: string): boolean {
    return this.activeStreams.has(rayId);
  }
}

// Singleton instance
export const streamingChatService = new StreamingChatService();
