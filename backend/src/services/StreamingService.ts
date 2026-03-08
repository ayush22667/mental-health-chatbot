/**
 * Streaming Service for Server-Sent Events (SSE)
 * 
 * Handles real-time streaming of chat responses to clients
 * Uses SSE for unidirectional server-to-client communication
 */

import { Response } from 'express';

export interface StreamEvent {
  type: 'token' | 'metadata' | 'error' | 'done';
  data: any;
  rayId?: string;
}

export class StreamingService {
  private activeStreams: Map<string, Response> = new Map();

  /**
   * Initialize SSE connection for a client
   */
  initializeStream(rayId: string, res: Response): void {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection event
    this.sendEvent(rayId, res, {
      type: 'metadata',
      data: { connected: true, rayId },
    });

    // Store active stream
    this.activeStreams.set(rayId, res);

    // Handle client disconnect
    res.on('close', () => {
      this.activeStreams.delete(rayId);
      console.log(`Stream closed for rayId: ${rayId}`);
    });
  }

  /**
   * Send an event to a specific stream
   */
  sendEvent(rayId: string, res: Response, event: StreamEvent): void {
    const data = JSON.stringify(event);
    res.write(`data: ${data}\n\n`);
  }

  /**
   * Stream a token (word/phrase) to the client
   */
  streamToken(rayId: string, token: string): void {
    const res = this.activeStreams.get(rayId);
    if (res) {
      this.sendEvent(rayId, res, {
        type: 'token',
        data: { token },
        rayId,
      });
    }
  }

  /**
   * Stream metadata (risk level, citations, etc.)
   */
  streamMetadata(rayId: string, metadata: any): void {
    const res = this.activeStreams.get(rayId);
    if (res) {
      this.sendEvent(rayId, res, {
        type: 'metadata',
        data: metadata,
        rayId,
      });
    }
  }

  /**
   * Stream an error
   */
  streamError(rayId: string, error: string): void {
    const res = this.activeStreams.get(rayId);
    if (res) {
      this.sendEvent(rayId, res, {
        type: 'error',
        data: { error },
        rayId,
      });
    }
  }

  /**
   * Complete the stream
   */
  completeStream(rayId: string): void {
    const res = this.activeStreams.get(rayId);
    if (res) {
      this.sendEvent(rayId, res, {
        type: 'done',
        data: { completed: true },
        rayId,
      });
      res.end();
      this.activeStreams.delete(rayId);
    }
  }

  /**
   * Check if a stream is active
   */
  isStreamActive(rayId: string): boolean {
    return this.activeStreams.has(rayId);
  }

  /**
   * Get count of active streams
   */
  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Close all active streams (for graceful shutdown)
   */
  closeAllStreams(): void {
    for (const [rayId, res] of this.activeStreams.entries()) {
      this.sendEvent(rayId, res, {
        type: 'done',
        data: { completed: false, reason: 'server_shutdown' },
        rayId,
      });
      res.end();
    }
    this.activeStreams.clear();
  }
}

// Singleton instance
export const streamingService = new StreamingService();
