import { Router } from 'express';
import { JournalService } from '../services/JournalService';
import { requireAuth, checkResourceAccess, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const journalService = new JournalService();

/**
 * POST /api/journal/entry
 * Create a new journal entry (requires authentication)
 */
router.post('/entry', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { content, language } = req.body;
    
    if (!content || !language) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: content, language',
      });
    }

    // Use authenticated user ID
    const userId = req.user!.userId;
    
    const entry = await journalService.createEntry({
      userId,
      content,
      language,
    });
    
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/journal/entries
 * Get all journal entries for authenticated user
 */
router.get('/entries', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    // Use authenticated user ID
    const userId = req.user!.userId;
    
    const entries = await journalService.getEntries(userId);
    
    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/journal/entry/:entryId
 * Delete a journal entry (requires authentication)
 */
router.delete('/entry/:entryId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { entryId } = req.params;
    const userId = req.user!.userId;
    
    await journalService.deleteEntry(userId, entryId);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/journal/export
 * Export all journal entries (requires authentication)
 */
router.get('/export', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    
    const exportData = await journalService.exportEntries(userId);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="journal-export.txt"');
    res.send(exportData);
  } catch (error) {
    next(error);
  }
});

export default router;
