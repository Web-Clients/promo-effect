/**
 * Auth Cleanup Background Job
 *
 * B7: Cleans up expired/used password reset tokens older than 24 hours.
 * Also cleans up revoked sessions older than 7 days (token rotation hygiene).
 *
 * Schedule: Daily at 03:00 AM (0 3 * * *)
 */

import cron from 'node-cron';
import prisma from '../lib/prisma';
import logger from '../utils/logger';

let isRunning = false;

export function startAuthCleanupJob() {
  // Run daily at 03:00 AM
  cron.schedule('0 3 * * *', async () => {
    if (isRunning) {
      logger.warn('[AuthCleanup] Previous run still in progress, skipping.');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('[AuthCleanup] Starting auth token cleanup...');

      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // B7: Delete password reset tokens older than 24 hours (used OR expired)
      const deletedResetTokens = await prisma.passwordResetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: cutoff24h } }, { usedAt: { lt: cutoff24h } }],
        },
      });

      // B1: Delete revoked sessions older than 7 days (keeps token family history for a week)
      const deletedSessions = await prisma.session.deleteMany({
        where: {
          revoked: true,
          revokedAt: { lt: cutoff7d },
        },
      });

      const elapsed = Date.now() - startTime;
      logger.info('[AuthCleanup] Completed', {
        deletedPasswordResetTokens: deletedResetTokens.count,
        deletedRevokedSessions: deletedSessions.count,
        elapsedMs: elapsed,
      });
    } catch (error) {
      logger.error('[AuthCleanup] Job failed', { error });
    } finally {
      isRunning = false;
    }
  });

  logger.info('[AuthCleanup] Job scheduled: daily at 03:00 AM');
}

export function stopAuthCleanupJob() {
  // node-cron tasks are stopped by destroying the task reference
  // For simplicity, the job stops naturally when the process exits
  logger.info('[AuthCleanup] Job stop requested');
}
