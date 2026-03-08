import { Router } from 'express';
import { ContentService } from '../services/ContentService';

const router = Router();
const contentService = new ContentService();

/**
 * GET /api/exercises
 * Get list of exercises with optional filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { language, category, duration } = req.query;
    
    const exercises = await contentService.getExercises({
      language: (language as string) || 'en',
      category: category as string,
      duration: duration as 'short' | 'medium',
    });
    
    res.json({ exercises });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/exercises/:exerciseId
 * Get specific exercise details
 */
router.get('/:exerciseId', async (req, res, next) => {
  try {
    const { exerciseId } = req.params;
    
    const exercise = await contentService.getExerciseById(exerciseId);
    
    if (!exercise) {
      return res.status(404).json({
        status: 'error',
        message: 'Exercise not found',
      });
    }
    
    res.json({ exercise });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/exercises/:exerciseId/feedback
 * Submit feedback for an exercise
 */
router.post('/:exerciseId/feedback', async (req, res, next) => {
  try {
    const { exerciseId } = req.params;
    const { sessionId, helpful, completed, notes } = req.body;
    
    await contentService.submitFeedback({
      exerciseId,
      sessionId,
      helpful,
      completed,
      notes,
    });
    
    res.json({
      status: 'success',
      message: 'Feedback submitted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
