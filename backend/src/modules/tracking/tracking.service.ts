import prisma from '../../lib/prisma';
import {
  TrackingEventInput,
  ContainerFilters,
  ContainerWithTracking,
  TrackingEventTypes,
  EventTypeLabels,
  EventOrder,
  EventToStatus,
} from './tracking.types';
import {
  mapEventToStatus,
  getMapData,
  getContainerRoute,
  getTrackingStats,
  getContainers,
  getContainerById as queryContainerById,
  getContainerByNumber as queryContainerByNumber,
} from './tracking-parser';
import { refreshTracking, sendTrackingEventNotification } from './tracking-webhook.handler';

// Re-export types for backward compatibility
export {
  TrackingEventInput,
  ContainerFilters,
  ContainerWithTracking,
  TrackingEventTypes,
  EventTypeLabels,
  EventOrder,
  EventToStatus,
};

// ============================================
// SERVICE CLASS
// ============================================

class TrackingService {
  /**
   * Get all containers with filtering and pagination
   * Delegates to tracking-parser.ts
   */
  async getContainers(filters: ContainerFilters, userRole?: string, userClientId?: string) {
    return getContainers(filters, userRole, userClientId);
  }

  /**
   * Get single container with full tracking history by ID
   * Delegates to tracking-parser.ts
   */
  async getContainerById(id: string, userRole?: string, userClientId?: string) {
    return queryContainerById(id, userRole, userClientId);
  }

  /**
   * Get container by container number
   * Delegates to tracking-parser.ts
   */
  async getContainerByNumber(containerNumber: string, userRole?: string, userClientId?: string) {
    return queryContainerByNumber(containerNumber, userRole, userClientId);
  }

  /**
   * Add manual tracking event
   */
  async addTrackingEvent(containerId: string, eventData: TrackingEventInput, createdBy: string) {
    // Validate container exists
    const container = await prisma.container.findUnique({
      where: { id: containerId },
      include: { trackingEvents: { orderBy: { eventDate: 'desc' } } },
    });

    if (!container) {
      throw new Error('Container not found');
    }

    // Validate event type
    if (!Object.keys(TrackingEventTypes).includes(eventData.eventType)) {
      throw new Error(`Invalid event type: ${eventData.eventType}`);
    }

    // Validate chronological order (optional - can be skipped for corrections)
    // await this.validateEventOrder(container, eventData);

    // Create tracking event
    const event = await prisma.trackingEvent.create({
      data: {
        containerId,
        eventType: eventData.eventType,
        eventDate: new Date(eventData.eventDate),
        location: eventData.location,
        portName: eventData.portName,
        vessel: eventData.vessel,
        latitude: eventData.latitude,
        longitude: eventData.longitude,
      },
    });

    // Update container status and location
    await this.updateContainerFromEvent(containerId, eventData);

    // Log audit
    await this.logAudit('TRACKING_EVENT_ADDED', containerId, createdBy, {
      eventId: event.id,
      eventType: eventData.eventType,
    });

    // Send email notification for important events
    await sendTrackingEventNotification(container, eventData, event.id);

    return event;
  }

  /**
   * Update tracking event
   */
  async updateTrackingEvent(
    eventId: string,
    eventData: Partial<TrackingEventInput>,
    updatedBy: string
  ) {
    const event = await prisma.trackingEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Tracking event not found');
    }

    const updatedEvent = await prisma.trackingEvent.update({
      where: { id: eventId },
      data: {
        eventType: eventData.eventType,
        eventDate: eventData.eventDate ? new Date(eventData.eventDate) : undefined,
        location: eventData.location,
        portName: eventData.portName,
        vessel: eventData.vessel,
        latitude: eventData.latitude,
        longitude: eventData.longitude,
      },
    });

    // Recalculate container status
    await this.recalculateContainerStatus(event.containerId);

    // Log audit
    await this.logAudit('TRACKING_EVENT_UPDATED', event.containerId, updatedBy, {
      eventId,
      changes: eventData,
    });

    return updatedEvent;
  }

  /**
   * Delete tracking event
   */
  async deleteTrackingEvent(eventId: string, deletedBy: string) {
    const event = await prisma.trackingEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Tracking event not found');
    }

    await prisma.trackingEvent.delete({
      where: { id: eventId },
    });

    // Recalculate container status
    await this.recalculateContainerStatus(event.containerId);

    // Log audit
    await this.logAudit('TRACKING_EVENT_DELETED', event.containerId, deletedBy, {
      eventId,
      eventType: event.eventType,
    });

    return { success: true };
  }

  /**
   * Get map data for all active containers
   * Delegates to tracking-parser.ts
   */
  async getMapData(userRole?: string, userClientId?: string) {
    return getMapData(userRole, userClientId);
  }

  /**
   * Get container route (all locations for path drawing)
   * Delegates to tracking-parser.ts
   */
  async getContainerRoute(containerId: string) {
    return getContainerRoute(containerId);
  }

  /**
   * Get tracking statistics
   * Delegates to tracking-parser.ts
   */
  async getTrackingStats(userRole?: string, userClientId?: string) {
    return getTrackingStats(userRole, userClientId);
  }

  /**
   * Refresh tracking data from external APIs
   * Delegates to tracking-webhook.handler.ts
   */
  async refreshTracking(
    containerId: string
  ): Promise<{ success: boolean; eventsFound: number; error?: string }> {
    return refreshTracking(containerId);
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Update container status and location based on new event
   */
  private async updateContainerFromEvent(containerId: string, event: TrackingEventInput) {
    const newStatus = mapEventToStatus(event.eventType);

    await prisma.container.update({
      where: { id: containerId },
      data: {
        currentStatus: newStatus,
        currentLocation: event.location,
        currentLat: event.latitude,
        currentLng: event.longitude,
        actualArrival: event.eventType === 'VESSEL_ARRIVAL' ? new Date(event.eventDate) : undefined,
        lastSyncAt: new Date(),
      },
    });
  }

  /**
   * Recalculate container status from all events
   */
  private async recalculateContainerStatus(containerId: string) {
    const latestEvent = await prisma.trackingEvent.findFirst({
      where: { containerId },
      orderBy: { eventDate: 'desc' },
    });

    if (latestEvent) {
      const newStatus = mapEventToStatus(latestEvent.eventType);

      await prisma.container.update({
        where: { id: containerId },
        data: {
          currentStatus: newStatus,
          currentLocation: latestEvent.location,
          currentLat: latestEvent.latitude,
          currentLng: latestEvent.longitude,
        },
      });
    }
  }

  /**
   * Log audit trail
   */
  private async logAudit(action: string, entityId: string, userId: string, details: any) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType: 'CONTAINER',
          entityId,
          changes: JSON.stringify(details),
          ipAddress: '',
        },
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  }
}

export const trackingService = new TrackingService();
export default trackingService;
