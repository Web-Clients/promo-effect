/**
 * Tracking Webhook Service
 * Handles webhook requests from external tracking providers (SeaRates web integration, etc.)
 */

import prisma from '../../lib/prisma';
import notificationService from '../../services/notification.service';
import { searatesIntegration } from '../../integrations/searates.integration';

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
  source: string; // SEARATES, MAERSK_API, etc.
}

export class TrackingWebhookService {

  /**
   * Process webhook from external provider
   */
  async processWebhook(payload: WebhookPayload, signature?: string, provider: string = 'SEARATES') {
    // Verify webhook signature for security
    if (signature && provider === 'SEARATES') {
      const webhookSecret = process.env.SEARATES_WEBHOOK_SECRET;
      if (webhookSecret) {
        const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
        if (!searatesIntegration.verifyWebhookSignature(payloadString, signature, webhookSecret)) {
          throw new Error('Invalid webhook signature');
        }
      }
    }

    // Find container by container number or B/L number
    let container = null;

    if (payload.containerNumber) {
      container = await prisma.container.findUnique({
        where: { containerNumber: payload.containerNumber },
        include: { booking: true },
      });
    }

    if (!container && payload.blNumber) {
      // Try to find by B/L number directly
      // Note: blNumber field exists in schema but may need Prisma client regeneration
      container = await prisma.container.findFirst({
        where: {
          blNumber: payload.blNumber,
        } as any,
        include: {
          booking: {
            include: {
              client: true,
            },
          },
        },
      });
    }

    if (!container) {
      // Container not found - log for manual review
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

    // Check if event already exists (avoid duplicates)
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

    // Create tracking event
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
        validated: true, // Events from API are considered validated
        visibility: 'PUBLIC',
      } as any,
    });

    // Update container status and location
    await this.updateContainerFromEvent(container.id, payload);

    // Check for significant changes (ETA, delays, etc.)
    await this.checkForAlerts(container.id, payload);

    return {
      success: true,
      message: 'Event processed',
      eventId: event.id,
      containerId: container.id,
    };
  }

  /**
   * Update container based on webhook event
   */
  private async updateContainerFromEvent(containerId: string, payload: WebhookPayload) {
    const updateData: any = {
      lastSyncAt: new Date(),
      apiSource: payload.source,
    };

    // Update status if provided
    if (payload.status) {
      updateData.currentStatus = payload.status;
    }

    // Update location
    if (payload.location) {
      updateData.currentLocation = payload.location;
    }

    if (payload.latitude && payload.longitude) {
      updateData.currentLat = payload.latitude;
      updateData.currentLng = payload.longitude;
    }

    // Update ETA if provided in details
    if (payload.details?.eta) {
      updateData.eta = new Date(payload.details.eta);
    }

    await prisma.container.update({
      where: { id: containerId },
      data: updateData,
    });
  }

  /**
   * Check for alerts (delays, ETA changes, etc.)
   */
  private async checkForAlerts(containerId: string, payload: WebhookPayload) {
    const container = await prisma.container.findUnique({
      where: { id: containerId },
      include: { booking: { include: { client: true } } },
    });

    if (!container) return;

    // Check for delay
    const containerWithExtras = container as any;
    if (container.eta && containerWithExtras.etaOriginal) {
      const delayDays = Math.floor(
        (new Date(container.eta).getTime() - new Date(containerWithExtras.etaOriginal).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (delayDays > 2 && !containerWithExtras.delayed) {
        await prisma.container.update({
          where: { id: containerId },
          data: { delayed: true } as any,
        });

        // Send delay notification to client
        try {
          await notificationService.sendNotification({
            userId: container.booking.clientId, // TODO: Replace with actual user ID
            bookingId: container.bookingId,
            type: 'CONTAINER_DELAYED',
            title: `Container ${container.containerNumber} - Întârziere`,
            message: `Container-ul ${container.containerNumber} este întârziat cu ${delayDays} zile. ETA actualizat: ${container.eta ? new Date(container.eta).toLocaleDateString('ro-RO') : 'N/A'}`,
            channels: {
              email: true,
              sms: true,
              whatsapp: true,
              push: true,
            },
          });
        } catch (error) {
          console.error('Failed to send delay notification:', error);
        }
      }
    }

    // Check for ETA change
    if (payload.details?.eta && container.eta) {
      const newEta = new Date(payload.details.eta);
      const oldEta = container.eta;
      const diffDays = Math.abs((newEta.getTime() - oldEta.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        // Significant ETA change - send notification
        try {
          const container = await prisma.container.findUnique({
            where: { id: containerId },
            include: { booking: true },
          });

          if (container) {
            await notificationService.sendNotification({
              userId: container.booking.clientId, // TODO: Replace with actual user ID
              bookingId: container.bookingId,
              type: 'ETA_CHANGED',
              title: `Container ${container.containerNumber} - ETA Actualizat`,
              message: `ETA pentru container-ul ${container.containerNumber} a fost actualizat. Noua dată estimată: ${newEta.toLocaleDateString('ro-RO')}`,
              channels: {
                email: true,
                sms: false,
                whatsapp: false,
                push: true,
              },
            });
          }
        } catch (error) {
          console.error('Failed to send ETA change notification:', error);
        }
      }
    }
  }

  /**
   * Extract UNLOCODE from location string
   */
  private extractUnlocode(location?: string): string | null {
    if (!location) return null;

    // Try to extract UNLOCODE pattern (e.g., "ROCND" from "Constanța (ROCND)")
    const match = location.match(/\(([A-Z]{5})\)/);
    return match ? match[1] : null;
  }

  /**
   * Process SeaRates webhook payload
   * This method handles the raw webhook payload from SeaRates web integration
   */
  async processSeaRatesWebhook(rawPayload: any, signature?: string) {
    // Parse SeaRates payload format
    const payload = searatesIntegration.parseWebhookPayload(rawPayload);
    
    // Process as regular webhook
    return this.processWebhook(payload, signature, 'SEARATES');
  }
}

