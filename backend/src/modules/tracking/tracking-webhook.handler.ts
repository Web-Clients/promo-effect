import prisma from '../../lib/prisma';
import { searatesIntegration } from '../../integrations/searates.integration';
import notificationService from '../../services/notification.service';
import { EventTypeLabels } from './tracking.types';
import type { TrackingEventInput } from './tracking.types';

// ============================================
// WEBHOOK / EXTERNAL API REFRESH HANDLER
// ============================================

/**
 * Send email notification for important tracking events
 */
export async function sendTrackingEventNotification(
  container: any,
  eventData: TrackingEventInput,
  _eventId: string
): Promise<void> {
  // Important events that should trigger email notifications
  const importantEvents = [
    'VESSEL_DEPARTURE',
    'VESSEL_ARRIVAL',
    'DISCHARGED',
    'AVAILABLE_FOR_PICKUP',
    'DELIVERED',
    'CUSTOMS_RELEASED',
  ];

  if (!importantEvents.includes(eventData.eventType)) {
    return; // Skip notification for non-critical events
  }

  try {
    const booking = container.booking;
    if (!booking || !booking.client) {
      return; // No client to notify
    }

    // Find users associated with this client
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

    // Fallback: send to clientId if no users found
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
    console.error(`[TrackingWebhookHandler] Failed to send tracking event notification:`, error);
    // Don't fail the event creation if notification fails
  }
}

/**
 * Refresh tracking data from external APIs (SeaRates).
 * Called by background jobs to sync container tracking.
 */
export async function refreshTracking(
  containerId: string
): Promise<{ success: boolean; eventsFound: number; error?: string }> {
  try {
    const container = await prisma.container.findUnique({
      where: { id: containerId },
      include: {
        booking: true,
        trackingEvents: {
          orderBy: { eventDate: 'desc' },
          take: 1, // Get latest event
        },
      },
    });

    if (!container) {
      return { success: false, eventsFound: 0, error: 'Container not found' };
    }

    let eventsFound = 0;

    if (searatesIntegration.isConfigured()) {
      try {
        // Get tracking from SeaRates web integration
        const searatesData = await searatesIntegration.getContainerTracking(
          container.containerNumber
        );

        if (searatesData) {
          // Process events from SeaRates
          if (searatesData.events && searatesData.events.length > 0) {
            // Get latest event date from our database
            const latestEvent = container.trackingEvents[0];
            const latestEventDate = latestEvent ? new Date(latestEvent.eventDate) : new Date(0);

            // Process new events
            for (const searatesEvent of searatesData.events) {
              const eventDate = new Date(searatesEvent.occurredAt);

              // Only process events newer than our latest
              if (eventDate > latestEventDate) {
                const eventType = searatesIntegration.mapEventType(searatesEvent.type);

                // Check if event already exists
                const existing = await prisma.trackingEvent.findFirst({
                  where: {
                    containerId: container.id,
                    eventType,
                    eventDate,
                    source: 'SEARATES',
                  } as any,
                });

                if (!existing) {
                  // Get location data - check both searatesEvent and searatesData
                  const eventLocation = searatesEvent.location || searatesData.location;
                  const eventLatitude =
                    (eventLocation as any)?.latitude || searatesData.location?.latitude;
                  const eventLongitude =
                    (eventLocation as any)?.longitude || searatesData.location?.longitude;

                  await prisma.trackingEvent.create({
                    data: {
                      containerId: container.id,
                      eventType,
                      eventDate,
                      location: eventLocation?.name || searatesData.location?.name || 'Unknown',
                      portName: eventLocation?.name || searatesData.location?.name,
                      unlocode: eventLocation?.unlocode || searatesData.location?.unlocode,
                      vessel: searatesEvent.vessel?.name || searatesData.vessel?.name,
                      voyageNumber: searatesEvent.voyage || searatesData.voyage,
                      latitude: eventLatitude,
                      longitude: eventLongitude,
                      containerStatus: searatesData.status,
                      details: searatesEvent.description || null,
                      source: 'SEARATES',
                      validated: true,
                      visibility: 'PUBLIC',
                    } as any,
                  });

                  eventsFound++;
                }
              }
            }
          }

          // Update container status and location from SeaRates (always, even without new events)
          if (searatesData.status || searatesData.location) {
            await prisma.container.update({
              where: { id: containerId },
              data: {
                currentStatus: searatesData.status || undefined,
                currentLocation: searatesData.location?.name || undefined,
                currentLat: searatesData.location?.latitude || undefined,
                currentLng: searatesData.location?.longitude || undefined,
                eta: searatesData.eta ? new Date(searatesData.eta) : undefined,
                actualArrival: searatesData.ata ? new Date(searatesData.ata) : undefined,
                lastSyncAt: new Date(),
              } as any,
            });
          }
        }
      } catch (error) {
        console.error(
          `[TrackingWebhookHandler] SeaRates web integration error for container ${container.containerNumber}:`,
          error
        );
        // Continue even if SeaRates fails - just update timestamp
      }
    }

    // Update lastSyncAt timestamp
    await prisma.container.update({
      where: { id: containerId },
      data: {
        lastSyncAt: new Date(),
      },
    });

    return { success: true, eventsFound };
  } catch (error) {
    console.error(
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
