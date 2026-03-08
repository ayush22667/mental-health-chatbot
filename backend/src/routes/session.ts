import { Router } from 'express';
import { SessionService } from '../services/SessionService';

const router = Router();
const sessionService = new SessionService();

/**
 * POST /api/session/create
 * Create a new session
 */
router.post('/create', async (req, res, next) => {
  try {
    const { userId, language, preferences } = req.body;
    
    const session = await sessionService.createSession({
      userId,
      language: language || 'en',
      preferences,
    });
    
    res.json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/session/:sessionId
 * Get session details
 */
router.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const session = await sessionService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found',
      });
    }
    
    res.json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/session/:sessionId/history
 * Get conversation history
 */
router.get('/:sessionId/history', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const history = await sessionService.getHistory(sessionId);
    
    res.json(history);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/session/:sessionId/end
 * End a session
 */
router.post('/:sessionId/end', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { saveInsights } = req.body;
    
    await sessionService.endSession(sessionId, saveInsights);
    
    res.json({
      status: 'success',
      message: 'Session ended',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
