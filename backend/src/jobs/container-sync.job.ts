/**
 * Container Sync Background Job
 *
 * Two responsibilities:
 *  1. Refresh the AISStream MMSI subscription set so we receive
 *     positions for every active container's assigned vessel.
 *  2. Persist the latest cached AIS position back to each container
 *     row (also done continuously by aisstreamIntegration's flush
 *     loop — this is a belt-and-braces sweep).
 *
 * Schedule: every 10 minutes (cheap, no outbound HTTP).
 */

import cron from 'node-cron';
import prisma from '../lib/prisma';
import { aisstreamIntegration } from '../integrations/aisstream.integration';
import { trackingService } from '../modules/tracking/tracking.service';
import logger from '../utils/logger';

let isRunning = false;

export function startContainerSyncJob() {
  cron.schedule('*/10 * * * *', async () => {
    if (isRunning) {
      logger.info('[Container Sync] Previous run still in progress, skipping');
      return;
    }
    isRunning = true;
    const startTime = Date.now();

    try {
      await aisstreamIntegration.refreshSubscribedMmsis();

      const activeContainers = await prisma.container.findMany({
        where: {
          currentStatus: { notIn: ['DELIVERED', 'CANCELLED'] },
          vesselMmsi: { not: null },
        },
        select: { id: true, containerNumber: true },
      });

      let synced = 0;
      let updated = 0;
      let failed = 0;

      for (const container of activeContainers) {
        try {
          const result = await trackingService.refreshTracking(container.id);
          if (result.success && result.eventsFound > 0) updated++;
          else if (result.success) synced++;
          else failed++;
        } catch (err) {
          failed++;
          logger.error(`[Container Sync] Error on ${container.containerNumber}:`, err);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `[Container Sync] ${activeContainers.length} active / ${synced} synced / ${updated} new events / ${failed} failed in ${duration}ms`
      );
    } catch (err) {
      logger.error('[Container Sync] Fatal error:', err);
    } finally {
      isRunning = false;
    }
  });

  logger.info('Container Sync job started (every 10 minutes)');
}

export function stopContainerSyncJob() {
  logger.info('Container Sync job stopped');
}
