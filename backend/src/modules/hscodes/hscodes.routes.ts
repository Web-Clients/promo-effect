/**
 * HS Codes Routes
 * API endpoints for customs code lookup
 */

import { Router, Request, Response } from 'express';
import { hsCodesService } from './hscodes.service';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/hscodes/search?q=query
 * Search HS codes by code or description
 */
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query || query.length < 2) {
      return res.json({ results: [], message: 'Query must be at least 2 characters' });
    }

    const results = await hsCodesService.search(query, limit);
    res.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search HS codes';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/hscodes/:code
 * Get HS code by exact code
 */
router.get('/code/:code', authMiddleware, async (req: Request, res: Response) => {
  try {
    const code = req.params.code;
    const result = await hsCodesService.getByCode(code);

    if (!result) {
      return res.status(404).json({ error: 'HS code not found' });
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get HS code';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/hscodes/chapters
 * Get all chapters for category navigation
 */
router.get('/chapters', authMiddleware, async (req: Request, res: Response) => {
  try {
    const chapters = await hsCodesService.getChapters();
    res.json({ chapters });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get chapters';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/hscodes/chapter/:chapter
 * Get all codes in a chapter
 */
router.get('/chapter/:chapter', authMiddleware, async (req: Request, res: Response) => {
  try {
    const chapter = req.params.chapter;
    const results = await hsCodesService.getByChapter(chapter);
    res.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get codes by chapter';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/hscodes/calculate-duty
 * Calculate customs duty for a given HS code and value
 */
router.post('/calculate-duty', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code, cargoValue, currency } = req.body;

    if (!code || !cargoValue) {
      return res.status(400).json({ error: 'Code and cargoValue are required' });
    }

    const result = await hsCodesService.calculateDuty(code, cargoValue, currency);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate duty';
    res.status(500).json({ error: message });
  }
});

export default router;
