/**
 * Email Controller
 *
 * API endpoints for email processing:
 * - Gmail IMAP status & fetch
 * - Manual email parsing
 * - Email queue management
 * - Processing statistics
 */

import { Router, Request, Response } from 'express';
import { emailService, ParsedEmail } from './email.service';
import { gmailIntegration } from '../../integrations/gmail.integration';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/admin/gmail/status
 *
 * Get Gmail IMAP connection status
 */
router.get('/gmail/status', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const status = await gmailIntegration.getStatus();

    // Add last fetch result from AdminSettings
    const prisma = (await import('../../lib/prisma')).default;
    const settings = await prisma.adminSettings.findUnique({ where: { id: 1 } });

    if (settings?.lastEmailFetchResult) {
      try {
        (status as any).lastFetchResult = JSON.parse(settings.lastEmailFetchResult);
      } catch (_) {
        // Ignore JSON parse errors
      }
    }

    return res.json(status);
  } catch (error: any) {
    console.error('Gmail status error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/emails/fetch
 *
 * Manually trigger email fetching from Gmail via IMAP
 */
router.post('/emails/fetch', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { maxResults = 10 } = req.body;

    if (!gmailIntegration.isConfigured()) {
      return res.status(400).json({
        error: 'Gmail не настроен',
        message: 'Добавьте GMAIL_EMAIL и GMAIL_APP_PASSWORD в .env на сервере',
      });
    }

    // Fetch emails via IMAP
    const emails = await gmailIntegration.fetchUnreadEmails(maxResults);

    // Queue emails for processing
    let queued = 0;
    for (const email of emails) {
      try {
        await emailService.queueEmailForProcessing(email);
        queued++;
      } catch (queueError: any) {
        console.error(`[Email Fetch] Failed to queue: ${queueError.message}`);
      }
    }

    return res.json({
      success: true,
      fetched: emails.length,
      queued,
      message: `${emails.length} emails получено, ${queued} добавлено в очередь`,
    });
  } catch (error: any) {
    console.error('Email fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/emails/fetch-and-process
 *
 * Fetch emails from Gmail and immediately process them
 */
router.post('/emails/fetch-and-process', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { maxResults = 10, autoCreate = true, minConfidence = 80 } = req.body;

    if (!gmailIntegration.isConfigured()) {
      return res.status(400).json({
        error: 'Gmail не настроен',
        message: 'Добавьте GMAIL_EMAIL и GMAIL_APP_PASSWORD в .env на сервере',
      });
    }

    // Fetch emails via IMAP
    const emails = await gmailIntegration.fetchUnreadEmails(maxResults);

    if (emails.length === 0) {
      return res.json({
        success: true,
        summary: { fetched: 0, success: 0, needsReview: 0, failed: 0, bookingsCreated: 0 },
        results: [],
        message: 'Нет новых писем',
      });
    }

    // Queue and process
    const results = [];
    for (const email of emails) {
      try {
        await emailService.queueEmailForProcessing(email);
        const result = await emailService.processEmail(email, autoCreate, minConfidence);
        results.push({ ...result, emailId: email.id, subject: email.subject });

        // Mark as read in Gmail
        await gmailIntegration.markAsProcessed(email.id);
      } catch (processError: any) {
        results.push({
          emailId: email.id,
          subject: email.subject,
          status: 'FAILED',
          error: processError.message,
        });
      }
    }

    const summary = {
      fetched: emails.length,
      success: results.filter(r => r.status === 'SUCCESS').length,
      needsReview: results.filter(r => r.status === 'NEEDS_REVIEW').length,
      failed: results.filter(r => r.status === 'FAILED').length,
      bookingsCreated: results.filter(r => (r as any).bookingId).length,
    };

    return res.json({
      success: true,
      summary,
      results,
    });
  } catch (error: any) {
    console.error('Fetch and process error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/emails
 *
 * Get list of incoming emails with optional filtering
 */
router.get('/emails', requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 50, 200);
    const offsetNum = parseInt(offset as string) || 0;

    const emails = await emailService.getIncomingEmails({
      status: status as string | undefined,
      limit: limitNum,
      offset: offsetNum,
    });

    return res.json({
      success: true,
      count: emails.length,
      limit: limitNum,
      offset: offsetNum,
      emails,
    });
  } catch (error: any) {
    console.error('Get emails error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/emails/parse
 *
 * Parse a single email (manual input)
 */
router.post('/emails/parse', requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const { from, subject, body, date } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }

    const email: ParsedEmail = {
      id: `manual-${Date.now()}`,
      from: from || 'manual@test.com',
      subject,
      body,
      date: date ? new Date(date) : new Date(),
      attachments: [],
    };

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
router.post('/emails/process', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { from, subject, body, date, autoCreate = true, minConfidence = 80 } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }

    const email: ParsedEmail = {
      id: `manual-${Date.now()}`,
      from: from || 'manual@test.com',
      subject,
      body,
      date: date ? new Date(date) : new Date(),
      attachments: [],
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
router.get('/emails/queue', requireRole(['SUPER_ADMIN', 'ADMIN']), async (_req: Request, res: Response) => {
  try {
    const pending = await emailService.getPendingEmails();
    return res.json({
      pending: pending.length,
      emails: pending,
    });
  } catch (error: any) {
    console.error('Email queue error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/emails/process-queue
 *
 * Process all pending emails in queue
 */
router.post('/emails/process-queue', requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { autoCreate = true, minConfidence = 80 } = req.body;
    const pending = await emailService.getPendingEmails();
    const results = [];

    for (const email of pending) {
      const result = await emailService.processEmail(email, autoCreate, minConfidence);
      results.push(result);

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
      bookingsCreated: results.filter(r => r.bookingId).length,
    };

    return res.json({ summary, results });
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
router.get('/emails/stats', requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (_req: Request, res: Response) => {
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
 */
router.post('/emails/parse-with-ai', requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR']), async (req: Request, res: Response) => {
  try {
    const { emailContent } = req.body;

    if (!emailContent || typeof emailContent !== 'string') {
      return res.status(400).json({ error: 'Email content is required' });
    }

    let geminiService;
    try {
      geminiService = await import('../../services/gemini.service');
    } catch (importError) {
      return res.status(503).json({
        error: 'AI service not available',
        message: 'Gemini AI service is not configured.',
      });
    }

    if (!geminiService.isGeminiConfigured()) {
      return res.status(503).json({
        error: 'AI service not configured',
        message: 'GEMINI_API_KEY is not set in backend environment variables.',
      });
    }

    const result = await geminiService.parseEmailWithGemini(emailContent);

    if (result.error) {
      return res.status(422).json({
        success: false,
        error: result.error,
        confidence: result.confidence || 0,
      });
    }

    return res.json({
      success: true,
      data: result,
      confidence: result.confidence || 75,
    });
  } catch (error: any) {
    console.error('AI parse error:', error);
    return res.status(500).json({ error: 'AI parsing failed', message: error.message });
  }
});

/**
 * GET /api/admin/emails/ai-status
 *
 * Check if Gemini AI parsing is available
 */
router.get('/emails/ai-status', authMiddleware, async (_req: Request, res: Response) => {
  try {
    let geminiService;
    try {
      geminiService = await import('../../services/gemini.service');
    } catch (importError) {
      return res.json({ available: false, reason: 'Gemini AI package not installed' });
    }

    return res.json({
      available: geminiService.isGeminiConfigured(),
      reason: geminiService.isGeminiConfigured()
        ? 'Gemini AI is ready'
        : 'GEMINI_API_KEY not configured in backend',
    });
  } catch (error: any) {
    return res.json({ available: false, reason: error.message });
  }
});

/**
 * GET /api/admin/emails/recent-containers
 *
 * Returns containers recently registered via email parsing (from audit log)
 */
router.get('/emails/recent-containers', requireRole(['SUPER_ADMIN', 'ADMIN']), async (_req: Request, res: Response) => {
  try {
    const prisma = (await import('../../lib/prisma')).default;

    // Find audit logs for email auto-creates
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: 'CREATE',
        changes: { contains: 'EMAIL_AUTO_CREATE' },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const items = auditLogs.map((log: any) => {
      let changes: any = {};
      try { changes = JSON.parse(log.changes); } catch (_) {}
      return {
        id: log.id,
        entityId: log.entityId,
        containerNumber: changes.containerNumber,
        blNumber: changes.blNumber,
        emailFrom: changes.emailFrom,
        emailSubject: changes.emailSubject,
        confidence: changes.confidence,
        createdAt: log.createdAt,
      };
    });

    return res.json(items);
  } catch (error: any) {
    console.error('Recent containers error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;