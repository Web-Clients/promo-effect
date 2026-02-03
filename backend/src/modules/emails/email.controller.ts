/**
 * Email Controller
 *
 * API endpoints for email processing functionality:
 * - Gmail OAuth flow
 * - Manual email parsing
 * - Email queue management
 * - Processing statistics
 */

import { Router, Request, Response } from 'express';
import { emailService, ParsedEmail } from './email.service';
import { gmailIntegration } from '../../integrations/gmail.integration';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/admin/gmail/callback
 *
 * Gmail OAuth callback - exchanges code for tokens
 * NOTE: This endpoint is PUBLIC (no auth required) because it's called by Google OAuth redirect
 * MUST be defined BEFORE authMiddleware to remain public
 */
router.get('/gmail/callback', async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.status(400).json({
        error: 'Authorization denied',
        details: error
      });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const tokens = await gmailIntegration.exchangeCodeForTokens(code);

    // In production, redirect to frontend with success message
    return res.json({
      success: true,
      message: 'Gmail connected successfully!',
      expiresAt: tokens.expiresAt
    });
  } catch (error: any) {
    console.error('Gmail callback error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// All OTHER routes require authentication
router.use(authMiddleware);

/**
 * GET /api/admin/gmail/auth
 *
 * Start Gmail OAuth flow - returns authorization URL
 * Admin only
 */
router.get('/gmail/auth', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    if (!gmailIntegration.isConfigured()) {
      return res.status(503).json({
        error: 'Gmail OAuth not configured',
        message: 'Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET environment variables'
      });
    }

    const authUrl = gmailIntegration.getAuthUrl();

    return res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize Gmail access'
    });
  } catch (error: any) {
    console.error('Gmail auth error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/gmail/status
 *
 * Get Gmail connection status
 */
router.get('/gmail/status', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const status = await gmailIntegration.getStatus();

    return res.json(status);
  } catch (error: any) {
    console.error('Gmail status error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/emails/fetch
 *
 * Manually trigger email fetching from Gmail
 * Admin only
 */
router.post('/emails/fetch', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { maxResults = 10 } = req.body;

    // Check if Gmail is connected
    const status = await gmailIntegration.getStatus();
    if (!status.connected) {
      return res.status(400).json({
        error: 'Gmail not connected',
        message: 'Please authorize Gmail access first at /api/admin/gmail/auth'
      });
    }

    // Fetch emails
    const emails = await gmailIntegration.fetchUnreadEmails(maxResults);

    // Queue emails for processing
    for (const email of emails) {
      await emailService.queueEmailForProcessing(email);
    }

    return res.json({
      success: true,
      fetched: emails.length,
      message: `${emails.length} emails queued for processing`
    });
  } catch (error: any) {
    console.error('Email fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/emails
 *
 * Get list of incoming emails with optional filtering
 * Query params:
 *   - status: PENDING | PROCESSING | PROCESSED | FAILED
 *   - limit: number of emails to return (default: 50, max: 200)
 *   - offset: pagination offset (default: 0)
 */
router.get('/emails', requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 50, 200);
    const offsetNum = parseInt(offset as string) || 0;

    const emails = await emailService.getIncomingEmails({
      status: status as string | undefined,
      limit: limitNum,
      offset: offsetNum
    });

    return res.json({
      success: true,
      count: emails.length,
      limit: limitNum,
      offset: offsetNum,
      emails
    });
  } catch (error: any) {
    console.error('Get emails error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/emails/parse
 *
 * Parse a single email (for testing/manual processing)
 * Accepts raw email data and returns extracted booking info
 */
router.post('/parse', requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const { from, subject, body, date } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        error: 'Subject and body are required'
      });
    }

    const email: ParsedEmail = {
      id: `manual-${Date.now()}`,
      from: from || 'manual@test.com',
      subject,
      body,
      date: date ? new Date(date) : new Date(),
      attachments: []
    };

    // Process without auto-creating booking
    const result = await emailService.processEmail(email, false);

    return res.json(result);
  } catch (error: any) {
    console.error('Email parse error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/emails/process
 *
 * Process a single email and optionally auto-create booking
 */
router.post('/process', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { from, subject, body, date, autoCreate = true, minConfidence = 80 } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        error: 'Subject and body are required'
      });
    }

    const email: ParsedEmail = {
      id: `manual-${Date.now()}`,
      from: from || 'manual@test.com',
      subject,
      body,
      date: date ? new Date(date) : new Date(),
      attachments: []
    };

    const result = await emailService.processEmail(email, autoCreate, minConfidence);

    return res.json(result);
  } catch (error: any) {
    console.error('Email process error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/emails/queue
 *
 * Get emails in processing queue
 */
router.get('/queue', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const pending = await emailService.getPendingEmails();

    return res.json({
      pending: pending.length,
      emails: pending
    });
  } catch (error: any) {
    console.error('Email queue error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/email/forward-setup
 *
 * Setup forwarding address for automatic email processing
 * Generates unique forward address and returns configuration instructions
 * @access ADMIN, SUPER_ADMIN
 */
router.post('/forward-setup', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    // Generate unique forward address
    const forwardAddress = `containers@${process.env.DOMAIN || 'promo-efect.app'}`;
    const forwardToken = Buffer.from(`${Date.now()}-${Math.random().toString(36).substring(7)}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    const fullForwardAddress = `${forwardToken}@${process.env.DOMAIN || 'promo-efect.app'}`;

    // Save forward configuration to settings
    const prisma = (await import('../../lib/prisma')).default;
    
    // Check if forward address already exists
    const existing = await (prisma as any).setting.findUnique({
      where: {
        category_key: {
          category: 'EMAIL',
          key: 'FORWARD_ADDRESS',
        },
      },
    });

    if (existing) {
      // Update existing
      await (prisma as any).setting.update({
        where: {
          category_key: {
            category: 'EMAIL',
            key: 'FORWARD_ADDRESS',
          },
        },
        data: {
          value: JSON.stringify({
            address: fullForwardAddress,
            token: forwardToken,
            createdAt: new Date().toISOString(),
          }),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new
      await (prisma as any).setting.create({
        data: {
          category: 'EMAIL',
          key: 'FORWARD_ADDRESS',
          value: JSON.stringify({
            address: fullForwardAddress,
            token: forwardToken,
            createdAt: new Date().toISOString(),
          }),
          type: 'JSON',
          description: 'Email forwarding address for automatic container processing',
        },
      });
    }

    // Return setup instructions
    return res.json({
      success: true,
      data: {
        forwardAddress: fullForwardAddress,
        instructions: {
          gmail: [
            '1. Deschideți Gmail Settings (Setări)',
            '2. Mergeți la "Forwarding and POP/IMAP"',
            `3. Adăugați adresa de forward: ${fullForwardAddress}`,
            '4. Selectați "Forward a copy of incoming mail"',
            '5. Salvați modificările',
          ],
          outlook: [
            '1. Deschideți Outlook Settings',
            '2. Mergeți la "Mail" > "Forwarding"',
            `3. Adăugați adresa: ${fullForwardAddress}`,
            '4. Activați forwarding',
            '5. Salvați modificările',
          ],
          generic: [
            `Configurați email forwarding către: ${fullForwardAddress}`,
            'Toate emailurile primite vor fi procesate automat',
            'Sistemul va extrage automat datele despre containere',
          ],
        },
        webhookUrl: `${process.env.BASE_URL || 'http://localhost:3001'}/api/v1/tracking/webhook`,
        autoProcessing: {
          enabled: true,
          minConfidence: 80,
          autoCreateContainers: true,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Forward setup error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to setup email forwarding',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/admin/emails/process-queue
 *
 * Process all pending emails in queue
 */
router.post('/process-queue', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { autoCreate = true, minConfidence = 80 } = req.body;

    const pending = await emailService.getPendingEmails();
    const results = [];

    for (const email of pending) {
      const result = await emailService.processEmail(email, autoCreate, minConfidence);
      results.push(result);

      // Mark as processed
      await emailService.markEmailProcessed(
        email.id,
        result.status === 'FAILED' ? 'FAILED' : 'PROCESSED',
        result.error
      );
    }

    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'SUCCESS').length,
      needsReview: results.filter(r => r.status === 'NEEDS_REVIEW').length,
      failed: results.filter(r => r.status === 'FAILED').length,
      bookingsCreated: results.filter(r => r.bookingId).length
    };

    return res.json({
      summary,
      results
    });
  } catch (error: any) {
    console.error('Process queue error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/emails/stats
 *
 * Get email processing statistics
 */
router.get('/stats', requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const stats = await emailService.getProcessingStats();

    return res.json(stats);
  } catch (error: any) {
    console.error('Email stats error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/emails/parse-with-ai
 *
 * Parse email content using Gemini AI
 * Returns extracted shipping/logistics data
 */
router.post('/parse-with-ai', requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR']), async (req: Request, res: Response) => {
  try {
    const { emailContent } = req.body;

    if (!emailContent || typeof emailContent !== 'string') {
      return res.status(400).json({
        error: 'Email content is required',
        message: 'Please provide emailContent in the request body'
      });
    }

    // Dynamic import to avoid issues if package not installed
    let geminiService;
    try {
      geminiService = await import('../../services/gemini.service');
    } catch (importError) {
      return res.status(503).json({
        error: 'AI service not available',
        message: 'Gemini AI service is not configured. Please install @google/generative-ai package.'
      });
    }

    // Check if Gemini is configured
    if (!geminiService.isGeminiConfigured()) {
      return res.status(503).json({
        error: 'AI service not configured',
        message: 'GEMINI_API_KEY is not set in backend environment variables.'
      });
    }

    // Parse email with Gemini
    const result = await geminiService.parseEmailWithGemini(emailContent);

    if (result.error) {
      return res.status(422).json({
        success: false,
        error: result.error,
        confidence: result.confidence || 0
      });
    }

    return res.json({
      success: true,
      data: result,
      confidence: result.confidence || 75
    });
  } catch (error: any) {
    console.error('AI parse error:', error);
    return res.status(500).json({ 
      error: 'AI parsing failed',
      message: error.message 
    });
  }
});

/**
 * GET /api/emails/ai-status
 *
 * Check if Gemini AI parsing is available
 */
router.get('/ai-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    let geminiService;
    try {
      geminiService = await import('../../services/gemini.service');
    } catch (importError) {
      return res.json({
        available: false,
        reason: 'Gemini AI package not installed'
      });
    }

    return res.json({
      available: geminiService.isGeminiConfigured(),
      reason: geminiService.isGeminiConfigured() 
        ? 'Gemini AI is ready' 
        : 'GEMINI_API_KEY not configured in backend'
    });
  } catch (error: any) {
    return res.json({
      available: false,
      reason: error.message
    });
  }
});

export default router;
