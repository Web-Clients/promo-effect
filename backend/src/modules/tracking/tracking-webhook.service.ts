/**
 * Tracking Webhook Service
 *
 * Provider-agnostic ingestion path for tracking events. Used by:
 *   - manual entry (operator UI)
 *   - Gemini email parser
 *   - any future inbound integration (e.g. Maersk Track API webhook)
 *
 * Vessel positions arrive separately via the AISStream WebSocket
 * (see aisstream.integration.ts) and are written directly to the
 * Container table, so they don't flow through this service.
 */

import prisma from '../../lib/prisma';
import notificationService from '../../services/notification.service';
import logger from '../../utils/logger';

export interface WebhookPayload {
  containerNumber?: string;
  blNumber?: string;
  eventType: string;
  eventDate: string;
  location?: string;
  portName?: string;
  vessel?: string;
  voyageNumber?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  details?: any;
  source: string; // AISSTREAM, MANUAL_ENTRY, EMAIL_PARSING, MAERSK_API
}

export class TrackingWebhookService {
  /**
   * Persist a tracking event coming from any source.
   */
  async processWebhook(
    payload: WebhookPayload,
    _signature?: string,
    _provider: string = 'GENERIC'
  ) {
    let container = null;

    if (payload.containerNumber) {
      container = await prisma.container.findUnique({
        where: { containerNumber: payload.containerNumber },
        include: { booking: true },
      });
    }

    if (!container && payload.blNumber) {
      container = await prisma.container.findFirst({
        where: { blNumber: payload.blNumber } as any,
        include: { booking: { include: { client: true } } },
      });
    }

    if (!container) {
      await prisma.auditLog.create({
        data: {
          action: 'WEBHOOK_CONTAINER_NOT_FOUND',
          entityType: 'Container',
          changes: JSON.stringify({
            containerNumber: payload.containerNumber,
            blNumber: payload.blNumber,
            source: payload.source,
          }),
        },
      });

      return {
        success: false,
        message: 'Container not found',
        containerNumber: payload.containerNumber,
      };
    }

    const existingEvent = await prisma.trackingEvent.findFirst({
      where: {
        containerId: container.id,
        eventType: payload.eventType,
        eventDate: new Date(payload.eventDate),
        source: payload.source,
      } as any,
    });

    if (existingEvent) {
      return {
        success: true,
        message: 'Event already exists',
        eventId: existingEvent.id,
      };
    }

    const event = await prisma.trackingEvent.create({
      data: {
        containerId: container.id,
        eventType: payload.eventType,
        eventDate: new Date(payload.eventDate),
        location: payload.location || payload.portName || 'Unknown',
        portName: payload.portName,
        unlocode: this.extractUnlocode(payload.location),
        vessel: payload.vessel,
        voyageNumber: payload.voyageNumber,
        latitude: payload.latitude,
        longitude: payload.longitude,
        containerStatus: payload.status,
        details: payload.details ? JSON.stringify(payload.details) : null,
        source: payload.source || 'MANUAL_ENTRY',
        validated: true,
        visibility: 'PUBLIC',
      } as any,
    });

    await this.updateContainerFromEvent(container.id, payload);
    await this.checkForAlerts(container.id, payload);

    return {
      success: true,
      message: 'Event processed',
      eventId: event.id,
      containerId: container.id,
    };
  }

  private async updateContainerFromEvent(containerId: string, payload: WebhookPayload) {
    const updateData: any = {
      lastSyncAt: new Date(),
      apiSource: payload.source,
    };

    if (payload.status) updateData.currentStatus = payload.status;
    if (payload.location) updateData.currentLocation = payload.location;
    if (payload.latitude && payload.longitude) {
      updateData.currentLat = payload.latitude;
      updateData.currentLng = payload.longitude;
    }
    if (payload.details?.eta) updateData.eta = new Date(payload.details.eta);

    await prisma.container.update({ where: { id: containerId }, data: updateData });
  }

  private async checkForAlerts(containerId: string, payload: WebhookPayload) {
    const container = await prisma.container.findUnique({
      where: { id: containerId },
      include: { booking: { include: { client: true } } },
    });

    if (!container) return;

    const containerWithExtras = container as any;
    if (container.eta && containerWithExtras.etaOriginal) {
      const delayDays = Math.floor(
        (new Date(container.eta).getTime() - new Date(containerWithExtras.etaOriginal).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (delayDays > 2 && !containerWithExtras.delayed) {
        await prisma.container.update({
          where: { id: containerId },
          data: { delayed: true } as any,
        });

        try {
          const clientData = await prisma.client.findUnique({
            where: { id: container.booking.clientId },
            select: { email: true },
          });
          const clientUser = clientData
            ? await prisma.user.findUnique({
                where: { email: clientData.email },
                select: { id: true },
              })
            : null;

          if (!clientUser) {
            logger.warn(
              `[Webhook] No user found for clientId ${container.booking.clientId}, skipping delay notification`
            );
          } else {
            await notificationService.sendNotification({
              userId: clientUser.id,
              bookingId: container.bookingId,
              type: 'CONTAINER_DELAYED',
              title: `Container ${container.containerNumber} - Întârziere`,
              message: `Container-ul ${container.containerNumber} este întârziat cu ${delayDays} zile. ETA actualizat: ${container.eta ? new Date(container.eta).toLocaleDateString('ro-RO') : 'N/A'}`,
              channels: { email: true, sms: true, whatsapp: true, push: true },
            });
          }
        } catch (error) {
          logger.error('Failed to send delay notification:', error);
        }
      }
    }

    if (payload.details?.eta && container.eta) {
      const newEta = new Date(payload.details.eta);
      const oldEta = container.eta;
      const diffDays = Math.abs((newEta.getTime() - oldEta.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        try {
          const refreshed = await prisma.container.findUnique({
            where: { id: containerId },
            include: { booking: true },
          });

          if (refreshed) {
            const clientData = await prisma.client.findUnique({
              where: { id: refreshed.booking.clientId },
              select: { email: true },
            });
            const clientUser = clientData
              ? await prisma.user.findUnique({
                  where: { email: clientData.email },
                  select: { id: true },
                })
              : null;

            if (!clientUser) {
              logger.warn(
                `[Webhook] No user found for clientId ${refreshed.booking.clientId}, skipping ETA notification`
              );
            } else {
              await notificationService.sendNotification({
                userId: clientUser.id,
                bookingId: refreshed.bookingId,
                type: 'ETA_CHANGED',
                title: `Container ${refreshed.containerNumber} - ETA Actualizat`,
                message: `ETA pentru container-ul ${refreshed.containerNumber} a fost actualizat. Noua dată estimată: ${newEta.toLocaleDateString('ro-RO')}`,
                channels: { email: true, sms: false, whatsapp: false, push: true },
              });
            }
          }
        } catch (error) {
          logger.error('Failed to send ETA change notification:', error);
        }
      }
    }
  }

  private extractUnlocode(location?: string): string | null {
    if (!location) return null;
    const match = location.match(/\(([A-Z]{5})\)/);
    return match ? match[1] : null;
  }
}
