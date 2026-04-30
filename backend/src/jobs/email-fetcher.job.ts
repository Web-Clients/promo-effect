/**
 * Email Fetcher Background Job
 *
 * Fetches unread emails from Gmail every 15 minutes
 * Processes them with AI and creates bookings automatically
 *
 * Schedule: Every 15 minutes
 */

import cron from 'node-cron';
import { gmailIntegration } from '../integrations/gmail.integration';
import { EmailService } from '../modules/emails/email.service';
import logger from '../../utils/logger';

const emailService = new EmailService();

let isRunning = false;

/**
 * Start the email fetcher job
 */
export function startEmailFetcherJob() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    if (isRunning) {
      logger.info('[Email Fetcher] Previous job still running, skipping...');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('[Email Fetcher] Starting scheduled email fetch...');

      // Check if Gmail is configured
      if (!gmailIntegration.isConfigured()) {
        logger.info('[Email Fetcher] Gmail not configured, skipping');
        isRunning = false;
        return;
      }

      // Fetch unread emails (max 50 at a time)
      const emails = await gmailIntegration.fetchUnreadEmails(50);
      logger.info(`[Email Fetcher] Fetched ${emails.length} unread emails`);

      if (emails.length === 0) {
        logger.info('[Email Fetcher] No new emails to process');
        isRunning = false;
        return;
      }

      // Queue emails for processing
      let queued = 0;
      for (const email of emails) {
        try {
          await emailService.queueEmailForProcessing(email);
          queued++;
        } catch (error) {
          logger.error(`[Email Fetcher] Failed to queue email ${email.id}:`, error);
        }
      }

      logger.info(`[Email Fetcher] Queued ${queued} emails for processing`);

      // Process pending emails from queue
      const pending = await emailService.getPendingEmails();
      logger.info(`[Email Fetcher] Processing ${pending.length} pending emails`);

      let processed = 0;
      let created = 0;
      let failed = 0;

      for (const email of pending) {
        try {
          // Small delay between emails to avoid Gemini API rate limits (15 RPM on free tier)
          if (processed > 0) await new Promise((r) => setTimeout(r, 4000));

          const result = await emailService.processEmail(email, true, 80);

          await emailService.markEmailProcessed(
            email.id,
            result.status === 'FAILED' ? 'FAILED' : 'PROCESSED',
            result.error
          );

          // NOTE: Intentionally NOT marking emails as read in Gmail
          // Client needs to see unread emails to respond to them manually

          if (result.status === 'SUCCESS' && result.bookingId) {
            created++;
            logger.info(
              `[Email Fetcher] Created booking: ${result.bookingId} from email ${email.id}`
            );
          } else if (result.status === 'FAILED') {
            failed++;
            logger.error(`[Email Fetcher] Failed to process email ${email.id}:`, result.error);
          }

          processed++;
        } catch (error) {
          failed++;
          logger.error(`[Email Fetcher] Error processing email ${email.id}:`, error);

          await emailService.markEmailProcessed(
            email.id,
            'FAILED',
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `[Email Fetcher] Completed in ${duration}ms: ${processed} processed, ${created} bookings created, ${failed} failed`
      );

      // Save fetch log to database (as JSON in AdminSettings)
      const fetchResult = {
        emailsFetched: emails.length,
        emailsProcessed: processed,
        bookingsCreated: created,
        processingFailed: failed,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      };

      try {
        const prisma = (await import('../lib/prisma')).default;
        await prisma.adminSettings.upsert({
          where: { id: 1 },
          update: {
            lastEmailFetchAt: new Date(),
            lastEmailFetchResult: JSON.stringify(fetchResult),
          },
          create: {
            id: 1,
            lastEmailFetchAt: new Date(),
            lastEmailFetchResult: JSON.stringify(fetchResult),
          },
        });
        logger.info('[Email Fetcher] Log saved to database');
      } catch (logError: any) {
        logger.error('[Email Fetcher] Failed to save fetch log:', logError);
      }
    } catch (error) {
      logger.error('[Email Fetcher] Fatal error:', error);
    } finally {
      isRunning = false;
    }
  });

  logger.info('✅ Email Fetcher job started (runs every 15 minutes)');
}

/**
 * Stop the email fetcher job
 */
export function stopEmailFetcherJob() {
  // Cron jobs are automatically stopped when process exits
  logger.info('⏹️ Email Fetcher job stopped');
}
