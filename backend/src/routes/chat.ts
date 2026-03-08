import { Router } from 'express';
import { ChatService } from '../services/ChatService';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const chatService = new ChatService();

/**
 * POST /api/chat/message
 * Send a message and receive a response
 * Supports both anonymous and authenticated users
 */
router.post('/message', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sessionId, message, language, mode } = req.body;
    
    // Validation
    if (!sessionId || !message || !language) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: sessionId, message, language',
      });
    }
    
    const response = await chatService.sendMessage({
      sessionId,
      message,
      language,
      mode: mode || 'emotional_support',
    });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
