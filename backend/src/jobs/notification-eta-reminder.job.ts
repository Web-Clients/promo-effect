/**
 * ETA Reminder Background Job
 *
 * Runs daily at 09:00 to notify admins and clients about upcoming container arrivals.
 * Triggers at 5, 3 and 1 days before arrivalDateConstanta.
 * Skips if the same type of notification was already sent today for the same booking.
 *
 * Schedule: Daily at 09:00 AM (0 9 * * *)
 */

import cron from 'node-cron';
import prisma from '../lib/prisma';
import notificationService from '../services/notification.service';
import logger from '../utils/logger';

let isRunning = false;

/**
 * Core logic — exported so it can be triggered manually via API.
 */
export async function runEtaReminderJob(): Promise<{
  processed: number;
  notified: number;
  skipped: number;
  failed: number;
}> {
  const startTime = Date.now();
  let processed = 0;
  let notified = 0;
  let skipped = 0;
  let failed = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Look for bookings arriving in exactly 1, 3 or 5 days
  const thresholds = [1, 3, 5];

  for (const daysAhead of thresholds) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const targetDateEnd = new Date(targetDate);
    targetDateEnd.setHours(23, 59, 59, 999);

    // Find bookings with arrivalDateConstanta in the target window
    const bookings = await prisma.booking.findMany({
      where: {
        arrivalDateConstanta: {
          gte: targetDate,
          lte: targetDateEnd,
        },
        status: {
          notIn: ['DELIVERED', 'CANCELLED'],
        },
        archived: false,
      },
      include: {
        client: true,
      },
    });

    logger.info(`[ETA Reminder] Bookings arriving in ${daysAhead} day(s): ${bookings.length}`);

    for (const booking of bookings) {
      processed++;

      // Build a dedup key: one notification per booking per days-threshold per day
      const todayStr = today.toISOString().split('T')[0];
      const notifType = `ETA_${daysAhead}_DAYS`;

      // Check if already notified today for this booking + type
      const existingToday = await prisma.notification.count({
        where: {
          bookingId: booking.id,
          type: notifType,
          createdAt: {
            gte: today,
          },
        },
      });

      if (existingToday > 0) {
        logger.info(
          `[ETA Reminder] Already notified today for booking ${booking.id} (${notifType}), skipping`
        );
        skipped++;
        continue;
      }

      const blLabel = booking.blNumber || booking.id.slice(0, 8).toUpperCase();
      const portLabel = booking.portDestination || 'Constanța';
      const arrivalStr = booking.arrivalDateConstanta
        ? booking.arrivalDateConstanta.toLocaleDateString('ro-RO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : 'necunoscut';

      const title = `Container [${blLabel}] sosește în ${daysAhead} zi${daysAhead !== 1 ? 'le' : ''} la ${portLabel}`;
      const message = `Containerul cu B/L ${blLabel} este așteptat la ${portLabel} pe ${arrivalStr} (în ${daysAhead} zi${daysAhead !== 1 ? 'le' : ''}). Verificați documentele și pregătiți vămuirea.`;

      // Notify all admin/operator users + client user if linked
      const adminUsers = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'] } },
      });

      // Also notify client's linked user if exists
      const clientUser = booking.client?.userId
        ? await prisma.user.findUnique({ where: { id: booking.client.userId } })
        : null;

      const usersToNotify = [...adminUsers];
      if (clientUser && !usersToNotify.find((u) => u.id === clientUser.id)) {
        usersToNotify.push(clientUser);
      }

      for (const user of usersToNotify) {
        try {
          await notificationService.sendNotification({
            userId: user.id,
            bookingId: booking.id,
            type: notifType,
            title,
            message,
            channels: {
              email: false, // In-app only for ETA reminders — reduce noise
              sms: false,
              whatsapp: false,
              push: true,
            },
          });
          notified++;
        } catch (error) {
          failed++;
          logger.error(
            `[ETA Reminder] Failed to notify user ${user.id} for booking ${booking.id}:`,
            error
          );
        }
      }

      logger.info(
        `[ETA Reminder] Notified ${usersToNotify.length} users for booking ${booking.id} (${notifType})`
      );
    }
  }

  // Also handle bookings arriving TODAY
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const arrivingToday = await prisma.booking.findMany({
    where: {
      arrivalDateConstanta: {
        gte: today,
        lte: todayEnd,
      },
      status: {
        notIn: ['DELIVERED', 'CANCELLED'],
      },
      archived: false,
    },
    include: {
      client: true,
    },
  });

  for (const booking of arrivingToday) {
    processed++;
    const notifType = 'ETA_TODAY';

    const existingToday = await prisma.notification.count({
      where: {
        bookingId: booking.id,
        type: notifType,
        createdAt: { gte: today },
      },
    });

    if (existingToday > 0) {
      skipped++;
      continue;
    }

    const blLabel = booking.blNumber || booking.id.slice(0, 8).toUpperCase();
    const portLabel = booking.portDestination || 'Constanța';

    const adminUsers = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'] } },
    });

    const clientUser = booking.client?.userId
      ? await prisma.user.findUnique({ where: { id: booking.client.userId } })
      : null;

    const usersToNotify = [...adminUsers];
    if (clientUser && !usersToNotify.find((u) => u.id === clientUser.id)) {
      usersToNotify.push(clientUser);
    }

    for (const user of usersToNotify) {
      try {
        await notificationService.sendNotification({
          userId: user.id,
          bookingId: booking.id,
          type: notifType,
          title: `Container [${blLabel}] sosește AZI la ${portLabel}`,
          message: `Containerul cu B/L ${blLabel} este așteptat să sosească AZI la ${portLabel}. Acționați imediat pentru vămuire.`,
          channels: { email: false, sms: false, whatsapp: false, push: true },
        });
        notified++;
      } catch (error) {
        failed++;
        logger.error(
          `[ETA Reminder] Failed to notify user ${user.id} for booking ${booking.id} (TODAY):`,
          error
        );
      }
    }
  }

  // Handle overdue arrivals (past ETA but not delivered)
  const pastDueBookings = await prisma.booking.findMany({
    where: {
      arrivalDateConstanta: {
        lt: today,
      },
      status: {
        notIn: ['DELIVERED', 'CANCELLED', 'ARRIVED'],
      },
      archived: false,
    },
    include: { client: true },
  });

  for (const booking of pastDueBookings) {
    processed++;
    const notifType = 'BOOKING_DELAYED';

    const existingToday = await prisma.notification.count({
      where: {
        bookingId: booking.id,
        type: notifType,
        createdAt: { gte: today },
      },
    });

    if (existingToday > 0) {
      skipped++;
      continue;
    }

    const daysDelayed = Math.floor(
      (today.getTime() - new Date(booking.arrivalDateConstanta!).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Only notify if delayed more than 1 day to avoid false positives on same-day
    if (daysDelayed < 2) {
      skipped++;
      continue;
    }

    const blLabel = booking.blNumber || booking.id.slice(0, 8).toUpperCase();

    const adminUsers = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'] } },
    });

    for (const user of adminUsers) {
      try {
        await notificationService.sendNotification({
          userId: user.id,
          bookingId: booking.id,
          type: notifType,
          title: `Container [${blLabel}] — Întârziat cu ${daysDelayed} zile`,
          message: `Containerul cu B/L ${blLabel} a depășit data ETA cu ${daysDelayed} zile și nu a fost marcat ca livrat. Verificați statusul.`,
          channels: { email: false, sms: false, whatsapp: false, push: true },
        });
        notified++;
      } catch (error) {
        failed++;
        logger.error(`[ETA Reminder] Failed to notify for delayed booking ${booking.id}:`, error);
      }
    }
  }

  const duration = Date.now() - startTime;
  logger.info(
    `[ETA Reminder] Done in ${duration}ms: processed=${processed} notified=${notified} skipped=${skipped} failed=${failed}`
  );

  return { processed, notified, skipped, failed };
}

/**
 * Start the ETA reminder cron job
 */
export function startEtaReminderJob() {
  // Run daily at 09:00
  cron.schedule('0 9 * * *', async () => {
    if (isRunning) {
      logger.info('[ETA Reminder] Previous job still running, skipping...');
      return;
    }

    isRunning = true;
    try {
      logger.info('[ETA Reminder] Starting scheduled ETA reminder check...');
      await runEtaReminderJob();
    } catch (error) {
      logger.error('[ETA Reminder] Fatal error:', error);
    } finally {
      isRunning = false;
    }
  });

  logger.info('✅ ETA Reminder job started (runs daily at 09:00 AM)');
}

/**
 * Stop the ETA reminder cron job
 */
export function stopEtaReminderJob() {
  logger.info('⏹️ ETA Reminder job stopped');
}
