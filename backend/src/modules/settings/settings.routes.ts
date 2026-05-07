/**
 * Settings Routes
 * API endpoints for system settings management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SettingsService } from './settings.service';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

const router = Router();
const settingsService = new SettingsService();

// ── Zod schemas ─────────────────────────────────────────────────────────

const GmailConfigureSchema = z.object({
  email: z.string().email('Invalid email address'),
  // App password: 16 chars without spaces, or 19 with spaces (xxxx xxxx xxxx xxxx)
  appPassword: z
    .string()
    .min(16, 'App password must be at least 16 characters')
    .max(50, 'App password too long'),
});

// ── Gmail IMAP endpoints ─────────────────────────────────────────────────

/**
 * GET /api/v1/settings/gmail
 * Returns current Gmail IMAP config (never returns password, only hasPassword boolean)
 */
router.get(
  '/gmail',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const config = await settingsService.getGmailConfig();
      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch Gmail config';
      res.status(500).json({ success: false, error: message, timestamp: new Date().toISOString() });
    }
  }
);

/**
 * POST /api/v1/settings/gmail/configure
 * Save Gmail email + App Password (password stored AES-encrypted)
 */
router.post(
  '/gmail/configure',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const parsed = GmailConfigureSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: parsed.error.errors.map((e) => e.message).join('; '),
          timestamp: new Date().toISOString(),
        });
      }

      const currentUser = (req as any).user;
      const config = await settingsService.setGmailConfig(parsed.data, currentUser.id);

      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save Gmail config';
      res.status(500).json({ success: false, error: message, timestamp: new Date().toISOString() });
    }
  }
);

/**
 * POST /api/v1/settings/gmail/test
 * Test IMAP connection with currently configured credentials
 */
router.post(
  '/gmail/test',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const result = await settingsService.testGmailConnection();
      res.json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gmail test failed';
      res.status(500).json({ success: false, error: message, timestamp: new Date().toISOString() });
    }
  }
);

/**
 * POST /api/v1/settings/gmail/sync-now
 * Trigger immediate email fetch + classifier pipeline (max 20 emails)
 */
router.post(
  '/gmail/sync-now',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const result = await settingsService.triggerGmailSync();
      res.json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gmail sync failed';
      res.status(500).json({ success: false, error: message, timestamp: new Date().toISOString() });
    }
  }
);

// ── Existing settings endpoints ──────────────────────────────────────────

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
