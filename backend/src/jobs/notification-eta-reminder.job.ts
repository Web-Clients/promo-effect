/**
 * ETA Reminder Background Job (rev. mai 2026)
 *
 * Runs daily at 08:00 UTC. For every active booking with `arrivalDateConstanta`
 * in 5, 3 or 1 days, the job:
 *
 *   1. Creates an in-app notification (severity WARNING → red flag in dashboard)
 *      for admins/operators AND the linked Moldovan client user.
 *   2. Sends an automated email to the Moldovan client:
 *      "Containerul ajunge la Constanța peste X zile".
 *   3. When the ETA changes vs. the last notified value, also emits a
 *      `ETA_CHANGED` notification + email: "ETA modificată: era X, devine Y".
 *
 * Daily-dedup keys use `(bookingId, type, day)` so the job is safe to re-run.
 *
 * Schedule: `0 8 * * *` (cron in UTC — server should be UTC).
 */

import cron from 'node-cron';
import prisma from '../lib/prisma';
import notificationService, { NotificationAttachment } from '../services/notification.service';
import { storageService } from '../services/storage.service';
import logger from '../utils/logger';

let isRunning = false;

const ETA_THRESHOLDS = [5, 3, 1];

type EtaSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

function severityForDays(daysAhead: number): EtaSeverity {
  if (daysAhead <= 0) return 'CRITICAL';
  if (daysAhead <= 1) return 'CRITICAL';
  if (daysAhead <= 3) return 'WARNING';
  return 'WARNING';
}

function formatDateRo(d: Date): string {
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function startOfDayUtc(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function diffInDaysUtc(a: Date, b: Date): number {
  const A = startOfDayUtc(a).getTime();
  const B = startOfDayUtc(b).getTime();
  return Math.round((A - B) / (1000 * 60 * 60 * 24));
}

async function loadBeneficiaryPdfAttachment(
  beneficiaryPdfUrl: string | null | undefined,
  beneficiaryPdfName: string | null | undefined
): Promise<NotificationAttachment | null> {
  if (!beneficiaryPdfUrl) return null;
  try {
    const buf = await storageService.getFile(beneficiaryPdfUrl);
    if (!buf) return null;
    return {
      filename: beneficiaryPdfName || 'BL.pdf',
      content: buf,
      contentType: 'application/pdf',
    };
  } catch (err) {
    logger.warn('[ETA Reminder] Could not load beneficiary PDF for forwarding:', err);
    return null;
  }
}

interface BookingWithClient {
  id: string;
  blNumber: string | null;
  portDestination: string;
  arrivalDateConstanta: Date | null;
  status: string;
  archived: boolean;
  lastNotifiedEta: Date | null;
  beneficiaryPdfUrl: string | null;
  beneficiaryPdfName: string | null;
  client: {
    id: string;
    email: string;
    companyName: string;
    userId: string | null;
  } | null;
  containers: { containerNumber: string }[];
}

async function notifyEtaReminder(
  booking: BookingWithClient,
  daysAhead: number
): Promise<{ notified: number; skipped: number; failed: number }> {
  const today = startOfDayUtc(new Date());
  const notifType = `ETA_${daysAhead}_DAYS`;

  const existing = await prisma.notification.count({
    where: {
      bookingId: booking.id,
      type: notifType,
      createdAt: { gte: today },
    },
  });
  if (existing > 0) {
    logger.info(
      `[ETA Reminder] Already notified ${notifType} for booking ${booking.id} today, skip`
    );
    return { notified: 0, skipped: 1, failed: 0 };
  }

  const blLabel = booking.blNumber || booking.id.slice(0, 8).toUpperCase();
  const containerLabel = booking.containers?.[0]?.containerNumber || 'N/A';
  const portLabel = booking.portDestination || 'Constanța';
  const arrivalStr = booking.arrivalDateConstanta
    ? formatDateRo(booking.arrivalDateConstanta)
    : 'necunoscut';
  const severity = severityForDays(daysAhead);
  const dayWord = daysAhead === 1 ? 'zi' : 'zile';

  const title = `Container [${blLabel}] sosește în ${daysAhead} ${dayWord} la ${portLabel}`;
  const message =
    `Containerul cu B/L ${blLabel} (container ${containerLabel}) este așteptat la ${portLabel} ` +
    `pe ${arrivalStr} (în ${daysAhead} ${dayWord}).\n\n` +
    `Verificați documentele și pregătiți vămuirea. ` +
    `Booking: ${booking.id}`;

  // Recipients: admins/operators + linked client user
  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'] } },
  });
  const clientUser = booking.client?.userId
    ? await prisma.user.findUnique({ where: { id: booking.client.userId } })
    : null;

  const recipients = [...adminUsers];
  if (clientUser && !recipients.find((u) => u.id === clientUser.id)) {
    recipients.push(clientUser);
  }

  // Beneficiary PDF — forward as attachment for the client email (admins get
  // it through the dashboard, no need to spam them with attachments).
  const beneficiaryAttachment = await loadBeneficiaryPdfAttachment(
    booking.beneficiaryPdfUrl,
    booking.beneficiaryPdfName
  );

  let notified = 0;
  let failed = 0;
  for (const user of recipients) {
    const isClient = clientUser && user.id === clientUser.id;
    try {
      await notificationService.sendNotification({
        userId: user.id,
        bookingId: booking.id,
        type: notifType,
        title,
        message,
        severity,
        channels: {
          email: true, // email ON — both admins and client
          sms: false,
          whatsapp: false,
          push: true,
        },
        attachments: isClient && beneficiaryAttachment ? [beneficiaryAttachment] : undefined,
      });
      notified++;
    } catch (err) {
      failed++;
      logger.error(
        `[ETA Reminder] Failed to notify user ${user.id} for booking ${booking.id} (${notifType}):`,
        err
      );
    }
  }

  // Remember the ETA we just notified so we can detect later changes
  await prisma.booking.update({
    where: { id: booking.id },
    data: { lastNotifiedEta: booking.arrivalDateConstanta ?? undefined } as any,
  });

  logger.info(
    `[ETA Reminder] ${notifType} → booking ${booking.id}: notified=${notified} failed=${failed}`
  );
  return { notified, skipped: 0, failed };
}

async function notifyEtaChanged(
  booking: BookingWithClient
): Promise<{ notified: number; skipped: number; failed: number }> {
  if (!booking.arrivalDateConstanta || !booking.lastNotifiedEta) {
    return { notified: 0, skipped: 1, failed: 0 };
  }
  const newEta = startOfDayUtc(booking.arrivalDateConstanta);
  const oldEta = startOfDayUtc(booking.lastNotifiedEta);
  if (newEta.getTime() === oldEta.getTime()) {
    return { notified: 0, skipped: 1, failed: 0 };
  }

  const today = startOfDayUtc(new Date());
  const notifType = 'ETA_CHANGED';

  // Dedup: only one ETA_CHANGED per booking per day
  const existing = await prisma.notification.count({
    where: {
      bookingId: booking.id,
      type: notifType,
      createdAt: { gte: today },
    },
  });
  if (existing > 0) return { notified: 0, skipped: 1, failed: 0 };

  const blLabel = booking.blNumber || booking.id.slice(0, 8).toUpperCase();
  const oldStr = formatDateRo(booking.lastNotifiedEta);
  const newStr = formatDateRo(booking.arrivalDateConstanta);
  const delta = diffInDaysUtc(booking.arrivalDateConstanta, booking.lastNotifiedEta);
  const direction = delta > 0 ? `întârziere ${delta} zile` : `avans ${Math.abs(delta)} zile`;

  const title = `ETA modificată [${blLabel}] — era ${oldStr}, devine ${newStr}`;
  const message =
    `ETA-ul containerului cu B/L ${blLabel} la ${booking.portDestination || 'Constanța'} ` +
    `s-a schimbat: era ${oldStr}, devine ${newStr} (${direction}).\n\n` +
    `Booking: ${booking.id}`;

  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'] } },
  });
  const clientUser = booking.client?.userId
    ? await prisma.user.findUnique({ where: { id: booking.client.userId } })
    : null;
  const recipients = [...adminUsers];
  if (clientUser && !recipients.find((u) => u.id === clientUser.id)) {
    recipients.push(clientUser);
  }

  let notified = 0;
  let failed = 0;
  for (const user of recipients) {
    try {
      await notificationService.sendNotification({
        userId: user.id,
        bookingId: booking.id,
        type: notifType,
        title,
        message,
        severity: 'WARNING',
        channels: { email: true, sms: false, whatsapp: false, push: true },
      });
      notified++;
    } catch (err) {
      failed++;
      logger.error(
        `[ETA Reminder] ETA_CHANGED notify failed for user ${user.id} / booking ${booking.id}:`,
        err
      );
    }
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { lastNotifiedEta: booking.arrivalDateConstanta } as any,
  });

  logger.info(
    `[ETA Reminder] ETA_CHANGED → booking ${booking.id}: ${oldStr} → ${newStr} (notified=${notified})`
  );
  return { notified, skipped: 0, failed };
}

/**
 * Core logic — exported so it can be triggered manually (tests / API).
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

  const today = startOfDayUtc(new Date());

  // 1. Bookings with ETA in 1 / 3 / 5 days
  for (const daysAhead of ETA_THRESHOLDS) {
    const target = new Date(today);
    target.setUTCDate(target.getUTCDate() + daysAhead);
    const targetEnd = new Date(target);
    targetEnd.setUTCHours(23, 59, 59, 999);

    const bookings = (await prisma.booking.findMany({
      where: {
        arrivalDateConstanta: { gte: target, lte: targetEnd },
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
        archived: false,
      },
      include: {
        client: true,
        containers: { select: { containerNumber: true }, take: 1 },
      },
    })) as unknown as BookingWithClient[];

    logger.info(`[ETA Reminder] ${daysAhead}-day window → ${bookings.length} bookings`);

    for (const booking of bookings) {
      processed++;
      const r = await notifyEtaReminder(booking, daysAhead);
      notified += r.notified;
      skipped += r.skipped;
      failed += r.failed;
    }
  }

  // 2. ETA changed (any active booking where lastNotifiedEta != arrivalDateConstanta)
  const allActive = (await prisma.booking.findMany({
    where: {
      status: { notIn: ['DELIVERED', 'CANCELLED'] },
      archived: false,
      arrivalDateConstanta: { not: null },
    },
    include: {
      client: true,
      containers: { select: { containerNumber: true }, take: 1 },
    },
  })) as unknown as BookingWithClient[];

  for (const booking of allActive) {
    if (!booking.lastNotifiedEta || !booking.arrivalDateConstanta) continue;
    const newEta = startOfDayUtc(booking.arrivalDateConstanta);
    const oldEta = startOfDayUtc(booking.lastNotifiedEta);
    if (newEta.getTime() === oldEta.getTime()) continue;

    processed++;
    const r = await notifyEtaChanged(booking);
    notified += r.notified;
    skipped += r.skipped;
    failed += r.failed;
  }

  const duration = Date.now() - startTime;
  logger.info(
    `[ETA Reminder] Done in ${duration}ms: processed=${processed} notified=${notified} skipped=${skipped} failed=${failed}`
  );

  return { processed, notified, skipped, failed };
}

/**
 * Start the cron schedule. UTC.
 */
export function startEtaReminderJob() {
  // 08:00 UTC daily
  cron.schedule(
    '0 8 * * *',
    async () => {
      if (isRunning) {
        logger.info('[ETA Reminder] Previous job still running, skipping...');
        return;
      }
      isRunning = true;
      try {
        logger.info('[ETA Reminder] Starting scheduled ETA reminder check (08:00 UTC)...');
        await runEtaReminderJob();
      } catch (err) {
        logger.error('[ETA Reminder] Fatal error:', err);
      } finally {
        isRunning = false;
      }
    },
    { timezone: 'UTC' }
  );

  logger.info('ETA Reminder job started (daily 08:00 UTC)');
}

export function stopEtaReminderJob() {
  logger.info('ETA Reminder job stopped');
}
