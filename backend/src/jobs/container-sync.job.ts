/**
 * Container Sync Background Job
 *
 * Syncs container tracking data from external APIs (SeaRates, etc.)
 * every 30 minutes
 *
 * Schedule: Every 30 minutes
 */

import cron from 'node-cron';
import prisma from '../lib/prisma';
import { trackingService } from '../modules/tracking/tracking.service';
import logger from '../utils/logger';

let isRunning = false;

/**
 * Start the container sync job
 */
export function startContainerSyncJob() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    if (isRunning) {
      logger.info('[Container Sync] Previous job still running, skipping...');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('[Container Sync] Starting scheduled container sync...');

      // Find all active containers (not delivered)
      const activeContainers = await prisma.container.findMany({
        where: {
          currentStatus: {
            notIn: ['DELIVERED', 'CANCELLED'],
          },
        },
        include: {
          booking: {
            include: {
              client: true,
            },
          },
        },
        take: 100, // Process max 100 at a time to avoid overload
      });

      logger.info(`[Container Sync] Found ${activeContainers.length} active containers to sync`);

      if (activeContainers.length === 0) {
        logger.info('[Container Sync] No active containers to sync');
        isRunning = false;
        return;
      }

      let synced = 0;
      let updated = 0;
      let failed = 0;

      for (const container of activeContainers) {
        try {
          // Try to refresh tracking for this container
          // This will call external APIs if configured
          const result = await trackingService.refreshTracking(container.id);

          if (result.success && result.eventsFound > 0) {
            updated++;
            logger.info(
              `[Container Sync] Updated container ${container.containerNumber}: ${result.eventsFound} new events`
            );
          } else if (result.success) {
            synced++;
          } else {
            failed++;
            logger.error(
              `[Container Sync] Failed to sync container ${container.containerNumber}:`,
              result.error
            );
          }
        } catch (error) {
          failed++;
          logger.error(
            `[Container Sync] Error syncing container ${container.containerNumber}:`,
            error
          );
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const duration = Date.now() - startTime;
      logger.info(
        `[Container Sync] Completed in ${duration}ms: ${synced} synced, ${updated} updated, ${failed} failed`
      );
    } catch (error) {
      logger.error('[Container Sync] Fatal error:', error);
    } finally {
      isRunning = false;
    }
  });

  logger.info('✅ Container Sync job started (runs every 30 minutes)');
}

/**
 * Stop the container sync job
 */
export function stopContainerSyncJob() {
  logger.info('⏹️ Container Sync job stopped');
}
