import { Container, TrackingEvent } from '@prisma/client';
import prisma from '../../lib/prisma';
import { searatesIntegration } from '../../integrations/searates.integration';
import notificationService from '../../services/notification.service';

// ============================================
// TYPES
// ============================================

export interface TrackingEventInput {
  eventType: string;
  eventDate: Date;
  location: string;
  portName?: string;
  vessel?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ContainerFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  clientId?: string;
  bookingId?: string;
}

export interface ContainerWithTracking extends Container {
  trackingEvents: TrackingEvent[];
  booking: {
    id: string;
    clientId: string;
    portOrigin: string;
    portDestination: string;
    shippingLine: string;
    status: string;
    client: {
      id: string;
      companyName: string;
    };
  };
  daysInTransit?: number;
  daysDelayed?: number;
  isDelayed?: boolean;
}

// ============================================
// TRACKING EVENT TYPES
// ============================================

export const TrackingEventTypes = {
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  GATE_IN: 'GATE_IN',
  LOADED_ON_VESSEL: 'LOADED_ON_VESSEL',
  VESSEL_DEPARTURE: 'VESSEL_DEPARTURE',
  IN_TRANSIT: 'IN_TRANSIT',
  TRANSSHIPMENT: 'TRANSSHIPMENT',
  VESSEL_ARRIVAL: 'VESSEL_ARRIVAL',
  DISCHARGED: 'DISCHARGED',
  CUSTOMS_INSPECTION: 'CUSTOMS_INSPECTION',
  CUSTOMS_RELEASED: 'CUSTOMS_RELEASED',
  AVAILABLE_FOR_PICKUP: 'AVAILABLE_FOR_PICKUP',
  GATE_OUT: 'GATE_OUT',
  DELIVERED: 'DELIVERED',
  EMPTY_RETURNED: 'EMPTY_RETURNED',
} as const;

export const EventTypeLabels: Record<string, string> = {
  BOOKING_CONFIRMED: 'Rezervare Confirmată',
  GATE_IN: 'Intrare în Terminal',
  LOADED_ON_VESSEL: 'Încărcat pe Navă',
  VESSEL_DEPARTURE: 'Navă Plecată',
  IN_TRANSIT: 'În Tranzit',
  TRANSSHIPMENT: 'Transbordare',
  VESSEL_ARRIVAL: 'Sosire Navă',
  DISCHARGED: 'Descărcat',
  CUSTOMS_INSPECTION: 'Inspecție Vamală',
  CUSTOMS_RELEASED: 'Eliberat din Vamă',
  AVAILABLE_FOR_PICKUP: 'Disponibil pentru Ridicare',
  GATE_OUT: 'Ieșire din Terminal',
  DELIVERED: 'Livrat',
  EMPTY_RETURNED: 'Container Gol Returnat',
};

// Event order for validation (lower = earlier in process)
const EventOrder: Record<string, number> = {
  BOOKING_CONFIRMED: 1,
  GATE_IN: 2,
  LOADED_ON_VESSEL: 3,
  VESSEL_DEPARTURE: 4,
  IN_TRANSIT: 5,
  TRANSSHIPMENT: 6,
  VESSEL_ARRIVAL: 7,
  DISCHARGED: 8,
  CUSTOMS_INSPECTION: 9,
  CUSTOMS_RELEASED: 10,
  AVAILABLE_FOR_PICKUP: 11,
  GATE_OUT: 12,
  DELIVERED: 13,
  EMPTY_RETURNED: 14,
};

// Status mapping based on event type
const EventToStatus: Record<string, string> = {
  BOOKING_CONFIRMED: 'CONFIRMED',
  GATE_IN: 'GATE_IN',
  LOADED_ON_VESSEL: 'LOADED',
  VESSEL_DEPARTURE: 'DEPARTED',
  IN_TRANSIT: 'IN_TRANSIT',
  TRANSSHIPMENT: 'IN_TRANSIT',
  VESSEL_ARRIVAL: 'ARRIVED',
  DISCHARGED: 'DISCHARGED',
  CUSTOMS_INSPECTION: 'CUSTOMS',
  CUSTOMS_RELEASED: 'CUSTOMS_CLEARED',
  AVAILABLE_FOR_PICKUP: 'READY_FOR_PICKUP',
  GATE_OUT: 'GATE_OUT',
  DELIVERED: 'DELIVERED',
  EMPTY_RETURNED: 'COMPLETED',
};

// ============================================
// SERVICE CLASS
// ============================================

class TrackingService {
  /**
   * Get all containers with filtering and pagination
   */
  async getContainers(filters: ContainerFilters, userRole?: string, userClientId?: string) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      clientId,
      bookingId,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Role-based filtering: CLIENT can only see their containers
    if (userRole === 'CLIENT' && userClientId) {
      where.booking = { clientId: userClientId };
    } else if (clientId) {
      where.booking = { clientId };
    }

    // Booking filter
    if (bookingId) {
      where.bookingId = bookingId;
    }

    // Status filter
    if (status && status !== 'all') {
      where.currentStatus = status;
    }

    // Search filter (container number)
    if (search) {
      where.containerNumber = { contains: search, mode: 'insensitive' };
    }

    // Execute queries
    const [containers, total] = await Promise.all([
      prisma.container.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              clientId: true,
              portOrigin: true,
              portDestination: true,
              shippingLine: true,
              status: true,
              departureDate: true,
              eta: true,
              client: {
                select: {
                  id: true,
                  companyName: true,
                },
              },
            },
          },
          trackingEvents: {
            take: 1,
            orderBy: { eventDate: 'desc' },
          },
        },
      }),
      prisma.container.count({ where }),
    ]);

    // Add calculated fields
    const containersWithCalc = containers.map(container => ({
      ...container,
      latestEvent: container.trackingEvents[0] || null,
      daysInTransit: this.calculateDaysInTransit(container),
      isDelayed: this.checkIfDelayed(container),
      daysDelayed: this.calculateDaysDelayed(container),
    }));

    return {
      containers: containersWithCalc,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single container with full tracking history
   */
  async getContainerById(id: string, userRole?: string, userClientId?: string) {
    const container = await prisma.container.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            clientId: true,
            portOrigin: true,
            portDestination: true,
            shippingLine: true,
            status: true,
            departureDate: true,
            eta: true,
            cargoCategory: true,
            cargoWeight: true,
            client: {
              select: {
                id: true,
                companyName: true,
                contactPerson: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        trackingEvents: {
          orderBy: { eventDate: 'desc' },
        },
      },
    });

    if (!container) {
      throw new Error('Container not found');
    }

    // Permission check
    if (userRole === 'CLIENT' && userClientId && container.booking.clientId !== userClientId) {
      throw new Error('Access denied');
    }

    return {
      ...container,
      daysInTransit: this.calculateDaysInTransit(container),
      isDelayed: this.checkIfDelayed(container),
      daysDelayed: this.calculateDaysDelayed(container),
      nextMilestone: this.getNextMilestone(container),
    };
  }

  /**
   * Get container by container number
   */
  async getContainerByNumber(containerNumber: string, userRole?: string, userClientId?: string) {
    const container = await prisma.container.findUnique({
      where: { containerNumber: containerNumber.toUpperCase() },
      include: {
        booking: {
          select: {
            id: true,
            clientId: true,
            portOrigin: true,
            portDestination: true,
            shippingLine: true,
            status: true,
            departureDate: true,
            eta: true,
            cargoCategory: true,
            cargoWeight: true,
            client: {
              select: {
                id: true,
                companyName: true,
                contactPerson: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        trackingEvents: {
          orderBy: { eventDate: 'desc' },
        },
      },
    });

    if (!container) {
      throw new Error('Container not found');
    }

    // Permission check
    if (userRole === 'CLIENT' && userClientId && container.booking.clientId !== userClientId) {
      throw new Error('Access denied');
    }

    return {
      ...container,
      daysInTransit: this.calculateDaysInTransit(container),
      isDelayed: this.checkIfDelayed(container),
      daysDelayed: this.calculateDaysDelayed(container),
      nextMilestone: this.getNextMilestone(container),
    };
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
    await this.sendTrackingEventNotification(container, eventData, event.id);

    return event;
  }

  /**
   * Update tracking event
   */
  async updateTrackingEvent(eventId: string, eventData: Partial<TrackingEventInput>, updatedBy: string) {
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
   */
  async getMapData(userRole?: string, userClientId?: string) {
    const where: any = {
      currentLat: { not: null },
      currentLng: { not: null },
      currentStatus: { notIn: ['DELIVERED', 'COMPLETED', 'CANCELLED'] },
    };

    // Role-based filtering
    if (userRole === 'CLIENT' && userClientId) {
      where.booking = { clientId: userClientId };
    }

    const containers = await prisma.container.findMany({
      where,
      select: {
        id: true,
        containerNumber: true,
        currentStatus: true,
        currentLocation: true,
        currentLat: true,
        currentLng: true,
        eta: true,
        booking: {
          select: {
            portOrigin: true,
            portDestination: true,
            shippingLine: true,
          },
        },
      },
    });

    return containers.map(c => ({
      id: c.id,
      containerNumber: c.containerNumber,
      status: c.currentStatus,
      location: c.currentLocation,
      lat: c.currentLat,
      lng: c.currentLng,
      eta: c.eta,
      origin: c.booking.portOrigin,
      destination: c.booking.portDestination,
      shippingLine: c.booking.shippingLine,
    }));
  }

  /**
   * Get container route (all locations for path drawing)
   */
  async getContainerRoute(containerId: string) {
    const events = await prisma.trackingEvent.findMany({
      where: {
        containerId,
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { eventDate: 'asc' },
      select: {
        id: true,
        eventType: true,
        location: true,
        latitude: true,
        longitude: true,
        eventDate: true,
      },
    });

    return events.map(e => ({
      lat: e.latitude,
      lng: e.longitude,
      location: e.location,
      eventType: e.eventType,
      timestamp: e.eventDate,
    }));
  }

  /**
   * Get tracking statistics
   */
  async getTrackingStats(userRole?: string, userClientId?: string) {
    const where: any = {};

    if (userRole === 'CLIENT' && userClientId) {
      where.booking = { clientId: userClientId };
    }

    const [total, inTransit, arrived, delivered, delayed] = await Promise.all([
      prisma.container.count({ where }),
      prisma.container.count({ where: { ...where, currentStatus: 'IN_TRANSIT' } }),
      prisma.container.count({ where: { ...where, currentStatus: { in: ['ARRIVED', 'DISCHARGED'] } } }),
      prisma.container.count({ where: { ...where, currentStatus: 'DELIVERED' } }),
      prisma.container.count({
        where: {
          ...where,
          eta: { lt: new Date() },
          currentStatus: { notIn: ['DELIVERED', 'COMPLETED'] },
        },
      }),
    ]);

    return {
      total,
      inTransit,
      arrived,
      delivered,
      delayed,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Update container status and location based on new event
   */
  private async updateContainerFromEvent(containerId: string, event: TrackingEventInput) {
    const newStatus = EventToStatus[event.eventType] || event.eventType;

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
      const newStatus = EventToStatus[latestEvent.eventType] || latestEvent.eventType;

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
   * Calculate days in transit
   */
  private calculateDaysInTransit(container: any): number {
    // Find departure event
    const departureEvent = container.trackingEvents?.find(
      (e: any) => e.eventType === 'VESSEL_DEPARTURE'
    );

    if (!departureEvent) {
      // Use booking departure date if available
      if (container.booking?.departureDate) {
        const departure = new Date(container.booking.departureDate);
        const now = new Date();
        return Math.max(0, Math.floor((now.getTime() - departure.getTime()) / (1000 * 60 * 60 * 24)));
      }
      return 0;
    }

    const departureDate = new Date(departureEvent.eventDate);
    const endDate = container.actualArrival ? new Date(container.actualArrival) : new Date();

    return Math.max(0, Math.floor((endDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  /**
   * Check if container is delayed
   */
  private checkIfDelayed(container: any): boolean {
    if (!container.eta) return false;
    if (container.currentStatus === 'DELIVERED' || container.currentStatus === 'COMPLETED') return false;

    const eta = new Date(container.eta);
    const now = new Date();

    return now > eta;
  }

  /**
   * Calculate days delayed
   */
  private calculateDaysDelayed(container: any): number {
    if (!this.checkIfDelayed(container)) return 0;

    const eta = new Date(container.eta);
    const now = new Date();

    return Math.floor((now.getTime() - eta.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get next expected milestone
   */
  private getNextMilestone(container: any): string | null {
    const currentStatus = container.currentStatus;
    const statusOrder = ['CONFIRMED', 'GATE_IN', 'LOADED', 'DEPARTED', 'IN_TRANSIT', 'ARRIVED', 'DISCHARGED', 'CUSTOMS', 'CUSTOMS_CLEARED', 'READY_FOR_PICKUP', 'GATE_OUT', 'DELIVERED'];

    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= statusOrder.length - 1) {
      return null;
    }

    return statusOrder[currentIndex + 1];
  }

  /**
   * Validate event chronological order
   */
  private async validateEventOrder(container: any, newEvent: TrackingEventInput) {
    const existingEvents = container.trackingEvents;

    if (existingEvents.length === 0) return;

    const newEventOrder = EventOrder[newEvent.eventType];
    const newEventDate = new Date(newEvent.eventDate);

    for (const event of existingEvents) {
      const existingOrder = EventOrder[event.eventType];
      const existingDate = new Date(event.eventDate);

      // Check logical order
      if (newEventOrder < existingOrder && newEventDate > existingDate) {
        throw new Error(
          `Invalid event order: ${newEvent.eventType} cannot occur after ${event.eventType}`
        );
      }
    }
  }

  /**
   * Refresh tracking data from external APIs
   * This method is called by background jobs to sync container tracking
   */
  async refreshTracking(containerId: string): Promise<{ success: boolean; eventsFound: number; error?: string }> {
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

      // Call SeaRates web integration to get latest tracking
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
                    const eventLatitude = (eventLocation as any)?.latitude || searatesData.location?.latitude;
                    const eventLongitude = (eventLocation as any)?.longitude || searatesData.location?.longitude;
                    
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

              // Update container status and location from SeaRates
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
          }
        } catch (error) {
          console.error(`[TrackingService] SeaRates web integration error for container ${container.containerNumber}:`, error);
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
      console.error(`[TrackingService] Error refreshing tracking for container ${containerId}:`, error);
      return {
        success: false,
        eventsFound: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email notification for important tracking events
   */
  private async sendTrackingEventNotification(container: any, eventData: TrackingEventInput, eventId: string) {
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
        where: {
          email: booking.client.email,
        },
      });

      // If no user found by email, try to find by clientId relation
      let usersToNotify = clientUsers;
      if (usersToNotify.length === 0) {
        // Try alternative: find users that might be associated with client
        // This depends on your schema - adjust as needed
        usersToNotify = await prisma.user.findMany({
          where: {
            // If User has clientId field, use it
            // Otherwise, we'll use client email directly
          },
        });
      }

      const eventLabel = EventTypeLabels[eventData.eventType] || eventData.eventType;
      const message = `Containerul ${container.containerNumber} - ${eventLabel}\n\n` +
        `Locație: ${eventData.location}\n` +
        (eventData.portName ? `Port: ${eventData.portName}\n` : '') +
        (eventData.vessel ? `Navă: ${eventData.vessel}\n` : '') +
        `Data eveniment: ${new Date(eventData.eventDate).toLocaleDateString('ro-RO')}\n\n` +
        `Puteți urmări containerul în platformă pentru mai multe detalii.`;

      // Send to all client users
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

      // If no users found, try to send to client email directly (fallback)
      if (usersToNotify.length === 0 && booking.client.email) {
        // Create a temporary notification record
        await notificationService.sendNotification({
          userId: booking.clientId, // Use clientId as fallback
          bookingId: booking.id,
          type: 'TRACKING_EVENT',
          title: `Container ${container.containerNumber}: ${eventLabel}`,
          message,
          channels: { email: true, push: false, sms: false, whatsapp: false },
        });
      }
    } catch (error) {
      console.error(`[TrackingService] Failed to send tracking event notification:`, error);
      // Don't fail the event creation if notification fails
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
