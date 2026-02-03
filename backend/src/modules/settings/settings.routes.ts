/**
 * Settings Routes
 * API endpoints for system settings management
 */

import { Router, Request, Response } from 'express';
import { SettingsService } from './settings.service';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

const router = Router();
const settingsService = new SettingsService();

/**
 * GET /api/v1/settings
 * Get all settings grouped by category
 * Access: ADMIN only
 */
router.get(
  '/',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const result = await settingsService.findAll();
      res.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch settings';
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/settings/:category
 * Get settings for specific category
 * Access: ADMIN only
 */
router.get(
  '/:category',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const category = req.params.category;
      const settings = await settingsService.findByCategory(category);
      res.json({
        success: true,
        data: settings,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Category not found';
      const status = message.includes('not found') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * PUT /api/v1/settings/:category/:key
 * Update specific setting
 * Access: ADMIN only
 */
router.put(
  '/:category/:key',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const category = req.params.category;
      const key = req.params.key;
      const { value } = req.body;
      const currentUser = (req as any).user;

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Value is required',
          timestamp: new Date().toISOString(),
        });
      }

      const updated = await settingsService.update(category, key, value, currentUser.id);
      res.json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update setting';
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/settings/integrations/test
 * Test integration connection
 * Access: ADMIN only
 */
router.post(
  '/integrations/test',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { integrationType } = req.body;

      if (!integrationType) {
        return res.status(400).json({
          success: false,
          error: 'integrationType is required',
          timestamp: new Date().toISOString(),
        });
      }

      const result = await settingsService.testIntegration(integrationType);
      res.json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to test integration';
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;

