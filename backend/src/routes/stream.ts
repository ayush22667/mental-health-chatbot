/**
 * SSE Streaming Routes
 * 
 * Handles Server-Sent Events for real-time chat response streaming
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { streamingService } from '../services/StreamingService';
import { optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/stream/chat
 * 
 * Initiate a streaming chat response
 * Returns a rayId that the client uses to subscribe to the SSE stream
 */
router.post('/chat', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, message, language = 'en' } = req.body;

    console.log('Stream chat request:', { sessionId, message: message.substring(0, 50), language });

    if (!sessionId || !message) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, message',
      });
    }

    // Generate unique Ray ID for this conversation
    const rayId = uuidv4();

    console.log('Generated rayId:', rayId);

    // Return rayId immediately so client can subscribe
    res.json({
      rayId,
      streamUrl: `/api/stream/subscribe/${rayId}`,
    });

    // Import ChatService dynamically to avoid circular dependencies
    const { ChatService } = await import('../services/ChatService');
    const chatService = new ChatService();

    // Give client time to subscribe before processing (100ms delay)
    setTimeout(() => {
      console.log('Starting chat processing for rayId:', rayId);
      
      // Process chat asynchronously and stream results
      chatService.processMessageStreaming({
        sessionId,
        message,
        language,
        rayId,
      }).catch((error) => {
        console.error('Background chat processing error:', error);
        streamingService.streamError(rayId, 'Failed to process message');
        streamingService.completeStream(rayId);
      });
    }, 100);
    
  } catch (error: any) {
    console.error('Stream chat error:', error);
    res.status(500).json({ error: 'Failed to initiate stream' });
  }
});

/**
 * GET /api/stream/subscribe/:rayId
 * 
 * Subscribe to SSE stream for a specific Ray ID
 * Client maintains persistent connection to receive real-time events
 */
router.get('/subscribe/:rayId', (req: Request, res: Response) => {
  const { rayId } = req.params;

  console.log('Client subscribing to stream:', rayId);

  if (!rayId) {
    return res.status(400).json({ error: 'Missing rayId' });
  }

  // Initialize SSE stream
  streamingService.initializeStream(rayId, res);

  console.log('Stream initialized for rayId:', rayId);

  // Keep connection alive with periodic heartbeat
  const heartbeatInterval = setInterval(() => {
    if (streamingService.isStreamActive(rayId)) {
      res.write(': heartbeat\n\n');
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000); // Every 30 seconds

  // Clean up on disconnect
  res.on('close', () => {
    console.log('Client disconnected from stream:', rayId);
    clearInterval(heartbeatInterval);
  });
});

/**
 * GET /api/stream/health
 * 
 * Health check for streaming service
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    activeStreams: streamingService.getActiveStreamCount(),
  });
});

export default router;
