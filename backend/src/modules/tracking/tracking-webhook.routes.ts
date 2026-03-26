import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { TrackingWebhookService } from './tracking-webhook.service';
import { webhookLimiter, emailParseLimiter } from '../../middleware/rateLimit.middleware';
import { parseEmailWithGemini, isGeminiConfigured } from '../../services/gemini.service';

const router = Router();
const webhookService = new TrackingWebhookService();

/**
 * POST /api/tracking/webhook
 * Webhook endpoint for external tracking providers (SeaRates web integration, etc.)
 * @access Public (with signature verification)
 */
router.post('/', webhookLimiter, async (req: Request, res: Response) => {
  try {
    // Get signature - handle both string and string[] types
    const signatureHeader = req.headers['x-signature'] || req.headers['x-searates-signature'];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : (signatureHeader as string | undefined);

    // Get provider - handle both string and string[] types
    const providerHeader = req.headers['x-provider'] || 'SEARATES';
    const provider = Array.isArray(providerHeader) ? providerHeader[0] : (providerHeader as string);

    const source = Array.isArray(req.headers['x-source'])
      ? req.headers['x-source'][0]
      : (req.headers['x-source'] as string | undefined) || provider;

    const payload = req.body;

    // Check if this is a SeaRates webhook (has specific format)
    let result;
    if (provider === 'SEARATES' || payload.event || payload.container) {
      result = await webhookService.processSeaRatesWebhook(payload, signature);
    } else {
      // Generic webhook format
      const webhookPayload = {
        ...payload,
        source,
      };
      result = await webhookService.processWebhook(webhookPayload, signature, provider);
    }

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process webhook',
    });
  }
});

/**
 * POST /api/tracking/parse-email
 * Parse email forwarded from partners in China using AI
 * @access ADMIN, OPERATOR
 */
router.post(
  '/parse-email',
  authMiddleware,
  emailParseLimiter,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'OPERATOR']),
  async (req: Request, res: Response) => {
    try {
      const { emailContent, attachments } = req.body;

      if (!emailContent) {
        return res.status(400).json({ error: 'Email content is required' });
      }

      if (!isGeminiConfigured()) {
        return res.status(503).json({
          error: 'AI parsing is not configured. Please add GEMINI_API_KEY to backend .env',
        });
      }

      // Parse email using Gemini AI
      const parsed = await parseEmailWithGemini(emailContent);

      if (parsed.error) {
        return res.status(422).json({
          success: false,
          error: parsed.error,
          confidence: parsed.confidence,
        });
      }

      res.json({
        success: true,
        data: parsed,
        confidence: parsed.confidence,
      });
    } catch (error: any) {
      console.error('Parse email error:', error);
      res.status(500).json({ error: error.message || 'Failed to parse email' });
    }
  }
);

export default router;
