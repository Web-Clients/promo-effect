/**
 * Terminal49 tracking routes.
 *
 *   POST /api/tracking/terminal49/webhook  — inbound carrier milestone events
 *   POST /api/tracking/terminal49/register — register a BL/container for tracking (admin)
 *   GET  /api/tracking/terminal49/status   — integration health (admin)
 *
 * Webhook events are mapped onto the provider-agnostic TrackingWebhookService,
 * so they flow through the same persistence + alerting path as manual entry and
 * the email parser.
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { webhookLimiter } from '../../middleware/rateLimit.middleware';
import { TrackingWebhookService } from './tracking-webhook.service';
import { terminal49 } from '../../integrations/terminal49.integration';
import logger from '../../utils/logger';

const router = Router();
const webhookService = new TrackingWebhookService();

/**
 * POST /api/tracking/terminal49/webhook
 * Public endpoint hit by Terminal49. Optional HMAC verification when
 * TERMINAL49_WEBHOOK_SECRET is set.
 */
router.post('/webhook', webhookLimiter, async (req: Request, res: Response) => {
  try {
    const sigHeader = req.headers['x-t49-webhook-signature'] || req.headers['x-signature'];
    const signature = Array.isArray(sigHeader) ? sigHeader[0] : (sigHeader as string | undefined);
    const rawBody = (req as any).rawBody
      ? (req as any).rawBody.toString('utf8')
      : JSON.stringify(req.body);

    if (!terminal49.verifyWebhookSignature(rawBody, signature)) {
      logger.warn('[Terminal49] webhook signature verification failed');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    const payloads = terminal49.mapWebhookToPayloads(req.body);
    if (payloads.length === 0) {
      // Acknowledge unmapped/irrelevant events so Terminal49 stops retrying.
      return res.status(200).json({ success: true, message: 'No actionable event', processed: 0 });
    }

    const results = [];
    for (const payload of payloads) {
      const result = await webhookService.processWebhook(payload, signature, 'TERMINAL49');
      results.push(result);
    }

    const processed = results.filter((r) => r.success).length;
    return res.status(200).json({ success: true, processed, results });
  } catch (error: any) {
    logger.error('[Terminal49] webhook error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Webhook failed' });
  }
});

/**
 * POST /api/tracking/terminal49/register
 * Register a bill of lading (or container) for tracking.
 * Body: { requestNumber, requestType?, scac? }
 */
router.post(
  '/register',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'OPERATOR']),
  async (req: Request, res: Response) => {
    try {
      const { requestNumber, requestType, scac } = req.body;
      if (!requestNumber) {
        return res.status(400).json({ success: false, error: 'requestNumber is required' });
      }
      if (!terminal49.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Terminal49 not configured. Add TERMINAL49_API_KEY to backend .env',
        });
      }
      const result = await terminal49.createTrackingRequest({ requestNumber, requestType, scac });
      return res.status(result.success ? 200 : 502).json(result);
    } catch (error: any) {
      logger.error('[Terminal49] register error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Register failed' });
    }
  }
);

/**
 * GET /api/tracking/terminal49/status
 * Report whether the integration is configured (admin only).
 */
router.get(
  '/status',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (_req: Request, res: Response) => {
    res.json({
      configured: terminal49.isConfigured(),
      provider: 'TERMINAL49',
      webhookUrl: '/api/tracking/terminal49/webhook',
    });
  }
);

export default router;
