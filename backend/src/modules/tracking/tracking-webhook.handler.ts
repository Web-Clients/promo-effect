import prisma from '../../lib/prisma';
import { aisstreamIntegration } from '../../integrations/aisstream.integration';
import notificationService from '../../services/notification.service';
import { EventTypeLabels } from './tracking.types';
import type { TrackingEventInput } from './tracking.types';
import logger from '../../utils/logger';

// ============================================
// REFRESH HANDLER (AISStream-backed)
// ============================================

export async function sendTrackingEventNotification(
  container: any,
  eventData: TrackingEventInput,
  _eventId: string
): Promise<void> {
  const importantEvents = [
    'VESSEL_DEPARTURE',
    'VESSEL_ARRIVAL',
    'DISCHARGED',
    'AVAILABLE_FOR_PICKUP',
    'DELIVERED',
    'CUSTOMS_RELEASED',
  ];

  if (!importantEvents.includes(eventData.eventType)) return;

  try {
    const booking = container.booking;
    if (!booking || !booking.client) return;

    const clientUsers = await prisma.user.findMany({
      where: { email: booking.client.email },
    });

    let usersToNotify = clientUsers;
    if (usersToNotify.length === 0) {
      usersToNotify = await prisma.user.findMany({ where: {} });
    }

    const eventLabel = EventTypeLabels[eventData.eventType] || eventData.eventType;
    const message =
      `Containerul ${container.containerNumber} - ${eventLabel}\n\n` +
      `Locație: ${eventData.location}\n` +
      (eventData.portName ? `Port: ${eventData.portName}\n` : '') +
      (eventData.vessel ? `Navă: ${eventData.vessel}\n` : '') +
      `Data eveniment: ${new Date(eventData.eventDate).toLocaleDateString('ro-RO')}\n\n` +
      `Puteți urmări containerul în platformă pentru mai multe detalii.`;

    for (const user of usersToNotify) {
      await notificationService.sendNotification({
        userId: user.id,
        bookingId: booking.id,
        type: 'TRACKING_EVENT',
        title: `Container ${container.containerNumber}: ${eventLabel}`,
        message,
        channels: { email: true, push: false, sms: false, whatsapp: false },
      });
    }

    if (usersToNotify.length === 0 && booking.client.email) {
      await notificationService.sendNotification({
        userId: booking.clientId,
        bookingId: booking.id,
        type: 'TRACKING_EVENT',
        title: `Container ${container.containerNumber}: ${eventLabel}`,
        message,
        channels: { email: true, push: false, sms: false, whatsapp: false },
      });
    }
  } catch (error) {
    logger.error(`[TrackingWebhookHandler] Failed to send tracking event notification:`, error);
  }
}

/**
 * Pull the latest cached AIS position for the container's vessel and
 * persist it. The cache itself is fed by the always-on AISStream
 * WebSocket (see aisstream.integration.ts), so this call is cheap and
 * does not make any outbound HTTP request.
 *
 * Carrier-side events (LOADED, DISCHARGED, etc.) are not produced by
 * AIS — they arrive separately via the generic webhook endpoint
 * (manual entry, Gemini email parser, or carrier API).
 */
export async function refreshTracking(
  containerId: string
): Promise<{ success: boolean; eventsFound: number; error?: string }> {
  try {
    const container = await prisma.container.findUnique({
      where: { id: containerId },
      select: {
        id: true,
        containerNumber: true,
        vesselMmsi: true,
      },
    });

    if (!container) {
      return { success: false, eventsFound: 0, error: 'Container not found' };
    }

    let eventsFound = 0;

    if (container.vesselMmsi) {
      const position = aisstreamIntegration.getPosition(container.vesselMmsi);

      if (position) {
        await prisma.container.update({
          where: { id: containerId },
          data: {
            currentLat: position.latitude,
            currentLng: position.longitude,
            vesselSog: position.sog,
            vesselCog: position.cog,
            vesselHeading: position.heading >= 511 ? null : position.heading,
            vesselName: position.shipName || undefined,
            vesselImo: position.imo || undefined,
            vesselPosAt: new Date(position.timestamp),
            lastSyncAt: new Date(),
            apiSource: 'AISSTREAM',
          },
        });
      } else {
        // Ensure the AISStream subscription set is up to date for this MMSI.
        aisstreamIntegration.trackMmsi(container.vesselMmsi);
        await prisma.container.update({
          where: { id: containerId },
          data: { lastSyncAt: new Date() },
        });
      }
    } else {
      await prisma.container.update({
        where: { id: containerId },
        data: { lastSyncAt: new Date() },
      });
    }

    return { success: true, eventsFound };
  } catch (error) {
    logger.error(
      `[TrackingWebhookHandler] Error refreshing tracking for container ${containerId}:`,
      error
    );
    return {
      success: false,
      eventsFound: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
