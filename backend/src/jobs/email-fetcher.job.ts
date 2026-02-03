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

const emailService = new EmailService();

let isRunning = false;

/**
 * Start the email fetcher job
 */
export function startEmailFetcherJob() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    if (isRunning) {
      console.log('[Email Fetcher] Previous job still running, skipping...');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[Email Fetcher] Starting scheduled email fetch...');

      // Check if Gmail is connected
      const status = await gmailIntegration.getStatus();
      if (!status.connected) {
        console.log('[Email Fetcher] Gmail not connected, skipping');
        isRunning = false;
        return;
      }

      // Fetch unread emails (max 20 at a time)
      const emails = await gmailIntegration.fetchUnreadEmails(20);
      console.log(`[Email Fetcher] Fetched ${emails.length} unread emails`);

      if (emails.length === 0) {
        console.log('[Email Fetcher] No new emails to process');
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
          console.error(`[Email Fetcher] Failed to queue email ${email.id}:`, error);
        }
      }

      console.log(`[Email Fetcher] Queued ${queued} emails for processing`);

      // Process pending emails from queue
      const pending = await emailService.getPendingEmails();
      console.log(`[Email Fetcher] Processing ${pending.length} pending emails`);

      let processed = 0;
      let created = 0;
      let failed = 0;

      for (const email of pending) {
        try {
          const result = await emailService.processEmail(email, true, 80);

          await emailService.markEmailProcessed(
            email.id,
            result.status === 'FAILED' ? 'FAILED' : 'PROCESSED',
            result.error
          );

          if (result.status === 'SUCCESS' && result.bookingId) {
            created++;
            console.log(`[Email Fetcher] Created booking: ${result.bookingId} from email ${email.id}`);
          } else if (result.status === 'FAILED') {
            failed++;
            console.error(`[Email Fetcher] Failed to process email ${email.id}:`, result.error);
          }

          processed++;
        } catch (error) {
          failed++;
          console.error(`[Email Fetcher] Error processing email ${email.id}:`, error);
          
          await emailService.markEmailProcessed(
            email.id,
            'FAILED',
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[Email Fetcher] Completed in ${duration}ms: ${processed} processed, ${created} bookings created, ${failed} failed`);

    } catch (error) {
      console.error('[Email Fetcher] Fatal error:', error);
    } finally {
      isRunning = false;
    }
  });

  console.log('✅ Email Fetcher job started (runs every 15 minutes)');
}

/**
 * Stop the email fetcher job
 */
export function stopEmailFetcherJob() {
  // Cron jobs are automatically stopped when process exits
  console.log('⏹️ Email Fetcher job stopped');
}

