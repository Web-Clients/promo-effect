import prisma from '../../lib/prisma';
import { EventOrder, EventToStatus, ContainerFilters } from './tracking.types';
import type { TrackingEventInput } from './tracking.types';

// ============================================
// CONTAINER READ QUERIES
// ============================================

/** Shared booking include for single container queries */
const CONTAINER_BOOKING_SELECT = {
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
    select: { id: true, companyName: true, contactPerson: true, email: true, phone: true },
  },
};

/** Map booking fields to match frontend Container interface */
function mapBooking(booking: any) {
  if (!booking) return undefined;
  return {
    id: booking.id,
    bookingNumber: booking.id,
    origin: booking.portOrigin,
    destination: booking.portDestination,
    shippingLine: booking.shippingLine,
    status: booking.status,
    client: booking.client
      ? { id: booking.client.id, name: booking.client.companyName }
      : undefined,
  };
}

/**
 * Get all containers with filtering and pagination
 */
export async function getContainers(
  filters: ContainerFilters,
  userRole?: string,
  userClientId?: string
) {
  const { page = 1, limit = 20, status, search, clientId, bookingId } = filters;
  const skip = (page - 1) * limit;
  const where: any = {};

  if (userRole === 'CLIENT' && userClientId) {
    where.booking = { clientId: userClientId };
  } else if (clientId) {
    where.booking = { clientId };
  }
  if (bookingId) where.bookingId = bookingId;
  if (status && status !== 'all') where.currentStatus = status;
  if (search) where.containerNumber = { contains: search, mode: 'insensitive' };

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
            client: { select: { id: true, companyName: true } },
          },
        },
        trackingEvents: { take: 1, orderBy: { eventDate: 'desc' } },
      },
    }),
    prisma.container.count({ where }),
  ]);

  const containersWithCalc = containers.map((container) => ({
    ...container,
    booking: mapBooking(container.booking),
    latestEvent: container.trackingEvents[0] || null,
    daysInTransit: calculateDaysInTransit(container),
    isDelayed: checkIfDelayed(container),
    daysDelayed: calculateDaysDelayed(container),
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
 * Get single container with full tracking history by ID
 */
export async function getContainerById(id: string, userRole?: string, userClientId?: string) {
  const container = await prisma.container.findUnique({
    where: { id },
    include: {
      booking: { select: CONTAINER_BOOKING_SELECT },
      trackingEvents: { orderBy: { eventDate: 'desc' } },
    },
  });

  if (!container) throw new Error('Container not found');
  if (userRole === 'CLIENT' && userClientId && container.booking.clientId !== userClientId) {
    throw new Error('Access denied');
  }

  return {
    ...container,
    booking: mapBooking(container.booking),
    daysInTransit: calculateDaysInTransit(container),
    isDelayed: checkIfDelayed(container),
    daysDelayed: calculateDaysDelayed(container),
    nextMilestone: getNextMilestone(container),
  };
}

/**
 * Get container by container number
 */
export async function getContainerByNumber(
  containerNumber: string,
  userRole?: string,
  userClientId?: string
) {
  const container = await prisma.container.findUnique({
    where: { containerNumber: containerNumber.toUpperCase() },
    include: {
      booking: { select: CONTAINER_BOOKING_SELECT },
      trackingEvents: { orderBy: { eventDate: 'desc' } },
    },
  });

  if (!container) throw new Error('Container not found');
  if (userRole === 'CLIENT' && userClientId && container.booking.clientId !== userClientId) {
    throw new Error('Access denied');
  }

  return {
    ...container,
    booking: mapBooking(container.booking),
    daysInTransit: calculateDaysInTransit(container),
    isDelayed: checkIfDelayed(container),
    daysDelayed: calculateDaysDelayed(container),
    nextMilestone: getNextMilestone(container),
  };
}

// ============================================
// PARSING / CALCULATION HELPERS
// ============================================

/**
 * Calculate days in transit for a container
 */
export function calculateDaysInTransit(container: any): number {
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

  return Math.max(
    0,
    Math.floor((endDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24))
  );
}

/**
 * Check if container is delayed
 */
export function checkIfDelayed(container: any): boolean {
  if (!container.eta) return false;
  if (container.currentStatus === 'DELIVERED' || container.currentStatus === 'COMPLETED')
    return false;

  const eta = new Date(container.eta);
  const now = new Date();

  return now > eta;
}

/**
 * Calculate days delayed
 */
export function calculateDaysDelayed(container: any): number {
  if (!checkIfDelayed(container)) return 0;

  const eta = new Date(container.eta);
  const now = new Date();

  return Math.floor((now.getTime() - eta.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get next expected milestone based on current status
 */
export function getNextMilestone(container: any): string | null {
  const currentStatus = container.currentStatus;
  const statusOrder = [
    'CONFIRMED',
    'GATE_IN',
    'LOADED',
    'DEPARTED',
    'IN_TRANSIT',
    'ARRIVED',
    'DISCHARGED',
    'CUSTOMS',
    'CUSTOMS_CLEARED',
    'READY_FOR_PICKUP',
    'GATE_OUT',
    'DELIVERED',
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= statusOrder.length - 1) {
    return null;
  }

  return statusOrder[currentIndex + 1];
}

/**
 * Validate event chronological order against existing events
 */
export function validateEventOrder(existingEvents: any[], newEvent: TrackingEventInput): void {
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
 * Map event type to container status
 */
export function mapEventToStatus(eventType: string): string {
  return EventToStatus[eventType] || eventType;
}

// ============================================
// MAP / STATS QUERIES (thin DB reads)
// ============================================

/**
 * Get map data for all active containers
 */
export async function getMapData(userRole?: string, userClientId?: string) {
  const where: any = {
    currentLat: { not: null },
    currentLng: { not: null },
    currentStatus: { notIn: ['DELIVERED', 'COMPLETED', 'CANCELLED'] },
  };

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

  return containers.map((c) => ({
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
 * Get container route (all geo-tagged events for path drawing)
 */
export async function getContainerRoute(containerId: string) {
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

  return events.map((e) => ({
    lat: e.latitude,
    lng: e.longitude,
    location: e.location,
    eventType: e.eventType,
    timestamp: e.eventDate,
  }));
}

/**
 * Get tracking statistics counts
 */
export async function getTrackingStats(userRole?: string, userClientId?: string) {
  const where: any = {};

  if (userRole === 'CLIENT' && userClientId) {
    where.booking = { clientId: userClientId };
  }

  const [total, inTransit, arrived, delivered, delayed] = await Promise.all([
    prisma.container.count({ where }),
    prisma.container.count({ where: { ...where, currentStatus: 'IN_TRANSIT' } }),
    prisma.container.count({
      where: { ...where, currentStatus: { in: ['ARRIVED', 'DISCHARGED'] } },
    }),
    prisma.container.count({ where: { ...where, currentStatus: 'DELIVERED' } }),
    prisma.container.count({
      where: {
        ...where,
        eta: { lt: new Date() },
        currentStatus: { notIn: ['DELIVERED', 'COMPLETED'] },
      },
    }),
  ]);

  return { total, inTransit, arrived, delivered, delayed };
}
